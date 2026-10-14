import { Link } from '../router.jsx';
import { useDocumentTitle, useFetch } from '../utils/hooks.js';
import { PostMeta } from '../components/PostCard.jsx';
import PostImage from '../components/PostImage.jsx';
import PostList from '../components/PostList.jsx';

/**
 * Portada. Mientras llegan los datos se reserva el mismo espacio que ocupará el
 * contenido final, para que la página no "salte" (métrica CLS).
 */
export default function HomePage() {
  useDocumentTitle('Portada');
  const { data } = useFetch('/posts/featured');
  const lead = data?.featured;

  return (
    <>
      <h1 className="visually-hidden">Crónica Andina: portada de noticias</h1>

      {lead ? (
        <section className="lead" aria-labelledby="lead-title">
          <div className="lead__media">
            <PostImage src={lead.image_url} alt={lead.image_alt} eager />
          </div>
          <div className="lead__body">
            <p className="lead__kicker">Noticia principal</p>
            <h2 id="lead-title" className="lead__title">
              <Link to={`/noticia/${lead.slug}`}>{lead.title}</Link>
            </h2>
            <p className="lead__excerpt">{lead.excerpt}</p>
            <PostMeta post={lead} />
          </div>
        </section>
      ) : (
        <div className="lead lead--loading" aria-hidden="true">
          <div className="skeleton skeleton--lead" />
          <div className="skeleton" />
        </div>
      )}

      <div className="home-grid">
        <section aria-labelledby="latest-title">
          <h2 id="latest-title" className="section-title">Últimas noticias</h2>
          <PostList perPage={5} excludeId={lead?.id} />
        </section>

        <aside className="popular" aria-labelledby="popular-title">
          <h2 id="popular-title" className="section-title">Más leídas</h2>
          <ol className="popular__list" aria-busy={!data}>
            {data?.popular.map((p) => (
              <li key={p.id}>
                <Link to={`/noticia/${p.slug}`}>{p.title}</Link>
                <span className="popular__views">{p.views.toLocaleString('es-PE')} lecturas</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
