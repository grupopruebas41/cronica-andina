import { useA11y } from '../context/A11yContext.jsx';

/**
 * Imagen eficiente: dimensiones fijas (evita saltos de diseño), carga diferida
 * y decodificación asíncrona. En modo ahorro de datos no se descarga la imagen,
 * pero su descripción sigue disponible como texto.
 */
export default function PostImage({ src, alt, eager = false, className = '' }) {
  const { prefs } = useA11y();
  if (!src) return null;
  if (prefs.saveData) {
    return (
      <div className={`img-placeholder ${className}`}>
        <span>Imagen oculta por el modo ahorro de datos: {alt}</span>
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt || ''}
      width="800"
      height="450"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchpriority={eager ? 'high' : undefined}
    />
  );
}
