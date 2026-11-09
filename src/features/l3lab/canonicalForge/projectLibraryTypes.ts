import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { CanonicalForgeSessionState } from './sessionTypes';

export interface CanonicalForgeProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  bars: number;
  activeTool: CanonicalForgeSessionState['activeTool'];
  hasSourceAudio: boolean;
  sourceDurationSec: number | null;
}

export interface CanonicalForgeProjectSnapshot extends Omit<CanonicalForgeSessionState, 'rawSourceAsset' | 'sourceAsset' | 'bundle' | 'status'> {
  sourceAsset: AudioSourceAsset | null;
}

export interface CanonicalForgeProjectRecord extends CanonicalForgeProjectMeta {
  snapshot: CanonicalForgeProjectSnapshot;
}
