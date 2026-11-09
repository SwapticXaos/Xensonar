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
const actionsPath = 'src/features/l3lab/spectralForge/state/storeForge3MinorActions.ts';
const initialStatePath = 'src/features/l3lab/spectralForge/state/storeInitialState.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const paritySource = 'tools/spectralforge-store-minor-actions-parity.ts';
const outRoot = '.xensonar-checks/spectralforge-store-minor-actions-parity';
const outDir = path.join(outRoot, 'out');
const absOutDir = path.join(root, outDir);
const tsconfigPath = path.join(outRoot, 'tsconfig.json');
const generatedScenario = path.join(outDir, 'tools/spectralforge-store-minor-actions-parity.js');

for (const file of [storePath, actionsPath, initialStatePath, storeTypesPath, paritySource, 'src/features/l3lab/spectralForge/utils/colorMap.ts']) requireFile(file);

const store = read(storePath);
const actions = read(actionsPath);
const initialState = read(initialStatePath);
const storeTypes = read(storeTypesPath);
const parity = read(paritySource);

for (const marker of [
  "from './storeForge3MinorActions'",
  '...createForge3MinorStoreActions(set)',
]) requireText('store.ts', store, marker);


for (const marker of [
  '...createInitialForge3MinorState()',
]) requireText('storeInitialState.ts', initialState, marker);

for (const marker of [
  'viewPort: ViewPort',
  'setViewPort: (vp: Partial<ViewPort>) => void',
  'isPlaying: boolean',
  'setIsPlaying: (playing: boolean) => void',
  'renderVersion: number',
  'triggerRender: () => void',
  'lineStart: { x: number; y: number } | null',
  'setAudioBufferDirty: (dirty: boolean) => void',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const marker of [
  'export type Forge3MinorState',
  'export type Forge3MinorStoreActions',
  'export function createInitialForge3MinorState',
  'viewPort: {',
  "synthMode: 'additive'",
  "colorMapName: 'magma'",
  'export function setViewPortState',
  'viewPort: { ...state.viewPort, ...vp }',
  'export function setWaveformMixState',
  'audioBufferDirty: true',
  'export function setRenderColorMapState',
  'renderVersion: state.renderVersion + 1',
  'export function setShowGrainLayerState',
  'export function setLogScaleState',
  'export function triggerRenderState',
  'export function createForge3MinorStoreActions',
]) requireText('storeForge3MinorActions.ts', actions, marker);

for (const marker of [
  'initial minor state matches previous inline defaults',
  'setViewPort partial merge keeps untouched viewport axes',
  'setWaveformMix partial merge marks audio buffer dirty',
  'setColorMapName increments renderVersion',
  'setShowGrainLayer increments renderVersion',
  'setLogScale increments renderVersion',
  'triggerRender increments renderVersion only',
  'store action setWaveformMix matches old inline dirty behavior',
  'checkedScenarios: checked.length',
]) requireText('minor parity source', parity, marker);

for (const marker of [
  'viewPort: {\n    offsetX: 0,',
  'setViewPort: (vp) =>',
  'isPlaying: false,',
  'playheadPosition: 0,',
  'showPlayheadMarker: false,',
  'setIsPlaying: (playing) => set({ isPlaying: playing })',
  'setPlayheadPosition: (pos) => set({ playheadPosition: pos })',
  'setShowPlayheadMarker: (show) => set({ showPlayheadMarker: show })',
  "synthMode: 'additive',",
  'setSynthMode: (mode) => set({ synthMode: mode })',
  'waveformMix: {\n    sine: 1,',
  'setWaveformMix: (mix) =>',
  "colorMapName: 'magma',",
  'setColorMapName: (name) => set({ colorMapName: name, renderVersion: get().renderVersion + 1 })',
  'showGrainLayer: false,',
  'setShowGrainLayer: (show) => set({ showGrainLayer: show, renderVersion: get().renderVersion + 1 })',
  'logScale: true,',
  'setLogScale: (log) => set({ logScale: log, renderVersion: get().renderVersion + 1 })',
  'triggerRender: () => set((s) => ({ renderVersion: s.renderVersion + 1 }))',
  'lineStart: null,',
  'setLineStart: (pos) => set({ lineStart: pos })',
  'audioBufferDirty: false,',
  'setAudioBufferDirty: (dirty) => set({ audioBufferDirty: dirty })',
]) forbidText('store.ts', store, marker);

const storeLines = store.split(/\r?\n/).length;
if (storeLines > 110) failures.push(`store.ts grew beyond post-initial-state-boundary threshold while minor actions are extracted: ${storeLines} lines (>110)`);
if (storeLines < 60) failures.push(`store.ts unexpectedly below assembly-shell range after initial-state split: ${storeLines} lines (<60)`);

if (failures.length) {
  console.error('[spectralforge-store-minor-actions-boundary] FAILED preflight');
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
    path.join(root, storePath),
    path.join(root, 'src/features/l3lab/spectralForge/utils/colorMap.ts'),
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
  console.error('[spectralforge-store-minor-actions-boundary] FAILED compile');
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
    console.error('[spectralforge-store-minor-actions-boundary] FAILED parity coverage');
    console.error(output);
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: true,
    actionsPath,
    paritySource,
    storeLines,
    checkedScenarios: parsed.checkedScenarios,
    message: 'Minor view/playback/render/line/audio-dirty store actions preserve previous setter contracts.',
  }, null, 2));
} catch (error) {
  console.error('[spectralforge-store-minor-actions-boundary] FAILED runtime');
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  if (!error.stdout && !error.stderr) console.error(error.message || error);
  process.exit(1);
}
