#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const probePath = path.join(
  repoRoot,
  'src/features/l3lab/spectralForge/integral/carrierDescriptorShadowProbe.ts',
);
const contractPath = path.join(
  repoRoot,
  'src/features/l3lab/spectralForge/integral/carrierDescriptorContract.ts',
);
const boundaryPath = path.join(
  repoRoot,
  'src/features/l3lab/spectralForge/integral/carrierIntegralTransferDebugBoundary.ts',
);
const phasesPath = path.join(
  repoRoot,
  'src/features/l3lab/spectralForge/integral/carrierIntegralTransferExecutionPhases.ts',
);
const panelPath = path.join(
  repoRoot,
  'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx',
);
const signalSectionPath = path.join(
  repoRoot,
  'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralSignalSendSection.tsx',
);
const pkgPath = path.join(repoRoot, 'package.json');

const assert = (condition, message) => {
  if (!condition) throw new Error(`[carrier-descriptor-shadow-probe] ${message}`);
};
const read = (p) => fs.readFileSync(p, 'utf8');
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');

const probe = read(probePath);
const probeCode = stripComments(probe);
const contract = read(contractPath);
const boundary = read(boundaryPath);
const phases = read(phasesPath);
const panel = read(panelPath);
const signalSection = read(signalSectionPath);
const pkg = JSON.parse(read(pkgPath));

for (const needle of [
  'export const CARRIER_DESCRIPTOR_SHADOW_PROBE_VERSION',
  'export type CarrierDescriptorShadowReport',
  'export function buildCarrierEnergyFieldFromSpectralData',
  'export function extractCarrierDescriptorFromSpectralData',
  'export function extractCarrierDescriptorFromEnergyField',
  'export function buildCarrierDescriptorShadowReport',
]) {
  assert(probe.includes(needle), `missing probe contract: ${needle}`);
}

for (const forbidden of [
  'recordCarrierDescriptorShadowReport',
  'recordCarrierIntegralTransferDescriptorShadowReport',
  'readCarrierDescriptorShadowReport',
  '__xensonarReadCarrierDescriptorShadowReport',
  'declare global',
  'carrierDescriptorShadowReportHistory',
]) {
  assert(!probe.includes(forbidden), `probe still owns debug boundary/storage: ${forbidden}`);
}

for (const needle of [
  'CarrierEnergyField',
  'CarrierColumnMeasure',
  'CarrierDescriptor',
  'CarrierDescriptorHints',
  'CarrierSeamMeasure',
]) {
  assert(probe.includes(needle), `probe does not use contract type ${needle}`);
}

assert(
  probe.includes("'shadow-report-only'") &&
    probe.includes("'descriptor-does-not-select-renderer'") &&
    probe.includes("'descriptor-does-not-change-root-follow'") &&
    probe.includes("'descriptor-does-not-change-melodic-loop'"),
  'probe report guardrails are missing or too weak',
);

assert(
  probe.includes('globalEnergyMax') &&
    probe.includes('centroidSlopeMismatch') &&
    probe.includes('centroidPathLengthNorm'),
  'probe does not compute the Claude/Gemini contract fields',
);
assert(
  probe.includes('columnSamples') && !probe.includes('fullDescriptor:'),
  'shadow report should expose sampled columns, not dump the full descriptor',
);

for (const forbidden of [
  /\bbodyType\b/,
  /\bdominantBodyType\b/,
  /\bcontourConfidence\b/,
  /\bsuggestedRenderer\b/,
  /\bsuggestedMode\b/,
  /\bshouldLoop\b/,
  /\buiBadge\b/,
  /\buiLabel\b/,
]) {
  assert(!forbidden.test(probeCode), `interpretive authority leaked into probe: ${forbidden}`);
}

for (const forbidden of [
  /dispatchXensonarEvent/,
  /sessionStorage/,
  /openCanonicalMelodicLoop/,
  /rootFollowBankMembership/,
  /carrierIntegralRawMaterialMelodicExport/,
  /carrierIntegralMelodicPinkExport/,
  /renderCarrierIntegralHarmonicXploreDirectPreviewBuffer/,
  /renderCarrierIntegralConfigToAudioBuffer/,
  /audioEngine\.renderToBuffer/,
  /registerMaterialExport/,
  /window\./,
]) {
  assert(!forbidden.test(probeCode), `shadow probe must not touch audio/UI/transfer side effects: ${forbidden}`);
}

assert(!/Math\.random\s*\(/.test(probe), 'Math.random must not appear in the shadow probe');
assert(
  contract.includes('readonly contractVersion: 1;') && contract.includes('readonly hints: CarrierDescriptorHints | null;'),
  'base descriptor contract is not intact',
);
assert(
  boundary.includes('recordCarrierIntegralTransferDescriptorShadowReport') &&
    boundary.includes('window.__xensonarReadCarrierDescriptorShadowReport') &&
    boundary.includes('descriptor-extraction-failed-without-audio-side-effect'),
  'debug boundary does not own descriptor shadow readout/storage',
);
assert(
  phases.includes('recordCarrierIntegralTransferDescriptorShadowReport') &&
    phases.includes('from "./carrierIntegralTransferDebugBoundary"') &&
    phases.includes('renderSource: executionPlan.transferPlan.renderSource') &&
    phases.includes('melodicHandoffKind: executionPlan.transferPlan.melodicHandoffKind'),
  'transfer execution phases do not record a passive descriptor shadow report through the debug boundary',
);
assert(
  !panel.includes('CarrierDescriptorShadowReport') &&
    !panel.includes('__xensonarReadCarrierDescriptorShadowReport') &&
    !signalSection.includes('CarrierDescriptorShadowReport') &&
    !signalSection.includes('__xensonarReadCarrierDescriptorShadowReport'),
  'descriptor shadow probe leaked into UI panel/section',
);
assert(
  pkg.scripts?.['xensonar:check-carrier-descriptor-shadow-probe'] ===
    'node tools/check-carrier-descriptor-shadow-probe.mjs',
  'package script missing for descriptor shadow probe check',
);

console.log('[xensonar] carrierDescriptorShadowProbe: Guard grün');
console.log('  real SpectralData -> CarrierEnergyField -> CarrierDescriptor');
console.log('  Debug/readout side effect lives in carrierIntegralTransferDebugBoundary');
console.log('  keine Renderer-/UI-Autorität, kein Audio-/Melodic-/Root-Follow-Side-Effect');
