import { clamp } from '../rooms/resonanceRuntimeMath';
import {
  inferRootFollowSynthRenderSourceKind,
  rootFollowRenderSourceUsesAudioElasticity,
  type RootFollowBankEntryConfig,
  type RootFollowSynthNoteSnapshot,
  type RootFollowSynthPatternSnapshot,
  type RootFollowSynthRenderSourceKind,
  type RootFollowSynthTrackSnapshot,
} from './rootFollowTypes';

export type RootFollowDirectTrafficProfile = {
  kind: 'spectralforge-v2-supernote';
  onsetIndex: number;
  onsetCount: number;
  activeEventCount: number;
  layerId: string;
};

export type RootFollowDirectTrafficSmoothing = {
  startOffsetSec: number;
  peakScale: number;
  minAttackSec: number;
  minReleaseSec: number;
};

export type RootFollowDirectEventWindowEvent = {
  note: RootFollowSynthNoteSnapshot;
  track: RootFollowSynthTrackSnapshot;
  noteStart: number;
  noteDuration: number;
  presetId: string | null;
  renderSourceKind: RootFollowSynthRenderSourceKind;
  renderStart: number;
  renderEnd: number;
  noteBaseHz: number;
  targetFrequency: number;
  trafficProfile: RootFollowDirectTrafficProfile | null;
};

export type RootFollowDirectEventWindowPlan = {
  events: RootFollowDirectEventWindowEvent[];
  spectralForgeV2SupernoteTraffic: boolean;
};

export function isRootFollowSpectralForgeV2SupernoteConfig(config: RootFollowBankEntryConfig) {
  return config.synthPatch?.compositionPresetId === 'spectralforge-v2-supernote'
    || config.synthPattern?.tuning === 'floating-frequency'
    || config.synthPattern?.repetitionModel === 'frequency-ratio';
}

export function rootFollowDirectTrafficOrder(layerId: string) {
  switch (layerId) {
    case 'body': return 0;
    case 'ordered': return 1;
    case 'residual': return 2;
    case 'transient': return 3;
    default: return 4;
  }
}

export function resolveRootFollowDirectTrafficSmoothing(
  profile: RootFollowDirectTrafficProfile | null | undefined,
  noteDuration: number,
): RootFollowDirectTrafficSmoothing {
  if (!profile) {
    return {
      startOffsetSec: 0,
      peakScale: 1,
      minAttackSec: 0.003,
      minReleaseSec: 0.02,
    };
  }
  const clusterPressure = Math.max(1, profile.onsetCount);
  const scenePressure = Math.max(1, profile.activeEventCount / 72);
  const peakScale = clamp(1 / Math.sqrt(clusterPressure * 0.62) / Math.sqrt(scenePressure * 0.22), 0.42, 1);
  const microOffset = Math.min(0.012, profile.onsetIndex * 0.0017);
  const layer = profile.layerId;
  const minAttackSec = layer === 'transient'
    ? 0.011
    : layer === 'residual'
      ? 0.018
      : 0.024;
  const minReleaseSec = layer === 'transient'
    ? 0.052
    : layer === 'residual'
      ? 0.095
      : 0.135;
  return {
    startOffsetSec: Math.min(microOffset, Math.max(0, noteDuration - 0.04)),
    peakScale,
    minAttackSec,
    minReleaseSec,
  };
}

function repetitionRatio(model: string | null | undefined) {
  return model === 'tritave' ? 3 : 2;
}

function assignRootFollowDirectTrafficProfiles(events: RootFollowDirectEventWindowEvent[]) {
  if (!events.length) return;
  const onsetBuckets = new Map<number, RootFollowDirectEventWindowEvent[]>();
  for (const event of events) {
    const bucket = Math.round(event.noteStart / 0.006);
    const list = onsetBuckets.get(bucket) ?? [];
    list.push(event);
    onsetBuckets.set(bucket, list);
  }
  for (const list of onsetBuckets.values()) {
    list.sort((a, b) => rootFollowDirectTrafficOrder(a.note.trackId) - rootFollowDirectTrafficOrder(b.note.trackId)
      || (a.note.lineHz ?? 0) - (b.note.lineHz ?? 0));
    list.forEach((event, index) => {
      event.trafficProfile = {
        kind: 'spectralforge-v2-supernote',
        onsetIndex: index,
        onsetCount: list.length,
        activeEventCount: events.length,
        layerId: event.note.trackId,
      };
    });
  }
}

export function buildRootFollowDirectEventWindow(args: {
  entryConfig: RootFollowBankEntryConfig;
  pattern: RootFollowSynthPatternSnapshot;
  beatDurationSec: number;
  loopDurationSec: number;
  transportAnchor: number;
  nextSliceStart: number;
  horizon: number;
  sessionAnchorHz: number;
  ratio: number;
}): RootFollowDirectEventWindowPlan {
  const {
    entryConfig,
    pattern,
    beatDurationSec,
    loopDurationSec,
    transportAnchor,
    nextSliceStart,
    horizon,
    sessionAnchorHz,
    ratio,
  } = args;
  const activeTrackIds = new Set(pattern.activeTrackIds);
  const trackMap = new Map(pattern.tracks.map((track) => [track.id, track] as const));
  const repetition = repetitionRatio(pattern.repetitionModel);
  const cycleStartIndex = Math.max(0, Math.floor((nextSliceStart - transportAnchor) / loopDurationSec));
  const cycleEndIndex = Math.max(cycleStartIndex, Math.floor((horizon - transportAnchor) / loopDurationSec) + 1);
  const spectralForgeV2SupernoteTraffic = isRootFollowSpectralForgeV2SupernoteConfig(entryConfig);
  const events: RootFollowDirectEventWindowEvent[] = [];

  for (let cycleIndex = cycleStartIndex; cycleIndex <= cycleEndIndex; cycleIndex += 1) {
    const cycleOffsetSec = transportAnchor + cycleIndex * loopDurationSec;
    for (const note of pattern.notes) {
      const track = trackMap.get(note.trackId);
      if (!track || track.enabled === false || !activeTrackIds.has(track.id)) continue;
      if (note.velocity <= 0 || track.volume <= 0 || note.gate <= 0) continue;
      const noteStart = cycleOffsetSec + Math.max(0, note.startBeat) * beatDurationSec;
      const noteDuration = Math.max(0.04, Math.max(0.0625, note.durationBeats) * beatDurationSec * clamp(note.gate ?? 1, 0.05, 2));
      const noteEnd = noteStart + noteDuration;
      const presetId = note.instrumentPresetOverride ?? track.instrumentPreset ?? null;
      const renderSourceKind = inferRootFollowSynthRenderSourceKind({
        renderSourceKind: note.renderSourceKind,
        noteClass: note.noteClass,
        presetId,
      });
      const sampleLike = rootFollowRenderSourceUsesAudioElasticity(renderSourceKind);
      const renderStart = sampleLike ? Math.max(noteStart, nextSliceStart) : noteStart;
      const renderEnd = sampleLike ? Math.min(noteEnd, horizon) : noteEnd;
      if (sampleLike) {
        if (renderEnd <= renderStart + 0.004) continue;
      } else if (noteStart < nextSliceStart - 0.0005 || noteStart >= horizon + 0.0005) {
        continue;
      }
      const noteBaseHz = Math.max(
        20,
        Math.min(
          12000,
          (note.lineHz ?? pattern.baseHz ?? sessionAnchorHz) * Math.pow(repetition, Number.isFinite(note.octaveOffset) ? note.octaveOffset : 0),
        ),
      );
      const targetFrequency = Math.max(20, Math.min(12000, noteBaseHz * ratio));
      events.push({
        note,
        track,
        noteStart,
        noteDuration,
        presetId,
        renderSourceKind,
        renderStart,
        renderEnd,
        noteBaseHz,
        targetFrequency,
        trafficProfile: null,
      });
    }
  }

  events.sort((a, b) => a.noteStart - b.noteStart
    || rootFollowDirectTrafficOrder(a.note.trackId) - rootFollowDirectTrafficOrder(b.note.trackId)
    || (a.note.lineHz ?? 0) - (b.note.lineHz ?? 0));

  if (spectralForgeV2SupernoteTraffic) {
    assignRootFollowDirectTrafficProfiles(events);
  }

  return {
    events,
    spectralForgeV2SupernoteTraffic,
  };
}
