import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Preferencias de accesibilidad del lector. Se aplican como atributos en <html>
 * y el CSS reacciona a ellos. Se recuerdan en este navegador.
 */
const KEY = 'ca_a11y';
const A11yContext = createContext(null);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const prefersSaveData = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.connection?.saveData);

export const DEFAULTS = {
  fontScale: 0,        // 0 = 100 %, 1 = 115 %, 2 = 130 %, 3 = 150 %
  theme: 'auto',       // auto | light | dark
  contrast: false,     // alto contraste
  easyRead: false,     // lectura fácil: más interlineado y espaciado
  underlineLinks: false,
  reduceMotion: false,
  saveData: false,     // modo ahorro de datos: oculta imágenes decorativas
};

function load() {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { stored = {}; }
  return {
    ...DEFAULTS,
    reduceMotion: prefersReducedMotion(),
    saveData: prefersSaveData(),
    ...stored,
  };
}

export const FONT_SCALES = [1, 1.15, 1.3, 1.5];

export function A11yProvider({ children }) {
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    const html = document.documentElement;
    html.style.setProperty('--font-scale', FONT_SCALES[prefs.fontScale] ?? 1);
    html.dataset.theme = prefs.theme;
    html.dataset.contrast = prefs.contrast ? 'high' : 'normal';
    html.dataset.easyRead = String(prefs.easyRead);
    html.dataset.underline = String(prefs.underlineLinks);
    html.dataset.motion = prefs.reduceMotion ? 'reduce' : 'full';
    html.dataset.saveData = String(prefs.saveData);
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* sin almacenamiento */ }
  }, [prefs]);

  const value = useMemo(() => ({
    prefs,
    set: (key, val) => setPrefs((p) => ({ ...p, [key]: val })),
    reset: () => setPrefs({ ...DEFAULTS, reduceMotion: prefersReducedMotion(), saveData: prefersSaveData() }),
  }), [prefs]);

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export const useA11y = () => useContext(A11yContext);
