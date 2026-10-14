import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Enrutador propio y liviano (sin dependencias) basado en la History API.
 * Al cambiar de página:
 *  - vuelve al inicio del documento,
 *  - mueve el foco al contenido principal (para lectores de pantalla y teclado),
 *  - anuncia el cambio en una región aria-live.
 */
const RouterContext = createContext(null);

function currentLocation() {
  return { pathname: window.location.pathname, search: window.location.search };
}

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(currentLocation);

  useEffect(() => {
    const onPop = () => setLocation(currentLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to === window.location.pathname + window.location.search) return;
    window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
    setLocation(currentLocation());
    window.scrollTo(0, 0);
    // Tras renderizar, el foco va al <main> para que el usuario empiece a leer desde el contenido.
    requestAnimationFrame(() => {
      const main = document.getElementById('contenido');
      if (main) main.focus({ preventScroll: true });
    });
  }, []);

  const value = useMemo(() => ({ location, navigate }), [location, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  return useContext(RouterContext);
}

export function useQuery() {
  const { location } = useRouter();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

/** Compara una ruta con un patrón tipo "/noticia/:slug". Devuelve los parámetros o null. */
export function matchPath(pattern, pathname) {
  const keys = [];
  const regex = new RegExp(
    '^' + pattern.replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$'
  );
  const m = pathname.match(regex);
  if (!m) return null;
  return keys.reduce((acc, k, i) => ({ ...acc, [k]: decodeURIComponent(m[i + 1]) }), {});
}

/** Enlace interno que no recarga la página. */
export function Link({ to, children, onClick, ...rest }) {
  const { navigate } = useRouter();
  const handle = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest}>{children}</a>;
}

/** Enlace de navegación que marca la página actual con aria-current. */
export function NavLink({ to, exact = false, children, ...rest }) {
  const { location } = useRouter();
  const path = to.split('?')[0];
  const active = exact ? location.pathname === path : location.pathname.startsWith(path);
  return (
    <Link to={to} aria-current={active ? 'page' : undefined} {...rest}>
      {children}
    </Link>
  );
}
