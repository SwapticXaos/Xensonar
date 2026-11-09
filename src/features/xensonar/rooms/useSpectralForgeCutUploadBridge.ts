import { useEffect, type MutableRefObject } from 'react';
import { createCutUploadEntryScrollIntent, SPECTRAL_FORGE_CUT_UPLOAD_ORIGIN, type SpectralForgeEntryScrollIntent, type SpectralForgeExternalAudioOrigin } from '../../l3lab/contracts/spectralForgeEntryIntent';
import type { Room } from '../domain/runtimeTypes';
import { listenXensonarEvent } from '../runtime/xensonarEventChannels';
import { writeLevel3LabMode } from './xenpolarShortcut';

type UseSpectralForgeCutUploadBridgeArgs = {
  spectralForgeCutUploadRafIdsRef: MutableRefObject<number[]>;
  spectralForgeCutUploadSequenceRef: MutableRefObject<number>;
  setSpectralForgeExternalAudioFile: (file: File | null) => void;
  setSpectralForgeExternalAudioOrigin: (origin: SpectralForgeExternalAudioOrigin | null) => void;
  setSpectralForgeEntryScrollIntent: (intent: SpectralForgeEntryScrollIntent | null) => void;
  setRoom: (room: Room) => void;
};

export function useSpectralForgeCutUploadBridge({
  spectralForgeCutUploadRafIdsRef,
  spectralForgeCutUploadSequenceRef,
  setSpectralForgeExternalAudioFile,
  setSpectralForgeExternalAudioOrigin,
  setSpectralForgeEntryScrollIntent,
  setRoom,
}: UseSpectralForgeCutUploadBridgeArgs) {
  useEffect(() => {
    const clearScheduledSpectralForgeCutUpload = () => {
      spectralForgeCutUploadRafIdsRef.current.forEach((rafId) => window.cancelAnimationFrame(rafId));
      spectralForgeCutUploadRafIdsRef.current = [];
    };

    const scheduleExternalAudioDelivery = (file: File) => {
      const sequence = spectralForgeCutUploadSequenceRef.current + 1;
      spectralForgeCutUploadSequenceRef.current = sequence;
      clearScheduledSpectralForgeCutUpload();
      setSpectralForgeExternalAudioFile(null);
      setSpectralForgeExternalAudioOrigin(null);
      setSpectralForgeEntryScrollIntent(null);
      try { writeLevel3LabMode('experimental'); } catch { /* ignore storage failures */ }
      setRoom('L3LAB');
      const firstFrame = window.requestAnimationFrame(() => {
        const secondFrame = window.requestAnimationFrame(() => {
          spectralForgeCutUploadRafIdsRef.current = spectralForgeCutUploadRafIdsRef.current.filter((rafId) => rafId !== firstFrame && rafId !== secondFrame);
          if (spectralForgeCutUploadSequenceRef.current !== sequence) return;
          setSpectralForgeExternalAudioOrigin(SPECTRAL_FORGE_CUT_UPLOAD_ORIGIN);
          setSpectralForgeEntryScrollIntent(createCutUploadEntryScrollIntent(sequence));
          setSpectralForgeExternalAudioFile(file);
        });
        spectralForgeCutUploadRafIdsRef.current.push(secondFrame);
      });
      spectralForgeCutUploadRafIdsRef.current.push(firstFrame);
    };

    const unsubscribe = listenXensonarEvent('spectralForgeAudioCutUpload', (detail) => {
      const file = detail?.file ?? null;
      if (!file) return;
      scheduleExternalAudioDelivery(file);
    });
    return () => {
      clearScheduledSpectralForgeCutUpload();
      unsubscribe();
    };
  }, [
    setRoom,
    setSpectralForgeEntryScrollIntent,
    setSpectralForgeExternalAudioFile,
    setSpectralForgeExternalAudioOrigin,
    spectralForgeCutUploadRafIdsRef,
    spectralForgeCutUploadSequenceRef,
  ]);
}
