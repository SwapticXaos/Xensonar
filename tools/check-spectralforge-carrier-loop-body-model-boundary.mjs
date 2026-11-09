#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const requireAbsent = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} must not contain ${needle}`); };

const modelPath = 'src/features/l3lab/spectralForge/integral/carrierLoopBodyModel.ts';
const indexPath = 'src/features/l3lab/spectralForge/integral/index.ts';
const scenarioSource = 'tools/spectralforge-carrier-loop-body-model.ts';
const readinessPath = 'src/features/l3lab/spectralForge/integral/carrierLoopBodyContracts.ts';
const transferPath = 'src/features/l3lab/spectralForge/integral/carrierLoopBodyTransferExecutionPlan.ts';
const packagePath = 'package.json';
const outRoot = '.xensonar-checks/spectralforge-carrier-loop-body-model';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-carrier-loop-body-model.js');

for (const file of [modelPath, indexPath, scenarioSource, readinessPath, transferPath, packagePath]) requireFile(file);

const model = read(modelPath);
const index = read(indexPath);
const scenario = read(scenarioSource);
const pkg = read(packagePath);

for (const marker of [
  'CARRIER_LOOP_BODY_MODEL_VERSION',
  'CarrierLoopBodyModel',
  'CarrierLoopBodyTargetModel',
  'resolveCarrierLoopBodyModel',
  'listCarrierLoopBodyModels',
  'assertCarrierLoopBodyModels',
  'raw-material-body',
  'rendered-material-body',
  'formant-window-body',
  'synthetic-root-follow-config-body',
  'donor-timbre-contract-only-body',
  'melodic-raw-material',
]) requireText('carrierLoopBodyModel.ts', model, marker);

for (const marker of [
  'resolveCarrierLoopBodyReadinessContract',
  'resolveCarrierIntegralTransferPlan',
  'resolveDonatelloDieterRenderBody',
]) requireText('carrierLoopBodyModel.ts', model, marker);

for (const marker of [
  "export * from './carrierLoopBodyModel';",
]) requireText('integral/index.ts', index, marker);

for (const marker of [
  'Pure Dieter melodic direct send is hard blocked',
  'Dieter V2 body kind is rendered material',
  'Donatello body kind is formant window',
  'Donor-Timbre embodiment is contract-only',
]) requireText('model scenario source', scenario, marker);

requireText('package.json', pkg, 'xensonar:check-spectralforge-carrier-loop-body-model-boundary');
requireAbsent('carrierLoopBodyModel.ts', model, 'executeCarrierIntegralTransfer');
requireAbsent('carrierLoopBodyModel.ts', model, 'AudioEngine');
requireAbsent('carrierLoopBodyModel.ts', model, 'console.log');
requireAbsent('carrierLoopBodyModel.ts', model, 'document.');

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-model-boundary] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

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
    path.join(root, scenarioSource),
    path.join(root, modelPath),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierLoopBodyContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierLoopBodyTransferExecutionPlan.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralRuntimeRoutes.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargetContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendContractBuilders.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSelection.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSynthLab.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/donatelloDieterRenderBodyRegistry.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/materialBodyPreviewCache.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/virtualBodyActualizationTypes.ts'),
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
  console.error('[spectralforge-carrier-loop-body-model-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 30) {
    console.error('[spectralforge-carrier-loop-body-model-boundary] FAILED model scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: modelPath,
    scenarioSource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'CarrierLoopBody model boundary keeps machine/body/target identities explicit without touching renderers, UI or transfer execution.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-loop-body-model-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
