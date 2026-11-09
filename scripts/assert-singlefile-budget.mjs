import fs from 'fs';
const file = process.argv[2];
const maxBytes = Number(process.argv[3] ?? 3800000);
if (!file) {
  console.error('Usage: node scripts/assert-singlefile-budget.mjs <html-file> [max-bytes]  # max-bytes is a technical size threshold, not a browser limit');
  process.exit(2);
}
const html = fs.readFileSync(file, 'utf8');
const totalBytes = Buffer.byteLength(html);
const hardFailTokens = ['react.development', 'react-dom.development', 'jsxDEV', '@vite/client', 'react-refresh', 'sourceMappingURL'];
const hardFails = hardFailTokens.filter((token) => html.includes(token));
if (totalBytes > maxBytes) {
  console.error(`HTML size threshold failed: ${totalBytes} bytes > ${maxBytes} bytes`);
  process.exit(1);
}
if (hardFails.length) {
  console.error(`HTML hard-fail tokens found: ${hardFails.join(', ')}`);
  process.exit(1);
}
console.log(`HTML size threshold ok: ${totalBytes} bytes <= ${maxBytes} bytes`);
