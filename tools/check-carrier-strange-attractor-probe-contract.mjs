#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const rel = {
  probe: 'src/features/l3lab/spectralForge/integral/carrierStrangeAttractorProbe.ts',
  debugBoundary: 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferDebugBoundary.ts',
  main: 'src/main.tsx',
};
function read(file) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) {
    failures.push(`${file} missing`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}
function requireIncludes(label, text, marker) {
  if (!text.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}
function requireAbsent(label, text, marker) {
  if (text.includes(marker)) failures.push(`${label} must not contain marker: ${marker}`);
}
function requireAbsentRegex(label, text, pattern) {
  if (pattern.test(text)) failures.push(`${label} must not match ${pattern}`);
}

const probe = read(rel.probe);
const probeCode = stripComments(probe);
const debugBoundary = read(rel.debugBoundary);
const main = read(rel.main);

for (const marker of [
  'declare global',
  '__xensonarReadCarrierStrangeAttractorProbe',
  '__xensonarBuildCarrierStrangeAttractorFixturePlan',
  'lastPlanAvailable',
  "reason: lastRecord === null ? lastError ?? 'no-carrier-strange-attractor-plan-recorded-yet' : undefined",
  'recordCarrierStrangeAttractorProbeFromSpectralData',
  'probe-only',
  'no-audio-renderer',
  'no-materialschmiede-import',
  'no-synthetic-forge-or-melodic-loop-export',
]) requireIncludes(rel.probe, probe, marker);

requireIncludes(rel.debugBoundary, debugBoundary, 'recordCarrierStrangeAttractorProbeFromSpectralData({');
requireIncludes(rel.main, main, 'import "./features/l3lab/spectralForge/integral/carrierStrangeAttractorProbe";');

for (const forbidden of [
  /new\s+AudioContext\s*\(/,
  /createOscillator\s*\(/,
  /createGain\s*\(/,
  /dispatchEvent\s*\(/,
  /openCanonicalMelodicLoop/,
  /spectralForgeAudioCutUpload/,
]) requireAbsentRegex(rel.probe, probeCode, forbidden);

if (failures.length) {
  console.error('[carrier-strange-attractor-probe-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[xensonar] Carrier Strange Attractor probe contract: grün');
console.log('  Probe-Hook vorhanden, UI nicht aufgeblasen, keine Audio-/Export-Seiteffekte.');
