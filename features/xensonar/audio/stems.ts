import type { StemKey } from "../types";

export type StemBusMap<TNode extends AudioNode> = Record<StemKey, TNode>;

export type StemBusTargets = {
  master: AudioNode;
  particles: AudioNode;
  waves: AudioNode;
  drone: AudioNode;
  fx: AudioNode;
};

export const getStemRenderFlags = (stemKey: StemKey) => ({
  includeDrone: stemKey === "master" || stemKey === "drone",
  includeParticles: stemKey === "master" || stemKey === "particles",
  includeWaves: stemKey === "master" || stemKey === "waves",
  includeFx: stemKey === "master" || stemKey === "fx",
});

export const resolveStemPlaybackTarget = (
  stemKey: StemKey,
  targets: StemBusTargets,
  requested: Exclude<StemKey, "master">,
) => {
  if (stemKey === requested) return targets.master;
  return targets[requested];
};
