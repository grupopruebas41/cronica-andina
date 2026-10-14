import { useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { isEmail } from '../utils/text.js';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const { notify } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setError('Escribe un correo válido, por ejemplo: nombre@correo.com');
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await api.post('/subscribe', { email });
      notify(res.message);
      setEmail('');
    } catch (err) {
      setError(err.errors?.email || err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="newsletter" aria-labelledby="nl-title">
      <h2 id="nl-title">Boletín semanal</h2>
      <p>Las cinco noticias más importantes del valle, cada lunes en tu correo.</p>
      <form onSubmit={submit} noValidate className="newsletter__form">
        <label htmlFor="nl-email">Tu correo para el boletín</label>
        <div className="newsletter__row">
          <input
            id="nl-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'nl-err' : undefined}
          />
          <button className="btn btn--accent" type="submit" disabled={sending}>
            {sending ? 'Suscribiendo…' : 'Suscribirme'}
          </button>
        </div>
        {error && <p id="nl-err" className="field__error"><span aria-hidden="true">⚠ </span>{error}</p>}
      </form>
    </section>
  );
}
