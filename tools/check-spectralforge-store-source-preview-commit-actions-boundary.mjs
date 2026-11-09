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
const actionsPath = 'src/features/l3lab/spectralForge/state/storeSourcePreviewCommitActions.ts';
const initialStatePath = 'src/features/l3lab/spectralForge/state/storeInitialState.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const paritySource = 'tools/spectralforge-store-source-preview-commit-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-store-source-preview-commit-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-store-source-preview-commit-parity.js');

for (const file of [storePath, actionsPath, initialStatePath, storeTypesPath, paritySource, 'src/features/l3lab/spectralForge/audio/AudioImporterTypes.ts', 'src/features/l3lab/spectralForge/model/forge3Layers.ts']) requireFile(file);

const store = read(storePath);
const actions = read(actionsPath);
const initialState = read(initialStatePath);
const storeTypes = read(storeTypesPath);
const parity = read(paritySource);

for (const marker of [
  "from './storeSourcePreviewCommitActions'",
  '...createSourcePreviewCommitStoreActions(set)',
]) requireText('store.ts', store, marker);


for (const marker of [
  '...createInitialSourcePreviewCommitState()',
]) requireText('storeInitialState.ts', initialState, marker);

for (const marker of [
  'sourceAsset: AudioSourceAsset | null',
  'sourceAssetContext: SourceAssetContext',
  'sourcePreviewMode: SourcePreviewMode',
  'lastCommitDomain: CommitDomain',
  'forge3EditTarget: Forge3EditTarget',
  'export type SourcePreviewMode',
  'export type Forge3EditTarget',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const marker of [
  "import type { Forge3EditTarget, SourcePreviewMode } from './storeTypes';",
  'export type SourcePreviewCommitState',
  'export function createInitialSourcePreviewCommitState',
  'export function setSourceAssetState',
  'asset ? (context ?? \'forge3_main\') : \'none\'',
  "sourcePreviewMode: asset ? state.sourcePreviewMode : 'forge'",
  'export function setSourcePreviewModeState',
  'export function setLastCommitDomainState',
  'export function setForge3EditTargetState',
  'export function createSourcePreviewCommitStoreActions',
]) requireText('storeSourcePreviewCommitActions.ts', actions, marker);

for (const marker of [
  'setSourceAsset keeps existing preview mode for non-null asset',
  'setSourceAsset null clears context and forces forge preview',
  'setLastCommitDomain only changes commit domain',
  'setForge3EditTarget only changes edit target',
  'store action setSourceAsset matches old inline update',
  'checkedScenarios: checked.length',
]) requireText('source-preview parity source', parity, marker);

for (const marker of [
  "sourceAssetContext: 'none',",
  'setSourceAsset: (asset, context) => set({',
  'sourceAssetContext: asset ? (context ?? \'forge3_main\') : \'none\'',
  "sourcePreviewMode: asset ? get().sourcePreviewMode : 'forge'",
  "sourcePreviewMode: 'forge',",
  'setSourcePreviewMode: (mode) => set({ sourcePreviewMode: mode })',
  "lastCommitDomain: 'none',",
  'setLastCommitDomain: (domain) => set({ lastCommitDomain: domain })',
  "forge3EditTarget: 'linked_body',",
  'setForge3EditTarget: (target) => set({ forge3EditTarget: target })',
]) forbidText('store.ts', store, marker);

if (failures.length) {
  console.error('[spectralforge-store-source-preview-commit-actions-boundary] FAILED preflight');
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
    path.join(root, actionsPath),
    path.join(root, 'src/features/l3lab/spectralForge/audio/AudioImporterTypes.ts'),
    path.join(root, 'src/features/l3lab/spectralForge/model/forge3Layers.ts'),
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
  console.error('[spectralforge-store-source-preview-commit-actions-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 13) {
    console.error('[spectralforge-store-source-preview-commit-actions-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    actionsPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Source-aware preview / commit context boundary preserves source asset, source preview mode, commit domain, and edit-target contracts.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-store-source-preview-commit-actions-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
