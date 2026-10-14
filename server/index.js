import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAgentReply } from './gemini-chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });
const PORT = Number(process.env.PORT) || 3001;
const app = express();

app.use(cors({ origin: true }));
app.use(
  express.json({
    limit: '256kb',
    type: ['application/json', 'application/*+json', 'text/plain'],
  })
);
app.use((req, _res, next) => {
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      req.body = { message: req.body };
    }
  }
  next();
});

const API_VERSION = 2;

app.get('/api/health', (_req, res) => {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.json({
    ok: true,
    apiVersion: API_VERSION,
    gemini: geminiConfigured,
    geminiConfigured,
    model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    envFile: envPath,
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const reply = await generateAgentReply(req.body);
    res.json({ reply });
  } catch (err) {
    const code = err.code || 'CHAT_ERROR';
    const status =
      code === 'NO_API_KEY'
        ? 503
        : code === 'INVALID_BODY' || err.message?.includes('обязателен') || err.message?.includes('Последнее')
          ? 400
          : code === 'GEMINI_OVERLOADED' || code === 'GEMINI_ALL_FAILED'
            ? 503
            : 502;
    res.status(status).json({
      error: err.message || 'Не удалось получить ответ',
      code,
    });
  }
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API: http://localhost:${PORT}`);
  const keyOk = Boolean(process.env.GEMINI_API_KEY?.trim());
  console.log(`Gemini: ${keyOk ? 'ключ загружен из .env' : 'GEMINI_API_KEY не найден'}`);
  if (!keyOk) {
    console.warn(`Проверьте файл: ${envPath}`);
  }
});
