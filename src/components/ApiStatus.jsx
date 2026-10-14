import { useEffect, useState } from 'react';

export function ApiStatus() {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setState({ loading: false, ok: false, detail: `Ошибка HTTP ${res.status}` });
          return;
        }
        setState({
          loading: false,
          ok: data.ok === true,
          apiVersion: data.apiVersion,
          geminiConfigured: data.geminiConfigured ?? data.gemini,
          model: data.model,
        });
      } catch {
        if (!cancelled) {
          setState({
            loading: false,
            ok: false,
            detail: 'Backend не отвечает. Запустите: npm run dev:all',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return (
      <aside className="demo__api-status demo__api-status--loading" aria-live="polite">
        Проверяем API…
      </aside>
    );
  }

  if (!state.ok) {
    return (
      <aside className="demo__api-status demo__api-status--bad" role="status">
        <strong>API недоступен.</strong> {state.detail}
      </aside>
    );
  }

  const versionOk = state.apiVersion === 2;
  const geminiOk = Boolean(state.geminiConfigured);

  return (
    <aside className="demo__api-status demo__api-status--ok" role="status">
      <strong>Статус API:</strong> работает · версия {state.apiVersion ?? '?'}{' '}
      {versionOk ? '✓' : '— обновите backend'} · Gemini {geminiOk ? 'подключён ✓' : 'не настроен ✗'} · модель{' '}
      {state.model ?? '—'}
    </aside>
  );
}
