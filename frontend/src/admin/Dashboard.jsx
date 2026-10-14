import { Link } from '../router.jsx';
import { useDocumentTitle, useFetch } from '../utils/hooks.js';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';

export default function Dashboard() {
  useDocumentTitle('Resumen del panel');
  const { data, loading, error, reload } = useFetch('/admin/stats', { cacheable: false });
  if (loading) return <Loading />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const max = Math.max(1, ...data.by_category.map((c) => Number(c.views)));
  const stats = [
    ['Publicadas', data.posts_published, '/admin/noticias'],
    ['Borradores', data.posts_draft, '/admin/noticias'],
    ['Comentarios por revisar', data.comments_pending, '/admin/comentarios'],
    ['Suscriptores', data.subscribers, '/admin/suscriptores'],
  ];

  return (
    <>
      <div className="admin__head">
        <h1>Resumen</h1>
        <Link to="/admin/noticias/nueva" className="btn btn--primary">Escribir noticia</Link>
      </div>

      <ul className="stats">
        {stats.map(([label, value, to]) => (
          <li key={label} className="stat">
            <Link to={to}>
              <span className="stat__value">{value}</span>
              <span className="stat__label">{label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid-2 grid-2--top">
        <section className="panel" aria-labelledby="views-cat">
          <h2 id="views-cat">Lecturas por categoría</h2>
          <table className="bars">
            <caption className="visually-hidden">Número de lecturas de noticias publicadas, por categoría</caption>
            <thead><tr><th scope="col">Categoría</th><th scope="col">Lecturas</th></tr></thead>
            <tbody>
              {data.by_category.map((c) => (
                <tr key={c.name}>
                  <th scope="row">{c.name}</th>
                  <td>
                    <span className="bars__bar" style={{ '--w': `${(Number(c.views) / max) * 100}%` }} aria-hidden="true" />
                    <span className="bars__num">{Number(c.views).toLocaleString('es-PE')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">Total: {data.total_views.toLocaleString('es-PE')} lecturas.</p>
        </section>

        <section className="panel" aria-labelledby="top-posts">
          <h2 id="top-posts">Noticias más leídas</h2>
          <ol className="popular__list">
            {data.top_posts.map((p) => (
              <li key={p.id}>
                <Link to={`/admin/noticias/${p.id}`}>{p.title}</Link>
                <span className="popular__views">{Number(p.views).toLocaleString('es-PE')} lecturas</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
