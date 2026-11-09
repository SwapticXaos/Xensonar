#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
const requireFile = (file) => {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
};
const requireContains = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const requireAll = (label, content, needles) => {
  for (const needle of needles) requireContains(label, content, needle);
};

const files = {
  pkg: 'package.json',
  archiveActions: 'src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions.ts',
  archivePackage: 'src/features/l3lab/canonicalForge/melodicWorkspacePackage.ts',
  archiveCodec: 'src/features/l3lab/canonicalForge/melodicWorkspaceArchiveCodec.ts',
  archiveTypes: 'src/features/l3lab/canonicalForge/melodicWorkspaceArchiveTypes.ts',
  archiveManifest: 'src/features/l3lab/canonicalForge/melodicWorkspaceArchiveManifest.ts',
  gridMemory: 'src/features/xensonar/domain/gridLibraryMemory.ts',
  gridPackage: 'src/features/xensonar/domain/gridLibraryPackage.ts',
  bassPackage: 'src/features/xensonar/groove/bassClipLibraryPackage.ts',
  drumLibrary: 'src/features/xensonar/drumConfigLibrary.ts',
  forgeProjectLibrary: 'src/features/l3lab/spectralForge/projectLibrary.ts',
  customStampLibrary: 'src/features/l3lab/spectralForge/customStampLibrary.ts',
  spectralWorkspacePackage: 'src/features/l3lab/canonicalForge/syntheticForgeWorkspacePackage.ts',
  materialPackage: 'src/features/l3lab/materialLibraryPackage.ts',
  materialArchiveActions: 'src/features/l3lab/materialLibraryArchiveActions.ts',
  browserStorage: 'src/features/l3lab/canonicalForge/melodicWorkspaceBrowserStoragePackage.ts',
  residentConstellations: 'src/features/topology/residentConstellations.ts',
  roundtrip: 'tools/prove-package-complete-musical-payload-roundtrip.mjs',
  ledger: 'src/core/systemMemory/packageImportLedger.ts',
  suite: 'tools/run-xensonar-refactor-sanity-suite.mjs',
  gateManifest: 'tools/current-line-gate-manifest.mjs',
};
for (const file of Object.values(files)) requireFile(file);

const pkg = fs.existsSync(files.pkg) ? JSON.parse(read(files.pkg)) : { scripts: {} };
const archiveActions = fs.existsSync(files.archiveActions) ? read(files.archiveActions) : '';
const archivePackage = fs.existsSync(files.archivePackage) ? read(files.archivePackage) : '';
const archiveCodec = fs.existsSync(files.archiveCodec) ? read(files.archiveCodec) : '';
const archiveTypes = fs.existsSync(files.archiveTypes) ? read(files.archiveTypes) : '';
const archiveManifest = fs.existsSync(files.archiveManifest) ? read(files.archiveManifest) : '';
const gridMemory = fs.existsSync(files.gridMemory) ? read(files.gridMemory) : '';
const gridPackage = fs.existsSync(files.gridPackage) ? read(files.gridPackage) : '';
const bassPackage = fs.existsSync(files.bassPackage) ? read(files.bassPackage) : '';
const drumLibrary = fs.existsSync(files.drumLibrary) ? read(files.drumLibrary) : '';
const forgeProjectLibrary = fs.existsSync(files.forgeProjectLibrary) ? read(files.forgeProjectLibrary) : '';
const customStampLibrary = fs.existsSync(files.customStampLibrary) ? read(files.customStampLibrary) : '';
const spectralWorkspacePackage = fs.existsSync(files.spectralWorkspacePackage) ? read(files.spectralWorkspacePackage) : '';
const materialPackage = fs.existsSync(files.materialPackage) ? read(files.materialPackage) : '';
const materialArchiveActions = fs.existsSync(files.materialArchiveActions) ? read(files.materialArchiveActions) : '';
const browserStorage = fs.existsSync(files.browserStorage) ? read(files.browserStorage) : '';
const residentConstellations = fs.existsSync(files.residentConstellations) ? read(files.residentConstellations) : '';
const roundtrip = fs.existsSync(files.roundtrip) ? read(files.roundtrip) : '';
const ledger = fs.existsSync(files.ledger) ? read(files.ledger) : '';
const suite = fs.existsSync(files.suite) ? read(files.suite) : '';
const gateManifest = fs.existsSync(files.gateManifest) ? read(files.gateManifest) : '';

requireContains('package.json scripts', JSON.stringify(pkg.scripts || {}), 'xensonar:check-package-complete-musical-payload-contract');
requireContains('package.json scripts', JSON.stringify(pkg.scripts || {}), 'xensonar:prove-package-complete-musical-payload-roundtrip');

requireAll('workspace package sections/top-level payloads', archivePackage + archiveCodec + archiveTypes + archiveManifest, [
  'grid-library',
  'custom-raster-preset-library',
  'custom-raster-presets',
  'customRasterPresets',
  'customRasterPresetLibrary',
  'customRasterPresetLibraryV1',
  'material-library',
  'root-follow-bank',
  'bass-clip-library',
  'bass-pattern-library',
  'bass-patterns',
  'bassPatternLibrary',
  'bassPatterns',
  'bassPatternLibraryV1',
  'drum-config-library',
  'spectral-forge-project-library',
  'spectral-forge-custom-stamp-library',
  'synthetic-forge-workspace-project-library',
  'synthetic-forge-current-workspace',
  'syntheticForgeSavedWorkspaces',
  'syntheticForgeCurrentWorkspace',
  'resident-constellation-library',
  'residentConstellations',
  'room3ResidentConstellations',
  'browser-local-storage',
  'browserLocalStorage',
  'parseMelodicWorkspaceArchive',
  'buildMelodicWorkspaceArchiveBlobParts',
  'WORKSPACE_ARCHIVE_COMPACT_SECTION_PAYLOAD_KINDS',
]);

requireAll('workspace archive export/import actions', archiveActions, [
  'readGridLibraryMemorySnapshot',
  'applyGridLibraryArchivePayload',
  'exportBassClipLibraryArchivePayload',
  'applyBassClipLibraryArchivePayload',
  'exportDrumConfigLibraryArchivePayload',
  'applyDrumConfigLibraryArchivePayload',
  'exportForgeProjectLibraryArchivePayload',
  'applyForgeProjectLibraryArchivePayload',
  'exportCustomStampLibraryArchivePayload',
  'applyCustomStampLibraryArchivePayload',
  'exportResidentConstellationArchivePayload',
  'applyResidentConstellationArchivePayload',
  'Raum-III-Konstellationen',
  'Custom-Raster-Presets',
  'Bass-Patterns/Bassläufe',
  'Drum-Patterns',
  'SpectralForge-Projekte',
  'SpectralForge-Stempel',
  'gespeicherte SyntheticForge-Arbeitsstände',
  'offener SyntheticForge-Arbeitsstand',
  'encodeSyntheticForgeCurrentWorkspaceForPackage',
  'decodeSyntheticForgeCurrentWorkspaceFromPackage',
  'listSyntheticForgeProjectRecords',
  'applySyntheticForgeProjectRecordsFromPackage',
  'Browser-Speicher-Einträge',
]);

requireAll('grid memory/package', gridMemory + gridPackage, [
  'readStoredCustomGridTunings',
  'replaceStoredCustomGridTunings',
  'customTunings',
  'activeRack',
  'buildGridLibraryArchivePayload',
  'parseGridLibraryArchivePayload',
]);


requireAll('browser storage mirror', browserStorage, [
  'WORKSPACE_PACKAGE_BROWSER_STORAGE_KEYS',
  'exportWorkspaceBrowserStorageArchivePayload',
  'applyWorkspaceBrowserStorageArchivePayload',
  'xensonar-bass-clip-library-v1',
  'xensonar:grid-tuning-library:v2',
  'xensonar-drum-pattern-playlist-v1',
  'xensonar.resident.constellations.v1',
  'xensonar.entrophonUnifiedSoundConfig.v116',
  'xensonar.rootFollow.granular.customSlot.v1',
  'xensonar.gluecksrad.wheelOrder.v1',
]);


requireAll('resident constellation package', residentConstellations, [
  'RESIDENT_CONSTELLATIONS_STORAGE_KEY',
  'exportResidentConstellationArchivePayload',
  'parseResidentConstellationArchivePayload',
  'applyResidentConstellationArchivePayload',
  'customResidentSound',
  'customResidentElasticPitch',
]);

requireAll('bass pattern package', bassPackage, [
  'exportBassClipLibraryArchivePayload',
  'applyBassClipLibraryArchivePayload',
  'clips',
  'order',
]);

requireAll('drum package', drumLibrary, [
  'exportDrumConfigLibraryArchivePayload',
  'applyDrumConfigLibraryArchivePayload',
  'playlist: readDrumPlaylistState()',
]);

requireAll('spectral forge projects package', forgeProjectLibrary, [
  'exportForgeProjectLibraryArchivePayload',
  'applyForgeProjectLibraryArchivePayload',
  'spectralSnapshotBase64Parts',
  'arrayBufferToBase64Chunks',
]);

requireAll('spectral forge custom stamps package', customStampLibrary, [
  'exportCustomStampLibraryArchivePayload',
  'applyCustomStampLibraryArchivePayload',
  'data: CustomStampArchiveArray',
  'grainData: CustomStampArchiveArray',
  'arrayBufferToBase64Chunks',
]);

requireAll('SyntheticForge workspace package', spectralWorkspacePackage, [
  "encoding: 'f32-base64-v1'",
  'encodeSyntheticForgeCurrentWorkspaceForPackage',
  'decodeSyntheticForgeCurrentWorkspaceFromPackage',
  'encodeSyntheticForgeSavedWorkspaceProject',
  'decodeSyntheticForgeSavedWorkspaceProject',
  "mode: 'shared-raw'",
  'audioBackingShared',
]);

requireAll('material metadata package roundtrip', materialPackage + materialArchiveActions, [
  'rootFollowGranularProfile',
  'spectralGranularBridge',
  'audioPaintImportDetailJson',
  'audioIdentityKey',
  'audioIdentitySource',
]);

requireAll('import ledger', ledger, [
  'grid',
  'bassClips',
  'drumConfigs',
  'spectralForgeProjects',
  'spectralForgeCustomStamps',
  'syntheticForgeSavedWorkspaces',
  'syntheticForgeCurrentWorkspace',
  'residentConstellations',
  'Raum-III-Konstellationen',
  'Bass-Patterns/Bassläufe',
  'Raster',
]);

requireAll('roundtrip proof harness', roundtrip, [
  'buildMelodicWorkspaceArchiveBlobParts',
  'importMelodicWorkspaceArchiveAction',
  'upload/import-blank',
  'download top-level missing',
  'blank import missing',
  'customRasterPresetLibrary',
  'bassPatterns',
  'residentConstellations',
  'room3ResidentConstellations',
  'requiredSectionPayloadCounts',
  'syntheticForgeSavedWorkspaces',
  'currentSyntheticForgeWorkspacePresent',
  'current SyntheticForge workspace audio Float32 mismatch',
  'saved SyntheticForge workspace audio Float32 mismatch',
  'material rootFollowGranularProfile lost',
  'currentRawAndSelectionShareBacking',
]);

requireContains('refactor sanity suite', suite, 'CURRENT_LINE_GATE_SCRIPTS');
requireContains('current-line gate manifest', gateManifest, 'xensonar:check-package-complete-musical-payload-contract');
requireContains('current-line gate manifest', gateManifest, 'xensonar:prove-package-complete-musical-payload-roundtrip');

if (failures.length) {
  console.error('[package-complete-musical-payload-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  sections: [
    'grid-library',
    'custom-raster-preset-library',
    'custom-raster-presets',
    'material-library',
    'root-follow-bank',
    'bass-clip-library',
    'bass-pattern-library',
    'bass-patterns',
    'drum-config-library',
    'spectral-forge-project-library',
    'spectral-forge-custom-stamp-library',
    'synthetic-forge-workspace-project-library',
    'synthetic-forge-current-workspace',
    'resident-constellation-library',
    'browser-local-storage',
  ],
  topLevelPayloads: [
    'gridLibrary',
    'customRasterPresets',
    'customRasterPresetLibrary',
    'customRasterPresetLibraryV1',
    'materialLibrary',
    'rootFollowBank',
    'bassClipLibrary',
    'bassPatternLibrary',
    'bassPatterns',
    'bassPatternLibraryV1',
    'drumConfigLibrary',
    'spectralForgeProjects',
    'spectralForgeCustomStamps',
    'syntheticForgeSavedWorkspaces',
    'syntheticForgeCurrentWorkspace',
    'residentConstellations',
    'room3ResidentConstellations',
    'browserLocalStorage',
  ],
}, null, 2));
