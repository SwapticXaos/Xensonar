import { useEffect, type MutableRefObject } from "react";
import { isEditableTarget } from "../resonanceKeyboard";
import { isForgeHotkeyTarget, shouldCaptureResonanceKey } from "../rooms/resonanceInputRouting";

export type ResonanceKeyCaptureParamsRef = MutableRefObject<{
  quantizeOn: boolean;
}>;

export type UseResonanceKeyCaptureGateOptions = {
  resonanceInputActive: boolean;
  nexusParamsRef: ResonanceKeyCaptureParamsRef;
};

export function useResonanceKeyCaptureGate({
  resonanceInputActive,
  nexusParamsRef,
}: UseResonanceKeyCaptureGateOptions): void {
  useEffect(() => {
    const onKeyCapture = (event: KeyboardEvent) => {
      if (!resonanceInputActive || isEditableTarget(event.target) || isForgeHotkeyTarget(event.target)) return;
      if (shouldCaptureResonanceKey(event, nexusParamsRef.current.quantizeOn)) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyCapture, true);
    return () => window.removeEventListener("keydown", onKeyCapture, true);
  }, [nexusParamsRef, resonanceInputActive]);
}
