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
const requireAbsent = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const boundaryPath = 'src/features/l3lab/spectralForge/integral/carrierLoopBodyTransferExecutionPlan.ts';
const executorPath = 'src/features/l3lab/spectralForge/integral/executeCarrierIntegralTransfer.ts';
const cachePath = 'src/features/l3lab/spectralForge/integral/materialBodyPreviewCache.ts';
const indexPath = 'src/features/l3lab/spectralForge/integral/index.ts';
const paritySource = 'tools/spectralforge-carrier-loop-body-transfer-execution-plan.ts';
const outRoot = '.xensonar-checks/spectralforge-carrier-loop-body-transfer-execution-plan';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-carrier-loop-body-transfer-execution-plan.js');

for (const file of [boundaryPath, executorPath, cachePath, indexPath, paritySource]) requireFile(file);

const boundary = read(boundaryPath);
const executor = read(executorPath);
const cache = read(cachePath);
const index = read(indexPath);
const parity = read(paritySource);

for (const marker of [
  'CARRIER_LOOP_BODY_TRANSFER_EXECUTION_PLAN_VERSION',
  'CarrierLoopBodyTransferExecutionPlan',
  'carrierLoopBodyMachineDisplayName',
  'carrierLoopBodyPreviewGain',
  'resolveCarrierLoopBodyTransferExecutionPlan',
  'buildCarrierLoopBodyAudioPaintImportDetail',
  'buildCarrierLoopBodyMaterialEntryStableId',
]) requireText('carrierLoopBodyTransferExecutionPlan.ts', boundary, marker);

for (const marker of [
  'resolveCarrierLoopBodyTransferExecutionPlan',
  'buildCarrierLoopBodyAudioPaintImportDetail',
  'materialBodyPreviewCacheKey',
  'previewGain',
]) requireText('executeCarrierIntegralTransfer.ts', executor, marker);
for (const marker of [
  'function machineDisplayName',
  'function machinePreviewGain',
  'function safeDurationSecForBars',
  'Date.now().toString(36)',
  'buildMaterialBodyPreviewCacheKey({',
]) requireAbsent('executeCarrierIntegralTransfer.ts', executor, marker);
requireText('materialBodyPreviewCache.ts', cache, "from './carrierLoopBodyTransferExecutionPlan'");
requireText('integral/index.ts', index, "export * from './carrierLoopBodyTransferExecutionPlan';");
for (const marker of [
  'Pure Dieter display name preserved',
  'Dieter V2 plan builds cache key',
  'Unsupported machine error keeps old label form',
  'Audio paint detail forwards interval counts',
]) requireText('transfer execution parity source', parity, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-transfer-execution-plan-boundary] FAILED preflight');
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
    path.join(root, paritySource),
    path.join(root, boundaryPath),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralRuntimeRoutes.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSelection.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargetContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendContractBuilders.ts'),
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
  console.error('[spectralforge-carrier-loop-body-transfer-execution-plan-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 20) {
    console.error('[spectralforge-carrier-loop-body-transfer-execution-plan-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'CarrierLoopBody transfer execution planning is separated from audio rendering, cache mutation and material-library registration.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-loop-body-transfer-execution-plan-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
