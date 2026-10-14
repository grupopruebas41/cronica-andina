import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

/** Carga datos de la API y cancela la petición si el componente se desmonta. */
export function useFetch(path, { cacheable = true, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: Boolean(path && enabled), error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path || !enabled) return undefined;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    (cacheable ? api.getCached : api.get)(path, { signal: ctrl.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ data: null, loading: false, error });
      });
    return () => ctrl.abort();
  }, [path, cacheable, enabled, tick]);

  return { ...state, reload: () => { api.clearCache(); setTick((t) => t + 1); } };
}

/** Cambia el título de la pestaña (lo primero que lee un lector de pantalla). */
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Crónica Andina` : 'Crónica Andina';
  }, [title]);
}

/** Retrasa un valor (búsqueda mientras se escribe sin saturar el servidor). */
export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Mantiene el foco dentro de un diálogo y lo devuelve al cerrarlo. */
export function useFocusTrap(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const node = ref.current;
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const first = node?.querySelector(selector);
    first?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll(selector)].filter((el) => !el.disabled);
      if (!items.length) return;
      const [a, z] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}
