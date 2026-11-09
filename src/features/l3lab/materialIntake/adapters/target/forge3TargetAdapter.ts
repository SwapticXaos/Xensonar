import { useStore } from '../../../spectralForge/state/store';
import { audioEngine } from '../../../spectralForge/audio/AudioEngine';
import {
  attachAnalysisCacheToSourceAsset,
  importAudioSourceToSpectralData,
  retargetAudioSourceAsset,
} from '../../../spectralForge/audio/AudioImporter';
import type { MaterialTargetAdapter } from '../../types';

export const forge3TargetAdapter: MaterialTargetAdapter = {
  id: 'forge3-workbench',
  label: 'Spektral-Werkbank',
  acceptsRawLoop: false,
  acceptsAnalysisMeta: true,
  acceptsSpectralProjection: true,
  async commitLoop(payload) {
    const state = useStore.getState();
    if (state.isPlaying) {
      audioEngine.stop();
      state.setIsPlaying(false);
      state.setPlayheadPosition(0);
      state.setShowPlayheadMarker(false);
    }
    state.pushUndo();
    const retargeted = retargetAudioSourceAsset(payload.source.sourceAsset, payload.selection.fineLoopRange);
    const info = await importAudioSourceToSpectralData(retargeted, state.spectralData, { readMode: payload.readMode });
    const enriched = await attachAnalysisCacheToSourceAsset({ ...retargeted, projectionReadMode: payload.readMode });
    state.setSourceAsset(enriched);
    state.setSourcePreviewMode('forge');
    state.setAudioBufferDirty(true);
    state.triggerRender();
    state.updateMaterialExport({
      bpm: state.materialExport.bpm,
      bars: state.materialExport.bars,
    });
    window.dispatchEvent(new CustomEvent('xensonar:forge3-commit', {
      detail: {
        startSec: info.importStartSec,
        durationSec: info.importedDuration,
        readMode: payload.readMode,
      },
    }));
  },
};
