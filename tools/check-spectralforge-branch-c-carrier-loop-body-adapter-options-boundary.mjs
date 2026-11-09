#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  options: 'src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyAdapterOptions.ts',
  adapter: 'src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchC.ts',
  accumulator: 'src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyCurveAccumulator.ts',
  mapping: 'src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyResonanceMapping.ts',
  curveMath: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath.ts',
  curveTypes: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts',
  branchC: 'src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-branch-c-carrier-loop-body-adapter-options.ts',
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
const options = read(paths.options);
const adapter = read(paths.adapter);
const accumulator = read(paths.accumulator);
const mapping = read(paths.mapping);
const curveMath = read(paths.curveMath);
const curveTypes = read(paths.curveTypes);
const branchC = read(paths.branchC);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'BRANCH_C_CARRIER_LOOP_BODY_ADAPTER_OPTIONS_VERSION',
  'BuildCarrierLoopBodyCurvesFromBranchCArgs',
  'ResolvedBranchCCarrierLoopBodyCurveAdapterOptions',
  'buildBranchCCarrierLoopBodySourceIdentity',
  'resolveBranchCCarrierLoopBodyCurveAdapterOptions',
  'expectedCarrierLoopBodyCurveLength',
  'control-rate:',
  'pitch-role:',
  'painted-contour:',
  'branch-c-carrier-loop-body-adapter-options-3.2.91.6.9.170',
]) requireText(paths.options, options, marker);

for (const marker of [
  "from './branchCCarrierLoopBodyAdapterOptions'",
  'resolveBranchCCarrierLoopBodyCurveAdapterOptions(args)',
  'resolved.totalSamples',
  'resolved.pitchRole',
  'resolved.pitchContourMode',
  'resolved.sourceIdentity',
  'resolved.controlSampleRate',
  'BRANCH_C_CARRIER_LOOP_BODY_CURVE_ADAPTER_VERSION',
  '3.2.91.6.9.170',
]) requireText(paths.adapter, adapter, marker);

for (const forbidden of [
  'function buildBranchCSourceIdentity',
  'args.controlSampleRate ?? 1000',
  'const pitchRole = args.pitchRole',
  'const pitchContourMode = args.pitchContourMode',
  'expectedCarrierLoopBodyCurveLength(args.durationSec',
]) requireAbsent(paths.adapter, adapter, forbidden);

for (const forbidden of [
  ': any',
  'as any',
  'console.log',
  'AudioEngine',
  'executeCarrierIntegralTransfer',
  'playRenderedAudioBufferPreview',
  'createOscillator',
  'document.',
  'window.',
]) requireAbsent(paths.options, options, forbidden);

requireText(paths.accumulator, accumulator, 'BRANCH_C_CARRIER_LOOP_BODY_CURVE_ACCUMULATOR_VERSION');
requireText(paths.mapping, mapping, 'BRANCH_C_CARRIER_LOOP_BODY_RESONANCE_MAPPING_VERSION');
requireText(paths.curveMath, curveMath, 'expectedCarrierLoopBodyCurveLength');
requireText(paths.curveTypes, curveTypes, 'CarrierLoopBodyCurveSet');
requireText(paths.branchC, branchC, 'SpectralForgeV2IntervalWindowBodyPlan');
requireText(paths.index, index, "export * from './branchCCarrierLoopBodyAdapterOptions';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-branch-c-carrier-loop-body-adapter-options-boundary');
for (const marker of [
  'Adapter options version is 9.170',
  'Default control sample rate remains 1000',
  'Default pitch role remains body',
  'Default contour mode remains painted-window-contour',
  'Resolved identity includes control rate',
  'Explicit source identity is never rewritten',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-branch-c-carrier-loop-body-adapter-options] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_branch_c_carrier_loop_body_adapter_options';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-branch-c-carrier-loop-body-adapter-options.js');
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
    path.join(root, paths.options),
    path.join(root, paths.adapter),
    path.join(root, paths.accumulator),
    path.join(root, paths.mapping),
    path.join(root, paths.curveTypes),
    path.join(root, paths.curveMath),
    path.join(root, 'src/features/l3lab/canonicalForge/localField.ts'),
    path.join(root, paths.branchC),
    path.join(root, 'src/features/l3lab/spectralForge/types/carrierDonorV2Types.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/types/gestaltMaterialField.ts'),
    path.join(root, 'src/features/xensonar/audioMaterial/audioMaterialInterpretationProfile.ts'),
    path.join(root, 'src/features/xensonar/rootFollow/rootFollowSpectralWindowMeta.ts'),
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
  console.error('[spectralforge-branch-c-carrier-loop-body-adapter-options] FAILED compile');
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
    console.error('[spectralforge-branch-c-carrier-loop-body-adapter-options] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.options,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Branch C CarrierLoopBody adapter options separate defaults and stable source identity from public adapter orchestration.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-branch-c-carrier-loop-body-adapter-options] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
