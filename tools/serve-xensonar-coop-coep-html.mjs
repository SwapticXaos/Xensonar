#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = args.find((value) => value.startsWith(prefix));
  if (arg) return arg.slice(prefix.length);
  const positionalIndex = args.findIndex((value) => value === `--${name}`);
  if (positionalIndex >= 0 && args[positionalIndex + 1]) return args[positionalIndex + 1];
  return fallback;
}

const positionalFile = args.find((value) => !value.startsWith('--'));
const htmlFile = path.resolve(root, readArg('file', positionalFile ?? 'dist/index.html'));
const host = readArg('host', '127.0.0.1');
const port = Number(readArg('port', process.env.PORT ?? '4179'));

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`[xensonar-coop-coep-server] Invalid --port value: ${String(port)}`);
  process.exit(1);
}

if (!fs.existsSync(htmlFile)) {
  console.error(`[xensonar-coop-coep-server] HTML file not found: ${htmlFile}`);
  console.error('[xensonar-coop-coep-server] Build first, for example: npm run patch:html');
  process.exit(1);
}

const htmlDir = path.dirname(htmlFile);
const htmlName = path.basename(htmlFile);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.htm', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.wav', 'audio/wav'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
]);

function applyCoopCoepHeaders(response) {
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Origin-Agent-Cluster', '?1');
  response.setHeader('Cache-Control', 'no-store');
}

function safeResolveRequestPath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const relative = decoded === '/' ? htmlName : decoded.replace(/^\/+/, '');
  const candidate = path.resolve(htmlDir, relative);
  const relativeToHtmlDir = path.relative(htmlDir, candidate);
  if (relativeToHtmlDir.startsWith('..') || path.isAbsolute(relativeToHtmlDir)) return null;
  return candidate;
}

const server = http.createServer((request, response) => {
  applyCoopCoepHeaders(response);

  const requestUrl = new URL(request.url ?? '/', `http://${host}:${port}`);

  if (requestUrl.pathname === '/__xensonar_coop_coep_probe.json') {
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({
      ok: true,
      purpose: 'xensonar-stable-lane-sab-readiness-testserver',
      htmlFile,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
      expectedBrowserReadiness: 'available when the browser treats localhost as secure and no subresource violates COEP',
    }, null, 2));
    return;
  }

  const filePath = safeResolveRequestPath(requestUrl.pathname);
  const resolvedFile = filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    ? filePath
    : htmlFile;

  const ext = path.extname(resolvedFile).toLowerCase();
  response.setHeader('Content-Type', mimeTypes.get(ext) ?? 'application/octet-stream');

  fs.createReadStream(resolvedFile)
    .on('error', (error) => {
      response.statusCode = 500;
      response.end(`[xensonar-coop-coep-server] Failed to read ${resolvedFile}: ${error.message}`);
    })
    .pipe(response);
});

server.listen(port, host, () => {
  const url = `http://${host}:${port}/`;
  console.log('[xensonar-coop-coep-server] Serving Xensonar HTML with SAB-readiness headers');
  console.log(`[xensonar-coop-coep-server] HTML: ${htmlFile}`);
  console.log(`[xensonar-coop-coep-server] URL:  ${url}`);
  console.log('[xensonar-coop-coep-server] Headers: COOP=same-origin, COEP=require-corp, CORP=same-origin');
  console.log('[xensonar-coop-coep-server] Probe: /__xensonar_coop_coep_probe.json');
  console.log('[xensonar-coop-coep-server] Stop with Ctrl+C.');
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
