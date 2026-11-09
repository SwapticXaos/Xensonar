#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outArgIndex = process.argv.indexOf('--out');
const outPath = outArgIndex >= 0 ? process.argv[outArgIndex + 1] : 'reports/package-complete-musical-payload-roundtrip.json';
const packageOutArgIndex = process.argv.indexOf('--package-out');
const requestedPackageOutPath = packageOutArgIndex >= 0 ? process.argv[packageOutArgIndex + 1] : 'reports/package-complete-musical-payload-roundtrip.download-package.json';
const tmpDir = path.join(process.cwd(), 'reports', '.tmp-package-roundtrip');
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });
const runnerTs = path.join(tmpDir, 'runner.ts');
const runnerMjs = path.join(tmpDir, 'runner.mjs');
const packageJsonPath = path.join(tmpDir, 'download-package.json');
const packageOutPath = path.resolve(process.cwd(), requestedPackageOutPath);

function reportSpawnFailure(label, result, hint = '') {
  if (result?.error) {
    const message = `[package-roundtrip] ${label} could not start: ${result.error.message}${hint ? `\n${hint}` : ''}\n`;
    process.stderr.write(message);
    return true;
  }
  return false;
}

const runner = String.raw`
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  get length() { return this.store.size; }
  dump() { return Object.fromEntries(this.store.entries()); }
}
const storage = new MemoryStorage();
(globalThis as any).window = {
  localStorage: storage,
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  setTimeout,
  clearTimeout,
  btoa: (value: string) => Buffer.from(value, 'binary').toString('base64'),
  atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
};
(globalThis as any).localStorage = storage;
(globalThis as any).CustomEvent = class CustomEvent { type: string; detail: unknown; constructor(type: string, init?: { detail?: unknown }) { this.type = type; this.detail = init?.detail; } };

const fakeDbs = new Map<string, any>();
function makeRequest(run: () => any) {
  const request: any = { result: undefined, error: null, onsuccess: null, onerror: null };
  queueMicrotask(() => {
    try { request.result = run(); request.onsuccess?.({ target: request }); }
    catch (error) { request.error = error; request.onerror?.({ target: request }); }
  });
  return request;
}
function createFakeDb(name: string) {
  const stores = new Map<string, Map<string, any>>();
  const db: any = {
    name,
    objectStoreNames: { contains: (storeName: string) => stores.has(storeName) },
    createObjectStore: (storeName: string) => { if (!stores.has(storeName)) stores.set(storeName, new Map()); return stores.get(storeName); },
    transaction: (storeName: string) => ({
      objectStore: () => {
        const store = stores.get(storeName) ?? new Map<string, any>();
        stores.set(storeName, store);
        return {
          getAll: () => makeRequest(() => Array.from(store.values()).map((entry) => structuredClone(entry))),
          get: (id: string) => makeRequest(() => store.has(id) ? structuredClone(store.get(id)) : undefined),
          put: (value: any) => makeRequest(() => { store.set(String(value.id), structuredClone(value)); return value.id; }),
          delete: (id: string) => makeRequest(() => { store.delete(id); return undefined; }),
          clear: () => makeRequest(() => { store.clear(); return undefined; }),
        };
      },
    }),
    close: () => undefined,
  };
  return db;
}
(globalThis as any).indexedDB = {
  open: (name: string) => {
    const request: any = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
    queueMicrotask(() => {
      try {
        let db = fakeDbs.get(name);
        const created = !db;
        if (!db) { db = createFakeDb(name); fakeDbs.set(name, db); }
        request.result = db;
        if (created) request.onupgradeneeded?.({ target: request });
        request.onsuccess?.({ target: request });
      } catch (error) { request.error = error; request.onerror?.({ target: request }); }
    });
    return request;
  },
};

const fs = await import('node:fs');
const mode = process.env.PACKAGE_ROUNDTRIP_MODE || 'export';
const packagePath = process.env.PACKAGE_ROUNDTRIP_JSON || 'reports/.tmp-package-roundtrip/download-package.json';

const { saveStoredCustomGridTuning } = await import('../../src/features/xensonar/domain/instrumentData');
const { readGridLibraryMemorySnapshot } = await import('../../src/features/xensonar/domain/gridLibraryMemory');
const { saveBassClipWorkcopy, readBassClipLibraryState, BASS_CLIP_LIBRARY_STORAGE_KEY } = await import('../../src/features/xensonar/groove/bassClipLibrary');
const bassEvents = await import('../../src/features/xensonar/groove/bassPatternEvents');
const { writePersistedRootFollowBank, readPersistedRootFollowBank, ROOT_FOLLOW_BANK_STORAGE_KEY } = await import('../../src/features/xensonar/material/rootFollowBankStorage');
const { ROOT_FOLLOW_LOOP_UI_STORAGE_KEY } = await import('../../src/features/xensonar/rootFollow/rootFollowLoopUiStorage');
const { writeDrumPlaylistState, readDrumPlaylistState } = await import('../../src/features/xensonar/drumPatternPlaylist');
const { registerDrumConfigFromMatrix, listDrumConfigLibraryEntries } = await import('../../src/features/xensonar/drumConfigLibrary');
const { buildStaticDrumPatternMatrix } = await import('../../src/features/xensonar/drumPatternMachine');
const loopDomain = await import('../../src/features/l3lab/canonicalForge/loopDrumDomain');
const projectLibrary = await import('../../src/features/l3lab/canonicalForge/melodicProjectLibrary');
const archiveActions = await import('../../src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions');
const archivePackage = await import('../../src/features/l3lab/canonicalForge/melodicWorkspacePackage');
const { WORKSPACE_PACKAGE_BROWSER_STORAGE_KEYS } = await import('../../src/features/l3lab/canonicalForge/melodicWorkspaceBrowserStoragePackage');
const { saveCustomStamp, getCustomStampLibraryState } = await import('../../src/features/l3lab/spectralForge/customStampLibrary');
const { saveForgeProject, getForgeProjectLibraryState } = await import('../../src/features/l3lab/spectralForge/projectLibrary');
const { persistResidentConstellations, loadResidentConstellations, RESIDENT_CONSTELLATIONS_STORAGE_KEY } = await import('../../src/features/topology/residentConstellations');
const { useStore: useSpectralForgeStore } = await import('../../src/features/l3lab/spectralForge/state/store');
const { registerMaterialExport, getMaterialLibraryState } = await import('../../src/features/l3lab/materialLibrary');
const { saveCanonicalForgeProject, listCanonicalForgeProjectRecords } = await import('../../src/features/l3lab/canonicalForge/projectLibrary');
const { getCanonicalForgeSession, setCanonicalForgeSession } = await import('../../src/features/l3lab/canonicalForge/session');
const { buildCanonicalForgeInitialState } = await import('../../src/features/l3lab/canonicalForge/canonicalForgeInitialState');

const DRUM_PLAYLIST_STORAGE_KEY = 'xensonar-drum-pattern-playlist-v1';
const ENTROPHON_STORAGE_KEY = 'xensonar.entrophonUnifiedSoundConfig.v116';
const ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY = 'xensonar.rootFollow.granular.customSlot.v1';
const GLUECKSRAD_WHEEL_ORDER_KEY = 'xensonar.gluecksrad.wheelOrder.v1';
const getStorageJson = (key: string) => {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
};
const sectionPayloadCount = (raw: any, kind: string, field: string) => {
  const section = Array.isArray(raw.sections) ? raw.sections.find((entry: any) => entry?.kind === kind) : null;
  const payload = section?.payload;
  const value = payload?.[field];
  return Array.isArray(value) ? value.length : -1;
};
const topCount = (raw: any, key: string, field: string) => {
  const value = raw?.[key]?.[field];
  return Array.isArray(value) ? value.length : -1;
};
const floatValues = (value: Float32Array | null | undefined) => value ? Array.from(value) : null;
const floatsEqual = (actual: Float32Array | null | undefined, expected: number[]) =>
  !!actual && actual.length === expected.length && expected.every((value, index) => Math.abs(actual[index] - value) < 1e-6);

const CURRENT_AUDIO_VALUES = [0.11, -0.22, 0.33, -0.44];
const CURRENT_SPECTRAL_VALUES = [0.13, 0.57, 0.91, 0.24, 0.68, 0.42];
const CURRENT_STAMP_VALUES = [0.15, 0.25, 0.75, 0.95];
const SAVED_AUDIO_VALUES = [0.51, -0.42, 0.73, -0.64];
const SAVED_SPECTRAL_VALUES = [0.81, 0.21, 0.61, 0.31, 0.41, 0.71];
const SAVED_STAMP_VALUES = [0.18, 0.38, 0.58, 0.78];

function makeAudioAsset(fileName: string, values: number[]) {
  const monoSamples = new Float32Array(values);
  const leftSamples = new Float32Array(values.map((value) => value * 0.9));
  const rightSamples = new Float32Array(values.map((value) => value * 0.8));
  const midSamples = new Float32Array(values.map((value) => value * 0.7));
  const sideSamples = new Float32Array(values.map((value) => value * 0.2));
  return {
    kind: 'audio' as const,
    fileName,
    projectionReadMode: 'hybrid' as const,
    monoSamples,
    leftSamples,
    rightSamples,
    midSamples,
    sideSamples,
    sampleRate: 48000,
    originalDuration: values.length / 48000,
    channelCount: 2,
    importStartSec: 0,
    importDurationSec: values.length / 48000,
    waveformPreview: new Float32Array(values.map((value) => Math.abs(value))),
    stereoWidthPreview: new Float32Array(values.map((value) => Math.abs(value) * 0.5)),
  };
}

function makeWorkspaceSession(asset: any, spectralValues: number[], stampValues: number[], name: string) {
  const initial = buildCanonicalForgeInitialState({ initialSession: null });
  return {
    materialExport: { ...initial.materialExport, name, guideMarkers: [...initial.materialExport.guideMarkers] },
    rawSourceAsset: asset,
    sourceAsset: asset,
    bundle: null,
    spectralSnapshot: new Float32Array(spectralValues),
    sourceView: initial.sourceView,
    secondaryView: initial.secondaryView,
    viewBlend: initial.viewBlend,
    activeTool: initial.activeTool,
    toolSettings: {
      brushSize: initial.brushSize,
      intensity: initial.intensity,
      hardness: initial.hardness,
      eraseMode: initial.eraseMode,
      morphMode: initial.morphMode,
    },
    synthMode: initial.synthMode,
    waveformMix: { ...initial.waveformMix },
    status: 'Roundtrip workspace state',
    stampPresetId: 'roundtrip-stamp',
    stampData: { width: 2, height: 2, data: new Float32Array(stampValues), grainData: new Float32Array(stampValues.map((value) => value * 0.5)) },
    stampScaleX: initial.stampScaleX,
    stampScaleY: initial.stampScaleY,
    stampRotation: initial.stampRotation,
    stampFlipX: initial.stampFlipX,
    stampFlipY: initial.stampFlipY,
    selectionStartSec: initial.selectionStartSec,
    selectionDurationSec: initial.selectionDurationSec,
    selectionDirty: initial.selectionDirty,
    detailSelectionStartSec: initial.detailSelectionStartSec,
    detailSelectionDurationSec: initial.detailSelectionDurationSec,
    detailSelectionDirty: initial.detailSelectionDirty,
    detailViewportStartSec: initial.detailViewportStartSec,
    detailViewportDurationSec: initial.detailViewportDurationSec,
    detailZoom: initial.detailZoom,
    detailOffset: initial.detailOffset,
    auditionView: initial.auditionView,
    auditionBlendAmount: initial.auditionBlendAmount,
    selectedProjectId: null,
    sourcePreviewMode: initial.sourcePreviewMode,
    activeWorkspace: initial.activeWorkspace,
    logicView: initial.logicView,
    grooveMachine: initial.grooveMachine,
    drumComputer: initial.drumComputer,
    drumViewport: initial.drumViewport,
    loopComposer: initial.loopComposer,
    selectedLoopNoteIds: initial.selectedLoopNoteIds,
    autoZoomOnDenseOverlap: initial.autoZoomOnDenseOverlap,
    lockTrackEditing: initial.lockTrackEditing,
    chordVoicing: initial.chordVoicing,
    chordStrumSteps: initial.chordStrumSteps,
    chordVelocitySlope: initial.chordVelocitySlope,
  } as any;
}

async function seedExportBrowser() {
  saveStoredCustomGridTuning({
    id: 'custom:roundtrip-raster', label: 'Roundtrip Raster', family: 'edo', periodFamily: 'octave', divisionKind: 'custom', steps: 4,
    defaultModePolicy: 'church_projection', hotkeyCycleEligible: true, description: 'Roundtrip proof raster.', periodCents: 1200,
    stepCents: [0, 133.3, 500, 733.3], builtIn: false, updatedAt: Date.now(),
  });
  const bassClip = bassEvents.buildBassPatternPreviewClip({ pattern: 'offbeat', rootHz: 55, seed: 42 });
  const savedBass = saveBassClipWorkcopy(bassClip, 'Roundtrip Bass Pattern');
  writePersistedRootFollowBank({
    schemaVersion: 3,
    memberIds: ['roundtrip-material'],
    orderedIds: ['roundtrip-material'],
    aliases: { 'roundtrip-material': 'Roundtrip Root Follow' },
    entryConfigs: {},
  } as any);
  storage.setItem(ROOT_FOLLOW_LOOP_UI_STORAGE_KEY, JSON.stringify({ active: true, id: 'roundtrip-material', volume: 0.73, timeMode: 'normal' }));
  writeDrumPlaylistState({ orderedIds: ['preset:four_on_floor'], hiddenIds: [], aliases: { 'preset:four_on_floor': 'Roundtrip Drum' } });
  const matrix = buildStaticDrumPatternMatrix('four_on_floor' as any, 1, 16);
  await registerDrumConfigFromMatrix({ name: 'Roundtrip Drum Pattern', drumKit: 'dusty_tape', matrix });
  await saveCustomStamp({
    name: 'Roundtrip SpectralForge Stamp',
    stamp: {
      width: 2,
      height: 2,
      data: new Float32Array([0.1, 0.7, 0.4, 0.2]),
      grainData: new Float32Array([0.2, 0.1, 0.8, 0.5]),
    },
  });
  const spectralSnapshot = useSpectralForgeStore.getState().createProjectSnapshot();
  spectralSnapshot.spectralSnapshot = new Float32Array([0.05, 0.35, 0.9, 0.2, 0.1, 0.6, 0.25, 0.45]);
  spectralSnapshot.materialExport = { ...spectralSnapshot.materialExport, name: 'Roundtrip SpectralForge Project', bpm: 123, bars: 1 };
  await saveForgeProject({ name: 'Roundtrip SpectralForge Project', snapshot: spectralSnapshot });
  storage.setItem('xensonar-particle-sample-profile-mode', 'current_db_v2');
  storage.setItem(ENTROPHON_STORAGE_KEY, JSON.stringify({ surface: 'wave', enabled: true, profile: 'roundtrip-entrophon' }));
  storage.setItem(ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY, JSON.stringify({ id: 'roundtrip-granular-slot', grainSizeMs: 37, density: 0.63 }));
  storage.setItem(GLUECKSRAD_WHEEL_ORDER_KEY, JSON.stringify(['roundtrip-a', 'roundtrip-b', 'roundtrip-c']));

  registerMaterialExport({
    name: 'Roundtrip Material Metadata', role: 'loop', bpm: 123, bars: 1, guideSegments: 16, guideMarkers: [0, 4, 8, 12],
    loopStartSec: 0, loopEndSec: 1, rootHz: 110, sourceVersion: 'roundtrip-322', renderMode: 'roundtrip', durationSec: 1,
    stableId: 'roundtrip-material', rootFollowPreferred: true,
    rootFollowGranularProfile: 'roundtrip-granular-profile',
    spectralGranularBridge: 'roundtrip-spectral-bridge',
    audioPaintImportDetailJson: JSON.stringify({ source: 'roundtrip', slices: 3 }),
    audioIdentityKey: 'roundtrip-audio-identity',
    audioIdentitySource: 'roundtrip-package-proof',
  }, new Blob([new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4])], { type: 'audio/wav' }));

  const currentAsset = makeAudioAsset('roundtrip-current.wav', CURRENT_AUDIO_VALUES);
  const currentSession = makeWorkspaceSession(currentAsset, CURRENT_SPECTRAL_VALUES, CURRENT_STAMP_VALUES, 'Roundtrip Current SyntheticForge Workspace');
  setCanonicalForgeSession(currentSession);

  const savedAsset = makeAudioAsset('roundtrip-saved.wav', SAVED_AUDIO_VALUES);
  const savedSession = makeWorkspaceSession(savedAsset, SAVED_SPECTRAL_VALUES, SAVED_STAMP_VALUES, 'Roundtrip Saved SyntheticForge Workspace');
  const { rawSourceAsset: _savedRaw, bundle: _savedBundle, status: _savedStatus, ...savedSnapshot } = savedSession;
  await saveCanonicalForgeProject({ name: 'Roundtrip Saved SyntheticForge Workspace', snapshot: savedSnapshot as any });

  persistResidentConstellations([{
    id: 'resident-constellation-roundtrip',
    name: 'Roundtrip Resident Konstellation',
    createdAt: Date.now(),
    config: {
      residentsEnabled: true,
      residentSystem: 'ji',
      residentMode: 'chromatic',
      residentSound: 'glass_needle',
      residentVolume: 0.61,
      residentElasticPitch: false,
    },
    nodes: [
      { x: 0.18, y: 0.34, freq: 110, energy: 0, label: 'Sub', ratio: 1, tuningCents: 0, residentId: 'resident-sub', residentSystem: 'ji', residentMode: 'chromatic', residentStepIndex: 0, residentMuted: false, isCustomResident: false },
      { x: 0.72, y: 0.41, freq: 277.18, energy: 0, label: 'Custom 277', ratio: 2.52, tuningCents: 1600, residentId: 'resident-custom-277', residentSystem: 'ji', residentMode: 'chromatic', residentStepIndex: 7, residentMuted: false, isCustomResident: true, customResidentSound: 'glass_needle', customResidentElasticPitch: false },
    ],
  }]);
  return { savedBassId: savedBass.id };
}

if (mode === 'export') {
  const seeded = await seedExportBrowser();
  const loopComposer = loopDomain.createEmptyLoopComposer();
  const patternVariants = projectLibrary.createGeneratedPatternVariantsFromComposer(loopComposer);
  const patternLinks = Object.fromEntries(loopComposer.tracks.map((track: any) => [track.id, { patternA: 'patternA', patternB: 'patternB', patternC: 'patternC' }]));
  const built = await archiveActions.buildMelodicWorkspaceArchiveExport({
    selectedProjectName: 'Roundtrip Probe',
    loopComposer,
    patternVariants,
    patternLinks: patternLinks as any,
    savedMelodicProjects: [],
    melodicSampleEntries: [],
  });
  const json = archivePackage.buildMelodicWorkspaceArchiveBlobParts(built.archive).join('');
  fs.writeFileSync(packagePath, json);
  const raw = JSON.parse(json);
  const browserStorageEntries = raw.browserLocalStorage?.entries ?? [];
  const result = {
    ok: true,
    phase: 'export/download',
    status: built.statusMessage,
    seeded,
    downloadJsonBytes: json.length,
    requiredTopLevelCounts: {
      gridLibrary: topCount(raw, 'gridLibrary', 'customTunings'),
      customRasterPresets: topCount(raw, 'customRasterPresets', 'customTunings'),
      bassClipLibrary: topCount(raw, 'bassClipLibrary', 'clips'),
      bassPatternLibrary: topCount(raw, 'bassPatternLibrary', 'clips'),
      bassPatterns: topCount(raw, 'bassPatterns', 'clips'),
      drumConfigLibrary: topCount(raw, 'drumConfigLibrary', 'entries'),
      spectralForgeProjects: topCount(raw, 'spectralForgeProjects', 'projects'),
      spectralForgeCustomStamps: topCount(raw, 'spectralForgeCustomStamps', 'stamps'),
      syntheticForgeSavedWorkspaces: topCount(raw, 'syntheticForgeSavedWorkspaces', 'projects'),
      residentConstellations: topCount(raw, 'residentConstellations', 'entries'),
      room3ResidentConstellations: topCount(raw, 'room3ResidentConstellations', 'entries'),
    },
    requiredSectionPayloadCounts: {
      gridLibrary: sectionPayloadCount(raw, 'grid-library', 'customTunings'),
      customRasterPresetLibrary: sectionPayloadCount(raw, 'custom-raster-preset-library', 'customTunings'),
      bassClipLibrary: sectionPayloadCount(raw, 'bass-clip-library', 'clips'),
      bassPatternLibrary: sectionPayloadCount(raw, 'bass-pattern-library', 'clips'),
      bassPatterns: sectionPayloadCount(raw, 'bass-patterns', 'clips'),
      drumConfigLibrary: sectionPayloadCount(raw, 'drum-config-library', 'entries'),
      spectralForgeProjects: sectionPayloadCount(raw, 'spectral-forge-project-library', 'projects'),
      spectralForgeCustomStamps: sectionPayloadCount(raw, 'spectral-forge-custom-stamp-library', 'stamps'),
      residentConstellations: sectionPayloadCount(raw, 'resident-constellation-library', 'entries'),
      browserLocalStorage: sectionPayloadCount(raw, 'browser-local-storage', 'entries'),
    },
    browserStorageKeys: browserStorageEntries.map((entry: any) => entry.key),
    browserStorageEntries: browserStorageEntries.length,
    currentSyntheticForgeWorkspacePresent: !!raw.syntheticForgeCurrentWorkspace,
    compactSectionPayloads: {
      savedWorkspacePayloadCount: sectionPayloadCount(raw, 'synthetic-forge-workspace-project-library', 'projects'),
      currentWorkspaceHasInlineSession: (() => {
        const section = Array.isArray(raw.sections) ? raw.sections.find((entry: any) => entry?.kind === 'synthetic-forge-current-workspace') : null;
        return !!section?.payload?.session;
      })(),
    },
  };
  const failures: string[] = [];
  for (const [key, count] of Object.entries(result.requiredTopLevelCounts)) if ((count as number) < 1) failures.push('download top-level missing ' + key + ' count=' + count);
  for (const [key, count] of Object.entries(result.requiredSectionPayloadCounts)) if ((count as number) < 1) failures.push('download section missing ' + key + ' count=' + count);
  for (const descriptor of [BASS_CLIP_LIBRARY_STORAGE_KEY, 'xensonar:grid-tuning-library:v2', ROOT_FOLLOW_BANK_STORAGE_KEY, ROOT_FOLLOW_LOOP_UI_STORAGE_KEY, DRUM_PLAYLIST_STORAGE_KEY, RESIDENT_CONSTELLATIONS_STORAGE_KEY, ENTROPHON_STORAGE_KEY, ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY, GLUECKSRAD_WHEEL_ORDER_KEY]) {
    if (!result.browserStorageKeys.includes(descriptor)) failures.push('download browser storage missing ' + descriptor);
  }
  if (!result.currentSyntheticForgeWorkspacePresent) failures.push('download missing current SyntheticForge workspace');
  if (result.compactSectionPayloads.savedWorkspacePayloadCount !== -1) failures.push('saved SyntheticForge workspaces duplicated into compact manifest payload');
  if (result.compactSectionPayloads.currentWorkspaceHasInlineSession) failures.push('current SyntheticForge workspace duplicated into compact manifest payload');
  if (failures.length) { console.error(JSON.stringify({ ...result, ok: false, failures }, null, 2)); process.exit(1); }
  console.log(JSON.stringify(result, null, 2));
} else if (mode === 'import') {
  const json = fs.readFileSync(packagePath, 'utf8');
  storage.clear();
  const result = await archiveActions.importMelodicWorkspaceArchiveAction({
    file: { text: async () => json } as any,
    mode: 'replace',
    savedMelodicProjects: [],
  });
  const gridSnapshot = readGridLibraryMemorySnapshot();
  const bassState = readBassClipLibraryState();
  const rootBank = readPersistedRootFollowBank();
  const drumPlaylist = readDrumPlaylistState();
  const drumConfigs = await listDrumConfigLibraryEntries();
  const spectralForgeProjects = getForgeProjectLibraryState();
  const spectralForgeStamps = getCustomStampLibraryState();
  const syntheticForgeSavedWorkspaces = await listCanonicalForgeProjectRecords();
  const syntheticForgeCurrentWorkspace = getCanonicalForgeSession();
  const materialEntries = getMaterialLibraryState().entries;
  const roundtripMaterial = materialEntries.find((entry: any) => entry.id === 'roundtrip-material') ?? null;
  const roundtripSavedWorkspace = syntheticForgeSavedWorkspaces.find((entry: any) => entry.name === 'Roundtrip Saved SyntheticForge Workspace') ?? null;
  const imported = {
    ok: true,
    phase: 'upload/import-blank',
    status: result.statusMessage,
    importedCounts: {
      customRasterPresets: gridSnapshot.customTunings.length,
      activeRack: gridSnapshot.activeRack.length,
      bassPatterns: bassState.clips.length,
      bassOrder: bassState.order.length,
      rootFollowMembers: rootBank.memberIds.length,
      drumPlaylistIds: drumPlaylist.orderedIds.length,
      drumConfigs: drumConfigs.length,
      spectralForgeProjects: spectralForgeProjects.entries.length,
      spectralForgeCustomStamps: spectralForgeStamps.entries.length,
      syntheticForgeSavedWorkspaces: syntheticForgeSavedWorkspaces.length,
      materialEntries: materialEntries.length,
      residentConstellations: loadResidentConstellations().length,
    },
    storagePresence: Object.fromEntries(WORKSPACE_PACKAGE_BROWSER_STORAGE_KEYS.map((entry: any) => [entry.key, storage.getItem(entry.key) != null])),
    storageValues: {
      bassClipLibrary: getStorageJson(BASS_CLIP_LIBRARY_STORAGE_KEY),
      gridLibrary: getStorageJson('xensonar:grid-tuning-library:v2'),
      rootFollowBank: getStorageJson(ROOT_FOLLOW_BANK_STORAGE_KEY),
      rootFollowUi: getStorageJson(ROOT_FOLLOW_LOOP_UI_STORAGE_KEY),
      drumPlaylist: getStorageJson(DRUM_PLAYLIST_STORAGE_KEY),
      residentConstellations: getStorageJson(RESIDENT_CONSTELLATIONS_STORAGE_KEY),
      entrophon: getStorageJson(ENTROPHON_STORAGE_KEY),
      rootFollowGranularCustomSlot: getStorageJson(ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY),
      gluecksradWheelOrder: getStorageJson(GLUECKSRAD_WHEEL_ORDER_KEY),
    },
    syntheticForgeWorkspaceProof: {
      currentAudio: floatValues(syntheticForgeCurrentWorkspace?.sourceAsset?.monoSamples),
      currentSpectral: floatValues(syntheticForgeCurrentWorkspace?.spectralSnapshot),
      currentStamp: floatValues(syntheticForgeCurrentWorkspace?.stampData?.data),
      currentRawAndSelectionShareBacking: !!syntheticForgeCurrentWorkspace?.rawSourceAsset && !!syntheticForgeCurrentWorkspace?.sourceAsset && syntheticForgeCurrentWorkspace.rawSourceAsset.monoSamples === syntheticForgeCurrentWorkspace.sourceAsset.monoSamples,
      savedAudio: floatValues(roundtripSavedWorkspace?.snapshot?.sourceAsset?.monoSamples),
      savedSpectral: floatValues(roundtripSavedWorkspace?.snapshot?.spectralSnapshot),
      savedStamp: floatValues(roundtripSavedWorkspace?.snapshot?.stampData?.data),
    },
    materialMetadataProof: roundtripMaterial ? {
      rootFollowGranularProfile: roundtripMaterial.rootFollowGranularProfile,
      spectralGranularBridge: roundtripMaterial.spectralGranularBridge,
      audioPaintImportDetailJson: roundtripMaterial.audioPaintImportDetailJson,
      audioIdentityKey: roundtripMaterial.audioIdentityKey,
      audioIdentitySource: roundtripMaterial.audioIdentitySource,
    } : null,
  };
  const failures: string[] = [];
  for (const [key, count] of Object.entries(imported.importedCounts)) {
    if ((count as number) < 1) failures.push('blank import missing ' + key + ' count=' + count);
  }
  for (const key of [BASS_CLIP_LIBRARY_STORAGE_KEY, 'xensonar:grid-tuning-library:v2', ROOT_FOLLOW_BANK_STORAGE_KEY, ROOT_FOLLOW_LOOP_UI_STORAGE_KEY, DRUM_PLAYLIST_STORAGE_KEY, RESIDENT_CONSTELLATIONS_STORAGE_KEY, ENTROPHON_STORAGE_KEY, ROOT_FOLLOW_GRANULAR_CUSTOM_SLOT_KEY, GLUECKSRAD_WHEEL_ORDER_KEY]) {
    if (!imported.storagePresence[key]) failures.push('blank import storage missing ' + key);
  }
  if (!floatsEqual(syntheticForgeCurrentWorkspace?.sourceAsset?.monoSamples, CURRENT_AUDIO_VALUES)) failures.push('current SyntheticForge workspace audio Float32 mismatch');
  if (!floatsEqual(syntheticForgeCurrentWorkspace?.spectralSnapshot, CURRENT_SPECTRAL_VALUES)) failures.push('current SyntheticForge workspace spectral Float32 mismatch');
  if (!floatsEqual(syntheticForgeCurrentWorkspace?.stampData?.data, CURRENT_STAMP_VALUES)) failures.push('current SyntheticForge workspace stamp Float32 mismatch');
  if (!imported.syntheticForgeWorkspaceProof.currentRawAndSelectionShareBacking) failures.push('current SpectralForge raw/selection audio dedup backing not restored');
  if (!floatsEqual(roundtripSavedWorkspace?.snapshot?.sourceAsset?.monoSamples, SAVED_AUDIO_VALUES)) failures.push('saved SyntheticForge workspace audio Float32 mismatch');
  if (!floatsEqual(roundtripSavedWorkspace?.snapshot?.spectralSnapshot, SAVED_SPECTRAL_VALUES)) failures.push('saved SyntheticForge workspace spectral Float32 mismatch');
  if (!floatsEqual(roundtripSavedWorkspace?.snapshot?.stampData?.data, SAVED_STAMP_VALUES)) failures.push('saved SyntheticForge workspace stamp Float32 mismatch');
  if (!roundtripMaterial) failures.push('roundtrip material missing after blank import');
  else {
    if (roundtripMaterial.rootFollowGranularProfile !== 'roundtrip-granular-profile') failures.push('material rootFollowGranularProfile lost');
    if (roundtripMaterial.spectralGranularBridge !== 'roundtrip-spectral-bridge') failures.push('material spectralGranularBridge lost');
    if (roundtripMaterial.audioPaintImportDetailJson !== JSON.stringify({ source: 'roundtrip', slices: 3 })) failures.push('material audioPaintImportDetailJson lost');
    if (roundtripMaterial.audioIdentityKey !== 'roundtrip-audio-identity') failures.push('material audioIdentityKey lost');
    if (roundtripMaterial.audioIdentitySource !== 'roundtrip-package-proof') failures.push('material audioIdentitySource lost');
  }
  if (failures.length) { console.error(JSON.stringify({ ...imported, ok: false, failures }, null, 2)); process.exit(1); }
  console.log(JSON.stringify(imported, null, 2));
} else {
  throw new Error('Unknown PACKAGE_ROUNDTRIP_MODE ' + mode);
}
`;

fs.writeFileSync(runnerTs, runner);
const esbuildBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
const build = spawnSync(esbuildBin, [runnerTs, '--bundle', '--platform=node', '--format=esm', `--outfile=${runnerMjs}`], { cwd: process.cwd(), encoding: 'utf8' });
if (reportSpawnFailure('missing esbuild bundler', build, `missing esbuild at ${esbuildBin}; run npm run patch:setup before the roundtrip proof`)) {
  process.exit(127);
}
if (build.status !== 0) {
  process.stderr.write(build.stdout || '');
  process.stderr.write(build.stderr || '');
  process.exit(build.status ?? 1);
}
const runPhase = (phase) => spawnSync(process.execPath, [runnerMjs], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, PACKAGE_ROUNDTRIP_MODE: phase, PACKAGE_ROUNDTRIP_JSON: packageJsonPath },
});
const exportRun = runPhase('export');
if (reportSpawnFailure('roundtrip export runner', exportRun)) process.exit(127);
if (exportRun.status !== 0) {
  process.stderr.write(exportRun.stdout || '');
  process.stderr.write(exportRun.stderr || '');
  process.exit(exportRun.status ?? 1);
}
const importRun = runPhase('import');
if (reportSpawnFailure('roundtrip import runner', importRun)) process.exit(127);
if (importRun.status !== 0) {
  process.stderr.write(importRun.stdout || '');
  process.stderr.write(importRun.stderr || '');
  process.exit(importRun.status ?? 1);
}
const report = {
  ok: true,
  packageJsonPath,
  export: JSON.parse(exportRun.stdout),
  importBlank: JSON.parse(importRun.stdout),
};
fs.mkdirSync(path.dirname(packageOutPath), { recursive: true });
fs.copyFileSync(packageJsonPath, packageOutPath);
report.packageJsonProofPath = path.relative(process.cwd(), packageOutPath);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
