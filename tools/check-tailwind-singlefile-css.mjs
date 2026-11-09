#!/usr/bin/env node
import fs from 'node:fs';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const cssPath = 'src/index.css';
const css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('@import "tailwindcss" source(none);')) fail('index.css must keep Tailwind source(none) import explicit.');
if (!css.includes('@source "./";')) fail('index.css must use the known-good ./ source scan; narrower ./src scanning dropped utility CSS in 3.2.91.5.10.');
if (css.includes('@source "./src";') || css.includes('@source "./index.html";')) fail('index.css still contains the broken narrowed source scan from 3.2.91.5.10.');

const htmlPath = process.argv[2] || 'dist/index.html';
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const requiredUtilities = ['.flex', '.bg-neutral-950', '.text-cyan-100', '.fixed', '.grid'];
  const missing = requiredUtilities.filter((token) => !html.includes(token));
  if (missing.length) fail(`Singlefile HTML is missing Tailwind utility CSS tokens: ${missing.join(', ')}`);
}
console.log('ok');
