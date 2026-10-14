/**
 * Pruebas de sistema (E2E), de accesibilidad y de eficiencia con Playwright.
 * Levanta el backend PHP con una base temporal y usa el frontend compilado en backend/public.
 *
 *   npm run build      (o npm run build:lite)
 *   npm run test:e2e
 *
 * Resultados: tests/results/e2e-results.json   Capturas: ../docs/capturas/
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const backend = join(here, '..', '..', '..', 'backend');
const shots = join(here, '..', '..', '..', 'docs', 'capturas');
const resultsDir = join(here, '..', 'results');
mkdirSync(shots, { recursive: true });
mkdirSync(resultsDir, { recursive: true });

const PORT = 8766;
const BASE = `http://127.0.0.1:${PORT}`;
const db = join(tmpdir(), `cronica_e2e_${Date.now()}.sqlite`);
const server = spawn('php', ['-S', `127.0.0.1:${PORT}`, '-t', join(backend, 'public'), join(backend, 'public', 'index.php')], {
  env: { ...process.env, CA_DB_PATH: db }, stdio: 'ignore',
});
const stop = () => { server.kill(); for (const s of ['', '-wal', '-shm']) rmSync(db + s, { force: true }); };
process.on('exit', stop);

for (let i = 0; i < 50; i++) {
  try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch { /* esperando */ }
  await new Promise((r) => setTimeout(r, 100));
}

const browser = await chromium.launch();
// Bloquea recursos externos (fuentes) para que la medición sea reproducible sin internet.
const newPage = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'es-PE', ...opts });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));
  return page;
};

const results = { e2e: [], accessibility: [], performance: {} };
async function test(id, name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.e2e.push({ id, name, ok: true, ms: Date.now() - t0 });
    console.log(`  \x1b[32m✔\x1b[0m ${id} ${name}`);
  } catch (e) {
    results.e2e.push({ id, name, ok: false, error: e.message.split('\n')[0], ms: Date.now() - t0 });
    console.log(`  \x1b[31m✘\x1b[0m ${id} ${name}\n      → ${e.message.split('\n')[0]}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function login(page, email = 'admin@cronica.pe', password = 'Admin2026') {
  await page.goto(`${BASE}/ingresar`);
  await page.getByLabel(/^Correo electrónico/).fill(email);
  await page.getByLabel('Contraseña', { exact: false }).first().fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL(`${BASE}/admin`);
}

console.log('\nPruebas de sistema (E2E)\n');

await test('E2E-01', 'La portada carga la noticia principal, las últimas y las más leídas', async () => {
  const p = await newPage();
  await p.goto(BASE);
  await p.locator('.lead__title').waitFor();
  await p.locator('.popular__list li').first().waitFor();
  assert(await p.locator('.lead__title').count() === 1, 'falta la noticia principal');
  assert(await p.locator('.popular__list li').count() === 4, 'faltan las más leídas');
  assert((await p.title()).includes('Portada'), 'título de pestaña');
  await p.screenshot({ path: join(shots, '01-portada.png'), fullPage: true });
  assert(p.errors.length === 0, `errores JS: ${p.errors}`);
});

await test('E2E-02', 'Navegación solo con teclado: «Saltar al contenido» es el primer foco', async () => {
  const p = await newPage();
  await p.goto(BASE);
  await p.keyboard.press('Tab');
  const first = await p.evaluate(() => document.activeElement.textContent);
  assert(first === 'Saltar al contenido', `primer foco: ${first}`);
  await p.screenshot({ path: join(shots, '02-saltar-contenido.png') });
  await p.keyboard.press('Enter');
  const id = await p.evaluate(() => document.activeElement.id || location.hash);
  assert(id === 'contenido' || id === '#contenido', `foco tras Enter: ${id}`);
});

await test('E2E-03', 'Abrir una noticia desde la portada muestra contenido, ruta y comentarios', async () => {
  const p = await newPage();
  await p.goto(BASE);
  await p.getByRole('link', { name: /Escolares del valle/ }).first().click();
  await p.getByRole('heading', { level: 1, name: /Escolares del valle/ }).waitFor();
  assert(await p.getByRole('navigation', { name: 'Ruta de navegación' }).isVisible(), 'falta ruta');
  await p.getByRole('heading', { name: /Comentarios \(1\)/ }).waitFor({ timeout: 5000 });
  const focused = await p.evaluate(() => document.activeElement.id);
  assert(focused === 'contenido', 'el foco no se movió al contenido al cambiar de página');
  await p.screenshot({ path: join(shots, '03-noticia.png'), fullPage: true });
});

await test('E2E-04', 'La búsqueda encuentra «feria» y la tecla / enfoca el buscador', async () => {
  const p = await newPage();
  await p.goto(BASE);
  await p.locator('.lead__title').waitFor();
  await p.keyboard.press('/');
  assert(await p.evaluate(() => document.activeElement.id) === 'buscar', 'atajo /');
  await p.keyboard.type('feria');
  await p.keyboard.press('Enter');
  await p.getByText('1 resultado(s) para «feria»').waitFor();
  await p.screenshot({ path: join(shots, '04-busqueda.png') });
});

await test('E2E-05', 'Comentario vacío: muestra errores claros y lleva el foco al primero', async () => {
  const p = await newPage();
  await p.goto(`${BASE}/noticia/nueva-ciclovia-conectara-el-centro-con-el-parque-de-la-identidad`);
  await p.getByRole('button', { name: 'Enviar comentario' }).click();
  await p.getByText('Hay 3 campos por corregir.').waitFor();
  await p.waitForFunction(() => document.activeElement?.getAttribute('aria-invalid') === 'true', null, { timeout: 3000 });
  const focused = await p.evaluate(() => document.activeElement.labels?.[0]?.textContent);
  assert(focused?.startsWith('Nombre'), `foco en: ${focused}`);
  const described = await p.getByLabel(/^Nombre/).getAttribute('aria-describedby');
  assert(described?.includes('err'), 'el error no está asociado con aria-describedby');
  await p.locator('.comment-form').screenshot({ path: join(shots, '05-errores-formulario.png') });
});

await test('E2E-06', 'Comentario válido: aviso visual de moderación pendiente', async () => {
  const p = await newPage();
  await p.goto(`${BASE}/noticia/nueva-ciclovia-conectara-el-centro-con-el-parque-de-la-identidad`);
  await p.getByLabel(/^Nombre/).fill('Rosa Huamán');
  await p.getByLabel(/^Correo electrónico/).fill('rosa@correo.com');
  await p.getByLabel(/^Comentario \(/).fill('¿Habrá parqueo para bicicletas en el mercado?');
  await p.getByRole('button', { name: 'Enviar comentario' }).click();
  await p.getByRole('status').filter({ hasText: 'será publicado' }).waitFor();
  await p.screenshot({ path: join(shots, '06-aviso-visual.png') });
});

await test('E2E-07', 'Suscripción al boletín con validación', async () => {
  const p = await newPage();
  await p.goto(BASE);
  await p.getByLabel('Tu correo para el boletín').fill('correo-malo');
  await p.getByRole('button', { name: 'Suscribirme' }).click();
  await p.getByText(/Escribe un correo válido/).waitFor();
  await p.getByLabel('Tu correo para el boletín').fill('vecina@correo.com');
  await p.getByRole('button', { name: 'Suscribirme' }).click();
  await p.getByText(/Te enviaremos las noticias/).waitFor();
});

await test('E2E-08', 'Login incorrecto muestra mensaje y login correcto abre el panel', async () => {
  const p = await newPage();
  await p.goto(`${BASE}/ingresar`);
  await p.getByLabel(/^Correo electrónico/).fill('admin@cronica.pe');
  await p.getByLabel(/^Contraseña/).fill('equivocada');
  await p.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await p.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos' }).waitFor();
  await p.screenshot({ path: join(shots, '07-login-error.png') });
  await p.getByLabel(/^Contraseña/).fill('Admin2026');
  await p.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await p.getByRole('heading', { name: 'Resumen' }).waitFor();
  await p.screenshot({ path: join(shots, '08-panel-resumen.png'), fullPage: true });
});

await test('E2E-09', 'Flujo completo: escribir, publicar y ver la noticia en la portada', async () => {
  const p = await newPage();
  await login(p);
  await p.getByRole('link', { name: 'Escribir noticia' }).first().click();
  await p.getByRole('heading', { name: 'Escribir noticia' }).waitFor();
  await p.getByRole('button', { name: 'Publicar' }).click();
  await p.getByText(/Revisa \d campo/).waitFor(); // validación antes de enviar
  await p.screenshot({ path: join(shots, '09-editor-validacion.png'), fullPage: true });
  await p.getByLabel(/^Título/).fill('Mercado modelo amplía su horario los domingos');
  await p.getByLabel(/^Resumen/).fill('Desde este mes el mercado atenderá de 6:00 a 16:00 los domingos.');
  await p.getByLabel(/^Contenido/).fill('La administración del mercado anunció la ampliación del horario dominical.\n\n## Motivo\n\nLa medida responde al pedido de los comerciantes y de las familias que compran el fin de semana.');
  await p.getByLabel(/^Categoría/).selectOption({ label: 'Economía' });
  await p.getByRole('button', { name: 'Vista previa' }).click();
  await p.getByRole('heading', { level: 2, name: 'Motivo' }).waitFor();
  await p.screenshot({ path: join(shots, '10-editor-vista-previa.png'), fullPage: true });
  await p.getByRole('button', { name: 'Publicar' }).click();
  await p.getByText('Noticia publicada.').waitFor();
  await p.goto(BASE);
  await p.getByRole('link', { name: 'Mercado modelo amplía su horario los domingos' }).waitFor();
});

await test('E2E-10', 'Moderación: aprobar un comentario pendiente', async () => {
  const p = await newPage();
  await login(p);
  await p.goto(`${BASE}/admin/comentarios`);
  await p.locator('.mod').first().waitFor();
  const before = await p.locator('.mod').count();
  await p.getByRole('button', { name: /^Aprobar/ }).first().click();
  await p.getByText(/aprobado\./).waitFor();
  await p.waitForFunction((n) => document.querySelectorAll('.mod').length === n - 1, before);
  await p.screenshot({ path: join(shots, '11-moderacion.png'), fullPage: true });
});

await test('E2E-11', 'Eliminar pide confirmación; Esc cancela y devuelve el foco', async () => {
  const p = await newPage();
  await login(p);
  await p.goto(`${BASE}/admin/noticias`);
  const btn = p.getByRole('button', { name: /^Eliminar/ }).first();
  await btn.click();
  await p.getByRole('alertdialog').waitFor();
  await p.screenshot({ path: join(shots, '12-confirmacion.png') });
  await p.keyboard.press('Escape');
  assert(await p.getByRole('alertdialog').count() === 0, 'el diálogo sigue abierto');
  const back = await p.evaluate(() => document.activeElement.textContent);
  assert(back.startsWith('Eliminar'), `foco devuelto a: ${back}`);
});

await test('E2E-12', 'Un editor no ve las secciones exclusivas del administrador', async () => {
  const p = await newPage();
  await login(p, 'editor@cronica.pe', 'Editor2026');
  assert(await p.getByRole('link', { name: 'Usuarios' }).count() === 0, 've Usuarios');
  await p.goto(`${BASE}/admin/usuarios`);
  await p.getByText('Esta sección es solo para administradores.').waitFor();
});

await test('E2E-13', 'Ajustes de lectura: texto al 150 %, alto contraste y modo oscuro', async () => {
  const p = await newPage();
  await p.goto(`${BASE}/noticia/biblioteca-municipal-abre-laboratorio-de-robotica-para-ninas-y-ninos`);
  await p.getByRole('button', { name: 'Ajustes de lectura' }).click();
  const dlg = p.getByRole('dialog', { name: 'Ajustes de lectura' });
  await dlg.waitFor();
  await p.waitForTimeout(400);
  await p.screenshot({ path: join(shots, '13-panel-accesibilidad.png') });
  await dlg.locator('input[name=font]').nth(3).check();
  await dlg.getByRole('switch', { name: /Alto contraste/ }).check();
  await p.keyboard.press('Escape');
  const html = await p.evaluate(() => ({ c: document.documentElement.dataset.contrast, s: getComputedStyle(document.documentElement).fontSize }));
  assert(html.c === 'high', 'contraste');
  assert(html.s === '24px', `tamaño de fuente ${html.s}`);
  await p.screenshot({ path: join(shots, '14-alto-contraste-150.png') });
  await p.reload();
  assert(await p.evaluate(() => document.documentElement.dataset.contrast) === 'high', 'no recuerda la preferencia');
  await p.getByRole('button', { name: 'Ajustes de lectura' }).click();
  await p.getByRole('switch', { name: /Alto contraste/ }).uncheck();
  await p.getByRole('dialog').locator('input[name=font]').nth(0).check();
  await p.getByRole('dialog').getByLabel('Oscuro').check();
  await p.keyboard.press('Escape');
  await p.screenshot({ path: join(shots, '15-modo-oscuro.png') });
});

await test('E2E-14', 'Responsive: a 320 px de ancho no hay desplazamiento horizontal', async () => {
  for (const path of ['/', '/noticia/nueva-ciclovia-conectara-el-centro-con-el-parque-de-la-identidad', '/ingresar']) {
    const p = await newPage({ viewport: { width: 320, height: 640 } });
    await p.goto(BASE + path);
    await p.waitForLoadState('networkidle');
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(over <= 0, `${path} se desborda ${over}px`);
    if (path === '/') await p.screenshot({ path: join(shots, '16-movil-320.png'), fullPage: false });
  }
});

await test('E2E-15', 'Zoom de texto al 200 % (WCAG 1.4.4) sin pérdida de contenido', async () => {
  const p = await newPage({ viewport: { width: 640, height: 860 } });
  await p.goto(BASE);
  await p.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert(over <= 0, `se desborda ${over}px`);
});

await test('E2E-16', 'Ahorro de datos: no se descargan imágenes y se conserva su descripción', async () => {
  const p = await newPage();
  await p.addInitScript(() => localStorage.setItem('ca_a11y', JSON.stringify({ saveData: true })));
  const imgs = [];
  p.on('request', (r) => r.resourceType() === 'image' && imgs.push(r.url()));
  await p.goto(BASE);
  await p.waitForLoadState('networkidle');
  assert(imgs.length === 0, `se descargaron ${imgs.length} imágenes`);
  assert(await p.getByText(/Imagen oculta por el modo ahorro de datos/).count() > 0, 'falta la descripción');
});

await test('E2E-17', 'Ruta inexistente muestra página 404 con salida clara', async () => {
  const p = await newPage();
  await p.goto(`${BASE}/esto/no/existe`);
  await p.getByRole('heading', { name: 'No encontramos esta página' }).waitFor();
  await p.getByRole('link', { name: 'Ir a la portada', exact: true }).waitFor();
});

// ---------------------------------------------------------------- Accesibilidad automatizada
console.log('\nAuditoría automatizada de accesibilidad (WCAG 2.2 AA)\n');

/** Se ejecuta dentro de la página. Devuelve la lista de incumplimientos. */
function audit() {
  const v = [];
  const add = (rule, el, detail) => v.push({ rule, detail, el: (el?.outerHTML || '').slice(0, 90) });
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[aria-hidden="true"], .visually-hidden'); };
  const name = (el) => (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' ') || el.textContent || el.getAttribute('title') || el.value || '').trim();

  if (!document.documentElement.lang) add('3.1.1 Idioma de la página', document.documentElement, 'falta lang');
  if (!document.title) add('2.4.2 Título de página', null, 'sin título');
  if (!document.querySelector('main')) add('1.3.1 Regiones', null, 'falta <main>');
  document.querySelectorAll('img').forEach((img) => { if (!img.hasAttribute('alt')) add('1.1.1 Texto alternativo', img, 'img sin alt'); });
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.type === 'hidden' || el.closest('.hp')) return;
    const labelled = el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    if (!labelled) add('1.3.1 / 4.1.2 Etiqueta de formulario', el, 'control sin etiqueta');
  });
  document.querySelectorAll('a[href], button').forEach((el) => {
    if (el.closest('.hp')) return;
    if (!name(el)) add('4.1.2 Nombre accesible', el, 'enlace o botón sin nombre');
  });
  const h1 = document.querySelectorAll('h1').length;
  if (h1 !== 1) add('1.3.1 Encabezados', null, `${h1} elementos h1`);
  let last = 0;
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const lvl = Number(h.tagName[1]);
    if (last && lvl > last + 1) add('1.3.1 Orden de encabezados', h, `salto de h${last} a h${lvl}`);
    last = lvl;
  });
  const ids = {};
  document.querySelectorAll('[id]').forEach((el) => { ids[el.id] = (ids[el.id] || 0) + 1; });
  Object.entries(ids).forEach(([id, n]) => n > 1 && add('4.1.1 IDs únicos', null, `id «${id}» repetido ${n} veces`));

  // Contraste de texto (1.4.3)
  const parse = (c) => { const m = c.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 0]; return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage !== 'none' && !n.matches('.weave, .loading__bar')) return null; // imagen: no evaluable
      const c = parse(s.backgroundColor);
      if (c.a > 0.9) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  let checked = 0;
  let minRatio = 21;
  document.querySelectorAll('body *').forEach((el) => {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || !visible(el) || el.closest('[disabled], .img-placeholder ~ *')) return;
    if (el.closest('button:disabled')) return;
    const s = getComputedStyle(el);
    const bg = bgOf(el);
    if (!bg) return;
    const fg = parse(s.color);
    const [L1, L2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    const ratio = (L1 + 0.05) / (L2 + 0.05);
    const size = parseFloat(s.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    checked++;
    minRatio = Math.min(minRatio, ratio);
    if (ratio < (large ? 3 : 4.5)) add('1.4.3 Contraste', el, `${ratio.toFixed(2)}:1 (${s.color} sobre rgb(${bg.r},${bg.g},${bg.b}))`);
  });

  // Tamaño de objetivos táctiles (2.5.8, mínimo 24×24 px)
  let targets = 0;
  let smallest = 999;
  document.querySelectorAll('button, .btn, input:not([type=hidden]), select, [role=switch]').forEach((el) => {
    if (el.closest('.hp') || !visible(el)) return;
    const box = (el.type === 'checkbox' || el.type === 'radio') && el.closest('label') ? el.closest('label') : el;
    const r = box.getBoundingClientRect();
    if (r.width === 0) return;
    targets++;
    smallest = Math.min(smallest, Math.min(r.width, r.height));
    if (r.width < 24 || r.height < 24) add('2.5.8 Tamaño del objetivo', el, `${Math.round(r.width)}×${Math.round(r.height)} px`);
  });
  return { violations: v, textChecked: checked, minContrast: Number(minRatio.toFixed(2)), targets, smallestTarget: Math.round(smallest) };
}

const pages = [
  ['Portada', '/'],
  ['Noticia', '/noticia/nueva-ciclovia-conectara-el-centro-con-el-parque-de-la-identidad'],
  ['Sección', '/seccion/cultura'],
  ['Búsqueda', '/buscar?q=valle'],
  ['Declaración de accesibilidad', '/accesibilidad'],
  ['Ingreso', '/ingresar'],
  ['Panel: resumen', '/admin', true],
  ['Panel: noticias', '/admin/noticias', true],
  ['Panel: editor', '/admin/noticias/1', true],
  ['Panel: comentarios', '/admin/comentarios', true],
];
const themes = [
  ['Claro', { theme: 'light' }],
  ['Oscuro', { theme: 'dark' }],
  ['Alto contraste', { theme: 'light', contrast: true }],
  ['Alto contraste oscuro', { theme: 'dark', contrast: true }],
];
const tokenRes = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@cronica.pe', password: 'Admin2026' }) });
const { token } = await tokenRes.json();

for (const [themeName, prefs] of themes) {
  for (const [pageName, path, needsLogin] of pages) {
    const p = await newPage();
    await p.addInitScript(([t, pr]) => { if (t) localStorage.setItem('ca_token', t); localStorage.setItem('ca_a11y', JSON.stringify(pr)); }, [needsLogin ? token : null, prefs]);
    await p.goto(BASE + path);
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(150);
    const r = await p.evaluate(audit);
    results.accessibility.push({ page: pageName, theme: themeName, ...r });
    const mark = r.violations.length ? '\x1b[31m✘\x1b[0m' : '\x1b[32m✔\x1b[0m';
    console.log(`  ${mark} ${themeName.padEnd(22)} ${pageName.padEnd(30)} textos: ${String(r.textChecked).padStart(3)}  contraste mín: ${r.minContrast}:1  objetivo mín: ${r.smallestTarget}px`);
    r.violations.slice(0, 4).forEach((x) => console.log(`      → ${x.rule}: ${x.detail} ${x.el}`));
    await p.context().close();
  }
}

// ---------------------------------------------------------------- Eficiencia
console.log('\nEficiencia en equipo con recursos limitados\n');

async function measure(label, { cpu = 1, network = null, viewport = { width: 1280, height: 860 } }) {
  const p = await newPage({ viewport });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  if (network) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...network });
  await p.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  let bytes = 0;
  let requests = 0;
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; requests++; });
  const t0 = Date.now();
  await p.goto(BASE, { waitUntil: 'load' });
  await p.getByRole('heading', { name: 'Últimas noticias' }).waitFor();
  await p.waitForLoadState('networkidle');
  const total = Date.now() - t0;
  const m = await p.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
    return { fcp: Math.round(fcp), lcp: Math.round(window.__lcp), cls: Number(window.__cls.toFixed(3)), domContentLoaded: Math.round(nav.domContentLoadedEventEnd), heapMB: Number((performance.memory?.usedJSHeapSize / 1048576 || 0).toFixed(1)) };
  });
  const res = { ...m, readyMs: total, transferKB: Number((bytes / 1024).toFixed(1)), requests };
  results.performance[label] = res;
  console.log(`  ${label.padEnd(44)} FCP ${String(res.fcp).padStart(5)} ms  LCP ${String(res.lcp).padStart(5)} ms  CLS ${res.cls}  ${res.transferKB} KB en ${res.requests} peticiones  memoria JS ${res.heapMB} MB`);
  await p.context().close();
}

await measure('Escritorio, sin limitación', {});
await measure('Móvil gama baja (CPU ×4, 3G rápido)', {
  cpu: 4, viewport: { width: 360, height: 740 },
  network: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
});
await measure('Móvil muy limitado (CPU ×6, 3G lento)', {
  cpu: 6, viewport: { width: 360, height: 740 },
  network: { latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 },
});

// Peso del panel cargado bajo demanda
{
  const p = await newPage();
  const scripts = [];
  p.on('response', async (r) => { if (r.url().endsWith('.js')) scripts.push(r.url().split('/').pop()); });
  await p.goto(BASE); await p.waitForLoadState('networkidle');
  const publicScripts = scripts.length;
  results.performance.codeSplitting = { publicScripts, note: 'El panel de administración no se descarga en el sitio público.' };
}

await browser.close();

const e2eOk = results.e2e.filter((r) => r.ok).length;
const a11yOk = results.accessibility.filter((r) => r.violations.length === 0).length;
console.log(`\nE2E: ${e2eOk} de ${results.e2e.length} aprobadas`);
console.log(`Accesibilidad: ${a11yOk} de ${results.accessibility.length} combinaciones página/tema sin incumplimientos\n`);
results.date = new Date().toISOString();
writeFileSync(join(resultsDir, 'e2e-results.json'), JSON.stringify(results, null, 2));
stop();
process.exit(e2eOk === results.e2e.length && a11yOk === results.accessibility.length ? 0 : 1);
