import { AGENT_SYSTEM_PROMPT } from './system-prompt.js';
import { normalizeChatMessages } from './normalize-messages.js';
import { buildGeminiHistory } from './gemini-history.js';

const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const REQUEST_TIMEOUT_MS = 20000;

const FALLBACK_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

function getModelCandidates() {
  const primary = process.env.GEMINI_MODEL?.trim();
  const ordered = primary
    ? [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)]
    : [...FALLBACK_MODELS];
  return [...new Set(ordered)];
}

function errorText(err) {
  return String(err?.message ?? err);
}

function isModelUnavailable(err) {
  const msg = errorText(err).toLowerCase();
  return (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('no longer available') ||
    msg.includes('not available to new users')
  );
}

function isTemporaryOverload(err) {
  const msg = errorText(err).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('unavailable') ||
    msg.includes('try again') ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithModel(apiKey, modelName, messages, lastText) {
  const history = buildGeminiHistory(messages);
  const contents = [
    ...history.map((turn) => ({
      role: turn.role,
      parts: turn.parts,
    })),
    { role: 'user', parts: [{ text: String(lastText) }] },
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1024,
        },
      }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error?.message || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!text) {
      throw new Error('Пустой ответ от модели');
    }
    return text;
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutError = new Error(`timeout: модель ${modelName} не ответила за ${REQUEST_TIMEOUT_MS / 1000} с`);
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {unknown} body — тело запроса или массив messages
 * @returns {Promise<string>}
 */
export async function generateAgentReply(body) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('Сервер не настроен: добавьте GEMINI_API_KEY в .env');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const messages = normalizeChatMessages(body);
  if (!messages?.length) {
    const err = new Error(
      'Не удалось прочитать сообщение. Отправьте text/message или messages[] с текстом пользователя'
    );
    err.code = 'INVALID_BODY';
    throw err;
  }

  const last = messages[messages.length - 1];
  if (last.role !== 'user' || !String(last.text).trim()) {
    throw new Error('Последнее сообщение должно быть от пользователя');
  }

  const candidates = getModelCandidates();
  const lastText = String(last.text);
  let lastError = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const modelName = candidates[i];
    try {
      if (i > 0) {
        await sleep(250);
      }
      return await generateWithModel(apiKey, modelName, messages, lastText);
    } catch (err) {
      lastError = err;
      if (isModelUnavailable(err) || isTemporaryOverload(err)) {
        continue;
      }
      throw err;
    }
  }

  const detail = lastError ? errorText(lastError) : '';
  const friendly = new Error(
    detail.includes('high demand') || detail.includes('503') || detail.includes('timeout')
      ? 'Gemini сейчас перегружен. Подождите около минуты и отправьте сообщение снова.'
      : 'Не удалось получить ответ от Gemini. Попробуйте ещё раз через минуту.'
  );
  friendly.code = 'GEMINI_ALL_FAILED';
  throw friendly;
}

export { DEFAULT_MODEL, FALLBACK_MODELS, getModelCandidates };
