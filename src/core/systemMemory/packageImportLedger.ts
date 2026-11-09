import { isRecord, type WorkspacePackageImportMode } from './packageCore';

export const WORKSPACE_PACKAGE_IMPORT_LEDGER_STORAGE_KEY = 'xensonar-last-workspace-package-import-ledger-v1';
export const WORKSPACE_PACKAGE_IMPORT_LEDGER_EVENT = 'xensonar:workspace-package-import-ledger';

export type WorkspacePackageImportLedgerDomain = {
  present: boolean;
  incoming: number;
  imported: number;
  reused: number;
  replaced: number;
  skipped: number;
  deduped: number;
};

export type WorkspacePackageImportLedger = {
  schemaVersion: 1;
  mode: WorkspacePackageImportMode;
  packageId: string;
  packageLabel: string;
  importedAt: number;
  samples: WorkspacePackageImportLedgerDomain & {
    remapped: number;
  };
  projects: WorkspacePackageImportLedgerDomain;
  grid: WorkspacePackageImportLedgerDomain & {
    rackSlots: number;
  };
  material: WorkspacePackageImportLedgerDomain & {
    remapped: number;
    touched: number;
  };
  bassClips: WorkspacePackageImportLedgerDomain;
  drumConfigs: WorkspacePackageImportLedgerDomain & {
    playlistImported: boolean;
  };
  spectralForgeProjects: WorkspacePackageImportLedgerDomain;
  spectralForgeCustomStamps: WorkspacePackageImportLedgerDomain;
  syntheticForgeSavedWorkspaces: WorkspacePackageImportLedgerDomain;
  syntheticForgeCurrentWorkspace: WorkspacePackageImportLedgerDomain;
  residentConstellations: WorkspacePackageImportLedgerDomain;
  rootFollow: WorkspacePackageImportLedgerDomain & {
    importedBankEntries: number;
    reconstructedLegacyEntries: number;
    activatedEntryId: string | null;
    unresolvedMaterialRefs: string[];
  };
  warnings: string[];
};

function emptyDomain(present = false): WorkspacePackageImportLedgerDomain {
  return { present, incoming: 0, imported: 0, reused: 0, replaced: 0, skipped: 0, deduped: 0 };
}

function clampCount(value: unknown) {
  return Math.max(0, Math.floor(Number.isFinite(Number(value)) ? Number(value) : 0));
}

function compactWarnings(warnings: Array<string | null | undefined>) {
  return Array.from(new Set(warnings.map((entry) => (entry ?? '').trim()).filter(Boolean)));
}

export function createWorkspacePackageImportLedger(args: {
  mode: WorkspacePackageImportMode;
  packageId: string;
  packageLabel: string;
  warnings?: string[];
}): WorkspacePackageImportLedger {
  return {
    schemaVersion: 1,
    mode: args.mode,
    packageId: args.packageId,
    packageLabel: args.packageLabel,
    importedAt: Date.now(),
    samples: { ...emptyDomain(false), remapped: 0 },
    projects: emptyDomain(false),
    grid: { ...emptyDomain(false), rackSlots: 0 },
    material: { ...emptyDomain(false), remapped: 0, touched: 0 },
    bassClips: emptyDomain(false),
    drumConfigs: { ...emptyDomain(false), playlistImported: false },
    spectralForgeProjects: emptyDomain(false),
    spectralForgeCustomStamps: emptyDomain(false),
    syntheticForgeSavedWorkspaces: emptyDomain(false),
    syntheticForgeCurrentWorkspace: emptyDomain(false),
    residentConstellations: emptyDomain(false),
    rootFollow: {
      ...emptyDomain(false),
      importedBankEntries: 0,
      reconstructedLegacyEntries: 0,
      activatedEntryId: null,
      unresolvedMaterialRefs: [],
    },
    warnings: compactWarnings(args.warnings ?? []),
  };
}

export function normalizeWorkspacePackageImportLedger(raw: unknown): WorkspacePackageImportLedger | null {
  if (!isRecord(raw)) return null;
  const mode = raw.mode === 'replace' || raw.mode === 'differential' ? raw.mode : 'merge';
  const ledger = createWorkspacePackageImportLedger({
    mode,
    packageId: typeof raw.packageId === 'string' ? raw.packageId : 'unknown-package',
    packageLabel: typeof raw.packageLabel === 'string' ? raw.packageLabel : 'Workspace-Paket',
    warnings: Array.isArray(raw.warnings) ? raw.warnings.filter((entry): entry is string => typeof entry === 'string') : [],
  });
  ledger.importedAt = typeof raw.importedAt === 'number' ? raw.importedAt : Date.now();
  const copyDomain = (target: WorkspacePackageImportLedgerDomain, source: unknown) => {
    if (!isRecord(source)) return;
    target.present = source.present === true;
    target.incoming = clampCount(source.incoming);
    target.imported = clampCount(source.imported);
    target.reused = clampCount(source.reused);
    target.replaced = clampCount(source.replaced);
    target.skipped = clampCount(source.skipped);
    target.deduped = clampCount(source.deduped);
  };
  copyDomain(ledger.samples, raw.samples);
  copyDomain(ledger.projects, raw.projects);
  copyDomain(ledger.grid, raw.grid);
  copyDomain(ledger.material, raw.material);
  copyDomain(ledger.bassClips, raw.bassClips);
  copyDomain(ledger.drumConfigs, raw.drumConfigs);
  copyDomain(ledger.spectralForgeProjects, raw.spectralForgeProjects);
  copyDomain(ledger.spectralForgeCustomStamps, raw.spectralForgeCustomStamps);
  copyDomain(ledger.syntheticForgeSavedWorkspaces, raw.syntheticForgeSavedWorkspaces ?? raw.spectralForgeSavedWorkspaces);
  copyDomain(ledger.syntheticForgeCurrentWorkspace, raw.syntheticForgeCurrentWorkspace ?? raw.spectralForgeCurrentWorkspace);
  copyDomain(ledger.residentConstellations, raw.residentConstellations);
  copyDomain(ledger.rootFollow, raw.rootFollow);
  if (isRecord(raw.samples)) ledger.samples.remapped = clampCount(raw.samples.remapped);
  if (isRecord(raw.grid)) ledger.grid.rackSlots = clampCount(raw.grid.rackSlots);
  if (isRecord(raw.material)) {
    ledger.material.remapped = clampCount(raw.material.remapped);
    ledger.material.touched = clampCount(raw.material.touched);
  }
  if (isRecord(raw.drumConfigs)) ledger.drumConfigs.playlistImported = raw.drumConfigs.playlistImported === true;
  if (isRecord(raw.rootFollow)) {
    ledger.rootFollow.importedBankEntries = clampCount(raw.rootFollow.importedBankEntries);
    ledger.rootFollow.reconstructedLegacyEntries = clampCount(raw.rootFollow.reconstructedLegacyEntries);
    ledger.rootFollow.activatedEntryId = typeof raw.rootFollow.activatedEntryId === 'string' ? raw.rootFollow.activatedEntryId : null;
    ledger.rootFollow.unresolvedMaterialRefs = Array.isArray(raw.rootFollow.unresolvedMaterialRefs)
      ? raw.rootFollow.unresolvedMaterialRefs.filter((entry): entry is string => typeof entry === 'string')
      : [];
  }
  return ledger;
}

export function recordWorkspacePackageImportLedger(ledger: WorkspacePackageImportLedger) {
  const normalized = normalizeWorkspacePackageImportLedger(ledger) ?? ledger;
  try { window.localStorage.setItem(WORKSPACE_PACKAGE_IMPORT_LEDGER_STORAGE_KEY, JSON.stringify(normalized)); } catch {}
  try { window.sessionStorage.setItem(WORKSPACE_PACKAGE_IMPORT_LEDGER_STORAGE_KEY, JSON.stringify(normalized)); } catch {}
  try { window.dispatchEvent(new CustomEvent(WORKSPACE_PACKAGE_IMPORT_LEDGER_EVENT, { detail: normalized })); } catch {}
}

export function readLastWorkspacePackageImportLedger(): WorkspacePackageImportLedger | null {
  const read = (storage: Storage) => {
    try { return normalizeWorkspacePackageImportLedger(JSON.parse(storage.getItem(WORKSPACE_PACKAGE_IMPORT_LEDGER_STORAGE_KEY) || 'null')); } catch { return null; }
  };
  if (typeof window === 'undefined') return null;
  return read(window.localStorage) ?? read(window.sessionStorage);
}

function domainSummary(label: string, domain: WorkspacePackageImportLedgerDomain) {
  if (!domain.present) return `${label}: —`;
  const parts = [`${label}: ${domain.imported}/${domain.incoming}`];
  if (domain.reused) parts.push(`${domain.reused} wiederverwendet`);
  if (domain.replaced) parts.push(`${domain.replaced} ersetzt`);
  if (domain.skipped) parts.push(`${domain.skipped} übersprungen`);
  if (domain.deduped) parts.push(`${domain.deduped} Dubletten entfernt`);
  return parts.join(' · ');
}

export function formatWorkspacePackageImportLedgerSummary(ledger: WorkspacePackageImportLedger) {
  const rootParts = [`Root Follow: ${ledger.rootFollow.importedBankEntries + ledger.rootFollow.reconstructedLegacyEntries}`];
  if (ledger.rootFollow.reconstructedLegacyEntries) rootParts.push(`${ledger.rootFollow.reconstructedLegacyEntries} Legacy rekonstruiert`);
  if (ledger.rootFollow.unresolvedMaterialRefs.length) rootParts.push(`${ledger.rootFollow.unresolvedMaterialRefs.length} ungeklärte Material-Refs`);
  const lines = [
    domainSummary('Samples', ledger.samples),
    domainSummary('Projekte', ledger.projects),
    domainSummary('Raster', ledger.grid),
    domainSummary('Materialspur', ledger.material),
    domainSummary('Bass-Patterns/Bassläufe', ledger.bassClips),
    domainSummary('Drum-Patterns', ledger.drumConfigs),
    domainSummary('SpectralForge-Projekte', ledger.spectralForgeProjects),
    domainSummary('SpectralForge-Stempel', ledger.spectralForgeCustomStamps),
    domainSummary('gespeicherte SyntheticForge-Arbeitsstände', ledger.syntheticForgeSavedWorkspaces),
    domainSummary('offener SyntheticForge-Arbeitsstand', ledger.syntheticForgeCurrentWorkspace),
    domainSummary('Raum-III-Konstellationen', ledger.residentConstellations),
    rootParts.join(' · '),
  ];
  return `Import-Ledger (${ledger.mode}): ${lines.join(' | ')}`;
}
