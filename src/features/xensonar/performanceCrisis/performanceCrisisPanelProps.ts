import type { RootFollowGranularSettings } from "../rootFollow/rootFollowGranularSettings";
import type {
  CrisisQuantizationGridSelection,
  CrisisQuantizationModeSelection,
  ParticleAmbientMotionSelection,
  ParticleCrisisModeSelection,
  ParticleLoadReductionSelection,
  PerformanceCrisisPresetId,
  RootFollowVoiceEngineMode,
} from "./performanceCrisisTypes";
import {
  PERFORMANCE_CRISIS_PRESET_ORDER,
  PERFORMANCE_CRISIS_PRESETS,
  resolvePerformanceCrisisPreset,
} from "./performanceCrisisPresetRegistry";

export type PerformanceCrisisPanelProps = {
  activePresetId: PerformanceCrisisPresetId;
  particlePresetId: PerformanceCrisisPresetId;
  waveStarterPresetId: PerformanceCrisisPresetId;
  particleCrisisMode: ParticleCrisisModeSelection;
  particleAmbientMotionMode: ParticleAmbientMotionSelection;
  particleLoadReductionMode: ParticleLoadReductionSelection;
  rootFollowQuantizationMode: CrisisQuantizationModeSelection;
  rootFollowQuantizationGrid: CrisisQuantizationGridSelection;
  rootFollowQuantizationCustomSegments: number;
  rootFollowVoiceEngineMode: RootFollowVoiceEngineMode;
  particleQuantizationMode: CrisisQuantizationModeSelection;
  particleQuantizationGrid: CrisisQuantizationGridSelection;
  particleQuantizationCustomSegments: number;
  presetIds: readonly PerformanceCrisisPresetId[];
  selectedPreset: ReturnType<typeof resolvePerformanceCrisisPreset>;
  selectedParticlePreset: ReturnType<typeof resolvePerformanceCrisisPreset>;
  selectedWaveStarterPreset: ReturnType<typeof resolvePerformanceCrisisPreset>;
  currentGranularMode: "flowing" | "grainy";
  currentGranularSettings: RootFollowGranularSettings;
  audioBurstRecorder: any;
  onPresetChange: (presetId: PerformanceCrisisPresetId) => void;
  onParticlePresetChange: (presetId: PerformanceCrisisPresetId) => void;
  onWaveStarterPresetChange: (presetId: PerformanceCrisisPresetId) => void;
  onParticleCrisisModeChange: (mode: ParticleCrisisModeSelection) => void;
  onParticleAmbientMotionModeChange: (
    mode: ParticleAmbientMotionSelection,
  ) => void;
  onParticleLoadReductionModeChange: (
    mode: ParticleLoadReductionSelection,
  ) => void;
  onRootFollowQuantizationModeChange: (
    mode: CrisisQuantizationModeSelection,
  ) => void;
  onRootFollowQuantizationGridChange: (
    grid: CrisisQuantizationGridSelection,
  ) => void;
  onRootFollowQuantizationCustomSegmentsChange: (segments: number) => void;
  onRootFollowVoiceEngineModeChange: (mode: RootFollowVoiceEngineMode) => void;
  onParticleQuantizationModeChange: (
    mode: CrisisQuantizationModeSelection,
  ) => void;
  onParticleQuantizationGridChange: (
    grid: CrisisQuantizationGridSelection,
  ) => void;
  onParticleQuantizationCustomSegmentsChange: (segments: number) => void;
  onApplyGranularRootFollowPreset: () => void;
};

const coercePresetId = (presetId: PerformanceCrisisPresetId) =>
  PERFORMANCE_CRISIS_PRESETS[presetId] ? presetId : "balanced";

export function buildPerformanceCrisisPanelProps(args: {
  activePresetId: PerformanceCrisisPresetId;
  particlePresetId: PerformanceCrisisPresetId;
  waveStarterPresetId: PerformanceCrisisPresetId;
  particleCrisisMode: ParticleCrisisModeSelection;
  particleAmbientMotionMode: ParticleAmbientMotionSelection;
  particleLoadReductionMode: ParticleLoadReductionSelection;
  rootFollowQuantizationMode: CrisisQuantizationModeSelection;
  rootFollowQuantizationGrid: CrisisQuantizationGridSelection;
  rootFollowQuantizationCustomSegments: number;
  rootFollowVoiceEngineMode: RootFollowVoiceEngineMode;
  particleQuantizationMode: CrisisQuantizationModeSelection;
  particleQuantizationGrid: CrisisQuantizationGridSelection;
  particleQuantizationCustomSegments: number;
  currentGranularMode: "flowing" | "grainy";
  currentGranularSettings: RootFollowGranularSettings;
  audioBurstRecorder: any;
  setActivePresetId: (presetId: PerformanceCrisisPresetId) => void;
  setParticlePresetId: (presetId: PerformanceCrisisPresetId) => void;
  setWaveStarterPresetId: (presetId: PerformanceCrisisPresetId) => void;
  setParticleCrisisMode: (mode: ParticleCrisisModeSelection) => void;
  setParticleAmbientMotionMode: (mode: ParticleAmbientMotionSelection) => void;
  setParticleLoadReductionMode: (mode: ParticleLoadReductionSelection) => void;
  setRootFollowQuantizationMode: (
    mode: CrisisQuantizationModeSelection,
  ) => void;
  setRootFollowQuantizationGrid: (
    grid: CrisisQuantizationGridSelection,
  ) => void;
  setRootFollowQuantizationCustomSegments: (segments: number) => void;
  setRootFollowVoiceEngineMode: (mode: RootFollowVoiceEngineMode) => void;
  setParticleQuantizationMode: (mode: CrisisQuantizationModeSelection) => void;
  setParticleQuantizationGrid: (grid: CrisisQuantizationGridSelection) => void;
  setParticleQuantizationCustomSegments: (segments: number) => void;
  applyGranularRootFollowSettings: (
    settings: RootFollowGranularSettings,
    mode: "flowing" | "grainy",
  ) => void;
}): PerformanceCrisisPanelProps {
  const selectedPreset = resolvePerformanceCrisisPreset(args.activePresetId);
  const selectedParticlePreset = resolvePerformanceCrisisPreset(
    args.particlePresetId,
  );
  const selectedWaveStarterPreset = resolvePerformanceCrisisPreset(
    args.waveStarterPresetId,
  );
  return {
    activePresetId: selectedPreset.id,
    particlePresetId: selectedParticlePreset.id,
    waveStarterPresetId: selectedWaveStarterPreset.id,
    particleCrisisMode: args.particleCrisisMode,
    particleAmbientMotionMode: args.particleAmbientMotionMode,
    particleLoadReductionMode: args.particleLoadReductionMode,
    rootFollowQuantizationMode: args.rootFollowQuantizationMode,
    rootFollowQuantizationGrid: args.rootFollowQuantizationGrid,
    rootFollowQuantizationCustomSegments:
      args.rootFollowQuantizationCustomSegments,
    rootFollowVoiceEngineMode: args.rootFollowVoiceEngineMode,
    particleQuantizationMode: args.particleQuantizationMode,
    particleQuantizationGrid: args.particleQuantizationGrid,
    particleQuantizationCustomSegments: args.particleQuantizationCustomSegments,
    presetIds: PERFORMANCE_CRISIS_PRESET_ORDER,
    selectedPreset,
    selectedParticlePreset,
    selectedWaveStarterPreset,
    currentGranularMode: args.currentGranularMode,
    currentGranularSettings: args.currentGranularSettings,
    audioBurstRecorder: args.audioBurstRecorder,
    onPresetChange: (presetId) => {
      const safePresetId = coercePresetId(presetId);
      args.setActivePresetId(safePresetId);
      args.setParticlePresetId(safePresetId);
      args.setWaveStarterPresetId(safePresetId);
    },
    onParticlePresetChange: (presetId) =>
      args.setParticlePresetId(coercePresetId(presetId)),
    onWaveStarterPresetChange: (presetId) =>
      args.setWaveStarterPresetId(coercePresetId(presetId)),
    onParticleCrisisModeChange: (mode) => args.setParticleCrisisMode(mode),
    onParticleAmbientMotionModeChange: (mode) =>
      args.setParticleAmbientMotionMode(mode),
    onParticleLoadReductionModeChange: (mode) =>
      args.setParticleLoadReductionMode(mode),
    onRootFollowQuantizationModeChange: (mode) =>
      args.setRootFollowQuantizationMode(mode),
    onRootFollowQuantizationGridChange: (grid) =>
      args.setRootFollowQuantizationGrid(grid),
    onRootFollowQuantizationCustomSegmentsChange: (segments) =>
      args.setRootFollowQuantizationCustomSegments(segments),
    onRootFollowVoiceEngineModeChange: (mode) =>
      args.setRootFollowVoiceEngineMode(mode),
    onParticleQuantizationModeChange: (mode) =>
      args.setParticleQuantizationMode(mode),
    onParticleQuantizationGridChange: (grid) =>
      args.setParticleQuantizationGrid(grid),
    onParticleQuantizationCustomSegmentsChange: (segments) =>
      args.setParticleQuantizationCustomSegments(segments),
    onApplyGranularRootFollowPreset: () =>
      args.applyGranularRootFollowSettings(
        selectedPreset.granularRootFollow.settings,
        selectedPreset.granularRootFollow.mode,
      ),
  };
}
