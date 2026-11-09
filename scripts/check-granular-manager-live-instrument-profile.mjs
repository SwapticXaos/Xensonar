#!/usr/bin/env node
import fs from 'node:fs';

const fail = (message) => {
  console.error(`[check-granular-manager-live-instrument-profile] FAIL: ${message}`);
  process.exit(1);
};
const src = fs.readFileSync('src/features/xensonar/rootFollow/rootFollowGranularSettings.ts', 'utf8');

const required = [
  "maxGrainsPerWindow: { min: 6, max: 48 }",
  "powerMode === 'safe') return 'Direkt'",
  "powerMode === 'balanced') return 'Live'",
  "powerMode === 'rich') return 'Körper'",
  "powerMode === 'edge') return 'Kante'",
  "? 320",
  "? 480",
  "maxGrainsPerWindow: 10",
  "maxGrainsPerWindow: 18",
  "maxGrainsPerWindow: 30",
];
for (const needle of required) {
  if (!src.includes(needle)) fail(`missing live-instrument granular marker: ${needle}`);
}
if (/maxGrainsPerWindow:\s*(5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])/.test(src)) {
  fail('Granular manager should not offer high-management grain ceilings as default/preset values.');
}
if (src.includes("return 'Feinauflösung'") || src.includes("return 'Dicht'") || src.includes("return 'Standard'")) {
  fail('Granular power labels still use old management-oriented wording.');
}
console.log('[check-granular-manager-live-instrument-profile] PASS');
