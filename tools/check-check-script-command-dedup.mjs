#!/usr/bin/env node
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const scripts = pkg.scripts ?? {};
const groups = new Map();

for (const [name, command] of Object.entries(scripts)) {
  const isCheckSurface = name.startsWith('xensonar:check') || /(?:tools|scripts)\/check-[^\s;&|]+\.mjs/.test(command);
  if (!isCheckSurface) continue;
  const normalized = String(command).trim().replace(/\s+/g, ' ');
  const names = groups.get(normalized) ?? [];
  names.push(name);
  groups.set(normalized, names);
}

const duplicates = [...groups.entries()]
  .filter(([, names]) => names.length > 1)
  .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

if (duplicates.length) {
  console.error('[xensonar][check-script-command-dedup] FAIL: exact duplicate check commands found');
  for (const [command, names] of duplicates) {
    console.error(`- ${names.join(', ')}`);
    console.error(`  ${command}`);
  }
  process.exit(1);
}

console.log(`[xensonar][check-script-command-dedup] PASS: ${[...groups.values()].reduce((n, names) => n + names.length, 0)} active check commands are exact-command unique.`);
