import { lazy, Suspense, useEffect } from 'react';
import { matchPath, useRouter } from './router.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import { Loading } from './components/Feedback.jsx';
import HomePage from './pages/HomePage.jsx';
import PostPage from './pages/PostPage.jsx';
import SectionPage from './pages/SectionPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import AccessibilityPage from './pages/AccessibilityPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// El panel de administración se descarga solo cuando se necesita (división de código).
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

const ROUTES = [
  ['/', HomePage],
  ['/noticia/:slug', PostPage],
  ['/seccion/:slug', SectionPage],
  ['/buscar', SearchPage],
  ['/accesibilidad', AccessibilityPage],
  ['/ingresar', LoginPage],
];

function resolve(pathname) {
  for (const [pattern, Component] of ROUTES) {
    const params = matchPath(pattern, pathname);
    if (params) return <Component key={pathname} {...params} />;
  }
  return <NotFoundPage />;
}

export default function App() {
  const { location } = useRouter();
  const isAdmin = location.pathname.startsWith('/admin');

  // Atajo: la tecla "/" lleva al buscador (si no se está escribiendo en un campo).
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        const input = document.getElementById('buscar');
        if (input) { e.preventDefault(); input.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (isAdmin) {
    return (
      <>
        <a href="#contenido" className="skip-link">Saltar al contenido</a>
        <Suspense fallback={<Loading label="Cargando panel" />}>
          <AdminApp />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <Header />
      <main id="contenido" tabIndex={-1} className="wrap site-main">
        {resolve(location.pathname)}
      </main>
      <Footer />
    </>
  );
}
