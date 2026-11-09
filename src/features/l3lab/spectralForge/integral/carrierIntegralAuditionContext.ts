import {
  buildCarrierIntegralRouteSignature,
  resolveCarrierIntegralMachine,
} from './carrierIntegralRegistry';
import {
  normalizeCarrierIntegralSelection,
  resolveCarrierIntegralSelectionParams,
  type CarrierIntegralSelection,
} from './carrierIntegralSelection';
import {
  normalizeCarrierIntegralSynthLabSelection,
  type CarrierIntegralSynthLabSelection,
} from './carrierIntegralSynthLab';
import {
  normalizeCarrierIntegralHarmonicXploreSelection,
  migrateLegacySynthLabPresetToHarmonicXploreSelection,
  type CarrierIntegralHarmonicXploreSelection,
} from './carrierIntegralHarmonicXploreRenderConfig';
import { canMachineUseCarrierIntegralBodySource } from './carrierIntegralBodySources';
import type {
  CarrierIntegralBodySourceMode,
  CarrierIntegralMachineId,
} from './carrierIntegralContracts';
import type { ForgeProjectSnapshot } from '../state/storeTypes';

export const CARRIER_INTEGRAL_AUDITION_PREVIEW_MAX_SECONDS = 6;

export type CarrierIntegralAuditionValueSource = 'stored-entry' | 'right-override';

export type CarrierIntegralAuditionContextRequest = {
  snapshot: ForgeProjectSnapshot;
  machineId: CarrierIntegralMachineId;
  bodySourceMode?: CarrierIntegralBodySourceMode | null;
  maxPreviewDurationSec?: number;
  previewPitchSemitones?: number;
  previewGain?: number;
  previewBpm?: number;
  loopPreview?: boolean;
  valueSource?: CarrierIntegralAuditionValueSource;
  onAudioPosition?: (pos: number) => void;
  onAudioEnd?: () => void;
  onRenderProgress?: (progress: number) => void;
  selectionOverride?: Partial<CarrierIntegralSelection> | null;
  synthLabOverride?: Partial<CarrierIntegralSynthLabSelection> | null;
  harmonicXploreOverride?: Partial<CarrierIntegralHarmonicXploreSelection> | null;
};

export type CarrierIntegralAuditionContext = {
  machine: ReturnType<typeof resolveCarrierIntegralMachine>;
  machineId: CarrierIntegralMachineId;
  valueSource: CarrierIntegralAuditionValueSource;
  valueSourceLabel: string;
  auditionSelection: CarrierIntegralSelection;
  bodySourceMode: CarrierIntegralBodySourceMode;
  carrierIntegralParams: ReturnType<typeof resolveCarrierIntegralSelectionParams>;
  routeSignature: ReturnType<typeof buildCarrierIntegralRouteSignature>;
  synthLab: ReturnType<typeof normalizeCarrierIntegralSynthLabSelection>;
  harmonicXplore: ReturnType<typeof normalizeCarrierIntegralHarmonicXploreSelection>;
  previewBpm: number;
  previewGain: number;
  previewPitchRatio: number;
  loopPreview: boolean;
  durationSec: number;
  previewDurationSec: number;
};

export function computeCarrierIntegralAuditionLoopDurationSec(args: { bars: number; bpm: number }) {
  const bars = Math.max(1, Math.min(32, Math.round(args.bars || 4)));
  const bpm = Math.max(1, args.bpm || 108);
  return bars * 4 * (60 / bpm);
}

export function resolveCarrierIntegralAuditionValueSource(
  request: Pick<CarrierIntegralAuditionContextRequest, 'valueSource' | 'selectionOverride' | 'synthLabOverride' | 'harmonicXploreOverride'>,
): CarrierIntegralAuditionValueSource {
  return request.valueSource ?? (request.selectionOverride || request.synthLabOverride || request.harmonicXploreOverride ? 'right-override' : 'stored-entry');
}

export function formatCarrierIntegralAuditionValueSourceLabel(valueSource: CarrierIntegralAuditionValueSource): string {
  return valueSource === 'right-override' ? 'rechte Gerätewerte' : 'gespeicherte Eintragswerte';
}

export function resolveCarrierIntegralAuditionBodySource(
  machineId: CarrierIntegralMachineId,
  requested?: CarrierIntegralBodySourceMode | null,
): CarrierIntegralBodySourceMode {
  const machine = resolveCarrierIntegralMachine(machineId);
  if (requested && canMachineUseCarrierIntegralBodySource(machineId, requested)) return requested;
  if (machine.bodySourceModes.includes('neutral_pigment')) return 'neutral_pigment';
  return machine.bodySourceModes[0] ?? 'neutral_pigment';
}

function hasCarrierIntegralAuditionSelectionPayload(selection?: Partial<CarrierIntegralSelection> | null): boolean {
  return Boolean(
    selection?.machineId ||
    selection?.bodySourceMode ||
    selection?.presetId ||
    Object.keys(selection?.paramsPatch ?? {}).length > 0,
  );
}

export function buildCarrierIntegralAuditionSelectionForMachine(args: {
  machineId: CarrierIntegralMachineId;
  sourceSelection?: Partial<CarrierIntegralSelection> | null;
  valueSource: CarrierIntegralAuditionValueSource;
}): CarrierIntegralSelection {
  const targetBase = normalizeCarrierIntegralSelection({
    machineId: args.machineId,
    source: args.valueSource === 'right-override' ? 'user' : 'project',
  });
  if (!hasCarrierIntegralAuditionSelectionPayload(args.sourceSelection)) return targetBase;

  const source = normalizeCarrierIntegralSelection(args.sourceSelection);
  const sourceParams = resolveCarrierIntegralSelectionParams(source);
  return normalizeCarrierIntegralSelection({
    machineId: args.machineId,
    bodySourceMode: source.bodySourceMode,
    presetId: targetBase.presetId,
    paramsPatch: sourceParams,
    updatedAt: source.updatedAt ?? Date.now(),
    source: args.valueSource === 'right-override' ? 'user' : 'project',
  }, targetBase);
}

export function buildCarrierIntegralAuditionContext(
  request: CarrierIntegralAuditionContextRequest,
): CarrierIntegralAuditionContext {
  const machine = resolveCarrierIntegralMachine(request.machineId);
  const valueSource = resolveCarrierIntegralAuditionValueSource(request);
  const auditionSelection = buildCarrierIntegralAuditionSelectionForMachine({
    machineId: request.machineId,
    sourceSelection: valueSource === 'right-override'
      ? request.selectionOverride ?? null
      : request.snapshot.carrierIntegralSelection ?? null,
    valueSource,
  });
  const bodySourceMode = resolveCarrierIntegralAuditionBodySource(
    request.machineId,
    request.bodySourceMode ?? auditionSelection.bodySourceMode,
  );
  const carrierIntegralParams = resolveCarrierIntegralSelectionParams(auditionSelection);
  const routeSignature = buildCarrierIntegralRouteSignature({
    machineId: request.machineId,
    bodySourceMode,
    params: carrierIntegralParams,
  });
  const synthLab = normalizeCarrierIntegralSynthLabSelection(
    valueSource === 'right-override'
      ? request.synthLabOverride ?? request.snapshot.carrierIntegralSynthLab ?? null
      : request.snapshot.carrierIntegralSynthLab ?? null,
  );
  const harmonicXplore = valueSource === 'right-override'
    ? normalizeCarrierIntegralHarmonicXploreSelection(
        request.harmonicXploreOverride ?? request.snapshot.carrierIntegralHarmonicXplore ?? null,
        migrateLegacySynthLabPresetToHarmonicXploreSelection(request.synthLabOverride ?? request.snapshot.carrierIntegralSynthLab ?? null),
      )
    : normalizeCarrierIntegralHarmonicXploreSelection(
        request.snapshot.carrierIntegralHarmonicXplore ?? null,
        migrateLegacySynthLabPresetToHarmonicXploreSelection(request.snapshot.carrierIntegralSynthLab ?? null),
      );
  const previewBpm = Math.max(30, Math.min(260, request.previewBpm ?? request.snapshot.materialExport.bpm));
  const previewGain = Math.max(0, Math.min(1, request.previewGain ?? 0.72));
  const previewPitchRatio = Math.pow(2, (request.previewPitchSemitones ?? 0) / 12);
  const loopPreview = !!request.loopPreview;
  const durationSec = computeCarrierIntegralAuditionLoopDurationSec({
    bars: request.snapshot.materialExport.bars,
    bpm: previewBpm,
  });
  const previewDurationSec = Math.max(
    0.35,
    Math.min(durationSec, request.maxPreviewDurationSec ?? CARRIER_INTEGRAL_AUDITION_PREVIEW_MAX_SECONDS),
  );

  return {
    machine,
    machineId: request.machineId,
    valueSource,
    valueSourceLabel: formatCarrierIntegralAuditionValueSourceLabel(valueSource),
    auditionSelection,
    bodySourceMode,
    carrierIntegralParams,
    routeSignature,
    synthLab,
    harmonicXplore,
    previewBpm,
    previewGain,
    previewPitchRatio,
    loopPreview,
    durationSec,
    previewDurationSec,
  };
}
