import { Link } from '../router.jsx';
import Newsletter from './Newsletter.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="weave weave--thin" aria-hidden="true" />
      <div className="wrap site-footer__grid">
        <Newsletter />
        <nav aria-label="Enlaces del pie de página">
          <h2 className="site-footer__h">El blog</h2>
          <ul>
            <li><Link to="/">Portada</Link></li>
            <li><Link to="/buscar">Buscar noticias</Link></li>
            <li><Link to="/accesibilidad">Declaración de accesibilidad</Link></li>
            <li><Link to="/ingresar">Acceso para editores</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="site-footer__h">Atajos de teclado</h2>
          <ul className="kbd-list">
            <li><kbd>Tab</kbd> avanzar entre enlaces y botones</li>
            <li><kbd>Mayús</kbd> + <kbd>Tab</kbd> retroceder</li>
            <li><kbd>Esc</kbd> cerrar ventanas y paneles</li>
            <li><kbd>/</kbd> ir al buscador</li>
          </ul>
        </div>
      </div>
      <p className="wrap site-footer__legal">
        Crónica Andina es un proyecto académico. Las noticias de ejemplo son ficticias.
      </p>
    </footer>
  );
}
