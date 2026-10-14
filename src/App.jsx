import { useEffect, useState } from 'react';
import { ChatWidget } from './components/ChatWidget.jsx';
import { ApiStatus } from './components/ApiStatus.jsx';
import { SHOP_NAME, WORKSHOP_PHONE } from '../mock-data.js';

export default function App() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('ai-chat-theme');
    setDark(t === 'dark');
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('ai-chat-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('ai-chat-theme', 'light');
    }
  }, [dark]);

  return (
    <main className="demo">
      <div className="demo__top">
        <div>
          <h1 className="demo__title">{SHOP_NAME}</h1>
          <p className="demo__subtitle">Магазин автотоваров — демо с онлайн-консультантом</p>
        </div>
        <button
          type="button"
          className="theme-toggle"
          aria-pressed={dark}
          onClick={() => setDark((v) => !v)}
        >
          {dark ? 'Тема: тёмная' : 'Тема: светлая'}
        </button>
      </div>

      <div className="demo__grid">
        <article className="demo__card">
          <h3>Запчасти и расходники</h3>
          <p>Фильтры, тормоза, свечи, ремни — подбор по марке и модели авто.</p>
        </article>
        <article className="demo__card">
          <h3>Масла и жидкости</h3>
          <p>Моторные и трансмиссионные масла, антифриз, тормозная жидкость.</p>
        </article>
        <article className="demo__card">
          <h3>Автомастерская</h3>
          <p>
            Ремонт и услуги — {WORKSHOP_PHONE}. В чате — только товары.
          </p>
        </article>
      </div>

      <ApiStatus />

      <p className="demo__hint">
        Зелёная кнопка справа внизу — чат с ИИ-ассистентом по автотоварам. Проверка JSON вручную:{' '}
        <a href="/api/health" target="_blank" rel="noreferrer">
          /api/health
        </a>{' '}
        (без пробелов и букв в конце адреса).
      </p>

      <ChatWidget />
    </main>
  );
}
