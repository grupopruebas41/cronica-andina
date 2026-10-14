import { useEffect, useState } from 'react';
import { useQuery, useRouter } from '../router.jsx';
import { useDebounced, useDocumentTitle } from '../utils/hooks.js';
import PostList from '../components/PostList.jsx';

export default function SearchPage() {
  const query = useQuery();
  const { navigate } = useRouter();
  const initial = query.get('q') || '';
  const [term, setTerm] = useState(initial);
  const debounced = useDebounced(term.trim(), 400);
  useDocumentTitle(initial ? `Resultados para ${initial}` : 'Buscar');

  useEffect(() => { setTerm(initial); }, [initial]);
  useEffect(() => {
    if (debounced !== initial) {
      window.history.replaceState({}, '', debounced ? `/buscar?q=${encodeURIComponent(debounced)}` : '/buscar');
    }
  }, [debounced, initial]);

  return (
    <>
      <header className="page-head">
        <h1>Buscar noticias</h1>
        <form role="search" className="search search--big" onSubmit={(e) => { e.preventDefault(); navigate(`/buscar?q=${encodeURIComponent(term.trim())}`); }}>
          <label htmlFor="q-page">Palabra o frase</label>
          <div className="search__row">
            <input id="q-page" type="search" value={term} onChange={(e) => setTerm(e.target.value)} aria-describedby="q-hint" />
            <button className="btn btn--primary" type="submit">Buscar</button>
          </div>
          <p id="q-hint" className="field__hint">Los resultados se actualizan mientras escribes.</p>
        </form>
      </header>
      {debounced.length >= 2 ? (
        <PostList key={debounced} q={debounced} headingLevel={2} emptyText={`No encontramos noticias con «${debounced}». Prueba con otra palabra.`} />
      ) : (
        <p className="muted">Escribe al menos 2 letras para buscar.</p>
      )}
    </>
  );
}
