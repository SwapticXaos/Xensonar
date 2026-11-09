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
const boundaryPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralSendRequest.ts';
const paritySource = 'tools/spectralforge-carrier-integral-send-request-parity.ts';
const signalButtonPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralSignalButtonViewModel.ts';
const intentPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryIntent.ts';
const outRoot = '.xensonar-checks/spectralforge-carrier-integral-send-request-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-carrier-integral-send-request-parity.js');

for (const file of [panelPath, boundaryPath, paritySource, signalButtonPath, intentPath]) requireFile(file);

const panel = read(panelPath);
const boundary = read(boundaryPath);
const parity = read(paritySource);

for (const marker of [
  './carrierIntegralVerwalten/carrierIntegralSendRequest',
  'resolveCarrierIntegralSendRequestFlow({',
  'assertCarrierIntegralSendRequestAllowed(sendRequest)',
  'machineId: sendRequest.effectiveMachine',
  'selectionOverride: sendRequest.selectionOverride',
  'synthLabOverride: sendRequest.synthLabOverride',
]) requireText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  'export const PURE_DIETER_MELODIC_SEND_HARD_GUARD_ERROR',
  'export type CarrierIntegralSendRequestFlow',
  'export function resolveCarrierIntegralSendRequestFlow',
  'export function assertCarrierIntegralSendRequestAllowed',
  'resolveCarrierIntegralSendTargetFlow',
  'isPureDieterMelodicSendBlocked',
]) requireText('carrierIntegralSendRequest.ts', boundary, marker);

for (const marker of [
  'const sendFlow = resolveCarrierIntegralSendTargetFlow({',
  'const { effectiveMachine, effectiveValueSource } = sendFlow;',
  'if (effectiveMachine === "raw-darkpsy-oscillator" && args.targetId === "melodic-pink-export")',
  'machineId: effectiveMachine',
  'valueSource: effectiveValueSource',
  'selectionOverride:\n          effectiveValueSource === "right-override"',
  'synthLabOverride: effectiveValueSource === "right-override" ? synthLab : null',
]) forbidText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  'pure dieter stored machine hard-blocks melodic even when current machine differs',
  'stored entry without stored/meta machine falls back to right override',
  'hard guard throws old error message',
  'checkedScenarios: checked.length',
]) requireText('send request parity source', parity, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-send-request-boundary] FAILED preflight');
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
    path.join(root, signalButtonPath),
    path.join(root, intentPath),
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
  console.error('[spectralforge-carrier-integral-send-request-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 9) {
    console.error('[spectralforge-carrier-integral-send-request-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath,
    panelPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier Integral send request formation and Pure-Dieter melodic hard guard are delegated to a pure helper with parity coverage.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-send-request-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
