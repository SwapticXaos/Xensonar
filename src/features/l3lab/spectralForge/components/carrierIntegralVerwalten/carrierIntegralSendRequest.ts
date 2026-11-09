import type { CarrierIntegralMachineId } from '../../integral/carrierIntegralContracts';
import type { CarrierIntegralSelection } from '../../integral/carrierIntegralSelection';
import type { CarrierIntegralSynthLabSelection } from '../../integral/carrierIntegralSynthLab';
import type { CarrierIntegralHarmonicXploreSelection } from '../../integral/carrierIntegralHarmonicXploreRenderConfig';
import type { CarrierIntegralLibraryAuditionValueSource, CarrierIntegralSupportedMachineResolver } from './carrierIntegralLibraryIntent';
import { resolveCarrierIntegralSendTargetFlow } from './carrierIntegralLibraryIntent';
import type { CarrierIntegralExportTargetId } from './carrierIntegralSignalButtonViewModel';

export type CarrierIntegralSendRequestFlow = {
  effectiveMachine: CarrierIntegralMachineId;
  effectiveValueSource: CarrierIntegralLibraryAuditionValueSource;
  storedMachine: CarrierIntegralMachineId | null;
  targetId: CarrierIntegralExportTargetId;
  blocked: boolean;
  blockReason: string | null;
  selectionOverride: Partial<CarrierIntegralSelection> | null;
  synthLabOverride: CarrierIntegralSynthLabSelection | null;
  harmonicXploreOverride: CarrierIntegralHarmonicXploreSelection | null;
  storedSynthLab: Partial<CarrierIntegralSynthLabSelection> | null | undefined;
  storedHarmonicXplore: Partial<CarrierIntegralHarmonicXploreSelection> | null | undefined;
  currentSynthLab: CarrierIntegralSynthLabSelection;
  currentHarmonicXplore: CarrierIntegralHarmonicXploreSelection;
  previewBpm: number;
  previewVolume: number;
  previewPitchSemitones: number;
};

export function resolveCarrierIntegralSendRequestFlow(args: {
  targetId: CarrierIntegralExportTargetId;
  valueSource: CarrierIntegralLibraryAuditionValueSource;
  currentMachine: CarrierIntegralMachineId;
  lastPreviewMachine?: CarrierIntegralMachineId | null;
  currentSelection: CarrierIntegralSelection;
  currentSynthLab: CarrierIntegralSynthLabSelection;
  currentHarmonicXplore: CarrierIntegralHarmonicXploreSelection;
  storedSelection?: Partial<CarrierIntegralSelection> | null;
  storedSynthLab?: Partial<CarrierIntegralSynthLabSelection> | null;
  storedHarmonicXplore?: Partial<CarrierIntegralHarmonicXploreSelection> | null;
  entryMeta?: { machineId?: unknown } | null;
  resolveMachine: CarrierIntegralSupportedMachineResolver;
  previewBpm: number;
  previewVolume: number;
  previewPitchSemitones: number;
}): CarrierIntegralSendRequestFlow {
  const currentMachineForTarget =
    args.targetId === 'melodic-pink-export'
      ? args.lastPreviewMachine ?? args.currentMachine
      : args.currentMachine;
  const sendFlow = resolveCarrierIntegralSendTargetFlow({
    valueSource: args.valueSource,
    currentMachine: currentMachineForTarget,
    storedSelection: args.storedSelection,
    entryMeta: args.entryMeta,
    resolveMachine: args.resolveMachine,
  });
  const { effectiveMachine, effectiveValueSource } = sendFlow;
  const blocked = false;

  return {
    effectiveMachine,
    effectiveValueSource,
    storedMachine: sendFlow.storedMachine,
    targetId: args.targetId,
    blocked,
    blockReason: null,
    selectionOverride:
      effectiveValueSource === 'right-override'
        ? {
            ...args.currentSelection,
            machineId: effectiveMachine,
            source: 'user' as const,
          }
        : null,
    synthLabOverride: effectiveValueSource === 'right-override' ? args.currentSynthLab : null,
    harmonicXploreOverride: effectiveValueSource === 'right-override' ? args.currentHarmonicXplore : null,
    storedSynthLab: args.storedSynthLab,
    storedHarmonicXplore: args.storedHarmonicXplore,
    currentSynthLab: args.currentSynthLab,
    currentHarmonicXplore: args.currentHarmonicXplore,
    previewBpm: args.previewBpm,
    previewVolume: args.previewVolume,
    previewPitchSemitones: args.previewPitchSemitones,
  };
}

export function assertCarrierIntegralSendRequestAllowed(
  flow: Pick<CarrierIntegralSendRequestFlow, 'blocked' | 'blockReason'>,
): void {
  if (flow.blocked) throw new Error(flow.blockReason ?? 'Carrier-Integral-Ziel ist blockiert.');
}
