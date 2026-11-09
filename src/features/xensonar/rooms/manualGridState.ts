import { clamp } from './resonanceRuntimeMath';

export function toggleManualGridStep(normalizedStep: number, current: number[]): number[] {
  return current.includes(normalizedStep)
    ? current.filter((value) => value !== normalizedStep)
    : [...current, normalizedStep];
}

export function buildManualGridStepOffsets(length: number, current: number[] | undefined, normalizedStep: number, offsetValue: number): number[] {
  const next = [...(current ?? Array.from({ length }, () => 0))];
  next[normalizedStep] = clamp(offsetValue, -50, 50);
  return next;
}
