/**
 * Build alternativo y liviano con esbuild (el mismo motor que usa Vite).
 * Genera el sitio dentro de backend/public, con división de código y minificación.
 *   node scripts/build-esbuild.mjs
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '..', 'backend', 'public');
const assets = join(out, 'assets');

rmSync(assets, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });

const result = await build({
  entryPoints: [join(root, 'src', 'main.jsx')],
  bundle: true,
  splitting: true,
  format: 'esm',
  minify: true,
  sourcemap: false,
  target: ['es2019'],
  jsx: 'automatic',
  outdir: assets,
  entryNames: '[name]-[hash]',
  chunkNames: 'chunk-[hash]',
  assetNames: '[name]-[hash]',
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true,
  logLevel: 'info',
});

const outputs = Object.keys(result.metafile.outputs);
const js = outputs.find((f) => /main-.*\.js$/.test(f)).split('/').pop();
const css = outputs.find((f) => /main-.*\.css$/.test(f))?.split('/').pop();

let html = readFileSync(join(root, 'index.html'), 'utf8');
html = html
  .replace('<script type="module" src="/src/main.jsx"></script>', `<script type="module" src="/assets/${js}"></script>`)
  .replace('</head>', `${css ? `    <link rel="stylesheet" href="/assets/${css}" />\n` : ''}  </head>`);
writeFileSync(join(out, 'index.html'), html);
cpSync(join(root, 'public'), out, { recursive: true });

// Resumen de tamaños (métrica de eficiencia)
let total = 0;
for (const f of readdirSync(assets)) {
  const size = statSync(join(assets, f)).size;
  total += size;
  console.log(`${f.padEnd(34)} ${(size / 1024).toFixed(1)} KB`);
}
console.log(`Total assets: ${(total / 1024).toFixed(1)} KB`);
console.log('Hash de build:', createHash('md5').update(js).digest('hex').slice(0, 8));
