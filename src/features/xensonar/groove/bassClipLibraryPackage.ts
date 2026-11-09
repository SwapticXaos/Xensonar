import { hashStableString, isRecord, type WorkspacePackageImportMode } from '../../../core/systemMemory/packageCore';
import { normalizeBassClip, type BassClip } from './bassPatternEvents';
import {
  readBassClipLibraryState,
  writeBassClipLibraryState,
  type BassClipLibraryState,
} from './bassClipLibrary';

export type BassClipLibraryArchivePayload = BassClipLibraryState & {
  schemaVersion: 1;
};

export type BassClipLibraryArchiveImportResult = {
  state: BassClipLibraryState;
  importedCount: number;
  skippedCount: number;
  replacedCount: number;
  dedupedCount: number;
};

function normalizeIdentityText(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase();
}

function createImportedBassClipId(seed: string) {
  return `bass-clip-import-${Date.now().toString(36)}-${seed}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeState(value: unknown): BassClipLibraryState {
  const raw = isRecord(value) ? value : {};
  const rawClips = Array.isArray(raw.clips) ? raw.clips : [];
  const clips = rawClips
    .filter((clip): clip is BassClip => isRecord(clip) && typeof clip.id === 'string')
    .map((clip) => normalizeBassClip(clip));
  const clipIds = new Set(clips.map((clip) => clip.id));
  const rawOrder = Array.isArray(raw.order) ? raw.order : [];
  const order = [
    ...rawOrder.filter((id): id is string => typeof id === 'string' && clipIds.has(id)),
    ...clips.map((clip) => clip.id).filter((id) => !rawOrder.includes(id)),
  ];
  return { clips, order };
}

function clipContentSignature(clip: BassClip) {
  const normalized = normalizeBassClip(clip);
  const payload = {
    name: normalized.name,
    stepCount: normalized.stepCount,
    bars: normalized.bars,
    stepsPerBar: normalized.stepsPerBar,
    segmentCount: normalized.segmentCount,
    segmentMarkers: normalized.segmentMarkers.map(({ step, kind, locked }) => ({ step: Number(step.toFixed(4)), kind, locked: locked === true })),
    pitchSnapMode: normalized.pitchSnapMode ?? null,
    pitchGuideKind: normalized.pitchGuideKind ?? null,
    generatorMeta: normalized.generatorMeta,
    events: normalized.events.map((event) => ({
      startStep: Number(event.startStep.toFixed(4)),
      durationSteps: Number(event.durationSteps.toFixed(4)),
      ratioFromRoot: Number(event.ratioFromRoot.toFixed(8)),
      centsFromRoot: event.centsFromRoot == null ? null : Number(event.centsFromRoot.toFixed(4)),
      octave: event.octave,
      velocity: Number(event.velocity.toFixed(4)),
      accent: Number(event.accent.toFixed(4)),
      ghost: event.ghost === true,
      tie: event.tie === true,
      glide: event.glide ?? null,
      source: event.source ?? null,
    })),
  };
  return hashStableString(JSON.stringify(payload));
}

function clipMetadataSignature(clip: BassClip) {
  const normalized = normalizeBassClip(clip);
  const meta = normalized.generatorMeta;
  return [
    normalizeIdentityText(normalized.name),
    meta.kind,
    meta.presetId ?? '',
    meta.style ?? '',
    meta.flavor ?? '',
    meta.rootBinding ?? '',
    meta.timingKind ?? '',
    String(normalized.bars),
    String(normalized.stepsPerBar),
    String(normalized.segmentCount),
    normalized.pitchSnapMode ?? '',
    normalized.pitchGuideKind ?? '',
  ].join('|');
}

function cloneWithId(clip: BassClip, id: string): BassClip {
  return normalizeBassClip({ ...clip, id });
}

export function exportBassClipLibraryArchivePayload(): BassClipLibraryArchivePayload {
  const state = normalizeState(readBassClipLibraryState());
  return {
    schemaVersion: 1,
    clips: state.clips,
    order: state.order,
  };
}

export function parseBassClipLibraryArchivePayload(raw: unknown): BassClipLibraryArchivePayload | null {
  if (!isRecord(raw)) return null;
  const state = normalizeState(raw);
  return {
    schemaVersion: 1,
    clips: state.clips,
    order: state.order,
  };
}

export function combineBassClipLibraryArchivePayload(args: {
  current: BassClipLibraryState;
  imported: BassClipLibraryArchivePayload;
  mode: WorkspacePackageImportMode;
}): BassClipLibraryArchiveImportResult {
  const current = normalizeState(args.current);
  const imported = normalizeState(args.imported);
  if (args.mode === 'replace') {
    const state = normalizeState(imported);
    return { state, importedCount: state.clips.length, skippedCount: 0, replacedCount: current.clips.length ? state.clips.length : 0, dedupedCount: 0 };
  }

  const nextClips = [...current.clips];
  const nextOrder = [...current.order.filter((id) => nextClips.some((clip) => clip.id === id))];
  const byId = new Map(nextClips.map((clip) => [clip.id, clip]));
  const byContent = new Map(nextClips.map((clip) => [clipContentSignature(clip), clip]));
  const byMeta = new Map(nextClips.map((clip) => [clipMetadataSignature(clip), clip]));
  let importedCount = 0;
  let skippedCount = 0;
  let replacedCount = 0;
  let dedupedCount = 0;

  for (const importedId of imported.order) {
    const incoming = imported.clips.find((clip) => clip.id === importedId);
    if (!incoming) continue;
    const normalized = normalizeBassClip(incoming);
    const contentKey = clipContentSignature(normalized);
    const exactExisting = byContent.get(contentKey) ?? null;
    if (exactExisting) {
      if (!nextOrder.includes(exactExisting.id)) nextOrder.push(exactExisting.id);
      skippedCount += 1;
      continue;
    }

    const metadataKey = clipMetadataSignature(normalized);
    const replaceTarget = args.mode === 'differential' ? byMeta.get(metadataKey) ?? null : null;
    if (replaceTarget) {
      const index = nextClips.findIndex((clip) => clip.id === replaceTarget.id);
      const replacement = cloneWithId(normalized, replaceTarget.id);
      if (index >= 0) nextClips[index] = replacement;
      byId.set(replacement.id, replacement);
      byContent.set(clipContentSignature(replacement), replacement);
      byMeta.set(clipMetadataSignature(replacement), replacement);
      if (!nextOrder.includes(replacement.id)) nextOrder.push(replacement.id);
      replacedCount += 1;
      importedCount += 1;
      continue;
    }

    let nextId = normalized.id;
    if (!nextId || byId.has(nextId)) {
      nextId = createImportedBassClipId(importedCount.toString(36));
    }
    const addition = cloneWithId(normalized, nextId);
    nextClips.push(addition);
    byId.set(addition.id, addition);
    byContent.set(clipContentSignature(addition), addition);
    byMeta.set(clipMetadataSignature(addition), addition);
    nextOrder.push(addition.id);
    importedCount += 1;
  }

  const seen = new Set<string>();
  const dedupedOrder = nextOrder.filter((id) => {
    if (!nextClips.some((clip) => clip.id === id)) return false;
    if (seen.has(id)) {
      dedupedCount += 1;
      return false;
    }
    seen.add(id);
    return true;
  });
  const state = normalizeState({ clips: nextClips, order: dedupedOrder });
  return { state, importedCount, skippedCount, replacedCount, dedupedCount };
}

export function applyBassClipLibraryArchivePayload(args: {
  payload: BassClipLibraryArchivePayload;
  mode: WorkspacePackageImportMode;
}): BassClipLibraryArchiveImportResult {
  const result = combineBassClipLibraryArchivePayload({
    current: readBassClipLibraryState(),
    imported: args.payload,
    mode: args.mode,
  });
  writeBassClipLibraryState(result.state);
  return result;
}
