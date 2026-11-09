#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
const requireContains = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const requireFile = (file) => {
  if (!fs.existsSync(file)) failures.push(`missing ${file}`);
};

const files = {
  pkg: 'package.json',
  archiveActions: 'src/features/l3lab/canonicalForge/melodicWorkspaceArchiveActions.ts',
  archivePackage: 'src/features/l3lab/canonicalForge/melodicWorkspacePackage.ts',
  archiveCodec: 'src/features/l3lab/canonicalForge/melodicWorkspaceArchiveCodec.ts',
  archiveTypes: 'src/features/l3lab/canonicalForge/melodicWorkspaceArchiveTypes.ts',
  drumLibrary: 'src/features/xensonar/drumConfigLibrary.ts',
  forgeProjectLibrary: 'src/features/l3lab/spectralForge/projectLibrary.ts',
  customStampLibrary: 'src/features/l3lab/spectralForge/customStampLibrary.ts',
  ledger: 'src/core/systemMemory/packageImportLedger.ts',
};
for (const file of Object.values(files)) requireFile(file);

const archiveActions = fs.existsSync(files.archiveActions) ? read(files.archiveActions) : '';
const archivePackage = fs.existsSync(files.archivePackage) ? read(files.archivePackage) : '';
const archiveCodec = fs.existsSync(files.archiveCodec) ? read(files.archiveCodec) : '';
const archiveTypes = fs.existsSync(files.archiveTypes) ? read(files.archiveTypes) : '';
const archivePackageImplementation = archivePackage + archiveCodec + archiveTypes;
const drumLibrary = fs.existsSync(files.drumLibrary) ? read(files.drumLibrary) : '';
const forgeProjectLibrary = fs.existsSync(files.forgeProjectLibrary) ? read(files.forgeProjectLibrary) : '';
const customStampLibrary = fs.existsSync(files.customStampLibrary) ? read(files.customStampLibrary) : '';
const ledger = fs.existsSync(files.ledger) ? read(files.ledger) : '';
const pkg = fs.existsSync(files.pkg) ? JSON.parse(read(files.pkg)) : { scripts: {} };

requireContains('package.json scripts', JSON.stringify(pkg.scripts || {}), 'xensonar:check-package-drum-spectralforge-payload-contract');

for (const marker of [
  'exportDrumConfigLibraryArchivePayload',
  'applyDrumConfigLibraryArchivePayload',
  'drumConfigLibrary',
  'Drum-Pattern',
]) {
  requireContains('workspace archive actions', archiveActions, marker);
}

for (const marker of [
  'exportForgeProjectLibraryArchivePayload',
  'applyForgeProjectLibraryArchivePayload',
  'spectralForgeProjects',
  'SpectralForge-Projekt',
]) {
  requireContains('workspace archive actions', archiveActions, marker);
}

for (const marker of [
  'exportCustomStampLibraryArchivePayload',
  'applyCustomStampLibraryArchivePayload',
  'spectralForgeCustomStamps',
  'SpectralForge-Stempel',
]) {
  requireContains('workspace archive actions', archiveActions, marker);
}

for (const marker of [
  'drum-config-library',
  'spectral-forge-project-library',
  'spectral-forge-custom-stamp-library',
  'spectralForgeCustomStamps',
  'buildMelodicWorkspaceArchiveBlobParts',
  'parseMelodicWorkspaceArchive',
]) {
  requireContains('workspace package/codec', archivePackageImplementation, marker);
}

for (const marker of [
  'exportDrumConfigLibraryArchivePayload',
  'listDrumConfigLibraryEntries',
  'playlist: readDrumPlaylistState()',
  'applyDrumConfigLibraryArchivePayload',
]) {
  requireContains('drum config library', drumLibrary, marker);
}

for (const marker of [
  'exportForgeProjectLibraryArchivePayload',
  'spectralSnapshotBase64Parts',
  'arrayBufferToBase64Chunks',
  'applyForgeProjectLibraryArchivePayload',
]) {
  requireContains('forge project library', forgeProjectLibrary, marker);
}

for (const marker of [
  'exportCustomStampLibraryArchivePayload',
  'parseCustomStampLibraryArchivePayload',
  'applyCustomStampLibraryArchivePayload',
  'data: CustomStampArchiveArray',
  'grainData: CustomStampArchiveArray',
  'arrayBufferToBase64Chunks',
]) {
  requireContains('custom stamp library', customStampLibrary, marker);
}

for (const marker of [
  'spectralForgeCustomStamps',
  'SpectralForge-Stempel',
]) {
  requireContains('import ledger', ledger, marker);
}

if (failures.length) {
  console.error('[package-drum-spectralforge-payload-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  sections: [
    'drum-config-library',
    'spectral-forge-project-library',
    'spectral-forge-custom-stamp-library',
  ],
  payloads: {
    drumPatterns: true,
    spectralForgeProjects: true,
    spectralForgeCustomStamps: true,
  },
}, null, 2));
