import { useDocumentTitle } from '../utils/hooks.js';

/** Declaración de accesibilidad: explica qué se hizo y cómo usar las ayudas. */
export default function AccessibilityPage() {
  useDocumentTitle('Declaración de accesibilidad');
  return (
    <article className="article prose-page">
      <header className="page-head">
        <h1>Declaración de accesibilidad</h1>
        <p>Queremos que cualquier persona pueda leer, escuchar y comentar nuestras noticias. Este sitio se diseñó siguiendo las pautas WCAG 2.2 en su nivel AA.</p>
      </header>
      <div className="prose">
        <h2>Para personas con baja visión o daltonismo</h2>
        <ul>
          <li>Contraste mínimo de 4,5 a 1 en todo el texto, y modo de alto contraste.</li>
          <li>Texto ampliable hasta 150 % sin que se rompa el diseño.</li>
          <li>Los estados nunca se indican solo con color: siempre llevan texto o ícono.</li>
          <li>Todas las imágenes tienen descripción. El panel exige escribirla antes de publicar.</li>
          <li>Compatible con lectores de pantalla (NVDA, JAWS, VoiceOver, TalkBack).</li>
        </ul>
        <h2>Para personas sordas o con baja audición</h2>
        <ul>
          <li>El sitio no comunica nada solo con sonido: todos los avisos son visuales y textuales.</li>
          <li>La lectura en voz alta es opcional y el texto completo está siempre en pantalla.</li>
        </ul>
        <h2>Para personas con discapacidad motriz</h2>
        <ul>
          <li>Todo se puede usar solo con el teclado, con un indicador de foco visible.</li>
          <li>Enlace «Saltar al contenido» al inicio de cada página.</li>
          <li>Botones de al menos 44 por 44 píxeles y sin acciones con límite de tiempo.</li>
        </ul>
        <h2>Para personas con discapacidad cognitiva o dislexia</h2>
        <ul>
          <li>Lenguaje sencillo, menús iguales en todas las páginas y ruta de navegación.</li>
          <li>Modo «Lectura fácil» con más espacio entre líneas y letras.</li>
          <li>Mensajes de error que explican cómo corregir el dato.</li>
          <li>Confirmación antes de cualquier acción que no se puede deshacer.</li>
          <li>Tiempo estimado de lectura en cada noticia.</li>
        </ul>
        <h2>¿Encontraste una barrera?</h2>
        <p>Escríbenos en los comentarios de cualquier noticia contando qué pasó y en qué página. Revisamos cada reporte.</p>
      </div>
    </article>
  );
}
