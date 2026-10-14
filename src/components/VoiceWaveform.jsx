export function VoiceWaveform({ active = false }) {
  return (
    <div
      className={`chat-widget__waveform${active ? ' chat-widget__waveform--active' : ''}`}
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="chat-widget__waveform-bar" style={{ '--i': i }} />
      ))}
    </div>
  );
}
