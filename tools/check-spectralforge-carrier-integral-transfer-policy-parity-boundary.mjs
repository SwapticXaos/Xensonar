#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  parity: 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferPolicyParity.ts',
  sendTargets: 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets.ts',
  matrix: 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferPolicyMatrix.ts',
  legacy: 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferLegacyPlan.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-carrier-integral-transfer-policy-parity.ts',
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

const parity = read(paths.parity);
const sendTargets = read(paths.sendTargets);
const matrix = read(paths.matrix);
const legacy = read(paths.legacy);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'CarrierIntegralTransferPlanResolver',
  'collectCarrierIntegralTransferPlanParityMismatches',
  'formatCarrierIntegralTransferPlanParityMismatchDetail',
  'assertCarrierIntegralTransferPlanParity',
  'CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS',
  'CARRIER_INTEGRAL_MACHINES',
  'DESTINATION_TO_TARGET',
]) requireText(paths.parity, parity, marker);

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
]) requireAbsent(paths.parity, parity, forbidden);

for (const movedLocal of [
  'for (const field of CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS)',
  'const targetIds = Object.values(DESTINATION_TO_TARGET);',
  'slice(0, 12)',
  'join("; ")',
]) requireAbsent(paths.sendTargets, sendTargets, movedLocal);

for (const marker of [
  './carrierIntegralTransferPolicyParity',
  'collectCarrierIntegralTransferPlanParityMismatches',
  'assertCarrierIntegralTransferPlanParity',
  'collectCarrierIntegralTransferPolicyShadowParityMismatches',
  'collectCarrierIntegralTransferPolicyActivationMismatches',
]) requireText(paths.sendTargets, sendTargets, marker);


for (const marker of [
  'CARRIER_INTEGRAL_TRANSFER_LEGACY_PLAN_ADAPTER_VERSION',
  'resolveCarrierIntegralTransferPolicyPlanFromContext',
  'resolveCarrierIntegralSendContractFromDestination',
]) requireText(paths.legacy, legacy, marker);

for (const forbidden of [
  'buildCarrierIntegralTransferPlan',
  'buildCarrierIntegralRawMelodicMaterialHandoffPlan',
  'RAW_CARRIER_MATERIAL_RENDER_PREFIX',
  'CARRIER_INTEGRAL_GRANULAR_MATERIAL_WORKSPACE_ORIGIN',
  'CARRIER_INTEGRAL_AUDIO_PAINT_WORKSPACE_ORIGIN',
  'CARRIER_INTEGRAL_RENDERED_MATERIAL_WORKSPACE_ORIGIN',
  'rawOscillator',
  'harmonicXplore',
  'legacyDirect',
  'donatelloFormant',
  'spectralWindowBody',
]) requireAbsent(paths.legacy, legacy, forbidden);

requireText(paths.index, index, "export * from './carrierIntegralTransferPolicyParity';");
requireText(paths.matrix, matrix, 'CarrierIntegralTransferPolicyParityMismatch');
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-carrier-integral-transfer-policy-parity-boundary');
for (const marker of [
  'generic shadow parity helper drifted from send-target facade',
  'generic activation parity helper drifted from send-target facade',
  'assertCarrierIntegralTransferPlanParity',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-transfer-policy-parity-boundary] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.xensonar-checks/spectralforge-carrier-integral-transfer-policy-parity';
const absOutDir = path.join(root, outRoot, 'out');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-integral-transfer-policy-parity.js');
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
    path.join(root, paths.parity),
    path.join(root, paths.sendTargets),
    path.join(root, paths.matrix),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralMachineCapabilities.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargetContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendContractBuilders.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierLoopBodyModel.ts'),
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
  console.error('[spectralforge-carrier-integral-transfer-policy-parity-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.shadowMismatchCount !== 0 || parsed.activationMismatchCount !== 0) {
    console.error('[spectralforge-carrier-integral-transfer-policy-parity-boundary] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.parity,
    scenarioSource: paths.scenario,
    message: 'Carrier Integral transfer policy parity helpers keep the legacy facade as a thin adapter to the canonical policy matrix.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-transfer-policy-parity-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
