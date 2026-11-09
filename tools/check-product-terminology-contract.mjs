import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const fail = (m) => { console.error(`[terminology-contract] ${m}`); process.exitCode = 1; };

const terminology = read('src/features/xensonar/terminology/productTerminology.ts');
for (const token of ['SpectralForge', 'SyntheticForge', 'Melodic Loop', 'Drum Machine', 'Materialspur', 'Xensonar Tüftelpaket']) {
  if (!terminology.includes(token)) fail(`missing canonical term: ${token}`);
}

const targetAdapter = read('src/features/l3lab/materialIntake/adapters/target/canonicalForgeTargetAdapter.ts');
if (targetAdapter.includes("label: 'Forge 2")) fail('material intake still exposes Forge 2 as a user label');
if (!targetAdapter.includes('SyntheticForge')) fail('material intake must expose SyntheticForge');

const machineRooms = read('src/features/xensonar/architecture/machineRooms.ts');
for (const forbidden of ['Forge 1 · Legacy', 'Forge 2 · Canonical', 'Forge 2 verbindet']) {
  if (machineRooms.includes(forbidden)) fail(`machine-room product copy still contains legacy term: ${forbidden}`);
}
if (!machineRooms.includes('SYNTHETIC_FORGE_WORKSPACES')) fail('SyntheticForge workspace API is not primary');

const ledger = read('src/core/systemMemory/packageImportLedger.ts');
if (ledger.includes("domainSummary('gespeicherte SpectralForge-Arbeitsstände'")) fail('SyntheticForge workspace archive is mislabeled as SpectralForge in import ledger');
if (!ledger.includes("domainSummary('gespeicherte SyntheticForge-Arbeitsstände'")) fail('SyntheticForge workspace ledger label missing');

const manifest = read('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveManifest.ts');
for (const token of ['synthetic-forge-workspace-project-library', 'synthetic-forge-current-workspace']) {
  if (!manifest.includes(token)) fail(`new package section missing: ${token}`);
}
for (const token of ['spectral-forge-workspace-project-library', 'spectral-forge-current-workspace']) {
  if (!manifest.includes(token)) fail(`legacy package alias must remain readable: ${token}`);
}
const archiveCodec = read('src/features/l3lab/canonicalForge/melodicWorkspaceArchiveCodec.ts');
for (const token of ['WORKSPACE_ARCHIVE_SECTION_ALIASES.syntheticForgeSavedWorkspaces', 'WORKSPACE_ARCHIVE_SECTION_ALIASES.syntheticForgeCurrentWorkspace']) {
  if (!archiveCodec.includes(token)) fail(`legacy package alias is declared but not wired into parser: ${token}`);
}

const mount = read('src/features/xensonar/rooms/level3lab/Level3LabCanonicalMount.tsx');
if (mount.includes('[xensonar][forge2][boundary]')) fail('runtime diagnostic still calls SyntheticForge forge2');
if (!mount.includes('[xensonar][synthetic-forge][boundary]')) fail('SyntheticForge diagnostic namespace missing');



// User-visible copy must use current product language. Legacy identifiers are allowed
// in implementation symbols and compatibility shims, but not in labels/status/hints.
const userFacingSources = [
  'src/features/xensonar/architecture/machineRooms.ts',
  'src/features/l3lab/canonicalForge/canonicalForgeContracts.ts',
  'src/features/l3lab/canonicalForge/canonicalForgeRoomContracts.ts',
  'src/features/l3lab/canonicalForge/canonicalMaterialTransferController.ts',
  'src/features/l3lab/canonicalForge/canonicalSourceIntakeController.ts',
  'src/features/l3lab/canonicalForge/canonicalIntakeEventBridge.ts',
  'src/features/l3lab/canonicalForge/drumMachineActions.ts',
];
for (const sourcePath of userFacingSources) {
  const source = read(sourcePath);
  for (const forbidden of ['Forge 1', 'Forge 2', 'Canonical Forge']) {
    // These files are intentionally selected because occurrences are user-facing copy,
    // not compatibility identifiers. Keep technical aliases elsewhere explicit.
    if (source.includes(forbidden)) fail(`${sourcePath} still exposes legacy product copy: ${forbidden}`);
  }
}

if (!process.exitCode) console.log('[terminology-contract] PASS');
