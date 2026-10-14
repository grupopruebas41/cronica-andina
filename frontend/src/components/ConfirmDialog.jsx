import { useFocusTrap } from '../utils/hooks.js';

/** Diálogo de confirmación para acciones que no se pueden deshacer (prevención de errores). */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) {
  const ref = useFocusTrap(open, onCancel);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={ref} className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg">
        <h2 id="dlg-title">{title}</h2>
        <p id="dlg-msg">{message}</p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
