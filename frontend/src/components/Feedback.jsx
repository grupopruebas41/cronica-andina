/** Estados de carga, error y vacío reutilizables. */

export function Loading({ label = 'Cargando contenido' }) {
  return (
    <div className="loading" role="status">
      <span className="loading__bar" aria-hidden="true" />
      <span className="visually-hidden">{label}…</span>
    </div>
  );
}

export function SkeletonList({ rows = 3 }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" />)}
    </div>
  );
}

export function ErrorMessage({ error, onRetry }) {
  return (
    <div className="notice notice--error" role="alert">
      <p><strong>No se pudo cargar.</strong> {error?.message || 'Inténtalo de nuevo.'}</p>
      {onRetry && <button type="button" className="btn btn--ghost" onClick={onRetry}>Volver a intentar</button>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {children}
    </div>
  );
}
