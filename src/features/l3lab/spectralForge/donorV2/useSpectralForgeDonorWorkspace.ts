import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioSourceAsset } from '../audio/AudioImporterTypes';
import type { DonorProofSelection } from '../components/harmonizerPanel/DonorProofStrip';
import { computeLoopDurationSec, useStore } from '../state/store';
import { donorHearingRuntime, useDonorHearingRuntime } from './donorHearingRuntime';
import { playSelectedDonorHearing, playSelectedDonorProof, type DonorProofKind } from './donorHearingPlayback';

export function useSpectralForgeDonorWorkspace() {
  const donorState = useDonorHearingRuntime();
  const donorReady = !!donorState.source && !!donorState.model;
  const donorPhase: 'idle' | 'rendering' | 'playing' | 'error' =
    donorState.phase === 'rendering' || donorState.phase === 'playing' || donorState.phase === 'error'
      ? donorState.phase
      : 'idle';
  const donorError = donorState.error;
  const extractionGeneration = useRef(0);
  const [donorProofActive, setDonorProofActive] = useState<DonorProofSelection | null>(null);

  const stopDonorAudition = () => donorHearingRuntime.stop();

  useEffect(() => () => {
    extractionGeneration.current++;
    donorHearingRuntime.stop();
  }, []);

  const handleDonorInputChange = useCallback((source: AudioSourceAsset | null, startSec: number, durationSec: number) => {
    const generation = donorHearingRuntime.getSnapshot().generation;
    donorHearingRuntime.invalidateInput(source, startSec, durationSec);
    if (donorHearingRuntime.getSnapshot().generation !== generation) extractionGeneration.current++;
  }, []);

  const handleDonorPreview = async () => {
    const state = donorHearingRuntime.getSnapshot();
    if (state.phase === 'rendering' || state.phase === 'playing') {
      donorHearingRuntime.stop();
      setDonorProofActive(null);
      return;
    }
    if (!donorHearingRuntime.selectDonor()) return;
    const current = useStore.getState();
    current.setCarrierDonorV2DonorUseMode('timbre_projection');
    const duration = computeLoopDurationSec(current.materialExport.bars, current.materialExport.bpm);
    setDonorProofActive('carrier');
    try {
      await playSelectedDonorHearing(current.spectralData, duration, {
        loopPreview: current.materialExport.loopPreview,
        onEnd: () => setDonorProofActive(null),
      });
    } catch {
      setDonorProofActive(null);
      // Runtime publishes the actionable error next to both hearing controls.
    }
  };

  const handleDonorProof = async (kind: DonorProofSelection) => {
    if (kind === 'carrier') {
      await handleDonorPreview();
      return;
    }
    const state = donorHearingRuntime.getSnapshot();
    if (state.phase === 'rendering' || state.phase === 'playing') {
      donorHearingRuntime.stop();
      setDonorProofActive(null);
      if (donorProofActive === kind) return;
    }
    if (!donorHearingRuntime.selectDonor()) return;
    useStore.getState().setCarrierDonorV2DonorUseMode('timbre_projection');
    setDonorProofActive(kind);
    try {
      const started = await playSelectedDonorProof(kind as DonorProofKind, () => setDonorProofActive(null));
      if (!started) setDonorProofActive(null);
    } catch {
      setDonorProofActive(null);
    }
  };

  const selectOtherHearing = () => {
    setDonorProofActive(null);
    donorHearingRuntime.selectCarrier();
  };

  return {
    donorState,
    donorReady,
    donorPhase,
    donorError,
    extractionGeneration,
    donorProofActive,
    stopDonorAudition,
    handleDonorInputChange,
    handleDonorPreview,
    handleDonorProof,
    selectOtherHearing,
  };
}
