import { useEffect, useState } from 'react';
import { useRouter } from '../router.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../utils/hooks.js';
import { validateLogin } from '../utils/validation.js';
import Field from '../components/Field.jsx';

export default function LoginPage() {
  useDocumentTitle('Ingresar');
  const { login, user } = useAuth();
  const { navigate } = useRouter();
  const { notify } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate('/admin', { replace: true }); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const errs = validateLogin(form);
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) {
      setTimeout(() => formEl.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      notify(`Hola, ${u.name}. Sesión iniciada.`);
      navigate('/admin');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="auth">
      <h1>Acceso para editores</h1>
      <p className="muted">Ingresa para publicar y administrar noticias.</p>
      <form onSubmit={submit} noValidate className="auth__form">
        {formError && <p className="notice notice--error" role="alert">{formError}</p>}
        <Field label="Correo electrónico" type="email" autoComplete="username" required
          value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: undefined }); }} error={errors.email} />
        <Field label="Contraseña" type={show ? 'text' : 'password'} autoComplete="current-password" required
          value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: undefined }); }} error={errors.password} />
        <label className="check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar contraseña
        </label>
        <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <details className="demo-creds">
        <summary>Cuentas de demostración</summary>
        <p>Administradora: <code>admin@cronica.pe</code> / <code>Admin2026</code></p>
        <p>Editor: <code>editor@cronica.pe</code> / <code>Editor2026</code></p>
      </details>
    </section>
  );
}
