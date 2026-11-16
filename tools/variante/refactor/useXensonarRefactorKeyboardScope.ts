import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { WIDTH, clamp, getRowCount, keyboardWindowFrequency, modeAllowsStep, stepFromY, yFromStep } from "./music";
import type { Direction, Params } from "./types";

export type XensonarRefactorAstralCursor = {
  active: boolean;
  step: number;
  x: number;
};

type Cursor = { x: number; y: number; active: boolean };

type UseXensonarRefactorKeyboardScopeArgs = {
  pressedKeysRef: MutableRefObject<Set<string>>;
  astralCursorRef: MutableRefObject<XensonarRefactorAstralCursor>;
  cursorRef: MutableRefObject<Cursor>;
  paramsRef: MutableRefObject<Params>;
  setParams: Dispatch<SetStateAction<Params>>;
  setAstralActiveUi: Dispatch<SetStateAction<boolean>>;
  setAstralXUi: Dispatch<SetStateAction<number>>;
  setCursorStepUi: Dispatch<SetStateAction<number>>;
  spawnRipple: (x?: number, y?: number, energy?: number) => Promise<void>;
  spawnDirectedPulse: (direction: Direction) => Promise<void>;
  triggerWaveStart: (step: number, velocity?: number, panHint?: number, forceTime?: number) => Promise<void>;
};

const KEYBOARD_STEP_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const KEYBOARD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r", "t", "z", "u", "i", "o", "p"];
const WINDOW_LEFT_KEYS = ["ß", "?"];
const WINDOW_RIGHT_KEYS = ["ü", "plus"];

function getTotalRows(params: Params) {
  return getRowCount(params.tuning) * (params.tuning === "bp" ? 3 : 4);
}

export function useXensonarRefactorKeyboardScope({
  pressedKeysRef,
  astralCursorRef,
  cursorRef,
  paramsRef,
  setParams,
  setAstralActiveUi,
  setAstralXUi,
  setCursorStepUi,
  spawnRipple,
  spawnDirectedPulse,
  triggerWaveStart,
}: UseXensonarRefactorKeyboardScopeArgs) {
  useEffect(() => {
    const down = async (ev: KeyboardEvent) => {
      const key = ev.key.toLowerCase();
      if (pressedKeysRef.current.has(key)) return;
      pressedKeysRef.current.add(key);

      const activateAstral = () => {
        if (!astralCursorRef.current.active) {
          astralCursorRef.current.x = cursorRef.current.x;
          astralCursorRef.current.step = stepFromY(cursorRef.current.y, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz);
        }
        astralCursorRef.current.active = true;
        setAstralActiveUi(true);
        setAstralXUi(astralCursorRef.current.x);
        setCursorStepUi(astralCursorRef.current.step);
      };

      if ([" ", "arrowleft", "arrowright", "arrowup", "arrowdown", "home", "end", "pageup", "pagedown"].includes(key)) {
        ev.preventDefault();
      }

      if (key === " ") {
        activateAstral();
        await spawnRipple(
          astralCursorRef.current.x,
          yFromStep(astralCursorRef.current.step, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz),
        );
        return;
      }

      if (key === "y") return void spawnDirectedPulse("left");
      if (key === "x") return void spawnDirectedPulse("right");
      if (key === "c") return void spawnDirectedPulse("up");
      if (key === "v") return void spawnDirectedPulse("down");

      if (key === "arrowleft") {
        activateAstral();
        const nextX = clamp(astralCursorRef.current.x - (paramsRef.current.gridSnap ? 28 : 18), 0, WIDTH);
        astralCursorRef.current.x = nextX;
        setAstralXUi(nextX);
        return;
      }

      if (key === "arrowright") {
        activateAstral();
        const nextX = clamp(astralCursorRef.current.x + (paramsRef.current.gridSnap ? 28 : 18), 0, WIDTH);
        astralCursorRef.current.x = nextX;
        setAstralXUi(nextX);
        return;
      }

      if (key === "arrowup") {
        activateAstral();
        const nextStep = clamp(astralCursorRef.current.step + 1, 0, getTotalRows(paramsRef.current) - 1);
        astralCursorRef.current.step = nextStep;
        setCursorStepUi(nextStep);
        return;
      }

      if (key === "arrowdown") {
        activateAstral();
        const nextStep = clamp(astralCursorRef.current.step - 1, 0, getTotalRows(paramsRef.current) - 1);
        astralCursorRef.current.step = nextStep;
        setCursorStepUi(nextStep);
        return;
      }

      if (WINDOW_LEFT_KEYS.includes(key)) {
        activateAstral();
        setParams((prev) => ({ ...prev, keyboardWindowStart: Math.max(0, prev.keyboardWindowStart - 1) }));
        return;
      }

      if (WINDOW_RIGHT_KEYS.includes(key)) {
        activateAstral();
        setParams((prev) => ({ ...prev, keyboardWindowStart: prev.keyboardWindowStart + 1 }));
        return;
      }

      const idx = KEYBOARD_KEYS.indexOf(key);
      if (idx >= 0) {
        activateAstral();
        const line = keyboardWindowFrequency(paramsRef.current, paramsRef.current.keyboardWindowStart, KEYBOARD_STEP_MAP[idx]);
        if (!line) return;
        astralCursorRef.current.step = stepFromY(line.y, paramsRef.current.tuning, paramsRef.current.gridPerspective, paramsRef.current.tonicHz);
        astralCursorRef.current.x = clamp(((idx + 0.5) / KEYBOARD_KEYS.length) * WIDTH, 0, WIDTH);
        setAstralXUi(astralCursorRef.current.x);
        setCursorStepUi(astralCursorRef.current.step);
        await triggerWaveStart(
          astralCursorRef.current.step,
          modeAllowsStep(paramsRef.current.mode, line.stepIndex, paramsRef.current.tuning) ? 0.4 : 0.2,
          (astralCursorRef.current.x / WIDTH) * 2 - 1,
        );
        await spawnRipple(
          astralCursorRef.current.x,
          line.y,
          modeAllowsStep(paramsRef.current.mode, line.stepIndex, paramsRef.current.tuning) ? 0.8 : 0.45,
        );
      }
    };

    const up = (ev: KeyboardEvent) => {
      pressedKeysRef.current.delete(ev.key.toLowerCase());
    };

    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [astralCursorRef, cursorRef, paramsRef, pressedKeysRef, setAstralActiveUi, setAstralXUi, setCursorStepUi, setParams, spawnDirectedPulse, spawnRipple, triggerWaveStart]);
}
