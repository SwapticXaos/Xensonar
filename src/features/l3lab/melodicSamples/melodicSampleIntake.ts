import type { CanonicalSourceView } from '../canonicalForge/analysis';
import { buildTransferBlob, type DestructiveAudioProfile, type SynthMode, type WarpAudioProfile, type WaveformMix } from '../canonicalForge/selectionAudioTransfer';
import { saveGeneratedMelodicSample, type SavedMelodicSampleMeta } from '../canonicalForge/melodicSampleLibrary';
import { sanitizeName } from '../canonicalForge/spectralWorkspaceUtils';
import type { SpectralData } from '../spectralForge/audio/SpectralData';
import type { CommittedLoopPayload } from '../materialIntake/types';

export type SaveMelodicSampleOptions = {
  assignToSelectedTrack?: boolean;
};

function sanitizeSampleFileName(label: string, fallback: string) {
  const trimmed = label.trim();
  const safe = trimmed.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return safe || fallback;
}

export async function saveBlobAsMelodicSample(args: {
  blob: Blob;
  name: string;
  options?: SaveMelodicSampleOptions;
}): Promise<SavedMelodicSampleMeta> {
  return saveGeneratedMelodicSample(args.name, args.blob);
}

export async function saveRawSelectionAsMelodicSample(args: {
  payload: CommittedLoopPayload;
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  sourceView?: CanonicalSourceView;
  activeWorkspace?: string;
  destructiveProfile?: DestructiveAudioProfile | null;
  warpProfile?: WarpAudioProfile | null;
}): Promise<SavedMelodicSampleMeta> {
  const { payload } = args;
  const sampleDuration = payload.selection.fineLoopRange.durationSec;
  if (!(sampleDuration > 0)) throw new Error('Es gibt noch keinen gültigen Roh-Ausschnitt.');
  if (sampleDuration > 5.001) {
    throw new Error(`Roh-Sample für Melodic Loop ist auf 5,0s begrenzt · aktuell ${sampleDuration.toFixed(2)}s.`);
  }
  const transfer = await buildTransferBlob({
    transferMode: 'source-direct',
    spectralData: args.spectralData,
    synthMode: args.synthMode,
    waveformMix: args.waveformMix,
    rawSourceAsset: payload.source.sourceAsset,
    selectionStartSec: payload.selection.fineLoopRange.startSec,
    selectionDurationSec: payload.selection.fineLoopRange.durationSec,
    sourceView: args.sourceView ?? 'energy',
    activeWorkspace: args.activeWorkspace ?? 'wave-material',
    destructiveProfile: args.destructiveProfile ?? null,
    warpProfile: args.warpProfile ?? null,
  });
  const titledBase = (payload.exportTitle?.trim() || payload.source.label.replace(/\.[^.]+$/, '') || 'roh-sample').trim();
  const sampleName = `${sanitizeSampleFileName(sanitizeName(titledBase) || 'roh-sample', 'roh-sample')}.wav`;
  return saveGeneratedMelodicSample(sampleName, transfer.blob);
}
