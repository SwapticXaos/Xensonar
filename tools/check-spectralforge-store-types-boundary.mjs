#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const typesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const requiredInternalTypeImports = [
  'src/features/l3lab/spectralForge/state/storeToolProfiles.ts',
  'src/features/l3lab/spectralForge/state/storeToolSettingsActions.ts',
  'src/features/l3lab/spectralForge/state/storeForge3MinorActions.ts',
  'src/features/l3lab/spectralForge/state/storeProjectSnapshotActions.ts',
  'src/features/l3lab/spectralForge/state/storeMaterialExportActions.ts',
  'src/features/l3lab/spectralForge/state/storeEmbodimentActions.ts',
  'src/features/l3lab/spectralForge/state/storeCarrierIntegralActions.ts',
  'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Actions.ts',
  'src/features/l3lab/spectralForge/state/storeForge3MainSnapshotActions.ts',
  'src/features/l3lab/spectralForge/state/storeSourcePreviewCommitActions.ts',
  'src/features/l3lab/spectralForge/state/storeForge3MainPathActions.ts',
];

requireFile(storePath);
requireFile(typesPath);
for (const file of requiredInternalTypeImports) requireFile(file);

const store = read(storePath);
const types = read(typesPath);

for (const marker of [
  "import type { AppState } from './storeTypes'",
  "export type {",
  "AppState,",
  "ForgeProjectSnapshot,",
  "MaterialExportConfig,",
  "ToolType,",
  "ViewPort,",
  "WaveformMix,",
  "} from './storeTypes';",
  'export const useStore = create<AppState>',
  'SPECTRAL_WIDTH,',
  'SPECTRAL_HEIGHT,',
  'SAMPLE_RATE,',
  'DURATION,',
  "} from './storeInitialState';",
]) requireText('store.ts', store, marker);

for (const marker of [
  'export type ToolType =',
  'export type SynthMode =',
  'export type FormantVowel =',
  'export interface ViewPort',
  'export interface WaveformMix',
  'export interface ToolSettings',
  'export type ToolProfiles =',
  'export type SourcePreviewMode =',
  'export type Forge3EditTarget =',
  'export interface ForgeProjectSnapshot',
  'export type MaterialRole =',
  'export interface MaterialExportConfig',
  'export interface Forge3MainSnapshot',
  'export interface AppState',
  'spectralData: SpectralData;',
  'applyHarmonizer: (type: HarmonizerType, params?: Record<string, number>) => void;',
]) requireText('storeTypes.ts', types, marker);

for (const marker of [
  'export type ToolType =',
  'export interface ToolSettings',
  'export type ToolProfiles',
  'export interface ForgeProjectSnapshot',
  'export interface MaterialExportConfig',
  'export interface AppState',
  'export type SourcePreviewMode',
  'export type Forge3EditTarget',
  'export interface Forge3MainSnapshot',
]) forbidText('store.ts', store, marker);

for (const file of requiredInternalTypeImports) {
  const content = read(file);
  forbidText(file, content, "from './store'");
}

for (const file of [
  'src/features/l3lab/spectralForge/state/storeToolProfiles.ts',
  'src/features/l3lab/spectralForge/state/storeToolSettingsActions.ts',
  'src/features/l3lab/spectralForge/state/storeForge3MinorActions.ts',
  'src/features/l3lab/spectralForge/state/storeProjectSnapshotActions.ts',
  'src/features/l3lab/spectralForge/state/storeMaterialExportActions.ts',
  'src/features/l3lab/spectralForge/state/storeEmbodimentActions.ts',
  'src/features/l3lab/spectralForge/state/storeCarrierIntegralActions.ts',
  'src/features/l3lab/spectralForge/state/storeCarrierDonorV2Actions.ts',
  'src/features/l3lab/spectralForge/state/storeForge3MainSnapshotActions.ts',
]) {
  requireText(file, read(file), "from './storeTypes'");
}

const storeLines = store.split(/\r?\n/).length;
const typeLines = types.split(/\r?\n/).length;
if (storeLines > 110) failures.push(`store.ts still above post-initial-state assembly-shell threshold: ${storeLines} lines (>110)`);
if (storeLines < 60) failures.push(`store.ts unexpectedly below expected assembly-shell range: ${storeLines} lines (<60)`);
if (typeLines < 250) failures.push(`storeTypes.ts unexpectedly small: ${typeLines} lines (<250)`);

if (failures.length) {
  console.error('[spectralforge-store-types-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  typesPath,
  storeLines,
  typeLines,
  preservedPublicImportPath: '../state/store',
}, null, 2));
