#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('tools/xensonar-check-manifest.json', 'utf8'));
const fail = (message) => {
  console.error(`[xensonar][check-taxonomy-signal-strength] ${message}`);
  process.exit(1);
};

const requiredEntries = [
  'tools/check-preview-request-identity-and-basis-coupling.mjs',
  'tools/check-loop-preview-wiring-and-playback-truth.mjs',
  'tools/check-preview-progress-truth-binding.mjs',
  'tools/check-preview-session-lifecycle-scenarios.mjs',
  'tools/check-transportbar-state-resolver-audit.mjs',
];

const allGroups = new Map();
for (const [group, entries] of Object.entries(manifest.groups ?? {})) {
  for (const entry of entries) allGroups.set(entry, group);
}
for (const entry of requiredEntries) {
  if (!allGroups.has(entry)) fail(`required check missing from primary taxonomy groups: ${entry}`);
}

const focus = manifest.focusGroups ?? {};
for (const [focusName, entries] of Object.entries({
  'preview-session': [
    'tools/check-preview-request-identity-and-basis-coupling.mjs',
    'tools/check-preview-progress-truth-binding.mjs',
  ],
  'preview-session-scenarios': [
    'tools/check-preview-session-lifecycle-scenarios.mjs',
    'tools/check-loop-preview-wiring-and-playback-truth.mjs',
  ],
  'transport-session': [
    'tools/check-loop-preview-wiring-and-playback-truth.mjs',
    'tools/check-preview-progress-truth-binding.mjs',
    'tools/check-transportbar-state-resolver-audit.mjs',
  ],
  'basis-hearing': [
    'tools/check-preview-request-identity-and-basis-coupling.mjs',
  ],
  'taxonomy': [
    'tools/check-check-taxonomy-signal-strength.mjs',
  ],
})) {
  const list = focus[focusName] ?? [];
  for (const entry of entries) {
    if (!list.includes(entry)) fail(`focus group ${focusName} missing signal-strength entry: ${entry}`);
  }
}

const lifecycleCount = (manifest.groups?.lifecycle ?? []).filter((entry) => /preview|transport|basis-hearing/.test(entry)).length;
if (lifecycleCount < 8) fail(`expected at least 8 preview/transport lifecycle checks, found ${lifecycleCount}`);

console.log('[xensonar] check taxonomy signal strength green');
