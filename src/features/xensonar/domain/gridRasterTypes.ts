import type { CustomGridTuningId, GridTuning } from './gridTuningTypes';

export type RasterPeriodFamily = 'octave' | 'tritave';
export type RasterDivisionKind = 'equal' | 'custom' | 'ratio';
export type RasterFamily = 'edo' | 'edt' | 'cdo' | 'cdt' | 'ji';
export type RasterModePolicy = 'church_projection' | 'bp_native';

export type RasterDefinition = {
  id: GridTuning;
  label: string;
  family: RasterFamily;
  periodFamily: RasterPeriodFamily;
  divisionKind: RasterDivisionKind;
  steps: number;
  defaultModePolicy: RasterModePolicy;
  hotkeyCycleEligible: boolean;
  description: string;
  periodCents?: number;
  stepCents?: number[];
  builtIn?: boolean;
};

export type StoredCustomGridTuning = RasterDefinition & {
  id: CustomGridTuningId;
  periodCents: number;
  stepCents: number[];
  builtIn?: false;
  updatedAt: number;
};
