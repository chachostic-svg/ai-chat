function mapRole(role) {
  const r = String(role || '').toLowerCase();
  if (r === 'user') return 'user';
  if (r === 'assistant' || r === 'agent' || r === 'model' || r === 'bot') return 'assistant';
  return 'user';
}

function textFromPart(part) {
  if (part == null) return '';
  if (typeof part === 'string') return part;
  if (typeof part.text === 'string') return part.text;
  if (typeof part.content === 'string') return part.content;
  return '';
}

function textFromContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => textFromPart(part))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function normalizeEntry(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    return t ? { role: 'user', text: t } : null;
  }
  const nestedMessage =
    raw.message && typeof raw.message === 'object'
      ? textFromPart(raw.message) || textFromContent(raw.message.content)
      : typeof raw.message === 'string'
        ? raw.message
        : '';

  const text =
    textFromPart(raw) ||
    textFromContent(raw.content) ||
    nestedMessage ||
    (typeof raw.body === 'string' ? raw.body : '');
  const trimmed = String(text).trim();
  if (!trimmed) return null;
  return { role: mapRole(raw.role), text: trimmed };
}

/**
 * @param {unknown} body
 * @returns {{ role: 'user' | 'assistant'; text: string }[] | null}
 */
function pickSingleText(b) {
  const candidates = [
    b.message,
    b.text,
    b.prompt,
    b.input,
    b.userMessage,
    b.query,
    b.question,
    b.lastUserMessage,
    b.content,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
    if (c && typeof c === 'object') {
      const t = textFromPart(c) || textFromContent(c.content);
      if (t.trim()) return t.trim();
    }
  }
  return null;
}

export function normalizeChatMessages(body) {
  if (typeof body === 'string' && body.trim()) {
    return [{ role: 'user', text: body.trim() }];
  }

  if (Array.isArray(body)) {
    const normalized = body.map(normalizeEntry).filter(Boolean);
    return normalized.length ? normalized : null;
  }

  if (!body || typeof body !== 'object') return null;

  const b = /** @type {Record<string, unknown>} */ (body);
  if (b.data && typeof b.data === 'object') {
    return normalizeChatMessages(b.data);
  }

  const list = b.messages ?? b.history ?? b.conversation;
  const single = pickSingleText(b);

  if (Array.isArray(list) && list.length > 0) {
    const normalized = list.map(normalizeEntry).filter(Boolean);
    if (normalized.length) {
      if (single) {
        const last = normalized[normalized.length - 1];
        if (!last || last.role !== 'user' || last.text !== single) {
          normalized.push({ role: 'user', text: single });
        }
      }
      return normalized;
    }
  }

  if (single) {
    return [{ role: 'user', text: single }];
  }

  return null;
}
