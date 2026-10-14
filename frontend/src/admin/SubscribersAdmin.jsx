import { useState } from 'react';
import { api } from '../api.js';
import { useDocumentTitle, useFetch } from '../utils/hooks.js';
import { formatDate } from '../utils/text.js';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Empty, ErrorMessage, Loading } from '../components/Feedback.jsx';

export default function SubscribersAdmin() {
  useDocumentTitle('Suscriptores');
  const { data, loading, error, reload } = useFetch('/admin/subscribers', { cacheable: false });
  const { notify } = useToast();
  const [toDelete, setToDelete] = useState(null);

  /** Exporta la lista a CSV generado en el navegador (sin carga extra al servidor). */
  const exportCsv = () => {
    const rows = [['correo', 'fecha'], ...data.map((s) => [s.email, s.created_at])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'suscriptores.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    notify('Lista descargada como suscriptores.csv.');
  };

  const remove = async () => {
    const s = toDelete; setToDelete(null);
    try { await api.del(`/admin/subscribers/${s.id}`); notify('Suscriptor eliminado.'); reload(); }
    catch (err) { notify(err.message, 'error'); }
  };

  return (
    <>
      <div className="admin__head">
        <h1>Suscriptores del boletín</h1>
        {data?.length > 0 && <button type="button" className="btn btn--ghost" onClick={exportCsv}>Descargar CSV</button>}
      </div>
      {loading && <Loading />}
      {error && <ErrorMessage error={error} onRetry={reload} />}
      {data?.length === 0 && <Empty title="Todavía no hay suscriptores." />}
      {data?.length > 0 && (
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabla de suscriptores">
          <table className="table">
            <caption className="visually-hidden">{data.length} suscriptores</caption>
            <thead><tr><th scope="col">Correo</th><th scope="col">Desde</th><th scope="col"><span className="visually-hidden">Acciones</span></th></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{s.email}</th>
                  <td>{formatDate(s.created_at)}</td>
                  <td className="table__actions"><button type="button" className="btn btn--small btn--danger-ghost" onClick={() => setToDelete(s)}>Eliminar<span className="visually-hidden"> {s.email}</span></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={Boolean(toDelete)} title="¿Eliminar este suscriptor?"
        message={toDelete ? `${toDelete.email} dejará de recibir el boletín.` : ''} confirmLabel="Eliminar suscriptor"
        onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
