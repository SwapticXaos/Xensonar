import { clamp } from '../rooms/resonanceRuntimeMath';

export function firstRootFollowSliceOnGridAtOrAfter(args: {
  transportAnchor: number;
  stepSec: number;
  earliestStart: number;
}) {
  const stepSec = Math.max(0.001, Number.isFinite(args.stepSec) ? args.stepSec : 0.024);
  const transportAnchor = Number.isFinite(args.transportAnchor) ? args.transportAnchor : 0;
  const earliestStart = Number.isFinite(args.earliestStart) ? args.earliestStart : transportAnchor;
  if (earliestStart <= transportAnchor) return transportAnchor;
  const steps = Math.ceil((earliestStart - transportAnchor) / stepSec - 1e-9);
  return transportAnchor + Math.max(0, steps) * stepSec;
}

export function smoothRootFollowMaterialTargetHz(args: {
  previousHz: number | null | undefined;
  rawHz: number;
  stepSec: number;
  timeConstantSec?: number;
}) {
  const rawHz = clamp(Number.isFinite(args.rawHz) ? args.rawHz : 110, 27.5, 3520);
  const previousHz = Number.isFinite(args.previousHz ?? NaN) ? clamp(Number(args.previousHz), 27.5, 3520) : null;
  if (previousHz === null) return rawHz;
  const stepSec = Math.max(0.001, Number.isFinite(args.stepSec) ? args.stepSec : 0.024);
  const timeConstantSec = Math.max(0.006, Number.isFinite(args.timeConstantSec ?? NaN) ? Number(args.timeConstantSec) : 0.032);
  const alpha = clamp(1 - Math.exp(-stepSec / timeConstantSec), 0.08, 0.82);
  return clamp(previousHz + (rawHz - previousHz) * alpha, 27.5, 3520);
}


export type RootFollowLateSliceResyncResult = {
  nextSliceStart: number;
  resynced: boolean;
  lateBySec: number;
  minimumSafeStartSec: number;
};

export function resolveRootFollowLateSliceResync(args: {
  nextSliceStart: number;
  transportAnchor: number;
  stepSec: number;
  currentTime: number;
  minimumLeadInSec: number;
  scheduleSafetyLeadSec?: number;
}): RootFollowLateSliceResyncResult {
  const stepSec = Math.max(0.001, Number.isFinite(args.stepSec) ? args.stepSec : 0.024);
  const currentTime = Number.isFinite(args.currentTime) ? args.currentTime : 0;
  const minimumLeadInSec = Math.max(0.004, Number.isFinite(args.minimumLeadInSec) ? args.minimumLeadInSec : 0.018);
  const scheduleSafetyLeadSec = Math.max(0.004, Math.min(0.032, Number.isFinite(args.scheduleSafetyLeadSec ?? NaN) ? Number(args.scheduleSafetyLeadSec) : Math.min(0.014, stepSec * 0.62)));
  const minimumSafeStartSec = currentTime + scheduleSafetyLeadSec;
  const nextSliceStart = Number.isFinite(args.nextSliceStart) ? args.nextSliceStart : minimumSafeStartSec;
  const lateBySec = Math.max(0, minimumSafeStartSec - nextSliceStart);
  if (lateBySec <= 0.0005) {
    return { nextSliceStart, resynced: false, lateBySec: 0, minimumSafeStartSec };
  }

  const resyncedStart = firstRootFollowSliceOnGridAtOrAfter({
    transportAnchor: args.transportAnchor,
    stepSec,
    earliestStart: Math.max(currentTime + minimumLeadInSec, minimumSafeStartSec),
  });

  return {
    nextSliceStart: resyncedStart,
    resynced: true,
    lateBySec,
    minimumSafeStartSec,
  };
}
