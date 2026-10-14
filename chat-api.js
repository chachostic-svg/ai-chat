const CHAT_API_URL = '/api/chat';

/**
 * @param {{ role: 'user' | 'agent'; text: string }[]} messages
 * @returns {Promise<string>}
 */
export async function requestAgentReply(messages, latestUserText) {
  const payload = (Array.isArray(messages) ? messages : [])
    .filter((m) => m?.text && String(m.text).trim())
    .map((m) => ({
      role: m.role === 'agent' ? 'assistant' : 'user',
      text: String(m.text).trim(),
    }));

  const lastUser =
    [...payload].reverse().find((m) => m.role === 'user')?.text ||
    (typeof latestUserText === 'string' ? latestUserText.trim() : '');

  if (!lastUser) {
    throw new Error('Пустое сообщение');
  }

  const res = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: payload.length ? payload : [{ role: 'user', text: lastUser }],
      message: lastUser,
      text: lastUser,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 503 && data.code === 'NO_API_KEY') {
      throw new Error(
        'Сервер не настроен: добавьте GEMINI_API_KEY в .env и перезапустите npm run dev:all'
      );
    }
    const msg = data.error || `Ошибка сервера (${res.status})`;
    throw new Error(msg);
  }

  if (!data.reply) {
    throw new Error('Пустой ответ API');
  }

  return data.reply;
}
