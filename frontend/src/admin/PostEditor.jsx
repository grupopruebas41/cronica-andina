import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { api } from '../api.js';
import { useDocumentTitle, useFetch } from '../utils/hooks.js';
import { minutesLabel, parseContent, readingTime } from '../utils/text.js';
import { validatePost } from '../utils/validation.js';
import { useToast } from '../context/ToastContext.jsx';
import Field from '../components/Field.jsx';
import { ErrorMessage, Loading } from '../components/Feedback.jsx';

const EMPTY = {
  title: '', excerpt: '', content: '', category_id: '', status: 'draft',
  image_url: '', image_alt: '', featured: false,
};

export default function PostEditor({ id }) {
  const isNew = !id;
  useDocumentTitle(isNew ? 'Escribir noticia' : 'Editar noticia');
  const { navigate } = useRouter();
  const { notify } = useToast();
  const { data: categories } = useFetch('/categories');
  const { data: existing, loading, error } = useFetch(isNew ? null : `/admin/posts/${id}`, { cacheable: false });
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const dirty = useRef(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title, excerpt: existing.excerpt, content: existing.content,
        category_id: existing.category?.id ?? '', status: existing.status,
        image_url: existing.image_url || '', image_alt: existing.image_alt || '', featured: existing.featured,
      });
    }
  }, [existing]);

  // Aviso si se intenta salir con cambios sin guardar (prevención de pérdida de datos).
  useEffect(() => {
    const warn = (e) => { if (dirty.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const set = (k, v) => {
    dirty.current = true;
    setForm((f) => ({ ...f, [k]: v }));
    // Al corregir un campo, su mensaje de error desaparece.
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const bind = (k) => ({ value: form[k], onChange: (e) => set(k, e.target.value), error: errors[k] });

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors((x) => ({ ...x, image_url: 'La imagen pesa más de 2 MB. Redúcela para que la página cargue rápido.' }));
      return;
    }
    const fd = new FormData();
    fd.append('image', file);
    setUploading(true);
    try {
      const res = await api.post('/admin/upload', fd);
      set('image_url', res.url);
      setErrors((x) => ({ ...x, image_url: undefined }));
      notify('Imagen subida. Ahora describe lo que muestra.');
    } catch (err) {
      setErrors((x) => ({ ...x, image_url: err.message }));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const save = async (status) => {
    const data = { ...form, status, category_id: Number(form.category_id) || '' };
    const errs = validatePost(data);
    setErrors(errs);
    if (Object.keys(errs).length) {
      notify(`Revisa ${Object.keys(errs).length} campo(s) marcados antes de guardar.`, 'error');
      setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setSaving(true);
    try {
      const saved = isNew ? await api.post('/admin/posts', data) : await api.put(`/admin/posts/${id}`, data);
      dirty.current = false;
      notify(status === 'published' ? 'Noticia publicada.' : 'Borrador guardado.');
      if (isNew) navigate(`/admin/noticias/${saved.id}`, { replace: true });
      else setForm((f) => ({ ...f, status }));
    } catch (err) {
      setErrors(err.errors || {});
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && loading) return <Loading />;
  if (error) return <ErrorMessage error={error} />;

  const minutes = readingTime(form.content);

  return (
    <>
      <div className="admin__head">
        <h1>{isNew ? 'Escribir noticia' : 'Editar noticia'}</h1>
        <Link to="/admin/noticias" className="btn btn--ghost">Volver a noticias</Link>
      </div>

      <form ref={formRef} className="editor" noValidate onSubmit={(e) => { e.preventDefault(); save('published'); }}>
        <div className="editor__main">
          <Field label="Título" required maxLength={150} {...bind('title')}
            hint="Claro y directo. Entre 5 y 150 caracteres." />
          <Field label="Resumen" as="textarea" rows={3} required maxLength={300} {...bind('excerpt')}
            hint="Una o dos frases que expliquen la noticia. Aparece en la portada." />

          <div className="editor__tabs" role="group" aria-label="Modo del contenido">
            <button type="button" className="btn btn--small" aria-pressed={!preview} onClick={() => setPreview(false)}>Escribir</button>
            <button type="button" className="btn btn--small" aria-pressed={preview} onClick={() => setPreview(true)}>Vista previa</button>
            <span className="muted">{minutesLabel(minutes)}</span>
          </div>
          {preview ? (
            <div className="prose editor__preview" aria-label="Vista previa del contenido">
              {parseContent(form.content).map((b, i) => b.type === 'h2' ? <h2 key={i}>{b.text}</h2> : <p key={i}>{b.text}</p>)}
            </div>
          ) : (
            <Field label="Contenido" as="textarea" rows={14} required {...bind('content')}
              hint="Separa los párrafos con una línea en blanco. Para un subtítulo, empieza la línea con ## y un espacio." />
          )}
        </div>

        <div className="editor__side">
          <fieldset className="panel">
            <legend>Publicación</legend>
            <p>Estado actual: <span className={`status status--${form.status}`}>{form.status === 'published' ? 'Publicada' : 'Borrador'}</span></p>
            <Field label="Categoría" as="select" required {...bind('category_id')}>
              <option value="">Elige una categoría</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Field>
            <label className="check">
              <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
              Mostrar como noticia principal de la portada
            </label>
            <div className="editor__actions">
              <button type="button" className="btn btn--ghost" disabled={saving} onClick={() => save('draft')}>Guardar borrador</button>
              <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Guardando…' : 'Publicar'}</button>
            </div>
          </fieldset>

          <fieldset className="panel">
            <legend>Imagen</legend>
            {form.image_url && <img src={form.image_url} alt="" className="editor__thumb" width="800" height="450" />}
            <label className="field__label" htmlFor="img-file">Subir imagen <span className="field__opt">(opcional)</span></label>
            <p className="field__hint" id="img-hint">JPG, PNG, WEBP o GIF de hasta 2 MB.</p>
            <input id="img-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} aria-describedby="img-hint" disabled={uploading} />
            {uploading && <p role="status">Subiendo imagen…</p>}
            {errors.image_url && <p className="field__error" role="alert"><span aria-hidden="true">⚠ </span>{errors.image_url}</p>}
            {form.image_url && (
              <>
                <Field label="Texto alternativo" required maxLength={200} {...bind('image_alt')}
                  hint="Describe lo que se ve, como si se lo contaras a alguien por teléfono." />
                <button type="button" className="btn btn--small btn--danger-ghost" onClick={() => { set('image_url', ''); set('image_alt', ''); }}>
                  Quitar imagen
                </button>
              </>
            )}
          </fieldset>
        </div>
      </form>
    </>
  );
}
