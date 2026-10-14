import { useCallback, useEffect, useRef, useState } from 'react';

function getRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * @param {{ onResult: (text: string) => void; lang?: string }} options
 */
export function useVoiceInput({ onResult, lang = 'ru-RU' }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSupported(Boolean(getRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    setError('');
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('Голосовой ввод не поддерживается в этом браузере');
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
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) {
        onResult(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      const code = event.error;
      if (code === 'aborted' || code === 'no-speech') return;
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
  }, [lang, listening, onResult, stop]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, error, start, stop };
}
