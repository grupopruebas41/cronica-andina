import { useState } from 'react';
import { api } from '../api.js';
import { useFetch } from '../utils/hooks.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, isoDate, pluralize } from '../utils/text.js';
import { validateComment } from '../utils/validation.js';
import Field from './Field.jsx';

const EMPTY = { author: '', email: '', body: '', website: '' };

export default function Comments({ postId }) {
  const { data: comments, reload } = useFetch(`/posts/${postId}/comments`, { cacheable: false });
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const { notify } = useToast();

  const change = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => (x[k] ? { ...x, [k]: undefined } : x));
  };

  const submit = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const errs = validateComment(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      // Lleva el foco al primer campo con error (después de que React marque los campos).
      setTimeout(() => formEl.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setSending(true);
    try {
      const res = await api.post(`/posts/${postId}/comments`, form);
      notify(res.message);
      setForm(EMPTY);
      reload();
    } catch (err) {
      setErrors(err.errors || {});
      notify(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const count = comments?.length ?? 0;

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title">Comentarios ({count})</h2>
      {count === 0 && <p className="muted">Aún no hay comentarios publicados. Sé la primera persona en opinar.</p>}
      <ol className="comments__list">
        {comments?.map((c) => (
          <li key={c.id} className="comment">
            <p className="comment__head">
              <strong>{c.author}</strong>
              <time dateTime={isoDate(c.created_at)}>{formatDate(c.created_at)}</time>
            </p>
            <p>{c.body}</p>
          </li>
        ))}
      </ol>

      <form className="comment-form" onSubmit={submit} noValidate aria-labelledby="cf-title">
        <h3 id="cf-title">Deja tu comentario</h3>
        <p className="muted">Los comentarios se publican después de que un editor los revisa. Tu correo no se muestra.</p>
        <div className="grid-2">
          <Field label="Nombre" required value={form.author} onChange={change('author')} error={errors.author} autoComplete="name" maxLength={60} />
          <Field label="Correo electrónico" type="email" required value={form.email} onChange={change('email')} error={errors.email} autoComplete="email" />
        </div>
        <Field label="Comentario" as="textarea" rows={4} required value={form.body} onChange={change('body')} error={errors.body} maxLength={1000} />
        {/* Campo trampa anti-spam: oculto para personas y lectores de pantalla */}
        <div className="hp" aria-hidden="true">
          <label>Sitio web<input tabIndex={-1} autoComplete="off" value={form.website} onChange={change('website')} /></label>
        </div>
        <button className="btn btn--primary" type="submit" disabled={sending}>
          {sending ? 'Enviando…' : 'Enviar comentario'}
        </button>
        {Object.values(errors).filter(Boolean).length > 0 && (
          <p className="field__error" role="alert">
            Hay {pluralize(Object.values(errors).filter(Boolean).length, 'campo por corregir', 'campos por corregir')}.
          </p>
        )}
      </form>
    </section>
  );
}
