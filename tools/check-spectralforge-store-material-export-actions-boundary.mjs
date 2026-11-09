#!/usr/bin/env node
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
const materialHelpersPath = 'src/features/l3lab/spectralForge/state/storeMaterialExport.ts';
const materialActionsPath = 'src/features/l3lab/spectralForge/state/storeMaterialExportActions.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const paritySource = 'tools/spectralforge-store-material-export-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-store-material-export-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-store-material-export-parity.js');

for (const file of [storePath, materialHelpersPath, materialActionsPath, storeTypesPath, paritySource]) requireFile(file);

const store = read(storePath);
const materialHelpers = read(materialHelpersPath);
const materialActions = read(materialActionsPath);
const storeTypes = read(storeTypesPath);
const parity = read(paritySource);

for (const marker of [
  "from './storeMaterialExportActions'",
  '...createMaterialExportStoreActions(set)',
]) requireText('store.ts', store, marker);

for (const marker of [
  'updateMaterialExport: (patch: Partial<MaterialExportConfig>) => void',
  'setGuideMarker: (index: number, value: number) => void',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const marker of [
  'export function clampBars',
  'export function clampGuideSegments',
  'export function buildDefaultGuideMarkers',
  'export function sanitizeGuideMarkers',
  'export function computeLoopDurationSec',
]) requireText('storeMaterialExport.ts', materialHelpers, marker);

for (const marker of [
  'export function updateMaterialExportConfig',
  'export function setMaterialExportGuideMarker',
  'export function createMaterialExportStoreActions',
  'buildDefaultGuideMarkers(nextSegments)',
  'sanitizeGuideMarkers(nextMarkersSource, nextSegments)',
  'beatGuideVolume: nextBeatGuideVolume',
]) requireText('storeMaterialExportActions.ts', materialActions, marker);

for (const marker of [
  'runUpdateScenario',
  'guide segment reset markers',
  'beat guide volume upper clamp',
  'setGuideMarker clamps and preserves other fields',
  'checkedScenarios: 7',
]) requireText('material-export parity source', parity, marker);

for (const marker of [
  'const nextBars = patch.bars !== undefined',
  'const nextSegments = patch.guideSegments !== undefined',
  'const shouldResetMarkers = patch.guideSegments !== undefined',
  'const nextBeatGuideVolume = patch.beatGuideVolume !== undefined',
  'const nextMarkers = state.materialExport.guideMarkers.slice()',
  'sanitizeGuideMarkers(nextMarkersSource, nextSegments)',
]) forbidText('store.ts', store, marker);

if (failures.length) {
  console.error('[spectralforge-store-material-export-actions-boundary] FAILED preflight');
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
    paths: { '@/*': ['src/*'] },
    lib: ['ES2022', 'DOM'],
    strict: false,
    skipLibCheck: true,
    esModuleInterop: true,
    noEmitOnError: true,
    rootDir: root,
    outDir: absOutDir,
  },
  include: [
    path.join(root, paritySource),
    path.join(root, materialActionsPath),
    path.join(root, materialHelpersPath),
    path.join(root, storePath),
  ],
};

fs.writeFileSync(path.join(root, tsconfigPath), JSON.stringify(tsconfig, null, 2));
fs.mkdirSync(absOutDir, { recursive: true });
fs.writeFileSync(path.join(absOutDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));
execFileSync('npx', ['tsc', '-p', tsconfigPath], { cwd: root, stdio: 'inherit' });
execFileSync('node', [generatedScenario], { cwd: root, stdio: 'inherit' });

console.log(JSON.stringify({
  ok: true,
  storePath,
  materialActionsPath,
  paritySource,
}));
