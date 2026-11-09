import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const htmlPath = path.resolve(root, process.argv[2] ?? 'dist/index.html');
const assetRoot = path.resolve(root, 'public/xensonar-family-standalone');
const manifestPath = path.join(assetRoot, 'manifest.json');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function escapeScriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

if (!fs.existsSync(htmlPath)) {
  throw new Error(`HTML not found: ${htmlPath}`);
}
if (!fs.existsSync(manifestPath)) {
  throw new Error(`Embedded standalone manifest not found: ${manifestPath}`);
}

const manifest = JSON.parse(readText(manifestPath));
const apps = manifest.apps ?? {};
const payloads = {};
const payloadReport = {};

for (const [key, entry] of Object.entries(apps)) {
  if (!entry?.path) throw new Error(`Manifest entry ${key} has no path.`);
  const fileName = path.basename(entry.path);
  const payloadPath = path.join(assetRoot, fileName);
  if (!fs.existsSync(payloadPath)) throw new Error(`Standalone payload missing for ${key}: ${payloadPath}`);
  const payload = readText(payloadPath).trim();
  if (!payload) throw new Error(`Standalone payload empty for ${key}: ${payloadPath}`);
  payloads[key] = payload;
  payloadReport[key] = {
    file: fileName,
    bytes: Buffer.byteLength(payload, 'utf8'),
  };
}

let html = readText(htmlPath);
html = html.replace(/<script id="xensonar-embedded-standalone-payload"[\s\S]*?<\/script>\s*/g, '');

const inlineScript = `<script id="xensonar-embedded-standalone-payload">\n` +
  `window.__XENSONAR_EMBEDDED_STANDALONE_APPS__=${escapeScriptJson(payloads)};\n` +
  `window.__XENSONAR_STANDALONE_APP_ASSET_BASE__="__inline_singlefile__";\n` +
  `</script>\n`;

if (html.includes('<script type="module"')) {
  html = html.replace('<script type="module"', `${inlineScript}<script type="module"`);
} else if (html.includes('</head>')) {
  html = html.replace('</head>', `${inlineScript}</head>`);
} else {
  throw new Error('Could not find an injection point before the app script.');
}

fs.writeFileSync(htmlPath, html);

const report = {
  html: path.relative(root, htmlPath),
  manifest: path.relative(root, manifestPath),
  manifestVersion: manifest.version ?? null,
  embeddedKeys: Object.keys(payloads),
  payloadReport,
  htmlBytesAfterInjection: fs.statSync(htmlPath).size,
};
console.log('[xensonar-inline-standalone-assets] ok');
console.log(JSON.stringify(report, null, 2));
