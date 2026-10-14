import {
  MOCK_AGENT,
  MOCK_QUICK_REPLIES,
  MOCK_WELCOME,
  MOCK_HISTORY,
  MOCK_AI_REPLIES,
} from './mock-data.js';
import { agentAvatarHtml } from './agent-avatar.js';
import { createChatBackground3d } from './chat-background-3d.js';
import { requestAgentReply } from './chat-api.js';

const AGENT_AVATAR = agentAvatarHtml();

const STORAGE_KEY = 'ai-chat-widget-open';
const LAUNCHER_USED_KEY = 'ai-chat-launcher-clicked';
const LAUNCHER_RIPPLE_INTERVAL_MS = 5000;

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function pickReply() {
  return MOCK_AI_REPLIES[Math.floor(Math.random() * MOCK_AI_REPLIES.length)];
}

export function initChatWidget(root = document.body) {
  const host = document.createElement('div');
  host.className = 'jivo-widget-host';
  host.innerHTML = buildWidgetHTML();
  root.appendChild(host);

  const els = {
    launcher: host.querySelector('[data-jivo-launcher]'),
    panel: host.querySelector('[data-jivo-panel]'),
    close: host.querySelector('[data-jivo-close]'),
    messages: host.querySelector('[data-jivo-messages]'),
    form: host.querySelector('[data-jivo-form]'),
    input: host.querySelector('[data-jivo-input]'),
    quick: host.querySelector('[data-jivo-quick]'),
    typing: host.querySelector('[data-jivo-typing]'),
    badge: host.querySelector('[data-jivo-badge]'),
    messagesBg: host.querySelector('[data-jivo-messages-bg]'),
    launcherWrap: host.querySelector('[data-jivo-launcher-wrap]'),
  };

  const stopLauncherRipple = setupLauncherRipple(els.launcher, els.launcherWrap);

  const chatBg3d = els.messagesBg ? createChatBackground3d(els.messagesBg) : null;

  const state = {
    open: sessionStorage.getItem(STORAGE_KEY) === '1',
    messages: [MOCK_WELCOME, ...MOCK_HISTORY],
    typing: false,
    unread: 0,
  };

  function setOpen(open) {
    state.open = open;
    sessionStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    els.panel.hidden = !open;
    els.launcher.setAttribute('aria-expanded', String(open));
    if (open) {
      state.unread = 0;
      els.badge.hidden = true;
      els.input.focus();
      scrollMessages();
      chatBg3d?.start();
    } else {
      chatBg3d?.stop();
    }
  }

  function scrollMessages() {
    requestAnimationFrame(() => {
      els.messages.scrollTop = els.messages.scrollHeight;
    });
  }

  function renderMessages() {
    els.messages.innerHTML = state.messages
      .map((m) => {
        const isUser = m.role === 'user';
        return `
          <div class="jivo-msg jivo-msg--${isUser ? 'user' : 'agent'}" data-id="${m.id}">
            ${!isUser ? `<div class="jivo-msg__avatar" aria-hidden="true">${AGENT_AVATAR}</div>` : ''}
            <div class="jivo-msg__bubble">
              <p class="jivo-msg__text">${escapeHtml(m.text)}</p>
              <time class="jivo-msg__time">${m.time}</time>
            </div>
          </div>`;
      })
      .join('');
    els.typing.hidden = !state.typing;
    scrollMessages();
  }

  function addMessage(role, text) {
    const msg = {
      id: `msg-${Date.now()}`,
      role,
      text,
      time: formatTime(),
    };
    state.messages.push(msg);
    renderMessages();
    if (!state.open && role === 'agent') {
      state.unread += 1;
      els.badge.textContent = String(state.unread);
      els.badge.hidden = false;
    }
  }

  function showTyping(show) {
    state.typing = show;
    els.typing.hidden = !show;
    scrollMessages();
  }

  async function replyAsAgent() {
    showTyping(true);
    els.input.disabled = true;
    try {
      const lastUser = [...state.messages].reverse().find((m) => m.role === 'user');
      const reply = await requestAgentReply(state.messages, lastUser?.text);
      addMessage('agent', reply);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'ошибка сети';
      addMessage('agent', `Извините, сейчас не получается ответить: ${reason}`);
    } finally {
      showTyping(false);
      els.input.disabled = false;
      if (state.open) els.input.focus();
    }
  }

  function sendUserText(text) {
    const trimmed = text.trim();
    if (!trimmed || state.typing) return;
    addMessage('user', trimmed);
    els.input.value = '';
    void replyAsAgent();
  }

  els.launcher.addEventListener('click', () => {
    markLauncherUsed(stopLauncherRipple);
    setOpen(!state.open);
  });
  els.close.addEventListener('click', () => setOpen(false));

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendUserText(els.input.value);
  });

  els.quick.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick]');
    if (!btn) return;
    sendUserText(btn.dataset.quick);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) setOpen(false);
  });

  renderQuickReplies();
  renderMessages();
  setOpen(state.open);

  function renderQuickReplies() {
    els.quick.innerHTML = MOCK_QUICK_REPLIES.map(
      (q) => `<button type="button" class="jivo-quick__btn" data-quick="${escapeAttr(q)}">${escapeHtml(q)}</button>`
    ).join('');
  }
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function markLauncherUsed(stopRipple) {
  if (localStorage.getItem(LAUNCHER_USED_KEY)) return;
  localStorage.setItem(LAUNCHER_USED_KEY, '1');
  stopRipple?.();
}

/**
 * @param {HTMLButtonElement | null} launcher
 * @param {HTMLElement | null} wrap
 * @returns {(() => void) | null}
 */
function setupLauncherRipple(launcher, wrap) {
  if (!launcher || !wrap || localStorage.getItem(LAUNCHER_USED_KEY)) {
    wrap?.classList.add('jivo-launcher-wrap--engaged');
    return null;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  const ripples = wrap.querySelectorAll('.jivo-launcher-ripple');
  let intervalId = 0;

  function playRipple() {
    if (localStorage.getItem(LAUNCHER_USED_KEY)) return;
    if (launcher.getAttribute('aria-expanded') === 'true') return;

    wrap.classList.add('jivo-launcher-wrap--rippling');
    ripples.forEach((el, index) => {
      window.setTimeout(() => {
        el.classList.remove('is-active');
        void el.offsetWidth;
        el.classList.add('is-active');
      }, index * 420);
    });

    window.setTimeout(() => wrap.classList.remove('jivo-launcher-wrap--rippling'), 2200);
  }

  ripples.forEach((el) => {
    el.addEventListener('animationend', () => el.classList.remove('is-active'));
  });

  playRipple();
  intervalId = window.setInterval(playRipple, LAUNCHER_RIPPLE_INTERVAL_MS);

  function stop() {
    window.clearInterval(intervalId);
    intervalId = 0;
    wrap.classList.add('jivo-launcher-wrap--engaged');
    wrap.classList.remove('jivo-launcher-wrap--rippling');
    ripples.forEach((el) => el.classList.remove('is-active'));
  }

  return stop;
}

function buildWidgetHTML() {
  return `
    <div class="jivo-launcher-wrap" data-jivo-launcher-wrap>
      <span class="jivo-launcher-ripple" aria-hidden="true"></span>
      <span class="jivo-launcher-ripple" aria-hidden="true"></span>
      <span class="jivo-launcher-ripple" aria-hidden="true"></span>
    <button type="button" class="jivo-launcher" data-jivo-launcher aria-expanded="false" aria-controls="jivo-panel" aria-label="Открыть чат">
      <span class="jivo-launcher__icon jivo-launcher__icon--chat" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </span>
      <span class="jivo-launcher__icon jivo-launcher__icon--close" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </span>
      <span class="jivo-launcher__badge" data-jivo-badge hidden>0</span>
    </button>
    </div>

    <section id="jivo-panel" class="jivo-panel" data-jivo-panel hidden role="dialog" aria-labelledby="jivo-title">
      <header class="jivo-header">
        <div class="jivo-header__agent">
          <div class="jivo-header__avatar" title="${MOCK_AGENT.avatarAlt}">${AGENT_AVATAR}</div>
          <div class="jivo-header__meta">
            <h2 id="jivo-title" class="jivo-header__name">${MOCK_AGENT.name}</h2>
            <p class="jivo-header__role">${MOCK_AGENT.role}</p>
            <p class="jivo-header__status">
              <span class="jivo-header__dot" aria-hidden="true"></span>
              ${MOCK_AGENT.statusText}
            </p>
          </div>
        </div>
        <button type="button" class="jivo-header__close" data-jivo-close aria-label="Закрыть чат">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </header>

      <div class="jivo-messages-wrap">
        <div class="jivo-messages-bg" data-jivo-messages-bg aria-hidden="true"></div>
        <div class="jivo-messages" data-jivo-messages role="log" aria-live="polite" aria-relevant="additions"></div>
        <div class="jivo-typing" data-jivo-typing hidden>
          <div class="jivo-msg__avatar" aria-hidden="true">${AGENT_AVATAR}</div>
          <div class="jivo-typing__bubble">
            <span class="jivo-typing__dot"></span>
            <span class="jivo-typing__dot"></span>
            <span class="jivo-typing__dot"></span>
          </div>
        </div>
      </div>

      <div class="jivo-quick" data-jivo-quick role="group" aria-label="Быстрые ответы"></div>

      <form class="jivo-compose" data-jivo-form>
        <label class="visually-hidden" for="jivo-input">Сообщение</label>
        <input id="jivo-input" class="jivo-compose__input" data-jivo-input type="text" placeholder="Напишите сообщение…" autocomplete="off" maxlength="2000" />
        <button type="submit" class="jivo-compose__send" aria-label="Отправить">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    </section>
  `;
}
