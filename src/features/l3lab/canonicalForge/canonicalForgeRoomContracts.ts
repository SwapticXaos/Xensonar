import { buildMachineRoomHandoffProfile, buildProducerRoadmapNotes } from '../../xensonar/architecture/machineRooms';
import { BASS_PATTERNS, DRUM_PATTERNS } from '../../xensonar/constants';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { buildDefaultGuideMarkers } from '../spectralForge/state/storeMaterialExport';
import { estimateLoopSnapSuggestion } from './loopSnap';
import type { LoopAutocorrectSuggestion } from './loopDrumDomain';
import type { TransferMode, WaveformMix } from './selectionAudioTransfer';
import type {
  CanonicalForgeWorkspace,
  CanonicalMaterialRole as MaterialRole,
} from './sessionTypes';

export const CANONICAL_PRODUCER = {
  producerId: 'spectralforge-canonical',
  producerName: 'Spectral Forge Canonical',
  version: 'forge2-a',
  family: 'canonical' as const,
  notes: buildProducerRoadmapNotes('canonical', 'Spectral Forge Canonical'),
};

export type MaterialExportConfig = {
  name: string;
  role: MaterialRole;
  adapterId: string;
  bpm: number;
  bars: number;
  guideSegments: number;
  guideMarkers: number[];
  beatGuideAudible: boolean;
  beatGuideVolume: number;
  loopPreview: boolean;
  transferMode: TransferMode;
  rootFollowPreferred: boolean;
};

export const XENSONAR_LOOP_REFERENCE_BPM = 108;

export const DEFAULT_EXPORT: MaterialExportConfig = {
  name: 'SyntheticForge Loop',
  role: 'loop',
  adapterId: 'canonical-forge-bridge',
  bpm: 108,
  bars: 4,
  guideSegments: 4,
  guideMarkers: buildDefaultGuideMarkers(4),
  beatGuideAudible: false,
  beatGuideVolume: 0.35,
  loopPreview: true,
  transferMode: 'source-direct',
  rootFollowPreferred: false,
};

export const DEFAULT_WAVEFORM_MIX: WaveformMix = {
  sine: 0.7,
  sawtooth: 0.2,
  square: 0.1,
  triangle: 0.2,
};

export const DRUM_PATTERN_OPTIONS = [
  ...DRUM_PATTERNS,
  { value: 'minimal_techno', label: 'Minimal Techno' },
  { value: 'duststep', label: 'Duststep' },
  { value: 'broken_lilt', label: 'Broken Lilt' },
] as const;

export const BASS_PATTERN_OPTIONS = [
  ...BASS_PATTERNS,
  { value: 'forge_rooted', label: 'Forge Rooted' },
  { value: 'forge_braided', label: 'Forge Braided' },
  { value: 'forge_fractured', label: 'Forge Fractured' },
] as const;

export function estimateLoopAutocorrect(
  source: AudioSourceAsset,
  startSec: number,
  durationSec: number,
): LoopAutocorrectSuggestion {
  return estimateLoopSnapSuggestion(source, startSec, durationSec);
}

export function createTransferMetadata(args: {
  materialExport: MaterialExportConfig;
  transfer: { sourceVersion: string; renderMode: string };
  selectionDurationSec: number;
  activeWorkspace: CanonicalForgeWorkspace;
  activeHandoffProfile: ReturnType<typeof buildMachineRoomHandoffProfile>;
  effectiveTransferMode: TransferMode;
  stableId?: string;
  projectLabel?: string;
}) {
  const {
    materialExport,
    transfer,
    selectionDurationSec,
    activeWorkspace,
    activeHandoffProfile,
    effectiveTransferMode,
    stableId,
    projectLabel,
  } = args;
  const isLoop = materialExport.role === 'loop';
  return {
    name: projectLabel ?? materialExport.name,
    role: materialExport.role,
    bpm: isLoop ? XENSONAR_LOOP_REFERENCE_BPM : materialExport.bpm,
    bars: materialExport.bars,
    guideSegments: materialExport.guideSegments,
    guideMarkers: materialExport.guideMarkers,
    loopStartSec: 0,
    loopEndSec: selectionDurationSec,
    rootHz: null,
    sourceVersion: transfer.sourceVersion,
    renderMode: transfer.renderMode,
    durationSec: selectionDurationSec,
    intendedLoopDurationSec: selectionDurationSec,
    preferredMyzelGroup: activeHandoffProfile.preferredMyzelGroup,
    workspaceOrigin: activeWorkspace,
    transitionGuard: activeHandoffProfile.transitionGuard,
    balanceCarrier: activeHandoffProfile.balanceCarrier,
    routeSummary:
      effectiveTransferMode === 'source-direct'
        ? 'Der gewählte Quellloop darf unverzerrt nach Xensonar wandern; Xensonar erhält dabei nur Taktzahl plus aktuelle Loop-Dauer, nicht die Forge-BPM-Deutung.'
        : activeHandoffProfile.routeSummary,
    stabilizeBy: activeHandoffProfile.stabilizeBy,
    stableId,
  };
}
