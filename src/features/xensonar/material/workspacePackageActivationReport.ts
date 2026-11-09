import type { MaterialEntry } from '../../l3lab/materialLibrary';
import {
  formatWorkspacePackageImportLedgerSummary,
  readLastWorkspacePackageImportLedger,
  type WorkspacePackageImportLedger,
} from '../../../core/systemMemory/packageImportLedger';
import { readPersistedRootFollowBank } from './rootFollowBankStorage';

import type { WorkspacePackageActivationReport, WorkspacePackageActivationState } from './workspacePackageActivationReportTypes';

export type { WorkspacePackageActivationReport, WorkspacePackageActivationState } from './workspacePackageActivationReportTypes';

function compact(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => (value ?? '').trim()).filter(Boolean)));
}

function formatMode(mode: WorkspacePackageImportLedger['mode'] | null) {
  if (mode === 'replace') return 'ersetzend';
  if (mode === 'differential') return 'differenzial';
  if (mode === 'merge') return 'additiv';
  return '—';
}

function formatActivationStateLabel(state: WorkspacePackageActivationState) {
  if (state === 'no-ledger') return 'kein Ledger';
  if (state === 'import-only') return 'nur Import';
  if (state === 'imported-available') return 'verfügbar';
  if (state === 'active-from-package') return 'aktiviert';
  if (state === 'active-mismatch') return 'Auswahl ungeklärt';
  return 'Material-Refs ungeklärt';
}

function buildActivationSummary(report: Omit<WorkspacePackageActivationReport, 'activationSummary'>) {
  if (!report.hasLedger) return 'Noch kein Paketimport-Ledger gelesen.';
  const rootFollowParts = [
    `${report.importedRootFollowEntries} Root-Follow-Bank`,
    report.reconstructedLegacyEntries ? `${report.reconstructedLegacyEntries} Legacy rekonstruiert` : null,
    report.unresolvedMaterialRefs.length ? `${report.unresolvedMaterialRefs.length} ungeklärte Material-Refs` : null,
  ].filter(Boolean).join(' · ');
  const activeText = report.state === 'active-from-package'
    ? 'aktiviert'
    : report.state === 'imported-available'
      ? 'importiert, noch nicht aktiv'
      : report.state === 'active-mismatch'
        ? 'aktive Auswahl passt nicht zur geladenen Materialspur'
        : report.state === 'unresolved-material-refs'
          ? 'Import mit ungeklärten Material-Refs'
          : 'Import ohne aktivierbare Root-Follow-Bank';
  return `Letztes Paket: ${report.packageLabel ?? 'Workspace-Paket'} · ${formatMode(report.mode)} · ${rootFollowParts || '0 Root-Follow-Bank'} · ${activeText}.`;
}

export function buildWorkspacePackageActivationReport(args: {
  materialEntries: MaterialEntry[];
  selectedRootFollowLoop: MaterialEntry | null;
  fallbackSelectedLoopId: string | null;
  rootFollowLoopActive: boolean;
  packagePreferredEntries: number;
  ledger?: WorkspacePackageImportLedger | null;
}): WorkspacePackageActivationReport {
  const ledger = args.ledger === undefined ? readLastWorkspacePackageImportLedger() : args.ledger;
  const bank = readPersistedRootFollowBank();
  const materialIds = new Set(args.materialEntries.map((entry) => entry.id));
  const validRootFollowBankEntries = bank.memberIds.filter((id) => materialIds.has(id));
  const selectedLoopId = args.selectedRootFollowLoop?.id ?? args.fallbackSelectedLoopId ?? null;
  const activatedEntryId = ledger?.rootFollow.activatedEntryId ?? null;
  const importedRootFollowEntries = (ledger?.rootFollow.importedBankEntries ?? 0) + (ledger?.rootFollow.reconstructedLegacyEntries ?? 0);
  const reconstructedLegacyEntries = ledger?.rootFollow.reconstructedLegacyEntries ?? 0;
  const unresolvedMaterialRefs = ledger?.rootFollow.unresolvedMaterialRefs ?? [];
  let state: WorkspacePackageActivationState = 'no-ledger';
  if (ledger) {
    if (unresolvedMaterialRefs.length) state = 'unresolved-material-refs';
    else if (args.rootFollowLoopActive && selectedLoopId && !materialIds.has(selectedLoopId)) state = 'active-mismatch';
    else if (
      args.rootFollowLoopActive
      && selectedLoopId
      && (validRootFollowBankEntries.includes(selectedLoopId) || activatedEntryId === selectedLoopId)
    ) state = 'active-from-package';
    else if (importedRootFollowEntries || validRootFollowBankEntries.length || args.packagePreferredEntries) state = 'imported-available';
    else state = 'import-only';
  }
  const warnings = compact([
    ...(ledger?.warnings ?? []),
    unresolvedMaterialRefs.length ? `${unresolvedMaterialRefs.length} Root-Follow-Material-Refs blieben ungeklärt.` : null,
    state === 'active-mismatch' ? 'Aktive Root-Follow-Auswahl verweist nicht auf einen aktuell geladenen Materialspur-Eintrag.' : null,
    ledger && importedRootFollowEntries && !validRootFollowBankEntries.length ? 'Root-Follow-Bank importiert, aber aktuell ohne gültige Materialspur-Entsprechung.' : null,
  ]);
  const reportWithoutSummary: Omit<WorkspacePackageActivationReport, 'activationSummary'> = {
    state,
    hasLedger: !!ledger,
    stateLabel: formatActivationStateLabel(state),
    packageLabel: ledger?.packageLabel ?? null,
    mode: ledger?.mode ?? null,
    importedAt: ledger?.importedAt ?? null,
    ledgerSummary: ledger ? formatWorkspacePackageImportLedgerSummary(ledger) : null,
    selectedLoopId,
    activatedEntryId,
    materialEntries: args.materialEntries.length,
    rootFollowBankEntries: bank.memberIds.length,
    validRootFollowBankEntries: validRootFollowBankEntries.length,
    packagePreferredEntries: args.packagePreferredEntries,
    importedRootFollowEntries,
    reconstructedLegacyEntries,
    unresolvedMaterialRefs,
    warnings,
  };
  return {
    ...reportWithoutSummary,
    activationSummary: buildActivationSummary(reportWithoutSummary),
  };
}
