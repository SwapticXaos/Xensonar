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
const signalSectionPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/CarrierIntegralSignalSendSection.tsx';
const boundaryPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralSignalButtonViewModel.ts';
const rawHandoffPath = 'src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff.ts';
const paritySource = 'tools/spectralforge-carrier-integral-signal-button-viewmodel-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-carrier-integral-signal-button-viewmodel-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-carrier-integral-signal-button-viewmodel-parity.js');

for (const file of [panelPath, signalSectionPath, boundaryPath, rawHandoffPath, paritySource]) requireFile(file);

const panel = read(panelPath);
const signalSection = read(signalSectionPath);
const boundary = read(boundaryPath);
const rawHandoff = read(rawHandoffPath);
const parity = read(paritySource);

for (const marker of [
  './carrierIntegralVerwalten/CarrierIntegralSignalSendSection',
  '<CarrierIntegralSignalSendSection',
]) requireText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  './carrierIntegralSignalButtonViewModel',
  'createCarrierIntegralSignalButtonViewModel({',
  'disabled={viewModel.disabled}',
  'title={viewModel.title}',
  'data-xensonar-carrier-integral-raw-melodic-material={viewModel.rawMaterialDataFlag}',
  'data-xensonar-carrier-integral-raw-melodic-material-machine={viewModel.rawMaterialMachineId}',
  'data-xensonar-carrier-integral-signal-send-section="true"',
]) requireText('CarrierIntegralSignalSendSection.tsx', signalSection, marker);

for (const marker of [
  'export type CarrierIntegralExportTargetId',
  'export function resolveCarrierIntegralRawMelodicMaterialSendSpec',
  'export function isCarrierIntegralRawMelodicMaterialSend',
  'export function createCarrierIntegralSignalButtonViewModel',
  'DEFAULT_SIGNAL_SEND_TITLE',
  'rawMelodicMaterialSpec?.uiTitle',
  'rawMelodicMaterialSpec?.uiButtonLabel',
]) requireText('carrierIntegralSignalButtonViewModel.ts', boundary, marker);

for (const marker of [
  'export type CarrierIntegralRawMelodicMaterialHandoffSpec',
  'uiPanelSummary',
  'uiPanelDetail',
  'uiButtonLabel',
]) requireText('carrierIntegralRawMelodicMaterialHandoff.ts', rawHandoff, marker);

for (const marker of [
  'const pureDieterMelodicBlocked = selectedMachine === "raw-darkpsy-oscillator" && args.targetId === "melodic-pink-export"',
  'disabled={!selectedProject || libraryBusy || pureDieterMelodicBlocked}',
  'PURE_DIETER_MELODIC_BLOCKED',
  'isPureDieterMelodicSendBlocked',
  'PURE_DIETER_MELODIC_RAW_MATERIAL_TITLE',
  'PURE_DIETER_MELODIC_RAW_MATERIAL_LABEL',
]) forbidText('CarrierIntegralVerwaltenPanel.tsx + signal section + helper', panel + signalSection + boundary, marker);

for (const marker of [
  'root follow enabled with contract summary',
  'pure dieter melodic raw material enabled with project',
  'harmonic xplore melodic raw material enabled with project',
  'raw melodic material keeps busy disabled but raw label',
  'checkedScenarios: checked.length',
]) requireText('signal button parity source', parity, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-signal-button-viewmodel-boundary] FAILED preflight');
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
    path.join(root, rawHandoffPath),
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
  console.error('[spectralforge-carrier-integral-signal-button-viewmodel-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 11) {
    console.error('[spectralforge-carrier-integral-signal-button-viewmodel-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath,
    panelPath,
    signalSectionPath,
    rawHandoffPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier Integral signal button model delegates raw melodic UI semantics to shared handoff specs.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-signal-button-viewmodel-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
