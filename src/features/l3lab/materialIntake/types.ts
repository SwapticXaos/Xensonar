import type { AudioImportReadMode, AudioSourceAsset } from '../spectralForge/audio/AudioImporter';

export interface TimeRange {
  startSec: number;
  durationSec: number;
}

export interface IntakeSource {
  id: string;
  label: string;
  kind: 'audio';
  durationSec: number;
  waveformPreview: Float32Array;
  sourceAsset: AudioSourceAsset;
  nativeAsset?: unknown;
}

export interface IntakeSelectionState {
  detailViewport: TimeRange;
  fineLoopRange: TimeRange;
}

export interface LoopRepairCandidate {
  bars: number;
  bpm: number;
  startSec: number;
  durationSec: number;
  confidence: number;
  fitScore?: number;
}

export interface LoopRepairResult {
  primary: LoopRepairCandidate;
  candidates: LoopRepairCandidate[];
}

export interface CommittedLoopPayload {
  source: IntakeSource;
  selection: IntakeSelectionState;
  readMode: AudioImportReadMode;
  repairResult?: LoopRepairResult | null;
  exportTitle?: string | null;
}

export interface MaterialSourceAdapter {
  id: string;
  label: string;
  canImportFile?: boolean;
  unavailableReason?: string;
  loadFromFile?: (file: File) => Promise<IntakeSource>;
}

export interface MaterialTargetAdapter {
  id: string;
  label: string;
  acceptsRawLoop: boolean;
  acceptsAnalysisMeta: boolean;
  acceptsSpectralProjection: boolean;
  commitLoop: (payload: CommittedLoopPayload) => Promise<void>;
}


export type MaterialIntakeExportRole = 'loop' | 'waveMaterial' | 'particleExciter' | 'droneTexture';

export interface MaterialIntakeExportMeta {
  name: string;
  role: MaterialIntakeExportRole;
  bpm: number;
  bars: number;
  guideSegments: number;
}

export interface MaterialIntakeMeterConfig {
  bpm: number;
  bars: number;
  guideSegments: number;
  guideMarkers: number[];
}
