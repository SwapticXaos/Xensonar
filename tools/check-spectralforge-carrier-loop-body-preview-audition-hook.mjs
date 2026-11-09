#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  hook: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionHook.ts',
  request: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionRequest.ts',
  plan: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionPlan.ts',
  preview: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewBuffer.ts',
  audition: 'src/features/l3lab/spectralForge/integral/carrierIntegralAudition.ts',
  auditionRequest: 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRequest.ts',
  auditionRoutes: 'src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts',
  syntheticBuild: 'src/features/l3lab/spectralForge/integral/carrierIntegralSyntheticRootFollowBuild.ts',
  rootBuild: 'src/features/l3lab/spectralForge/rootFollow/buildV2RootFollowEvent.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-carrier-loop-body-preview-audition-hook.ts',
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
function requireMaxLines(label, text, maxLines) {
  const count = text.split('\n').length;
  if (count > maxLines) failures.push(`${label} has ${count} lines; expected <= ${maxLines}`);
}

const hook = read(paths.hook);
const request = read(paths.request);
const plan = read(paths.plan);
const preview = read(paths.preview);
const audition = read(paths.audition);
const auditionRequest = read(paths.auditionRequest);
const auditionRoutes = read(paths.auditionRoutes);
const syntheticBuild = read(paths.syntheticBuild);
const rootBuild = read(paths.rootBuild);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  "export * from './carrierLoopBodyPreviewAuditionRequest';",
  "export * from './carrierLoopBodyPreviewAuditionPlan';",
]) requireText(paths.hook, hook, marker);
requireMaxLines(paths.hook, hook, 12);

for (const marker of [
  'CARRIER_LOOP_BODY_PREVIEW_AUDITION_REQUEST_BOUNDARY_VERSION',
  'CarrierLoopBodyPreviewAuditionHookRequest',
  'CECILIA_CARRIER_LOOP_BODY_PREVIEW_DEFAULT_REQUEST',
  'resolveCarrierLoopBodyPreviewAuditionRequestForMachine',
  'isCarrierLoopBodyPreviewAuditionHookEnabled',
  'buildCarrierLoopBodyPreviewAuditionOptions',
  "machineId === 'branch-c-interval-body'",
]) requireText(paths.request, request, marker);

for (const marker of [
  'CARRIER_LOOP_BODY_PREVIEW_AUDITION_HOOK_VERSION',
  'CARRIER_LOOP_BODY_PREVIEW_AUDITION_PLAN_BOUNDARY_VERSION',
  'CarrierLoopBodyPreviewAuditionHookPlan',
  'CarrierLoopBodyPreviewAuditionHookPlaybackReport',
  'buildCarrierLoopBodyPreviewAuditionLifecycleMode',
  'buildCarrierLoopBodyPreviewAuditionCacheToken',
  'buildCarrierLoopBodyPreviewAuditionHookPlan',
  'unsupported-machine',
  'missing-curve-body',
  'candidate-ready',
]) requireText(paths.plan, plan, marker);

for (const forbidden of [
  'console.log',
  'AudioEngine',
  'executeCarrierIntegralTransfer',
  'document.',
  'window.',
  'createOscillator',
  'playBufferInternal',
]) {
  requireAbsent(paths.hook, hook, forbidden);
  requireAbsent(paths.request, request, forbidden);
  requireAbsent(paths.plan, plan, forbidden);
}

for (const marker of [
  'createCarrierLoopBodyPreviewAudioBufferFromSamples',
  'renderDurationSec',
  'new AudioBuffer',
  'getChannelData',
]) requireText(paths.preview, preview, marker);

requireText(paths.auditionRequest, auditionRequest, 'carrierLoopBodyPreviewCandidate?: CarrierLoopBodyPreviewAuditionHookRequest | null');
requireText(paths.syntheticBuild, syntheticBuild, 'resolveCarrierLoopBodyPreviewAuditionRequestForMachine({');
for (const marker of [
  'buildCarrierLoopBodyPreviewAuditionHookPlan({',
  'supportedMachine: request.machineId === "branch-c-interval-body"',
  'renderCarrierLoopBodyPreviewSamples(',
  'createCarrierLoopBodyPreviewAudioBufferFromSamples(rendered)',
  'buildCarrierLoopBodyPreviewAuditionLifecycleMode({',
  'Carrier-Preview',
  'carrierLoopBodyAuditionRequest',
]) requireText(paths.auditionRoutes, auditionRoutes, marker);

for (const forbidden of [
  'CarrierIntegralVerwaltenPanel',
  'executeCarrierIntegralTransfer',
  'App.tsx',
]) requireAbsent(paths.hook, hook, forbidden);

for (const marker of [
  'carrierLoopBodyPreviewCandidate?: CarrierLoopBodyPreviewAuditionHookRequest | null',
  'carrierLoopBodyPreviewCandidateCurveSet: CarrierLoopBodyCurveSet | null',
  'const carrierLoopBodyPreviewCandidateCurveSet = args.carrierLoopBodyPreviewCandidate?.enabled',
  'buildCarrierLoopBodyCurvesFromBranchC({',
  'carrierLoopBodyPreviewCandidateCurveSet,',
]) requireText(paths.rootBuild, rootBuild, marker);

for (const marker of [
  "export * from './carrierLoopBodyPreviewAuditionRequest';",
  "export * from './carrierLoopBodyPreviewAuditionPlan';",
  "export * from './carrierLoopBodyPreviewAuditionHook';",
]) requireText(paths.index, index, marker);
requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-carrier-loop-body-preview-audition-hook');

for (const marker of [
  'Disabled hook reports disabled status',
  'Cecilia resolves default preview request',
  'Other machines do not resolve default preview request',
  'Unsupported machine does not become candidate-ready',
  'Missing curve body is reported without fallback claim',
  'Candidate-ready plan requires enabled request and curve body',
  'Cache token distinguishes source identity',
  'Lifecycle mode marks rendered candidate',
]) requireText(paths.scenario, scenario, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-preview-audition-hook] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_carrier_loop_body_preview_audition_hook';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-loop-body-preview-audition-hook.js');
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
    path.join(root, paths.hook),
    path.join(root, paths.request),
    path.join(root, paths.plan),
    path.join(root, paths.preview),
    path.join(root, 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts'),
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
  console.error('[spectralforge-carrier-loop-body-preview-audition-hook] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 14) {
    console.error('[spectralforge-carrier-loop-body-preview-audition-hook] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    hookPath: paths.hook,
    requestPath: paths.request,
    planPath: paths.plan,
    auditionPath: paths.audition,
    rootBuildPath: paths.rootBuild,
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'CarrierLoopBody preview audition hook is split into request and plan boundaries while preserving Cecilia-only audition behavior.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-loop-body-preview-audition-hook] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
