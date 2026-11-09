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
const mainPathActionsPath = 'src/features/l3lab/spectralForge/state/storeForge3MainPathActions.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const paritySource = 'tools/spectralforge-store-main-path-parity.ts';
const bodyFieldPath = 'src/features/l3lab/forge3/bodyField.ts';
const outRoot = '.xensonar-checks/spectralforge-store-main-path-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-store-main-path-parity.js');

for (const file of [storePath, mainPathActionsPath, storeTypesPath, paritySource, bodyFieldPath, 'src/features/l3lab/spectralForge/audio/SpectralData.ts']) requireFile(file);

const store = read(storePath);
const mainPathActions = read(mainPathActionsPath);
const storeTypes = read(storeTypesPath);
const parity = read(paritySource);

for (const marker of [
  "from './storeForge3MainPathActions'",
  '...createForge3MainPathStoreActions(set, get)',
]) requireText('store.ts', store, marker);

for (const marker of [
  'clearCanvas: () => void',
  'resetForgeMainPath: () => void',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const marker of [
  'export type Forge3MainPathHostState',
  'export function clearForge3MainCanvas',
  'export function resetForge3MainPathState',
  'export function createForge3MainPathStoreActions',
  'get().pushUndo()',
  'state.spectralData.clear()',
  'getForge3BodyField().clear()',
  "sourceAssetContext: 'none'",
  "sourcePreviewMode: 'forge'",
  "lastCommitDomain: 'none'",
  'audioBufferDirty: true',
]) requireText('storeForge3MainPathActions.ts', mainPathActions, marker);

for (const marker of [
  'runClearCanvasScenario',
  'runResetForgeMainPathScenario',
  'clearCanvas should preserve sourceAsset',
  'resetForgeMainPath should clear sourceAsset',
  'checkedScenarios: 2',
]) requireText('main-path parity source', parity, marker);

for (const marker of [
  "import { getForge3BodyField } from '../../forge3/bodyField'",
  'getForge3BodyField().clear()',
  'const { spectralData } = get();',
]) forbidText('store.ts', store, marker);

if (failures.length) {
  console.error('[spectralforge-store-main-path-actions-boundary] FAILED preflight');
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
    path.join(root, mainPathActionsPath),
    path.join(root, bodyFieldPath),
    path.join(root, 'src/features/l3lab/spectralForge/audio/SpectralData.ts'),
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
  console.error('[spectralforge-store-main-path-actions-boundary] FAILED compile');
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
  if (!parsed.ok || parsed.checkedScenarios !== 2) {
    console.error('[spectralforge-store-main-path-actions-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    mainPathActionsPath,
    paritySource,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Clear/reset Forge main path boundary preserves the old undo/body/source-context contracts.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-store-main-path-actions-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
