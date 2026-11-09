import fs from 'fs';
const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/inspect-singlefile-html.mjs <html-file>');
  process.exit(2);
}
const html = fs.readFileSync(file, 'utf8');
const styleBytes = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].reduce((sum, match) => sum + Buffer.byteLength(match[1] ?? ''), 0);
const scriptBytes = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].reduce((sum, match) => sum + Buffer.byteLength(match[1] ?? ''), 0);
const tokens = ['react.development', 'react-dom.development', 'jsxDEV', '@vite/client', 'react-refresh', 'sourceMappingURL'];
const tokenCounts = Object.fromEntries(tokens.map((token) => [token, (html.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length]));
const report = {
  file,
  totalBytes: Buffer.byteLength(html),
  totalMiB: +(Buffer.byteLength(html) / 1024 / 1024).toFixed(3),
  styleBytes,
  scriptBytes,
  tokenCounts,
};
console.log(JSON.stringify(report, null, 2));
