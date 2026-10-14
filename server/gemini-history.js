/**
 * @param {{ role: 'user' | 'assistant'; text: string }[]} messages — полная переписка, последнее — user
 * @returns {{ role: 'user' | 'model'; parts: { text: string }[] }[]}
 */
export function buildGeminiHistory(messages) {
  const prior = messages.slice(0, -1);
  const turns = prior.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.text) }],
  }));

  while (turns.length && turns[0].role === 'model') {
    turns.shift();
  }

  const merged = [];
  for (const turn of turns) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === turn.role) {
      prev.parts[0].text += `\n\n${turn.parts[0].text}`;
    } else {
      merged.push({
        role: turn.role,
        parts: [{ text: turn.parts[0].text }],
      });
    }
  }

  return merged;
}
