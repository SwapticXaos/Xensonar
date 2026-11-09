import { useEffect, useState } from 'react';
import type { GridTuning } from '../domain/instrumentData';
import { useGridTuningWorkbenchState } from '../domain/useGridTuningWorkbenchState';
import { OPEN_GRID_TUNING_RACK_EVENT } from './resonanceWorkspaceIntentEvents';
import type { ResonanceControlUpdateNParams } from './resonanceControlCoreTypes';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const GRID_BASE_MIN = 400;
const GRID_BASE_MAX = 1760;

export function useResonanceControlCoreUiState(args: {
  gridBase: number;
  gridTuning: GridTuning;
  updateNParams: ResonanceControlUpdateNParams;
}) {
  const { gridBase, gridTuning, updateNParams } = args;
  const [gridBaseInput, setGridBaseInput] = useState(() => gridBase.toFixed(1));
  const [gridRackDialogOpen, setGridRackDialogOpen] = useState(false);
  const [droneEditorOpen, setDroneEditorOpen] = useState(false);
  const {
    activeGridRack,
    libraryOptions: gridTuningLibraryOptions,
    setStoredActiveGridRack,
    resetStoredActiveGridRack,
    getActiveOptions,
  } = useGridTuningWorkbenchState();

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const openGridRack = () => setGridRackDialogOpen(true);
    window.addEventListener(OPEN_GRID_TUNING_RACK_EVENT, openGridRack);
    return () => window.removeEventListener(OPEN_GRID_TUNING_RACK_EVENT, openGridRack);
  }, []);

  useEffect(() => {
    setGridBaseInput(gridBase.toFixed(1));
  }, [gridBase]);

  const commitGridBase = (rawValue: string) => {
    const parsed = Number(rawValue.replace(',', '.'));
    const safeValue = Number.isFinite(parsed) ? clamp(parsed, GRID_BASE_MIN, GRID_BASE_MAX) : gridBase;
    const rounded = Math.round(safeValue * 10) / 10;
    updateNParams({ gridBase: rounded });
    setGridBaseInput(rounded.toFixed(1));
  };

  return {
    gridBaseInput,
    setGridBaseInput,
    gridRackDialogOpen,
    setGridRackDialogOpen,
    droneEditorOpen,
    setDroneEditorOpen,
    activeGridRack,
    gridTuningLibraryOptions,
    activeGridTuningOptions: getActiveOptions(gridTuning),
    commitGridBase,
    handleActiveRackChange: (nextRack: GridTuning[]) => setStoredActiveGridRack(nextRack),
    handleResetActiveRack: () => resetStoredActiveGridRack(),
  };
}
