import type { MyzelBallMode, MyzelNodeMode } from "../../resonance/myceliumInterpreters";
import type { Room3BodyControls } from "../../resonance/timbreModel";
import type {
  BassPattern,
  ChurchMode,
  DronePreset,
  DrumKit,
  DrumPattern,
  GridTuning,
  MyzelPattern,
  ParticleGradientPreset,
  ParticlePreset,
  QuantizeGrid,
  WaveDecayPreset,
  WaveOvertoneWaveform,
  WaveSoundPreset,
  WaveTimbreGradientPreset,
  WaveVolumeGradientPreset,
  ParticleSystem,
} from "./instrumentData";

export type MetaPresetId = "north" | "northEast" | "east" | "southEast" | "south" | "southWest" | "west" | "northWest" | "gamelanPelog" | "gamelanSlendro" | "maqamRast" | "maqamBayati" | "bohlenPierceDrone";

type SourceSendConfig = { enabled?: boolean; send?: number };
type MemorySourceConfig = SourceSendConfig & { wet?: number };

export interface MetaPresetDefinition {
  id: MetaPresetId;
  label: string;
  description: string;
  points: string;
  dronePreset: DronePreset;
  particlePreset: ParticlePreset;
  waveSoundPreset: WaveSoundPreset;
  waveSoundEnabled?: boolean;
  waveSoundVolume?: number;
  droneVolume?: number;
  quantizeGrid?: QuantizeGrid;
  gridTempoBpm?: number;
  myzelEnabled?: boolean;
  myzelPattern?: MyzelPattern;
  myzelBallMode?: MyzelBallMode;
  myzelNodeMode?: MyzelNodeMode;
  myzelStep16ths?: number;
  tParams?: { tension: number; slimLayers: number; rawReality: number; intensityGlobal: number };
  room3Body?: {
    enabled?: boolean;
    controls?: Partial<Room3BodyControls>;
  };
  collectiveMemory?: {
    enabled?: boolean;
    window?: number;
    drone?: MemorySourceConfig;
    particles?: MemorySourceConfig;
    waves?: MemorySourceConfig;
    myzel?: MemorySourceConfig;
  };
  spiral?: {
    enabled?: boolean;
    follow?: number;
    drive?: number;
    color?: number;
    motion?: number;
    feedback?: number;
    bloom?: number;
    mix?: number;
    stereoWidth?: number;
    outputGain?: number;
    drone?: SourceSendConfig;
    particles?: SourceSendConfig;
    waves?: SourceSendConfig;
    myzel?: SourceSendConfig;
  };
  liveMastering?: {
    enabled?: boolean;
    strength?: number;
    glue?: number;
    air?: number;
  };
  transientDrive?: {
    drone?: SourceSendConfig;
    particles?: SourceSendConfig;
    waves?: SourceSendConfig;
    myzel?: SourceSendConfig;
  };
  nexusPatch?: Partial<{
    echoOn: boolean;
    echoTempo: number;
    echoDecay: number;
    waveRadius: number;
    waveDecay: WaveDecayPreset;
    gridOn: boolean;
    gridBase: number;
    gridTuning: GridTuning;
    gridMode: ChurchMode;
    particleSystem: ParticleSystem;
    churchMode: ChurchMode;
    lockCursorToGrid: boolean;
    cursorSpeed: number;
    droneTimbre: number;
    droneVibrato: number;
    droneFlanger: number;
    droneRhythm: string;
    droneDriveOn: boolean;
    droneDriveAmount: number;
    droneDriveTone: number;
    droneDriveMix: number;
    droneDriveOutput: number;
    drumActive: boolean;
    drumPattern: DrumPattern;
    drumKit: DrumKit;
    drumVolume: number;
    bassActive: boolean;
    bassPattern: BassPattern;
    bassVolume: number;
    bassRootMode: "auto" | "fixed";
    bassRootHz: number;
    particleGradientX: ParticleGradientPreset;
    particleGradientY: ParticleGradientPreset;
    waveTimbreGradientEnabled: boolean;
    waveTimbreGradientX: WaveTimbreGradientPreset;
    waveVolumeGradientEnabled: boolean;
    waveVolumeGradientX: WaveVolumeGradientPreset;
    waveOvertonesEnabled: boolean;
    droneOvertoneWaveform: WaveOvertoneWaveform;
    waveOvertoneWaveform: WaveOvertoneWaveform;
    particleVolume: number;
    particleMute: boolean;
    quantizeOn: boolean;
    quantizeBpm: number;
  }>;
  gridAllowedSteps?: number[];
  gridOffsets?: Record<number, number>;
  agentEnabledSteps?: number[];
  agentVolumes?: Record<number, number>;
  droneOvertones?: Partial<Record<string, number>>;
  waveOvertones?: Partial<Record<string, number>>;
}
