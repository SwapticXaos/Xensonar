import { clamp } from '../rooms/resonanceRuntimeMath';

export type ResolveRootFollowTargetHzArgs = {
  cursorY: number;
  freqFromY: (y: number, ...rest: any[]) => number;
  minHz?: number;
  maxHz?: number;
};

export function resolveRootFollowTargetHz(args: ResolveRootFollowTargetHzArgs) {
  const minHz = Number.isFinite(args.minHz ?? NaN) ? Number(args.minHz) : 27.5;
  const maxHz = Number.isFinite(args.maxHz ?? NaN) ? Number(args.maxHz) : 3520;
  return clamp(args.freqFromY(args.cursorY), minHz, maxHz);
}
