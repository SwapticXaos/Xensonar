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

const boundaryPath = 'src/features/l3lab/spectralForge/integral/carrierLoopBodyContracts.ts';
const indexPath = 'src/features/l3lab/spectralForge/integral/index.ts';
const paritySource = 'tools/spectralforge-carrier-loop-body-readiness.ts';
const executorPath = 'src/features/l3lab/spectralForge/integral/executeCarrierIntegralTransfer.ts';
const outRoot = '.xensonar-checks/spectralforge-carrier-loop-body-readiness';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-carrier-loop-body-readiness.js');

for (const file of [boundaryPath, indexPath, paritySource, executorPath]) requireFile(file);

const boundary = read(boundaryPath);
const index = read(indexPath);
const parity = read(paritySource);
const executor = read(executorPath);

for (const marker of [
  'export const CARRIER_LOOP_BODY_CONTRACT_VERSION',
  'export type CarrierLoopBodyClass',
  'export type CarrierLoopBodyReadinessContract',
  'resolveCarrierLoopBodyReadinessContract',
  'listCarrierLoopBodyReadinessContracts',
  'assertCarrierLoopBodyReadinessContracts',
  'donatello-formant-material-body',
  'synthetic-root-follow-config-body',
  'mustPreserveFormantPlan',
]) requireText('carrierLoopBodyContracts.ts', boundary, marker);

for (const marker of [
  "export * from './carrierLoopBodyContracts';",
]) requireText('integral/index.ts', index, marker);

for (const marker of [
  'renderDonatelloFormantPlanToAudioBuffer',
  'renderCarrierIntegralConfigToAudioBuffer',
  'transferPlan.renderSource === "donatello-formant-plan-buffer"',
  'transferPlan.requiresAudibleRenderedBody',
]) requireText('executeCarrierIntegralTransfer.ts', executor, marker);

for (const marker of [
  'Pure Dieter root-follow remains raw rendered body',
  'Dieter V2 does not build synthetic root-follow',
  'Donatello root-follow preserves formant plan',
  'Donor embodiment remains explicitly contract-only',
]) requireText('readiness parity source', parity, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-readiness-boundary] FAILED preflight');
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
    rootDir: root,
    outDir: absOutDir,
  },
  include: [
    path.join(root, paritySource),
    path.join(root, boundaryPath),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralRegistry.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralRuntimeRoutes.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendTargetContracts.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierIntegralSendContractBuilders.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/donatelloDieterRenderBodyRegistry.ts'),
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
  console.error('[spectralforge-carrier-loop-body-readiness-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 18 || parsed.machineCount !== 8) {
    console.error('[spectralforge-carrier-loop-body-readiness-boundary] FAILED readiness coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    machineCount: parsed.machineCount,
    statuses: parsed.statuses,
    message: 'CarrierLoopBody readiness contracts distinguish synthetic, raw/rendered, Dieter V2 and Donatello bodies before renderer work continues.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-loop-body-readiness-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
