import type { MutableRefObject } from 'react';
import { recordAudioPressureAdaptiveAction } from '../../../core/audio/audioPressureMap';
import type { DrumMachine } from '../../resonance/drumMachine';
import {
  buildStableRhythmLaneStepPlan,
  executeStableRhythmLaneStepPlan,
  resolveStableRhythmLaneTimeWindow,
} from '../audio/stableRhythmLane';
import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import type { AppNexusParams } from '../rooms/nexusParamsInitialState';
import {
  buildAppStableRhythmLaneSchedulerCompactCallsiteSource,
  buildAppStableRhythmLaneSchedulerStepPlanArgs,
} from './appStableRhythmLaneSchedulerCallsiteSourceProbe';
import { buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe } from './appStableRhythmLaneSchedulerStepActionBoundaryArgsBuilderProbe';
import { executeAppStableRhythmLaneSchedulerStepActionBoundary } from './appStableRhythmLaneSchedulerStepActionBoundary';
import type { AppStableRhythmLaneSchedulerBoundaryPorts } from './appStableRhythmLaneSchedulerBoundaryPortsContractProbe';

export type AppStableRhythmLaneSchedulerLoopNexusRefsProbe = MutableRefObject<{
  nextAbsoluteStep?: number | null;
}>;

export type AppStableRhythmLaneSchedulerLoopProbeArgs = {
  readonly audioCtx: AudioContext;
  readonly nexusParamsRef: MutableRefObject<AppNexusParams>;
  readonly nexusRefs: AppStableRhythmLaneSchedulerLoopNexusRefsProbe;
  readonly selectedExportedDrumConfig: DrumConfigEntry | null;
  readonly drumMachine: DrumMachine;
  readonly boundaryPorts: AppStableRhythmLaneSchedulerBoundaryPorts;
  readonly clearStableRhythmMetronomeTimeouts: () => void;
  readonly reactLifecycleStillAppEffectOwned: true;
  readonly schedulerLoopExtractedFromAppTsx: true;
  readonly timerResponsibilityNowInLoopProbe: true;
  readonly nextAbsoluteStepTimeTruthStillAppNexusRef: true;
  readonly browserFunctionalSanityRequiredAfterThisCut: true;
  readonly readStableMusicLaneBeatWorkletOnly?: () => boolean;
};

export type AppStableRhythmLaneSchedulerLoopProbeCleanup = () => void;

export const startAppStableRhythmLaneSchedulerLoopProbe = (
  args: AppStableRhythmLaneSchedulerLoopProbeArgs,
): AppStableRhythmLaneSchedulerLoopProbeCleanup => {
  let timerID = 0;

  const schedule = () => {
    const p = args.nexusParamsRef.current;
    const stableRhythmLaneSchedulerSource = buildAppStableRhythmLaneSchedulerCompactCallsiteSource({
      audioCtx: args.audioCtx,
      nexusActive: true,
      bpm: p.quantizeBpm,
      nextStep: args.nexusRefs.current.nextAbsoluteStep,
    });
    const prefillWindow = resolveStableRhythmLaneTimeWindow(stableRhythmLaneSchedulerSource.timeWindowArgs);
    const stepMs = prefillWindow.stepDurationSec;
    const now = prefillWindow.audioNowSec;
    let nextStep = prefillWindow.nextStep;
    let plannedStableStepsThisTick = 0;

    while (nextStep * stepMs < prefillWindow.scheduleUntilSec && plannedStableStepsThisTick < prefillWindow.maxStepsPerTick) {
      const nextNoteTime = nextStep * stepMs;
      const stationaryPlan = buildStableRhythmLaneStepPlan(buildAppStableRhythmLaneSchedulerStepPlanArgs({
        absoluteStep: nextStep,
        timeSec: nextNoteTime,
        stepDurationSec: stepMs,
        audioNowSec: now,
        minAheadSec: prefillWindow.minAheadSec,
      }));

      if (stationaryPlan.stale) {
        executeStableRhythmLaneStepPlan(stationaryPlan, {});
        nextStep += 1;
        plannedStableStepsThisTick += 1;
        continue;
      }

      const stableRhythmLaneStepActionBoundaryArgs = buildAppStableRhythmLaneSchedulerStepActionBoundaryArgsProbe({
        stationaryPlan,
        params: p,
        stepDurationSec: stepMs,
        selectedExportedDrumConfig: args.selectedExportedDrumConfig,
        drumMachine: args.drumMachine,
        boundaryPorts: args.boundaryPorts,
        transportStillAppOwned: true,
        nextAbsoluteStepStillAppOwned: true,
        staleGuardAlreadyPassed: true,
        schedulerLoopStillAppOwned: true,
        stepPlanningStillAppOwned: true,
        suppressLegacyDrumWhenStableMusicLaneBeatRunning: args.readStableMusicLaneBeatWorkletOnly?.() === true,
      });

      executeAppStableRhythmLaneSchedulerStepActionBoundary(stableRhythmLaneStepActionBoundaryArgs.args);

      nextStep += 1;
      plannedStableStepsThisTick += 1;
    }
    if (nextStep * stepMs < prefillWindow.scheduleUntilSec) {
      recordAudioPressureAdaptiveAction('stable-rhythm-prefill-capped', 1);
    }
    args.nexusRefs.current.nextAbsoluteStep = nextStep;
    timerID = window.setTimeout(schedule, stableRhythmLaneSchedulerSource.tickConfig.timerIntervalMs);
  };

  schedule();
  return () => {
    window.clearTimeout(timerID);
    args.clearStableRhythmMetronomeTimeouts();
  };
};
