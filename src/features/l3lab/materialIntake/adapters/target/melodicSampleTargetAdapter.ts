import type { CanonicalSourceView } from '../../../canonicalForge/analysis';
import type { DestructiveAudioProfile, SynthMode, WarpAudioProfile, WaveformMix } from '../../../canonicalForge/selectionAudioTransfer';
import type { SpectralData } from '../../../spectralForge/audio/SpectralData';
import type { MaterialTargetAdapter } from '../../types';
import { saveRawSelectionAsMelodicSample } from '../../../melodicSamples/melodicSampleIntake';

export function createRawMelodicSampleTargetAdapter(args: {
  spectralData: SpectralData;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  sourceView?: CanonicalSourceView;
  activeWorkspace?: string;
  destructiveProfile?: DestructiveAudioProfile | null;
  warpProfile?: WarpAudioProfile | null;
}): MaterialTargetAdapter {
  return {
    id: 'melodic-loop-raw-sample-send',
    label: 'Als Sample speichern',
    acceptsRawLoop: true,
    acceptsAnalysisMeta: true,
    acceptsSpectralProjection: false,
    async commitLoop(payload) {
      await saveRawSelectionAsMelodicSample({
        payload,
        spectralData: args.spectralData,
        synthMode: args.synthMode,
        waveformMix: args.waveformMix,
        sourceView: args.sourceView,
        activeWorkspace: args.activeWorkspace,
        destructiveProfile: args.destructiveProfile,
        warpProfile: args.warpProfile,
      });
    },
  };
}
