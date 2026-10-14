import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * @param {{
 *   onInterim?: (text: string) => void;
 *   onFinal?: (text: string) => void;
 *   lang?: string;
 * }} options
 */
export function useVoiceInput({ onInterim, onFinal, lang = 'ru-RU' }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const onInterimRef = useRef(onInterim);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onInterimRef.current = onInterim;
    onFinalRef.current = onFinal;
  }, [onInterim, onFinal]);

  useEffect(() => {
    const ctor = getRecognitionCtor();
    const secure = typeof window !== 'undefined' && window.isSecureContext;
    setSupported(Boolean(ctor && secure));
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    setError('');
    const Ctor = getRecognitionCtor();

    if (!window.isSecureContext) {
      setError('Голосовой ввод работает только по HTTPS (или на localhost)');
      return;
    }

    if (!Ctor) {
      setError('Используйте Chrome или Edge — в них есть распознавание речи');
      return;
    }

    if (listening) {
      stop();
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const part = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) finalText += part;
        else interim += part;
      }
      if (interim.trim()) onInterimRef.current?.(interim.trim());
      if (finalText.trim()) onFinalRef.current?.(finalText.trim());
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === 'aborted') return;
      if (code === 'no-speech') {
        setError('Речь не распознана. Попробуйте ещё раз');
        return;
      }
      setError(
        code === 'not-allowed'
          ? 'Разрешите доступ к микрофону в браузере'
          : 'Не удалось распознать речь'
      );
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setError('Микрофон занят или недоступен');
      setListening(false);
    }
  }, [lang, listening, stop]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, error, start, stop };
}
