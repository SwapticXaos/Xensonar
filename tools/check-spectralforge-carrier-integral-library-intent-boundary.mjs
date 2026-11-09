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
const intentPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryIntent.ts';
const sendRequestPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralSendRequest.ts';
const paritySource = 'tools/spectralforge-carrier-integral-library-intent-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-carrier-integral-library-intent-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-carrier-integral-library-intent-parity.js');

for (const file of [panelPath, intentPath, sendRequestPath, paritySource]) requireFile(file);

const panel = read(panelPath);
const intent = read(intentPath);
const sendRequest = read(sendRequestPath);
const parity = read(paritySource);

for (const marker of [
  './carrierIntegralVerwalten/carrierIntegralLibraryIntent',
  'createCarrierIntegralSupportedMachineResolver',
  'resolveCarrierIntegralEditorLoadFlow({',
  'resolveCarrierIntegralStoredDeviceValuesFlow({',
]) requireText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

requireText('carrierIntegralSendRequest.ts', sendRequest, 'resolveCarrierIntegralSendTargetFlow({');

for (const marker of [
  'export function createCarrierIntegralSupportedMachineResolver',
  'export function resolveCarrierIntegralEditorLoadFlow',
  'requestedMachine ?? storedMachine ?? metaMachine',
  "auditionValueSource: 'stored-entry'",
  'export function resolveCarrierIntegralSendTargetFlow',
  "effectiveValueSource: useStored ? 'stored-entry' : 'right-override'",
  'export function resolveCarrierIntegralStoredDeviceValuesFlow',
]) requireText('carrierIntegralLibraryIntent.ts', intent, marker);

for (const marker of [
  'const requestedMachine = initialFocusIntent.machineId && model.machineItems.some',
  'const storedMachine = storedSelection?.machineId && model.machineItems.some',
  'const metaMachine = targetProject.carrierIntegral?.machineId && model.machineItems.some',
  'const isSupportedLibraryMachineId = (value: unknown)',
  'auditionValueSource === "stored-entry" && storedMachine',
  'machineId: storedSelection.machineId,\n          bodySourceMode: storedSelection.bodySourceMode',
]) forbidText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  'editor load prefers requested machine over stored and meta',
  'send flow uses meta machine when stored selection is unsupported',
  'stored device values clone selection and synth lab',
  'checkedScenarios: checked.length',
]) requireText('library intent parity source', parity, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-library-intent-boundary] FAILED preflight');
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
  console.error('[spectralforge-carrier-integral-library-intent-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 10) {
    console.error('[spectralforge-carrier-integral-library-intent-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    intentPath,
    panelPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier Integral Verwalten library intent/load-flow decisions are delegated to a pure helper with parity coverage.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-library-intent-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
