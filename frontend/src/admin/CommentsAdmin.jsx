import { useState } from 'react';
import { Link } from '../router.jsx';
import { api } from '../api.js';
import { useDocumentTitle, useFetch } from '../utils/hooks.js';
import { formatDate } from '../utils/text.js';
import { useToast } from '../context/ToastContext.jsx';
import { Empty, ErrorMessage, Loading } from '../components/Feedback.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const LABEL = { pending: 'Por revisar', approved: 'Aprobado', rejected: 'Rechazado' };
const TABS = [['pending', 'Por revisar'], ['approved', 'Aprobados'], ['rejected', 'Rechazados'], ['', 'Todos']];

export default function CommentsAdmin() {
  useDocumentTitle('Comentarios');
  const [filter, setFilter] = useState('pending');
  const [toDelete, setToDelete] = useState(null);
  const { notify } = useToast();
  const { data, loading, error, reload } = useFetch(`/admin/comments${filter ? `?status=${filter}` : ''}`, { cacheable: false });

  const moderate = async (c, status) => {
    try {
      await api.put(`/admin/comments/${c.id}`, { status });
      notify(status === 'approved' ? `Comentario de ${c.author} aprobado.` : `Comentario de ${c.author} rechazado.`);
      reload();
    } catch (err) { notify(err.message, 'error'); }
  };

  const remove = async () => {
    const c = toDelete;
    setToDelete(null);
    try {
      await api.del(`/admin/comments/${c.id}`);
      notify('Comentario eliminado.');
      reload();
    } catch (err) { notify(err.message, 'error'); }
  };

  return (
    <>
      <div className="admin__head"><h1>Comentarios</h1></div>
      <div className="tabs" role="group" aria-label="Filtrar por estado">
        {TABS.map(([v, l]) => (
          <button key={v} type="button" className="btn btn--small" aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="No hay comentarios en esta lista." />}
      <ul className="mod-list">
        {data?.map((c) => (
          <li key={c.id} className="mod">
            <div className="mod__head">
              <strong>{c.author}</strong>
              <span className="muted">{c.email}</span>
              <span className={`status status--${c.status}`}>{LABEL[c.status]}</span>
            </div>
            <p className="mod__body">{c.body}</p>
            <p className="muted">
              En <Link to={`/noticia/${c.post_slug}`}>{c.post_title}</Link>, {formatDate(c.created_at)}
            </p>
            <div className="mod__actions">
              {c.status !== 'approved' && <button type="button" className="btn btn--small btn--primary" onClick={() => moderate(c, 'approved')}>Aprobar<span className="visually-hidden"> comentario de {c.author}</span></button>}
              {c.status !== 'rejected' && <button type="button" className="btn btn--small" onClick={() => moderate(c, 'rejected')}>Rechazar<span className="visually-hidden"> comentario de {c.author}</span></button>}
              <button type="button" className="btn btn--small btn--danger-ghost" onClick={() => setToDelete(c)}>Eliminar<span className="visually-hidden"> comentario de {c.author}</span></button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog open={Boolean(toDelete)} title="¿Eliminar este comentario?"
        message="El comentario se borrará de forma permanente." confirmLabel="Eliminar comentario"
        onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
