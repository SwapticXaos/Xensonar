import type { Dispatch, SetStateAction } from 'react';
import { reportXensonarPromiseFailure } from '@/features/xensonar/diagnostics/runtimeIssueReporter';
import { resolveSamplePlaybackProfile } from '@/features/soundLibrary/samplePlaybackProfile';
import { buildTransferBlob, type SynthMode, type TransferMode, type WaveformMix, type DestructiveAudioProfile, type WarpAudioProfile } from './selectionAudioTransfer';
import { hasPlayableSource } from './spectralWorkspaceUtils';
import type { SavedMelodicSampleMeta } from './melodicSampleLibrary';
import { ensureLocalFieldState, type LocalFieldModuleState } from './localField';
import {
  deleteSavedMelodicSample,
  listSavedMelodicSamples,
  loadMelodicSampleBuffer,
  saveUploadedMelodicSamples,
  updateSavedMelodicSampleMeta,
} from './melodicSampleLibrary';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { SpectralData } from '../spectralForge/audio/SpectralData';
import type { CanonicalSourceView } from './analysis';
import type { Forge2WorkspaceId } from '../../xensonar/architecture/machineRoomTypes';

async function refreshMelodicSamples(setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>) {
  const nextEntries = await listSavedMelodicSamples();
  setMelodicSampleEntries(nextEntries);
  return nextEntries;
}

const pendingEnvelopePersistTimers = new Map<string, number>();

function applyOptimisticMelodicSampleMetaUpdate(
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>,
  sampleId: string,
  mutate: (entry: SavedMelodicSampleMeta) => SavedMelodicSampleMeta,
) {
  setMelodicSampleEntries((previous) => previous.map((entry) => (entry.id === sampleId ? mutate(entry) : entry)));
}


export function uploadMelodicSamplesAction(args: {
  files: File[];
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  setStatus: (status: string) => void;
}) {
  void saveUploadedMelodicSamples(args.files).then(async () => {
    await refreshMelodicSamples(args.setMelodicSampleEntries);
    args.setStatus(`${args.files.length} Sample${args.files.length === 1 ? '' : 's'} in die Sample-Datenbank gelegt.`);
  }).catch((error) => {
    reportXensonarPromiseFailure('samples', 'upload-melodic-samples', error, { fileCount: args.files.length });
    args.setStatus('Sample-Upload fehlgeschlagen.');
  });
}

export function importSpectralSelectionAsMelodicSampleAction(args: {
  rawSourceAsset: AudioSourceAsset | null;
  materialExport: { transferMode: TransferMode; name: string };
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  selectionStartSec: number;
  selectionDurationSec: number;
  sourceView: CanonicalSourceView;
  activeWorkspace: Forge2WorkspaceId | string;
  destructivePreviewProfile: DestructiveAudioProfile | null;
  warpAudioProfile: WarpAudioProfile | null;
  registerMelodicSampleFromBlob: (
    blob: Blob,
    name: string,
    options?: { assignToSelectedTrack?: boolean; successStatus?: string; failureStatus?: string },
  ) => Promise<void>;
  setStatus: (status: string) => void;
}) {
  void (async () => {
    const effectiveTransferMode: TransferMode = args.rawSourceAsset && hasPlayableSource(args.rawSourceAsset)
      ? 'source-direct'
      : args.materialExport.transferMode;
    const transfer = await buildTransferBlob({
      transferMode: effectiveTransferMode,
      spectralData: args.spectralData,
      synthMode: args.synthMode,
      waveformMix: args.waveformMix,
      rawSourceAsset: args.rawSourceAsset,
      selectionStartSec: args.selectionStartSec,
      selectionDurationSec: args.selectionDurationSec,
      sourceView: args.sourceView,
      activeWorkspace: args.activeWorkspace,
      destructiveProfile: args.destructivePreviewProfile,
      warpProfile: args.warpAudioProfile,
    });
    const sourceName = (args.rawSourceAsset?.fileName || args.materialExport.name || 'spectralforge-sample')
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[^a-z0-9äöüß _-]+/gi, '-')
      .trim() || 'spectralforge-sample';
    const startLabel = Math.max(0, args.selectionStartSec).toFixed(2).replace('.', '-');
    const endLabel = Math.max(args.selectionStartSec + args.selectionDurationSec, 0).toFixed(2).replace('.', '-');
    const sampleName = `${sourceName} ${startLabel}-${endLabel}.wav`;
    await args.registerMelodicSampleFromBlob(transfer.blob, sampleName, {
      successStatus: `${sampleName} aus SpectralForge in die Sample-Datenbank übernommen.`,
      failureStatus: 'Übernahme aus SpectralForge fehlgeschlagen.',
    });
  })().catch((error) => {
    reportXensonarPromiseFailure('spectralforge', 'import-spectral-selection-as-melodic-sample', error);
    args.setStatus('Übernahme aus SpectralForge fehlgeschlagen.');
  });
}

export function deleteMelodicSampleAction(args: {
  sampleId: string;
  melodicSampleEntries: SavedMelodicSampleMeta[];
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  setStatus: (status: string) => void;
}) {
  const meta = args.melodicSampleEntries.find((entry) => entry.id === args.sampleId);
  void deleteSavedMelodicSample(args.sampleId)
    .then(async () => {
      await refreshMelodicSamples(args.setMelodicSampleEntries);
      args.setStatus(meta ? `${meta.name} aus der Sample-Datenbank entfernt.` : 'Sample entfernt.');
    })
    .catch((error) => {
      reportXensonarPromiseFailure('samples', 'delete-melodic-sample', error, { sampleId: args.sampleId });
      args.setStatus(meta ? `${meta.name} konnte nicht entfernt werden.` : 'Sample konnte nicht entfernt werden.');
    });
}


export function renameMelodicSampleAction(args: {
  sampleId: string;
  name: string;
  melodicSampleEntries: SavedMelodicSampleMeta[];
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  setStatus: (status: string) => void;
}) {
  const nextName = args.name.trim();
  if (!nextName) {
    args.setStatus('Sample-Name bleibt unverändert: Der neue Titel ist leer.');
    return;
  }
  const meta = args.melodicSampleEntries.find((entry) => entry.id === args.sampleId);
  applyOptimisticMelodicSampleMetaUpdate(args.setMelodicSampleEntries, args.sampleId, (entry) => ({
    ...entry,
    name: nextName,
    syncState: entry.origin === 'importedPackage' ? 'modifiedSinceImport' : (entry.syncState ?? 'localOnly'),
  }));
  void updateSavedMelodicSampleMeta(args.sampleId, { name: nextName })
    .then(async () => {
      await refreshMelodicSamples(args.setMelodicSampleEntries);
      args.setStatus(meta ? `${meta.name} umbenannt in ${nextName}.` : `${nextName} gespeichert.`);
    })
    .catch((error) => {
      reportXensonarPromiseFailure('samples', 'rename-melodic-sample', error, { sampleId: args.sampleId });
      void refreshMelodicSamples(args.setMelodicSampleEntries);
      args.setStatus(meta ? `${meta.name}: Umbenennen fehlgeschlagen.` : 'Sample-Umbenennen fehlgeschlagen.');
    });
}

export function updateMelodicSampleBaseHzAction(args: {
  sampleId: string;
  baseHz: number | null;
  melodicSampleEntries: SavedMelodicSampleMeta[];
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  setStatus: (status: string) => void;
}) {
  const meta = args.melodicSampleEntries.find((entry) => entry.id === args.sampleId);
  void updateSavedMelodicSampleMeta(args.sampleId, { baseHz: args.baseHz })
    .then(async () => {
      await refreshMelodicSamples(args.setMelodicSampleEntries);
      args.setStatus(meta ? `${meta.name}: angenommene Originalhöhe aktualisiert.` : 'Sample-angenommene Originalhöhe aktualisiert.');
    })
    .catch((error) => {
      reportXensonarPromiseFailure('samples', 'update-melodic-sample-base-hz', error, { sampleId: args.sampleId, baseHz: args.baseHz });
      args.setStatus(meta ? `${meta.name}: Originalhöhe konnte nicht gespeichert werden.` : 'Sample-Originalhöhe konnte nicht gespeichert werden.');
    });
}


export function updateMelodicSampleEnvelopeAction(args: {
  sampleId: string;
  target: 'volumeEnvelope' | 'pitchEnvelope';
  field: LocalFieldModuleState | null;
  melodicSampleEntries: SavedMelodicSampleMeta[];
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  setStatus: (status: string) => void;
}) {
  const meta = args.melodicSampleEntries.find((entry) => entry.id === args.sampleId);
  const label = args.target === 'pitchEnvelope' ? 'Pitch-Hüllkurve' : 'Lautstärke-Hüllkurve';
  const normalizedField = args.field
    ? ensureLocalFieldState({
      ...args.field,
      interpreterKind: args.target === 'pitchEnvelope' ? 'pitch-elastic' : 'dynamic-fade',
    })
    : null;

  applyOptimisticMelodicSampleMetaUpdate(args.setMelodicSampleEntries, args.sampleId, (entry) => ({
    ...entry,
    [args.target]: normalizedField,
    syncState: entry.origin === 'importedPackage' ? 'modifiedSinceImport' : (entry.syncState ?? 'localOnly'),
  }));

  const persistKey = `${args.sampleId}:${args.target}`;
  const existingTimer = pendingEnvelopePersistTimers.get(persistKey);
  if (existingTimer != null) window.clearTimeout(existingTimer);

  const timer = window.setTimeout(() => {
    pendingEnvelopePersistTimers.delete(persistKey);
    void updateSavedMelodicSampleMeta(
      args.sampleId,
      { [args.target]: normalizedField } as { volumeEnvelope?: LocalFieldModuleState | null; pitchEnvelope?: LocalFieldModuleState | null },
    ).then((savedMeta) => {
      if (!savedMeta) {
        args.setStatus(meta ? `${meta.name}: ${label} konnte nicht gespeichert werden.` : `${label} konnte nicht gespeichert werden.`);
        return;
      }
      applyOptimisticMelodicSampleMetaUpdate(args.setMelodicSampleEntries, args.sampleId, (entry) => ({
        ...entry,
        volumeEnvelope: savedMeta.volumeEnvelope ?? entry.volumeEnvelope ?? null,
        pitchEnvelope: savedMeta.pitchEnvelope ?? entry.pitchEnvelope ?? null,
        syncState: savedMeta.syncState ?? entry.syncState,
      }));
      args.setStatus(meta ? `${meta.name}: ${label} gespeichert.` : `${label} gespeichert.`);
    }).catch((error) => {
      reportXensonarPromiseFailure('samples', 'save-melodic-sample-envelope', error, { sampleId: args.sampleId, target: args.target });
      args.setStatus(meta ? `${meta.name}: ${label} konnte nicht gespeichert werden.` : `${label} konnte nicht gespeichert werden.`);
    });
  }, 180);

  pendingEnvelopePersistTimers.set(persistKey, timer);
}

export async function previewMelodicSampleReferencePitchAction(args: {
  sampleId: string;
  melodicSampleEntries: SavedMelodicSampleMeta[];
  overrideBaseHz?: number | null;
  setStatus: (status: string) => void;
}) {
  const meta = args.melodicSampleEntries.find((entry) => entry.id === args.sampleId);
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    args.setStatus('AudioContext für Sample-Vorhören nicht verfügbar.');
    return;
  }
  const ctx = new AudioCtx();
  try {
    const loaded = await loadMelodicSampleBuffer(args.sampleId, ctx);
    if (!loaded?.buffer) {
      args.setStatus('Sample-Vorhören fehlgeschlagen.');
      return;
    }
    const effectiveLoaded = {
      ...loaded,
      baseHz: typeof args.overrideBaseHz === 'number' && Number.isFinite(args.overrideBaseHz) && args.overrideBaseHz > 0 ? args.overrideBaseHz : loaded.baseHz,
    };
    const startTime = ctx.currentTime + 0.02;
    const profile = resolveSamplePlaybackProfile({
      loaded: effectiveLoaded,
      targetHz: 220,
      minRate: 0.125,
      maxRate: 8,
    });
    const previewDuration = Math.max(0.18, Math.min(1.4, profile.targetDurationSec));
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = loaded.buffer;
    source.playbackRate.setValueAtTime(profile.playbackRate, startTime);
    source.loop = profile.shouldLoop;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5800, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
    gain.gain.setValueAtTime(0.2, Math.max(startTime + 0.04, startTime + previewDuration - 0.06));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + previewDuration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(startTime, 0, profile.shouldLoop ? undefined : Math.min(loaded.buffer.duration, previewDuration * Math.max(profile.playbackRate, 0.0001)));
    source.stop(startTime + previewDuration + 0.02);
    args.setStatus(meta ? `${meta.name}: mittige Originalhöhen-Vorschau gestartet.` : 'Sample-Vorhören gestartet.');
    window.setTimeout(() => { void ctx.close().catch(() => undefined); }, Math.ceil((previewDuration + 0.3) * 1000));
  } catch (error) {
    console.warn('[xensonar][melodic-samples][basehz-preview]', error);
    void ctx.close().catch(() => undefined);
    args.setStatus('Sample-Vorhören fehlgeschlagen.');
  }
}

export function setMelodicSampleTempoProfileAction(args: {
  sampleId: string;
  options: { tempoPitchLinked: boolean; playbackDurationSec: number | null };
  melodicSampleEntries: SavedMelodicSampleMeta[];
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  setStatus: (status: string) => void;
}) {
  const meta = args.melodicSampleEntries.find((entry) => entry.id === args.sampleId);
  void updateSavedMelodicSampleMeta(args.sampleId, args.options)
    .then(async () => {
      await refreshMelodicSamples(args.setMelodicSampleEntries);
      args.setStatus(meta ? `${meta.name}: Tempo/Pitch-Profil aktualisiert.` : 'Sample-Profil aktualisiert.');
    })
    .catch((error) => {
      reportXensonarPromiseFailure('samples', 'update-melodic-sample-tempo-profile', error, { sampleId: args.sampleId });
      args.setStatus(meta ? `${meta.name}: Tempo/Pitch-Profil konnte nicht gespeichert werden.` : 'Sample-Profil konnte nicht gespeichert werden.');
    });
}

export async function previewMelodicSampleTempoProfileAction(args: {
  sampleId: string;
  playbackDurationSec: number;
  melodicSampleEntries: SavedMelodicSampleMeta[];
  setStatus: (status: string) => void;
}) {
  const meta = args.melodicSampleEntries.find((entry) => entry.id === args.sampleId);
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    args.setStatus('AudioContext für Sample-Vorhören nicht verfügbar.');
    return;
  }
  const ctx = new AudioCtx();
  try {
    const loaded = await loadMelodicSampleBuffer(args.sampleId, ctx);
    if (!loaded?.buffer) {
      args.setStatus('Sample-Vorhören fehlgeschlagen.');
      return;
    }
    const baseHz = Math.max(30, loaded.baseHz ?? 220);
    const targetDuration = Math.max(0.02, args.playbackDurationSec);
    const pitches = [baseHz, baseHz * 2, baseHz * 0.5];
    let cursor = ctx.currentTime + 0.02;
    pitches.forEach((targetHz) => {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const playbackRate = Math.max(0.125, Math.min(8, targetHz / baseHz));
      source.buffer = loaded.buffer;
      source.playbackRate.setValueAtTime(playbackRate, cursor);
      source.loop = true;
      gain.gain.setValueAtTime(0.0001, cursor);
      gain.gain.linearRampToValueAtTime(0.18, cursor + 0.01);
      gain.gain.setValueAtTime(0.18, Math.max(cursor + 0.02, cursor + targetDuration - 0.04));
      gain.gain.exponentialRampToValueAtTime(0.0001, cursor + targetDuration);
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(cursor);
      source.stop(cursor + targetDuration + 0.01);
      cursor += targetDuration + 0.06;
    });
    args.setStatus(meta ? `${meta.name}: Tempo-Vorhören in drei Lagen gestartet.` : 'Tempo-Vorhören gestartet.');
    window.setTimeout(() => { void ctx.close().catch(() => undefined); }, Math.ceil((cursor - ctx.currentTime + 0.2) * 1000));
  } catch (error) {
    console.warn('[xensonar][melodic-samples][tempo-preview]', error);
    void ctx.close().catch(() => undefined);
    args.setStatus('Tempo-Vorhören fehlgeschlagen.');
  }
}
