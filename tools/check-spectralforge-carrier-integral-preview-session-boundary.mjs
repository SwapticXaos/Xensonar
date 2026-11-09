#!/usr/bin/env node
import { resolveTypeScriptCliPath } from './typescript-runtime.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const read = (file) => fs.existsSync(path.join(root, file)) ? fs.readFileSync(path.join(root, file), 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const panelPath = 'src/features/l3lab/spectralForge/components/CarrierIntegralVerwaltenPanel.tsx';
const boundaryPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralPreviewSession.ts';
const paritySource = 'tools/spectralforge-carrier-integral-preview-session-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-carrier-integral-preview-session-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-carrier-integral-preview-session-parity.js');

for (const file of [panelPath, boundaryPath, paritySource]) requireFile(file);
const panel = read(panelPath);
const boundary = read(boundaryPath);
const parity = read(paritySource);

for (const marker of [
  './carrierIntegralVerwalten/carrierIntegralPreviewSession',
  'createCarrierIntegralAuditionKey({ entryId: entry.id, machineId, valueSource })',
  'createCarrierIntegralAuditionRequest({',
  'resolveCarrierIntegralPreviewSessionActivation({',
  'shouldRefreshCarrierIntegralPreviewSession({',
  'CARRIER_INTEGRAL_PREVIEW_REAUDITION_DELAY_MS',
]) requireText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  'export const CARRIER_INTEGRAL_PREVIEW_MAX_DURATION_SEC = 6',
  'export const CARRIER_INTEGRAL_PREVIEW_REAUDITION_DELAY_MS = 180',
  'export function createCarrierIntegralAuditionKey',
  'export function createCarrierIntegralAuditionOverrides',
  'export function createCarrierIntegralAuditionRequest',
  'export function resolveCarrierIntegralPreviewSessionActivation',
  'export function shouldRefreshCarrierIntegralPreviewSession',
]) requireText('carrierIntegralPreviewSession.ts', boundary, marker);

for (const marker of [
  'const buildAuditionOverrides = (',
  'maxPreviewDurationSec: 6,',
  'setLastPreviewMachineId(machineId);',
  'setGesturePlayheadStartedAt(Date.now());',
  '}, 180);',
]) forbidText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  'right override clones selection with requested machine and user source',
  'stored entry does not attach right side overrides',
  'preview activation selects machine as user override',
  'refresh blocked while audition busy',
  'checkedScenarios: checked.length',
]) requireText('preview session parity source', parity, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-preview-session-boundary] FAILED preflight');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

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
    rootDir: root,
    outDir: absOutDir,
  },
  include: [
    path.join(root, paritySource),
    path.join(root, boundaryPath),
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
  console.error('[spectralforge-carrier-integral-preview-session-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 20) {
    console.error('[spectralforge-carrier-integral-preview-session-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath,
    panelPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier Integral preview session key/request/refresh decisions are delegated to a pure helper with parity coverage.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-preview-session-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
