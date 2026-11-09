import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Package an already bundled Vite output. This does not substitute for bundling. */
export function packSinglefileHtml(inputPath, outputPath) {
  const directory = path.dirname(path.resolve(inputPath));
  const readAsset = (url) => {
    if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(url) || /[?#]/.test(url)) {
      throw new Error(`Expected a local bundled asset: ${url}`);
    }
    const asset = path.resolve(directory, url.replace(/^\//, ''));
    if (!asset.startsWith(directory + path.sep)) throw new Error(`Asset outside build directory: ${url}`);
    return fs.readFileSync(asset, 'utf8');
  };
  let html = fs.readFileSync(inputPath, 'utf8');
  html = html.replace(/<script\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (_, before, url, after) => `<script${before}${after}>${readAsset(url).replace(/<\/script/gi, match => match.replace('/', '\\/'))}</script>`);
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/\brel=["']stylesheet["']/i.test(tag)) return tag;
    const url = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!url) throw new Error('Stylesheet without href');
    return `<style>${readAsset(url).replace(/<\/style/gi, match => match.replace('/', '\\/'))}</style>`;
  });
  if (/<script\b[^>]*\bsrc=|<link\b[^>]*\brel=["']stylesheet/i.test(html)) {
    throw new Error('HTML still depends on external script or stylesheet assets');
  }
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, html);
  return { bytes: Buffer.byteLength(html), outputPath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , input, output] = process.argv;
  if (!input || !output) throw new Error('Usage: node scripts/pack-singlefile-html.mjs dist/index.html output.html');
  console.log(JSON.stringify(packSinglefileHtml(input, output), null, 2));
}
