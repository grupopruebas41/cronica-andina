import { useState } from 'react';
import { Link } from '../router.jsx';
import { useDocumentTitle, useFetch } from '../utils/hooks.js';
import { formatDate, isoDate, minutesLabel, parseContent, plainText } from '../utils/text.js';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';
import PostImage from '../components/PostImage.jsx';
import PostCard from '../components/PostCard.jsx';
import ReadAloud from '../components/ReadAloud.jsx';
import Comments from '../components/Comments.jsx';
import { useToast } from '../context/ToastContext.jsx';
import NotFoundPage from './NotFoundPage.jsx';

export default function PostPage({ slug }) {
  const { data: post, loading, error, reload } = useFetch(`/posts/${encodeURIComponent(slug)}`, { cacheable: false });
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);
  useDocumentTitle(post?.title || (loading ? 'Cargando' : 'Noticia'));

  if (loading) return <Loading label="Cargando noticia" />;
  if (error?.status === 404) return <NotFoundPage message={error.message} />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        notify('Enlace copiado. Ya puedes pegarlo donde quieras.');
      }
    } catch { /* el usuario canceló */ }
  };

  return (
    <article className="article">
      <nav aria-label="Ruta de navegación" className="breadcrumbs">
        <ol>
          <li><Link to="/">Portada</Link></li>
          {post.category && <li><Link to={`/seccion/${post.category.slug}`}>{post.category.name}</Link></li>}
          <li aria-current="page">{post.title}</li>
        </ol>
      </nav>

      <header className="article__header">
        <h1 className="article__title">{post.title}</h1>
        <p className="article__excerpt">{post.excerpt}</p>
        <p className="meta">
          <span>Por {post.author}</span>
          <time dateTime={isoDate(post.published_at)}>{formatDate(post.published_at)}</time>
          <span>{minutesLabel(post.reading_time)}</span>
        </p>
        <div className="article__tools">
          <ReadAloud text={plainText(post.title, post.content)} />
          <button type="button" className="btn btn--ghost" onClick={share}>
            {copied ? 'Enlace copiado' : 'Compartir'}
          </button>
        </div>
      </header>

      {post.image_url && (
        <figure className="article__figure">
          <PostImage src={post.image_url} alt={post.image_alt} eager />
          <figcaption>{post.image_alt}</figcaption>
        </figure>
      )}

      <div className="prose">
        {parseContent(post.content).map((b, i) =>
          b.type === 'h2' ? <h2 key={i}>{b.text}</h2> : <p key={i}>{b.text}</p>
        )}
      </div>

      {post.related?.length > 0 && (
        <section className="related" aria-labelledby="related-title">
          <h2 id="related-title" className="section-title">Más de {post.category?.name}</h2>
          <div className="post-list">
            {post.related.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}

      <Comments postId={post.id} />
    </article>
  );
}
