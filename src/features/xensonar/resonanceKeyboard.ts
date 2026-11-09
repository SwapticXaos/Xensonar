export type ResonanceWaveDirection = "left" | "right" | "up" | "down";

export const RESONANCE_WINDOW_SHIFT_CODES = {
  down: "BracketLeft",
  up: "Minus",
} as const;

export const RESONANCE_TUNING_PREV_KEYS = [",", ";"] as const;
export const RESONANCE_TUNING_NEXT_KEYS = [".", ":"] as const;

export const isTargetWithinHotkeyScope = (target: EventTarget | null, scope: string) => {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  return !!el.closest(`[data-hotkey-scope~="${scope}"]`);
};

export const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName?.toLowerCase?.() ?? "";
  if (tag === "textarea") return true;
  if (tag === "input") {
    const input = el as HTMLInputElement;
    const type = (input.type || "text").toLowerCase();
    return !["range", "checkbox", "button", "submit", "reset", "radio"].includes(type);
  }
  // Keep keyboard controls available even when select/range UI keeps focus.
  return false;
};

export const isResonanceWaveTriggerKey = (key: string) => {
  const normalized = key.toLowerCase();
  return normalized === "y" || normalized === "x" || normalized === "c" || normalized === "v";
};

export const getWaveDirectionForKey = (key: string): ResonanceWaveDirection | null => {
  const normalized = key.toLowerCase();
  if (normalized === "y") return "left";
  if (normalized === "x") return "right";
  if (normalized === "c") return "up";
  if (normalized === "v") return "down";
  return null;
};

export const isKeyboardWindowShiftCode = (code: string) =>
  code === RESONANCE_WINDOW_SHIFT_CODES.down || code === RESONANCE_WINDOW_SHIFT_CODES.up;

export const getKeyboardWindowShiftDirection = (code: string): -1 | 1 | null => {
  if (code === RESONANCE_WINDOW_SHIFT_CODES.down) return 1;
  if (code === RESONANCE_WINDOW_SHIFT_CODES.up) return -1;
  return null;
};

export const isPrevGridTuningKey = (key: string) =>
  RESONANCE_TUNING_PREV_KEYS.includes(key as (typeof RESONANCE_TUNING_PREV_KEYS)[number]);

export const isNextGridTuningKey = (key: string) =>
  RESONANCE_TUNING_NEXT_KEYS.includes(key as (typeof RESONANCE_TUNING_NEXT_KEYS)[number]);

export const isGridModeCycleEvent = (event: Pick<KeyboardEvent, "key" | "code">) =>
  event.key === "AltGraph" || event.code === "ControlRight";

export const getGridModeCycleDirection = (event: Pick<KeyboardEvent, "code">): -1 | 1 =>
  event.code === "ControlRight" ? -1 : 1;

export const normalizeKeyboardPitchKey = (key: string) => key.toLowerCase();

export const createKeyboardPitchMap = (keyList: readonly string[]) =>
  new Map(keyList.map((key, index) => [normalizeKeyboardPitchKey(key), index] as const));

export const getMirroredKeyboardPitchIndex = (index: number, totalKeys: number) => {
  if (index < 0 || totalKeys <= 0) return index;
  return totalKeys - 1 - index;
};

export const shouldToggleKeyboardMirror = (_event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey">) => false;

export const getKeyboardPitchIndex = (key: string, keyList: readonly string[]) =>
  keyList.indexOf(normalizeKeyboardPitchKey(key));

export const getKeyboardPitchIndexFromMap = (key: string, keyMap: ReadonlyMap<string, number>) =>
  keyMap.get(normalizeKeyboardPitchKey(key)) ?? -1;


export const createKeyboardPitchCodeMap = (codeList: readonly string[]) =>
  new Map(codeList.map((code, index) => [code, index] as const));

export const getKeyboardPitchIndexFromEvent = (
  event: Pick<KeyboardEvent, "key" | "code">,
  keyMap: ReadonlyMap<string, number>,
  codeMap: ReadonlyMap<string, number>,
) =>
  codeMap.get(event.code) ?? getKeyboardPitchIndexFromMap(event.key, keyMap);

export const isPitchKey = (key: string, keyList: readonly string[]) =>
  getKeyboardPitchIndex(key, keyList) >= 0;

export const isPitchKeyFromMap = (key: string, keyMap: ReadonlyMap<string, number>) =>
  getKeyboardPitchIndexFromMap(key, keyMap) >= 0;
