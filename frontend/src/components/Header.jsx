import { useState } from 'react';
import { Link, NavLink, useRouter } from '../router.jsx';
import { useFetch } from '../utils/hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import A11yPanel from './A11yPanel.jsx';

export default function Header() {
  const { navigate, location } = useRouter();
  const { user } = useAuth();
  const { data: categories } = useFetch('/categories');
  const [q, setQ] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/buscar?q=${encodeURIComponent(term)}` : '/buscar');
  };

  return (
    <header className="site-header">
      <div className="weave" aria-hidden="true" />
      <div className="wrap site-header__top">
        <Link to="/" className="brand" aria-label="Crónica Andina, ir a la portada">
          <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true"><path d="M2 26 L11 11 L17 20 L21 14 L30 26Z" fill="var(--maiz)"/><rect x="2" y="27.5" width="28" height="2.5" fill="var(--cochinilla)"/></svg>
          <span className="brand__name">Crónica Andina</span>
        </Link>

        <form className="search" role="search" onSubmit={submit}>
          <label htmlFor="buscar" className="visually-hidden">Buscar noticias</label>
          <input id="buscar" type="search" placeholder="Buscar noticias" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="btn btn--primary">Buscar</button>
        </form>

        <div className="site-header__tools">
          <A11yPanel />
          <Link to={user ? '/admin' : '/ingresar'} className="btn btn--ghost">
            {user ? 'Panel' : 'Ingresar'}
          </Link>
        </div>
      </div>

      <nav className="wrap cat-nav" aria-label="Secciones">
        <button
          type="button"
          className="cat-nav__toggle"
          aria-expanded={menuOpen}
          aria-controls="cat-list"
          onClick={() => setMenuOpen((o) => !o)}
        >
          Secciones
        </button>
        <ul id="cat-list" className={menuOpen ? 'is-open' : ''}>
          <li><NavLink to="/" exact onClick={() => setMenuOpen(false)}>Portada</NavLink></li>
          {categories?.map((c) => (
            <li key={c.id}>
              <NavLink to={`/seccion/${c.slug}`} onClick={() => setMenuOpen(false)}>{c.name}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
