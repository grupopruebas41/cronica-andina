export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className="pagination" aria-label="Paginación">
      <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <ul>
        {pages.map((p) => (
          <li key={p}>
            <button
              type="button"
              className="pagination__num"
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Página ${p}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Siguiente
      </button>
      <p className="visually-hidden" aria-live="polite">Página {page} de {totalPages}</p>
    </nav>
  );
}
