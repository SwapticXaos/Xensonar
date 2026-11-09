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

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const operationPath = 'src/features/l3lab/spectralForge/state/storeSpectralOperations.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const paritySource = 'tools/spectralforge-store-harmonizer-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-store-harmonizer-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-store-harmonizer-parity.js');

for (const file of [
  storePath,
  operationPath,
  storeTypesPath,
  paritySource,
  'src/features/l3lab/spectralForge/audio/SpectralData.ts',
]) requireFile(file);

const store = read(storePath);
const operations = read(operationPath);
const storeTypes = read(storeTypesPath);
const parity = read(paritySource);

for (const marker of [
  "from './storeSpectralOperations'",
  'export type { HarmonizerType } from \'./storeSpectralOperations\'',
  '...createSpectralOperationStoreActions(set, get)',
]) requireText('store.ts', store, marker);

for (const marker of [
  'applyHarmonizer: (type: HarmonizerType, params?: Record<string, number>) => void',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const marker of [
  "export type HarmonizerType = 'overtones' | 'intervals' | 'inharmonic' | 'spectralBlur'",
  'export function applySpectralHarmonizerToData',
  'export function createSpectralOperationStoreActions',
  'get().pushUndo()',
  'applySpectralHarmonizerToData(spectralData, type, params)',
  'renderVersion: state.renderVersion + 1',
  'audioBufferDirty: true',
]) requireText('storeSpectralOperations.ts', operations, marker);

for (const marker of [
  'applyLegacyInlineHarmonizer',
  'harmonizer parity overtones',
  'applySpectralHarmonizerToData(extracted, testCase.type, testCase.params)',
  "{ type: 'spectralBlur', params: { radius: 2 } }",
]) requireText('harmonizer parity source', parity, marker);

for (const marker of [
  'const freq = 20 * Math.pow(1000, normalized)',
  "case 'overtones':",
  "case 'intervals':",
  "case 'inharmonic':",
  "case 'spectralBlur':",
]) forbidText('store.ts', store, marker);

if (failures.length) {
  console.error('[spectralforge-store-harmonizer-operation-boundary] FAILED preflight');
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
    lib: ['ES2022', 'DOM'],
    jsx: 'react-jsx',
    strict: false,
    skipLibCheck: true,
    esModuleInterop: true,
    noEmitOnError: true,
    rootDir: root,
    outDir: absOutDir,
  },
  include: [
    path.join(root, paritySource),
    path.join(root, operationPath),
    path.join(root, 'src/features/l3lab/spectralForge/audio/SpectralData.ts'),
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
  console.error('[spectralforge-store-harmonizer-operation-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 4) {
    console.error('[spectralforge-store-harmonizer-operation-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    operationPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Harmonizer operation boundary matches the legacy inline Store operation for all four harmonizer modes.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-store-harmonizer-operation-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
