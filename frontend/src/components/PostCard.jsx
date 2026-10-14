import { Link } from '../router.jsx';
import { formatDate, isoDate, minutesLabel } from '../utils/text.js';
import PostImage from './PostImage.jsx';

/**
 * Tarjeta de noticia. Todo el bloque es clicable, pero el único enlace real es el
 * título: así el lector de pantalla no repite el mismo enlace varias veces.
 */
export function PostMeta({ post }) {
  return (
    <p className="meta">
      {post.category && <span className="meta__cat">{post.category.name}</span>}
      <time dateTime={isoDate(post.published_at)}>{formatDate(post.published_at)}</time>
      <span>{minutesLabel(post.reading_time)}</span>
    </p>
  );
}

export default function PostCard({ post, variant = 'row', headingLevel = 3 }) {
  const H = `h${headingLevel}`;
  return (
    <article className={`card card--${variant}`}>
      <div className="card__media">
        <PostImage src={post.image_url} alt={post.image_alt} />
      </div>
      <div className="card__body">
        <PostMeta post={post} />
        <H className="card__title">
          <Link to={`/noticia/${post.slug}`} className="card__link">{post.title}</Link>
        </H>
        <p className="card__excerpt">{post.excerpt}</p>
      </div>
    </article>
  );
}
