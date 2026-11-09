import { audioEngine } from '../../../spectralForge/audio/AudioEngine';
import { useStore } from '../../../spectralForge/state/store';
import { createMaterialPackageFromExport } from '../../../materialAdapter';
import { registerExternalMaterialPackage } from '../../../materialLibrary';
import type { CommittedLoopPayload, MaterialTargetAdapter } from '../../types';

export function registerRawSelectionAsMaterialEntry(payload: CommittedLoopPayload) {
  const state = useStore.getState();
  const range = payload.selection.fineLoopRange;
  const source = payload.source.sourceAsset;
  const startSample = Math.max(0, Math.floor(range.startSec * source.sampleRate));
  const sampleLength = Math.max(1, Math.min(source.monoSamples.length - startSample, Math.floor(Math.max(0.05, range.durationSec) * source.sampleRate)));
  const slice = Float32Array.from(source.monoSamples.subarray(startSample, startSample + sampleLength));
  const blob = audioEngine.encodeSamplesToWAV(slice, source.sampleRate);
  const meta = state.materialExport;
  const exportTitle = payload.exportTitle?.trim() || meta.name;
  const durationSec = sampleLength / Math.max(1, source.sampleRate);
  const pkg = createMaterialPackageFromExport({
    name: exportTitle,
    role: meta.role,
    bpm: Number.isFinite((meta.bars * 4 * 60) / Math.max(0.001, durationSec))
      ? Math.max(1, Math.min(999, (meta.bars * 4 * 60) / Math.max(0.001, durationSec)))
      : meta.bpm,
    bars: meta.bars,
    guideSegments: meta.guideSegments,
    guideMarkers: meta.guideMarkers,
    loopStartSec: 0,
    loopEndSec: durationSec,
    rootHz: null,
    sourceVersion: 'xensonar-material-intake-v1',
    renderMode: 'raw-loop-selection',
    durationSec,
    intendedLoopDurationSec: durationSec,
  }, blob);
  return registerExternalMaterialPackage(pkg);
}

export const rawXensonarTargetAdapter: MaterialTargetAdapter = {
  id: 'raw-xensonar-send',
  label: 'Roh an Xensonar',
  acceptsRawLoop: true,
  acceptsAnalysisMeta: true,
  acceptsSpectralProjection: false,
  async commitLoop(payload) {
    registerRawSelectionAsMaterialEntry(payload);
  },
};
