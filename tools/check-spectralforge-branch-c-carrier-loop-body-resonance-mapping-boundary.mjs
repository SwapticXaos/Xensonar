#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  mapping: 'src/features/l3lab/spectralForge/integral/branchCCarrierLoopBodyResonanceMapping.ts',
  adapter: 'src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchC.ts',
  curveMath: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath.ts',
  branchC: 'src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan.ts',
  localField: 'src/features/l3lab/canonicalForge/localField.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-branch-c-carrier-loop-body-resonance-mapping.ts',
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
const mapping = read(paths.mapping);
const adapter = read(paths.adapter);
const curveMath = read(paths.curveMath);
const branchC = read(paths.branchC);
const localField = read(paths.localField);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'BRANCH_C_CARRIER_LOOP_BODY_RESONANCE_MAPPING_VERSION',
  'BranchCCarrierLoopBodyPitchRole',
  'BranchCCarrierLoopBodyPitchContourMode',
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
  'painted-window-contour',
  'static-window-centroid',
  '0.11',
  '0.18',
  '0.08',
  '0.04',
  '0.035',
  '0.012',
  '-0.22',
  '0.22',
  '* 100',
]) requireText(paths.mapping, mapping, marker);

for (const marker of [
  "from './branchCCarrierLoopBodyResonanceMapping'",
  'branchCWindowPaintedBaselineCents',
  'branchCWindowLocalPitchCents',
  'branchCSampleGraphLinear',
  'branchCRoughnessValue',
  'branchCPresenceValue',
]) requireText(paths.adapter, adapter, marker);

for (const forbidden of [
  'AudioEngine',
  'executeCarrierIntegralTransfer',
  'playRenderedAudioBufferPreview',
  'createOscillator',
  'document.',
  'window.',
  'console.log',
  ': any',
  'as any',
]) requireAbsent(paths.mapping, mapping, forbidden);

requireText(paths.curveMath, curveMath, 'hzToCents');
requireText(paths.branchC, branchC, 'normalizeSignedAroundMean');
requireText(paths.branchC, branchC, 'spreadGraph: resampleGraph(rawSpread, GRAPH_RESOLUTION)');
requireText(paths.localField, localField, 'localFieldPitchSemitoneOffset');
requireText(paths.index, index, "export * from './branchCCarrierLoopBodyResonanceMapping';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-branch-c-carrier-loop-body-resonance-mapping-boundary');

for (const marker of [
  'Mapping version is 9.168',
  'Local pitch cents preserves LocalField *12 semitone semantics',
  'Painted contour midpoint respects centroid correction',
  'Static centroid mode remains static across window ratio',
  'Roughness mapping clamps into 0..1',
  'Presence rises with energy',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-branch-c-carrier-loop-body-resonance-mapping] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_branch_c_carrier_loop_body_resonance_mapping';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-branch-c-carrier-loop-body-resonance-mapping.js');
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
    path.join(root, paths.mapping),
    path.join(root, paths.curveMath),
    path.join(root, paths.localField),
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
  console.error('[spectralforge-branch-c-carrier-loop-body-resonance-mapping] FAILED compile');
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
    console.error('[spectralforge-branch-c-carrier-loop-body-resonance-mapping] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.mapping,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Branch C CarrierLoopBody resonance mapping keeps Cecilia pitch/roughness/presence semantics separate from the curve adapter mechanics.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-branch-c-carrier-loop-body-resonance-mapping] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
