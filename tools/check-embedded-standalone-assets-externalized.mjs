#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repo = path.resolve(path.dirname(__filename), '..');
const loaderPath = path.join(repo, 'src/features/xensonar/family/assets/embeddedStandaloneApps.ts');
const assetDir = path.join(repo, 'public/xensonar-family-standalone');
const manifestPath = path.join(assetDir, 'manifest.json');
const keys = ['resonanzwerk', 'zone', 'strangeAttractors', 'melodieQuest'];

function fail(message) {
  console.error(`[embedded-standalone-assets] ${message}`);
  process.exit(1);
}

function read(abs) {
  return fs.readFileSync(abs, 'utf8');
}

if (!fs.existsSync(loaderPath)) fail('missing embeddedStandaloneApps.ts loader');
if (!fs.existsSync(assetDir)) fail('missing public/xensonar-family-standalone asset directory');
if (!fs.existsSync(manifestPath)) fail('missing externalized asset manifest');

const loader = read(loaderPath);
const loaderBytes = fs.statSync(loaderPath).size;
if (loaderBytes > 16 * 1024) fail(`loader is still too large for a hot TypeScript path: ${loaderBytes} bytes`);
if (loader.includes('compressedHtmlBase64ByKey')) fail('inline compressed payload table is still present in TypeScript');
if (!loader.includes('__XENSONAR_EMBEDDED_STANDALONE_APPS__')) fail('singlefile/full-artifact inline fallback hook missing');
if (!loader.includes('fetch(getEmbeddedStandaloneAppAssetUrl(key)')) fail('asset fetch path missing');
if (!loader.includes('DecompressionStream')) fail('gzip decompression path missing');

const manifest = JSON.parse(read(manifestPath));
if (manifest.encoding !== 'gzip+base64') fail(`unexpected manifest encoding: ${manifest.encoding}`);

let totalPayloadBytes = 0;
for (const key of keys) {
  const rel = manifest.apps?.[key]?.path;
  if (rel !== `xensonar-family-standalone/${key}.html.gz.b64`) fail(`manifest path mismatch for ${key}: ${rel}`);
  const abs = path.join(repo, 'public', rel);
  if (!fs.existsSync(abs)) fail(`missing payload for ${key}: ${rel}`);
  const payload = read(abs).trim();
  if (!payload.startsWith('H4sI')) fail(`${key} payload does not look like gzip+base64`);
  if (payload.length < 4096) fail(`${key} payload suspiciously small: ${payload.length}`);
  if (manifest.apps[key].bytes !== payload.length) fail(`${key} manifest byte count mismatch`);
  totalPayloadBytes += payload.length;
}

console.log(`[embedded-standalone-assets] ok: loader ${loaderBytes} bytes, external payload ${(totalPayloadBytes / 1024).toFixed(1)} KiB`);
