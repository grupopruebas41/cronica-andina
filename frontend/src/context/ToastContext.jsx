import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * Avisos visuales + anunciados por lector de pantalla (aria-live).
 * Son la alternativa visual a los sonidos (accesibilidad auditiva):
 * el sistema nunca comunica algo solo con audio.
 * Los avisos de error permanecen hasta que el usuario los cierra (sin límite de tiempo).
 */
const ToastContext = createContext(null);
let counter = 0;

const ICONS = { success: '✓', error: '!', info: 'i' };
const TITLES = { success: 'Hecho', error: 'Atención', info: 'Aviso' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback((message, type = 'success') => {
    const id = ++counter;
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    if (type !== 'error') {
      timers.current[id] = setTimeout(() => dismiss(id), 7000);
    }
  }, [dismiss]);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <span className="toast__icon" aria-hidden="true">{ICONS[t.type]}</span>
            <div className="toast__body">
              <strong>{TITLES[t.type]}.</strong> {t.message}
            </div>
            <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
