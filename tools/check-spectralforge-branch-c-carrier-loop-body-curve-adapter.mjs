#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  adapter: 'src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchC.ts',
  curveTypes: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts',
  curveMath: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath.ts',
  branchC: 'src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan.ts',
  mapping: 'src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyResonanceMapping.ts',
  accumulator: 'src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyCurveAccumulator.ts',
  adapterOptions: 'src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyAdapterOptions.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-branch-c-carrier-loop-body-curve-adapter.ts',
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

const adapter = read(paths.adapter);
const curveTypes = read(paths.curveTypes);
const curveMath = read(paths.curveMath);
const branchC = read(paths.branchC);
const mapping = read(paths.mapping);
const accumulator = read(paths.accumulator);
const adapterOptions = read(paths.adapterOptions);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'BRANCH_C_CARRIER_LOOP_BODY_CURVE_ADAPTER_VERSION',
  'BuildCarrierLoopBodyCurvesFromBranchCArgs',
  'buildCarrierLoopBodyCurvesFromBranchC',
  'BranchCCarrierLoopBodyPitchContourMode',
  "sourceKind: 'branch-c-interval-window-body-plan'",
  'createBranchCCarrierLoopBodyCurveAccumulator',
  'accumulateBranchCIntervalWindowCurves',
  'finalizeBranchCCarrierLoopBodyCurveAccumulator',
  'BRANCH_C_CARRIER_LOOP_BODY_CURVE_ACCUMULATOR_VERSION',
]) requireText(paths.adapter, adapter, marker);

for (const marker of [
  'BRANCH_C_CARRIER_LOOP_BODY_RESONANCE_MAPPING_VERSION',
  'branchCCarrierLoopBodyRolePitchScale',
  'branchCCarrierLoopBodyRoleSpreadPitchScale',
  'branchCWindowLocalPitchFieldValue',
  'branchCWindowLocalPitchCents',
  'branchCWindowPaintedBaselineCents',
  'branchCSampleGraphLinear',
  'branchCRoughnessValue',
  'branchCPresenceValue',
  'localFieldPitchSemitoneOffset',
  'frequencyStartHz',
  'frequencyEndHz',
  'frequencyCentroidHz',
  'transientness',
  'args.centroid * branchCCarrierLoopBodyRolePitchScale(role)',
  '-0.22',
  '0.22',
  '* 100',
  'painted-window-contour',
  'static-window-centroid',
]) requireText(paths.mapping, mapping, marker);


for (const marker of [
  'BRANCH_C_CARRIER_LOOP_BODY_CURVE_ACCUMULATOR_VERSION',
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
  'startBeat',
  'endBeat',
  'energyGraph',
  'densityGraph',
  'centroidGraph',
  'spreadGraph',
  'continuity',
  'roughness',
]) requireText(paths.accumulator, accumulator, marker);

for (const forbidden of [
  'centroidGraph[graphIndex] * 25',
  'LOCAL_PITCH_DEPTH_CENTS',
  ': any',
  'as any',
  'console.log',
  'AudioEngine',
  'executeCarrierIntegralTransfer',
  'document.',
  'window.',
]) requireAbsent(paths.adapter, adapter, forbidden);

requireText(paths.curveTypes, curveTypes, "'branch-c-interval-window-body-plan'");
requireText(paths.curveMath, curveMath, 'withCarrierLoopBodyCurveSafety');
requireText(paths.branchC, branchC, 'const GRAPH_RESOLUTION = 96');
requireText(paths.branchC, branchC, 'normalizeSignedAroundMean');
requireText(paths.branchC, branchC, 'spreadGraph: resampleGraph(rawSpread, GRAPH_RESOLUTION)');
requireText(paths.index, index, "export * from './buildCarrierLoopBodyCurvesFromBranchC';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-branch-c-carrier-loop-body-curve-adapter');

for (const marker of [
  'Version is 9.170 branch C painted contour adapter',
  'Body role pitch uses Branch C LocalField semitone semantics',
  'Painted contour mode preserves window start-to-end pitch motion',
  'Static centroid mode keeps previous window-centroid behaviour',
  'Branch C local body pitch is not flattened to 25 cents',
  'Defensive overlap weighting does not depend on last-window overwrite',
]) requireText(paths.scenario, scenario, marker);


requireText(paths.adapterOptions, adapterOptions, 'BRANCH_C_CARRIER_LOOP_BODY_ADAPTER_OPTIONS_VERSION');
requireText(paths.adapterOptions, adapterOptions, 'resolveBranchCCarrierLoopBodyCurveAdapterOptions');
requireText(paths.adapter, adapter, "from './branchCCarrierLoopBodyAdapterOptions'");

if (failures.length) {
  console.error('[spectralforge-branch-c-carrier-loop-body-curve-adapter] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_branch_c_carrier_loop_body_curve_adapter';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-branch-c-carrier-loop-body-curve-adapter.js');
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
    path.join(root, paths.adapter),
    path.join(root, paths.mapping),
    path.join(root, paths.accumulator),
    path.join(root, paths.adapterOptions),
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
  console.error('[spectralforge-branch-c-carrier-loop-body-curve-adapter] FAILED compile');
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
    console.error('[spectralforge-branch-c-carrier-loop-body-curve-adapter] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.adapter,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Branch C CarrierLoopBody curve adapter maps interval-window graphs into the 9.159 curve contract without touching renderers, UI or transfer execution.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-branch-c-carrier-loop-body-curve-adapter] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
