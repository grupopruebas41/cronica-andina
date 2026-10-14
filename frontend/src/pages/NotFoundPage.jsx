import { Link } from '../router.jsx';
import { useDocumentTitle } from '../utils/hooks.js';

export default function NotFoundPage({ message }) {
  useDocumentTitle('Página no encontrada');
  return (
    <section className="page-head not-found">
      <h1>No encontramos esta página</h1>
      <p>{message || 'Es posible que el enlace esté mal escrito o que la noticia haya sido retirada.'}</p>
      <p><Link to="/" className="btn btn--primary">Ir a la portada</Link> <Link to="/buscar" className="btn btn--ghost">Buscar noticias</Link></p>
    </section>
  );
}
