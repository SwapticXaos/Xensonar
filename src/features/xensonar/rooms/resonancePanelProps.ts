import type { ComponentProps, MutableRefObject } from 'react';
import type { DronePreset, GridTuning, QuantizeGrid } from '../domain/instrumentData';
import type { WaveOvertoneMixPresetId } from './resonanceUiConfig';
import type { ParticleSampleProfileMode } from '../../soundLibrary/particleSamplePlayback';
import { ResonanceControlCorePanel } from './ResonanceControlCorePanel';
import { ResonanceGrooveBassPanel } from './ResonanceGrooveBassPanel';
import { ResonanceSoundPalettePanel } from './ResonanceSoundPalettePanel';
import { RecordingMarkerSideRails } from './RecordingMarkerSideRails';
import { clearQuantizedTrafficFlushInterval } from '../audioTraffic/quantizedTrafficTimerRegistry';

type BuildRecordingMarkerSideRailsPropsArgs = {
  isRecording: ComponentProps<typeof RecordingMarkerSideRails>['isRecording'];
  sideMarkerPulses: ComponentProps<typeof RecordingMarkerSideRails>['sideMarkerPulses'];
  scrollbarInsetPx: ComponentProps<typeof RecordingMarkerSideRails>['scrollbarInsetPx'];
  addSideMarker: () => boolean;
  triggerSideMarkerPulse: (side: 'left' | 'right') => void;
};

export function buildRecordingMarkerSideRailsProps(args: BuildRecordingMarkerSideRailsPropsArgs): ComponentProps<typeof RecordingMarkerSideRails> {
  return {
    isRecording: args.isRecording,
    sideMarkerPulses: args.sideMarkerPulses,
    scrollbarInsetPx: args.scrollbarInsetPx,
    onAddLeftMarker: () => {
      if (args.addSideMarker()) args.triggerSideMarkerPulse('left');
    },
    onAddRightMarker: () => {
      if (args.addSideMarker()) args.triggerSideMarkerPulse('right');
    },
  };
}

export function shouldRenderResonancePanels(room: string) {
  return room === 'RESONANCE' || room === 'MAIN' || room === 'NEXUS';
}

type ControlCorePanelProps = ComponentProps<typeof ResonanceControlCorePanel>;
type SoundPalettePanelProps = ComponentProps<typeof ResonanceSoundPalettePanel>;

type BuildResonanceControlCorePanelPropsArgs = {
  nParamsUI: ControlCorePanelProps['nParamsUI'];
  droneVolume: number;
  transientDriveUi: ControlCorePanelProps['transientDriveUi'];
  quantizeGrid: QuantizeGrid;
  particleQuantizeReferenceBars: number;
  gridTempoBpm: number;
  quantizeStepMs: number;
  myzelEnabled: boolean;
  myzelStep16ths: number;
  updateNParams: ControlCorePanelProps['updateNParams'];
  setParticleSystem: ControlCorePanelProps['setParticleSystem'];
  setChurchMode: ControlCorePanelProps['setChurchMode'];
  changeGridTuning: ControlCorePanelProps['changeGridTuning'];
  setGridMode: ControlCorePanelProps['setGridMode'];
  getTuningSteps: (tuning: GridTuning) => number;
  commitResonanceCursorY: (rawY: number, options?: { syncHud?: boolean }) => void;
  nexusRefs: MutableRefObject<{ cursorY: number; nextAbsoluteStep: number | null }>;
  quantizeAnchorRef: MutableRefObject<number | null>;
  waveCollisionQueueRef: MutableRefObject<any[]>;
  particleQuantizeSeenRef: MutableRefObject<number[]>;
  particleQuantizeTimerRef: MutableRefObject<number | null>;
  setQuantizeGrid: ControlCorePanelProps['onQuantizeGridChange'];
  setParticleQuantizeReferenceBars: ControlCorePanelProps['onQuantizeReferenceBarsChange'];
  setGridTempoBpm: (bpm: number) => void;
  setDroneVolume: ControlCorePanelProps['setDroneVolume'];
  applyRealtimeDroneOvertones: (mix?: any, timbre?: number) => void;
  updateTransientDriveSource: ControlCorePanelProps['updateTransientDriveSource'];
  toggleMyzelEnabled: ControlCorePanelProps['toggleMyzelEnabled'];
  setMyzelStep16ths: ControlCorePanelProps['setMyzelStep16ths'];
  installationFieldConfig: any;
  toggleInstallResidents: ControlCorePanelProps['onToggleResidentEnabled'];
  setInstallResidentVolumeLevel: ControlCorePanelProps['onResidentVolumeChange'];
  setInstallResidentSystemValue: ControlCorePanelProps['onResidentSystemChange'];
  setInstallResidentModeValue: ControlCorePanelProps['onResidentModeChange'];
  openInstallationTopologyRoom: ControlCorePanelProps['onOpenInstallationRoom'];
};

export function buildResonanceControlCorePanelProps(args: BuildResonanceControlCorePanelPropsArgs): ComponentProps<typeof ResonanceControlCorePanel> {
  const resetQuantizeScheduling = () => {
    args.quantizeAnchorRef.current = null;
  };

  return {
    nParamsUI: args.nParamsUI,
    droneVolume: args.droneVolume,
    transientDriveUi: args.transientDriveUi,
    quantizeGrid: args.quantizeGrid,
    particleQuantizeReferenceBars: args.particleQuantizeReferenceBars,
    gridTempoBpm: args.gridTempoBpm,
    quantizeStepMs: args.quantizeStepMs,
    myzelEnabled: args.myzelEnabled,
    myzelStep16ths: args.myzelStep16ths,
    updateNParams: args.updateNParams,
    setParticleSystem: args.setParticleSystem,
    setChurchMode: args.setChurchMode,
    changeGridTuning: args.changeGridTuning,
    setGridMode: args.setGridMode,
    onResetGrid: () => {
      const tuningLength = args.getTuningSteps(args.nParamsUI.gridTuning);
      args.updateNParams({
        manualGridMutedSteps: [],
        manualGridStepOffsets: Array.from({ length: tuningLength }, () => 0),
      });
      if (args.nParamsUI.lockCursorToGrid) {
        args.commitResonanceCursorY(args.nexusRefs.current.cursorY, { syncHud: false });
      }
    },
    onLockCursorToGridChange: (lock) => {
      args.updateNParams({ lockCursorToGrid: lock });
      if (lock) {
        args.commitResonanceCursorY(args.nexusRefs.current.cursorY, { syncHud: false });
      }
    },
    onQuantizeToggle: (enabled) => {
      resetQuantizeScheduling();
      args.updateNParams({ quantizeOn: enabled });
    },
    onQuantizeBpmChange: (bpm) => {
      resetQuantizeScheduling();
      args.updateNParams({ quantizeBpm: bpm });
    },
    setDroneVolume: args.setDroneVolume,
    onDroneTimbreChange: (next) => {
      args.updateNParams({ droneTimbre: next });
      args.applyRealtimeDroneOvertones(undefined, next);
    },
    updateTransientDriveSource: args.updateTransientDriveSource,
    onQuantizeGridChange: (grid) => {
      resetQuantizeScheduling();
      args.nexusRefs.current.nextAbsoluteStep = null;
      args.waveCollisionQueueRef.current = [];
      args.particleQuantizeSeenRef.current = [];
      clearQuantizedTrafficFlushInterval({ particleQuantizeTimerRef: args.particleQuantizeTimerRef }, 'resonance-panel-quantize-grid-change');
      args.setQuantizeGrid(grid);
      args.updateNParams({ quantizeBpm: args.gridTempoBpm });
    },
    onQuantizeReferenceBarsChange: (bars) => {
      resetQuantizeScheduling();
      args.nexusRefs.current.nextAbsoluteStep = null;
      args.waveCollisionQueueRef.current = [];
      args.particleQuantizeSeenRef.current = [];
      clearQuantizedTrafficFlushInterval({ particleQuantizeTimerRef: args.particleQuantizeTimerRef }, 'resonance-panel-quantize-reference-change');
      args.setParticleQuantizeReferenceBars(bars);
      args.updateNParams({ quantizeBpm: args.gridTempoBpm });
    },
    onGridTempoBpmChange: (bpm) => {
      args.setGridTempoBpm(bpm);
      args.updateNParams({ quantizeBpm: bpm });
    },
    toggleMyzelEnabled: args.toggleMyzelEnabled,
    setMyzelStep16ths: args.setMyzelStep16ths,
    residentEnabled: args.installationFieldConfig.residentsEnabled,
    residentVolume: args.installationFieldConfig.residentVolume,
    residentSystem: args.installationFieldConfig.residentSystem,
    residentMode: args.installationFieldConfig.residentMode,
    onToggleResidentEnabled: args.toggleInstallResidents,
    onResidentVolumeChange: args.setInstallResidentVolumeLevel,
    onResidentSystemChange: args.setInstallResidentSystemValue,
    onResidentModeChange: args.setInstallResidentModeValue,
    onOpenInstallationRoom: args.openInstallationTopologyRoom,
  };
}

type BuildResonanceSoundPalettePanelPropsArgs = {
  nParamsUI: SoundPalettePanelProps['nParamsUI'];
  updateNParams: SoundPalettePanelProps['updateNParams'];
  dronePresets: SoundPalettePanelProps['dronePresets'];
  particlePresets: SoundPalettePanelProps['particlePresets'];
  waveSoundPresets: SoundPalettePanelProps['waveSoundPresets'];
  waveTimbreGradientPresets: SoundPalettePanelProps['waveTimbreGradientPresets'];
  waveVolumeGradientPresets: SoundPalettePanelProps['waveVolumeGradientPresets'];
  particleGradientPresets: SoundPalettePanelProps['particleGradientPresets'];
  waveOvertoneModes: readonly { value: string; label: string }[];
  waveOvertoneArpRates: readonly number[];
  waveOvertoneArpPatterns: readonly { value: string; label: string }[];
  droneJiOvertones: SoundPalettePanelProps['droneJiOvertones'];
  waveOvertoneMixPresets: readonly { value: string; label: string }[];
  waveDecayPresets: SoundPalettePanelProps['waveDecayPresets'];
  metaPresets: readonly { id: string; label: string; description: string; points: string }[];
  mandalaDotPositions: SoundPalettePanelProps['mandalaDotPositions'];
  mandalaPresetColors: Record<string, string>;
  mandalaRandomizingPresetId: string | null;
  rouletteIsSpinning: boolean;
  highlightedMandalaPresetId: string | null;
  activeMetaPreset: SoundPalettePanelProps['activeMetaPreset'];
  activeMetaPresetId: string | null;
  sessionMetaOverrides: SoundPalettePanelProps['sessionMetaOverrides'];
  activeParticleNodes: SoundPalettePanelProps['activeParticleNodes'];
  agentKeys: readonly string[];
  particleVolumeMax: number;
  waveSoundPreset: string;
  waveSoundEnabled: boolean;
  setWaveSoundEnabled: (value: boolean) => void;
  waveSoundVolume: number;
  setWaveSoundVolume: (value: number) => void;
  activeOvertoneMixer: 'drone' | 'waves';
  setActiveOvertoneMixer: (value: 'drone' | 'waves') => void;
  selectedWaveOvertonePreset: string;
  setSelectedWaveOvertonePreset: (value: string) => void;
  setDronePreset: (preset: DronePreset) => void;
  nexusParamsRef: MutableRefObject<any>;
  applyRealtimeDroneOvertones: (mix?: any, timbre?: number) => void;
  previewParticlePresetSelection: (selectionId: string) => Promise<void> | void;
  setWaveSoundPreset: (value: string) => void;
  previewWavePresetSelection: (selectionId: string) => Promise<void> | void;
  applyWaveOvertonePreset: (presetId: WaveOvertoneMixPresetId) => void;
  setWaveOvertone: (label: string, value: number) => void;
  setDroneOvertone: (label: string, value: number) => void;
  toggleNexusAgent: (agentIndex: number) => void;
  setNexusAgentVolume: (agentIndex: number, value: number) => void;
  randomizeMetaPresetForSession: (presetId: string) => void;
  applyMetaPreset: (presetId: string) => void;
  startMetaPresetRoulette: () => void;
  hexToRgba: (hex: string, alpha: number) => string;
};

export function buildResonanceSoundPalettePanelProps(args: BuildResonanceSoundPalettePanelPropsArgs): ComponentProps<typeof ResonanceSoundPalettePanel> {
  return {
    nParamsUI: args.nParamsUI,
    updateNParams: args.updateNParams,
    dronePresets: args.dronePresets,
    particlePresets: args.particlePresets,
    waveSoundPresets: args.waveSoundPresets,
    waveTimbreGradientPresets: args.waveTimbreGradientPresets,
    waveVolumeGradientPresets: args.waveVolumeGradientPresets,
    particleGradientPresets: args.particleGradientPresets,
    waveOvertoneModes: [...args.waveOvertoneModes],
    waveOvertoneArpRates: [...args.waveOvertoneArpRates],
    waveOvertoneArpPatterns: [...args.waveOvertoneArpPatterns],
    droneJiOvertones: args.droneJiOvertones,
    waveOvertoneMixPresets: [...args.waveOvertoneMixPresets],
    waveDecayPresets: args.waveDecayPresets,
    metaPresets: [...args.metaPresets],
    mandalaDotPositions: args.mandalaDotPositions,
    mandalaPresetColors: args.mandalaPresetColors,
    mandalaRandomizingPresetId: args.mandalaRandomizingPresetId,
    rouletteIsSpinning: args.rouletteIsSpinning,
    highlightedMandalaPresetId: args.highlightedMandalaPresetId,
    activeMetaPreset: args.activeMetaPreset,
    activeMetaPresetId: args.activeMetaPresetId,
    sessionMetaOverrides: args.sessionMetaOverrides,
    activeParticleNodes: args.activeParticleNodes,
    agentKeys: [...args.agentKeys],
    particleVolumeMax: args.particleVolumeMax,
    waveSoundPreset: args.waveSoundPreset,
    waveSoundEnabled: args.waveSoundEnabled,
    setWaveSoundEnabled: args.setWaveSoundEnabled,
    waveSoundVolume: args.waveSoundVolume,
    setWaveSoundVolume: args.setWaveSoundVolume,
    activeOvertoneMixer: args.activeOvertoneMixer ?? 'waves',
    setActiveOvertoneMixer: (value) => args.setActiveOvertoneMixer(value as 'drone' | 'waves'),
    selectedWaveOvertonePreset: args.selectedWaveOvertonePreset,
    setSelectedWaveOvertonePreset: args.setSelectedWaveOvertonePreset,
    onDronePresetChange: (nextPreset) => {
      args.setDronePreset(nextPreset as DronePreset);
      requestAnimationFrame(() => {
        const refNow = args.nexusParamsRef.current;
        const mix = refNow.droneJIOvertonesByPreset?.[nextPreset] ?? refNow.droneJIOvertones;
        args.applyRealtimeDroneOvertones(mix, refNow.droneTimbre);
      });
    },
    particleSampleProfileMode: (args.nParamsUI.particleSampleProfileMode ?? 'current_db_v2') as ParticleSampleProfileMode,
    onParticleSampleProfileModeChange: (nextMode) => {
      args.updateNParams({ particleSampleProfileMode: nextMode });
    },
    onParticlePresetChange: (nextPreset) => {
      args.updateNParams({ particlePreset: nextPreset });
      void args.previewParticlePresetSelection(nextPreset);
    },
    onWaveSoundPresetChange: (nextPreset) => {
      args.setWaveSoundPreset(nextPreset);
      void args.previewWavePresetSelection(nextPreset);
    },
    onApplyWaveOvertonePreset: (presetId) => args.applyWaveOvertonePreset(presetId as WaveOvertoneMixPresetId),
    onSetWaveOvertone: args.setWaveOvertone,
    onSetDroneOvertone: (label, value) => {
      args.setDroneOvertone(label, value);
      args.applyRealtimeDroneOvertones({
        ...args.nexusParamsRef.current.droneJIOvertones,
        [label]: value,
      });
    },
    onToggleNexusAgent: args.toggleNexusAgent,
    onSetNexusAgentVolume: args.setNexusAgentVolume,
    onRandomizeMetaPreset: args.randomizeMetaPresetForSession,
    onApplyMetaPreset: args.applyMetaPreset,
    onStartMetaPresetRoulette: args.startMetaPresetRoulette,
    hexToRgba: args.hexToRgba,
  };
}

type BuildResonanceGrooveBassPanelPropsArgs = {
  nParamsUI: ComponentProps<typeof ResonanceGrooveBassPanel>['nParamsUI'];
  updateNParams: ComponentProps<typeof ResonanceGrooveBassPanel>['updateNParams'];
  metronomePulse: ComponentProps<typeof ResonanceGrooveBassPanel>['metronomePulse'];
  enterArenaWorkspace: (workspaceIndex: number) => void;
  exportedDrumConfigs: ComponentProps<typeof ResonanceGrooveBassPanel>['exportedDrumConfigs'];
  selectedExportedDrumConfig: ComponentProps<typeof ResonanceGrooveBassPanel>['selectedExportedDrumConfig'];
  renameSelectedDrumConfig: () => Promise<void> | void;
  removeSelectedDrumConfig: () => Promise<void> | void;
  drumPatterns: ComponentProps<typeof ResonanceGrooveBassPanel>['drumPatterns'];
  drumKits: ComponentProps<typeof ResonanceGrooveBassPanel>['drumKits'];
  bassPatterns: ComponentProps<typeof ResonanceGrooveBassPanel>['bassPatterns'];
  bassPreviewContext: ComponentProps<typeof ResonanceGrooveBassPanel>['bassPreviewContext'];
  materialLoopPanelProps: ComponentProps<typeof ResonanceGrooveBassPanel>['materialLoopPanelProps'];
};

export function buildResonanceGrooveBassPanelProps(args: BuildResonanceGrooveBassPanelPropsArgs): ComponentProps<typeof ResonanceGrooveBassPanel> {
  return {
    nParamsUI: args.nParamsUI,
    updateNParams: args.updateNParams,
    metronomePulse: args.metronomePulse,
    onOpenTempWorkspace: () => args.enterArenaWorkspace(3),
    exportedDrumConfigs: args.exportedDrumConfigs,
    selectedExportedDrumConfig: args.selectedExportedDrumConfig,
    renameSelectedDrumConfig: () => {
      void args.renameSelectedDrumConfig();
    },
    removeSelectedDrumConfig: () => {
      void args.removeSelectedDrumConfig();
    },
    drumPatterns: args.drumPatterns,
    drumKits: args.drumKits,
    bassPatterns: args.bassPatterns,
    bassPreviewContext: args.bassPreviewContext,
    materialLoopPanelProps: args.materialLoopPanelProps,
  };
}

