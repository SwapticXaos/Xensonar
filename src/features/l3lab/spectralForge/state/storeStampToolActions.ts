import type { StampData } from '../audio/SpectralData';

export type StampPhase = 'idle' | 'selecting' | 'stamping';

export type StampToolHostState = {
  stampData: StampData | null;
  stampScaleX: number;
  stampScaleY: number;
  stampRotation: number;
  stampFlipX: boolean;
  stampFlipY: boolean;
  stampPhase: StampPhase;
  stampSelStart: { x: number; y: number } | null;
};

type StoreSet<T extends StampToolHostState> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;

export type StampToolStoreActions = {
  setStampData: (data: StampData | null) => void;
  setStampScale: (scaleX: number, scaleY?: number) => void;
  adjustStampScale: (dx: number, dy: number) => void;
  rotateStamp: (deltaRadians: number) => void;
  setStampRotation: (rotationRadians: number) => void;
  toggleStampFlipX: () => void;
  toggleStampFlipY: () => void;
  resetStampTransform: () => void;
  setStampPhase: (phase: StampPhase) => void;
  setStampSelStart: (pos: { x: number; y: number } | null) => void;
};

export const MIN_STAMP_SCALE = 0.1;
export const MAX_STAMP_SCALE = 8;
export const TWO_PI = Math.PI * 2;

export function clampStampScale(scale: number): number {
  return Math.max(MIN_STAMP_SCALE, Math.min(MAX_STAMP_SCALE, scale));
}

export function wrapStampRotation(rotationRadians: number): number {
  return ((rotationRadians % TWO_PI) + TWO_PI) % TWO_PI;
}

export function createStampDataState<T extends StampToolHostState>(data: StampData | null): Partial<T> {
  return {
    stampData: data,
    stampScaleX: 1,
    stampScaleY: 1,
    stampRotation: 0,
    stampFlipX: false,
    stampFlipY: false,
  } as Partial<T>;
}

export function setStampScaleState<T extends StampToolHostState>(state: T, scaleX: number, scaleY?: number): Partial<T> {
  return {
    stampScaleX: clampStampScale(scaleX),
    stampScaleY: clampStampScale(scaleY ?? state.stampScaleY),
  } as Partial<T>;
}

export function adjustStampScaleState<T extends StampToolHostState>(state: T, dx: number, dy: number): Partial<T> {
  return {
    stampScaleX: clampStampScale(state.stampScaleX + dx),
    stampScaleY: clampStampScale(state.stampScaleY + dy),
  } as Partial<T>;
}

export function rotateStampState<T extends StampToolHostState>(state: T, deltaRadians: number): Partial<T> {
  return {
    stampRotation: wrapStampRotation(state.stampRotation + deltaRadians),
  } as Partial<T>;
}

export function setStampRotationState<T extends StampToolHostState>(rotationRadians: number): Partial<T> {
  return {
    stampRotation: wrapStampRotation(rotationRadians),
  } as Partial<T>;
}

export function resetStampTransformState<T extends StampToolHostState>(): Partial<T> {
  return {
    stampScaleX: 1,
    stampScaleY: 1,
    stampRotation: 0,
    stampFlipX: false,
    stampFlipY: false,
  } as Partial<T>;
}

export function createStampToolStoreActions<T extends StampToolHostState>(set: StoreSet<T>): StampToolStoreActions {
  return {
    setStampData: (data) => set(createStampDataState<T>(data)),
    setStampScale: (scaleX, scaleY) => set((state) => setStampScaleState(state, scaleX, scaleY)),
    adjustStampScale: (dx, dy) => set((state) => adjustStampScaleState(state, dx, dy)),
    rotateStamp: (deltaRadians) => set((state) => rotateStampState(state, deltaRadians)),
    setStampRotation: (rotationRadians) => set(setStampRotationState<T>(rotationRadians)),
    toggleStampFlipX: () => set((state) => ({ stampFlipX: !state.stampFlipX }) as Partial<T>),
    toggleStampFlipY: () => set((state) => ({ stampFlipY: !state.stampFlipY }) as Partial<T>),
    resetStampTransform: () => set(resetStampTransformState<T>()),
    setStampPhase: (phase) => set({ stampPhase: phase } as Partial<T>),
    setStampSelStart: (pos) => set({ stampSelStart: pos } as Partial<T>),
  };
}
