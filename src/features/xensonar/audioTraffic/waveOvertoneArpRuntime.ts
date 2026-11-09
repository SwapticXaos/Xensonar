import { getAudioNowSec } from '../../../core/time/unifiedTime';
import type { TransientEventPlan } from '../../resonance/transientRuntime';
import { markAudioTrafficEvent, updateWaveOvertoneArpTrafficState, type AudioTrafficForensicsState } from './audioTrafficForensics';

export type WaveOvertoneArpQueueEntry = {
  dueTime: number;
  freq: number;
  amp: number;
  duration: number;
  waveform: OscillatorType;
  cutoff: number;
  q: number;
  prominence: number;
};

export type WaveOvertoneArpRuntimeRefs = {
  waveOvertoneArpQueueRef: { current: WaveOvertoneArpQueueEntry[] };
  waveOvertoneArpTimerRef: { current: number | null };
  trafficRef?: { current: AudioTrafficForensicsState };
};

export type WaveOvertoneArpRuntimeArgs = {
  audioCtx: AudioContext | null;
  getAudioCtx?: () => AudioContext | null;
  room: string;
  refs: WaveOvertoneArpRuntimeRefs;
  beginTransientEvent: (source: 'other', requestedVoices: number, intensity?: number) => TransientEventPlan;
  playScheduledTone: (
    freq: number,
    offset: number,
    dur: number,
    type: OscillatorType,
    volume: number,
    q?: number,
    cutoff?: number,
    targetDestinations?: AudioNode | Array<AudioNode | null | undefined> | null,
    options?: {
      source?: 'other';
      plan?: TransientEventPlan | null;
      prominence?: number;
      intendedStartTimeSec?: number;
    },
  ) => boolean;
  getTargets: () => Array<AudioNode | null | undefined>;
};

function getTrafficState(refs: WaveOvertoneArpRuntimeRefs) {
  return refs.trafficRef?.current;
}

export function markWaveOvertoneArpQueueClear(refs: WaveOvertoneArpRuntimeRefs, reason: string) {
  refs.waveOvertoneArpQueueRef.current = [];
  const traffic = getTrafficState(refs);
  updateWaveOvertoneArpTrafficState(traffic, {
    queueLength: 0,
    lastStage: reason,
  });
  markAudioTrafficEvent(traffic, {
    kind: 'stop-cleanup',
    subsystem: 'wave-overtone-arp',
    audioNowSec: null,
    detail: { reason },
  });
}

export function markWaveOvertoneArpEnqueue(args: {
  refs: WaveOvertoneArpRuntimeRefs;
  audioNowSec: number | null;
  enqueued: number;
  trimmed: number;
  stepSec: number;
  pattern: string;
  rate: number;
  steps: number;
  mode: string;
  enabled: boolean;
}) {
  const traffic = getTrafficState(args.refs);
  const previous = traffic?.waveOvertoneArp;
  updateWaveOvertoneArpTrafficState(traffic, {
    enabled: args.enabled,
    mode: args.mode,
    timerActive: args.refs.waveOvertoneArpTimerRef.current !== null,
    queueLength: args.refs.waveOvertoneArpQueueRef.current.length,
    enqueuedTotal: (previous?.enqueuedTotal ?? 0) + args.enqueued,
    trimmedTotal: (previous?.trimmedTotal ?? 0) + args.trimmed,
    lastEnqueueAtAudioSec: args.audioNowSec,
    lastStepSec: args.stepSec,
    lastPattern: args.pattern,
    lastRate: args.rate,
    lastSteps: args.steps,
    lastStage: args.trimmed > 0 ? 'enqueue-trimmed' : 'enqueue',
  });
  markAudioTrafficEvent(traffic, {
    kind: 'queue-enqueue',
    subsystem: 'wave-overtone-arp',
    audioNowSec: args.audioNowSec,
    detail: {
      enqueued: args.enqueued,
      queueLength: args.refs.waveOvertoneArpQueueRef.current.length,
      stepSec: args.stepSec,
      pattern: args.pattern,
      rate: args.rate,
      steps: args.steps,
      mode: args.mode,
    },
  });
  if (args.trimmed > 0) {
    markAudioTrafficEvent(traffic, {
      kind: 'queue-overflow-trim',
      subsystem: 'wave-overtone-arp',
      audioNowSec: args.audioNowSec,
      detail: { trimmed: args.trimmed, queueLength: args.refs.waveOvertoneArpQueueRef.current.length },
    });
  }
}

export function stopWaveOvertoneArpRuntime(refs: WaveOvertoneArpRuntimeRefs) {
  if (refs.waveOvertoneArpTimerRef.current !== null) {
    window.clearInterval(refs.waveOvertoneArpTimerRef.current);
    refs.waveOvertoneArpTimerRef.current = null;
  }
  markWaveOvertoneArpQueueClear(refs, 'runtime-stop');
  updateWaveOvertoneArpTrafficState(getTrafficState(refs), {
    timerActive: false,
    queueLength: 0,
    lastStage: 'runtime-stop',
  });
}

export function startWaveOvertoneArpRuntime(args: WaveOvertoneArpRuntimeArgs) {
  const { audioCtx, room, refs } = args;
  const resolveAudioCtx = () => args.getAudioCtx?.() ?? audioCtx;
  if (!resolveAudioCtx() || room !== 'RESONANCE') return () => undefined;

  if (refs.waveOvertoneArpTimerRef.current !== null) {
    window.clearInterval(refs.waveOvertoneArpTimerRef.current);
    refs.waveOvertoneArpTimerRef.current = null;
  }

  updateWaveOvertoneArpTrafficState(getTrafficState(refs), {
    timerActive: true,
    queueLength: refs.waveOvertoneArpQueueRef.current.length,
    lastStage: 'runtime-start',
  });

  refs.waveOvertoneArpTimerRef.current = window.setInterval(() => {
    const ctx = resolveAudioCtx();
    const queue = refs.waveOvertoneArpQueueRef.current;
    if (!ctx || queue.length === 0) return;

    const now = getAudioNowSec(ctx) + 0.02;
    let idx = 0;
    let due = 0;
    let played = 0;
    let failed = 0;
    while (idx < queue.length) {
      const item = queue[idx];
      if (item.dueTime > now) {
        idx += 1;
        continue;
      }

      due += 1;
      const audioNow = getAudioNowSec(ctx);
      const plan = args.beginTransientEvent('other', 1, item.amp * 1.8);
      const admitted = args.playScheduledTone(
        item.freq,
        Math.max(0, item.dueTime - audioNow),
        item.duration,
        item.waveform,
        item.amp,
        item.q,
        item.cutoff,
        args.getTargets(),
        { source: 'other', plan, prominence: item.prominence, intendedStartTimeSec: item.dueTime },
      );
      if (admitted) {
        played += 1;
      } else {
        failed += 1;
      }
      queue.splice(idx, 1);
    }

    if (due > 0) {
      const traffic = getTrafficState(refs);
      const previous = traffic?.waveOvertoneArp;
      updateWaveOvertoneArpTrafficState(traffic, {
        timerActive: refs.waveOvertoneArpTimerRef.current !== null,
        queueLength: queue.length,
        playedTotal: (previous?.playedTotal ?? 0) + played,
        failedTotal: (previous?.failedTotal ?? 0) + failed,
        lastFlushDue: due,
        lastFlushPlayed: played,
        lastFlushFailed: failed,
        lastFlushAtAudioSec: now,
        lastStage: failed > 0 ? 'flush-with-failures' : 'flush',
      });
      markAudioTrafficEvent(traffic, {
        kind: 'queue-flush',
        subsystem: 'wave-overtone-arp',
        audioNowSec: now,
        detail: { due, played, failed, queueLength: queue.length },
      });
      if (played > 0) {
        markAudioTrafficEvent(traffic, {
          kind: 'play-admitted',
          subsystem: 'wave-overtone-arp',
          audioNowSec: now,
          detail: { played, queueLength: queue.length },
        });
      }
      if (failed > 0) {
        markAudioTrafficEvent(traffic, {
          kind: 'play-failed',
          subsystem: 'wave-overtone-arp',
          audioNowSec: now,
          detail: { failed, queueLength: queue.length },
        });
      }
    }
  }, 20);

  return () => stopWaveOvertoneArpRuntime(refs);
}
