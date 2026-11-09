#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  probe: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyShadowProbe.ts',
  rootBuild: 'src/features/l3lab/spectralForge/rootFollow/buildV2RootFollowEvent.ts',
  adapter: 'src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchC.ts',
  curveReport: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveReport.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-carrier-loop-body-shadow-probe.ts',
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

const probe = read(paths.probe);
const rootBuild = read(paths.rootBuild);
const adapter = read(paths.adapter);
const curveReport = read(paths.curveReport);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'CARRIER_LOOP_BODY_SHADOW_PROBE_VERSION',
  'CarrierLoopBodyShadowProbeRequest',
  'CarrierLoopBodyShadowProbeReport',
  'buildCarrierLoopBodyShadowProbe',
  'buildCarrierLoopBodyCurvesFromBranchC',
  'buildCarrierLoopBodyCurveReport',
  'formatCarrierLoopBodyCurveReport',
  'SpectralForgeV2IntervalWindowBodyPlan',
  "status: 'unavailable'",
  "status: 'built'",
  "sourceReading: 'branch-c-interval-window-body-plan'",
  'curveReport',
  'formattedCurveReport',
]) requireText(paths.probe, probe, marker);

for (const forbidden of [
  'console.log',
  'AudioEngine',
  'executeCarrierIntegralTransfer',
  'document.',
  'window.',
  'createOscillator',
  'playBufferInternal',
]) requireAbsent(paths.probe, probe, forbidden);

for (const marker of [
  'type CarrierLoopBodyShadowProbeReport',
  'type CarrierLoopBodyShadowProbeRequest',
  'carrierLoopBodyShadowProbe?: CarrierLoopBodyShadowProbeRequest | null',
  'carrierLoopBodyShadowProbe: CarrierLoopBodyShadowProbeReport | null',
  'const carrierLoopBodyShadowProbe = args.carrierLoopBodyShadowProbe?.enabled',
  'buildCarrierLoopBodyShadowProbe({',
  'plan: shouldBuildCIntervalBody ? intervalWindowPlan : null',
  'sourcePresetId: runtimeRoute.compositionPresetId',
  'carrierLoopBodyShadowProbe,',
]) requireText(paths.rootBuild, rootBuild, marker);

requireText(paths.adapter, adapter, 'buildCarrierLoopBodyCurvesFromBranchC');
requireText(paths.curveReport, curveReport, 'buildCarrierLoopBodyCurveReport');
requireText(paths.index, index, "export * from './carrierLoopBodyShadowProbe';");
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-carrier-loop-body-shadow-probe');

for (const marker of [
  'Disabled probe returns null',
  'Enabled probe reports unavailable when Branch C plan is absent',
  'Built probe reports built status',
  'Built probe does not expose curve arrays directly',
  'Built probe contains curve report stats only',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-shadow-probe] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_carrier_loop_body_shadow_probe';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-loop-body-shadow-probe.js');
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
    path.join(root, paths.probe),
    path.join(root, paths.adapter),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveReport.ts'),
    path.join(root, 'src/features/l3lab/canonicalForge/localField.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/rootFollow/buildV2IntervalWindowBodyPlan.ts'),
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
  console.error('[spectralforge-carrier-loop-body-shadow-probe] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 9) {
    console.error('[spectralforge-carrier-loop-body-shadow-probe] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath: paths.probe,
    rootBuildPath: paths.rootBuild,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'CarrierLoopBody shadow probe is optional, report-only and does not change renderers, UI, AudioEngine or transfer execution.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-loop-body-shadow-probe] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
