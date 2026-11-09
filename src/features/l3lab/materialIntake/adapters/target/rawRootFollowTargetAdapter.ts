import { dispatchXensonarEvent } from '../../../../xensonar/runtime/xensonarEventChannels';
import { encodeChannelsFloat32ToWavBlob } from '../../../spectralForge/audio/wavEncoding';
import { useStore } from '../../../spectralForge/state/store';
import { createMaterialPackageFromExport } from '../../../materialAdapter';
import { registerExternalMaterialPackage } from '../../../materialLibrary';
import type { MaterialTargetAdapter } from '../../types';

export const rawRootFollowTargetAdapter: MaterialTargetAdapter = {
  id: 'raw-root-follow-send',
  label: 'Als Root-Follow-Loop verwenden',
  acceptsRawLoop: true,
  acceptsAnalysisMeta: true,
  acceptsSpectralProjection: false,
  async commitLoop(payload) {
    const state = useStore.getState();
    const range = payload.selection.fineLoopRange;
    const source = payload.source.sourceAsset;
    const startSample = Math.max(0, Math.floor(range.startSec * source.sampleRate));
    const sampleLength = Math.max(1, Math.min(source.monoSamples.length - startSample, Math.floor(Math.max(0.05, range.durationSec) * source.sampleRate)));
    const channels = source.channelCount > 1 ? [source.leftSamples, source.rightSamples] : [source.monoSamples];
    const blob = encodeChannelsFloat32ToWavBlob(channels.map(channel => channel.subarray(startSample, startSample + sampleLength)), source.sampleRate);
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
      renderMode: 'raw-root-follow-loop-selection',
      durationSec,
      intendedLoopDurationSec: durationSec,
      rootFollowPreferred: true,
      workspaceOrigin: 'spectral-forge-cut-root-follow',
      routeSummary: 'In SpectralForge geschnitten und direkt als Root-Follow-Loop markiert.',
      stabilizeBy: 'Die Feinauswahl aus dem Audio-Import wird als Loopkörper gesichert; die Tonhöhe folgt danach im Hauptraum live dem Raster.',
    }, blob);
    const entry = registerExternalMaterialPackage(pkg);
    dispatchXensonarEvent('rootFollowBankMembership', {
      entryId: entry.id,
      enabled: true,
      activate: true,
      config: { sourceKind: 'material', renderMode: 'flowing' },
    });
  },
};
