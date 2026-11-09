import {
  PARTICLE_VOLUME_MAX,
  defaultAgentEnabled,
  getMutedStepsForMode,
  getParticleNodes,
  createEmptyOvertoneMix,
  cloneOvertoneMixByPreset,
  type BassPattern,
  type ChurchMode,
  type DronePreset,
  type DrumKit,
  type DrumPattern,
  type GridTuning,
  type ParticleGradientPreset,
  type ParticleSystem,
  type WaveDecayPreset,
  type WaveOvertoneWaveform,
  type WaveTimbreGradientPreset,
  type WaveVolumeGradientPreset,
} from "../domain/instrumentData";
import { DEFAULT_DRUM_STYLE } from "../../resonance/drumMachine";
import { DEFAULT_DRUM_LANE_KIT_OVERRIDES } from "../groove/drumKitRouting";
import type { WaveOvertoneArpPattern, WaveOvertoneArpRate, WaveOvertoneMode } from "./resonanceUiConfig";
import type { ParticleSampleProfileMode } from "../../soundLibrary/particleSamplePlayback";
import { resolveParticlePlaybackPresetId } from "../../soundLibrary/particleSoundAdapter";
import { createInitialNexusLoopLaneUiState } from "../material/loopLaneUiState";

export const PARTICLE_SAMPLE_PROFILE_STORAGE_KEY = "xensonar-particle-sample-profile-mode";

export const readStoredParticleSampleProfileMode = (): ParticleSampleProfileMode => {
  if (typeof window === "undefined") return "current_db_v2";
  try {
    const value = window.localStorage.getItem(PARTICLE_SAMPLE_PROFILE_STORAGE_KEY);
    return value === "legacy_90_40" ? "legacy_90_40" : "current_db_v2";
  } catch {
    return "current_db_v2";
  }
};

export const createInitialNexusParams = (initialOvertonesByPreset: Record<DronePreset, Record<string, number>>) => ({
  echoOn: false,
  echoTempo: 400,
  echoDecay: 0.6,
  waveRadius: 1.09,
  waveDecay: "abrupt" as WaveDecayPreset,
  gridOn: true,
  gridBase: 440,
  gridTuning: "12edo" as GridTuning,
  gridMode: "ionian" as ChurchMode,
  rememberGrid: false,
  gridStates: {} as Record<string, { mutes: number[]; offsets: number[] }>,
  manualGridMutedSteps: getMutedStepsForMode("ionian", "12edo") as number[],
  manualGridStepOffsets: Array.from({ length: 12 }, () => 0) as number[],
  particleSystem: "ji" as ParticleSystem,
  churchMode: "ionian" as ChurchMode,
  lockCursorToGrid: false,
  cursorSpeed: 4,
  droneTimbre: 0.01,
  droneVibrato: 0.9,
  droneFlanger: 0.6,
  droneDriveOn: false,
  droneDriveAmount: 0.22,
  droneDriveTone: 0.52,
  droneDriveMix: 0.26,
  droneDriveOutput: 0.82,
  droneRhythm: "Puls 1/4" as string,
  droneRhythmCustomSteps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] as number[],
  drumActive: true,
  drumPattern: "broken_lilt" as DrumPattern,
  drumKit: "dusty_tape" as DrumKit,
  drumLaneKits: { ...DEFAULT_DRUM_LANE_KIT_OVERRIDES },
  drumVolume: 0.52,
  drumEdge: DEFAULT_DRUM_STYLE.edge,
  drumSoftness: DEFAULT_DRUM_STYLE.softness,
  drumAir: DEFAULT_DRUM_STYLE.air,
  drumSnap: DEFAULT_DRUM_STYLE.snap,
  grooveSwing: DEFAULT_DRUM_STYLE.swing,
  drumConfigMode: "preset" as "preset" | "exported",
  drumConfigId: "",
  bassActive: true,
  bassPattern: "forge_fractured" as BassPattern,
  bassPatternMode: "preset" as "preset" | "clip",
  bassClipId: "",
  bassVolume: 0.1,
  bassTone: 0.48,
  bassGrit: 0.18,
  bassRootMode: "auto" as "auto" | "fixed",
  bassRootHz: 55,
  dronePreset: "fjord_tape" as DronePreset,
  particlePreset: "dust_chime" as string,
  particleSampleProfileMode: readStoredParticleSampleProfileMode(),
  particleGradientX: "edge_spark" as ParticleGradientPreset,
  particleGradientY: "warm_center" as ParticleGradientPreset,
  waveTimbreGradientEnabled: true,
  waveTimbreGradientX: "wire_to_psy" as WaveTimbreGradientPreset,
  waveVolumeGradientEnabled: false,
  waveVolumeGradientX: "none" as WaveVolumeGradientPreset,
  waveOvertonesEnabled: false,
  droneOvertoneWaveform: "triangle" as WaveOvertoneWaveform,
  waveOvertoneWaveform: "triangle" as WaveOvertoneWaveform,
  waveOvertoneMode: "arp" as WaveOvertoneMode,
  waveOvertoneArpRate: 64 as WaveOvertoneArpRate,
  waveOvertoneArpPattern: "updown" as WaveOvertoneArpPattern,
  waveOvertoneArpSteps: 8,
  waveOvertoneGlobalLevel: 1,
  waveOvertones: createEmptyOvertoneMix(),
  waveStarterHoldSegments: 24,
  waveStarterHoldCustomSegments: 48,
  waveStarterHoldReferenceBars: 1,
  waveStarterHoldPatternSteps: Array.from({ length: 24 }, () => 1) as number[],
  waveStarterHoldSoundPreset: "tape_halo",
  keyboardHoldSegments: 24,
  keyboardHoldCustomSegments: 48,
  keyboardHoldReferenceBars: 1,
  keyboardHoldPatternSteps: Array.from({ length: 24 }, () => 1) as number[],
  keyboardHoldSoundPreset: "tape_halo",
  particleVolume: 0.165,
  particleMute: false,
  quantizeOn: false,
  quantizeBpm: 108,
  ...createInitialNexusLoopLaneUiState(),
  resonanceHotkeyMode: "material" as "material" | "root-follow" | "particle-classic",
  agentEnabled: defaultAgentEnabled("ji", "ionian"),
  agentVolumes: getParticleNodes("ji").map(() => 1),
  droneJIOvertones: { ...initialOvertonesByPreset.fjord_tape },
  droneJIOvertonesByPreset: cloneOvertoneMixByPreset(initialOvertonesByPreset),
});

export type AppNexusParams = ReturnType<typeof createInitialNexusParams>;

type LegacyMaterialFocusNexusPatchFields = {
  showGrid?: boolean;
  cursorSnap?: boolean;
  quantizeEvents?: boolean;
  drumOn?: boolean;
  bassOn?: boolean;
};

export type NexusUiPatch = Partial<AppNexusParams> & LegacyMaterialFocusNexusPatchFields;


export const mergeNexusUiPatch = (current: AppNexusParams, partial: NexusUiPatch): AppNexusParams => {
  const merged: AppNexusParams = { ...current, ...partial };
  merged.particleVolume = Math.min(PARTICLE_VOLUME_MAX, Math.max(0, merged.particleVolume));
  const resolvedParticlePreset = resolveParticlePlaybackPresetId(merged.particlePreset);
  if (["crystal_bowl", "shimmer_pad", "velvet_bloom"].includes(resolvedParticlePreset)) {
    merged.particleVolume = Math.min(merged.particleVolume, resolvedParticlePreset === "crystal_bowl" ? 0.24 : 0.22);
  }
  return merged;
};

export const buildMaterialFocusNexusPatch = (): NexusUiPatch => {
  const defaultParticleSystem: ParticleSystem = "ji";
  const defaultParticleMode: ChurchMode = "ionian";
  const defaultGridTuning: GridTuning = "12edo";
  const defaultGridMode: ChurchMode = "ionian";
  const defaultAgentEnabledState = defaultAgentEnabled(defaultParticleSystem, defaultParticleMode);
  return {
    gridOn: true,
    showGrid: true,
    lockCursorToGrid: true,
    cursorSnap: true,
    gridTuning: defaultGridTuning,
    gridMode: defaultGridMode,
    manualGridMutedSteps: getMutedStepsForMode(defaultGridMode, defaultGridTuning),
    manualGridStepOffsets: Array.from({ length: 12 }, () => 0),
    particleSystem: defaultParticleSystem,
    particlePreset: "dust_chime",
    churchMode: defaultParticleMode,
    quantizeEvents: true,
    quantizeOn: true,
    quantizeBpm: 108,
    drumActive: true,
    drumOn: true,
    drumPattern: "broken_lilt",
    drumKit: "dusty_tape",
    drumLaneKits: { ...DEFAULT_DRUM_LANE_KIT_OVERRIDES },
    drumVolume: 0.52,
    drumEdge: DEFAULT_DRUM_STYLE.edge,
    drumSoftness: DEFAULT_DRUM_STYLE.softness,
    drumAir: DEFAULT_DRUM_STYLE.air,
    drumSnap: DEFAULT_DRUM_STYLE.snap,
    grooveSwing: DEFAULT_DRUM_STYLE.swing,
    bassActive: true,
    bassOn: true,
    bassPattern: "forge_fractured",
    bassVolume: 0.1,
    bassTone: 0.48,
    bassGrit: 0.18,
    droneRhythm: "Puls 1/4",
    droneRhythmCustomSteps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    droneTimbre: 0.01,
    droneVibrato: 0.8,
    droneFlanger: 0.6,
    droneDriveOn: false,
    droneDriveAmount: 0.22,
    droneDriveTone: 0.52,
    droneDriveMix: 0.26,
    droneDriveOutput: 0.82,
    particleGradientX: "edge_spark",
    particleGradientY: "warm_center",
    particleVolume: 0.165,
    particleMute: false,
    resonanceHotkeyMode: "material",
    agentEnabled: defaultAgentEnabledState,
    agentVolumes: defaultAgentEnabledState.map(() => 1),
  };
};
