#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  capability: 'src/features/l3lab/spectralForge/integral/carrierIntegralMachineCapabilities.ts',
  model: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyModel.ts',
  matrix: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyInterpretationMatrix.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-carrier-integral-machine-capability.ts',
  pkg: 'package.json',
};
function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel} missing`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}
function requireText(label, text, marker) {
  if (!text.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}
function requireAbsent(label, text, marker) {
  if (text.includes(marker)) failures.push(`${label} must not contain marker: ${marker}`);
}

const capability = read(paths.capability);
const model = read(paths.model);
const matrix = read(paths.matrix);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'CARRIER_INTEGRAL_MACHINE_CAPABILITIES_VERSION',
  'CarrierIntegralMachineCapability',
  'resolveCarrierIntegralMachineCapability',
  'listCarrierIntegralMachineCapabilities',
  'assertCarrierIntegralMachineCapabilities',
  'CARRIER_INTEGRAL_EXPERIMENTAL_READING_PEER_GROUP_ID',
  'isCarrierIntegralExperimentalReadingMachine',
  'carrierIntegralMachineBodyKindFor',
  'carrierIntegralMachineSourceKindFor',
  'carrierIntegralMachineRenderStrategyFor',
  'isPureDieterMelodicDirectHardBlocked',
  'implemented-branch-c-carrier-loop-body-adapter',
  'planned-compatible-window-adapter',
  'planned-distinct-line-adapter',
  'separate-body-family',
  'contract-only',
]) requireText(paths.capability, capability, marker);

for (const forbidden of [
  'AudioEngine',
  'audioEngine',
  'executeCarrierIntegralTransfer',
  'CarrierIntegralVerwaltenPanel',
  'App.tsx',
  'AudioWorklet',
  'document.',
  'window.',
  'console.log',
  'playRenderedAudioBufferPreview',
]) requireAbsent(paths.capability, capability, forbidden);

for (const marker of [
  './carrierIntegralMachineCapabilities',
  'resolveCarrierIntegralMachineCapability',
  'isPureDieterMelodicDirectHardBlocked',
]) requireText(paths.model, model, marker);
for (const removedLocal of [
  'function bodyKindForMachine',
  'function sourceKindForBodyKind',
  'function renderStrategyForBodyKind',
  'function fallbackBodyFor',
]) requireAbsent(paths.model, model, removedLocal);

for (const marker of [
  './carrierIntegralMachineCapabilities',
  'resolveCarrierIntegralMachineCapability',
  'adapterStatusForCapability',
  'previewSupportForCapability',
]) requireText(paths.matrix, matrix, marker);
for (const removedLocal of [
  'function interpretationLayerFor',
  'function adapterStatusFor(machineId',
  'function curveSourceKindFor',
  'function previewSupportFor(machineId',
  'function ownershipClaimFor',
  'function compatibilitySummaryFor',
  'function guardrailFor',
]) requireAbsent(paths.matrix, matrix, removedLocal);

requireText(paths.index, index, "export * from './carrierIntegralMachineCapabilities';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-carrier-integral-machine-capability-boundary');

for (const marker of [
  'Pure Dieter melodic direct hard blocked',
  'Dieter V2 is rendered material family',
  'Donatello is formant family',
  'Cecilia is first implemented adapter',
  'Antonia has distinct future line adapter',
  'Bert has compatible future window adapter',
  'Donor embodiment is contract-only',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-machine-capability-boundary] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.xensonar-checks/spectralforge-carrier-integral-machine-capability';
const absOutDir = path.join(root, outRoot, 'out');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-integral-machine-capability.js');
fs.rmSync(path.join(root, outRoot), { recursive: true, force: true });
fs.mkdirSync(path.join(root, outRoot), { recursive: true });
const tsconfig = {
  compilerOptions: {
    target: 'ES2022',
    module: 'CommonJS',
    moduleResolution: 'Node',
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    noEmitOnError: true,
    lib: ['ES2022', 'DOM'],
    rootDir: root,
    outDir: absOutDir,
  },
  include: [
    path.join(root, paths.scenario),
    path.join(root, paths.capability),
    path.join(root, paths.model),
    path.join(root, paths.matrix),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts'),
  ],
};
fs.writeFileSync(path.join(root, tsconfigPath), JSON.stringify(tsconfig, null, 2));
fs.mkdirSync(absOutDir, { recursive: true });
fs.writeFileSync(path.join(absOutDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));

try {
  execFileSync(process.execPath, [resolveTypeScriptCliPath(), '-p', tsconfigPath], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });
} catch (error) {
  console.error('[spectralforge-carrier-integral-machine-capability-boundary] FAILED compile');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  process.exit(1);
}

try {
  const output = execFileSync(process.execPath, [generatedScenario], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const parsed = JSON.parse(output);
  if (!parsed.ok || parsed.checkedScenarios < 25) {
    console.error('[spectralforge-carrier-integral-machine-capability-boundary] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.capability,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier Integral machine capabilities now provide the shared machine/body facts consumed by CarrierLoopBody model and interpretation matrix without touching renderers, UI or transfer execution.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-machine-capability-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
