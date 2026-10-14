import { useEffect, useRef, useState } from 'react';

/**
 * Lectura en voz alta con la Web Speech API del navegador (sin descargar nada).
 * Ayuda a personas con baja visión, dislexia o que prefieren escuchar.
 * Velocidad ajustable. Si el navegador no lo soporta, el botón no se muestra.
 */
export default function ReadAloud({ text }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [state, setState] = useState('idle'); // idle | playing | paused
  const [rate, setRate] = useState(1);
  const utter = useRef(null);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  if (!supported) return null;

  const play = () => {
    const synth = window.speechSynthesis;
    if (state === 'paused') { synth.resume(); setState('playing'); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-PE';
    u.rate = rate;
    const voice = synth.getVoices().find((v) => v.lang?.startsWith('es'));
    if (voice) u.voice = voice;
    u.onend = () => setState('idle');
    u.onerror = () => setState('idle');
    utter.current = u;
    synth.speak(u);
    setState('playing');
  };
  const pause = () => { window.speechSynthesis.pause(); setState('paused'); };
  const stop = () => { window.speechSynthesis.cancel(); setState('idle'); };

  return (
    <div className="read-aloud" role="group" aria-label="Escuchar esta noticia">
      {state === 'playing' ? (
        <button type="button" className="btn btn--ghost" onClick={pause}>Pausar lectura</button>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={play}>
          <span aria-hidden="true">▶ </span>{state === 'paused' ? 'Continuar lectura' : 'Escuchar noticia'}
        </button>
      )}
      {state !== 'idle' && <button type="button" className="btn btn--ghost" onClick={stop}>Detener</button>}
      <label className="read-aloud__rate">
        Velocidad
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))} disabled={state !== 'idle'}>
          <option value={0.8}>Lenta</option>
          <option value={1}>Normal</option>
          <option value={1.25}>Rápida</option>
        </select>
      </label>
      <span className="visually-hidden" aria-live="polite">
        {state === 'playing' ? 'Reproduciendo' : state === 'paused' ? 'En pausa' : ''}
      </span>
    </div>
  );
}
