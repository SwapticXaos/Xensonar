/**
 * HyperCalibrate and HyperCali2 control block for Resonance room.
 * Vision §8: clearer modules; keeps ResonanceRoom layout-only.
 * Types for hyperCalib UI state match useHyperCalibUI (single source of truth).
 */

import type { HyperCalib2UIState, HyperCalibUIState } from "../useHyperCalibUI";

type ResonanceHyperCalibBlockProps = {
  hyperCalibUI: HyperCalibUIState;
  hyperCalib2UI: HyperCalib2UIState;
  hyperCalibrateOn: boolean;
  hyperCalibratedReady: boolean;
  hyperCali2On: boolean;
  hyperCali2Ready: boolean;
  onHyperCalibrate: () => void;
  onHyperCali2: () => void;
};

export function ResonanceHyperCalibBlock({
  hyperCalibUI,
  hyperCalib2UI,
  hyperCalibrateOn,
  hyperCalibratedReady,
  hyperCali2On,
  hyperCali2Ready,
  onHyperCalibrate,
  onHyperCali2,
}: ResonanceHyperCalibBlockProps) {
  return (
    <div className="border border-neutral-800 bg-black p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        type="button"
        className={`px-3 py-2 border ${hyperCalibrateOn ? "border-fuchsia-400 text-fuchsia-200" : "border-neutral-600 text-neutral-200"}`}
        onClick={onHyperCalibrate}
      >
        HyperCalibrate {hyperCalibUI.running ? `TAP ${hyperCalibUI.tapCount}/10` : hyperCalibrateOn ? "ON" : hyperCalibratedReady ? "READY" : "START"}
      </button>
      <button
        type="button"
        className={`px-3 py-2 border ${hyperCali2On ? "border-lime-400 text-lime-200" : "border-neutral-600 text-neutral-200"}`}
        onClick={onHyperCali2}
      >
        HyperCali2 {hyperCalib2UI.running ? `CAPTURE ${hyperCalib2UI.moveCount} / ${hyperCalib2UI.clickCount}` : hyperCali2On ? "ON" : hyperCali2Ready ? "READY" : "START"}
      </button>
    </div>
  );
}
