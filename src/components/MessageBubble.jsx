export function MessageBubble({ role, text, time }) {
  const isUser = role === 'user';
  return (
    <div className={`chat-widget__bubble chat-widget__bubble--${isUser ? 'user' : 'agent'}`}>
      <p>{text}</p>
      <time>{time}</time>
    </div>
  );
}
