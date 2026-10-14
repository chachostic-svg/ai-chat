import { GoogleGenerativeAI } from '@google/generative-ai';
import { AGENT_SYSTEM_PROMPT } from './system-prompt.js';
import { normalizeChatMessages } from './normalize-messages.js';
import { buildGeminiHistory } from './gemini-history.js';

const DEFAULT_MODEL = 'gemini-3.8-flash';

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

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    systemInstruction: AGENT_SYSTEM_PROMPT,
  });

  const history = buildGeminiHistory(messages);

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(String(last.text));
  const text = result.response.text()?.trim();

  if (!text) {
    throw new Error('Пустой ответ от модели');
  }

  return text;
}
