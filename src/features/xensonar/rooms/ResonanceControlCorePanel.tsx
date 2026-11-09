import { GridTuningRackDialog } from './GridTuningRackDialog';
import { ResonanceHarmonicSystemControls } from './ResonanceHarmonicSystemControls';
import { ResonanceTimingEchoControls } from './ResonanceTimingEchoControls';
import { ResonanceDroneDriveControls } from './ResonanceDroneDriveControls';
import { useResonanceControlCoreUiState } from './useResonanceControlCoreUiState';
import type { ResonanceControlCorePanelProps } from './resonanceControlCoreTypes';

export function ResonanceControlCorePanel(props: ResonanceControlCorePanelProps) {
  const {
    nParamsUI,
    updateNParams,
    changeGridTuning,
  } = props;

  const ui = useResonanceControlCoreUiState({
    gridBase: nParamsUI.gridBase,
    gridTuning: nParamsUI.gridTuning,
    updateNParams,
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ResonanceHarmonicSystemControls
          {...props}
          gridBaseInput={ui.gridBaseInput}
          setGridBaseInput={ui.setGridBaseInput}
          commitGridBase={ui.commitGridBase}
          activeGridRack={ui.activeGridRack}
          activeGridTuningOptions={ui.activeGridTuningOptions}
          gridTuningLibraryOptions={ui.gridTuningLibraryOptions}
          openGridRack={() => ui.setGridRackDialogOpen(true)}
        />
        <ResonanceTimingEchoControls {...props} />
        <ResonanceDroneDriveControls
          {...props}
          droneEditorOpen={ui.droneEditorOpen}
          setDroneEditorOpen={ui.setDroneEditorOpen}
        />
      </div>
      <GridTuningRackDialog
        open={ui.gridRackDialogOpen}
        currentTuning={nParamsUI.gridTuning}
        activeRack={ui.activeGridRack}
        onClose={() => ui.setGridRackDialogOpen(false)}
        onRackChange={ui.handleActiveRackChange}
        onActivateTuning={changeGridTuning}
        onResetRack={ui.handleResetActiveRack}
      />
    </>
  );
}
