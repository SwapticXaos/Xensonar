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
const boundaryPath = 'src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralGestureSampleExport.ts';
const paritySource = 'tools/spectralforge-carrier-integral-gesture-sample-export-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-carrier-integral-gesture-sample-export-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-carrier-integral-gesture-sample-export-parity.js');

for (const file of [panelPath, boundaryPath, paritySource]) requireFile(file);

const panel = read(panelPath);
const boundary = read(boundaryPath);
const parity = read(paritySource);

for (const marker of [
  './carrierIntegralVerwalten/carrierIntegralGestureSampleExport',
  'createCarrierIntegralGestureSampleExportRequest({',
  'sampleRequest.projectId',
  'sampleRequest.spectralSelection',
  'sampleRequest.sampleName',
  'createCarrierIntegralGestureSampleSuccessMessage(sampleRequest.projectName)',
  'createCarrierIntegralGestureSampleErrorMessage(error)',
]) requireText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  'export type CarrierIntegralGestureSampleExportRequest',
  'export function createCarrierIntegralGestureSampleExportRequest',
  'args.createSpectralSelection(args.gestureStrip, args.gestureSelection)',
  'args.normalizeSelection(args.gestureSelection)',
  'export function createCarrierIntegralGestureSampleSuccessMessage',
  'export function createCarrierIntegralGestureSampleErrorMessage',
]) requireText('carrierIntegralGestureSampleExport.ts', boundary, marker);

for (const marker of [
      'const startLabel = Math.round(normalized.start * 100).toString().padStart(2, \'0\')',
  'const endLabel = Math.round(normalized.end * 100).toString().padStart(2, \'0\')',
  'name: `${selectedProject.name} ${startLabel}-${endLabel}.wav`',
  "setLibraryMessage('Sample gespeichert · ' + selectedProject.name)",
  "error instanceof Error ? error.message : 'Sample konnte nicht gespeichert werden'",
]) forbidText('CarrierIntegralVerwaltenPanel.tsx', panel, marker);

for (const marker of [
  'normal selection names and copies spectral slice',
  'reversed selection normalizes before labels',
  'missing selected project returns null',
  'checkedScenarios: checked.length',
]) requireText('gesture sample parity source', parity, marker);

if (failures.length) {
  console.error('[spectralforge-carrier-integral-gesture-sample-export-boundary] FAILED preflight');
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
    baseUrl: root,
    paths: { '@/*': [path.join(root, 'src/*')] },
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    jsx: 'react-jsx',
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
  console.error('[spectralforge-carrier-integral-gesture-sample-export-boundary] FAILED compile');
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
    console.error('[spectralforge-carrier-integral-gesture-sample-export-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    boundaryPath,
    panelPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Carrier Integral gesture sample export request, sample naming and message/error flow are delegated with parity coverage.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-carrier-integral-gesture-sample-export-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
