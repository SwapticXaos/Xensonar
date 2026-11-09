import {
  recordAudioPressureAdaptiveAction,
  recordAudioPressureCount,
} from "../../../core/audio/audioPressureMap";
import type { ParticleAudioIntentRuntimePolicy } from "../performanceCrisis/performanceCrisisRuntimePolicies";
import { recordParticleVoicePoolOverflowDeferred } from "../audio/particleVoicePoolLiveReport";
import {
  resolveCrisisQuantizedEventTime,
  resolveCrisisQuantizationStepSec,
} from "../performanceCrisis/crisisQuantizationFallbackPolicy";
import {
  resolveParticleCrisisPressure,
  resolveParticleDeferredDueTime,
  resolveParticleFlushAdmissionContract,
} from "../performanceCrisis/particleCrisisAgencyPolicy";
import { getAudioNowSec } from "../../../core/time/unifiedTime";
import {
  createSharedAudioTimeSnapshot,
  commitSharedAudioTimeAnchor,
} from "./sharedAudioTimeContract";
import {
  createQueuedParticleCollisionTrigger,
  type QueuedCollisionTrigger,
} from "../../soundLibrary/particlePitchRouting";
import { resolveParticlePlaybackPresetId } from "../../soundLibrary/particleSoundAdapter";
import {
  isWaveCollisionTargetMuted,
  resolveEffectiveAgentEnabled,
} from "../../topology/effectiveParticleMask";
import type { QuantizeGrid } from "../domain/instrumentData";
import type { NexusAgent } from "../domain/runtimeTypes";
import type { AppNexusParams } from "../rooms/nexusParamsInitialState";
import {
  getAnchoredQuantizeDueTime,
  isQuantizedTrafficRecoveryFlush,
  isQuantizedTrafficTriggerStale,
  mergeQueuedCollisionTrigger,
  resolveQuantizedTrafficMicroJitterSec,
  resolveTrafficQuantizeSchedule,
} from "../rooms/audioTrafficQuantize";
import {
  cancelQuantizedTrafficAnimationFrame,
  clearQuantizedTrafficFlushInterval,
  scheduleQuantizedTrafficAnimationFrame,
  startQuantizedTrafficFlushInterval,
  type QuantizedTrafficTimerRefs,
} from "./quantizedTrafficTimerRegistry";

export type QuantizedCollisionNexusRefs = {
  nextAbsoluteStep?: number | null;
  agents?: NexusAgent[];
  cursorY: number;
  delayNode?: DelayNode | null;
};

export type QuantizedCollisionLiveParams = Pick<
  AppNexusParams,
  | "agentEnabled"
  | "agentVolumes"
  | "echoOn"
  | "particleMute"
  | "particlePreset"
  | "particleVolume"
  | "quantizeOn"
>;

export type QuantizedCollisionRuntimeRefs = QuantizedTrafficTimerRefs & {
  quantizeAnchorRef: { current: number | null };
  nexusRefs: { current: QuantizedCollisionNexusRefs };
  nexusParamsRef: { current: QuantizedCollisionLiveParams };
  waveCollisionQueueRef: { current: QueuedCollisionTrigger[] };
  particleQuantizeSeenRef: { current: number[] };
};

export type QuantizedCollisionRuntimeArgs = {
  audioCtx: AudioContext | null;
  room: string;
  gridTempoBpm: number;
  quantizeGrid: QuantizeGrid;
  quantizeReferenceBars?: number;
  refs: QuantizedCollisionRuntimeRefs;
  freqFromY: (y: number) => number;
  clamp: (value: number, min: number, max: number) => number;
  playNexusAgentTone: (
    freq: number,
    amp: number,
    send?: DelayNode | AudioNode,
    startAt?: number,
    preset?: string,
    position?: { x: number; y: number },
    targetKind?: "particle" | "resident",
    rootFreq?: number,
  ) => void;
  getAudioPressureBias?: () => number;
  getParticlePolicy?: () => ParticleAudioIntentRuntimePolicy;
};

function resolveAgentAudioIntentHit(agent: NexusAgent) {
  const hit = agent.lastAudioIntentHit ?? agent.lastHit ?? 0;
  return Number.isFinite(hit) ? hit : 0;
}

function snapshotAgentHits(refs: QuantizedCollisionRuntimeRefs) {
  return (refs.nexusRefs.current.agents ?? []).map((agent) =>
    resolveAgentAudioIntentHit(agent),
  );
}

export function stopQuantizedCollisionRuntime(
  refs: QuantizedCollisionRuntimeRefs,
) {
  cancelQuantizedTrafficAnimationFrame(
    refs,
    "quantized-collision-runtime-stop-raf",
  );
  clearQuantizedTrafficFlushInterval(
    refs,
    "quantized-collision-runtime-stop-interval",
  );
  refs.waveCollisionQueueRef.current = [];
  refs.particleQuantizeSeenRef.current = [];
}

function resolveLocalFlushPressureBias(
  dueCount: number,
  retainedCount: number,
  audioPressureBias: number,
) {
  return resolveParticleCrisisPressure({
    audioPressureBias,
    dueCount,
    retainedCount,
  });
}

function deferOverflowTraffic(args: {
  nowSec: number;
  admittedTotal: number;
  admittedResidents: number;
  dueItems: QueuedCollisionTrigger[];
  liveParams: QuantizedCollisionLiveParams;
  maxTotal: number;
  maxResidents: number;
  deferBaseSec: number;
  deferLaneSec: number;
  stepSec: number;
  anchorSec: number;
  pressureBias: number;
  gridTempoBpm: number;
  particlePolicy?: ParticleAudioIntentRuntimePolicy;
}) {
  const deferred: QueuedCollisionTrigger[] = [];
  let admittedTotal = args.admittedTotal;
  let admittedResidents = args.admittedResidents;
  for (const item of args.dueItems) {
    if (
      isWaveCollisionTargetMuted(item.targetKind, args.liveParams.particleMute)
    )
      continue;
    const residentBlocked =
      item.targetKind === "resident" && admittedResidents >= args.maxResidents;
    const tickBlocked = admittedTotal >= args.maxTotal;
    if (residentBlocked || tickBlocked) {
      const lane = deferred.length;
      const nextDueTime = resolveParticleDeferredDueTime({
        policy: args.particlePolicy,
        nowSec: args.nowSec,
        lane,
        stepSec: args.stepSec,
        anchorSec: args.anchorSec,
        pressureBias: args.pressureBias,
        gridTempoBpm: args.gridTempoBpm,
        baseDelaySec: args.deferBaseSec,
        laneDelaySec: args.deferLaneSec,
        getAnchoredDueTime: getAnchoredQuantizeDueTime,
      });
      const microJitterSec = resolveQuantizedTrafficMicroJitterSec({
        sourceKey: item.sourceKey ?? `${item.targetKind}:${lane}`,
        targetKind: item.targetKind,
        macroDueTime: nextDueTime,
        stepSec: args.stepSec,
        mode: "overflow",
        salt: `${args.particlePolicy?.crisisMode ?? "legacy"}:${lane}`,
      });
      const looseDueTime = nextDueTime + microJitterSec;
      deferred.push({
        ...item,
        dueTime: looseDueTime,
        macroDueTime:
          args.particlePolicy?.crisisMode === "quantization-pyramid"
            ? nextDueTime
            : looseDueTime,
      });
      continue;
    }
    admittedTotal += 1;
    if (item.targetKind === "resident") admittedResidents += 1;
  }
  return deferred;
}

export function startQuantizedCollisionRuntime(
  args: QuantizedCollisionRuntimeArgs,
) {
  const { audioCtx, room, refs } = args;
  if (!audioCtx || room !== "RESONANCE") return () => undefined;

  const stop = () => stopQuantizedCollisionRuntime(refs);

  if (!refs.nexusParamsRef.current.quantizeOn) {
    stop();
    return stop;
  }

  refs.waveCollisionQueueRef.current = [];
  refs.particleQuantizeSeenRef.current = snapshotAgentHits(refs);

  const loop = () => {
    const liveParams = refs.nexusParamsRef.current;
    const effectiveAgentEnabled = resolveEffectiveAgentEnabled(
      liveParams.agentEnabled,
      liveParams.particleMute,
    );
    if (!liveParams.quantizeOn) {
      scheduleQuantizedTrafficAnimationFrame(refs, loop, {
        stage: "loop-continue-disabled",
        quantizeGrid: args.quantizeGrid,
        gridTempoBpm: args.gridTempoBpm,
      });
      return;
    }

    const agents = refs.nexusRefs.current.agents ?? [];
    if (refs.particleQuantizeSeenRef.current.length !== agents.length) {
      refs.particleQuantizeSeenRef.current = snapshotAgentHits(refs);
    }

    const sharedTime = createSharedAudioTimeSnapshot({
      audioCtx,
      bpm: args.gridTempoBpm,
      quantizeGrid: args.quantizeGrid,
      quantizeReferenceBars: args.quantizeReferenceBars,
      currentAnchorSec: refs.quantizeAnchorRef.current,
    });
    commitSharedAudioTimeAnchor(refs.quantizeAnchorRef, sharedTime);
    const now = sharedTime.audioNowSec;
    const step = sharedTime.quantizeStepSec;
    const anchor = sharedTime.anchorSec;
    const baseFreq = args.freqFromY(refs.nexusRefs.current.cursorY);
    const particlePolicy = args.getParticlePolicy?.();
    const pressureBias = resolveParticleCrisisPressure({
      audioPressureBias: args.getAudioPressureBias?.() ?? 0,
      retainedCount: refs.waveCollisionQueueRef.current.length,
      activeAgentCount: agents.length,
    });

    for (let i = 0; i < agents.length; i += 1) {
      const hit = resolveAgentAudioIntentHit(agents[i]);
      const lastSeen = refs.particleQuantizeSeenRef.current[i] ?? 0;
      if (!Number.isFinite(hit) || hit <= lastSeen) continue;

      refs.particleQuantizeSeenRef.current[i] = hit;
      if (!(effectiveAgentEnabled[i] ?? true)) continue;

      const hitGain = args.clamp(
        agents[i].lastAudioIntentGain ?? agents[i].lastHitGain ?? 1,
        0,
        1,
      );
      const vol = liveParams.particleVolume * (liveParams.agentVolumes[i] ?? 1);
      const ampWithWave = vol * Math.pow(hitGain, 2.2);
      const resolvedQueuedParticlePreset = resolveParticlePlaybackPresetId(
        liveParams.particlePreset,
      );
      const amp =
        resolvedQueuedParticlePreset === "crystal_bowl"
          ? Math.min(ampWithWave, 0.24)
          : ampWithWave;
      const sourceKey = `particle:${i}`;
      const hitAudioTimeSec = Number.isFinite(
        agents[i].lastAudioIntentAudioTimeSec ?? NaN,
      )
        ? Number(agents[i].lastAudioIntentAudioTimeSec)
        : Number.isFinite(agents[i].lastHitAudioTimeSec ?? NaN)
          ? Number(agents[i].lastHitAudioTimeSec)
          : now - Math.max(0, (performance.now() - hit) / 1000);
      const quantizedSchedule = resolveCrisisQuantizedEventTime({
        policy: particlePolicy?.quantization,
        pressureBias,
        nowSec: now,
        eventTimeSec: hitAudioTimeSec,
        bpm: args.gridTempoBpm,
        anchorSec: anchor,
        getAnchoredDueTime: getAnchoredQuantizeDueTime,
      });
      const schedule = quantizedSchedule.decision.active
        ? {
            dueTime: quantizedSchedule.dueTime,
            macroDueTime: quantizedSchedule.macroDueTime,
          }
        : resolveTrafficQuantizeSchedule({
            nowSec: now,
            stepSec: step,
            anchorSec: anchor,
            sourceKey,
            targetKind: "particle",
            eventTimeSec: hitAudioTimeSec,
          });
      mergeQueuedCollisionTrigger(refs.waveCollisionQueueRef.current, {
        ...createQueuedParticleCollisionTrigger({
          dueTime: schedule.dueTime,
          rootFreq: baseFreq,
          ratio: agents[i].ratio,
          amp,
          preset: liveParams.particlePreset,
          x: agents[i].lastAudioIntentX ?? agents[i].lastHitX ?? agents[i].x,
          y: agents[i].lastAudioIntentY ?? agents[i].lastHitY ?? agents[i].y,
          waveGain: hitGain,
          minHz: 40,
          maxHz: 2400,
        }),
        sourceKey,
        macroDueTime: schedule.macroDueTime,
      });
    }

    scheduleQuantizedTrafficAnimationFrame(refs, loop, {
      stage: "loop-continue",
      quantizeGrid: args.quantizeGrid,
      gridTempoBpm: args.gridTempoBpm,
    });
  };

  scheduleQuantizedTrafficAnimationFrame(refs, loop, {
    stage: "loop-start",
    quantizeGrid: args.quantizeGrid,
    gridTempoBpm: args.gridTempoBpm,
  });
  let previousFlushAudioTime = getAudioNowSec(audioCtx);
  startQuantizedTrafficFlushInterval(
    refs,
    () => {
      const audioNow = getAudioNowSec(audioCtx);
      const recoveringFromControlStall = isQuantizedTrafficRecoveryFlush({
        currentTimeSec: audioNow,
        previousFlushTimeSec: previousFlushAudioTime,
      });
      previousFlushAudioTime = audioNow;
      const now = audioNow + 0.02;
      const flushSharedTime = createSharedAudioTimeSnapshot({
        audioCtx,
        bpm: args.gridTempoBpm,
        quantizeGrid: args.quantizeGrid,
        quantizeReferenceBars: args.quantizeReferenceBars,
        currentAnchorSec: refs.quantizeAnchorRef.current,
      });
      commitSharedAudioTimeAnchor(refs.quantizeAnchorRef, flushSharedTime);
      const queue: QueuedCollisionTrigger[] =
        refs.waveCollisionQueueRef.current;
      const dueItems: QueuedCollisionTrigger[] = [];
      let retainedCount = 0;

      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        if (item.dueTime <= now) {
          if (recoveringFromControlStall && isQuantizedTrafficTriggerStale({ dueTime: item.dueTime, currentTimeSec: audioNow })) {
            recordAudioPressureCount(
              item.targetKind === "resident" ? "resident-synth-tone" : "particle-synth-tone",
              "voice-rejected",
              1,
            );
            recordAudioPressureAdaptiveAction("safe-envelope-stale-dropped", 1);
            continue;
          }
          dueItems.push(item);
        } else {
          queue[retainedCount] = item;
          retainedCount += 1;
        }
      }

      if (dueItems.length === 0) {
        if (retainedCount !== queue.length) queue.length = retainedCount;
        return;
      }

      queue.length = retainedCount;
      dueItems.sort((a, b) => b.amp - a.amp);
      const particlePolicy = args.getParticlePolicy?.();
      const pressureBias = resolveLocalFlushPressureBias(
        dueItems.length,
        retainedCount,
        args.getAudioPressureBias?.() ?? 0,
      );
      const flushContract = resolveParticleFlushAdmissionContract(
        particlePolicy,
        pressureBias,
      );
      if (flushContract.maxTotal <= 4)
        recordAudioPressureAdaptiveAction("flush-reduced-to-4", 1);
      else if (flushContract.maxTotal <= 5)
        recordAudioPressureAdaptiveAction("flush-reduced-to-5", 1);
      if (flushContract.maxResidents <= 1)
        recordAudioPressureAdaptiveAction("resident-reduced-to-1", 1);
      let admittedTotal = 0;
      let admittedResidents = 0;
      const overflowCandidates: QueuedCollisionTrigger[] = [];

      for (const item of dueItems) {
        if (
          isWaveCollisionTargetMuted(
            item.targetKind,
            refs.nexusParamsRef.current.particleMute,
          )
        )
          continue;
        const residentBlocked =
          item.targetKind === "resident" &&
          admittedResidents >= flushContract.maxResidents;
        const tickBlocked = admittedTotal >= flushContract.maxTotal;
        if (residentBlocked || tickBlocked) {
          recordAudioPressureCount(
            item.targetKind === "resident"
              ? "resident-synth-tone"
              : "particle-synth-tone",
            "voice-deferred",
            1,
          );
          recordParticleVoicePoolOverflowDeferred({
            sourceKind: item.targetKind === "resident" ? "resident" : "particle",
            count: 1,
            reason: residentBlocked ? "resident-limit" : tickBlocked ? "tick-limit" : "unknown",
          });
          overflowCandidates.push(item);
          continue;
        }
        const send =
          refs.nexusParamsRef.current.echoOn && refs.nexusRefs.current.delayNode
            ? refs.nexusRefs.current.delayNode
            : undefined;
        args.playNexusAgentTone(
          item.freq,
          item.amp,
          send,
          item.dueTime,
          item.preset,
          item.targetKind === "resident" ? undefined : { x: item.x, y: item.y },
          item.targetKind,
          item.rootFreq,
        );
        admittedTotal += 1;
        if (item.targetKind === "resident") admittedResidents += 1;
      }

      if (overflowCandidates.length > 0) {
        recordAudioPressureAdaptiveAction(
          "overflow-deferred",
          overflowCandidates.length,
        );
        recordParticleVoicePoolOverflowDeferred({
          sourceKind: overflowCandidates.some((candidate) => candidate.targetKind === "resident") ? "resident" : "particle",
          count: overflowCandidates.length,
          reason: "overflow-deferred",
        });
        refs.waveCollisionQueueRef.current.push(
          ...deferOverflowTraffic({
            nowSec: now,
            admittedTotal,
            admittedResidents,
            dueItems: overflowCandidates,
            liveParams: refs.nexusParamsRef.current,
            maxTotal: flushContract.maxTotal,
            maxResidents: flushContract.maxResidents,
            deferBaseSec: flushContract.deferBaseSec,
            deferLaneSec: flushContract.deferLaneSec,
            stepSec: particlePolicy?.quantization
              ? resolveCrisisQuantizationStepSec({
                  bpm: args.gridTempoBpm,
                  grid: particlePolicy.quantization.grid,
                  customSegmentsPerBar:
                    particlePolicy.quantization.customSegmentsPerBar,
                })
              : flushSharedTime.quantizeStepSec,
            anchorSec: flushSharedTime.anchorSec,
            pressureBias,
            gridTempoBpm: args.gridTempoBpm,
            particlePolicy,
          }),
        );
      }
    },
    20,
    { quantizeGrid: args.quantizeGrid, gridTempoBpm: args.gridTempoBpm },
  );

  return stop;
}
