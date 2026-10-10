# Виджет ИИ-чата (стиль Jivo)

Frontend виджета онлайн-консультанта на **JavaScript (ES modules)** и **Vite**.

## Запуск

```bash
npm install
npm run dev
```

Сборка: `npm run build`, просмотр сборки: `npm run preview`.

## Структура

- `index.html` — демо-страница «магазина» с виджетом
- `chat-widget.js` — логика виджета (открытие, сообщения, имитация ответа ИИ)
- `mock-data.js` — мокап агента, истории и ответов
- `styles.css` — оформление в духе Jivo (зелёный акцент, пузыри, launcher)

## Подключение на другой сайт

После сборки подключите сгенерированные assets или скопируйте модули и вызовите:

```javascript
import { initChatWidget } from './chat-widget.js';
initChatWidget();
```

Для реального API замените `replyAsAgent` в `chat-widget.js` на запрос к вашему backend.
