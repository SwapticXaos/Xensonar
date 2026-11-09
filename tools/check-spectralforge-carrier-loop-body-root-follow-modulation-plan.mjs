#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  plan: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyRootFollowModulationPlan.ts',
  curveTypes: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts',
  curveMath: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath.ts',
  rootBuild: 'src/features/l3lab/spectralForge/rootFollow/buildV2RootFollowEvent.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-carrier-loop-body-root-follow-modulation-plan.ts',
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

const plan = read(paths.plan);
const rootBuild = read(paths.rootBuild);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'CARRIER_LOOP_BODY_ROOT_FOLLOW_MODULATION_PLAN_VERSION',
  'CarrierLoopBodyRootFollowModulationPlan',
  'CarrierLoopBodyRootFollowModulationAxis',
  'buildCarrierLoopBodyRootFollowModulationPlan',
  'isCarrierLoopBodyRootFollowModulationPlanReady',
  'live-root-frequency-anchor',
  'detune-cents-over-live-root',
  'dynamic-fade-over-carrier-loop',
  'relative-detune-over-live-anchor',
  'preservesPaintedCarrierPitchContour',
  'preservesPaintedCarrierEnergyContour',
  'keepsPitchUnquantized',
  'allowsLiveRootFollowBaseModulation',
  'renderReady: false',
  'runtimeAttached: false',
]) requireText(paths.plan, plan, marker);

for (const forbidden of [
  'AudioEngine',
  'executeCarrierIntegralTransfer',
  'CarrierIntegralVerwaltenPanel',
  'document.',
  'window.',
  'console.log',
  'createOscillator',
  'playRenderedAudioBufferPreview',
]) requireAbsent(paths.plan, plan, forbidden);

for (const marker of [
  'buildCarrierLoopBodyRootFollowModulationPlan',
  'type CarrierLoopBodyRootFollowModulationPlan',
  'carrierLoopBodyRootFollowModulationPlan: CarrierLoopBodyRootFollowModulationPlan | null',
  'const carrierLoopBodyRootFollowModulationPlan = carrierLoopBodyPreviewCandidateCurveSet',
  'carrierLoopBodyRootFollowModulationPlan,',
]) requireText(paths.rootBuild, rootBuild, marker);

requireText(paths.index, index, "export * from './carrierLoopBodyRootFollowModulationPlan';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-carrier-loop-body-root-follow-modulation-plan');

for (const marker of [
  'Plan preserves source identity',
  'Pitch is applied as detune over live root',
  'Plan keeps pitch unquantized',
  'Plan allows live Root Follow base modulation',
  'Plan is shadow-only, not runtime attached',
  'Unsafe body does not become ready',
  'Empty body reports invalid readiness',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-root-follow-modulation-plan] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_carrier_loop_body_root_follow_modulation_plan';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-loop-body-root-follow-modulation-plan.js');
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
    path.join(root, paths.plan),
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
  console.error('[spectralforge-carrier-loop-body-root-follow-modulation-plan] FAILED compile');
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
    console.error('[spectralforge-carrier-loop-body-root-follow-modulation-plan] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.plan,
    rootBuildPath: paths.rootBuild,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'CarrierLoopBody root-follow modulation plan preserves the painted Carrier curves as relative detune/dynamic body and remains shadow-only.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-loop-body-root-follow-modulation-plan] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
