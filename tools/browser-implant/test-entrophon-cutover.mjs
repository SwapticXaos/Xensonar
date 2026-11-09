import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outDir = path.join(root, 'tools/browser-implant/build-test');
const outfile = path.join(outDir, 'entrophon-cutover.test.mjs');
fs.mkdirSync(outDir, { recursive: true });
await build({
  entryPoints: [path.join(root, 'tools/browser-implant/tests/entrophon-cutover.test.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node22'],
  define: {
    'import.meta.env.VITE_XENSONAR_BROWSER_IMPLANT_DEFAULT': '"0"',
  },
  legalComments: 'none',
  sourcemap: false,
});
await import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
