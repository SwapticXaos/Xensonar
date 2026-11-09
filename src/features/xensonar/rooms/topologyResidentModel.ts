import { getModesForSystem } from '../domain/instrumentData';
import type { SemanticNode } from '../domain/runtimeTypes';
import { clampResidentHz, residentHzFromSlider } from '../../topology/residentTheory';

type BuildTopologyResidentModelArgs = {
  bassRootMode: 'fixed' | 'myzel' | 'auto';
  bassRootHz: number;
  getInterpreterMyzelBaseHz: () => number;
  residentSystem: Parameters<typeof getModesForSystem>[0];
  selectedResidentId: string | null;
  topologyNodes: SemanticNode[];
  residentAddFrequencySlider: number;
};

export function buildTopologyResidentModel(args: BuildTopologyResidentModelArgs) {
  const activeMyzelRootHz = args.bassRootMode === 'fixed'
    ? args.bassRootHz
    : args.getInterpreterMyzelBaseHz();
  const residentModeOptions = getModesForSystem(args.residentSystem);
  const selectedResidentNode = args.selectedResidentId
    ? args.topologyNodes.find((node) => node.residentId === args.selectedResidentId) ?? null
    : null;
  const residentBaseHz = Math.min(440, Math.max(55, activeMyzelRootHz || 220));
  const residentAddFrequencyHz = clampResidentHz(residentHzFromSlider(args.residentAddFrequencySlider));

  return {
    activeMyzelRootHz,
    residentModeOptions,
    selectedResidentNode,
    residentBaseHz,
    residentAddFrequencyHz,
  };
}
