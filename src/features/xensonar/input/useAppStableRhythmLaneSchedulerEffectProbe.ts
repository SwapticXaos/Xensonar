import { useEffect, type MutableRefObject } from 'react';
import { createDrumMachine } from '../../resonance/drumMachine';
import { grooveStateFromMycelium } from '../../resonance/rhythmforge/bridges';
import type { MyceliumSnapshot } from '../../topology/myceliumSnapshot';
import { readDrumStyle, resolveBassRootHz } from '../groove/groovePlaybackHelpers';
import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import type { StableRhythmMetronomePulseState } from '../rooms/useStableRhythmMetronomePulse';
import { buildAppStableRhythmLaneEffectArgsContractProbe } from './appStableRhythmLaneEffectArgsContractProbe';
import { startAppStableRhythmLaneSchedulerLoopProbe } from './appStableRhythmLaneSchedulerLoopProbe';

export type AppStableRhythmLaneSchedulerEffectProbeBassNoteActionArgs = {
  readonly nexusParamsRef: MutableRefObject<AppNexusParams>;
  readonly ensureFinalMixBus: (ctx: AudioContext) => AudioNode;
  readonly enterHoldPsyFxEnabled: boolean;
  readonly enterHoldRef: MutableRefObject<boolean>;
  readonly ensureEnterHoldPsyFxDevice: (ctx: AudioContext) => void;
  readonly enterHoldPsyFxSendsRef: MutableRefObject<{
    readonly waves?: GainNode | null;
    readonly bass?: GainNode | null;
  }>;
};

export type AppStableRhythmLaneSchedulerEffectProbeMyzelLayerStepActionArgs = {
  readonly nexusRefs: MutableRefObject<any>;
  readonly myzelEnabled: boolean;
  readonly myzelTopologyModeRef: MutableRefObject<string>;
  readonly bassRootMode: AppNexusParams['bassRootMode'];
  readonly bassRootHz: number;
  readonly readInterpreterMyzelBaseHz: () => number;
  readonly ensureMyzelSynth: (ctx: AudioContext) => unknown;
  readonly myceliumSnapshotRef: MutableRefObject<MyceliumSnapshot>;
  readonly myzelStep16ths: number;
  readonly myzelLayerModRef: MutableRefObject<any>;
  readonly myzelGateRef: MutableRefObject<number>;
  readonly intensityGlobal: number;
  readonly myzelBallMode: any;
  readonly myzelNodeMode: any;
  readonly myzelPattern: any;
  readonly myzelInterpreterMix: {
    readonly hybridBlend: number;
    readonly weaveBlend: number;
    readonly constellationBlend: number;
    readonly driveAmount: number;
    readonly driveResponse: number;
  };
  readonly readActiveDroneOvertoneMix: () => Record<string, number>;
};

export type AppStableRhythmLaneSchedulerEffectProbeBoundaryPortsArgs = {
  readonly rhythmForgeDrumPatternRef: MutableRefObject<any>;
  readonly rhythmForgeBassPatternRef: MutableRefObject<any>;
  readonly rhythmForgeDrumBarIndexRef: MutableRefObject<number>;
  readonly rhythmForgeBassBarIndexRef: MutableRefObject<number>;
  readonly rhythmForgeSeedRef: MutableRefObject<number>;
  readonly psyBassPatternRef: MutableRefObject<any>;
  readonly psyBassBarIndexRef: MutableRefObject<number>;
  readonly bassClipPlaybackCacheRef: MutableRefObject<any>;
  readonly bassClipBarRootRef: MutableRefObject<any>;
  readonly readBassClipById: (id: string) => any;
  readonly scheduleStableRhythmMetronomePulse: StableRhythmMetronomePulseState['scheduleStableRhythmMetronomePulse'];
};

export type AppStableRhythmLaneSchedulerEffectProbeSchedulerLoopArgs = {
  readonly nexusParamsRef: MutableRefObject<AppNexusParams>;
  readonly nexusRefs: MutableRefObject<{
    readonly cursorY: number;
    nextAbsoluteStep?: number | null;
  }>;
  readonly selectedExportedDrumConfig: any;
  readonly clearStableRhythmMetronomeTimeouts: () => void;
};

export type UseAppStableRhythmLaneSchedulerEffectProbeArgs = {
  readonly audioCtx: AudioContext | null;
  readonly nexusActive: boolean;
  readonly ensureDrumMixBus: (ctx: AudioContext) => AudioNode;
  readonly freqFromY: (y: number) => number;
  readonly myceliumSnapshotRef: MutableRefObject<MyceliumSnapshot>;
  readonly bassNoteAction: AppStableRhythmLaneSchedulerEffectProbeBassNoteActionArgs;
  readonly myzelLayerStepAction: AppStableRhythmLaneSchedulerEffectProbeMyzelLayerStepActionArgs;
  readonly boundaryPorts: AppStableRhythmLaneSchedulerEffectProbeBoundaryPortsArgs;
  readonly schedulerLoop: AppStableRhythmLaneSchedulerEffectProbeSchedulerLoopArgs;
  readonly stableRhythmLaneSchedulerEffectExtractedFromAppTsx: true;
  readonly reactLifecycleNowHookOwned: true;
  readonly appStillSuppliesEffectInputs: true;
  readonly schedulerLoopStillProbeOwned: true;
  readonly hotPathAddsNoPerStepBuilder: true;
  readonly browserFunctionalSanityRequiredAfterThisCut: true;
  readonly readStableMusicLaneBeatWorkletOnly?: () => boolean;
};

export const useAppStableRhythmLaneSchedulerEffectProbe = (
  args: UseAppStableRhythmLaneSchedulerEffectProbeArgs,
): void => {
  useEffect(() => {
    if (!args.audioCtx || !args.nexusActive) return;
    const audioCtx = args.audioCtx;
    const nexusParamsRef = args.schedulerLoop.nexusParamsRef;
    const nexusRefs = args.schedulerLoop.nexusRefs;
    const drumMachine = createDrumMachine(audioCtx, args.ensureDrumMixBus(audioCtx));

    const stableRhythmLaneEffectArgs = buildAppStableRhythmLaneEffectArgsContractProbe({
      bassNoteAction: {
        ...args.bassNoteAction,
        audioCtx,
      },
      myzelLayerStepAction: {
        ...args.myzelLayerStepAction,
        audioCtx,
        resolveBaseHz: () => args.myzelLayerStepAction.bassRootMode === 'fixed'
          ? args.myzelLayerStepAction.bassRootHz
          : args.myzelLayerStepAction.readInterpreterMyzelBaseHz(),
      },
      boundaryPorts: {
        ...args.boundaryPorts,
        readDrumStyle: () => readDrumStyle({
          drumEdge: nexusParamsRef.current.drumEdge,
          drumSoftness: nexusParamsRef.current.drumSoftness,
          drumAir: nexusParamsRef.current.drumAir,
          drumSnap: nexusParamsRef.current.drumSnap,
          grooveSwing: nexusParamsRef.current.grooveSwing,
        }),
        resolveCurrentBassRootHz: () => resolveBassRootHz({
          bassRootMode: nexusParamsRef.current.bassRootMode,
          bassRootHz: nexusParamsRef.current.bassRootHz,
          cursorY: nexusRefs.current.cursorY,
          freqFromY: args.freqFromY,
        }),
        resolveGrooveState: (timeSec) => grooveStateFromMycelium(args.myceliumSnapshotRef.current, timeSec),
        readQuantizeBpm: () => nexusParamsRef.current.quantizeBpm,
        readMetronomeAudioNowSec: () => audioCtx.currentTime,
      },
      schedulerLoop: {
        ...args.schedulerLoop,
        audioCtx,
        drumMachine,
        readStableMusicLaneBeatWorkletOnly: args.readStableMusicLaneBeatWorkletOnly,
      },
      effectArgsContractExtractedFromAppTsx: true,
      reactLifecycleStillAppEffectOwned: true,
      schedulerLoopStillProbeOwned: true,
      hotPathAddsNoPerStepBuilder: true,
    });

    return startAppStableRhythmLaneSchedulerLoopProbe(stableRhythmLaneEffectArgs.schedulerLoopArgs);
  }, [
    args.audioCtx,
    args.nexusActive,
    args.myzelLayerStepAction.myzelEnabled,
    args.myzelLayerStepAction.myzelPattern,
    args.myzelLayerStepAction.myzelStep16ths,
    args.myzelLayerStepAction.myzelBallMode,
    args.myzelLayerStepAction.myzelNodeMode,
    args.myzelLayerStepAction.intensityGlobal,
    args.myzelLayerStepAction.bassRootMode,
    args.myzelLayerStepAction.bassRootHz,
    args.myzelLayerStepAction.myzelInterpreterMix.hybridBlend,
    args.myzelLayerStepAction.myzelInterpreterMix.weaveBlend,
    args.myzelLayerStepAction.myzelInterpreterMix.constellationBlend,
    args.myzelLayerStepAction.myzelInterpreterMix.driveAmount,
    args.myzelLayerStepAction.myzelInterpreterMix.driveResponse,
    args.schedulerLoop.selectedExportedDrumConfig,
    args.boundaryPorts.scheduleStableRhythmMetronomePulse,
    args.schedulerLoop.clearStableRhythmMetronomeTimeouts,
    args.readStableMusicLaneBeatWorkletOnly,
  ]);
};
