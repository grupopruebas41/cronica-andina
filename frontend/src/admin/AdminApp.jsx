import { useEffect } from 'react';
import { Link, matchPath, NavLink, useRouter } from '../router.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Loading } from '../components/Feedback.jsx';
import A11yPanel from '../components/A11yPanel.jsx';
import Dashboard from './Dashboard.jsx';
import PostsAdmin from './PostsAdmin.jsx';
import PostEditor from './PostEditor.jsx';
import CommentsAdmin from './CommentsAdmin.jsx';
import CategoriesAdmin from './CategoriesAdmin.jsx';
import SubscribersAdmin from './SubscribersAdmin.jsx';
import UsersAdmin from './UsersAdmin.jsx';

const ROUTES = [
  ['/admin', Dashboard],
  ['/admin/noticias', PostsAdmin],
  ['/admin/noticias/nueva', PostEditor],
  ['/admin/noticias/:id', PostEditor],
  ['/admin/comentarios', CommentsAdmin],
  ['/admin/categorias', CategoriesAdmin, 'admin'],
  ['/admin/suscriptores', SubscribersAdmin, 'admin'],
  ['/admin/usuarios', UsersAdmin, 'admin'],
];

export default function AdminApp() {
  const { user, checking, logout } = useAuth();
  const { location, navigate } = useRouter();
  const { notify } = useToast();

  useEffect(() => {
    if (!checking && !user) navigate('/ingresar', { replace: true });
  }, [checking, user, navigate]);

  if (checking || !user) return <Loading label="Verificando sesión" />;

  let page = null;
  for (const [pattern, Component, role] of ROUTES) {
    const params = matchPath(pattern, location.pathname);
    if (params) {
      page = role && user.role !== role
        ? <p className="notice notice--error" role="alert">Esta sección es solo para administradores.</p>
        : <Component key={location.pathname} {...params} />;
      break;
    }
  }

  const out = async () => {
    await logout();
    notify('Sesión cerrada.');
    navigate('/');
  };

  return (
    <div className="admin">
      <header className="admin__bar">
        <Link to="/" className="brand brand--small">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path d="M2 26 L11 11 L17 20 L21 14 L30 26Z" fill="var(--maiz)"/><rect x="2" y="27.5" width="28" height="2.5" fill="var(--cochinilla)"/></svg>
          <span className="brand__name">Crónica Andina</span>
          <span className="visually-hidden">, ver sitio público</span>
        </Link>
        <div className="admin__user">
          <A11yPanel />
          <span className="admin__who">{user.name} <span className="badge">{user.role === 'admin' ? 'Administradora' : 'Editor'}</span></span>
          <button type="button" className="btn btn--ghost" onClick={out}>Cerrar sesión</button>
        </div>
      </header>
      <div className="admin__body">
        <nav className="admin__nav" aria-label="Panel de administración">
          <ul>
            <li><NavLink to="/admin" exact>Resumen</NavLink></li>
            <li><NavLink to="/admin/noticias" exact>Noticias</NavLink></li>
            <li><NavLink to="/admin/noticias/nueva" exact>Escribir noticia</NavLink></li>
            <li><NavLink to="/admin/comentarios">Comentarios</NavLink></li>
            {user.role === 'admin' && (
              <>
                <li><NavLink to="/admin/categorias">Categorías</NavLink></li>
                <li><NavLink to="/admin/suscriptores">Suscriptores</NavLink></li>
                <li><NavLink to="/admin/usuarios">Usuarios</NavLink></li>
              </>
            )}
          </ul>
        </nav>
        <main id="contenido" tabIndex={-1} className="admin__main">
          {page || <p>Sección no encontrada. <Link to="/admin">Volver al resumen</Link>.</p>}
        </main>
      </div>
    </div>
  );
}
