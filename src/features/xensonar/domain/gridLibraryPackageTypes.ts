import type { JsonPackageMeta } from '../../../core/systemMemory/packageCore';
import type { CustomGridTuningId, GridTuning, StoredCustomGridTuning } from './instrumentData';

export type GridLibraryArchiveEntry = {
  archivedId: CustomGridTuningId;
  label: string;
  family: StoredCustomGridTuning['family'];
  periodFamily: StoredCustomGridTuning['periodFamily'];
  divisionKind: StoredCustomGridTuning['divisionKind'];
  steps: number;
  defaultModePolicy: StoredCustomGridTuning['defaultModePolicy'];
  hotkeyCycleEligible: boolean;
  description: string;
  periodCents: number;
  stepCents: number[];
  updatedAt: number;
  contentHash: string | null;
};

export type GridLibraryArchivePayload = {
  selectedTuning: GridTuning | null;
  activeRack: GridTuning[];
  customTunings: GridLibraryArchiveEntry[];
};

export type GridLibraryArchive = JsonPackageMeta<'xensonar-grid-library', 1> & GridLibraryArchivePayload;
