import type { WorkspacePackageImportLedger } from '../../../core/systemMemory/packageImportLedger';

export type WorkspacePackageActivationState =
  | 'no-ledger'
  | 'import-only'
  | 'imported-available'
  | 'active-from-package'
  | 'active-mismatch'
  | 'unresolved-material-refs';

export type WorkspacePackageActivationReport = {
  state: WorkspacePackageActivationState;
  stateLabel: string;
  hasLedger: boolean;
  packageLabel: string | null;
  mode: WorkspacePackageImportLedger['mode'] | null;
  importedAt: number | null;
  ledgerSummary: string | null;
  activationSummary: string;
  selectedLoopId: string | null;
  activatedEntryId: string | null;
  materialEntries: number;
  rootFollowBankEntries: number;
  validRootFollowBankEntries: number;
  packagePreferredEntries: number;
  importedRootFollowEntries: number;
  reconstructedLegacyEntries: number;
  unresolvedMaterialRefs: string[];
  warnings: string[];
};
