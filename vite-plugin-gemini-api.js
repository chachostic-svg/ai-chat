import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateAgentReply } from './server/gemini-chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ message: raw });
      }
    });
    req.on('error', reject);
  });
}

/** Обрабатывает /api прямо в Vite — чат работает без отдельного Express. */
export function geminiApiPlugin() {
  return {
    name: 'gemini-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (url !== '/api/health' && url !== '/api/chat') {
          next();
          return;
        }

        if (url === '/api/health') {
          const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
          sendJson(res, 200, {
            ok: true,
            apiVersion: 2,
            platform: 'vite',
            gemini: geminiConfigured,
            geminiConfigured,
            model: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
          });
          return;
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed', code: 'METHOD' });
          return;
        }

        try {
          const body = await readBody(req);
          const reply = await generateAgentReply(body);
          sendJson(res, 200, { reply });
        } catch (err) {
          const code = err.code || 'CHAT_ERROR';
          const status =
            code === 'NO_API_KEY' || code === 'GEMINI_OVERLOADED' || code === 'GEMINI_ALL_FAILED'
              ? 503
              : code === 'INVALID_BODY'
                ? 400
                : 502;
          sendJson(res, status, {
            error: err.message || 'Не удалось получить ответ',
            code,
          });
        }
      });
    },
  };
}
