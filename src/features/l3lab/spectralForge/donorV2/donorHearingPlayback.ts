import { useStore } from '../state/store';
import { audioEngine } from '../audio/AudioEngine';
import type { SpectralData } from '../audio/SpectralData';
import { donorHearingRuntime } from './donorHearingRuntime';

export type DonorProofKind = 'original' | 'reconstruction' | 'transposed';

export async function playSelectedDonorHearing(
  spectralData: SpectralData,
  durationSec: number,
  options: { loopPreview?: boolean; onPosition?: (position: number) => void; onEnd?: () => void } = {},
): Promise<boolean> {
  donorHearingRuntime.stop();
  const state = donorHearingRuntime.getSnapshot();
  if (!state.selected || !state.source || !state.model) throw new Error('Bitte zuerst Timbre extrahieren und Donor wählen.');
  const token = donorHearingRuntime.beginRender();
  donorHearingRuntime.setPlaybackStopHandler(() => audioEngine.stop());
  const current = () => donorHearingRuntime.getSnapshot().generation === token;
  const finish = () => { if (current()) { donorHearingRuntime.finish(token); options.onEnd?.(); } };
  try {
    const started = await audioEngine.playDonorBodyPreview(spectralData, state.source, durationSec, finish, { ...options, isCancelled: () => !current() });
    if (started && current()) donorHearingRuntime.markPlaying(token);
    else finish();
    return started && current();
  } catch (error) {
    if (current()) donorHearingRuntime.failPlayback(token, error);
    throw error;
  }
}

export async function renderSelectedDonorHearing(spectralData: SpectralData, durationSec: number) {
  const state = donorHearingRuntime.getSnapshot();
  if (!state.selected || !state.source || !state.model) throw new Error('Donor ist noch nicht extrahiert.');
  const drawing = useStore.getState();
  const unchanged = () => {
    const now = useStore.getState(), donor = donorHearingRuntime.getSnapshot();
    return now.renderVersion === drawing.renderVersion && now.spectralData === drawing.spectralData &&
      now.materialExport.bars === drawing.materialExport.bars && now.materialExport.bpm === drawing.materialExport.bpm &&
      donor.selected && donor.source === state.source && donor.model === state.model;
  };
  const buffer = await audioEngine.renderDonorBodyToBuffer(spectralData, state.source, durationSec, () => !unchanged());
  if (!unchanged()) throw new DOMException('Figur oder Donor wurde während der Ausgabe geändert.', 'AbortError');
  const current = donorHearingRuntime.getSnapshot();
  if (!current.selected || current.source !== state.source || current.model !== state.model) {
    throw new DOMException('Donor-Material wurde während der Ausgabe geändert.', 'AbortError');
  }
  return audioEngine.encodeSamplesToWAV(buffer.getChannelData(0), buffer.sampleRate);
}

export async function playSelectedDonorProof(kind: DonorProofKind, onEnd?: () => void) {
  donorHearingRuntime.stop();
  const state = donorHearingRuntime.getSnapshot();
  if (!state.source || !state.model) throw new Error('Bitte zuerst Timbre extrahieren.');
  const token = donorHearingRuntime.beginRender();
  donorHearingRuntime.setPlaybackStopHandler(() => audioEngine.stop());
  const current = () => donorHearingRuntime.getSnapshot().generation === token;
  const finish = () => { if (current()) { donorHearingRuntime.finish(token); onEnd?.(); } };
  try {
    const started = await audioEngine.playDonorProofPreview(state.source, state.model, kind, finish, () => !current());
    if (started && current()) donorHearingRuntime.markPlaying(token); else finish();
    return started && current();
  } catch (error) {
    if (current()) donorHearingRuntime.failPlayback(token, error);
    throw error;
  }
}
