import { isEmail } from './text.js';

/**
 * Validaciones del cliente. Usan los mismos límites que el backend PHP
 * (Validator.php) para que el usuario reciba el aviso antes de enviar.
 */

export function validateComment(f) {
  const e = {};
  if (String(f.author || '').trim().length < 2) e.author = 'Escribe tu nombre (al menos 2 letras).';
  if (!isEmail(f.email || '')) e.email = 'Escribe un correo válido, por ejemplo: nombre@correo.com';
  const body = String(f.body || '');
  if (body.trim().length < 3) e.body = 'El comentario debe tener al menos 3 caracteres.';
  else if (body.length > 1000) e.body = 'El comentario no puede superar 1000 caracteres.';
  return e;
}

export function validatePost(f) {
  const e = {};
  const len = (k) => String(f[k] || '').trim().length;
  if (len('title') < 5) e.title = 'El título debe tener al menos 5 caracteres.';
  else if (len('title') > 150) e.title = 'El título no puede superar 150 caracteres.';
  if (len('excerpt') < 20) e.excerpt = 'El resumen debe tener al menos 20 caracteres.';
  else if (len('excerpt') > 300) e.excerpt = 'El resumen no puede superar 300 caracteres.';
  if (len('content') < 50) e.content = 'El contenido debe tener al menos 50 caracteres.';
  if (!f.category_id) e.category_id = 'Elige una categoría.';
  if (f.image_url && len('image_alt') < 5) {
    e.image_alt = 'Describe la imagen (mínimo 5 caracteres) para las personas que no pueden verla.';
  }
  return e;
}

export function validateLogin(f) {
  const e = {};
  if (!isEmail(f.email || '')) e.email = 'Escribe un correo válido, por ejemplo: nombre@correo.com';
  if (!String(f.password || '')) e.password = 'Escribe tu contraseña.';
  return e;
}

export function validateUser(f) {
  const e = {};
  if (String(f.name || '').trim().length < 3) e.name = 'El nombre debe tener al menos 3 caracteres.';
  if (!isEmail(f.email || '')) e.email = 'Escribe un correo válido, por ejemplo: nombre@correo.com';
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(f.password || '')) {
    e.password = 'La contraseña debe tener 8 caracteres como mínimo, con letras y números.';
  }
  return e;
}
