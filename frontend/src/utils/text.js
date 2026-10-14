/** Utilidades de texto y fechas (sin dependencias, probadas con node --test). */

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-10-12 09:30:00" -> "12 de octubre de 2026" */
export function formatDate(value) {
  if (!value) return '';
  const [d] = String(value).split(/[ T]/);
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return '';
  return `${day} de ${MONTHS[m - 1]} de ${y}`;
}

/** Fecha en formato ISO para el atributo datetime de <time>. */
export function isoDate(value) {
  return value ? String(value).replace(' ', 'T') : undefined;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'entrada';
}

export function readingTime(text, wpm = 200) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wpm));
}

export function minutesLabel(n) {
  return n === 1 ? '1 minuto de lectura' : `${n} minutos de lectura`;
}

/**
 * Convierte el contenido en bloques: párrafos separados por línea en blanco y
 * subtítulos que comienzan con "## ". No se usa HTML, así se evita XSS.
 */
export function parseContent(content) {
  return String(content || '')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => (b.startsWith('## ') ? { type: 'h2', text: b.slice(3).trim() } : { type: 'p', text: b }));
}

/** Texto plano para lectura en voz alta. */
export function plainText(title, content) {
  return [title, ...parseContent(content).map((b) => b.text)].join('. \n');
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
}

export function pluralize(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
