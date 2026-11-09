import { useCallback, useEffect, useState } from "react";
import { isEditableTarget } from "../resonanceKeyboard";

export function useResonanceInputIndicator(resonanceInputActive: boolean): boolean {
  const [resonanceInputIndicator, setResonanceInputIndicator] = useState(false);

  const refreshResonanceInputIndicator = useCallback(() => {
    setResonanceInputIndicator(isEditableTarget(document.activeElement));
  }, []);

  useEffect(() => {
    if (!resonanceInputActive) {
      setResonanceInputIndicator(false);
      return;
    }

    refreshResonanceInputIndicator();
    window.addEventListener("focusin", refreshResonanceInputIndicator);
    window.addEventListener("focusout", refreshResonanceInputIndicator);
    window.addEventListener("pointerdown", refreshResonanceInputIndicator);

    return () => {
      window.removeEventListener("focusin", refreshResonanceInputIndicator);
      window.removeEventListener("focusout", refreshResonanceInputIndicator);
      window.removeEventListener("pointerdown", refreshResonanceInputIndicator);
    };
  }, [refreshResonanceInputIndicator, resonanceInputActive]);

  return resonanceInputIndicator;
}
