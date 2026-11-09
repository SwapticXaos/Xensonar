#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const paths = {
  types: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts',
  math: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveMath.ts',
  report: 'src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveReport.ts',
  index: 'src/features/l3lab/spectralForge/integral/index.ts',
  scenario: 'tools/spectralforge-carrier-loop-body-curve-contract.ts',
  pkg: 'package.json',
  transfer: 'src/features/l3lab/spectralForge/integral/executeCarrierIntegralTransfer.ts',
  audio: 'src/features/l3lab/spectralForge/audio/AudioEngine.ts',
  app: 'src/App.tsx',
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

const types = read(paths.types);
const math = read(paths.math);
const report = read(paths.report);
const index = read(paths.index);
const scenario = read(paths.scenario);
const pkg = read(paths.pkg);

for (const marker of [
  'CARRIER_LOOP_BODY_CURVE_CONTRACT_VERSION',
  'CarrierLoopBodyCurveSet',
  'CarrierLoopBodyCurveSafety',
  'CarrierLoopBodyCurveWarning',
  'CarrierLoopBodyCurveReport',
  'pitchDetuneCents: Float32Array',
  'gainCurve: Float32Array',
  'densityCurve: Float32Array',
  'roughnessCurve: Float32Array',
  'presenceCurve: Float32Array',
  'loopSafe: boolean',
  'modulationSafe: boolean',
]) requireText(paths.types, types, marker);

for (const marker of [
  'clamp01',
  'clampSigned',
  'hzToCents',
  'centsToHz',
  'safeFloat32ArrayStats',
  'evaluateLoopEdgeContinuity',
  'evaluateCarrierLoopBodyCurveSafety',
  'withCarrierLoopBodyCurveSafety',
  'curve-length-mismatch',
  'loop-edge-pitch-jump',
]) requireText(paths.math, math, marker);

for (const marker of [
  'buildCarrierLoopBodyCurveReport',
  'formatCarrierLoopBodyCurveReport',
  'return [',
]) requireText(paths.report, report, marker);

for (const marker of [
  "export * from './carrierLoopBodyCurveTypes';",
  "export * from './carrierLoopBodyCurveMath';",
  "export * from './carrierLoopBodyCurveReport';",
]) requireText(paths.index, index, marker);

for (const marker of [
  'Version is 9.159 curve contract',
  'Valid body is loop safe',
  'Invalid body reports length mismatch',
]) requireText(paths.scenario, scenario, marker);

requireText(paths.pkg, pkg, 'xensonar:check-spectralforge-carrier-loop-body-curve-contract');

for (const [label, text] of [
  [paths.types, types],
  [paths.math, math],
  [paths.report, report],
]) {
  requireAbsent(label, text, 'AudioEngine');
  requireAbsent(label, text, 'executeCarrierIntegralTransfer');
  requireAbsent(label, text, 'document.');
  requireAbsent(label, text, 'window.');
  requireAbsent(label, text, 'console.log');
}

if (failures.length) {
  console.error('[spectralforge-carrier-loop-body-curve-contract] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const outRoot = '.tmp_carrier_loop_body_curve_contract';
const absOutDir = path.join(root, outRoot, 'dist');
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(absOutDir, 'tools/spectralforge-carrier-loop-body-curve-contract.js');
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
    path.join(root, paths.types),
    path.join(root, paths.math),
    path.join(root, paths.report),
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
  console.error('[spectralforge-carrier-loop-body-curve-contract] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios < 10) {
    console.error('[spectralforge-carrier-loop-body-curve-contract] FAILED scenario coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPaths: [paths.types, paths.math, paths.report],
    scenarioSource: paths.scenario,
    checkedScenarios: parsed.checkedScenarios,
    message: 'CarrierLoopBody curve contract adds pure typed-array body, safety and report helpers without touching renderers, UI or transfer execution.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-loop-body-curve-contract] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
