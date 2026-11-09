import { META_PRESETS } from '../domain/metaPresets';
import type { MetaPresetDefinition, MetaPresetId } from '../domain/metaPresetTypes';

export function mergeMetaPresetDefinition(base: MetaPresetDefinition, override?: Partial<MetaPresetDefinition>): MetaPresetDefinition {
  if (!override) return base;
  return {
    ...base,
    ...override,
    tParams: override.tParams ? { ...(base.tParams ?? {}), ...override.tParams } : base.tParams,
    room3Body: override.room3Body ? {
      ...(base.room3Body ?? {}),
      ...override.room3Body,
      controls: override.room3Body.controls
        ? { ...(base.room3Body?.controls ?? {}), ...override.room3Body.controls }
        : base.room3Body?.controls,
    } : base.room3Body,
    collectiveMemory: override.collectiveMemory ? {
      ...(base.collectiveMemory ?? {}),
      ...override.collectiveMemory,
      drone: override.collectiveMemory.drone ? { ...(base.collectiveMemory?.drone ?? {}), ...override.collectiveMemory.drone } : base.collectiveMemory?.drone,
      particles: override.collectiveMemory.particles ? { ...(base.collectiveMemory?.particles ?? {}), ...override.collectiveMemory.particles } : base.collectiveMemory?.particles,
      waves: override.collectiveMemory.waves ? { ...(base.collectiveMemory?.waves ?? {}), ...override.collectiveMemory.waves } : base.collectiveMemory?.waves,
      myzel: override.collectiveMemory.myzel ? { ...(base.collectiveMemory?.myzel ?? {}), ...override.collectiveMemory.myzel } : base.collectiveMemory?.myzel,
    } : base.collectiveMemory,
    spiral: override.spiral ? {
      ...(base.spiral ?? {}),
      ...override.spiral,
      drone: override.spiral.drone ? { ...(base.spiral?.drone ?? {}), ...override.spiral.drone } : base.spiral?.drone,
      particles: override.spiral.particles ? { ...(base.spiral?.particles ?? {}), ...override.spiral.particles } : base.spiral?.particles,
      waves: override.spiral.waves ? { ...(base.spiral?.waves ?? {}), ...override.spiral.waves } : base.spiral?.waves,
      myzel: override.spiral.myzel ? { ...(base.spiral?.myzel ?? {}), ...override.spiral.myzel } : base.spiral?.myzel,
    } : base.spiral,
    transientDrive: override.transientDrive ? {
      ...(base.transientDrive ?? {}),
      ...override.transientDrive,
      drone: override.transientDrive.drone ? { ...(base.transientDrive?.drone ?? {}), ...override.transientDrive.drone } : base.transientDrive?.drone,
      particles: override.transientDrive.particles ? { ...(base.transientDrive?.particles ?? {}), ...override.transientDrive.particles } : base.transientDrive?.particles,
      waves: override.transientDrive.waves ? { ...(base.transientDrive?.waves ?? {}), ...override.transientDrive.waves } : base.transientDrive?.waves,
      myzel: override.transientDrive.myzel ? { ...(base.transientDrive?.myzel ?? {}), ...override.transientDrive.myzel } : base.transientDrive?.myzel,
    } : base.transientDrive,
    liveMastering: override.liveMastering ? { ...(base.liveMastering ?? {}), ...override.liveMastering } : base.liveMastering,
    nexusPatch: override.nexusPatch ? { ...(base.nexusPatch ?? {}), ...override.nexusPatch } : base.nexusPatch,
    gridOffsets: override.gridOffsets ? { ...(base.gridOffsets ?? {}), ...override.gridOffsets } : base.gridOffsets,
    agentVolumes: override.agentVolumes ? { ...(base.agentVolumes ?? {}), ...override.agentVolumes } : base.agentVolumes,
    droneOvertones: override.droneOvertones ? { ...(base.droneOvertones ?? {}), ...override.droneOvertones } : base.droneOvertones,
    waveOvertones: override.waveOvertones ? { ...(base.waveOvertones ?? {}), ...override.waveOvertones } : base.waveOvertones,
  };
}

export function resolveMetaPreset(
  presetId: MetaPresetId,
  sessionMetaOverrides: Partial<Record<MetaPresetId, { preset?: Partial<MetaPresetDefinition> }>>,
): MetaPresetDefinition | null {
  const base = META_PRESETS.find((entry) => entry.id === presetId);
  if (!base) return null;
  const override = sessionMetaOverrides[presetId]?.preset;
  return mergeMetaPresetDefinition(base, override);
}
