import { useState } from 'react';
import { api } from '../api.js';
import { useDocumentTitle, useFetch } from '../utils/hooks.js';
import { validateUser } from '../utils/validation.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Field from '../components/Field.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';

const EMPTY = { name: '', email: '', password: '', role: 'editor' };

export default function UsersAdmin() {
  useDocumentTitle('Usuarios');
  const { user: me } = useAuth();
  const { data, loading, error, reload } = useFetch('/admin/users', { cacheable: false });
  const { notify } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [toDelete, setToDelete] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validateUser(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.post('/admin/users', form);
      notify(`Usuario ${form.name} creado.`);
      setForm(EMPTY); reload();
    } catch (err) { setErrors(err.errors || {}); notify(err.message, 'error'); }
  };

  const remove = async () => {
    const u = toDelete; setToDelete(null);
    try { await api.del(`/admin/users/${u.id}`); notify('Usuario eliminado.'); reload(); }
    catch (err) { notify(err.message, 'error'); }
  };

  return (
    <>
      <div className="admin__head"><h1>Usuarios</h1></div>
      <div className="grid-2 grid-2--top">
        <form className="panel" onSubmit={submit} noValidate>
          <h2>Nuevo usuario</h2>
          <Field label="Nombre completo" required value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" />
          <Field label="Correo electrónico" type="email" required value={form.email} error={errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" />
          <Field label="Contraseña" type="password" required value={form.password} error={errors.password} hint="Mínimo 8 caracteres, con letras y números." onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          <Field label="Rol" as="select" required value={form.role} error={errors.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="editor">Editor: escribe y modera comentarios</option>
            <option value="admin">Administrador: acceso completo</option>
          </Field>
          <button className="btn btn--primary" type="submit">Crear usuario</button>
        </form>
        <section className="panel" aria-labelledby="users-title">
          <h2 id="users-title">Equipo</h2>
          {loading && <Loading />}
          {error && <ErrorMessage error={error} onRetry={reload} />}
          <ul className="simple-list">
            {data?.map((u) => (
              <li key={u.id}>
                <div>
                  <strong>{u.name}</strong> <span className="badge">{u.role === 'admin' ? 'Administrador' : 'Editor'}</span>
                  <br /><span className="muted">{u.email}, {u.post_count} noticia(s)</span>
                </div>
                {u.id !== me.id && (
                  <button type="button" className="btn btn--small btn--danger-ghost" onClick={() => setToDelete(u)}>Eliminar<span className="visually-hidden"> {u.name}</span></button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <ConfirmDialog open={Boolean(toDelete)} title="¿Eliminar este usuario?"
        message={toDelete ? `${toDelete.name} ya no podrá ingresar al panel. Sus noticias se conservarán.` : ''}
        confirmLabel="Eliminar usuario" onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
