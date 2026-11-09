import type { MaterialEntry } from '../../l3lab/materialLibrary';
import type { MaterialLoopTimeMode } from './materialLoopMath';
import { resolveProtectedMaterialTrackPlaybackPlan } from './protectedMaterialTrackLane';
import {
  markMaterialTrackAudioSourceReleased,
  markMaterialTrackGainNodeReleased,
  markMaterialTrackPlaybackFailed,
  registerMaterialTrackAudioSource,
  registerMaterialTrackCacheEntry,
  registerMaterialTrackGainNode,
} from './materialTrackLifecycleRegistry';

type MaterialLoopPlaybackPatch = {
  materialLoopId?: string;
  materialLoopActive?: boolean;
};

type AudioBufferSourceRef = { current: AudioBufferSourceNode | null };
type GainNodeRef = { current: GainNode | null };

type MaterialLoopPlaybackRuntimeRefs = {
  cacheRef: { current: Map<string, AudioBuffer> };
  sourceRef: AudioBufferSourceRef;
  gainRef: GainNodeRef;
  tokenRef: { current: number };
};

export function stopMaterialLoopPlayback(args: {
  sourceRef: AudioBufferSourceRef;
  gainRef: GainNodeRef;
}) {
  if (args.sourceRef.current) {
    try { args.sourceRef.current.stop(); } catch {}
    try { args.sourceRef.current.disconnect(); } catch {}
    args.sourceRef.current = null;
    markMaterialTrackAudioSourceReleased('material-track-source-stopped');
  }
  if (args.gainRef.current) {
    try { args.gainRef.current.disconnect(); } catch {}
    args.gainRef.current = null;
    markMaterialTrackGainNodeReleased('material-track-gain-disconnected');
  }
}

export function resolveMaterialLoopSelectionPatch(args: {
  entries: MaterialEntry[];
  currentId: string;
  currentActive: boolean;
  pendingRegisteredId: string;
}) {
  const { entries, currentId, currentActive, pendingRegisteredId } = args;
  if (!entries.length) {
    if (currentId) {
      return {
        patch: { materialLoopId: '', materialLoopActive: false } satisfies MaterialLoopPlaybackPatch,
        clearPendingRegisteredId: true,
      };
    }
    return { patch: null, clearPendingRegisteredId: true };
  }
  if (currentId && entries.some((entry) => entry.id === currentId)) {
    return { patch: null, clearPendingRegisteredId: false };
  }
  const preferred = pendingRegisteredId
    ? entries.find((entry) => entry.id === pendingRegisteredId)?.id ?? ''
    : '';
  return {
    patch: {
      materialLoopId: preferred || entries[0].id,
      materialLoopActive: currentActive || !!preferred,
    } satisfies MaterialLoopPlaybackPatch,
    clearPendingRegisteredId: !!preferred,
  };
}

export async function startMaterialLoopPlayback(args: {
  ctx: AudioContext;
  entry: MaterialEntry;
  quantizeBpm: number;
  timeMode: MaterialLoopTimeMode;
  volume: number;
  syncToBeat: boolean;
  refs: MaterialLoopPlaybackRuntimeRefs;
  getRhythmBus: (ctx: AudioContext) => AudioNode;
  ensureMyzelPostFxRouter: (ctx: AudioContext) => void;
  getForgeSend: () => GainNode | null;
}) {
  const { ctx, entry, quantizeBpm, timeMode, volume, syncToBeat, refs } = args;
  const token = refs.tokenRef.current;

  let buffer = refs.cacheRef.current.get(entry.id);
  if (!buffer) {
    try {
      const data = await entry.blob.arrayBuffer();
      buffer = await ctx.decodeAudioData(data.slice(0));
      refs.cacheRef.current.set(entry.id, buffer);
      registerMaterialTrackCacheEntry(entry, buffer);
    } catch (error) {
      markMaterialTrackPlaybackFailed(entry, error instanceof Error ? error.message : 'decode-or-cache-failed');
      throw error;
    }
  }
  if (refs.tokenRef.current !== token) return false;

  stopMaterialLoopPlayback({ sourceRef: refs.sourceRef, gainRef: refs.gainRef });

  const playbackPlan = resolveProtectedMaterialTrackPlaybackPlan({
    audioCtx: ctx,
    entry,
    bufferDurationSec: buffer.duration,
    bpm: quantizeBpm,
    timeMode,
    volume,
    syncToBeat,
  });

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = playbackPlan.loopStartSec;
  source.loopEnd = playbackPlan.loopEndSec;
  source.playbackRate.setValueAtTime(playbackPlan.playbackRate, playbackPlan.sharedTime.audioNowSec);
  gain.gain.setValueAtTime(playbackPlan.gainValue, playbackPlan.sharedTime.audioNowSec);
  source.connect(gain);
  gain.connect(args.getRhythmBus(ctx));
  args.ensureMyzelPostFxRouter(ctx);
  const forgeSend = args.getForgeSend();
  if (forgeSend) gain.connect(forgeSend);

  refs.sourceRef.current = source;
  refs.gainRef.current = gain;

  registerMaterialTrackAudioSource({
    entry,
    loopStart: playbackPlan.loopStartSec,
    loopEnd: playbackPlan.loopEndSec,
    playbackRate: playbackPlan.playbackRate,
    startAt: playbackPlan.startAtSec,
    syncToBeat: playbackPlan.syncToBeat,
  });
  registerMaterialTrackGainNode(entry, volume);

  source.onended = () => {
    if (refs.sourceRef.current === source) {
      try { source.disconnect(); } catch {}
      refs.sourceRef.current = null;
      markMaterialTrackAudioSourceReleased('material-track-source-ended');
    }
    if (refs.gainRef.current === gain) {
      try { gain.disconnect(); } catch {}
      refs.gainRef.current = null;
      markMaterialTrackGainNodeReleased('material-track-gain-ended');
    }
  };

  source.start(playbackPlan.startAtSec, playbackPlan.loopStartSec);
  return true;
}
