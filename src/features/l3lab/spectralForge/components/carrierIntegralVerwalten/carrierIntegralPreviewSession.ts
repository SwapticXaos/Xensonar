import type { CarrierIntegralMachineId } from '../../integral/carrierIntegralContracts';
import type { CarrierIntegralSelection } from '../../integral/carrierIntegralSelection';
import type { CarrierIntegralSynthLabSelection } from '../../integral/carrierIntegralSynthLab';
import type { CarrierIntegralHarmonicXploreSelection } from '../../integral/carrierIntegralHarmonicXploreRenderConfig';

export type CarrierIntegralAuditionValueSource = 'stored-entry' | 'right-override';

export const CARRIER_INTEGRAL_PREVIEW_MAX_DURATION_SEC = 6;
export const CARRIER_INTEGRAL_PREVIEW_REAUDITION_DELAY_MS = 180;

export function createCarrierIntegralAuditionKey(args: {
  entryId: string;
  machineId: CarrierIntegralMachineId;
  valueSource: CarrierIntegralAuditionValueSource;
}): string {
  return `${args.entryId}:${args.machineId}:${args.valueSource}`;
}

export function createCarrierIntegralAuditionOverrides(args: {
  machineId: CarrierIntegralMachineId;
  valueSource: CarrierIntegralAuditionValueSource;
  selection: CarrierIntegralSelection;
  synthLab: CarrierIntegralSynthLabSelection;
  harmonicXplore: CarrierIntegralHarmonicXploreSelection;
}) {
  return args.valueSource === 'right-override'
    ? {
        valueSource: args.valueSource,
        selectionOverride: {
          ...args.selection,
          machineId: args.machineId,
          source: 'user' as const,
        },
        synthLabOverride: args.synthLab,
        harmonicXploreOverride: args.harmonicXplore,
      }
    : { valueSource: args.valueSource };
}

export function createCarrierIntegralAuditionRequest<TSnapshot>(args: {
  projectName: string;
  snapshot: TSnapshot;
  machineId: CarrierIntegralMachineId;
  valueSource: CarrierIntegralAuditionValueSource;
  selection: CarrierIntegralSelection;
  synthLab: CarrierIntegralSynthLabSelection;
  harmonicXplore: CarrierIntegralHarmonicXploreSelection;
  previewPitchSemitones: number;
  previewGain: number;
  previewBpm: number;
  loopPreview?: boolean;
  onAudioPosition?: (pos: number) => void;
  onAudioEnd?: () => void;
  onRenderProgress?: (progress: number) => void;
}) {
  return {
    projectName: args.projectName,
    snapshot: args.snapshot,
    machineId: args.machineId,
    maxPreviewDurationSec: CARRIER_INTEGRAL_PREVIEW_MAX_DURATION_SEC,
    previewPitchSemitones: args.previewPitchSemitones,
    previewGain: args.previewGain,
    previewBpm: args.previewBpm,
    loopPreview: !!args.loopPreview,
    onAudioPosition: args.onAudioPosition,
    onAudioEnd: args.onAudioEnd,
    onRenderProgress: args.onRenderProgress,
    ...createCarrierIntegralAuditionOverrides({
      machineId: args.machineId,
      valueSource: args.valueSource,
      selection: args.selection,
      synthLab: args.synthLab,
      harmonicXplore: args.harmonicXplore,
    }),
  };
}

export function resolveCarrierIntegralPreviewSessionActivation(args: {
  machineId: CarrierIntegralMachineId;
}) {
  return {
    selectionPatch: { machineId: args.machineId, source: 'user' as const },
    lastPreviewMachineId: args.machineId,
    auditionValueSource: 'right-override' as const,
  };
}

export function shouldRefreshCarrierIntegralPreviewSession(args: {
  selectedProjectAvailable: boolean;
  lastPreviewMachineId: CarrierIntegralMachineId | null;
  auditionBusyKey: string | null;
}): boolean {
  return !!args.selectedProjectAvailable && !!args.lastPreviewMachineId && args.auditionBusyKey === null;
}
