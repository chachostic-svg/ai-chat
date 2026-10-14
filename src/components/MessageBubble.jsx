import { VoiceIcon } from './VoiceIcon.jsx';
import { VoiceWaveform } from './VoiceWaveform.jsx';

export function MessageBubble({ role, text, time, viaVoice = false }) {
  const isUser = role === 'user';
  const voiceUser = isUser && viaVoice;

  return (
    <div
      className={`chat-widget__bubble chat-widget__bubble--${isUser ? 'user' : 'agent'}${voiceUser ? ' chat-widget__bubble--voice' : ''}`}
    >
      {voiceUser && (
        <div className="chat-widget__voice-meta">
          <span className="chat-widget__voice-badge">
            <VoiceIcon className="chat-widget__voice-badge-icon" />
            Голосовое
          </span>
          <VoiceWaveform active />
        </div>
      )}
      <p className="chat-widget__bubble-text">{text}</p>
      <time>{time}</time>
    </div>
  );
}
