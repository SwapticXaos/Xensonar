import type { MutableRefObject } from "react";
import { createEmptyOvertoneMix } from "../domain/instrumentData";
import type { DronePreset, GridTuning, ParticleSystem, ChurchMode } from "../domain/instrumentData";
import { createMetaOvertoneMix } from "../domain/metaPresets";
import type { MetaPresetDefinition, MetaPresetId } from "../domain/metaPresetTypes";
import { buildMetaPresetNexusContract } from "../domain/appGridModeContracts";
import { resolveMetaPreset } from "../rooms/metaPresetResolver";

export type MetaPresetSessionOverride = {
  readonly preset?: Partial<MetaPresetDefinition>;
  readonly uiPatch?: Record<string, number | boolean | string>;
};

export type MetaPresetSessionOverrides = Partial<Record<MetaPresetId, MetaPresetSessionOverride>>;

type SourceGroupKey = "drone" | "particles" | "waves" | "myzel";
const SOURCE_GROUP_KEYS: readonly SourceGroupKey[] = ["drone", "particles", "waves", "myzel"];

const mergeSourceGroupUiPatch = <TPrev extends Record<string, any>, TPatch extends Partial<Record<SourceGroupKey, Record<string, unknown>>>>(
  prev: TPrev,
  patch: TPatch | undefined,
): TPrev => {
  const next: TPrev = { ...prev };
  for (const key of SOURCE_GROUP_KEYS) {
    const sourcePatch = patch?.[key];
    if (sourcePatch) {
      next[key as keyof TPrev] = { ...(prev[key] ?? {}), ...sourcePatch } as TPrev[keyof TPrev];
    }
  }
  return next;
};

const mergeSpiralUiPatch = <TPrev extends Record<string, any>>(
  prev: TPrev,
  patch: MetaPresetDefinition["spiral"],
): TPrev => {
  const next = mergeSourceGroupUiPatch(prev, patch);
  for (const key of ["drive", "color", "motion", "feedback", "bloom", "mix", "stereoWidth", "outputGain"] as const) {
    const value = patch?.[key];
    if (typeof value === "number") {
      next[key as keyof TPrev] = value as TPrev[keyof TPrev];
    }
  }
  return next;
};

export type AppMetaPresetActionBoundaryArgs = {
  readonly sessionMetaOverrides: MetaPresetSessionOverrides;
  readonly nParamsUI: Record<string, any>;
  readonly nexusParamsRef: MutableRefObject<any>;
  readonly nexusRefs: MutableRefObject<any>;
  readonly initialOvertonesByPreset: MutableRefObject<Partial<Record<DronePreset, Record<string, number>>>>;
  readonly topologyLoopErrorRef: MutableRefObject<unknown>;
  readonly setActiveMetaPresetId: (presetId: MetaPresetId) => void;
  readonly setActiveOvertoneMixer: (mixer: "drone" | "waves") => void;
  readonly setTParams: (params: any) => void;
  readonly setSystemState: (state: string) => void;
  readonly setMyzelEnabled: (enabled: boolean) => void;
  readonly setMyzelPattern: (pattern: any) => void;
  readonly setMyzelBallMode: (mode: any) => void;
  readonly setMyzelNodeMode: (mode: any) => void;
  readonly setMyzelStep16ths: (step16ths: number) => void;
  readonly setDroneVolume: (volume: number) => void;
  readonly setWaveSoundEnabled: (enabled: boolean) => void;
  readonly setWaveSoundVolume: (volume: number) => void;
  readonly setWaveSoundPreset: (preset: string) => void;
  readonly setQuantizeGridMode: (grid: any) => void;
  readonly setGridTempoBpmWithTrafficReset: (bpm: number) => void;
  readonly setRoom3BodyEnabled: (enabled: boolean) => void;
  readonly setRoom3BodyControls: (updater: (prev: any) => any) => void;
  readonly setCollectiveMemoryEnabled: (enabled: boolean) => void;
  readonly setCollectiveMemoryWindow: (windowSec: number) => void;
  readonly setCollectiveMemoryUi: (updater: (prev: any) => any) => void;
  readonly setPsychedelicSpiralEnabled: (enabled: boolean) => void;
  readonly setPsychedelicSpiralFollow: (follow: number) => void;
  readonly setPsychedelicSpiralUi: (updater: (prev: any) => any) => void;
  readonly setTransientDriveUi: (updater: (prev: any) => any) => void;
  readonly setLiveMasteringEnabled: (enabled: boolean) => void;
  readonly setLiveMasteringStrength: (strength: number) => void;
  readonly setLiveMasteringGlue: (glue: number) => void;
  readonly setLiveMasteringAir: (air: number) => void;
  readonly changeGridTuning: (nextTuning: GridTuning) => void;
  readonly setGridMode: (nextMode: ChurchMode) => void;
  readonly setParticleSystem: (system: ParticleSystem) => void;
  readonly setChurchMode: (nextMode: ChurchMode) => void;
  readonly updateNParams: (patch: Record<string, any>) => void;
  readonly primeMyzelFromY: (y: number, source: "resonance" | "topology" | "wave" | "toggle" | "auto") => void;
  readonly applyRealtimeDroneOvertones: (mix?: Record<string, number>, timbreOverride?: number) => void;
};

export type AppMetaPresetActionBoundary = {
  readonly applyMetaPreset: (presetId: MetaPresetId) => void;
  readonly metaPresetActionBoundaryExtractedFromAppTsx: true;
  readonly sourceGroupMergeRitualUnified: true;
  readonly noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true;
};

export function useAppMetaPresetActionBoundary(args: AppMetaPresetActionBoundaryArgs): AppMetaPresetActionBoundary {
  const applyMetaPreset = (presetId: MetaPresetId) => {
    const preset = resolveMetaPreset(presetId, args.sessionMetaOverrides);
    if (!preset) return;
    const sessionUiPatch = (args.sessionMetaOverrides[presetId]?.uiPatch ?? {}) as Partial<typeof args.nParamsUI>;

    args.setActiveMetaPresetId(presetId);
    args.setActiveOvertoneMixer("drone");

    if (preset.tParams) {
      args.setTParams(preset.tParams);
    }
    if (typeof preset.myzelEnabled === "boolean") {
      args.topologyLoopErrorRef.current = null;
      args.setSystemState("Fließendes Myzel");
      args.setMyzelEnabled(preset.myzelEnabled);
    }
    if (preset.myzelPattern) args.setMyzelPattern(preset.myzelPattern);
    if (preset.myzelBallMode) args.setMyzelBallMode(preset.myzelBallMode);
    if (preset.myzelNodeMode) args.setMyzelNodeMode(preset.myzelNodeMode);
    if (typeof preset.myzelStep16ths === "number") args.setMyzelStep16ths(preset.myzelStep16ths);
    if (typeof preset.droneVolume === "number") args.setDroneVolume(preset.droneVolume);
    if (typeof preset.waveSoundEnabled === "boolean") args.setWaveSoundEnabled(preset.waveSoundEnabled);
    if (typeof preset.waveSoundVolume === "number") args.setWaveSoundVolume(preset.waveSoundVolume);
    args.setWaveSoundPreset(preset.waveSoundPreset);
    if (typeof preset.quantizeGrid === "number") {
      args.setQuantizeGridMode(preset.quantizeGrid);
    }
    if (typeof preset.gridTempoBpm === "number") {
      args.setGridTempoBpmWithTrafficReset(preset.gridTempoBpm);
    }
    if (preset.room3Body) {
      if (typeof preset.room3Body.enabled === "boolean") {
        args.setRoom3BodyEnabled(preset.room3Body.enabled);
      }
      if (preset.room3Body.controls) {
        args.setRoom3BodyControls((prev) => ({ ...prev, ...preset.room3Body?.controls }));
      }
    }
    if (preset.collectiveMemory) {
      if (typeof preset.collectiveMemory.enabled === "boolean") args.setCollectiveMemoryEnabled(preset.collectiveMemory.enabled);
      if (typeof preset.collectiveMemory.window === "number") args.setCollectiveMemoryWindow(preset.collectiveMemory.window);
      args.setCollectiveMemoryUi((prev) => mergeSourceGroupUiPatch(prev, preset.collectiveMemory));
    }
    if (preset.spiral) {
      if (typeof preset.spiral.enabled === "boolean") args.setPsychedelicSpiralEnabled(preset.spiral.enabled);
      if (typeof preset.spiral.follow === "number") args.setPsychedelicSpiralFollow(preset.spiral.follow);
      args.setPsychedelicSpiralUi((prev) => mergeSpiralUiPatch(prev, preset.spiral));
    }
    if (preset.transientDrive) {
      args.setTransientDriveUi((prev) => mergeSourceGroupUiPatch(prev, preset.transientDrive));
    }
    if (preset.liveMastering) {
      if (typeof preset.liveMastering.enabled === "boolean") args.setLiveMasteringEnabled(preset.liveMastering.enabled);
      if (typeof preset.liveMastering.strength === "number") args.setLiveMasteringStrength(preset.liveMastering.strength);
      if (typeof preset.liveMastering.glue === "number") args.setLiveMasteringGlue(preset.liveMastering.glue);
      if (typeof preset.liveMastering.air === "number") args.setLiveMasteringAir(preset.liveMastering.air);
    }

    const patch = preset.nexusPatch ?? {};
    const {
      normalizedNexusPatch,
      nextGridMutes,
      nextGridOffsets,
      nextAgentEnabled,
      nextAgentVolumes,
    } = buildMetaPresetNexusContract(args.nexusParamsRef.current, preset);

    if (normalizedNexusPatch.gridTuning) {
      args.changeGridTuning(normalizedNexusPatch.gridTuning);
    }
    if (normalizedNexusPatch.gridMode) {
      args.setGridMode(normalizedNexusPatch.gridMode);
    }
    if (normalizedNexusPatch.particleSystem) {
      args.setParticleSystem(normalizedNexusPatch.particleSystem);
    }
    if (normalizedNexusPatch.churchMode) {
      args.setChurchMode(normalizedNexusPatch.churchMode);
    }

    const defaultDroneMix = { ...(args.initialOvertonesByPreset.current[preset.dronePreset] ?? createEmptyOvertoneMix()) };
    const nextDroneMix = createMetaOvertoneMix({
      ...defaultDroneMix,
      ...(preset.droneOvertones ?? {}),
    });
    const nextWaveMix = createMetaOvertoneMix({
      ...(preset.waveOvertones ?? {}),
    });

    args.nexusRefs.current.agents.forEach((agent: any, idx: number) => {
      if (idx >= nextAgentEnabled.length) {
        agent.lastHit = Number.POSITIVE_INFINITY;
        agent.lastHitAudioTimeSec = undefined;
        return;
      }
      agent.lastHit = nextAgentEnabled[idx] ? 0 : Number.POSITIVE_INFINITY;
      agent.lastHitAudioTimeSec = undefined;
    });

    args.updateNParams({
      ...patch,
      ...normalizedNexusPatch,
      ...sessionUiPatch,
      quantizeBpm: preset.gridTempoBpm ?? patch.quantizeBpm ?? args.nexusParamsRef.current.quantizeBpm,
      dronePreset: preset.dronePreset,
      particlePreset: preset.particlePreset,
      droneJIOvertones: nextDroneMix,
      droneJIOvertonesByPreset: {
        ...args.nexusParamsRef.current.droneJIOvertonesByPreset,
        [preset.dronePreset]: nextDroneMix,
      },
      waveOvertones: nextWaveMix,
      manualGridMutedSteps: nextGridMutes,
      manualGridStepOffsets: nextGridOffsets,
      agentEnabled: nextAgentEnabled,
      agentVolumes: nextAgentVolumes,
    });

    args.primeMyzelFromY(args.nexusRefs.current.cursorY, "toggle");
    requestAnimationFrame(() => {
      const refNow = args.nexusParamsRef.current;
      args.applyRealtimeDroneOvertones(refNow.droneJIOvertones, refNow.droneTimbre);
    });
  };

  return {
    applyMetaPreset,
    metaPresetActionBoundaryExtractedFromAppTsx: true,
    sourceGroupMergeRitualUnified: true,
    noWaveStarterBassRootFollowOrRoom3BodyHotPathMoved: true,
  };
}
