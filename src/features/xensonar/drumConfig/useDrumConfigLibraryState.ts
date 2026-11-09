import { useEffect, useMemo, useState } from 'react';
import { getDrumConfigLibraryState, subscribeDrumConfigLibrary } from '../drumConfigLibrary';
import { resolveSelectedExportedDrumConfig } from '../drumConfigUiHelpers';

export function useDrumConfigLibraryState(drumConfigId: string) {
  const [drumConfigLibraryState, setDrumConfigLibraryState] = useState(() => getDrumConfigLibraryState());

  useEffect(() => {
    const unsubscribe = subscribeDrumConfigLibrary(() => setDrumConfigLibraryState(getDrumConfigLibraryState()));
    return () => {
      unsubscribe();
    };
  }, []);

  const exportedDrumConfigs = useMemo(
    () => drumConfigLibraryState.entries,
    [drumConfigLibraryState.entries],
  );

  const selectedExportedDrumConfig = useMemo(
    () => resolveSelectedExportedDrumConfig(exportedDrumConfigs, drumConfigId),
    [exportedDrumConfigs, drumConfigId],
  );

  return {
    drumConfigLibraryState,
    exportedDrumConfigs,
    selectedExportedDrumConfig,
  };
}
