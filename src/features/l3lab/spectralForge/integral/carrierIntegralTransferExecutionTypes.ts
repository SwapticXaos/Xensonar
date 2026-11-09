import type { ForgeProjectSnapshot } from '../state/storeTypes';
import type { CarrierIntegralAuditionValueSource } from './carrierIntegralAudition';
import type { CarrierIntegralSynthLabSelection } from './carrierIntegralSynthLab';
import type { CarrierIntegralHarmonicXploreSelection } from './carrierIntegralHarmonicXploreRenderConfig';
import type { CarrierIntegralMachineId } from './carrierIntegralContracts';
import type { CarrierIntegralSelection } from './carrierIntegralSelection';
import type { CarrierIntegralTransferExecutorTargetId } from './carrierLoopBodyTransferTypes';

export type CarrierIntegralTransferExecutionRequest = {
  entry: {
    id: string;
    name: string;
    carrierIntegral?: { machineId?: unknown } | null;
  };
  snapshot: ForgeProjectSnapshot;
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTransferExecutorTargetId;
  targetLabel: string;
  valueSource: CarrierIntegralAuditionValueSource;
  selectionOverride?: Partial<CarrierIntegralSelection> | null;
  synthLabOverride?: Partial<CarrierIntegralSynthLabSelection> | null;
  storedSynthLab?: Partial<CarrierIntegralSynthLabSelection> | null;
  harmonicXploreOverride?: Partial<CarrierIntegralHarmonicXploreSelection> | null;
  storedHarmonicXplore?: Partial<CarrierIntegralHarmonicXploreSelection> | null;
  currentSynthLab: CarrierIntegralSynthLabSelection;
  currentHarmonicXplore: CarrierIntegralHarmonicXploreSelection;
  previewBpm: number;
  previewVolume: number;
  previewPitchSemitones: number;
};
