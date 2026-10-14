import { useState } from 'react';
import { Link } from '../router.jsx';
import { api } from '../api.js';
import { useDebounced, useDocumentTitle, useFetch } from '../utils/hooks.js';
import { formatDate } from '../utils/text.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Empty, ErrorMessage, Loading } from '../components/Feedback.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';

const STATUS = { published: 'Publicada', draft: 'Borrador' };

export default function PostsAdmin() {
  useDocumentTitle('Noticias');
  const { user } = useAuth();
  const { notify } = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const dq = useDebounced(q.trim());

  const params = new URLSearchParams({ page: String(page), per_page: '10' });
  if (dq) params.set('q', dq);
  if (status) params.set('status', status);
  const { data, loading, error, reload } = useFetch(`/admin/posts?${params}`, { cacheable: false });

  const confirmDelete = async () => {
    const post = toDelete;
    setToDelete(null);
    try {
      await api.del(`/admin/posts/${post.id}`);
      notify(`Noticia eliminada: «${post.title}».`);
      reload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <>
      <div className="admin__head">
        <h1>Noticias</h1>
        <Link to="/admin/noticias/nueva" className="btn btn--primary">Escribir noticia</Link>
      </div>

      <div className="filters" role="group" aria-label="Filtrar noticias">
        <label>
          Buscar
          <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </label>
        <label>
          Estado
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">Todos</option>
            <option value="published">Publicadas</option>
            <option value="draft">Borradores</option>
          </select>
        </label>
      </div>

      {loading && !data && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && data.data.length === 0 && (
        <Empty title="No hay noticias con esos filtros.">
          <Link to="/admin/noticias/nueva" className="btn btn--primary">Escribir la primera</Link>
        </Empty>
      )}
      {data && data.data.length > 0 && (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabla de noticias">
          <table className="table">
            <caption className="visually-hidden">Noticias, {data.meta.total} en total</caption>
            <thead>
              <tr>
                <th scope="col">Título</th>
                <th scope="col">Estado</th>
                <th scope="col">Categoría</th>
                <th scope="col">Actualizada</th>
                <th scope="col">Lecturas</th>
                <th scope="col"><span className="visually-hidden">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((p) => {
                const canEdit = user.role === 'admin' || p.author_id === user.id;
                return (
                  <tr key={p.id}>
                    <th scope="row">
                      {p.status === 'published' ? <Link to={`/noticia/${p.slug}`}>{p.title}</Link> : p.title}
                      {p.featured && <span className="badge badge--maiz">Principal</span>}
                    </th>
                    <td><span className={`status status--${p.status}`}>{STATUS[p.status]}</span></td>
                    <td>{p.category?.name || '—'}</td>
                    <td>{formatDate(p.updated_at)}</td>
                    <td>{p.views}</td>
                    <td className="table__actions">
                      {canEdit ? (
                        <>
                          <Link to={`/admin/noticias/${p.id}`} className="btn btn--small">
                            Editar<span className="visually-hidden"> «{p.title}»</span>
                          </Link>
                          <button type="button" className="btn btn--small btn--danger-ghost" onClick={() => setToDelete(p)}>
                            Eliminar<span className="visually-hidden"> «{p.title}»</span>
                          </button>
                        </>
                      ) : <span className="muted">De otro autor</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.meta.page} totalPages={data.meta.total_pages} onChange={setPage} />}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar esta noticia?"
        message={toDelete ? `Se eliminará «${toDelete.title}» y sus comentarios. Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar noticia"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
