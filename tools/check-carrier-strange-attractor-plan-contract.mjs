#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const rel = {
  types: 'src/features/l3lab/spectralForge/integral/carrierStrangeAttractorTypes.ts',
  seed: 'src/features/l3lab/spectralForge/integral/carrierStrangeAttractorSeededRandom.ts',
  plan: 'src/features/l3lab/spectralForge/integral/carrierStrangeAttractorPlan.ts',
  probe: 'src/features/l3lab/spectralForge/integral/carrierStrangeAttractorProbe.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  debugBoundary: 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferDebugBoundary.ts',
  main: 'src/main.tsx',
  pkg: 'package.json',
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
function requireAbsentRegex(label, text, pattern) {
  if (pattern.test(text)) failures.push(`${label} must not match ${pattern}`);
}

const types = read(rel.types);
const plan = read(rel.plan);
const planCode = stripComments(plan);
const seed = read(rel.seed);
const seedCode = stripComments(seed);
const probe = read(rel.probe);
const probeCode = stripComments(probe);
const index = read(rel.index);
const debugBoundary = read(rel.debugBoundary);
const main = read(rel.main);
const pkg = JSON.parse(read(rel.pkg) || '{}');

for (const marker of [
  "STRANGE_ATTRACTOR_CARRIER_MACHINE_ID = 'strange-attractor-schwarmkoerper'",
  'StrangeAttractorCarrierPlan',
  'StrangeAttractorDronePlan',
  'StrangeAttractorNodePlan',
  'StrangeAttractorSwarmEvent',
  "'drift' | 'orbit' | 'spray' | 'cluster'",
  "'free' | '12edo' | 'ji' | 'bp'",
]) requireIncludes(rel.types, types, marker);

for (const marker of [
  'buildStrangeAttractorCarrierPlan',
  'buildStrangeAttractorCarrierPlanFromDescriptor',
  'buildStrangeAttractorCarrierInputFromDescriptor',
  'buildStrangeAttractorCarrierPlanFromSpectralData',
  'buildStrangeAttractorCarrierFixturePlan',
  'buildAttractorsFromWindows',
  'buildSwarmEventsFromAttractors',
  'buildDronePlan',
]) requireIncludes(rel.plan, plan, marker);

for (const marker of [
  'createStrangeAttractorSeededRandom',
  'hashStrangeAttractorSeed',
]) requireIncludes(rel.seed, seed, marker);

for (const marker of [
  'CARRIER_STRANGE_ATTRACTOR_PROBE_VERSION',
  'recordCarrierStrangeAttractorProbeFromSpectralData',
  'readCarrierStrangeAttractorProbe',
  '__xensonarReadCarrierStrangeAttractorProbe',
  '__xensonarBuildCarrierStrangeAttractorFixturePlan',
  'no-audio-renderer',
  'no-iframe-capture-bridge',
  'no-materialschmiede-import',
  'no-synthetic-forge-or-melodic-loop-export',
]) requireIncludes(rel.probe, probe, marker);

for (const marker of [
  "export * from './carrierStrangeAttractorTypes';",
  "export * from './carrierStrangeAttractorSeededRandom';",
  "export * from './carrierStrangeAttractorPlan';",
  "export * from './carrierStrangeAttractorProbe';",
]) requireIncludes(rel.index, index, marker);

requireIncludes(rel.debugBoundary, debugBoundary, 'recordCarrierStrangeAttractorProbeFromSpectralData');
requireIncludes(rel.main, main, 'carrierStrangeAttractorProbe');

for (const forbidden of [
  /new\s+AudioContext\s*\(/,
  /createOscillator\s*\(/,
  /createGain\s*\(/,
  /connect\s*\(/,
  /dispatchEvent\s*\(/,
  /openCanonicalMelodicLoop/,
  /spectralForgeAudioCutUpload/,
  /materialschmiede/i,
  /iframe/i,
]) requireAbsentRegex(rel.plan, planCode, forbidden);

for (const forbidden of [
  /Math\.random\s*\(/,
]) requireAbsentRegex(rel.plan, planCode + seedCode, forbidden);

for (const forbidden of [
  /new\s+AudioContext\s*\(/,
  /createOscillator\s*\(/,
  /createGain\s*\(/,
  /dispatchEvent\s*\(/,
  /openCanonicalMelodicLoop/,
  /spectralForgeAudioCutUpload/,
]) requireAbsentRegex(rel.probe, probeCode, forbidden);

if (pkg.scripts?.['xensonar:check-carrier-strange-attractor-plan-contract'] !== 'node tools/check-carrier-strange-attractor-plan-contract.mjs') {
  failures.push('package script missing: xensonar:check-carrier-strange-attractor-plan-contract');
}
if (pkg.scripts?.['xensonar:check-carrier-strange-attractor-deterministic-plan'] !== 'node tools/check-carrier-strange-attractor-deterministic-plan.mjs') {
  failures.push('package script missing: xensonar:check-carrier-strange-attractor-deterministic-plan');
}
if (pkg.scripts?.['xensonar:check-carrier-strange-attractor-swarm-density-limit'] !== 'node tools/check-carrier-strange-attractor-swarm-density-limit.mjs') {
  failures.push('package script missing: xensonar:check-carrier-strange-attractor-swarm-density-limit');
}
if (pkg.scripts?.['xensonar:check-carrier-strange-attractor-probe-contract'] !== 'node tools/check-carrier-strange-attractor-probe-contract.mjs') {
  failures.push('package script missing: xensonar:check-carrier-strange-attractor-probe-contract');
}

if (failures.length) {
  console.error('[carrier-strange-attractor-plan-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[xensonar] Carrier Strange Attractor Schwarmkörper plan contract: grün');
console.log('  Planmaschine vorhanden, keine Audio-/iframe-/Materialschmiede-/Melodic-Loop-Route.');
