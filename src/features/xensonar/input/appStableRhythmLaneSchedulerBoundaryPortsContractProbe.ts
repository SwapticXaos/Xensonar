import type { DrumStyle } from '../../resonance/drumMachine';
import type { GrooveState } from '../../resonance/rhythmforge/types';
import type { BassClip } from '../groove/bassPatternEvents';
import type { GroovePlaybackRuntimeRefs } from '../groove/useGroovePlaybackRuntimeRefs';
import type { StableRhythmMetronomePulseState } from '../rooms/useStableRhythmMetronomePulse';

export type AppStableRhythmLanePlayBassNote = (
  time: number,
  freq: number,
  vol: number,
  dur: number,
  accent?: number,
  extras?: { glideToNext?: boolean; ghost?: boolean },
) => void;

export type AppStableRhythmLaneSchedulerCacheRefs = Pick<
  GroovePlaybackRuntimeRefs,
  | 'rhythmForgeDrumPatternRef'
  | 'rhythmForgeBassPatternRef'
  | 'rhythmForgeDrumBarIndexRef'
  | 'rhythmForgeBassBarIndexRef'
  | 'rhythmForgeSeedRef'
  | 'psyBassPatternRef'
  | 'psyBassBarIndexRef'
  | 'bassClipPlaybackCacheRef'
  | 'bassClipBarRootRef'
>;

export type AppStableRhythmLaneSchedulerReadPorts = {
  readonly readDrumStyle: () => DrumStyle;
  readonly resolveCurrentBassRootHz: () => number;
  readonly resolveGrooveState: (timeSec: number) => GrooveState;
  readonly readQuantizeBpm: () => number;
  readonly readMetronomeAudioNowSec: () => number;
  readonly readBassClipById: (id: string) => BassClip | null;
};

export type AppStableRhythmLaneSchedulerActionPorts = {
  readonly scheduleStableRhythmMetronomePulse: StableRhythmMetronomePulseState['scheduleStableRhythmMetronomePulse'];
  readonly playBassNote: AppStableRhythmLanePlayBassNote;
  readonly applyMyzelLayerStep: (timeSec: number, step16: number) => void;
};

export type AppStableRhythmLaneSchedulerBoundaryPorts = {
  readonly cacheRefs: AppStableRhythmLaneSchedulerCacheRefs;
  readonly readPorts: AppStableRhythmLaneSchedulerReadPorts;
  readonly actionPorts: AppStableRhythmLaneSchedulerActionPorts;
};
