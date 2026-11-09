#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? 'src';
const includeTests = process.argv.includes('--include-tests');
const json = process.argv.includes('--json');

const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts']);
const ignoredDirs = new Set(['node_modules', 'dist', 'build', '.git']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(path.join(dir, entry.name), out);
      continue;
    }
    const full = path.join(dir, entry.name);
    if (!sourceExtensions.has(path.extname(entry.name))) continue;
    if (!includeTests && (/__tests__/.test(full) || /\.test\.[cm]?[tj]sx?$/.test(full))) continue;
    out.push(full);
  }
  return out;
}

function classify(line) {
  if (/getElementById\([^)]*\)!/.test(line) || /querySelector(?:All)?\([^)]*\)!/.test(line)) return 'dom-mount-or-selector';
  if (/\.current!/.test(line)) return 'react-ref-current';
  if (/\bnew Map|\.get\([^)]*\)!/.test(line)) return 'map-lookup';
  if (/\[[^\]]+\]!/.test(line) || /\.pop\(\)!/.test(line)) return 'array-or-stack-access';
  if (/\w+!\./.test(line)) return 'object-access';
  return 'other-non-null-assertion';
}

const candidates = [];
const pattern = /(?:[A-Za-z0-9_$\]\)])!\s*(?=[.\)\]\[,;:])/g;

for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('!')) continue;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(line)) !== null) {
      if (/!!/.test(line.slice(Math.max(0, match.index - 1), match.index + 2))) continue;
      candidates.push({
        file,
        line: index + 1,
        kind: classify(line),
        text: line.trim(),
      });
    }
  });
}

const byKind = candidates.reduce((acc, item) => {
  acc[item.kind] = (acc[item.kind] ?? 0) + 1;
  return acc;
}, {});
const byFile = candidates.reduce((acc, item) => {
  acc[item.file] = (acc[item.file] ?? 0) + 1;
  return acc;
}, {});

if (json) {
  console.log(JSON.stringify({ total: candidates.length, byKind, byFile, candidates }, null, 2));
} else {
  console.log(`Non-null assertion audit: ${candidates.length} candidate(s)${includeTests ? ' including tests' : ' excluding tests'}`);
  for (const [kind, count] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${kind}: ${count}`);
  }
  console.log('');
  for (const item of candidates) {
    console.log(`${item.file}:${item.line} [${item.kind}] ${item.text}`);
  }
}
