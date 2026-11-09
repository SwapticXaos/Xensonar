import {
  defaultAgentEnabled,
  deriveModeMask,
  getModesForSystem,
  getParticleNodes,
  getTuningSteps,
} from './instrumentData';
import { buildGridMuteList, buildGridOffsets } from '../rooms/resonanceGridMath';

import type { ChurchMode, GridTuning, ParticleSystem } from './instrumentData';
import type {
  NexusSelectionContractState,
  ParticleSystemContractResult,
  ChurchModeContractResult,
  GridModeContractResult,
  ResolvedMetaPresetSelections,
  NexusSelectionPatch,
  MetaPresetNexusContractInput,
  MetaPresetNexusContractResult,
} from './appGridModeContractTypes';

export type * from './appGridModeContractTypes';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function resolveCompatibleMode<TSystem extends GridTuning | ParticleSystem>(
  system: TSystem,
  requestedMode: ChurchMode,
): ChurchMode {
  const availableModes = getModesForSystem(system);
  return availableModes.some((entry) => entry.value === requestedMode)
    ? requestedMode
    : availableModes[0]?.value ?? 'chromatic';
}

export function buildParticleSystemContract(
  system: ParticleSystem,
  currentChurchMode: ChurchMode,
): ParticleSystemContractResult {
  const nodes = getParticleNodes(system);
  const resolvedMode = resolveCompatibleMode(system, currentChurchMode);
  const nextEnabled = defaultAgentEnabled(system, resolvedMode);
  const nextVolumes = nodes.map(() => 1);
  return {
    nodes,
    resolvedMode,
    nextEnabled,
    nextVolumes,
    nexusPatch: {
      particleSystem: system,
      churchMode: resolvedMode,
      agentEnabled: nextEnabled,
      agentVolumes: nextVolumes,
    },
  };
}

export function buildChurchModeContract(
  system: ParticleSystem,
  requestedMode: ChurchMode,
): ChurchModeContractResult {
  const resolvedMode = resolveCompatibleMode(system, requestedMode);
  const nextEnabled = deriveModeMask(resolvedMode, system);
  return {
    resolvedMode,
    nextEnabled,
    nexusPatch: {
      churchMode: resolvedMode,
      agentEnabled: nextEnabled,
    },
  };
}

export function buildGridModeContract(
  tuning: GridTuning,
  requestedMode: ChurchMode,
): GridModeContractResult {
  const resolvedMode = resolveCompatibleMode(tuning, requestedMode);
  const mask = deriveModeMask(resolvedMode, tuning);
  const len = getTuningSteps(tuning);
  const nextMutes: number[] = [];
  for (let i = 0; i < len; i += 1) {
    if (!mask[i]) nextMutes.push(i);
  }
  return {
    resolvedMode,
    nextMutes,
    nexusPatch: {
      gridMode: resolvedMode,
      manualGridMutedSteps: nextMutes,
    },
  };
}


export function buildMetaPresetNexusContract(
  current: NexusSelectionContractState,
  preset: MetaPresetNexusContractInput,
): MetaPresetNexusContractResult {
  const patch = preset.nexusPatch ?? {};
  const resolvedSelections = resolveMetaPresetSelections(current, patch);
  const nextGridMutes = buildGridMuteList(
    resolvedSelections.gridTuning,
    resolvedSelections.gridMode,
    preset.gridAllowedSteps,
  );
  const nextGridOffsets = buildGridOffsets(resolvedSelections.gridTuning, preset.gridOffsets);
  const particleNodes = getParticleNodes(resolvedSelections.particleSystem);
  const fallbackEnabled = deriveModeMask(
    resolvedSelections.churchMode,
    resolvedSelections.particleSystem,
  ).slice(0, particleNodes.length);
  const nextAgentEnabled = preset.agentEnabledSteps && preset.agentEnabledSteps.length
    ? Array.from({ length: particleNodes.length }, (_, idx) => preset.agentEnabledSteps?.includes(idx) ?? false)
    : fallbackEnabled;
  const nextAgentVolumes = Array.from({ length: particleNodes.length }, (_, idx) => {
    const explicit = preset.agentVolumes?.[idx];
    if (typeof explicit === 'number') return clamp(explicit, 0, 1.5);
    return nextAgentEnabled[idx] ? 1 : 0;
  });
  return {
    resolvedSelections,
    normalizedNexusPatch: buildResolvedSelectionPatch(current, resolvedSelections),
    nextGridMutes,
    nextGridOffsets,
    nextAgentEnabled,
    nextAgentVolumes,
  };
}

export function resolveMetaPresetSelections(
  current: NexusSelectionContractState,
  patch: NexusSelectionPatch,
): ResolvedMetaPresetSelections {
  const requestedGridTuning = patch.gridTuning ?? current.gridTuning;
  const requestedParticleSystem = patch.particleSystem ?? current.particleSystem;
  const requestedGridMode = patch.gridMode ?? current.gridMode;
  const requestedChurchMode = patch.churchMode ?? current.churchMode;

  const resolvedGridMode = resolveCompatibleMode(requestedGridTuning, requestedGridMode);
  const resolvedChurchMode = resolveCompatibleMode(requestedParticleSystem, requestedChurchMode);

  return {
    gridTuning: requestedGridTuning,
    gridMode: resolvedGridMode,
    particleSystem: requestedParticleSystem,
    churchMode: resolvedChurchMode,
  };
}

export function buildResolvedSelectionPatch(
  current: NexusSelectionContractState,
  resolved: ResolvedMetaPresetSelections,
): NexusSelectionPatch {
  const patch: NexusSelectionPatch = {};
  if (resolved.gridTuning !== current.gridTuning) patch.gridTuning = resolved.gridTuning;
  if (resolved.gridMode !== current.gridMode || resolved.gridTuning !== current.gridTuning) patch.gridMode = resolved.gridMode;
  if (resolved.particleSystem !== current.particleSystem) patch.particleSystem = resolved.particleSystem;
  if (resolved.churchMode !== current.churchMode || resolved.particleSystem !== current.particleSystem) patch.churchMode = resolved.churchMode;
  return patch;
}
