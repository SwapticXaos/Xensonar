import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GRID_TUNING_LIBRARY_UPDATED_EVENT,
  GRID_TUNING_RACK_UPDATED_EVENT,
  getOptionLabel,
  getGridTuningLibraryOptions,
  readStoredActiveGridTuningRack,
  resetStoredActiveGridTuningRack,
  writeStoredActiveGridTuningRack,
  type GridTuning,
} from './instrumentData';

export type GridTuningLibraryOption = { value: GridTuning; label: string };

export const useGridTuningWorkbenchState = () => {
  const [activeGridRack, setActiveGridRack] = useState<GridTuning[]>(() => readStoredActiveGridTuningRack());
  const [libraryVersion, setLibraryVersion] = useState(0);

  const syncRack = useCallback(() => {
    setActiveGridRack(readStoredActiveGridTuningRack());
  }, []);

  const syncLibrary = useCallback(() => {
    setLibraryVersion((value) => value + 1);
    setActiveGridRack(readStoredActiveGridTuningRack());
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      syncRack();
      syncLibrary();
    };
    window.addEventListener(GRID_TUNING_RACK_UPDATED_EVENT, syncRack as EventListener);
    window.addEventListener(GRID_TUNING_LIBRARY_UPDATED_EVENT, syncLibrary as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(GRID_TUNING_RACK_UPDATED_EVENT, syncRack as EventListener);
      window.removeEventListener(GRID_TUNING_LIBRARY_UPDATED_EVENT, syncLibrary as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncLibrary, syncRack]);

  const libraryOptions = useMemo<GridTuningLibraryOption[]>(() => getGridTuningLibraryOptions(), [libraryVersion]);

  const setStoredActiveGridRack = useCallback((nextRack: GridTuning[]) => {
    writeStoredActiveGridTuningRack(nextRack);
    setActiveGridRack(readStoredActiveGridTuningRack());
  }, []);

  const resetStoredActiveGridRack = useCallback(() => {
    resetStoredActiveGridTuningRack();
    setActiveGridRack(readStoredActiveGridTuningRack());
  }, []);

  const getLabel = useCallback((tuning: GridTuning) => getOptionLabel(libraryOptions, tuning), [libraryOptions]);

  const getActiveOptions = useCallback(
    (current?: GridTuning): GridTuningLibraryOption[] => {
      const values = current && !activeGridRack.includes(current) ? [...activeGridRack, current] : activeGridRack;
      return values.map((value) => ({ value, label: getOptionLabel(libraryOptions, value) }));
    },
    [activeGridRack, libraryOptions],
  );

  return {
    activeGridRack,
    libraryOptions,
    setStoredActiveGridRack,
    resetStoredActiveGridRack,
    getLabel,
    getActiveOptions,
  };
};
