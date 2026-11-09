#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function fail(message) {
  console.error(`[random-demo-preset-contract] FAIL: ${message}`);
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }
const library = readFileSync('src/features/l3lab/canonicalForge/melodicProjectLibrary.ts', 'utf8');
const forbidden = [
  'Komposition 1',
  'Komposition 2',
  'Komposition 3',
  'builtin-komposition-1',
  'builtin-komposition-2',
  'builtin-komposition-3',
  'buildKomposition1Project',
  'buildKomposition2Project',
];
for (const token of forbidden) assert(!library.includes(token), `${token} must not return as a default/built-in project`);
assert(library.includes("id: 'builtin-random-demo-preset'"), 'Random Demo Preset id must be the sole built-in demo id');
assert(library.includes("name: 'Random Demo Preset'"), 'Random Demo Preset label must be visible');
const createBuiltIn = library.match(/export function createBuiltInMelodicProjects[\s\S]*?\n}\n\nexport function createScratchMelodicComposer/);
assert(Boolean(createBuiltIn), 'createBuiltInMelodicProjects block must be present and followed by scratch composer factory');
const block = createBuiltIn?.[0] ?? '';
assert(block.includes('return [{'), 'built-in list must return exactly the single Random Demo wrapper, not multiple default compositions');
assert(!block.includes('preset1') && !block.includes('preset2') && !block.includes('preset3'), 'legacy preset1/2/3 construction must not remain');
console.log('[random-demo-preset-contract] OK');
