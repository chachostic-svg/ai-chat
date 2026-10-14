# Виджет ИИ-чата (стиль Jivo)

Frontend виджета онлайн-консультанта на **JavaScript (ES modules)** и **Vite**, ответы генерирует **Google Gemini** на backend (Node.js + Express).

## Быстрый старт

```bash
npm install
cp .env.example .env
# В .env укажите GEMINI_API_KEY — https://aistudio.google.com/apikey
npm run dev:all
```

Откроется сайт на `http://localhost:5173`, API — `http://localhost:3001`. Vite проксирует `/api` на backend.

Только frontend (без ИИ): `npm run dev`  
Только backend: `npm run server`

## Продакшен

```bash
npm run build
npm start
```

Сервер отдаёт `dist/` и обрабатывает `POST /api/chat`.

## API

`POST /api/chat`

```json
{
  "messages": [
    { "role": "user", "text": "Как оформить заказ?" },
    { "role": "assistant", "text": "..." }
  ]
}
```

Ответ: `{ "reply": "..." }`

`GET /api/health` — проверка, задан ли ключ Gemini.

## Структура

| Файл | Назначение |
|------|------------|
| `chat-widget.js` | UI виджета |
| `chat-api.js` | запросы к backend |
| `server/index.js` | Express API |
| `server/gemini-chat.js` | вызов Gemini |
| `mock-data.js` | мокап UI и запасные ответы при ошибке API |

## Подключение на другой сайт

```javascript
import { initChatWidget } from './chat-widget.js';
initChatWidget();
```

Backend должен быть доступен по тому же origin или настройте URL в `chat-api.js`.
