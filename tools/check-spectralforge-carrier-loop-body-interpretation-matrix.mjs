#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  matrix: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyInterpretationMatrix.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-carrier-loop-body-interpretation-matrix.ts',
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

const matrix = read(paths.matrix);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'CARRIER_LOOP_BODY_INTERPRETATION_MATRIX_VERSION',
  'CARRIER_LOOP_BODY_EXPERIMENTAL_PEER_GROUP_ID',
  'CarrierLoopBodyInterpretationEntry',
  'CarrierLoopBodyAdapterStatus',
  'first-adapter-not-exclusive-owner',
  'future-adapter-peer',
  'planned-compatible-window-adapter',
  'planned-distinct-line-adapter',
  'cecilia-version-preview-candidate',
  'cecilia-default-version-path',
  'isCarrierLoopBodyExperimentalPeerMachine',
  'resolveCarrierLoopBodyInterpretationEntry',
  'listCarrierLoopBodyInterpretationMatrix',
  'assertCarrierLoopBodyInterpretationMatrix',
  'Antonia Glatt',
  'Bert',
  'Cecilia',
  'Cecilia remains the first implemented adapter without UI hierarchy claims.',
]) requireText(paths.matrix, matrix, marker);

for (const forbidden of [
  'AudioEngine',
  'executeCarrierIntegralTransfer',
  'CarrierIntegralVerwaltenPanel',
  'App.tsx',
  'AudioWorklet',
  'document.',
  'window.',
  'console.log',
  'playRenderedAudioBufferPreview',
  'renderCarrierLoopBodyPreviewSamples',
]) requireAbsent(paths.matrix, matrix, forbidden);

requireText(paths.index, index, "export * from './carrierLoopBodyInterpretationMatrix';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-carrier-loop-body-interpretation-matrix');

for (const marker of [
  'Antonia is peer',
  'Bert is peer',
  'Cecilia is peer',
  'Cecilia is first implemented adapter without UI hierarchy claim',
  'Cecilia preview is direct version path',
  'Antonia does not inherit Branch C hook',
  'Bert does not inherit Branch C hook',
  'Only Cecilia is implemented adapter',
  'Donatello remains separate formant body family',
  'Dieter V2 remains separate rendered material family',
  'Pure Dieter remains separate raw material family',
  'Donor embodiment remains contract only',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-interpretation-matrix] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_carrier_loop_body_interpretation_matrix';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-loop-body-interpretation-matrix.js');
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
    path.join(root, paths.matrix),
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
  console.error('[spectralforge-carrier-loop-body-interpretation-matrix] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 15) {
    console.error('[spectralforge-carrier-loop-body-interpretation-matrix] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.matrix,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'CarrierLoopBody interpretation matrix keeps Antonia/Bert/Cecilia equal peers, routes only Cecilia through the current version candidate path, and prevents Donatello/Dieter/Pure Dieter alias drift.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-loop-body-interpretation-matrix] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
