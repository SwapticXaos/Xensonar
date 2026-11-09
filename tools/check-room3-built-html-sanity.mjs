#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const htmlArg = process.argv[2] ?? 'dist/index.html';
const htmlPath = resolve(process.cwd(), htmlArg);
const failures = [];
if (!existsSync(htmlPath)) failures.push(`missing built html: ${htmlPath}`);
const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
for (const marker of [
  'data-xensonar-room3-synth-controls',
  'data-xensonar-room3-synth-section',
  'Myzel-Farbstimme',
  'Raum-III-Feldgeräte',
  'Nodal-Modulationsmatrix',
]) {
  if (!html.includes(marker)) failures.push(`built html missing marker: ${marker}`);
}
for (const forbidden of [
  'frameNowMs is not defined',
  'Paketstation-Datenport konnte nicht aktiviert werden',
]) {
  if (html.includes(forbidden)) failures.push(`built html contains forbidden regression marker: ${forbidden}`);
}
if (failures.length) {
  console.error('[room3-built-html-sanity] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[room3-built-html-sanity] ok');
console.log(JSON.stringify({ htmlPath, bytes: html.length }, null, 2));
