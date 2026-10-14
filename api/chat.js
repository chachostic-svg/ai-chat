import { generateAgentReply } from '../server/gemini-chat.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD' });
  }

  try {
    const reply = await generateAgentReply(req.body);
    return res.status(200).json({ reply });
  } catch (err) {
    const code = err.code || 'CHAT_ERROR';
    const status =
      code === 'NO_API_KEY'
        ? 503
        : code === 'INVALID_BODY' || err.message?.includes('Пользователя')
          ? 400
          : 502;
    return res.status(status).json({
      error: err.message || 'Не удалось получить ответ',
      code,
    });
  }
}
