import type { ChurchMode, GridTuning, ParticleSystem, QuantizeGrid } from '../domain/instrumentData';

export type ResonanceControlNParamsUiShape = {
  gridBase: number;
  particleSystem: ParticleSystem;
  churchMode: ChurchMode;
  gridTuning: GridTuning;
  gridMode: ChurchMode;
  rememberGrid: boolean;
  lockCursorToGrid: boolean;
  cursorSpeed: number;
  gridOn: boolean;
  quantizeOn: boolean;
  quantizeBpm: number;
  echoOn: boolean;
  echoTempo: number;
  echoDecay?: number;
  droneTimbre: number;
  droneVibrato: number;
  droneFlanger: number;
  droneDriveOn?: boolean;
  droneDriveAmount?: number;
  droneDriveTone?: number;
  droneDriveMix?: number;
  droneDriveOutput?: number;
  droneRhythm: string;
  droneRhythmCustomSteps?: number[];
};

export type ResonanceDriveSourceConfig = {
  enabled: boolean;
  send: number;
};

export type ResonanceDriveSourceKey = 'drone' | 'particles' | 'waves' | 'myzel';

export type ResonanceControlUpdateNParams = (patch: Record<string, unknown>) => void;

export type ResonanceControlCorePanelProps = {
  nParamsUI: ResonanceControlNParamsUiShape;
  droneVolume: number;
  transientDriveUi: Record<ResonanceDriveSourceKey, ResonanceDriveSourceConfig>;
  quantizeGrid: QuantizeGrid;
  particleQuantizeReferenceBars: number;
  gridTempoBpm: number;
  quantizeStepMs: number;
  myzelEnabled: boolean;
  myzelStep16ths: number;
  updateNParams: ResonanceControlUpdateNParams;
  setParticleSystem: (value: ParticleSystem) => void;
  setChurchMode: (value: ChurchMode) => void;
  changeGridTuning: (value: GridTuning) => void;
  setGridMode: (value: ChurchMode) => void;
  onResetGrid: () => void;
  onLockCursorToGridChange: (lock: boolean) => void;
  onQuantizeToggle: (enabled: boolean) => void;
  onQuantizeBpmChange: (bpm: number) => void;
  setDroneVolume: (value: number) => void;
  onDroneTimbreChange: (value: number) => void;
  updateTransientDriveSource: (key: ResonanceDriveSourceKey, patch: Partial<ResonanceDriveSourceConfig>) => void;
  onQuantizeGridChange: (grid: QuantizeGrid) => void;
  onQuantizeReferenceBarsChange: (bars: number) => void;
  onGridTempoBpmChange: (bpm: number) => void;
  toggleMyzelEnabled: () => void;
  setMyzelStep16ths: (value: number) => void;
  residentEnabled: boolean;
  residentVolume: number;
  residentSystem: GridTuning;
  residentMode: ChurchMode;
  onToggleResidentEnabled: () => void;
  onResidentVolumeChange: (value: number) => void;
  onResidentSystemChange: (value: GridTuning) => void;
  onResidentModeChange: (value: ChurchMode) => void;
  onOpenInstallationRoom: () => void;
};
