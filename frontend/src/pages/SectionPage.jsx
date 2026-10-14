import { useDocumentTitle, useFetch } from '../utils/hooks.js';
import PostList from '../components/PostList.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import { Loading } from '../components/Feedback.jsx';

export default function SectionPage({ slug }) {
  const { data: categories, loading } = useFetch('/categories');
  const cat = categories?.find((c) => c.slug === slug);
  useDocumentTitle(cat?.name || 'Sección');

  if (loading) return <Loading />;
  if (!cat) return <NotFoundPage message="Esa sección no existe." />;

  return (
    <>
      <header className="page-head">
        <h1>{cat.name}</h1>
        <p>{cat.description}</p>
      </header>
      <PostList key={slug} category={slug} perPage={6} headingLevel={2} emptyText="Todavía no hay noticias en esta sección." />
    </>
  );
}
