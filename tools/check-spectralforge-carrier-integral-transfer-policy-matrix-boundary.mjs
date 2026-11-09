#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  sendTargets: 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets.ts',
  matrix: 'src/features/l3lab/spectralForge/integral/carrierIntegralTransferPolicyMatrix.ts',
  capabilities: 'src/features/l3lab/spectralForge/integral/carrierIntegralMachineCapabilities.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-carrier-integral-transfer-policy-matrix.ts',
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

const sendTargets = read(paths.sendTargets);
const matrix = read(paths.matrix);
const capabilities = read(paths.capabilities);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'CARRIER_INTEGRAL_TRANSFER_POLICY_SHADOW_VERSION',
  'CARRIER_INTEGRAL_TRANSFER_POLICY_ACTIVATION_VERSION',
  'CarrierIntegralTransferPolicyKind',
  'CarrierIntegralTransferPolicyContext',
  'CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS',
  'CarrierIntegralTransferPolicyParityMismatch',
  'classifyCarrierIntegralTransferPolicy',
  'resolveCarrierIntegralTransferPolicyPlanFromContext',
  'CARRIER_INTEGRAL_TRANSFER_POLICY_MATRIX',
  'buildDonatelloRootFollowPolicyPlan',
  'buildSyntheticRootFollowPolicyPlan',
]) requireText(paths.matrix, matrix, marker);

for (const marker of [
  './carrierIntegralMachineCapabilities',
  'resolveCarrierIntegralMachineCapability',
  'case "raw-material-body"',
  'case "legacy-synthetic-root-follow-config-body"',
  'case "rendered-material-body"',
  'case "formant-window-body"',
  'case "synthetic-root-follow-config-body"',
]) requireText(paths.matrix, matrix, marker);

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
]) requireAbsent(paths.matrix, matrix, forbidden);

for (const movedLocal of [
  'function buildDonatelloRootFollowPolicyPlan',
  'function buildSyntheticRootFollowPolicyPlan',
  'const CARRIER_INTEGRAL_TRANSFER_POLICY_MATRIX',
  'export type CarrierIntegralTransferPolicyKind',
]) requireAbsent(paths.sendTargets, sendTargets, movedLocal);

for (const marker of [
  './carrierIntegralTransferPolicyMatrix',
  'resolveCarrierIntegralTransferPolicyPlanFromContext',
  'CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS',
]) requireText(paths.sendTargets, sendTargets, marker);

requireText(paths.index, index, "export * from './carrierIntegralTransferPolicyMatrix';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-carrier-integral-transfer-policy-matrix-boundary');
requireText(paths.capabilities, capabilities, 'resolveCarrierIntegralMachineCapability');

for (const marker of [
  'Pure Dieter raw direct body remains raw material policy for Root Follow',
  'Donatello remains formant policy',
  'Cecilia remains synthetic artifact policy',
  'shadow parity mismatches',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-transfer-policy-matrix-boundary] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.xensonar-checks/spectralforge-carrier-integral-transfer-policy-matrix';
const absOutDir = path.join(root, outRoot, 'out');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-integral-transfer-policy-matrix.js');
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
    path.join(root, paths.sendTargets),
    path.join(root, paths.matrix),
    path.join(root, paths.capabilities),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts'),
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
  console.error('[spectralforge-carrier-integral-transfer-policy-matrix-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 8) {
    console.error('[spectralforge-carrier-integral-transfer-policy-matrix-boundary] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.matrix,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier Integral transfer policy matrix is separated from send-target orchestration and still matches active transfer-plan resolution.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-transfer-policy-matrix-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
