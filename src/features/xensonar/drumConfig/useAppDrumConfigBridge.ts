import { listenXensonarEvent } from '../runtime/xensonarEventChannels';
import { listenDrumConfigLibraryEvent } from './drumConfigLibraryEventContract';
import { useEffect } from 'react';
import type { MutableRefObject } from 'react';
import type { DrumConfigPatch } from '../drumConfigUiHelpersTypes';
import { createDrumConfigDeletedHandler, createDrumConfigRegisteredHandler, createDrumConfigSendRequestHandler } from './drumConfigLibraryEvents';
import { applyDrumConfigModeFallback } from './drumConfigEffectHandlers';
import { useDrumConfigLibraryState } from './useDrumConfigLibraryState';

type DrumConfigBridgeState = {
  drumConfigMode: 'preset' | 'exported';
  drumConfigId: string;
};

type UseAppDrumConfigBridgeArgs = {
  drumConfigId: string;
  drumConfigMode: DrumConfigBridgeState['drumConfigMode'];
  nexusParamsRef: MutableRefObject<DrumConfigBridgeState>;
  updateNParams: (patch: DrumConfigPatch & { drumActive?: boolean }) => void;
};

export function useAppDrumConfigBridge({
  drumConfigId,
  drumConfigMode,
  nexusParamsRef,
  updateNParams,
}: UseAppDrumConfigBridgeArgs) {
  const {
    drumConfigLibraryState,
    exportedDrumConfigs,
    selectedExportedDrumConfig,
  } = useDrumConfigLibraryState(drumConfigId);

  useEffect(() => {
    applyDrumConfigModeFallback({
      drumConfigMode,
      drumConfigId,
      selectedExportedDrumConfig,
      exportedDrumConfigs,
      updateNParams,
    });
  }, [drumConfigMode, drumConfigId, selectedExportedDrumConfig, exportedDrumConfigs, updateNParams]);

  useEffect(() => {
    const handleRegistered = createDrumConfigRegisteredHandler({
      currentDrumConfigMode: () => nexusParamsRef.current.drumConfigMode,
      currentDrumConfigId: () => nexusParamsRef.current.drumConfigId,
      updateNParams,
    });
    const handleDeleted = createDrumConfigDeletedHandler({
      currentDrumConfigId: () => nexusParamsRef.current.drumConfigId,
      updateNParams,
    });
    const unlistenRegistered = listenDrumConfigLibraryEvent('registered', (_detail, event) => handleRegistered(event));
    const unlistenDeleted = listenDrumConfigLibraryEvent('deleted', (_detail, event) => handleDeleted(event));
    return () => {
      unlistenRegistered();
      unlistenDeleted();
    };
  }, [nexusParamsRef, updateNParams]);

  useEffect(() => {
    const handleSendRequest = createDrumConfigSendRequestHandler({ updateNParams });
    return listenXensonarEvent('drumConfigSendRequest', (_detail, event) => handleSendRequest(event));
  }, [updateNParams]);

  return {
    drumConfigLibraryState,
    exportedDrumConfigs,
    selectedExportedDrumConfig,
  };
}
