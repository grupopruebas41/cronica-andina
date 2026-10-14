/**
 * Pruebas unitarias (caja blanca) de utilidades y validaciones del frontend.
 * Usan el ejecutor nativo de Node:  npm test   (o: node --test tests/unit/)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate, isEmail, minutesLabel, parseContent, plainText, pluralize, readingTime, slugify,
} from '../../src/utils/text.js';
import { validateComment, validateLogin, validatePost, validateUser } from '../../src/utils/validation.js';

test('PU-01 formatDate convierte fechas a español', () => {
  assert.equal(formatDate('2026-10-12 09:30:00'), '12 de octubre de 2026');
  assert.equal(formatDate('2026-01-01'), '1 de enero de 2026');
  assert.equal(formatDate(null), '');
  assert.equal(formatDate('texto'), '');
});

test('PU-02 slugify quita tildes, eñes y símbolos', () => {
  assert.equal(slugify('Niñas y niños: ¡robótica!'), 'ninas-y-ninos-robotica');
  assert.equal(slugify('   '), 'entrada');
});

test('PU-03 readingTime usa 200 palabras por minuto y mínimo 1', () => {
  assert.equal(readingTime(''), 1);
  assert.equal(readingTime('palabra '.repeat(200)), 1);
  assert.equal(readingTime('palabra '.repeat(201)), 2);
});

test('PU-04 minutesLabel y pluralize usan singular y plural', () => {
  assert.equal(minutesLabel(1), '1 minuto de lectura');
  assert.equal(minutesLabel(3), '3 minutos de lectura');
  assert.equal(pluralize(1, 'campo', 'campos'), '1 campo');
  assert.equal(pluralize(2, 'campo', 'campos'), '2 campos');
});

test('PU-05 parseContent separa párrafos y subtítulos sin interpretar HTML', () => {
  const blocks = parseContent('Primer párrafo.\n\n## Subtítulo\n\n<script>x</script>');
  assert.deepEqual(blocks, [
    { type: 'p', text: 'Primer párrafo.' },
    { type: 'h2', text: 'Subtítulo' },
    { type: 'p', text: '<script>x</script>' }, // se mostrará como texto, nunca como HTML
  ]);
});

test('PU-06 plainText arma el texto para lectura en voz alta', () => {
  assert.match(plainText('Título', 'Uno.\n\n## Dos'), /^Título\. \nUno\.\. \nDos$/);
});

test('PU-07 isEmail acepta correos válidos y rechaza inválidos', () => {
  for (const ok of ['a@b.pe', 'nombre.apellido@correo.com']) assert.ok(isEmail(ok), ok);
  for (const bad of ['', 'a@', '@b.com', 'a b@c.com', 'a@b.c']) assert.ok(!isEmail(bad), bad);
});

test('PU-08 validateComment: valores límite de longitud', () => {
  const base = { author: 'Ana', email: 'ana@correo.com', body: 'Hola' };
  assert.deepEqual(validateComment(base), {});
  assert.ok(validateComment({ ...base, author: 'A' }).author);
  assert.ok(validateComment({ ...base, body: 'ab' }).body);
  assert.deepEqual(validateComment({ ...base, body: 'x'.repeat(1000) }), {});
  assert.ok(validateComment({ ...base, body: 'x'.repeat(1001) }).body);
});

test('PU-09 validatePost exige texto alternativo cuando hay imagen', () => {
  const post = {
    title: 'Título válido', excerpt: 'Resumen con más de veinte caracteres', content: 'x'.repeat(50), category_id: 1,
  };
  assert.deepEqual(validatePost(post), {});
  assert.ok(validatePost({ ...post, image_url: '/img/a.png' }).image_alt);
  assert.deepEqual(validatePost({ ...post, image_url: '/img/a.png', image_alt: 'Una foto del valle' }), {});
});

test('PU-10 validatePost: particiones de equivalencia del título', () => {
  const post = { excerpt: 'Resumen con más de veinte caracteres', content: 'x'.repeat(50), category_id: 1 };
  assert.ok(validatePost({ ...post, title: 'Hola' }).title);            // 4 (inválido)
  assert.equal(validatePost({ ...post, title: 'Hola!' }).title, undefined); // 5 (límite válido)
  assert.equal(validatePost({ ...post, title: 'x'.repeat(150) }).title, undefined);
  assert.ok(validatePost({ ...post, title: 'x'.repeat(151) }).title);   // 151 (inválido)
});

test('PU-11 validateLogin y validateUser', () => {
  assert.ok(validateLogin({ email: 'x', password: '' }).email);
  assert.ok(validateLogin({ email: 'a@b.pe', password: '' }).password);
  assert.ok(validateUser({ name: 'Ana Ruiz', email: 'a@b.pe', password: 'solotexto' }).password);
  assert.deepEqual(validateUser({ name: 'Ana Ruiz', email: 'a@b.pe', password: 'Clave2026' }), {});
});
