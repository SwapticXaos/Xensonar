import {
  applyResidentModeMask,
  normalizeResidentMode,
  retuneResidentNodes,
  type ResidentMode,
  type ResidentSystem,
} from '../../topology/residentTheory';
import type { SemanticNode } from '../domain/runtimeTypes';

type ResidentConfigLike = {
  residentSystem: ResidentSystem;
  residentMode: ResidentMode;
};

type BuildTopologyResidentConfigActionsArgs = {
  topologyNodes: SemanticNode[];
  residentBaseHz: number;
};

export function buildTopologyResidentConfigActions(args: BuildTopologyResidentConfigActionsArgs) {
  return {
    retuneResidentsForConfig(nextConfig: ResidentConfigLike) {
      const normalizedMode = normalizeResidentMode(nextConfig.residentSystem, nextConfig.residentMode);
      retuneResidentNodes(args.topologyNodes, args.residentBaseHz, nextConfig.residentSystem, normalizedMode);
    },
    applyResidentModeForConfig(nextConfig: ResidentConfigLike) {
      const normalizedMode = normalizeResidentMode(nextConfig.residentSystem, nextConfig.residentMode);
      applyResidentModeMask(args.topologyNodes, args.residentBaseHz, nextConfig.residentSystem, normalizedMode);
    },
  };
}
