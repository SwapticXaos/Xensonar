#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  accumulator: 'src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyCurveAccumulator.ts',
  adapter: 'src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchC.ts',
  mapping: 'src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyResonanceMapping.ts',
  curveMath: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath.ts',
  curveTypes: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts',
  branchC: 'src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-branch-c-carrier-loop-body-curve-accumulator.ts',
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
const accumulator = read(paths.accumulator);
const adapter = read(paths.adapter);
const mapping = read(paths.mapping);
const curveMath = read(paths.curveMath);
const curveTypes = read(paths.curveTypes);
const branchC = read(paths.branchC);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'BRANCH_C_CARRIER_LOOP_BODY_CURVE_ACCUMULATOR_VERSION',
  'BranchCCarrierLoopBodyCurveAccumulator',
  'BranchCWindowSampleRange',
  'BranchCWindowCurveSample',
  'createBranchCCarrierLoopBodyCurveAccumulator',
  'branchCWindowSampleRange',
  'branchCWindowCurveSample',
  'accumulateBranchCIntervalWindowCurves',
  'finalizeBranchCCarrierLoopBodyCurveAccumulator',
  'pitchSum',
  'pitchWeight',
  'gainSum',
  'gainWeight',
  'presenceSum',
  'presenceWeight',
  'branchCWindowPaintedBaselineCents',
  'branchCWindowLocalPitchCents',
  'branchCRoughnessValue',
  'branchCPresenceValue',
]) requireText(paths.accumulator, accumulator, marker);

for (const marker of [
  "from './branchCCarrierLoopBodyCurveAccumulator'",
  'createBranchCCarrierLoopBodyCurveAccumulator',
  'accumulateBranchCIntervalWindowCurves',
  'finalizeBranchCCarrierLoopBodyCurveAccumulator',
  'BRANCH_C_CARRIER_LOOP_BODY_CURVE_ADAPTER_VERSION',
  '3.2.91.6.9.170',
]) requireText(paths.adapter, adapter, marker);

for (const forbidden of [
  'type CurveAccumulator',
  'function createAccumulator',
  'function windowSampleRange',
  'function accumulateWindow',
  'function finalizeAccumulator',
  'branchCWindowPaintedBaselineCents({',
  'branchCWindowLocalPitchCents({',
  'branchCRoughnessValue(args.intervalWindow',
  'branchCPresenceValue({ intervalWindow',
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
]) requireAbsent(paths.accumulator, accumulator, forbidden);

requireText(paths.mapping, mapping, 'BRANCH_C_CARRIER_LOOP_BODY_RESONANCE_MAPPING_VERSION');
requireText(paths.curveMath, curveMath, 'clamp01');
requireText(paths.curveTypes, curveTypes, 'CarrierLoopBodyCurveSet');
requireText(paths.branchC, branchC, 'SpectralForgeV2IntervalWindow');
requireText(paths.index, index, "export * from './branchCCarrierLoopBodyCurveAccumulator';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-branch-c-carrier-loop-body-curve-accumulator-boundary');
for (const marker of [
  'Accumulator version is 9.169',
  'Window range maps beats to global samples',
  'Curve sample creates finite pitch cents',
  'Defensive overlap weighting adds pitch weights rather than overwriting',
  'Finalized gain curve clamps into 0..1',
  'Invalid totalBeats produces empty range',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-branch-c-carrier-loop-body-curve-accumulator] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_branch_c_carrier_loop_body_curve_accumulator';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-branch-c-carrier-loop-body-curve-accumulator.js');
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
    path.join(root, paths.accumulator),
    path.join(root, paths.adapter),
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
  console.error('[spectralforge-branch-c-carrier-loop-body-curve-accumulator] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 18) {
    console.error('[spectralforge-branch-c-carrier-loop-body-curve-accumulator] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.accumulator,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Branch C CarrierLoopBody curve accumulator separates global window projection and defensive weighted accumulation from Cecilia resonance mapping semantics.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-branch-c-carrier-loop-body-curve-accumulator] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
