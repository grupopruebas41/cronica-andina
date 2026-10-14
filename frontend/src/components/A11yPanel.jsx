import { useState } from 'react';
import { FONT_SCALES, useA11y } from '../context/A11yContext.jsx';
import { useFocusTrap } from '../utils/hooks.js';

function Toggle({ label, help, checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true"><span className="switch__thumb" /></span>
      <span className="switch__text">
        <span className="switch__label">{label}</span>
        <span className="switch__help">{help}</span>
      </span>
    </label>
  );
}

/** Panel de ajustes de lectura: tamaño de texto, tema, contraste, lectura fácil, movimiento y datos. */
export default function A11yPanel() {
  const [open, setOpen] = useState(false);
  const { prefs, set, reset } = useA11y();
  const close = () => setOpen(false);
  const ref = useFocusTrap(open, close);

  return (
    <>
      <button
        type="button"
        className="a11y-trigger"
        aria-label="Ajustes de lectura"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="4" r="2" fill="currentColor"/><path d="M4 8h16M12 8v6m0 0-4 7m4-7 4 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
        <span>Ajustes de lectura</span>
      </button>

      {open && (
        <div className="drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby="a11y-title">
            <div className="drawer__head">
              <h2 id="a11y-title">Ajustes de lectura</h2>
              <button type="button" className="icon-btn" onClick={close} aria-label="Cerrar ajustes">×</button>
            </div>
            <p className="drawer__intro">Adapta la página a tu forma de leer. Los cambios se guardan en este navegador.</p>

            <fieldset className="seg">
              <legend>Tamaño del texto</legend>
              <div className="seg__row">
                {FONT_SCALES.map((s, i) => (
                  <label key={s} className="seg__opt">
                    <input type="radio" name="font" checked={prefs.fontScale === i} onChange={() => set('fontScale', i)} />
                    <span style={{ fontSize: `${0.85 + i * 0.18}rem` }}>A</span>
                    <span className="visually-hidden">{Math.round(s * 100)} %</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="seg">
              <legend>Tema de color</legend>
              <div className="seg__row">
                {[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => (
                  <label key={v} className="seg__opt seg__opt--text">
                    <input type="radio" name="theme" checked={prefs.theme === v} onChange={() => set('theme', v)} />
                    <span>{l}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Toggle label="Alto contraste" help="Colores más intensos y bordes marcados." checked={prefs.contrast} onChange={(v) => set('contrast', v)} />
            <Toggle label="Lectura fácil" help="Más espacio entre líneas, letras y párrafos." checked={prefs.easyRead} onChange={(v) => set('easyRead', v)} />
            <Toggle label="Subrayar enlaces" help="Distingue los enlaces sin depender del color." checked={prefs.underlineLinks} onChange={(v) => set('underlineLinks', v)} />
            <Toggle label="Reducir movimiento" help="Quita animaciones y transiciones." checked={prefs.reduceMotion} onChange={(v) => set('reduceMotion', v)} />
            <Toggle label="Ahorro de datos" help="No descarga imágenes; útil con señal débil o plan limitado." checked={prefs.saveData} onChange={(v) => set('saveData', v)} />

            <button type="button" className="btn btn--ghost btn--block" onClick={reset}>Restablecer ajustes</button>
          </aside>
        </div>
      )}
    </>
  );
}
