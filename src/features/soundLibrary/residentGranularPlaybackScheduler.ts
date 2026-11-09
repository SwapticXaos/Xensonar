import { recordAudioPressureCount } from '../../core/audio/audioPressureMap';

const MATERIAL_WINDOW_CURVE = new Float32Array(96).map((_, index, array) => {
  const t = array.length <= 1 ? 0 : index / Math.max(1, array.length - 1);
  return Math.sin(Math.PI * t) ** 1.45;
});

const LOOKAHEAD_SEC = 0.12;
const LATE_GRAIN_DROP_SEC = 0.025;
const SCHEDULER_TICK_MS = 20;
const MAX_STARTS_PER_TICK = 12;
const MAX_STARTS_PER_JOB_PER_TICK = 8;
const MAX_ACTIVE_GRAINS = 96;

type ActiveResidentGrain = {
  source: AudioBufferSourceNode;
  gain: GainNode;
};

type ResidentGranularJob = {
  destination: AudioNode;
  buffer: AudioBuffer;
  noteStart: number;
  noteEnd: number;
  nominalDur: number;
  safeRate: number;
  grainDurOut: number;
  grainSpacing: number;
  jitterRatio: number;
  latticePhase: number;
  grainCount: number;
  safeOffsetSec: number;
  maxSrcStart: number;
  srcTravel: number;
  nextIndex: number;
  active: Set<ActiveResidentGrain>;
  cancelled: boolean;
};

type ResidentGranularScheduler = {
  ctx: AudioContext;
  jobs: ResidentGranularJob[];
  timer: number | null;
  rotation: number;
  activeGrainCount: number;
  nextJobOrdinal: number;
};

const schedulers = new WeakMap<AudioContext, ResidentGranularScheduler>();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function materialElasticSettings(playbackRate: number, nominalDur: number) {
  const safeRate = clamp(playbackRate, 0.16, 9.5);
  const pitchStretch = Math.abs(Math.log2(Math.max(0.0001, safeRate)));
  const grainDurOut = clamp(0.088 - pitchStretch * 0.008 + nominalDur * 0.11, 0.058, 0.2);
  const overlapRatio = 0.9;
  const grainSpacing = Math.max(0.004, grainDurOut * (1 - overlapRatio));
  return { safeRate, grainDurOut, grainSpacing, jitterRatio: 0.004 };
}

function getScheduler(ctx: AudioContext): ResidentGranularScheduler {
  const existing = schedulers.get(ctx);
  if (existing) return existing;
  const scheduler: ResidentGranularScheduler = {
    ctx,
    jobs: [],
    timer: null,
    rotation: 0,
    activeGrainCount: 0,
    nextJobOrdinal: 0,
  };
  schedulers.set(ctx, scheduler);
  return scheduler;
}

function disposeGrain(
  scheduler: ResidentGranularScheduler,
  job: ResidentGranularJob,
  grain: ActiveResidentGrain,
) {
  if (!job.active.delete(grain)) return;
  scheduler.activeGrainCount = Math.max(0, scheduler.activeGrainCount - 1);
  try { grain.source.disconnect(); } catch {}
  try { grain.gain.disconnect(); } catch {}
}

function cancelJob(scheduler: ResidentGranularScheduler, job: ResidentGranularJob) {
  if (job.cancelled) return;
  job.cancelled = true;
  const index = scheduler.jobs.indexOf(job);
  if (index >= 0) scheduler.jobs.splice(index, 1);
  for (const grain of [...job.active]) {
    try { grain.source.stop(); } catch {}
    disposeGrain(scheduler, job, grain);
  }
  if (scheduler.jobs.length === 0 && scheduler.timer !== null) {
    window.clearTimeout(scheduler.timer);
    scheduler.timer = null;
  }
}

function grainStartTime(job: ResidentGranularJob, index: number) {
  return job.noteStart + Math.min(job.nominalDur, index * job.grainSpacing);
}

function scheduleOneGrain(
  scheduler: ResidentGranularScheduler,
  job: ResidentGranularJob,
  index: number,
  intendedWhen: number,
): 'started' | 'capacity' | 'failed' {
  if (scheduler.activeGrainCount >= MAX_ACTIVE_GRAINS) return 'capacity';
  const { ctx } = scheduler;
  const when = Math.max(intendedWhen, ctx.currentTime + 0.002);
  const progress = job.grainCount <= 1 ? 0 : index / Math.max(1, job.grainCount - 1);
  const jitter = Math.sin((index + 1) * 1.618 + job.latticePhase)
    * job.grainDurOut
    * job.safeRate
    * job.jitterRatio;
  const srcStart = clamp(
    job.safeOffsetSec + job.srcTravel * progress + jitter,
    job.safeOffsetSec,
    job.maxSrcStart,
  );
  let source: AudioBufferSourceNode | null = null;
  let grainGain: GainNode | null = null;
  let grain: ActiveResidentGrain | null = null;
  let started = false;
  try {
    source = ctx.createBufferSource();
    grainGain = ctx.createGain();
    grain = { source, gain: grainGain };
    job.active.add(grain);
    scheduler.activeGrainCount += 1;
    source.buffer = job.buffer;
    source.playbackRate.setValueAtTime(job.safeRate, when);
    const actualGrainOut = Math.max(0.014, Math.min(job.grainDurOut, job.noteEnd - when));
    grainGain.gain.setValueCurveAtTime(MATERIAL_WINDOW_CURVE, when, actualGrainOut);
    source.connect(grainGain);
    grainGain.connect(job.destination);
    source.onended = () => {
      if (grain) disposeGrain(scheduler, job, grain);
    };
    const bufferDurationArg = Math.max(
      0.012,
      Math.min(job.buffer.duration - srcStart, actualGrainOut * job.safeRate * 1.12),
    );
    source.start(when, srcStart, bufferDurationArg);
    started = true;
    source.stop(Math.min(job.noteEnd + 0.03, when + actualGrainOut + 0.02));
    return 'started';
  } catch {
    if (started) {
      try { source?.stop(); } catch {}
    }
    if (grain) disposeGrain(scheduler, job, grain);
    else {
      try { source?.disconnect(); } catch {}
      try { grainGain?.disconnect(); } catch {}
    }
    return 'failed';
  }
}

function scheduleNextTick(scheduler: ResidentGranularScheduler) {
  if (scheduler.timer !== null || scheduler.jobs.length === 0) return;
  scheduler.timer = window.setTimeout(() => runSchedulerTick(scheduler), SCHEDULER_TICK_MS);
}

function runSchedulerTick(scheduler: ResidentGranularScheduler) {
  scheduler.timer = null;
  const { ctx } = scheduler;
  if (ctx.state !== 'running') {
    for (const job of [...scheduler.jobs]) cancelJob(scheduler, job);
    return;
  }

  const now = ctx.currentTime;
  const horizon = now + LOOKAHEAD_SEC;
  const jobs = scheduler.jobs.filter((job) => !job.cancelled);
  if (jobs.length === 0) return;
  const rotation = scheduler.rotation % jobs.length;
  const orderedJobs = [...jobs.slice(rotation), ...jobs.slice(0, rotation)];
  const startsByJob = new Map<ResidentGranularJob, number>();
  let started = 0;
  let skipped = 0;
  let capacityBlocked = false;

  while (started < MAX_STARTS_PER_TICK) {
    let advancedThisPass = false;
    for (const job of orderedJobs) {
      if (job.cancelled || started >= MAX_STARTS_PER_TICK) break;
      if ((startsByJob.get(job) ?? 0) >= MAX_STARTS_PER_JOB_PER_TICK) continue;
      while (job.nextIndex < job.grainCount) {
        const when = grainStartTime(job, job.nextIndex);
        if (when >= job.noteEnd - 0.003) {
          job.nextIndex = job.grainCount;
          break;
        }
        if (when < now - LATE_GRAIN_DROP_SEC) {
          job.nextIndex += 1;
          skipped += 1;
          advancedThisPass = true;
          continue;
        }
        if (when > horizon) break;
        const outcome = scheduleOneGrain(scheduler, job, job.nextIndex, when);
        if (outcome === 'capacity') {
          capacityBlocked = true;
          break;
        }
        job.nextIndex += 1;
        advancedThisPass = true;
        if (outcome === 'started') {
          started += 1;
          startsByJob.set(job, (startsByJob.get(job) ?? 0) + 1);
        }
        break;
      }
      if (capacityBlocked) break;
    }
    if (!advancedThisPass || capacityBlocked) break;
  }

  if (started > 0) {
    recordAudioPressureCount('resident-elastic-grain', 'buffer-source-start', started);
    recordAudioPressureCount('resident-elastic-grain', 'gain-node-create', started);
  }
  if (skipped > 0) {
    recordAudioPressureCount('resident-elastic-grain', 'async-sample-late-start', skipped);
  }
  scheduler.jobs = scheduler.jobs.filter((job) => !job.cancelled && job.nextIndex < job.grainCount);
  scheduler.rotation = scheduler.jobs.length > 0 ? (rotation + 1) % scheduler.jobs.length : 0;
  scheduleNextTick(scheduler);
}

export function scheduleElasticResidentSample(args: {
  ctx: AudioContext;
  destination: AudioNode;
  buffer: AudioBuffer;
  noteStart: number;
  noteEnd: number;
  nominalDur: number;
  playbackRate: number;
}) {
  const { ctx, destination, buffer, noteStart, noteEnd, nominalDur, playbackRate } = args;
  const { safeRate, grainDurOut, grainSpacing, jitterRatio } = materialElasticSettings(playbackRate, nominalDur);
  const grainCount = Math.max(10, Math.ceil(Math.max(0.001, noteEnd - noteStart) / grainSpacing) + 1);
  const safeOffsetSec = 0;
  const sliceDurationSec = Math.max(0.01, buffer.duration - safeOffsetSec);
  const srcGrainDur = Math.max(0.014, Math.min(sliceDurationSec, grainDurOut * safeRate * 1.12));
  const maxSrcStart = Math.max(safeOffsetSec, safeOffsetSec + sliceDurationSec - srcGrainDur);
  const scheduler = getScheduler(ctx);
  const jobOrdinal = scheduler.nextJobOrdinal;
  scheduler.nextJobOrdinal += 1;
  const job: ResidentGranularJob = {
    destination,
    buffer,
    noteStart,
    noteEnd,
    nominalDur,
    safeRate,
    grainDurOut,
    grainSpacing,
    jitterRatio,
    // Golden-angle phase rotation prevents simultaneous notes from reading the
    // same source lattice and forming a correlated comb-filter spike.
    latticePhase: (jobOrdinal * 2.399963229728653) % (Math.PI * 2),
    grainCount,
    safeOffsetSec,
    maxSrcStart,
    srcTravel: Math.max(0, maxSrcStart - safeOffsetSec),
    nextIndex: 0,
    active: new Set(),
    cancelled: false,
  };
  scheduler.jobs.push(job);
  if (scheduler.timer === null) runSchedulerTick(scheduler);
  return () => cancelJob(scheduler, job);
}

export const RESIDENT_GRANULAR_RUNTIME_LIMITS = {
  lookaheadSec: LOOKAHEAD_SEC,
  lateDropSec: LATE_GRAIN_DROP_SEC,
  tickMs: SCHEDULER_TICK_MS,
  maxStartsPerTick: MAX_STARTS_PER_TICK,
  maxStartsPerJobPerTick: MAX_STARTS_PER_JOB_PER_TICK,
  maxActiveGrains: MAX_ACTIVE_GRAINS,
} as const;
