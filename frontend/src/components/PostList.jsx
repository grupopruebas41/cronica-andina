import { useState } from 'react';
import { useFetch } from '../utils/hooks.js';
import { Empty, ErrorMessage, SkeletonList } from './Feedback.jsx';
import Pagination from './Pagination.jsx';
import PostCard from './PostCard.jsx';

/** Lista paginada de noticias con filtros opcionales (categoría o búsqueda). */
export default function PostList({ category, q, perPage = 6, emptyText, headingLevel = 3, excludeId }) {
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (category) params.set('category', category);
  if (q) params.set('q', q);
  const { data, loading, error, reload } = useFetch(`/posts?${params}`);

  if (loading && !data) return <SkeletonList rows={3} />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;
  const posts = (data?.data || []).filter((p) => p.id !== excludeId);
  if (!posts.length) return <Empty title={emptyText || 'No hay noticias para mostrar.'} />;

  const change = (p) => {
    setPage(p);
    document.getElementById('lista-noticias')?.scrollIntoView({ block: 'start' });
  };

  return (
    <div id="lista-noticias" aria-busy={loading}>
      {q && <p className="results-count" role="status">{data.meta.total} resultado(s) para «{q}»</p>}
      <div className="post-list">
        {posts.map((p) => <PostCard key={p.id} post={p} headingLevel={headingLevel} />)}
      </div>
      <Pagination page={data.meta.page} totalPages={data.meta.total_pages} onChange={change} />
    </div>
  );
}
