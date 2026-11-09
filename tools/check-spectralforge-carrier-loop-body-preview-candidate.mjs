#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  preview: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewBuffer.ts',
  curveTypes: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts',
  curveMath: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-carrier-loop-body-preview-candidate.ts',
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

const preview = read(paths.preview);
const curveTypes = read(paths.curveTypes);
const curveMath = read(paths.curveMath);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'CARRIER_LOOP_BODY_PREVIEW_CANDIDATE_VERSION',
  'CarrierLoopBodyPreviewBufferOptions',
  'CarrierLoopBodyPreviewSampleBuffer',
  'CarrierLoopBodyPreviewBufferStats',
  'renderCarrierLoopBodyPreviewSamples',
  'createCarrierLoopBodyPreviewAudioBuffer',
  'CarrierLoopBodyCurveSet',
  'centsToHz',
  'pitchDetuneCents',
  'gainCurve',
  'densityCurve',
  'roughnessCurve',
  'presenceCurve',
  'getChannelData',
]) requireText(paths.preview, preview, marker);

for (const forbidden of [
  'AudioEngine',
  'executeCarrierIntegralTransfer',
  'buildV2RootFollowEvent',
  'document.',
  'window.',
  'console.log',
  'playBufferInternal',
  'start(',
  'createOscillator',
]) requireAbsent(paths.preview, preview, forbidden);

requireText(paths.curveTypes, curveTypes, 'CarrierLoopBodyCurveSet');
requireText(paths.curveMath, curveMath, 'centsToHz');
requireText(paths.index, index, "export * from './carrierLoopBodyPreviewBuffer';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-carrier-loop-body-preview-candidate');

for (const marker of [
  'Renderer preserves source identity',
  'Renderer maps duration and sample rate to sample count',
  'Renderer emits finite samples',
  'Renderer emits audible non-zero RMS',
  'Renderer remains soft-limited',
  'Renderer applies loop-edge fade at beginning',
  'Zero gain curve stays silent',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-preview-candidate] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_carrier_loop_body_preview_candidate';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-loop-body-preview-candidate.js');
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
    path.join(root, paths.preview),
    path.join(root, paths.curveTypes),
    path.join(root, paths.curveMath),
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
  console.error('[spectralforge-carrier-loop-body-preview-candidate] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 12) {
    console.error('[spectralforge-carrier-loop-body-preview-candidate] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.preview,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'CarrierLoopBody preview candidate renders isolated sample buffers from CurveSets without changing AudioEngine, UI, transfer execution, Root Follow runtime or Worklets.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-loop-body-preview-candidate] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
