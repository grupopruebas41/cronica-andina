import { useState } from 'react';
import { api } from '../api.js';
import { useDocumentTitle, useFetch } from '../utils/hooks.js';
import { useToast } from '../context/ToastContext.jsx';
import Field from '../components/Field.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';

const EMPTY = { id: null, name: '', description: '' };

export default function CategoriesAdmin() {
  useDocumentTitle('Categorías');
  const { data, loading, error, reload } = useFetch('/categories', { cacheable: false });
  const { notify } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 3) { setErrors({ name: 'El nombre debe tener al menos 3 caracteres.' }); return; }
    try {
      if (form.id) await api.put(`/admin/categories/${form.id}`, form);
      else await api.post('/admin/categories', form);
      notify(form.id ? 'Categoría actualizada.' : 'Categoría creada.');
      setForm(EMPTY); setErrors({}); reload();
    } catch (err) { setErrors(err.errors || {}); notify(err.message, 'error'); }
  };

  const remove = async () => {
    const c = toDelete; setToDelete(null);
    try { await api.del(`/admin/categories/${c.id}`); notify('Categoría eliminada.'); reload(); }
    catch (err) { notify(err.message, 'error'); }
  };

  return (
    <>
      <div className="admin__head"><h1>Categorías</h1></div>
      <div className="grid-2 grid-2--top">
        <form className="panel" onSubmit={submit} noValidate>
          <h2>{form.id ? `Editar «${form.name}»` : 'Nueva categoría'}</h2>
          <Field label="Nombre" required maxLength={40} value={form.name} error={errors.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Descripción" as="textarea" rows={2} maxLength={160} value={form.description} error={errors.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="editor__actions">
            {form.id && <button type="button" className="btn btn--ghost" onClick={() => { setForm(EMPTY); setErrors({}); }}>Cancelar edición</button>}
            <button className="btn btn--primary" type="submit">{form.id ? 'Guardar cambios' : 'Crear categoría'}</button>
          </div>
        </form>

        <section className="panel" aria-labelledby="cat-list-title">
          <h2 id="cat-list-title">Categorías existentes</h2>
          {loading && <Loading />}
          {error && <ErrorMessage error={error} onRetry={reload} />}
          <ul className="simple-list">
            {data?.map((c) => (
              <li key={c.id}>
                <div><strong>{c.name}</strong> <span className="muted">({c.post_count} publicadas)</span></div>
                <div className="mod__actions">
                  <button type="button" className="btn btn--small" onClick={() => setForm({ id: c.id, name: c.name, description: c.description })}>Editar<span className="visually-hidden"> {c.name}</span></button>
                  <button type="button" className="btn btn--small btn--danger-ghost" onClick={() => setToDelete(c)}>Eliminar<span className="visually-hidden"> {c.name}</span></button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <ConfirmDialog open={Boolean(toDelete)} title="¿Eliminar esta categoría?"
        message="Solo se puede eliminar si no tiene noticias asignadas." confirmLabel="Eliminar categoría"
        onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
