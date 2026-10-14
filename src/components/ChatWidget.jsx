import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MOCK_AGENT,
  MOCK_QUICK_REPLIES,
  MOCK_WELCOME,
  MOCK_HISTORY,
} from '../../mock-data.js';
import { requestAgentReply } from '../../chat-api.js';
import { MessageBubble } from './MessageBubble.jsx';
import { VoiceIcon } from './VoiceIcon.jsx';
import { VoiceWaveform } from './VoiceWaveform.jsx';
import { useVoiceInput } from '../hooks/useVoiceInput.js';

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function toApiMessages(items) {
  return items
    .filter((m) => m.text?.trim())
    .map((m) => ({
      role: m.role === 'agent' ? 'assistant' : 'user',
      text: m.text.trim(),
    }));
}

export function ChatWidget() {
  const [open, setOpen] = useState(() => sessionStorage.getItem('ai-chat-widget-open') === '1');
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => [
    { ...MOCK_WELCOME, time: MOCK_WELCOME.time },
    ...MOCK_HISTORY,
  ]);

  useEffect(() => {
    sessionStorage.setItem('ai-chat-widget-open', open ? '1' : '0');
  }, [open]);

  const sendText = useCallback(
    async (text, options = {}) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;

      const userMsg = {
        id: `msg-${Date.now()}`,
        role: 'user',
        text: trimmed,
        time: formatTime(),
        viaVoice: Boolean(options.viaVoice),
      };

      const withUser = [...messages, userMsg];
      setMessages(withUser);
      setInput('');
      setTyping(true);

      try {
        const apiMessages = toApiMessages(withUser);
        const reply = await requestAgentReply(
          apiMessages.map((m) => ({
            role: m.role === 'assistant' ? 'agent' : 'user',
            text: m.text,
          })),
          trimmed
        );
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-agent`,
            role: 'agent',
            text: reply,
            time: formatTime(),
          },
        ]);
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'ошибка сети';
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-err`,
            role: 'agent',
            text: `Извините, сейчас не получается ответить: ${reason}`,
            time: formatTime(),
          },
        ]);
      } finally {
        setTyping(false);
      }
    },
    [messages, typing]
  );

  const onSubmit = (e) => {
    e.preventDefault();
    void sendText(input);
  };

  const voiceBaseRef = useRef('');

  const onVoiceInterim = useCallback((text) => {
    const base = voiceBaseRef.current.trim();
    const merged = base ? `${base} ${text}` : text;
    setInput(merged.slice(0, 2000));
  }, []);

  const onVoiceFinal = useCallback(
    (text) => {
      const base = voiceBaseRef.current.trim();
      voiceBaseRef.current = '';
      const merged = (base ? `${base} ${text}` : text).trim();
      if (!merged) return;
      setInput('');
      void sendText(merged, { viaVoice: true });
    },
    [sendText]
  );

  const voice = useVoiceInput({
    onInterim: onVoiceInterim,
    onFinal: onVoiceFinal,
    lang: 'ru-RU',
  });

  const handleVoiceClick = useCallback(() => {
    if (!voice.listening) {
      voiceBaseRef.current = input;
    }
    voice.start();
  }, [input, voice]);

  const panelId = useMemo(() => 'chat-widget-panel', []);

  return (
    <div className="chat-widget">
      <button
        type="button"
        className="chat-widget__launcher"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '×' : '💬'}
      </button>

      <section
        id={panelId}
        className="chat-widget__panel"
        hidden={!open}
        role="dialog"
        aria-label="Чат поддержки"
      >
        <header className="chat-widget__header">
          <div>
            <strong>{MOCK_AGENT.name}</strong>
            <p>{MOCK_AGENT.role}</p>
            <small>{MOCK_AGENT.statusText}</small>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть">
            ×
          </button>
        </header>

        <div className="chat-widget__messages">
          {messages.map((m) => (
            <article
              key={m.id}
              className={`chat-widget__row chat-widget__row--${m.role === 'user' ? 'user' : 'agent'}`}
            >
              <MessageBubble
                role={m.role}
                text={m.text}
                time={m.time}
                viaVoice={m.viaVoice}
              />
            </article>
          ))}
          {typing && (
            <article className="chat-widget__row chat-widget__row--agent">
              <div className="chat-widget__bubble chat-widget__bubble--agent chat-widget__typing">
                печатает…
              </div>
            </article>
          )}
        </div>

        <div className="chat-widget__quick">
          {MOCK_QUICK_REPLIES.map((q) => (
            <button key={q} type="button" onClick={() => void sendText(q)}>
              {q}
            </button>
          ))}
        </div>

        {voice.listening && (
          <div className="chat-widget__voice-panel" role="status">
            <VoiceWaveform active />
            <span className="chat-widget__voice-panel-text">Идёт запись… говорите</span>
          </div>
        )}

        <form className="chat-widget__compose" onSubmit={onSubmit}>
          <button
            type="button"
            className={`chat-widget__mic${voice.listening ? ' chat-widget__mic--active' : ''}${!voice.supported ? ' chat-widget__mic--unsupported' : ''}`}
            onClick={handleVoiceClick}
            disabled={typing}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? 'Остановить запись' : 'Голосовой ввод'}
            title={
              voice.listening
                ? 'Нажмите, чтобы остановить'
                : 'Скажите сообщение — оно отправится автоматически'
            }
          >
            <VoiceIcon className="chat-widget__mic-icon" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={voice.listening ? 'Слушаю…' : 'Напишите или скажите сообщение…'}
            disabled={typing}
            maxLength={2000}
          />
          <button type="submit" disabled={typing || !input.trim()} aria-label="Отправить">
            ➤
          </button>
        </form>
        {voice.error && (
          <p className="chat-widget__voice-hint" role="status">
            {voice.error}
          </p>
        )}
      </section>
    </div>
  );
}
