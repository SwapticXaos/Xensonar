#!/usr/bin/env node
import fs from 'node:fs';

const enginePath = 'src/features/l3lab/spectralForge/integral/carrierIntegralHarmonicXploreDirectEngine.ts';
const pkgPath = 'package.json';
const engine = fs.readFileSync(enginePath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

function requireContains(source, needle, message) {
  if (!source.includes(needle)) {
    console.error(`[harmonic-xplore-wide-interval-voice-seeding] FAIL: ${message}`);
    process.exit(1);
  }
}

function requireRegex(source, regex, message) {
  if (!regex.test(source)) {
    console.error(`[harmonic-xplore-wide-interval-voice-seeding] FAIL: ${message}`);
    process.exit(1);
  }
}

requireRegex(pkg.version, /7\.5\.(15[2-9]|16[0-9]|17[0-9])/, 'package version must preserve 7.5.152+ wide-interval lineage.');
requireContains(engine, 'wide-interval-voice-seeding-v1', 'engine key must preserve wide interval voice seeding lineage.');
requireContains(engine, 'paintedRegisterSpanOctaves', 'gestalt summary must expose painted register span.');
requireContains(engine, 'wideIntervalVoiceSeeding: true', 'anti-whoop contract must expose wideIntervalVoiceSeeding.');
requireContains(engine, 'spectralEdgePeaksIncluded: true', 'anti-whoop contract must expose spectralEdgePeaksIncluded.');
requireContains(engine, 'const RAW_PEAK_CAP = Math.max(MAX_PEAKS, specHeight)', 'raw peak candidate capacity must be based on spectral height, not voice count.');
requireRegex(engine, /for \(let y = 0; y < specHeight; y \+= 1\)/, 'peak scan must include spectral top and bottom edges.');
requireContains(engine, 'const below = y > 0 ?', 'top edge peak detection must use safe lower-neighbor fallback.');
requireContains(engine, 'const above = y < specHeight - 1 ?', 'bottom edge peak detection must use safe upper-neighbor fallback.');
requireContains(engine, 'const seedLogDistance = 0.12 - detailBoost * 0.05', 'wide interval seed distance must exist.');
requireContains(engine, 'const seedTarget = Math.min(MAX_VOICES, MAX_PEAKS, rawPeakCount)', 'wide interval seed pass must reserve at most voice-budget anchors.');
requireContains(engine, 'tooCloseToSeed', 'seed pass must reject near-duplicate register anchors before detail fill.');
requireRegex(engine, /(Second|Third) pass: fill the remaining detail budget by energy/, 'detail fill pass must preserve close microtonal detail after wide anchors.');
requireContains(engine, 'wide-interval-voice-seeding-v1', 'direct engine key must invalidate cache for wide interval voice seeding.');
requireContains(engine, 'grain-voice-character-v1', 'grain voice character contract must remain present.');
requireContains(engine, 'wave-mix-truth-v1', 'wave mix truth contract must remain present.');

const forbiddenAppTouch = ['src/App.tsx', 'waveStarter', 'StableLane'];
for (const forbidden of forbiddenAppTouch) {
  // This guard is scoped to the HarmonicXplore engine file; if these strings appear here,
  // the slice has likely leaked into an unrelated hotpath vocabulary.
  if (engine.includes(forbidden)) {
    console.error(`[harmonic-xplore-wide-interval-voice-seeding] FAIL: leaked unrelated hotpath marker ${forbidden}.`);
    process.exit(1);
  }
}

console.log('[harmonic-xplore-wide-interval-voice-seeding] OK');
