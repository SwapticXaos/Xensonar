import type { Dispatch, SetStateAction } from 'react';
import { listSavedMelodicSamples, saveGeneratedMelodicSample, type SavedMelodicSampleMeta } from './melodicSampleLibrary';
import type { LoopComposerState } from './loopDrumDomain';

export async function registerMelodicSampleFromBlobAction(args: {
  blob: Blob;
  name: string;
  loopComposer: LoopComposerState;
  assignToSelectedTrack?: boolean;
  setMelodicSampleEntries: Dispatch<SetStateAction<SavedMelodicSampleMeta[]>>;
  mutateLoopComposer: (updater: (draft: LoopComposerState) => void, statusMessage?: string, options?: { history?: boolean }) => void;
  setStatus: (status: string) => void;
  successStatus?: string;
  failureStatus?: string;
}) {
  try {
    const saved = await saveGeneratedMelodicSample(args.name, args.blob);
    const nextEntries = await listSavedMelodicSamples();
    args.setMelodicSampleEntries(nextEntries);
    if (args.assignToSelectedTrack !== false) {
      const targetTrackId = args.loopComposer.selectedTrackId || args.loopComposer.tracks[0]?.id;
      if (targetTrackId) {
        args.mutateLoopComposer((draft) => {
          const track = draft.tracks.find((entry) => entry.id === targetTrackId);
          if (track) track.instrumentPreset = `sample:${saved.id}`;
        }, undefined, { history: false });
      }
    }
    args.setStatus(args.successStatus ?? `${args.name} als Sample in Melodic Loop abgelegt.`);
    return saved;
  } catch (error) {
    console.warn('[xensonar][melodic-samples][register-blob]', error);
    args.setStatus(args.failureStatus ?? 'Sample-Übernahme für Melodic Loop fehlgeschlagen.');
    throw error;
  }
}
