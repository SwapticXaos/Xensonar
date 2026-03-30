import { useEffect, useMemo, useRef, useState } from "react";
import { getAudioNowSec, quantizeUpToStep } from "./core/time/unifiedTime";
import { ResonanceCommonsRoom } from "./components/ResonanceCommonsRoom";
import { Level3LabRoom } from "./components/Level3LabRoom";
import { MYZEL_POST_FX_GROUPS, buildMachineRoomHandoffProfile, describeScopedMyzelRoute, getMachineRoomDefinition, getTransitionGuidingSentence, summarizeHandoffProfile, type MyzelPostFxGroupId } from "./features/xensonar/architecture/machineRooms";
import { getMaterialLibraryState, subscribeMaterialLibrary } from "./features/l3lab/materialLibrary";
import { getDrumConfigLibraryState, subscribeDrumConfigLibrary, updateDrumConfigEntry, deleteDrumConfigEntry } from "./features/xensonar/drumConfigLibrary";
import type { DrumLaneId } from "./features/xensonar/drumPatternMachine";
import {
  getGridModeCycleDirection,
  getKeyboardPitchIndexFromMap,
  getKeyboardWindowShiftDirection,
  getMirroredKeyboardPitchIndex,
  getWaveDirectionForKey,
  isEditableTarget,
  isTargetWithinHotkeyScope,
  isGridModeCycleEvent,
  isKeyboardWindowShiftCode,
  isNextGridTuningKey,
  isPrevGridTuningKey,
  isResonanceWaveTriggerKey,
  shouldToggleKeyboardMirror,
} from "./features/xensonar/resonanceKeyboard";
import { createEmptyMyceliumSnapshot, type MyceliumSnapshot } from "./features/topology/myceliumSnapshot";
import { deriveDroneMyceliumMod, deriveMyzelLayerMod, type MyzelBallMode, type MyzelNodeMode } from "./features/resonance/myceliumInterpreters";
import {
  AGENT_KEYS,
  BASS_PATTERNS,
  BP_13TET_RATIOS,
  defaultAgentEnabled,
  DEFAULT_OVERTONE_BY_PRESET,
  deriveModeMask,
  GAMELAN_PELOG_CENTS,
  DRONE_JI_OVERTONES,
  DRUM_KITS,
  DRUM_PATTERNS,
  DRONE_MAX_FREQ,
  DRONE_MIN_FREQ,
  DRONE_PRESETS,
  FREQ,
  formatHzCompact,
  GAME_HEIGHT,
  GAME_WIDTH,
  getModesForSystem,
  getMutedStepsForMode,
  getMyzelPatternLevel,
  getOptionLabel,
  getParticleNodes,
  getTuningSteps,
  GRID_TUNING_OPTIONS,
  JI_NODES,
  KAMMERTON_KEY_MAP,
  KAMMERTON_KEYS,
  MAQAM_RAST_CENTS,
  MICRO_RATIOS,
  MYZEL_BALL_MODE_OPTIONS,
  MYZEL_NODE_MODE_OPTIONS,
  MYZEL_PATTERNS,
  cloneOvertoneMixByPreset,
  nextGridTuning,
  createEmptyOvertoneMix,
  PARTICLE_GRADIENT_PRESETS,
  PARTICLE_PRESETS,
  PARTICLE_VOLUME_MAX,
  PRESET_MAP,
  RUN_EDOS,
  sameBooleanArray,
  sameNumberSet,
  TOPO_HEIGHT,
  TOPO_WIDTH,
  WAVE_DECAY_PRESETS,
  WAVE_SOUND_PRESETS,
  WAVE_TIMBRE_GRADIENT_PRESETS,
  WAVE_VOLUME_GRADIENT_PRESETS,
} from "./features/xensonar/domain/instrumentData";
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
  ParticleSystem,
  QuantizeGrid,
  WaveDecayPreset,
  WaveOvertoneWaveform,
  WaveSoundPreset,
  WaveTimbreGradientPreset,
  WaveVolumeGradientPreset,
} from "./features/xensonar/domain/instrumentData";
import { META_PRESETS, createMetaOvertoneMix, type MetaPresetDefinition, type MetaPresetId } from "./features/xensonar/domain/metaPresets";
import type {
  AgentImpactRipple,
  Bullet,
  DirectedPulse,
  GridLine,
  HeartPickup,
  HiddenAnchor,
  NexusAgent,
  NexusRipple,
  Orb,
  Particle,
  RecordingCropRange,
  RecordingMarker,
  RecordingSourceMode,
  RecordingState,
  Room,
  SemanticNode,
} from "./features/xensonar/domain/runtimeTypes";
import { computeConstellationSignature } from "./features/topology/constellationSignature";
import { getDominantDroneRatios, getWeaveMatch } from "./features/resonance/weaveMath";
import { DEFAULT_MYZEL_INTERPRETER_MIX, blendHz, resolveInterpreterMyzelBaseHz, type MyzelInterpreterMix } from "./features/resonance/interpreterConfig";
import { deriveRoom3ModField, type Room3ModField } from "./features/resonance/modField";
import { createDroneDriveInsert, updateDroneDriveInsert, type DroneDriveInsertRefs } from "./features/resonance/droneDrive";
import { createCollectiveMemoryEffect, createDescriptorProbe, pushDescriptorFrame, readDescriptorProbe, summarizeDescriptorHistory, type CollectiveMemoryEffect, type DescriptorFrame, type DescriptorProbe, type DescriptorSummary } from "./features/resonance/collectiveMemoryEffect";
import { createLiveMasteringSystem, updateLiveMasteringSystem, type LiveMasteringSystem, type LiveMasterTelemetry } from "./features/resonance/liveMastering";
import { createMyzelPostFxRouter, updateMyzelPostFxRouter, type MyzelPostFxRouter, type MyzelPostFxSourceKey, type MyzelPostFxTelemetry } from "./features/resonance/myzelPostFxRouter";
import { createPsychedelicSpiralDevice, type PsychedelicSpiralDevice } from "./features/resonance/psychedelicSpiralDevice";
import { createTransientDriveDevice, updateTransientDriveDevice, type TransientDriveDeviceRefs } from "./features/resonance/transientDriveDevice";
import { createDrumMachine, DEFAULT_DRUM_STYLE, type DrumStyle } from "./features/resonance/drumMachine";
import { createControlScheduler, type ControlSchedulerMetrics } from "./features/resonance/controlScheduler";
import { createTransientRuntime, type TransientEventPlan, type TransientRuntimeSnapshot, type TransientSource, type TransientVoiceHandle } from "./features/resonance/transientRuntime";
import { generateRhythmForgePattern } from "./features/resonance/rhythmforge/patterns";
import { grooveStateFromMycelium } from "./features/resonance/rhythmforge/bridges";
import type { GeneratedPattern } from "./features/resonance/rhythmforge/types";
import { generatePsyBassPattern } from "./features/resonance/psybass/patterns";
import type { PsyBassPattern, PsyBassStyle } from "./features/resonance/psybass/types";
import { createEnterHoldPsyFxDevice, type EnterHoldPsyFxDevice } from "./features/resonance/enterHoldPsyFx";
import { Schwarmdeuter, type ParticleVoiceSnapshot, type SchwarmMaterial, type SwarmState } from "./features/resonance/schwarmdeuter";
import { DEFAULT_ROOM3_BODY_CONTROLS, deriveRoom3TimbreState, getRoom3MaterialLabel, type Room3BodyControls, type Room3TimbreState } from "./features/resonance/timbreModel";

const MANDALA_PRESET_COLORS = ["#fb7185", "#f59e0b", "#facc15", "#4ade80", "#2dd4bf", "#38bdf8", "#818cf8", "#c084fc"];
const MANDALA_RANDOMIZER_COLORS = ["#fb7185", "#f97316", "#f59e0b", "#facc15", "#a3e635", "#4ade80", "#2dd4bf", "#38bdf8", "#60a5fa", "#818cf8", "#a78bfa", "#c084fc", "#f472b6"];
const MANDALA_DOT_POSITIONS = [
  { id: "north", cx: 0, cy: -30 },
  { id: "northEast", cx: 21.2, cy: -21.2 },
  { id: "east", cx: 30, cy: 0 },
  { id: "southEast", cx: 21.2, cy: 21.2 },
  { id: "south", cx: 0, cy: 30 },
  { id: "southWest", cx: -21.2, cy: 21.2 },
  { id: "west", cx: -30, cy: 0 },
  { id: "northWest", cx: -21.2, cy: -21.2 },
] as const satisfies { id: MetaPresetId; cx: number; cy: number }[];

const WAVE_OVERTONE_MODES = [
  { value: "direct", label: "Direkt" },
  { value: "arp", label: "Arpeggio" },
  { value: "hybrid", label: "Hybrid" },
] as const;
type WaveOvertoneMode = typeof WAVE_OVERTONE_MODES[number]["value"];

const WAVE_OVERTONE_ARP_PATTERNS = [
  { value: "up", label: "Auf" },
  { value: "down", label: "Ab" },
  { value: "updown", label: "Auf/Ab" },
  { value: "random", label: "Zufall" },
] as const;
type WaveOvertoneArpPattern = typeof WAVE_OVERTONE_ARP_PATTERNS[number]["value"];

type WaveOvertoneArpRate = 16 | 32 | 64;
const WAVE_OVERTONE_ARP_RATES: WaveOvertoneArpRate[] = [16, 32, 64];

const createNamedOvertoneMix = (entries: Array<[string, number]>) => {
  const mix = createEmptyOvertoneMix();
  entries.forEach(([label, amount]) => {
    mix[label] = Math.min(1, Math.max(0, amount));
  });
  return mix;
};

const WAVE_OVERTONE_MIX_PRESETS = [
  {
    value: "empty",
    label: "Leer",
    globalLevel: 1,
    mix: createNamedOvertoneMix([]),
  },
  {
    value: "fifth_bloom",
    label: "Quintenblüte",
    globalLevel: 1.04,
    mix: createNamedOvertoneMix([["4/3", 0.42], ["3/2", 1], ["15/8", 0.34]]),
  },
  {
    value: "bright_ladder",
    label: "Helle Leiter",
    globalLevel: 1.08,
    mix: createNamedOvertoneMix([["11/8", 0.28], ["3/2", 0.56], ["8/5", 0.78], ["13/8", 0.86], ["5/3", 0.62], ["15/8", 1]]),
  },
  {
    value: "odd_glass",
    label: "Schiefes Glas",
    globalLevel: 1.16,
    mix: createNamedOvertoneMix([["11/8", 0.92], ["13/8", 1], ["7/4", 0.82], ["15/8", 0.34]]),
  },
  {
    value: "low_halo",
    label: "Tiefer Halo",
    globalLevel: 1.12,
    mix: createNamedOvertoneMix([["4/3", 0.8], ["3/2", 0.68], ["8/5", 0.3], ["5/3", 0.22]]),
  },
  {
    value: "full_shimmer",
    label: "Vollschimmer",
    globalLevel: 0.9,
    mix: createNamedOvertoneMix([["4/3", 0.36], ["11/8", 0.38], ["3/2", 0.58], ["8/5", 0.56], ["13/8", 0.64], ["5/3", 0.58], ["7/4", 0.46], ["15/8", 0.72]]),
  },
] as const;
type WaveOvertoneMixPresetId = typeof WAVE_OVERTONE_MIX_PRESETS[number]["value"];

type ActiveWaveOvertone = { node: (typeof DRONE_JI_OVERTONES)[number]; amount: number };

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((ch) => ch + ch).join('') : clean;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
import {
  deriveRoom3ModalBody,
  getPartialGroupWeight,
  getParticleBodyExciterProfile,
  getWaveBodyExciterProfile,
  type ParticleGradientAxes,
  type Room3ExciterProfile,
  type Room3ModalBodyState,
} from "./features/resonance/modalBody";

const BASE_WAVE_MAX_RADIUS = 168;
const BASE_WAVE_SPEED = 2.5;

const SCHWARM_MATERIAL_OPTIONS: Array<{ value: SchwarmMaterial; label: string }> = [
  { value: "fungus", label: "Fungus" },
  { value: "resin", label: "Resin" },
  { value: "dust", label: "Dust" },
  { value: "glass", label: "Glass" },
  { value: "metal", label: "Metal" },
  { value: "plasma", label: "Plasma" },
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const isRhythmForgePattern = (pattern: DrumPattern | BassPattern) => pattern.startsWith("forge_");
const isPsyBassPattern = (pattern: BassPattern) => pattern.startsWith("psy_");
const getRhythmForgeFlavor = (pattern: DrumPattern | BassPattern): "rooted" | "braided" | "fractured" => {
  if (pattern === "forge_braided") return "braided";
  if (pattern === "forge_fractured") return "fractured";
  return "rooted";
};
const getPsyBassStyle = (pattern: BassPattern): PsyBassStyle => {
  switch (pattern) {
    case "psy_rolling": return "rolling";
    case "psy_gallop": return "gallop";
    case "psy_triplet": return "tripletGhost";
    case "psy_dark": return "darkForest";
    default: return "classicOffbeat";
  }
};
const foldFreqIntoRange = (freq: number, min: number, max: number) => {
  let out = Number.isFinite(freq) && freq > 0 ? freq : min;
  while (out < min) out *= 2;
  while (out > max) out /= 2;
  return clamp(out, min, max);
};
const MAX_RECORDING_MS = 15 * 60 * 1000;
const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
const floatToInt16 = (input: Float32Array) => {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = clamp(input[i], -1, 1);
    out[i] = sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767);
  }
  return out;
};
const interleaveStereo = (left: Int16Array, right: Int16Array) => {
  const out = new Int16Array(left.length + right.length);
  let index = 0;
  for (let i = 0; i < left.length; i += 1) {
    out[index++] = left[i];
    out[index++] = right[i];
  }
  return out;
};
const writeAscii = (view: DataView, offset: number, text: string) => {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
};
const encodeWavBlob = (left: Float32Array, right: Float32Array, sampleRate: number) => {
  const leftPcm = floatToInt16(left);
  const rightPcm = floatToInt16(right);
  const interleaved = interleaveStereo(leftPcm, rightPcm);
  const bytesPerSample = 2;
  const numChannels = 2;
  const dataSize = interleaved.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i += 1) {
    view.setInt16(offset, interleaved[i], true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
};
const buildWaveformPeaks = (buffer: AudioBuffer, buckets = 1400) => {
  const channelCount = Math.max(1, buffer.numberOfChannels);
  const frameCount = buffer.length;
  if (!frameCount) return [] as number[];
  const bucketCount = Math.max(64, Math.min(buckets, frameCount));
  const samplesPerBucket = Math.max(1, Math.floor(frameCount / bucketCount));
  const peaks: number[] = [];

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = bucket * samplesPerBucket;
    const end = bucket === bucketCount - 1 ? frameCount : Math.min(frameCount, start + samplesPerBucket);
    let peak = 0;
    for (let channel = 0; channel < channelCount; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = start; i < end; i += 1) {
        const abs = Math.abs(data[i] ?? 0);
        if (abs > peak) peak = abs;
      }
    }
    peaks.push(clamp(peak, 0, 1));
  }

  return peaks;
};

const getBufferRange = (buffer: AudioBuffer, startMs: number, endMs: number) => {
  const durationMs = Math.round(buffer.duration * 1000);
  const startFrame = clamp(Math.floor((startMs / 1000) * buffer.sampleRate), 0, buffer.length);
  const endFrame = clamp(Math.ceil((endMs / 1000) * buffer.sampleRate), 0, buffer.length);
  const from = Math.min(startFrame, endFrame);
  const to = Math.max(startFrame, endFrame);
  const safeTo = Math.max(from + 1, to);
  const leftSource = buffer.getChannelData(0);
  const rightSource = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftSource;
  return {
    left: leftSource.slice(from, safeTo),
    right: rightSource.slice(from, safeTo),
    durationMs: clamp(Math.round(((safeTo - from) / buffer.sampleRate) * 1000), 0, durationMs),
  };
};

const getSupportedRecordingMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
};
const getQuantizeStepSeconds = (bpm: number, grid: QuantizeGrid) => {
  const safeBpm = Math.max(1, bpm);
  const divisor = grid === 16 ? 4 : grid === 32 ? 8 : 16;
  return 60 / safeBpm / divisor;
};

const getWaveOvertoneArpStepSeconds = (bpm: number, rate: WaveOvertoneArpRate) =>
  getQuantizeStepSeconds(bpm, rate as QuantizeGrid);

const buildWaveOvertoneArpSequence = (
  activeMix: ActiveWaveOvertone[],
  pattern: WaveOvertoneArpPattern,
  steps: number,
) => {
  const totalSteps = Math.max(1, Math.round(steps));
  if (!activeMix.length) return [] as ActiveWaveOvertone[];

  const ascending = [...activeMix].sort((a, b) => a.node.ratio - b.node.ratio || b.amount - a.amount);
  const descending = [...ascending].reverse();
  const upDown = ascending.length > 1 ? [...ascending, ...descending.slice(1, -1)] : ascending;

  if (pattern === "random") {
    const weighted = ascending.map((entry) => ({
      entry,
      weight: Math.max(0.05, entry.amount * entry.amount + 0.08),
    }));
    let previousLabel = "";
    const out: ActiveWaveOvertone[] = [];
    for (let stepIndex = 0; stepIndex < totalSteps; stepIndex += 1) {
      const pool = weighted.filter(({ entry }) => weighted.length <= 1 || entry.node.label !== previousLabel);
      const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
      let cursor = Math.random() * Math.max(0.0001, totalWeight);
      let chosen = pool[pool.length - 1]?.entry ?? ascending[0];
      for (const item of pool) {
        cursor -= item.weight;
        if (cursor <= 0) {
          chosen = item.entry;
          break;
        }
      }
      out.push(chosen);
      previousLabel = chosen.node.label;
    }
    return out;
  }

  const source = pattern === "down" ? descending : pattern === "updown" ? upDown : ascending;
  return Array.from({ length: totalSteps }, (_, idx) => source[idx % source.length]);
};

const freqFromY = (y: number) => {
  const normalized = 1 - clamp(y, 0, GAME_HEIGHT) / GAME_HEIGHT;
  return DRONE_MIN_FREQ + normalized * (DRONE_MAX_FREQ - DRONE_MIN_FREQ);
};

const yFromFreq = (freq: number) => {
  const normalized = (freq - DRONE_MIN_FREQ) / (DRONE_MAX_FREQ - DRONE_MIN_FREQ);
  return clamp((1 - normalized) * GAME_HEIGHT, 0, GAME_HEIGHT);
};

const gradientPresetValue = (preset: ParticleGradientPreset, normalized: number) => {
  const n = clamp(normalized, 0, 1);
  const centerDist = Math.abs(n - 0.5) * 2;
  switch (preset) {
    case "bright_max":
      return n;
    case "bright_min":
      return 1 - n;
    case "warm_center":
      return 1 - centerDist;
    case "edge_spark":
      return centerDist;
    case "metal_max":
      return Math.pow(n, 0.7);
    case "wood_min":
      return Math.pow(1 - n, 0.7);
    case "none":
    default:
      return 0;
  }
};

const computeParticleGradientAxes = (
  x: number,
  y: number,
  xPreset: ParticleGradientPreset,
  yPreset: ParticleGradientPreset,
): ParticleGradientAxes => {
  const xNorm = clamp(x / GAME_WIDTH, 0, 1);
  const yNorm = clamp(1 - y / GAME_HEIGHT, 0, 1);
  const brightness = gradientPresetValue(xPreset, xNorm);
  const attackHardness = gradientPresetValue(yPreset, yNorm);
  return {
    brightness: clamp(brightness, 0, 1),
    attackHardness: clamp(attackHardness, 0, 1),
  };
};

type WaveTimbreGradientState = {
  amount: number;
  wire: number;
  shine: number;
  coreCutoffMul: number;
  coreCutoffAdd: number;
  coreResonanceAdd: number;
  durationMul: number;
  coreVolumeMul: number;
  dryLateMul: number;
  colorMix: number;
  colorDelay: number;
  colorAttack: number;
  exciterPreGain: number;
  exciterDrive: number;
  jawariFreqStart: number;
  jawariFreqEnd: number;
  jawariQ: number;
  jawariGain: number;
  jawariDrive: number;
  vowel1Start: number;
  vowel1End: number;
  vowel2Start: number;
  vowel2End: number;
  vowel1Q: number;
  vowel2Q: number;
  vowel1Gain: number;
  vowel2Gain: number;
  shineHighpassStart: number;
  shineHighpassEnd: number;
  shineGain: number;
};

const smoothstep01 = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

const makeDriveCurve = (amount: number) => {
  const k = clamp(amount, 0.75, 8);
  const samples = 1024;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * k);
  }
  return curve;
};

const computeWaveTimbreGradientState = (
  x: number,
  enabled: boolean,
  preset: WaveTimbreGradientPreset,
): WaveTimbreGradientState => {
  if (!enabled || preset === "none") {
    return {
      amount: 0,
      wire: 0,
      shine: 0,
      coreCutoffMul: 1,
      coreCutoffAdd: 0,
      coreResonanceAdd: 0,
      durationMul: 1,
      coreVolumeMul: 1,
      dryLateMul: 0.3,
      colorMix: 0,
      colorDelay: 0.001,
      colorAttack: 0.002,
      exciterPreGain: 1,
      exciterDrive: 1.3,
      jawariFreqStart: 1200,
      jawariFreqEnd: 1380,
      jawariQ: 4,
      jawariGain: 0,
      jawariDrive: 1.3,
      vowel1Start: 700,
      vowel1End: 820,
      vowel2Start: 2200,
      vowel2End: 2600,
      vowel1Q: 2.2,
      vowel2Q: 2,
      vowel1Gain: 0,
      vowel2Gain: 0,
      shineHighpassStart: 2400,
      shineHighpassEnd: 3200,
      shineGain: 0,
    };
  }

  const n = clamp(x / GAME_WIDTH, 0, 1);
  const left = smoothstep01(1 - n);
  const right = smoothstep01(n);
  const center = 1 - smoothstep01(Math.abs(n - 0.5) * 2);
  const edge = smoothstep01(Math.abs(n - 0.5) * 2);
  let wire = 0;
  let shine = 0;

  switch (preset) {
    case "sitar_rise":
      wire = right;
      shine = right * 0.08;
      break;
    case "psy_rise":
      shine = right;
      wire = right * 0.06;
      break;
    case "wire_to_psy":
      wire = left;
      shine = right;
      break;
    case "psy_to_wire":
      shine = left;
      wire = right;
      break;
    case "center_shine":
      shine = center;
      wire = center * 0.1;
      break;
    case "edge_tension":
      wire = edge * (0.52 + left * 0.34);
      shine = edge * (0.48 + right * 0.34);
      break;
    default:
      break;
  }

  wire = clamp(wire, 0, 1);
  shine = clamp(shine, 0, 1);
  const amount = clamp(Math.max(wire, shine), 0, 1);
  const contrast = clamp(Math.abs(wire - shine), 0, 1);
  const jawariBias = clamp(wire * 0.96 + shine * 0.12, 0, 1);
  const vowelBias = clamp(shine * 0.96 + wire * 0.16, 0, 1);
  const travel = clamp(0.14 + wire * 0.34 + shine * 0.7, 0, 1);

  return {
    amount,
    wire,
    shine,
    coreCutoffMul: 0.96 + shine * 0.18 + wire * 0.06,
    coreCutoffAdd: shine * 260 + wire * 80,
    coreResonanceAdd: wire * 0.24 + shine * 0.2,
    durationMul: 1 + wire * 0.05 - shine * 0.02,
    coreVolumeMul: 1 + amount * 0.02,
    dryLateMul: clamp(0.42 - amount * 0.16 - contrast * 0.1, 0.14, 0.42),
    colorMix: clamp(0.34 + amount * 0.34 + contrast * 0.16, 0.26, 0.82),
    colorDelay: 0.0003 + (1 - amount) * 0.0012,
    colorAttack: 0.0014 + amount * 0.0024,
    exciterPreGain: 1.45 + wire * 1.35 + shine * 1.8,
    exciterDrive: 2.1 + wire * 4.6 + shine * 5.8,
    jawariFreqStart: lerp(820, 1920, jawariBias),
    jawariFreqEnd: lerp(1180, 3240, clamp(jawariBias * 0.82 + travel * 0.5, 0, 1)),
    jawariQ: 4.2 + wire * 8.1 + shine * 0.9,
    jawariGain: 0.14 + wire * 0.62 + shine * 0.05,
    jawariDrive: 1.6 + wire * 5.2 + shine * 0.75,
    vowel1Start: lerp(560, 1320, vowelBias),
    vowel1End: lerp(920, 2480, clamp(vowelBias * 0.78 + travel * 0.42, 0, 1)),
    vowel2Start: lerp(1600, 3400, vowelBias),
    vowel2End: lerp(2500, 6400, clamp(vowelBias * 0.92 + travel * 0.64, 0, 1)),
    vowel1Q: 2.6 + wire * 1.4 + shine * 4.8,
    vowel2Q: 2.3 + wire * 0.8 + shine * 4.2,
    vowel1Gain: 0.1 + wire * 0.16 + shine * 0.26,
    vowel2Gain: 0.08 + wire * 0.06 + shine * 0.52,
    shineHighpassStart: 2100 + shine * 2300 + wire * 120,
    shineHighpassEnd: 3200 + shine * 4200 + wire * 240,
    shineGain: 0.05 + shine * 0.48 + wire * 0.02,
  };
};

const computeWaveVolumeGradientMultiplier = (
  x: number,
  enabled: boolean,
  preset: WaveVolumeGradientPreset,
) => {
  if (!enabled || preset === "none") return 1;
  const n = smoothstep01(clamp(x / GAME_WIDTH, 0, 1));
  if (preset === "left_quiet_right_loud") return lerp(0.55, 1.35, n);
  if (preset === "left_loud_right_quiet") return lerp(1.35, 0.55, n);
  return 1;
};

const waveIntensityScalar = (progress: number, decay: WaveDecayPreset) => {
  const p = clamp(progress, 0, 1);
  if (decay === "abrupt") return 1;
  if (decay === "linear") return Math.max(0.04, 1 - p);
  if (decay === "bellcurve") return Math.max(0.02, Math.exp(-Math.pow(p * 3.6, 2)));
  if (decay === "exponential") return Math.max(0.02, Math.exp(-p * 5.2));
  if (decay === "late_falloff") return p < 0.65 ? 1 - p * 0.18 : Math.max(0.02, 0.88 - Math.pow((p - 0.65) / 0.35, 1.35));
  return 1;
};

const getImpactRippleHue = (system: ParticleSystem, index: number, total: number) => {
  if (total <= 0) return 0;
  if (system === "bp") {
    if (index === total - 1) return null;
    const gradientCount = Math.max(1, total - 1);
    const t = clamp(index / Math.max(1, gradientCount - 1), 0, 1);
    return 0 + t * 270;
  }
  const t = clamp(index / Math.max(1, total - 1), 0, 1);
  return 0 + t * 270;
};

const buildGridFrequencies = (
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => {
  const frequencies: number[] = [];
  const octaves = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const muted = new Set(manualMutedSteps);

  if (tuning === "ji") {
    for (const oct of octaves) {
      JI_NODES.forEach((ji, step) => {
        if (muted.has(step)) return;
        const offsetCents = (manualStepOffsets[step] ?? 0) * 10;
        const freq = base * ji.ratio * Math.pow(2, oct) * Math.pow(2, offsetCents / 1200);
        if (freq >= DRONE_MIN_FREQ && freq <= DRONE_MAX_FREQ) frequencies.push(freq);
      });
    }
  } else if (tuning === "bp") {
    const tritaveShifts = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    for (const tri of tritaveShifts) {
      for (let step = 0; step < 13; step += 1) {
        if (muted.has(step)) continue;
        const offset = manualStepOffsets[step] ?? 0;
        const freq = base * Math.pow(3, (step + offset) / 13) * Math.pow(3, tri);
        if (freq >= DRONE_MIN_FREQ && freq <= DRONE_MAX_FREQ) frequencies.push(freq);
      }
    }
  } else if (tuning === "gamelan" || tuning === "maqam") {
    const centsList = tuning === "gamelan" ? GAMELAN_PELOG_CENTS : MAQAM_RAST_CENTS;
    for (const oct of octaves) {
      centsList.forEach((cents, step) => {
        if (muted.has(step)) return;
        const offsetCents = (manualStepOffsets[step] ?? 0) * 10;
        const ratio = Math.pow(2, (cents + offsetCents) / 1200);
        const freq = base * ratio * Math.pow(2, oct);
        if (freq >= DRONE_MIN_FREQ && freq <= DRONE_MAX_FREQ) frequencies.push(freq);
      });
    }
  } else {
    const edo = parseInt(tuning.replace("edo", ""), 10);
    for (const oct of octaves) {
      for (let step = 0; step < edo; step += 1) {
        if (muted.has(step)) continue;
        const offset = manualStepOffsets[step] ?? 0;
        const ratio = Math.pow(2, (step + offset) / edo);
        const freq = base * ratio * Math.pow(2, oct);
        if (freq >= DRONE_MIN_FREQ && freq <= DRONE_MAX_FREQ) frequencies.push(freq);
      }
    }
  }

  return [...new Set(frequencies.map((f) => Number(f.toFixed(4))))].sort((a, b) => a - b);
};

const snapYToGrid = (
  y: number,
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = [],
) => {
  const target = freqFromY(y);
  const grid = buildGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  if (!grid.length) return clamp(y, 0, GAME_HEIGHT);
  let nearest = grid[0];
  let best = Math.abs(target - nearest);
  for (let i = 1; i < grid.length; i += 1) {
    const d = Math.abs(target - grid[i]);
    if (d < best) {
      best = d;
      nearest = grid[i];
    }
  }
  return yFromFreq(nearest);
};

const buildKeyboardGridFrequencies = (
  base: number,
  tuning: GridTuning,
  manualMutedSteps: number[] = [],
  manualStepOffsets: number[] = []
) => {
  const grid = buildGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  const unoffsetGrid = buildGridFrequencies(base, tuning, manualMutedSteps, []);

  let unoffsetIndex = -1;
  for (let i = unoffsetGrid.length - 1; i >= 0; i -= 1) {
    if (unoffsetGrid[i] <= base * 1.001) {
      unoffsetIndex = i;
      break;
    }
  }
  if (unoffsetIndex === -1) unoffsetIndex = unoffsetGrid.length - 1;

  const descendingGrid = [...grid].reverse();
  const startIndex = grid.length - 1 - unoffsetIndex;

  return descendingGrid.slice(startIndex).filter((f) => f >= DRONE_MIN_FREQ && f <= DRONE_MAX_FREQ);
};

const keyboardWindowFrequency = (base: number, tuning: GridTuning, startOffset: number, stepDown: number, manualMutedSteps: number[] = [], manualStepOffsets: number[] = []) => {
  const gridDesc = buildKeyboardGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  if (!gridDesc.length) return null;
  const start = Math.max(0, Math.min(Math.round(startOffset), gridDesc.length - 1));
  return gridDesc[Math.min(gridDesc.length - 1, start + stepDown)] ?? null;
};

const shiftKeyboardWindowOffset = (base: number, tuning: GridTuning, currentOffset: number, direction: -1 | 1, manualMutedSteps: number[] = [], manualStepOffsets: number[] = []) => {
  const gridDesc = buildKeyboardGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets);
  if (!gridDesc.length) return 0;
  return Math.max(0, Math.min(Math.round(currentOffset) + direction, gridDesc.length - 1));
};

const stepYToGrid = (currentY: number, direction: 1 | -1, base: number, tuning: GridTuning, manualMutedSteps: number[] = [], manualStepOffsets: number[] = []) => {
  const target = freqFromY(currentY);
  const grid = buildGridFrequencies(base, tuning, manualMutedSteps, manualStepOffsets).sort((a, b) => a - b);
  if (!grid.length) return currentY;
  let idx = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < grid.length; i += 1) {
    const d = Math.abs(grid[i] - target);
    if (d < best) {
      best = d;
      idx = i;
    }
  }
  const next = clamp(idx + direction, 0, grid.length - 1);
  return yFromFreq(grid[next]);
};

const createSoftClipCurve = (amount = 1.6) => {
  const n = 2048;
  const drive = Math.max(0.0001, amount <= 1 ? 1 + amount * 12 : amount);
  const norm = Math.tanh(drive);
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x) / norm;
  }
  return curve;
};

const createMyzelDriveCurve = (amount = 0.35) => {
  const n = 4096;
  const drive = 1.2 + amount * 18;
  const foldDepth = 0.08 + amount * 0.32;
  const foldFreq = 2.2 + amount * 3.8;
  const norm = Math.tanh(drive * (1 + foldDepth));
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    const folded = x + Math.sin(x * Math.PI * foldFreq) * foldDepth;
    curve[i] = clamp(Math.tanh(drive * folded) / norm, -1, 1);
  }
  return curve;
};

type StatusGlyphKind = "octave" | "sustain" | "swell" | "echo" | "drive";

const StatusGlyph = ({ kind, active, title }: { kind: StatusGlyphKind; active: boolean; title: string }) => {
  const tones: Record<StatusGlyphKind, string> = {
    octave: "text-sky-100 border-sky-400/70 bg-sky-950/35",
    sustain: "text-amber-100 border-amber-400/70 bg-amber-950/35",
    swell: "text-fuchsia-100 border-fuchsia-400/70 bg-fuchsia-950/35",
    echo: "text-emerald-100 border-emerald-400/70 bg-emerald-950/35",
    drive: "text-rose-100 border-rose-400/70 bg-rose-950/35",
  };

  const glyph = (() => {
    switch (kind) {
      case "octave":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" />
            <path d="M8.2 8.8 12 5l3.8 3.8" />
            <path d="M6.5 19h11" />
            <path d="M8.8 14.8h6.4" />
          </svg>
        );
      case "sustain":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4.5 12h15" />
            <path d="M7 8.5v7" />
            <path d="M17 8.5v7" />
            <path d="M10 9.3h4" />
            <path d="M10 14.7h4" />
          </svg>
        );
      case "swell":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="6" />
            <path d="M12 3.2v2.4" />
            <path d="M12 18.4v2.4" />
            <path d="M3.2 12h2.4" />
            <path d="M18.4 12h2.4" />
          </svg>
        );
      case "echo":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5.7 14.6c1.2-2.3 3-3.5 5.3-3.5s4 1.1 5.2 3.5" />
            <path d="M8.8 18c1-.9 2.1-1.3 3.2-1.3 1.1 0 2.2.4 3.2 1.3" />
            <path d="M4.1 10.4c1.7-3.2 4.2-4.9 6.9-4.9 3 0 5.6 1.8 7.4 5.4" />
          </svg>
        );
      case "drive":
        return (
          <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3.8 13.9c2.2 0 2.6-5.4 5.2-5.4s1.9 7.4 4.5 7.4 2.3-7.4 4.7-7.4 2.4 3.3 3.2 3.3" />
            <path d="M4.5 6.6h15" />
            <path d="M4.5 17.4h15" />
          </svg>
        );
    }
  })();

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border transition-all ${active ? `${tones[kind]} shadow-[0_0_14px_rgba(255,255,255,0.08)] opacity-100` : "border-neutral-800 bg-neutral-950/60 text-neutral-600 opacity-60"}`}
      title={title}
      aria-label={title}
    >
      {glyph}
    </div>
  );
};

export function App() {
  const [room, setRoom] = useState<Room>("RESONANCE");
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const finalMixBusRef = useRef<GainNode | null>(null);
  const drumMixBusRef = useRef<GainNode | null>(null);
  const masterMixBusRef = useRef<GainNode | null>(null);
  const finalLimiterRef = useRef<DynamicsCompressorNode | null>(null);
  const finalClipperRef = useRef<WaveShaperNode | null>(null);
  const finalOutputTrimRef = useRef<GainNode | null>(null);
  const liveMasteringRef = useRef<LiveMasteringSystem | null>(null);
  const noDrumRecordClipperRef = useRef<WaveShaperNode | null>(null);
  const noDrumRecordLimiterRef = useRef<DynamicsCompressorNode | null>(null);
  const noDrumRecordOutputRef = useRef<GainNode | null>(null);
  const [liveMasteringEnabled, setLiveMasteringEnabled] = useState(false);
  const [liveMasteringStrength, setLiveMasteringStrength] = useState(0.68);
  const [liveMasteringGlue, setLiveMasteringGlue] = useState(0.54);
  const [liveMasteringAir, setLiveMasteringAir] = useState(0.48);
  const [liveMasterMonitor, setLiveMasterMonitor] = useState<LiveMasterTelemetry>({ main: 0, drone: 0, rhythm: 0, space: 0, density: 0, trim: 0.92 });
  const [quantizeGrid, setQuantizeGrid] = useState<QuantizeGrid>(16);
  const [gridTempoBpm, setGridTempoBpm] = useState(108);
  const quantizeStepMs = Math.round(getQuantizeStepSeconds(gridTempoBpm, quantizeGrid) * 1000);
  const particleQuantizeQueueRef = useRef<{ dueTime: number; freq: number; amp: number; preset: ParticlePreset; x: number; y: number; waveGain: number }[]>([]);
  const particleQuantizeSeenRef = useRef<number[]>([]);
  const particleQuantizeRafRef = useRef<number | null>(null);
  const particleQuantizeTimerRef = useRef<number | null>(null);
  const waveOvertoneArpQueueRef = useRef<Array<{
    dueTime: number;
    freq: number;
    amp: number;
    duration: number;
    waveform: OscillatorType;
    cutoff: number;
    q: number;
    prominence: number;
  }>>([]);
  const waveOvertoneArpTimerRef = useRef<number | null>(null);
  const [metronomePulse, setMetronomePulse] = useState(0);
  const metronomeTimeoutsRef = useRef<number[]>([]);
  const materialLoopCacheRef = useRef<Map<string, AudioBuffer>>(new Map());
  const materialLoopSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const materialLoopGainRef = useRef<GainNode | null>(null);
  const materialLoopTokenRef = useRef(0);
  const cycleQuantizeGrid = () => {
    quantizeAnchorRef.current = null;
    nexusRefs.current.nextAbsoluteStep = null;
    particleQuantizeQueueRef.current = [];
    particleQuantizeSeenRef.current = [];
    waveOvertoneArpQueueRef.current = [];
    if (particleQuantizeTimerRef.current !== null) {
      window.clearInterval(particleQuantizeTimerRef.current);
      particleQuantizeTimerRef.current = null;
    }
    setQuantizeGrid((prev) => (prev === 16 ? 32 : prev === 32 ? 64 : 16));
  };

  const [myzelEnabled, setMyzelEnabled] = useState(false);
  const [tParams, setTParams] = useState({ tension: 0.5, slimLayers: 0.8, rawReality: 0.3, intensityGlobal: 0.48 });
  const [myzelInterpreterMix, setMyzelInterpreterMix] = useState<MyzelInterpreterMix>(DEFAULT_MYZEL_INTERPRETER_MIX);
  const [myzelDriveEnabled, setMyzelDriveEnabled] = useState(true);
  const [resonanceActionBadges, setResonanceActionBadges] = useState({ octave: false, sustain: false, swell: false });
  const [keyboardWindowStamp, setKeyboardWindowStamp] = useState(0);
  const [cursorHudHz, setCursorHudHz] = useState(() => freqFromY(GAME_HEIGHT / 2));
  const cursorHudHzRef = useRef(freqFromY(GAME_HEIGHT / 2));
  const cursorHudLastUpdateRef = useRef(0);
  const [myzelPattern, setMyzelPattern] = useState<MyzelPattern>("breath");
  const [myzelPostFxGroup, setMyzelPostFxGroup] = useState<MyzelPostFxGroupId>("master");
  const [myzelPostFxDepth, setMyzelPostFxDepth] = useState(0.58);
  const [myzelPostFxParallel, setMyzelPostFxParallel] = useState(0.42);
  const [myzelPostFxEnabled, setMyzelPostFxEnabled] = useState(true);
  const [myzelFollowForgeHandoff, setMyzelFollowForgeHandoff] = useState(true);
  const [myzelPostFxMonitor, setMyzelPostFxMonitor] = useState<MyzelPostFxTelemetry | null>(null);
  const [myzelBallMode, setMyzelBallMode] = useState<MyzelBallMode>("scanner");
  const [myzelNodeMode, setMyzelNodeMode] = useState<MyzelNodeMode>("hybrid");
  const [myzelStep16ths, setMyzelStep16ths] = useState<number>(4);
  const [room3BodyEnabled, setRoom3BodyEnabled] = useState(true);
  const [room3BodyControls, setRoom3BodyControls] = useState<Room3BodyControls>(DEFAULT_ROOM3_BODY_CONTROLS);
  const room3BodyEnabledRef = useRef(true);
  const room3BodyControlsRef = useRef<Room3BodyControls>(DEFAULT_ROOM3_BODY_CONTROLS);
  const myzelInterpreterMixRef = useRef<MyzelInterpreterMix>(DEFAULT_MYZEL_INTERPRETER_MIX);
  const activeMyzelPostFxGroup = useMemo(() => MYZEL_POST_FX_GROUPS.find((entry) => entry.id === myzelPostFxGroup) ?? MYZEL_POST_FX_GROUPS[0], [myzelPostFxGroup]);
  const myzelPostFxRouterRef = useRef<MyzelPostFxRouter | null>(null);
  const myzelPostFxSendsRef = useRef<Record<MyzelPostFxSourceKey, GainNode | null>>({ particles: null, drone: null, waves: null, myzel: null, forge: null });
  const myzelPostFxConnectionsRef = useRef<{ drone: boolean; myzel: boolean }>({ drone: false, myzel: false });
  const myzelPrimedYRef = useRef<number | null>(null);
  const myzelPrimedSourceRef = useRef<"resonance" | "topology" | "wave" | "toggle" | "auto">("auto");
  const topologyCanvasRef = useRef<HTMLCanvasElement>(null);
  const topologyDragRef = useRef<{ nodeIndex: number | null; offsetX: number; offsetY: number }>({ nodeIndex: null, offsetX: 0, offsetY: 0 });
  const topologyRefs = useRef({
    nodes: [] as SemanticNode[],
    cursor: { x: 0, y: 0, vx: 0, vy: 0 },
    osc: null as OscillatorNode | null,
    filter: null as BiquadFilterNode | null,
    gain: null as GainNode | null,
    fmOsc: null as OscillatorNode | null,
    fmGain: null as GainNode | null,
  });
  const [systemState, setSystemState] = useState<string>("Fließendes Myzel");
  const myceliumSnapshotRef = useRef<MyceliumSnapshot>(createEmptyMyceliumSnapshot());
  const constellationStateRef = useRef({
    ratios: [1.25, 1.5, 1.875],
    tension: 0,
    brightness: 0.5,
    centroidX: 0.5,
    centroidY: 0.5,
    flux: 0,
  });
  const myceliumDroneAmountRef = useRef(0.35);
  const myceliumDroneModRef = useRef(deriveDroneMyceliumMod(createEmptyMyceliumSnapshot(), 0));
  const myzelLayerModRef = useRef(deriveMyzelLayerMod(createEmptyMyceliumSnapshot(), 0.48, 55, "scanner", "hybrid"));
  const myzelGateRef = useRef(0);
  const room3ModFieldRef = useRef<Room3ModField>(deriveRoom3ModField(createEmptyMyceliumSnapshot(), 0, DEFAULT_ROOM3_BODY_CONTROLS));
  const room3TimbreStateRef = useRef<Room3TimbreState>(deriveRoom3TimbreState(createEmptyMyceliumSnapshot(), room3ModFieldRef.current, DEFAULT_ROOM3_BODY_CONTROLS));
  const room3ModalStateRef = useRef<Room3ModalBodyState>(deriveRoom3ModalBody(createEmptyMyceliumSnapshot(), 110, room3TimbreStateRef.current, room3ModFieldRef.current));
  const room3BodyCurveRef = useRef({ pre: -1, post: -1 });
  const topologyLoopErrorRef = useRef<string | null>(null);
  const topologyLastStatusRef = useRef<string>("Fließendes Myzel");

  const toggleMyzelEnabled = () => {
    topologyLoopErrorRef.current = null;
    setSystemState("Fließendes Myzel");
    setMyzelEnabled((prev) => !prev);
  };

  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const keyRef = useRef({ left: false, right: false, shoot: false });
  const gameRefs = useRef({
    playerX: GAME_WIDTH / 2,
    playerY: GAME_HEIGHT - 60,
    playerRadius: 18,
    orb: { x: GAME_WIDTH / 2, y: 140, r: 34, vx: 140, vy: -60 } as Orb,
    anchors: [] as HiddenAnchor[],
    phaseA: 0,
    phaseB: 0,
    phaseC: 0,
    soundChaos: 0.618,
    melodicDrift: 0,
    activeAnchorRatio: 1,
    activeAnchorLabel: "Root",
    anchorDist: Number.POSITIVE_INFINITY,
    chaos: 0.63,
    shotCount: 0,
    lasers: [] as Bullet[],
    bolts: [] as Bullet[],
    hearts: [] as HeartPickup[],
    heartDropCooldown: 0,
    particles: [] as Particle[],
    score: 0,
    totalScore: 0,
    level: 1,
    levelUpTimer: 0,
    levelUpFrom: 1,
    levelUpTo: 1,
    hp: 6,
    hits: 0,
    elapsed: 0,
    enemyTimer: 0,
    laserTimer: 0,
    invuln: 0,
    over: false,
    won: false,
    commonsClock: 0,
    commonsStep: 0,
    commonsStepDur: 0.14,
  });
  const [gameActive, setGameActive] = useState(false);
  const [gameHud, setGameHud] = useState({
    score: 0,
    goal: 46,
    total: 0,
    hp: 6,
    phase: "Dormant",
    time: 0,
    level: 1,
    anchor: "Root",
    message: "Irrlicht wartet.",
  });

  const nexusCanvasRef = useRef<HTMLCanvasElement>(null);
  const nexusArrowRef = useRef({ left: false, right: false, up: false, down: false });
  const waveLaunchAtRef = useRef(0);
  const waveImpactDecayRef = useRef(1);
  const [impactDecayOn] = useState(false);
  const [activeOvertoneMixer, setActiveOvertoneMixer] = useState<"drone" | "waves">("drone");
  const [activeMetaPresetId, setActiveMetaPresetId] = useState<MetaPresetId | null>(null);
  const [sessionMetaOverrides, setSessionMetaOverrides] = useState<Partial<Record<MetaPresetId, {
    preset?: Partial<MetaPresetDefinition>;
    uiPatch?: Record<string, number | boolean | string>;
  }>>>({});
  const [mandalaPresetColorOverrides, setMandalaPresetColorOverrides] = useState<Partial<Record<MetaPresetId, string>>>({});
  const [mandalaRandomizingPresetId, setMandalaRandomizingPresetId] = useState<MetaPresetId | null>(null);
  const [roulettePreviewPresetId, setRoulettePreviewPresetId] = useState<MetaPresetId | null>(null);
  const [rouletteIsSpinning, setRouletteIsSpinning] = useState(false);
  const mouseEntropyRef = useRef(0x9e3779b9);
  const lastMouseEntropyStampRef = useRef(0);
  const mandalaSpinTokenRef = useRef(0);
  const rouletteSpinTokenRef = useRef(0);
  const keyboardMirrorRef = useRef(true);
  const waveSoundSwellHeldRef = useRef(false);
  const waveSoundSwellRef = useRef(0);
  const activeGridLineFreqRef = useRef<number | null>(null);
  const activeGridLineSinceRef = useRef(0);
  const previousGridLineFreqRef = useRef<number | null>(null);
  const previousGridLineAtRef = useRef(0);
  const waveStartOctaveHoldRef = useRef(false);
  const longToneHoldRef = useRef(false);
  const enterHoldRef = useRef(false);
  const transientRuntimeRef = useRef(createTransientRuntime({ softLimit: 52, hardLimit: 84, perSourceHard: { particle: 30, wave: 22, drum: 18, other: 14 } }));
  const rhythmForgeDrumPatternRef = useRef<GeneratedPattern | null>(null);
  const rhythmForgeBassPatternRef = useRef<GeneratedPattern | null>(null);
  const rhythmForgeDrumBarIndexRef = useRef(-1);
  const rhythmForgeBassBarIndexRef = useRef(-1);
  const rhythmForgeSeedRef = useRef(0x59a17);
  const psyBassPatternRef = useRef<PsyBassPattern | null>(null);
  const psyBassBarIndexRef = useRef(-1);
  const activeScheduledTonesRef = useRef<{ osc: OscillatorNode; gain: GainNode; filter: BiquadFilterNode; ticket: TransientVoiceHandle | null }[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioWarmupDoneRef = useRef(false);
  const audioWarmupPromiseRef = useRef<Promise<void> | null>(null);
  const keyboardWindowOffsetRef = useRef(0);
  const quantizeAnchorRef = useRef<number | null>(null);
  const activeGridDragStepRef = useRef<number | null>(null);
  const activeGridDragStartYRef = useRef<number | null>(null);
  const activeGridDragBaseOffsetRef = useRef<number>(0);
  const activeGridDragMovedRef = useRef(false);
  const finalMixAnalyserRef = useRef<AnalyserNode | null>(null);
  const finalMixProbeRef = useRef<DescriptorProbe | null>(null);
  const collectiveMemoryFramesRef = useRef<DescriptorFrame[]>([]);
  const collectiveMemoryWindowRef = useRef(8);
  const collectiveMemorySummaryRef = useRef<DescriptorSummary | null>(null);
  const collectiveFxRef = useRef<{ drone: CollectiveMemoryEffect | null; particles: CollectiveMemoryEffect | null; waves: CollectiveMemoryEffect | null; myzel: CollectiveMemoryEffect | null }>({
    drone: null,
    particles: null,
    waves: null,
    myzel: null,
  });
  const psychedelicSpiralRef = useRef<PsychedelicSpiralDevice | null>(null);
  const psychedelicSpiralSendsRef = useRef<{ drone: GainNode | null; particles: GainNode | null; waves: GainNode | null; myzel: GainNode | null }>({
    drone: null,
    particles: null,
    waves: null,
    myzel: null,
  });
  const transientDriveFxRef = useRef<TransientDriveDeviceRefs | null>(null);
  const enterHoldPsyFxRef = useRef<EnterHoldPsyFxDevice | null>(null);
  const transientDriveSendsRef = useRef<{ drone: GainNode | null; particles: GainNode | null; waves: GainNode | null; myzel: GainNode | null }>({
    drone: null,
    particles: null,
    waves: null,
    myzel: null,
  });
  const enterHoldPsyFxSendsRef = useRef<{ waves: GainNode | null; bass: GainNode | null }>({ waves: null, bass: null });
  const schwarmdeuterRef = useRef<Schwarmdeuter | null>(null);
  const schwarmdeuterSendsRef = useRef<{ drone: GainNode | null; particles: GainNode | null; waves: GainNode | null; myzel: GainNode | null }>({
    drone: null,
    particles: null,
    waves: null,
    myzel: null,
  });
  const nexusRefs = useRef({
    cursorX: GAME_WIDTH / 2,
    cursorY: GAME_HEIGHT / 2,
    wobble: 0,
    wobblePhase: 0,
    osc: null as OscillatorNode | null,
    oscB: null as OscillatorNode | null,
    filter: null as BiquadFilterNode | null,
    gain: null as GainNode | null,
    gainB: null as GainNode | null,
    lfo: null as OscillatorNode | null,
    lfoGain: null as GainNode | null,
    delayNode: null as DelayNode | null,
    delayFeedback: null as GainNode | null,
    droneGroupBus: null as GainNode | null,
    droneRhythmGain: null as GainNode | null,
    droneVolumeBus: null as GainNode | null,
    droneDriveRefs: null as DroneDriveInsertRefs | null,
    flangerDelay: null as DelayNode | null,
    flangerFeedback: null as GainNode | null,
    flangerLfo: null as OscillatorNode | null,
    flangerLfoGain: null as GainNode | null,
    flangerWet: null as GainNode | null,
    myceliumFormantFilter: null as BiquadFilterNode | null,
    myceliumFormantGain: null as GainNode | null,
    myzelCarrierOsc: null as OscillatorNode | null,
    myzelSubOsc: null as OscillatorNode | null,
    myzelCarrierGain: null as GainNode | null,
    myzelSubGain: null as GainNode | null,
    myzelBodyGain: null as GainNode | null,
    myzelMasterGain: null as GainNode | null,
    myzelPan: null as StereoPannerNode | null,
    myzelDriveGain: null as GainNode | null,
    myzelDriveShaper: null as WaveShaperNode | null,
    myzelLowpass: null as BiquadFilterNode | null,
    myzelFormantFilters: [] as BiquadFilterNode[],
    myzelFormantGains: [] as GainNode[],
    myzelOvertoneOscs: [] as OscillatorNode[],
    myzelOvertoneGains: [] as GainNode[],
    myzelConstellationFilter: null as BiquadFilterNode | null,
    myzelConstellationOscs: [] as OscillatorNode[],
    myzelConstellationGains: [] as GainNode[],
    room3BodyNoiseSource: null as AudioBufferSourceNode | null,
    room3BodyNoiseGain: null as GainNode | null,
    room3BodyPulseOsc: null as OscillatorNode | null,
    room3BodyPulseGain: null as GainNode | null,
    room3BodyExciterGain: null as GainNode | null,
    room3BodyPreDriveGain: null as GainNode | null,
    room3BodyPreDriveShaper: null as WaveShaperNode | null,
    room3BodyToneBus: null as GainNode | null,
    room3BodyHighpass: null as BiquadFilterNode | null,
    room3BodyLowpass: null as BiquadFilterNode | null,
    room3BodyPostDriveShaper: null as WaveShaperNode | null,
    room3BodyMaster: null as GainNode | null,
    room3BodyModeFilters: [] as BiquadFilterNode[],
    room3BodyModeGains: [] as GainNode[],
    overtoneMaster: null as GainNode | null,
    manualJiMaster: null as GainNode | null,
    manualJiOscs: {} as Record<string, OscillatorNode>,
    manualJiGains: {} as Record<string, GainNode>,
    jiOscs: {} as Record<string, OscillatorNode>,
    jiGains: {} as Record<string, GainNode>,
    ripples: [] as NexusRipple[],
    impactRipples: [] as AgentImpactRipple[],
    agents: [] as NexusAgent[],
    sectorPulses: [] as DirectedPulse[],
    directedPulses: [] as DirectedPulse[],
    nextAbsoluteStep: null as number | null,
    noiseBuffer: null as AudioBuffer | null,
  });
  const [nexusActive, setNexusActive] = useState(false);
  const focusCursorRef = useRef({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const focusCursorLastInputRef = useRef<"mouse" | "keyboard" | "arrow" | "grid" | "auto">("auto");
  const [resonanceInputIndicator, setResonanceInputIndicator] = useState(false);

  const [droneVolume, setDroneVolume] = useState(0);
  const [waveSoundEnabled, setWaveSoundEnabled] = useState(true);
  const [waveSoundVolume, setWaveSoundVolume] = useState(0.22);
  const resonanceInputActive = room === "RESONANCE" && nexusActive;
  const isForgeHotkeyTarget = (target: EventTarget | null) => isTargetWithinHotkeyScope(target, "forge");
  const isWheelScrollAllowedTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el || typeof el.closest !== "function") return false;
    return !!el.closest('[data-wheel-allow-scroll="true"], .overflow-y-auto, .overflow-auto, .overflow-y-scroll, .overflow-scroll');
  };
  const gameInputActive = room === "GAME";
  const scrollbarInsetPx = 18;

  const primeMyzelFromY = (y: number, source: "resonance" | "topology" | "wave" | "toggle" | "auto" = "auto") => {
    if (!Number.isFinite(y)) return;
    myzelPrimedYRef.current = clamp(y, 0, GAME_HEIGHT);
    myzelPrimedSourceRef.current = source;
  };

  const syncCursorHudFromY = (y: number) => {
    const clampedY = clamp(y, 0, GAME_HEIGHT);
    const nextHz = freqFromY(clampedY);
    const prevHz = cursorHudHzRef.current;
    cursorHudHzRef.current = nextHz;
    const now = performance.now();
    if (now - cursorHudLastUpdateRef.current > 48 || Math.abs(nextHz - prevHz) > 0.6) {
      cursorHudLastUpdateRef.current = now;
      setCursorHudHz(nextHz);
    }
  };

  const updateFocusCursor = (rawX: number, rawY: number, source: "mouse" | "keyboard" | "arrow" | "grid" | "auto" = "mouse") => {
    focusCursorRef.current = {
      x: clamp(rawX, 0, GAME_WIDTH),
      y: clamp(rawY, 0, GAME_HEIGHT),
    };
    focusCursorLastInputRef.current = source;
    return focusCursorRef.current;
  };

  const resolveResonanceCursorY = (
    rawY: number,
    params: typeof nexusParamsRef.current = nexusParamsRef.current,
  ) => {
    const clampedY = clamp(rawY, 0, GAME_HEIGHT);
    return params.lockCursorToGrid
      ? snapYToGrid(
          clampedY,
          params.gridBase,
          params.gridTuning,
          params.manualGridMutedSteps,
          params.manualGridStepOffsets,
        )
      : clampedY;
  };

  const commitResonanceCursorY = (
    rawY: number,
    options: {
      syncHud?: boolean;
      previewWave?: boolean;
      refreshKeyboardWindow?: boolean;
      primeSource?: "resonance" | "topology" | "wave" | "toggle" | "auto";
    } = {},
  ) => {
    const nextY = resolveResonanceCursorY(rawY);
    nexusRefs.current.cursorY = nextY;
    if (options.syncHud !== false) {
      syncCursorHudFromY(nextY);
    }
    if (options.refreshKeyboardWindow) {
      setKeyboardWindowStamp((prev) => prev + 1);
    }
    if (options.primeSource && myzelEnabled && nexusParamsRef.current.bassRootMode === "auto") {
      primeMyzelFromY(nextY, options.primeSource);
    }
    if (options.previewWave) {
      playWaveStartSound(freqFromY(nextY), false);
    }
    return nextY;
  };

  const previewKeyboardWindowShift = (direction: 1 | -1) => {
    const params = nexusParamsRef.current;
    keyboardWindowOffsetRef.current = shiftKeyboardWindowOffset(
      params.gridBase,
      params.gridTuning,
      keyboardWindowOffsetRef.current,
      direction,
      params.manualGridMutedSteps,
      params.manualGridStepOffsets,
    );
    const preview = keyboardWindowFrequency(
      params.gridBase,
      params.gridTuning,
      keyboardWindowOffsetRef.current,
      0,
      params.manualGridMutedSteps,
      params.manualGridStepOffsets,
    );
    setKeyboardWindowStamp((prev) => prev + 1);
    if (preview !== null) {
      commitResonanceCursorY(yFromFreq(preview), { previewWave: true });
    }
    return preview;
  };

  const triggerKeyboardWindowPitch = (pitchIdx: number) => {
    const params = nexusParamsRef.current;
    const freq = keyboardWindowFrequency(
      params.gridBase,
      params.gridTuning,
      keyboardWindowOffsetRef.current,
      pitchIdx,
      params.manualGridMutedSteps,
      params.manualGridStepOffsets,
    );
    if (freq !== null) {
      commitResonanceCursorY(yFromFreq(freq), { previewWave: true });
    }
    return freq;
  };

  const markWaveLaunch = () => {
    waveLaunchAtRef.current = getAudioNowSec(audioCtx);
    waveImpactDecayRef.current = 1;
  };

  const applyGameKeyState = (event: KeyboardEvent, isDown: boolean) => {
    const normalizedKey = event.key.toLowerCase();
    if (event.key === "ArrowLeft" || normalizedKey === "a") keyRef.current.left = isDown;
    if (event.key === "ArrowRight" || normalizedKey === "d") keyRef.current.right = isDown;
    if (event.code === "Space") {
      keyRef.current.shoot = isDown;
      if (isDown) event.preventDefault();
    }
  };

  const shouldCaptureResonanceKey = (event: KeyboardEvent) => (
    event.code === "Space"
    || event.code === "Backspace"
    || event.code === "Backquote"
    || event.code === "F9"
    || event.key === "Enter"
    || isResonanceWaveTriggerKey(event.key)
    || (event.code === "Tab" && nexusParamsRef.current.quantizeOn)
  );

  const refreshResonanceInputIndicator = () => {
    setResonanceInputIndicator(isEditableTarget(document.activeElement));
  };

  const getInterpreterMyzelBaseHz = () => resolveInterpreterMyzelBaseHz(
    myzelPrimedYRef.current,
    nexusRefs.current.cursorY,
    myceliumSnapshotRef.current,
    freqFromY,
    DRONE_MIN_FREQ,
    DRONE_MAX_FREQ,
    myzelInterpreterMix.hybridBlend,
  );

  const [waveSoundPreset, setWaveSoundPreset] = useState<WaveSoundPreset>("tape_halo");
  const [selectedWaveOvertonePreset, setSelectedWaveOvertonePreset] = useState<WaveOvertoneMixPresetId>("bright_ladder");
  const waveSoundRuntimeRef = useRef({
    enabled: true,
    volume: 0.22,
    preset: "tape_halo" as WaveSoundPreset,
  });
  const recordingDestinationWithDrumsRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recordingDestinationWithoutDrumsRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartAtRef = useRef<number | null>(null);
  const recordingStopTimerRef = useRef<number | null>(null);
  const recordedBufferRef = useRef<AudioBuffer | null>(null);
  const recordingPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingPreviewUrlRef = useRef<string | null>(null);
  const recordingMarkersRef = useRef<RecordingMarker[]>([]);
  const recordingTimelineRef = useRef<HTMLDivElement | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    durationMs: 0,
    hasTake: false,
    filenameBase: "xensonar-take",
    exportStatus: "idle",
    exportMessage: "",
  });
  const [recordingMarkers, setRecordingMarkers] = useState<RecordingMarker[]>([]);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(null);
  const [recordingPlayheadMs, setRecordingPlayheadMs] = useState(0);
  const [recordingCrop, setRecordingCrop] = useState<RecordingCropRange | null>(null);
  const [recordingCropDraft, setRecordingCropDraft] = useState<RecordingCropRange | null>(null);
  const [recordingSourceMode, setRecordingSourceMode] = useState<RecordingSourceMode>("with_drums");
  const lastRecordingSourceModeRef = useRef<RecordingSourceMode>("with_drums");
  const [logoMarkerPulses, setLogoMarkerPulses] = useState<{ id: string }[]>([]);
  const [sideMarkerPulses, setSideMarkerPulses] = useState<Array<{ id: string; side: "left" | "right" }>>([]);

  useEffect(() => {
    waveSoundRuntimeRef.current = {
      enabled: waveSoundEnabled,
      volume: waveSoundVolume,
      preset: waveSoundPreset,
    };
  }, [waveSoundEnabled, waveSoundVolume, waveSoundPreset]);

  useEffect(() => {
    room3BodyEnabledRef.current = room3BodyEnabled;
  }, [room3BodyEnabled]);

  useEffect(() => {
    room3BodyControlsRef.current = room3BodyControls;
  }, [room3BodyControls]);

  useEffect(() => {
    myzelInterpreterMixRef.current = myzelInterpreterMix;
  }, [myzelInterpreterMix]);

  useEffect(() => {
    recordingMarkersRef.current = recordingMarkers;
  }, [recordingMarkers]);

  useEffect(() => {
    return () => {
      if (recordingPreviewUrlRef.current) {
        URL.revokeObjectURL(recordingPreviewUrlRef.current);
        recordingPreviewUrlRef.current = null;
      }
    };
  }, []);

  const timelineDurationMs = () => {
    if (recordedBufferRef.current) return Math.round(recordedBufferRef.current.duration * 1000);
    return recordingState.durationMs;
  };

  const timelineRatioFromClientX = (clientX: number) => {
    const el = recordingTimelineRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  };

  const updateRecordingPreviewUrl = (blob: Blob | null) => {
    if (recordingPreviewUrlRef.current) {
      URL.revokeObjectURL(recordingPreviewUrlRef.current);
      recordingPreviewUrlRef.current = null;
    }
    if (!blob) {
      setRecordingPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(blob);
    recordingPreviewUrlRef.current = nextUrl;
    setRecordingPreviewUrl(nextUrl);
  };

  const markRecordingMarkersUsedInRange = (range: RecordingCropRange) => {
    setRecordingMarkers((prev) => {
      const next = prev.map((marker) => (marker.timeMs >= range.startMs && marker.timeMs <= range.endMs ? { ...marker, usedInCrop: true } : marker));
      recordingMarkersRef.current = next;
      return next;
    });
  };

  const downloadBufferRangeWav = (range: RecordingCropRange | null = null) => {
    const debugSteps: string[] = [];
    const buffer = recordedBufferRef.current;
    if (!buffer) {
      debugSteps.push("export:missing-buffer");
      console.error("[xensonar] wav export failed", { debugSteps });
      setRecordingState((prev) => ({ ...prev, exportStatus: "error", exportMessage: "Keine Aufnahme verfuegbar." }));
      return;
    }

    try {
      const isCrop = !!range;
      setRecordingState((prev) => ({ ...prev, exportStatus: "encoding", exportMessage: isCrop ? "Crop wird vorbereitet..." : "WAV wird vorbereitet..." }));
      debugSteps.push(`export:buffer duration=${buffer.duration.toFixed(3)} channels=${buffer.numberOfChannels} sampleRate=${buffer.sampleRate}`);

      let left = buffer.getChannelData(0);
      let right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0);
      let effectiveDurationMs = Math.round(buffer.duration * 1000);
      if (range) {
        const sliced = getBufferRange(buffer, range.startMs, range.endMs);
        left = sliced.left;
        right = sliced.right;
        effectiveDurationMs = sliced.durationMs;
        debugSteps.push(`export:crop start=${range.startMs} end=${range.endMs} duration=${effectiveDurationMs}`);
      }

      const wavBlob = encodeWavBlob(left, right, buffer.sampleRate);
      debugSteps.push(`export:wavBlob type=${wavBlob.type} size=${wavBlob.size}`);
      if (!wavBlob.size) throw new Error("WAV-Blob ist leer.");

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      const baseName = recordingState.filenameBase || "xensonar-take";
      const takeSuffix = lastRecordingSourceModeRef.current === "without_drums" ? "-no-drums" : "-with-drums";
      const suffix = range
        ? `-crop-${formatDuration(range.startMs).replace(":", "-")}_to_${formatDuration(range.endMs).replace(":", "-")}`
        : `-${formatDuration(effectiveDurationMs).replace(":", "-")}`;
      const filename = `${baseName}${takeSuffix}${suffix}.wav`;
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.position = "fixed";
      a.style.left = "-9999px";
      document.body.appendChild(a);
      a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      window.setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 4000);

      if (range) markRecordingMarkersUsedInRange(range);

      setRecordingState((prev) => ({
        ...prev,
        exportStatus: "ready",
        exportMessage: `${range ? "Crop" : "WAV"}-Download angestoßen (${(wavBlob.size / 1024 / 1024).toFixed(2)} MB).`,
      }));
    } catch (error) {
      console.error("[xensonar] wav export failed", { error, debugSteps });
      const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
      setRecordingState((prev) => ({ ...prev, exportStatus: "error", exportMessage: `WAV-Export fehlgeschlagen: ${msg}` }));
    }
  };

  const handleTimelinePointerDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!recordingState.hasTake) return;
    const durationMs = timelineDurationMs();
    if (!durationMs) return;
    const startRatio = timelineRatioFromClientX(event.clientX);
    const startMs = Math.round(startRatio * durationMs);
    let latestRatio = startRatio;
    let dragging = false;
    setRecordingCropDraft({ startMs, endMs: startMs });

    const handleMove = (moveEvent: MouseEvent) => {
      latestRatio = timelineRatioFromClientX(moveEvent.clientX);
      const nextStart = Math.round(Math.min(startRatio, latestRatio) * durationMs);
      const nextEnd = Math.round(Math.max(startRatio, latestRatio) * durationMs);
      dragging = dragging || Math.abs(latestRatio - startRatio) > 0.003;
      setRecordingCropDraft({ startMs: nextStart, endMs: nextEnd });
    };

    const handleUp = (upEvent: MouseEvent) => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      latestRatio = timelineRatioFromClientX(upEvent.clientX);
      const nextStart = Math.round(Math.min(startRatio, latestRatio) * durationMs);
      const nextEnd = Math.round(Math.max(startRatio, latestRatio) * durationMs);
      const cropDuration = Math.abs(nextEnd - nextStart);
      setRecordingCropDraft(null);

      if (!dragging || cropDuration < 180) {
        setRecordingCrop(null);
        if (recordingPreviewAudioRef.current) {
          recordingPreviewAudioRef.current.currentTime = clamp(Math.round(latestRatio * durationMs), 0, durationMs) / 1000;
        }
        return;
      }

      setRecordingCrop({ startMs: nextStart, endMs: nextEnd });
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  const getWaveTransientDemand = (preset: WaveSoundPreset) => {
    switch (preset) {
      case "vibrato_glass":
      case "tape_halo":
      case "spark_chime":
      case "bowed_glass":
        return 3;
      case "bell_tone":
      case "deep_sub":
      case "membrane_thump":
      case "reed_sigh":
        return 2;
      default:
        return 1;
    }
  };

  const getParticleTransientDemand = (preset: ParticlePreset) => {
    switch (preset) {
      case "fm_bell":
      case "steel_pan":
      case "velvet_bloom":
      case "shimmer_pad":
      case "dust_chime":
      case "granular_spark":
        return 3;
      case "glass_ping":
      case "marimba":
      case "pizzicato":
      case "crystal_bowl":
      case "rubber_click":
      case "reed_pop":
      case "woodblock":
        return 2;
      default:
        return 1;
    }
  };

  const playWaveStartSound = (baseFreq: number, isSector: boolean = false) => {
    primeMyzelFromY(nexusRefs.current.cursorY, "wave");
    const ctx = audioCtxRef.current ?? audioCtx;
    if (!ctx) return;
    const runtime = waveSoundRuntimeRef.current;
    if (!runtime.enabled) return;

    const waveGradient = computeWaveTimbreGradientState(
      nexusRefs.current.cursorX,
      nexusParamsRef.current.waveTimbreGradientEnabled,
      nexusParamsRef.current.waveTimbreGradientX,
    );

    const octaveScalar = waveStartOctaveHoldRef.current ? 2 : 1;
    const rootFreq = (baseFreq / 2) * octaveScalar;
    const freq = isSector ? rootFreq * 1.5 : rootFreq;
    const swellScalar = 1 + waveSoundSwellRef.current * 2.35;
    const waveVolumeGradientMul = computeWaveVolumeGradientMultiplier(
      nexusRefs.current.cursorX,
      nexusParamsRef.current.waveVolumeGradientEnabled,
      nexusParamsRef.current.waveVolumeGradientX,
    );
    const vol = runtime.volume * swellScalar * waveVolumeGradientMul;
    ensureCollectiveMemoryFx(ctx);
    ensurePsychedelicSpiralDevice(ctx);
    ensureTransientDriveDevice(ctx);
    ensureEnterHoldPsyFxDevice(ctx);
    ensureSchwarmdeuterDevice(ctx);
    ensureMyzelPostFxRouter(ctx);
    const waveTargets = [
      transientDriveSendsRef.current.waves,
      psychedelicSpiralSendsRef.current.waves,
      collectiveFxRef.current.waves?.input,
      enterHoldPsyFxEnabled && enterHoldRef.current ? enterHoldPsyFxSendsRef.current.waves : null,
      schwarmdeuterSendsRef.current.waves,
      myzelPostFxSendsRef.current.waves,
    ];
    const requestedVoices = getWaveTransientDemand(runtime.preset) + (nexusParamsRef.current.waveOvertonesEnabled ? 2 : 0);
    const wavePlan = beginTransientEvent("wave", requestedVoices, vol * (isSector ? 1.25 : 1));
    const bodyVoiceBudget = wavePlan.bodyScale >= 0.84 ? 4 : wavePlan.bodyScale >= 0.56 ? 2 : 1;
    const waveToneOptions = (prominence: number) => ({ source: "wave" as const, plan: wavePlan, prominence });

    triggerRoom3BodyExciter(getWaveBodyExciterProfile(runtime.preset), freq, vol * (isSector ? 2.4 : 1.9), {
      voiceBudget: bodyVoiceBudget,
      bodyScale: wavePlan.bodyScale * (waveGradient.amount > 0.1 ? 0.9 : 1),
    });

    const playWaveGradientTone = (
      toneFreq: number,
      delay: number,
      duration: number,
      waveform: OscillatorType,
      gain: number,
      resonance: number,
      cutoffHz: number,
      prominence: number,
    ) => {
      const gradientDuration = Math.max(0.04, duration * waveGradient.durationMul);
      const shapedVolume = gain * waveGradient.coreVolumeMul;
      const shapedResonance = Math.max(0.6, resonance + waveGradient.coreResonanceAdd);
      const shapedCutoff = clamp(cutoffHz * waveGradient.coreCutoffMul + waveGradient.coreCutoffAdd, 260, 7600);

      if (waveGradient.amount <= 0.018) {
        return playScheduledTone(
          toneFreq,
          delay,
          gradientDuration,
          waveform,
          shapedVolume,
          shapedResonance,
          shapedCutoff,
          waveTargets,
          waveToneOptions(prominence),
        );
      }

      const ctx = audioCtxRef.current ?? audioCtx;
      if (!ctx) return false;
      const activeCount = activeScheduledTonesRef.current.length;
      const mainOutput = ensureFinalMixBus(ctx);
      const now = ctx.currentTime + delay;
      const heldLong = longToneHoldRef.current;
      let ticket: TransientVoiceHandle | null = null;
      let overloadSoftening = 1;
      let gainScale = 1;
      let auxTargets: Array<AudioNode | null | undefined> = [...waveTargets];

      if (wavePlan) {
        ticket = transientRuntimeRef.current.admitVoice(wavePlan, prominence);
        if (!ticket) return false;
        overloadSoftening = ticket.plan.envelopeScale;
        gainScale = ticket.plan.gainScale;
        auxTargets = transientRuntimeRef.current.pickTargets(auxTargets, ticket) as Array<AudioNode | null | undefined>;
      } else {
        const fallbackLoad = activeCount >= 72 ? 1.35 : 1;
        overloadSoftening = fallbackLoad;
        if (activeCount >= 120) return false;
        if (activeCount >= 92) auxTargets = auxTargets.slice(0, 1);
        else if (activeCount >= 72) auxTargets = auxTargets.slice(0, 2);
      }

      const actualDur = heldLong ? gradientDuration * 6 : gradientDuration;
      const coreAttack = Math.min(0.0036, Math.max(0.001, actualDur * 0.024 * Math.min(overloadSoftening, 1.22)));
      const corePeakAt = now + coreAttack;
      const colorDelay = waveGradient.colorDelay + (activeCount >= 80 ? 0.0008 : 0);
      const colorPeakAt = now + colorDelay + waveGradient.colorAttack;
      const dryDuckAt = Math.min(now + Math.min(0.016, actualDur * 0.16), now + actualDur * 0.42);
      const stopAt = now + actualDur + 0.08;
      const noteTilt = Math.pow(clamp(toneFreq / 220, 0.5, 4), 0.08);
      const jawariStart = clamp(waveGradient.jawariFreqStart * noteTilt, 620, 3600);
      const jawariEnd = clamp(waveGradient.jawariFreqEnd * noteTilt, 780, 4600);
      const vowel1Start = clamp(waveGradient.vowel1Start * noteTilt, 360, 2300);
      const vowel1End = clamp(waveGradient.vowel1End * noteTilt, 480, 3100);
      const vowel2Start = clamp(waveGradient.vowel2Start * noteTilt, 1200, 5200);
      const vowel2End = clamp(waveGradient.vowel2End * noteTilt, 1600, 7200);
      const shineHpStart = clamp(waveGradient.shineHighpassStart * noteTilt, 1300, 6200);
      const shineHpEnd = clamp(waveGradient.shineHighpassEnd * noteTilt, 2000, 9200);
      const masterLevel = Math.max(0.0002, shapedVolume * gainScale);
      const coreLevel = masterLevel * lerp(0.98, 0.78, waveGradient.amount);
      const colorLevel = masterLevel * waveGradient.colorMix / Math.max(1, overloadSoftening * 0.9);

      const osc = ctx.createOscillator();
      const dryFilter = ctx.createBiquadFilter();
      const dryMaster = ctx.createGain();
      const colorExciterInput = ctx.createGain();
      const colorExciter = ctx.createWaveShaper();
      const jawariShaper = ctx.createWaveShaper();
      const jawariBand = ctx.createBiquadFilter();
      const jawariGainNode = ctx.createGain();
      const vowel1 = ctx.createBiquadFilter();
      const vowel1GainNode = ctx.createGain();
      const vowel2 = ctx.createBiquadFilter();
      const vowel2GainNode = ctx.createGain();
      const shineHighpass = ctx.createBiquadFilter();
      const shineGainNode = ctx.createGain();
      const colorBus = ctx.createGain();
      const colorMaster = ctx.createGain();
      const sum = ctx.createGain();
      const finalOut = ctx.createGain();

      osc.type = waveform;
      osc.frequency.value = toneFreq;

      dryFilter.type = "lowpass";
      dryFilter.frequency.setValueAtTime(shapedCutoff, now);
      dryFilter.frequency.exponentialRampToValueAtTime(Math.max(280, shapedCutoff * (0.88 + waveGradient.shine * 0.05)), now + actualDur);
      dryFilter.Q.setValueAtTime(shapedResonance, now);
      dryMaster.gain.setValueAtTime(0.0001, now);
      dryMaster.gain.linearRampToValueAtTime(coreLevel, corePeakAt);
      dryMaster.gain.exponentialRampToValueAtTime(Math.max(0.0001, coreLevel * waveGradient.dryLateMul), dryDuckAt);
      dryMaster.gain.exponentialRampToValueAtTime(0.0001, now + actualDur);

      colorExciterInput.gain.setValueAtTime(waveGradient.exciterPreGain, now);
      colorExciter.curve = makeDriveCurve(waveGradient.exciterDrive);
      jawariShaper.curve = makeDriveCurve(waveGradient.jawariDrive);
      jawariBand.type = "bandpass";
      jawariBand.frequency.setValueAtTime(jawariStart, now);
      jawariBand.frequency.exponentialRampToValueAtTime(Math.max(jawariStart * 1.02, lerp(jawariStart, jawariEnd, 0.58)), colorPeakAt);
      jawariBand.frequency.exponentialRampToValueAtTime(jawariEnd, now + actualDur);
      jawariBand.Q.setValueAtTime(waveGradient.jawariQ, now);
      jawariGainNode.gain.setValueAtTime(waveGradient.jawariGain, now);

      vowel1.type = "bandpass";
      vowel1.frequency.setValueAtTime(vowel1Start, now);
      vowel1.frequency.exponentialRampToValueAtTime(Math.max(vowel1Start * 1.02, lerp(vowel1Start, vowel1End, 0.52)), colorPeakAt);
      vowel1.frequency.exponentialRampToValueAtTime(vowel1End, now + actualDur);
      vowel1.Q.setValueAtTime(waveGradient.vowel1Q, now);
      vowel1GainNode.gain.setValueAtTime(waveGradient.vowel1Gain, now);

      vowel2.type = "bandpass";
      vowel2.frequency.setValueAtTime(vowel2Start, now);
      vowel2.frequency.exponentialRampToValueAtTime(Math.max(vowel2Start * 1.03, lerp(vowel2Start, vowel2End, 0.62)), colorPeakAt);
      vowel2.frequency.exponentialRampToValueAtTime(vowel2End, now + actualDur);
      vowel2.Q.setValueAtTime(waveGradient.vowel2Q, now);
      vowel2GainNode.gain.setValueAtTime(waveGradient.vowel2Gain, now);

      shineHighpass.type = "highpass";
      shineHighpass.frequency.setValueAtTime(shineHpStart, now);
      shineHighpass.frequency.exponentialRampToValueAtTime(shineHpEnd, now + actualDur);
      shineGainNode.gain.setValueAtTime(waveGradient.shineGain, now);

      colorBus.gain.setValueAtTime(1, now);
      colorMaster.gain.setValueAtTime(0.0001, now);
      colorMaster.gain.setValueAtTime(0.0001, now + colorDelay);
      colorMaster.gain.linearRampToValueAtTime(colorLevel, colorPeakAt);
      colorMaster.gain.exponentialRampToValueAtTime(Math.max(0.0001, colorLevel * 0.46), now + Math.min(actualDur * 0.52, 0.19));
      colorMaster.gain.exponentialRampToValueAtTime(0.0001, now + actualDur);

      finalOut.gain.setValueAtTime(0.92, now);

      osc.connect(dryFilter);
      dryFilter.connect(dryMaster);
      dryMaster.connect(sum);

      osc.connect(colorExciterInput);
      colorExciterInput.connect(colorExciter);

      colorExciter.connect(jawariShaper);
      jawariShaper.connect(jawariBand);
      jawariBand.connect(jawariGainNode);
      jawariGainNode.connect(colorBus);

      colorExciter.connect(vowel1);
      vowel1.connect(vowel1GainNode);
      vowel1GainNode.connect(colorBus);

      colorExciter.connect(vowel2);
      vowel2.connect(vowel2GainNode);
      vowel2GainNode.connect(colorBus);

      colorExciter.connect(shineHighpass);
      shineHighpass.connect(shineGainNode);
      shineGainNode.connect(colorBus);

      colorBus.connect(colorMaster);
      colorMaster.connect(sum);

      sum.connect(finalOut);
      finalOut.connect(mainOutput);
      auxTargets.forEach((target) => {
        if (target && target !== mainOutput) finalOut.connect(target);
      });

      const activeTone = { osc, gain: finalOut, filter: dryFilter, ticket };
      activeScheduledTonesRef.current.push(activeTone);
      const cleanup = () => {
        activeScheduledTonesRef.current = activeScheduledTonesRef.current.filter((entry) => entry !== activeTone);
        transientRuntimeRef.current.releaseVoice(ticket);
        [
          osc,
          dryFilter,
          dryMaster,
          colorExciterInput,
          colorExciter,
          jawariShaper,
          jawariBand,
          jawariGainNode,
          vowel1,
          vowel1GainNode,
          vowel2,
          vowel2GainNode,
          shineHighpass,
          shineGainNode,
          colorBus,
          colorMaster,
          sum,
          finalOut,
        ].forEach((node) => {
          try { node.disconnect(); } catch {}
        });
      };
      osc.onended = cleanup;
      osc.start(now);
      osc.stop(stopAt);
      return true;
    };

    if (runtime.preset === "glass_ping") {
      playWaveGradientTone(freq, 0, 0.4, "triangle", vol, 2, 1800, 1);
    } else if (runtime.preset === "soft_pluck") {
      playWaveGradientTone(freq, 0, 0.3, "sine", vol, 1, 1200, 1);
    } else if (runtime.preset === "bell_tone") {
      playWaveGradientTone(freq, 0, 0.5, "sine", vol * 0.8, 1, 2400, 1);
      playWaveGradientTone(freq * 2, 0.02, 0.3, "triangle", vol * 0.4, 1, 2400, 0.56);
    } else if (runtime.preset === "clean_pluck") {
      playWaveGradientTone(freq, 0, 0.25, "sawtooth", vol * 0.7, 3, 800, 1);
    } else if (runtime.preset === "deep_sub") {
      playWaveGradientTone(freq * 0.5, 0, 0.55, "sine", vol * 0.9, 1.4, 620, 1);
      playWaveGradientTone(freq * 0.75, 0.03, 0.45, "triangle", vol * 0.35, 1.2, 900, 0.6);
    } else if (runtime.preset === "vibrato_glass") {
      playWaveGradientTone(freq, 0, 0.52, "triangle", vol * 0.78, 1.8, 2100, 1);
      playWaveGradientTone(freq * 2.01, 0.018, 0.46, "sine", vol * 0.34, 1.1, 2600, 0.52);
      playWaveGradientTone(freq * 0.998, 0.028, 0.62, "sine", vol * 0.22, 1.0, 1700, 0.34);
    } else if (runtime.preset === "tape_halo") {
      playWaveGradientTone(freq, 0, 0.7, "triangle", vol * 0.72, 1.6, 1400, 1);
      playWaveGradientTone(freq * 1.5, 0.03, 0.56, "sine", vol * 0.32, 1.0, 1800, 0.54);
      playWaveGradientTone(freq * 0.5, 0.05, 0.64, "sine", vol * 0.24, 0.9, 900, 0.3);
    } else if (runtime.preset === "membrane_thump") {
      playWaveGradientTone(freq * 0.5, 0, 0.24, "triangle", vol * 0.95, 1.2, 520, 1);
      playWaveGradientTone(freq * 0.98, 0.01, 0.16, "sine", vol * 0.24, 1, 760, 0.42);
    } else if (runtime.preset === "reed_sigh") {
      playWaveGradientTone(freq, 0, 0.28, "square", vol * 0.7, 2.4, 1200, 1);
      playWaveGradientTone(freq * 1.5, 0.018, 0.32, "triangle", vol * 0.24, 2.8, 1700, 0.46);
    } else if (runtime.preset === "spark_chime") {
      playWaveGradientTone(freq, 0, 0.18, "sine", vol * 0.72, 3.6, 3000, 1);
      playWaveGradientTone(freq * 2.48, 0.01, 0.12, "triangle", vol * 0.22, 2.2, 4200, 0.34);
      playWaveGradientTone(freq * 3.72, 0.016, 0.1, "sine", vol * 0.12, 1.6, 5200, 0.18);
    } else if (runtime.preset === "bowed_glass") {
      playWaveGradientTone(freq, 0, 0.82, "triangle", vol * 0.66, 1.8, 2000, 1);
      playWaveGradientTone(freq * 2.01, 0.06, 0.74, "sine", vol * 0.24, 1.1, 2800, 0.42);
      playWaveGradientTone(freq * 0.5, 0.03, 0.64, "sine", vol * 0.14, 0.9, 1200, 0.24);
    }


    if (nexusParamsRef.current.waveOvertonesEnabled) {
      const waveform = nexusParamsRef.current.waveOvertoneWaveform;
      const overtoneMode = nexusParamsRef.current.waveOvertoneMode;
      const activeMix = DRONE_JI_OVERTONES
        .map((node) => ({ node, amount: clamp(nexusParamsRef.current.waveOvertones[node.label] ?? 0, 0, 1) }))
        .filter((entry) => entry.amount > 0.001);
      const strongestFirst = [...activeMix].sort((a, b) => b.amount - a.amount || a.node.ratio - b.node.ratio);
      if (overtoneMode === "direct" || overtoneMode === "hybrid") {
        const directMix = overtoneMode === "hybrid" ? strongestFirst.slice(0, 2) : strongestFirst;
        const normalizer = directMix.length > 0 ? 1 / Math.sqrt(directMix.length) : 1;
        const directScalar = overtoneMode === "hybrid" ? 0.46 : 1;
        const overtoneGlobalLevel = clamp(nexusParamsRef.current.waveOvertoneGlobalLevel ?? 1, 0, 2.5);
        for (const { node, amount } of directMix) {
          playWaveGradientTone(
            freq * node.ratio,
            0,
            isSector ? 0.46 : 0.38,
            waveform,
            vol * amount * 0.34 * normalizer * directScalar * overtoneGlobalLevel,
            1.6,
            2200,
            0.18 + amount * 0.42,
          );
        }
      }
      enqueueWaveOvertoneArp(freq, vol, activeMix, isSector);
    }

    const swellBlend = waveSoundSwellRef.current;
    if (swellBlend > 0.02) {
      const reinforcementFreq = freq * 2;
      const reinforcementWave: OscillatorType = runtime.preset === "clean_pluck" || runtime.preset === "reed_sigh"
        ? "triangle"
        : runtime.preset === "spark_chime" || runtime.preset === "vibrato_glass"
          ? "triangle"
          : "sine";
      playWaveGradientTone(
        reinforcementFreq,
        0,
        0.2 + swellBlend * 0.14,
        reinforcementWave,
        runtime.volume * (0.12 + swellBlend * 0.3) * (isSector ? 1.08 : 1),
        1.2 + swellBlend * 1.1,
        1600 + swellBlend * 1800,
        0.44 + swellBlend * 0.18,
      );
    }
  };
  const initialOvertonesByPreset = useRef(cloneOvertoneMixByPreset(DEFAULT_OVERTONE_BY_PRESET));

  const nexusParamsRef = useRef({
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
    drumActive: true,
    drumPattern: "broken_lilt" as DrumPattern,
    drumKit: "dusty_tape" as DrumKit,
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
    bassVolume: 0.1,
    bassTone: 0.48,
    bassGrit: 0.18,
    bassRootMode: "auto" as "auto" | "fixed",
    bassRootHz: 55,
    dronePreset: "fjord_tape" as DronePreset,
    particlePreset: "dust_chime" as ParticlePreset,
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
    particleVolume: 0.165,
    particleMute: false,
    quantizeOn: false,
    quantizeBpm: 108,
    materialLoopActive: false,
    materialLoopSyncToBeat: true,
    materialLoopId: "",
    materialLoopVolume: 0.22,
    materialLoopTimeMode: "normal" as "normal" | "double" | "half",
    agentEnabled: defaultAgentEnabled("ji", "ionian"),
    agentVolumes: getParticleNodes("ji").map(() => 1),
    droneJIOvertones: { ...initialOvertonesByPreset.current.fjord_tape },
    droneJIOvertonesByPreset: cloneOvertoneMixByPreset(initialOvertonesByPreset.current),
  });

  const [nParamsUI, setNParamsUI] = useState(nexusParamsRef.current);

  const [materialLibraryState, setMaterialLibraryState] = useState(() => getMaterialLibraryState());
  useEffect(() => {
    const unsubscribe = subscribeMaterialLibrary(() => setMaterialLibraryState(getMaterialLibraryState()));
    return () => { unsubscribe(); };
  }, []);
  const exportedLoopMaterials = useMemo(
    () => materialLibraryState.entries.filter((entry) => entry.role === "loop"),
    [materialLibraryState.entries]
  );
  const selectedLoopMaterial = useMemo(
    () => exportedLoopMaterials.find((entry) => entry.id === nParamsUI.materialLoopId) ?? null,
    [exportedLoopMaterials, nParamsUI.materialLoopId]
  );
  const selectedLoopHandoffProfile = useMemo(() => {
    if (!selectedLoopMaterial) return null;
    const workspaceOrigin = selectedLoopMaterial.workspaceOrigin === 'wave-material' || selectedLoopMaterial.workspaceOrigin === 'microtonal-logic'
      ? selectedLoopMaterial.workspaceOrigin
      : selectedLoopMaterial.renderMode?.includes('microtonal-logic')
        ? 'microtonal-logic'
        : selectedLoopMaterial.renderMode?.includes('wave-material')
          ? 'wave-material'
          : selectedLoopMaterial.renderMode?.includes('legacy')
            ? 'legacy-forge'
            : undefined;
    return buildMachineRoomHandoffProfile({
      role: selectedLoopMaterial.role,
      workspaceOrigin,
    });
  }, [selectedLoopMaterial]);
  const effectiveLoopMyzelGroup = useMemo(() => {
    if (selectedLoopMaterial?.preferredMyzelGroup && MYZEL_POST_FX_GROUPS.some((entry) => entry.id === selectedLoopMaterial.preferredMyzelGroup)) {
      return selectedLoopMaterial.preferredMyzelGroup as MyzelPostFxGroupId;
    }
    return selectedLoopHandoffProfile?.preferredMyzelGroup ?? null;
  }, [selectedLoopMaterial, selectedLoopHandoffProfile]);

  const [drumConfigLibraryState, setDrumConfigLibraryState] = useState(() => getDrumConfigLibraryState());
  useEffect(() => {
    const unsubscribe = subscribeDrumConfigLibrary(() => setDrumConfigLibraryState(getDrumConfigLibraryState()));
    return () => { unsubscribe(); };
  }, []);
  const exportedDrumConfigs = useMemo(() => drumConfigLibraryState.entries, [drumConfigLibraryState.entries]);
  const selectedExportedDrumConfig = useMemo(
    () => exportedDrumConfigs.find((entry) => entry.id === nParamsUI.drumConfigId) ?? null,
    [exportedDrumConfigs, nParamsUI.drumConfigId]
  );

  const pendingRegisteredLoopIdRef = useRef('');

  useEffect(() => {
    const handleRegistered = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; role?: string }>).detail;
      if (detail?.role === 'loop' && detail.id) {
        pendingRegisteredLoopIdRef.current = detail.id;
        updateNParams({ materialLoopId: detail.id, materialLoopActive: true });
      }
    };
    const handleDeleted = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail?.id) return;
      if (pendingRegisteredLoopIdRef.current === detail.id) pendingRegisteredLoopIdRef.current = '';
      if (detail.id === nexusParamsRef.current.materialLoopId) {
        const fallback = getMaterialLibraryState().entries.find((entry) => entry.role === 'loop' && entry.id !== detail.id)?.id ?? '';
        updateNParams({ materialLoopId: fallback, materialLoopActive: fallback ? nexusParamsRef.current.materialLoopActive : false });
      }
    };
    window.addEventListener('xensonar:material-registered', handleRegistered as EventListener);
    window.addEventListener('xensonar:material-deleted', handleDeleted as EventListener);
    return () => {
      window.removeEventListener('xensonar:material-registered', handleRegistered as EventListener);
      window.removeEventListener('xensonar:material-deleted', handleDeleted as EventListener);
    };
  }, []);

  useEffect(() => {
    if (nParamsUI.drumConfigMode !== "exported") return;
    if (selectedExportedDrumConfig) return;
    if (exportedDrumConfigs.length > 0) {
      const fallbackId = exportedDrumConfigs[0]?.id ?? "";
      if (fallbackId && fallbackId !== nParamsUI.drumConfigId) {
        updateNParams({ drumConfigId: fallbackId });
      }
      return;
    }
    updateNParams({ drumConfigMode: "preset", drumConfigId: "" });
  }, [nParamsUI.drumConfigMode, nParamsUI.drumConfigId, selectedExportedDrumConfig, exportedDrumConfigs]);

  useEffect(() => {
    if (!myzelFollowForgeHandoff || !nParamsUI.materialLoopActive || !effectiveLoopMyzelGroup) return;
    setMyzelPostFxGroup((prev) => prev === effectiveLoopMyzelGroup ? prev : effectiveLoopMyzelGroup);
  }, [myzelFollowForgeHandoff, nParamsUI.materialLoopActive, effectiveLoopMyzelGroup]);


  useEffect(() => {
    const handleRegistered = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail?.id) return;
      if (nexusParamsRef.current.drumConfigMode === 'exported' && !nexusParamsRef.current.drumConfigId) {
        updateNParams({ drumConfigId: detail.id });
      }
    };
    const handleDeleted = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail?.id) return;
      if (detail.id !== nexusParamsRef.current.drumConfigId) return;
      const fallbackId = getDrumConfigLibraryState().entries.find((entry) => entry.id !== detail.id)?.id ?? '';
      if (fallbackId) {
        updateNParams({ drumConfigId: fallbackId, drumConfigMode: 'exported' });
      } else {
        updateNParams({ drumConfigId: '', drumConfigMode: 'preset' });
      }
    };
    window.addEventListener('xensonar:drum-config-registered', handleRegistered as EventListener);
    window.addEventListener('xensonar:drum-config-deleted', handleDeleted as EventListener);
    return () => {
      window.removeEventListener('xensonar:drum-config-registered', handleRegistered as EventListener);
      window.removeEventListener('xensonar:drum-config-deleted', handleDeleted as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleSendRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (!detail?.id) return;
      updateNParams({ drumConfigMode: 'exported', drumConfigId: detail.id, drumActive: true });
    };
    window.addEventListener('xensonar:drum-config-send-request', handleSendRequest as EventListener);
    return () => window.removeEventListener('xensonar:drum-config-send-request', handleSendRequest as EventListener);
  }, []);

  const renameSelectedDrumConfig = async () => {
    if (!selectedExportedDrumConfig) return;
    const next = window.prompt("Drum-Konfiguration umbenennen", selectedExportedDrumConfig.name);
    if (next == null) return;
    await updateDrumConfigEntry(selectedExportedDrumConfig.id, { name: next });
  };

  const removeSelectedDrumConfig = async () => {
    if (!selectedExportedDrumConfig) return;
    await deleteDrumConfigEntry(selectedExportedDrumConfig.id);
    if (nexusParamsRef.current.drumConfigId === selectedExportedDrumConfig.id) {
      updateNParams({ drumConfigMode: "preset", drumConfigId: "" });
    }
  };

  const [collectiveMemoryEnabled, setCollectiveMemoryEnabled] = useState(true);
  const [collectiveMemoryWindow, setCollectiveMemoryWindow] = useState(8);
  const [collectiveMemoryUi, setCollectiveMemoryUi] = useState({
    drone: { enabled: true, send: 0.32, wet: 0.18 },
    particles: { enabled: true, send: 0.16, wet: 0.08 },
    waves: { enabled: true, send: 0.14, wet: 0.07 },
    myzel: { enabled: true, send: 0.42, wet: 0.22 },
  });
  const [collectiveMemoryMonitor, setCollectiveMemoryMonitor] = useState<DescriptorSummary | null>(null);

  const updateCollectiveMemoryUi = (
    key: keyof typeof collectiveMemoryUi,
    partial: Partial<(typeof collectiveMemoryUi)[keyof typeof collectiveMemoryUi]>,
  ) => {
    setCollectiveMemoryUi((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...partial },
    }));
  };

  const [psychedelicSpiralEnabled, setPsychedelicSpiralEnabled] = useState(false);
  const [psychedelicSpiralFollow, setPsychedelicSpiralFollow] = useState(0.42);
  const [psychedelicSpiralUi, setPsychedelicSpiralUi] = useState({
    drive: 0.44,
    color: 0.6,
    motion: 0.54,
    feedback: 0.3,
    bloom: 0.48,
    mix: 0.86,
    stereoWidth: 0.84,
    outputGain: 0.9,
    drone: { enabled: true, send: 0.34 },
    particles: { enabled: true, send: 0.2 },
    waves: { enabled: true, send: 0.28 },
    myzel: { enabled: true, send: 0.38 },
  });
  const [psychedelicSpiralMonitor, setPsychedelicSpiralMonitor] = useState({
    drive: 0.44,
    color: 0.6,
    motion: 0.54,
    feedback: 0.3,
    bloom: 0.48,
    mix: 0.86,
    width: 0.84,
  });

  const [enterHoldPsyFxEnabled, setEnterHoldPsyFxEnabled] = useState(false);
  const [enterHoldPsyFxUi, setEnterHoldPsyFxUi] = useState({
    depth: 0.68,
    color: 0.56,
    flicker: 0.72,
    mix: 0.5,
    bassMotion: 0.44,
    outputGain: 0.92,
    waveSend: 0.72,
    bassSend: 0.48,
    bassLink: true,
  });

  const [transientDriveUi, setTransientDriveUi] = useState({
    drone: { enabled: false, send: 0 },
    particles: { enabled: true, send: 0.22 },
    waves: { enabled: true, send: 0.28 },
    myzel: { enabled: false, send: 0.1 },
  });

  const updateTransientDriveSource = (
    key: keyof typeof transientDriveUi,
    partial: Partial<(typeof transientDriveUi)[keyof typeof transientDriveUi]>,
  ) => {
    setTransientDriveUi((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...partial },
    }));
  };

  const [schwarmEnabled, setSchwarmEnabled] = useState(false);
  const [schwarmUi, setSchwarmUi] = useState({
    amount: 0.58,
    interpretiveBias: 0.72,
    sensitivity: 0.66,
    memorySeconds: 1.6,
    densityBias: 0.5,
    weave: 0.56,
    material: "fungus" as SchwarmMaterial,
    updateMs: 120,
    drone: { enabled: false, send: 0 },
    particles: { enabled: true, send: 0.18 },
    waves: { enabled: false, send: 0.06 },
    myzel: { enabled: false, send: 0.04 },
  });
  const [schwarmMonitor, setSchwarmMonitor] = useState<SwarmState | null>(null);
  const [controlPerfMonitor, setControlPerfMonitor] = useState<ControlSchedulerMetrics>({
    avgFrameMs: 16.7,
    avgWorkMs: 0,
    workRatio: 0,
    taskRuns: 0,
    taskCount: 0,
  });
  const [transientRuntimeMonitor, setTransientRuntimeMonitor] = useState<TransientRuntimeSnapshot>({
    activeVoices: 0,
    hardLimit: 84,
    load: 0,
    droppedVoices: 0,
    reducedEvents: 0,
    gatedSends: 0,
    bySource: { particle: 0, wave: 0, drum: 0, other: 0 },
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      snapshotTransientRuntime();
    }, 160);
    return () => window.clearInterval(timer);
  }, []);

  const updateSchwarmSource = (
    key: keyof Pick<typeof schwarmUi, "drone" | "particles" | "waves" | "myzel">,
    partial: Partial<(typeof schwarmUi)["particles"]>,
  ) => {
    setSchwarmUi((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...partial },
    }));
  };

  const updatePsychedelicSpiralSource = (
    key: keyof Pick<typeof psychedelicSpiralUi, "drone" | "particles" | "waves" | "myzel">,
    partial: Partial<(typeof psychedelicSpiralUi)["drone"]>,
  ) => {
    setPsychedelicSpiralUi((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...partial },
    }));
  };

  const getActiveDroneOvertoneMix = () => {
    const presetMix = nexusParamsRef.current.droneJIOvertonesByPreset?.[nexusParamsRef.current.dronePreset];
    return presetMix ?? nexusParamsRef.current.droneJIOvertones;
  };

  const configureMasterChain = (ctx: AudioContext, clipper: WaveShaperNode, limiter: DynamicsCompressorNode, out: GainNode) => {
    clipper.curve = createSoftClipCurve(1.45);
    clipper.oversample = "4x";
    limiter.threshold.setValueAtTime(-10, ctx.currentTime);
    limiter.knee.setValueAtTime(6, ctx.currentTime);
    limiter.ratio.setValueAtTime(18, ctx.currentTime);
    limiter.attack.setValueAtTime(0.003, ctx.currentTime);
    limiter.release.setValueAtTime(0.16, ctx.currentTime);
    out.gain.value = 0.92;
  };

  const ensureFinalMixBus = (ctx: AudioContext) => {
    if (!finalMixBusRef.current) {
      const clipper = ctx.createWaveShaper();
      const limiter = ctx.createDynamicsCompressor();
      const out = ctx.createGain();
      const analyser = ctx.createAnalyser();
      const liveMaster = createLiveMasteringSystem(ctx);

      configureMasterChain(ctx, clipper, limiter, out);
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.76;

      liveMaster.glue?.connect(clipper);
      clipper.connect(limiter);
      limiter.connect(out);
      out.connect(ctx.destination);
      out.connect(analyser);

      finalMixBusRef.current = liveMaster.inputs.main as GainNode;
      drumMixBusRef.current = liveMaster.inputs.rhythm as GainNode;
      masterMixBusRef.current = liveMaster.premaster;
      liveMasteringRef.current = liveMaster;
      finalMixAnalyserRef.current = analyser;
      finalClipperRef.current = clipper;
      finalLimiterRef.current = limiter;
      finalOutputTrimRef.current = out;
    }
    return finalMixBusRef.current;
  };

  const ensureDrumMixBus = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    return drumMixBusRef.current as GainNode;
  };

  const getLiveMasterBus = (ctx: AudioContext, role: "main" | "drone" | "rhythm" | "space" = "main") => {
    const ensured = ensureFinalMixBus(ctx);
    return (liveMasteringRef.current?.inputs[role] ?? ensured) as GainNode;
  };

  const ensureNoDrumRecordTap = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!noDrumRecordOutputRef.current) {
      const clipper = ctx.createWaveShaper();
      const limiter = ctx.createDynamicsCompressor();
      const out = ctx.createGain();
      configureMasterChain(ctx, clipper, limiter, out);
      (liveMasteringRef.current?.musicPremaster ?? finalMixBusRef.current)?.connect(clipper);
      clipper.connect(limiter);
      limiter.connect(out);
      noDrumRecordClipperRef.current = clipper;
      noDrumRecordLimiterRef.current = limiter;
      noDrumRecordOutputRef.current = out;
    }
    return noDrumRecordOutputRef.current;
  };

  const beginTransientEvent = (source: TransientSource, requestedVoices: number, intensity = 1) => {
    return transientRuntimeRef.current.beginEvent(source, requestedVoices, intensity);
  };

  const snapshotTransientRuntime = () => {
    setTransientRuntimeMonitor(transientRuntimeRef.current.getSnapshot());
  };

  const ensureCollectiveMemoryFx = (ctx: AudioContext) => {
    const finalBus = ensureFinalMixBus(ctx);
    if (!finalMixProbeRef.current && finalMixAnalyserRef.current) {
      finalMixProbeRef.current = createDescriptorProbe(ctx, finalMixAnalyserRef.current, 1024);
    }
    if (!collectiveFxRef.current.drone) {
      collectiveFxRef.current.drone = createCollectiveMemoryEffect(ctx, {
        name: "drone_memory",
        destination: finalBus,
        sendLevel: collectiveMemoryUi.drone.send,
        baseWet: collectiveMemoryUi.drone.wet,
        complementarity: 0.72,
      });
    }
    if (!collectiveFxRef.current.particles) {
      collectiveFxRef.current.particles = createCollectiveMemoryEffect(ctx, {
        name: "particles_memory",
        destination: finalBus,
        sendLevel: collectiveMemoryUi.particles.send,
        baseWet: collectiveMemoryUi.particles.wet,
        complementarity: 0.66,
      });
    }
    if (!collectiveFxRef.current.waves) {
      collectiveFxRef.current.waves = createCollectiveMemoryEffect(ctx, {
        name: "waves_memory",
        destination: finalBus,
        sendLevel: collectiveMemoryUi.waves.send,
        baseWet: collectiveMemoryUi.waves.wet,
        complementarity: 0.58,
      });
    }
    if (!collectiveFxRef.current.myzel) {
      collectiveFxRef.current.myzel = createCollectiveMemoryEffect(ctx, {
        name: "myzel_memory",
        destination: finalBus,
        sendLevel: collectiveMemoryUi.myzel.send,
        baseWet: collectiveMemoryUi.myzel.wet,
        complementarity: 0.78,
      });
    }
    return collectiveFxRef.current;
  };

  const ensurePsychedelicSpiralDevice = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!psychedelicSpiralRef.current) {
      const device = createPsychedelicSpiralDevice(ctx, {
        enabled: psychedelicSpiralEnabled,
        drive: psychedelicSpiralUi.drive,
        color: psychedelicSpiralUi.color,
        motion: psychedelicSpiralUi.motion,
        feedback: psychedelicSpiralUi.feedback,
        bloom: psychedelicSpiralUi.bloom,
        mix: psychedelicSpiralUi.mix,
        stereoWidth: psychedelicSpiralUi.stereoWidth,
        outputGain: psychedelicSpiralUi.outputGain,
      });
      device.connect(getLiveMasterBus(ctx, "space"));
      psychedelicSpiralRef.current = device;
      (Object.keys(psychedelicSpiralSendsRef.current) as Array<keyof typeof psychedelicSpiralSendsRef.current>).forEach((key) => {
        const send = ctx.createGain();
        send.gain.value = 0;
        send.connect(device.input);
        psychedelicSpiralSendsRef.current[key] = send;
      });
    }
    return psychedelicSpiralRef.current;
  };


  const ensureTransientDriveDevice = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!transientDriveFxRef.current) {
      const device = createTransientDriveDevice(ctx, getLiveMasterBus(ctx, "main"));
      transientDriveFxRef.current = device;
      (Object.keys(transientDriveSendsRef.current) as Array<keyof typeof transientDriveSendsRef.current>).forEach((key) => {
        const send = ctx.createGain();
        send.gain.value = 0;
        send.connect(device.input);
        transientDriveSendsRef.current[key] = send;
      });
      if (nexusRefs.current.droneVolumeBus && transientDriveSendsRef.current.drone) {
        nexusRefs.current.droneVolumeBus.connect(transientDriveSendsRef.current.drone);
      }
      if (nexusRefs.current.myzelMasterGain && transientDriveSendsRef.current.myzel) {
        nexusRefs.current.myzelMasterGain.connect(transientDriveSendsRef.current.myzel);
      }
    }
    return transientDriveFxRef.current;
  };

  const ensureEnterHoldPsyFxDevice = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!enterHoldPsyFxRef.current) {
      const device = createEnterHoldPsyFxDevice(ctx, {
        destination: getLiveMasterBus(ctx, "main"),
        enabled: enterHoldPsyFxEnabled,
        bpm: nexusParamsRef.current.quantizeBpm,
        depth: enterHoldPsyFxUi.depth,
        color: enterHoldPsyFxUi.color,
        flicker: enterHoldPsyFxUi.flicker,
        mix: enterHoldPsyFxUi.mix,
        bassMotion: enterHoldPsyFxUi.bassMotion,
        outputGain: enterHoldPsyFxUi.outputGain,
      });
      enterHoldPsyFxRef.current = device;
      const waveSend = ctx.createGain();
      waveSend.gain.value = 0;
      waveSend.connect(device.waveInput);
      enterHoldPsyFxSendsRef.current.waves = waveSend;
      const bassSend = ctx.createGain();
      bassSend.gain.value = 0;
      bassSend.connect(device.bassInput);
      enterHoldPsyFxSendsRef.current.bass = bassSend;
    }
    return enterHoldPsyFxRef.current;
  };

  const ensureSchwarmdeuterDevice = (ctx: AudioContext) => {
    ensureFinalMixBus(ctx);
    if (!schwarmdeuterRef.current) {
      const device = new Schwarmdeuter(ctx, {
        params: {
          amount: schwarmUi.amount,
          interpretiveBias: schwarmUi.interpretiveBias,
          sensitivity: schwarmUi.sensitivity,
          memorySeconds: schwarmUi.memorySeconds,
          densityBias: schwarmUi.densityBias,
          weave: schwarmUi.weave,
          material: schwarmUi.material,
          bypass: !schwarmEnabled,
        },
      });
      device.connect(getLiveMasterBus(ctx, "space"));
      schwarmdeuterRef.current = device;
      (Object.keys(schwarmdeuterSendsRef.current) as Array<keyof typeof schwarmdeuterSendsRef.current>).forEach((key) => {
        const send = ctx.createGain();
        send.gain.value = 0;
        send.connect(device.input);
        schwarmdeuterSendsRef.current[key] = send;
      });
      if (nexusRefs.current.droneVolumeBus && schwarmdeuterSendsRef.current.drone) {
        nexusRefs.current.droneVolumeBus.connect(schwarmdeuterSendsRef.current.drone);
      }
      if (nexusRefs.current.myzelMasterGain && schwarmdeuterSendsRef.current.myzel) {
        nexusRefs.current.myzelMasterGain.connect(schwarmdeuterSendsRef.current.myzel);
      }
    }
    return schwarmdeuterRef.current;
  };


const ensureMyzelPostFxRouter = (ctx: AudioContext) => {
  ensureFinalMixBus(ctx);
  if (!myzelPostFxRouterRef.current) {
    const router = createMyzelPostFxRouter(ctx, getLiveMasterBus(ctx, "space"));
    myzelPostFxRouterRef.current = router;
    (Object.keys(myzelPostFxSendsRef.current) as MyzelPostFxSourceKey[]).forEach((key) => {
      myzelPostFxSendsRef.current[key] = router.inputs[key];
    });
  }
  if (nexusRefs.current.droneVolumeBus && myzelPostFxSendsRef.current.drone && !myzelPostFxConnectionsRef.current.drone) {
    nexusRefs.current.droneVolumeBus.connect(myzelPostFxSendsRef.current.drone);
    myzelPostFxConnectionsRef.current.drone = true;
  }
  if (nexusRefs.current.myzelMasterGain && myzelPostFxSendsRef.current.myzel && !myzelPostFxConnectionsRef.current.myzel) {
    nexusRefs.current.myzelMasterGain.connect(myzelPostFxSendsRef.current.myzel);
    myzelPostFxConnectionsRef.current.myzel = true;
  }
  return myzelPostFxRouterRef.current;
};

  const collectSchwarmSnapshots = (): ParticleVoiceSnapshot[] => {
    const nowMs = performance.now();
    const out: ParticleVoiceSnapshot[] = [];
    nexusRefs.current.agents.slice(0, 40).forEach((agent, index) => {
      const recent = Number.isFinite(agent.lastHit) ? Math.max(0, 1 - (nowMs - agent.lastHit) / 420) : 0;
      out.push({
        id: `agent-${index}`,
        x: agent.x,
        y: agent.y,
        vx: agent.vx,
        vy: agent.vy,
        life: recent,
        energy: Math.max(0.12, agent.lastHitGain || recent || 0.2),
        ratio: agent.ratio,
        freq: 220 * Math.max(0.125, agent.ratio),
        hue: ((agent.ratio * 180) % 360 + 360) % 360,
        justSpawned: recent > 0.75,
      });
    });
    gameRefs.current.particles.slice(0, 24).forEach((particle, index) => {
      out.push({
        id: `game-${index}`,
        x: particle.x,
        y: particle.y,
        vx: particle.vx,
        vy: particle.vy,
        life: particle.life,
        energy: Math.max(0.08, particle.life),
        hue: particle.hue,
        justSpawned: particle.life > 0.82,
      });
    });
    return out;
  };

  const setQuantizeGridMode = (grid: QuantizeGrid) => {
    quantizeAnchorRef.current = null;
    nexusRefs.current.nextAbsoluteStep = null;
    particleQuantizeQueueRef.current = [];
    particleQuantizeSeenRef.current = [];
    waveOvertoneArpQueueRef.current = [];
    if (particleQuantizeTimerRef.current) {
      window.clearInterval(particleQuantizeTimerRef.current);
      particleQuantizeTimerRef.current = null;
    }
    setQuantizeGrid(grid);
  };

  const buildGridMuteList = (tuning: GridTuning, mode: ChurchMode, allowedSteps?: number[]) => {
    const len = getTuningSteps(tuning);
    if (allowedSteps && allowedSteps.length) {
      const allowed = new Set(allowedSteps.map((step) => ((step % len) + len) % len));
      return Array.from({ length: len }, (_, i) => i).filter((idx) => !allowed.has(idx));
    }
    const mask = deriveModeMask(mode, tuning);
    const nextMutes: number[] = [];
    for (let i = 0; i < len; i += 1) {
      if (!mask[i]) nextMutes.push(i);
    }
    return nextMutes;
  };

  const buildGridOffsets = (tuning: GridTuning, sparseOffsets?: Record<number, number>) => {
    const len = getTuningSteps(tuning);
    const offsets = Array.from({ length: len }, () => 0);
    if (!sparseOffsets) return offsets;
    for (const [rawIndex, rawOffset] of Object.entries(sparseOffsets)) {
      const index = ((Number(rawIndex) % len) + len) % len;
      offsets[index] = clamp(rawOffset, -50, 50);
    }
    return offsets;
  };

  const updateNParams = (partial: Partial<typeof nParamsUI>) => {
    const merged = { ...nexusParamsRef.current, ...partial };
    merged.particleVolume = clamp(merged.particleVolume, 0, PARTICLE_VOLUME_MAX);
    if (["crystal_bowl", "shimmer_pad", "velvet_bloom"].includes(merged.particlePreset)) {
      merged.particleVolume = Math.min(merged.particleVolume, merged.particlePreset === "crystal_bowl" ? 0.24 : 0.22);
    }
    Object.assign(nexusParamsRef.current, merged);
    setNParamsUI({ ...nexusParamsRef.current });
  };

  const applyRealtimeDroneOvertones = (mix?: Record<string, number>, timbreOverride?: number) => {
    const ctx = audioCtxRef.current ?? audioCtx;
    if (!ctx) return;
    const refs = nexusRefs.current;
    if (!refs.droneVolumeBus) {
      const volBus = ctx.createGain();
      volBus.gain.value = clamp(droneVolume, 0, 1);
      refs.droneVolumeBus = volBus;
      if (myzelPostFxSendsRef.current.drone && !myzelPostFxConnectionsRef.current.drone) {
        volBus.connect(myzelPostFxSendsRef.current.drone);
        myzelPostFxConnectionsRef.current.drone = true;
      }

      const groupBus = ctx.createGain();
      refs.droneGroupBus = groupBus;

      const rhythmBus = ctx.createGain();
      rhythmBus.gain.value = 1.0;
      refs.droneRhythmGain = rhythmBus;

      const flangerDelay = ctx.createDelay(1.0);
      const flangerFeedback = ctx.createGain();
      const flangerLfo = ctx.createOscillator();
      const flangerLfoGain = ctx.createGain();
      const flangerWet = ctx.createGain();
      const myceliumFormantFilter = ctx.createBiquadFilter();
      const myceliumFormantGain = ctx.createGain();

      flangerDelay.delayTime.value = 0.005;
      flangerFeedback.gain.value = 0;
      flangerLfo.type = "sine";
      flangerLfo.frequency.value = 0.25;
      flangerLfoGain.gain.value = 0.003;

      flangerLfo.connect(flangerLfoGain);
      flangerLfoGain.connect(flangerDelay.delayTime);
      flangerDelay.connect(flangerFeedback);
      flangerFeedback.connect(flangerDelay);
      groupBus.connect(rhythmBus);
      const droneDriveRefs = createDroneDriveInsert(ctx, rhythmBus, volBus, flangerDelay);
      refs.droneDriveRefs = droneDriveRefs;
      myceliumFormantFilter.type = "bandpass";
      myceliumFormantFilter.frequency.value = 800;
      myceliumFormantFilter.Q.value = 3.5;
      myceliumFormantGain.gain.value = 0.0001;

      flangerDelay.connect(flangerWet);
      flangerWet.connect(volBus);
      groupBus.connect(myceliumFormantFilter);
      myceliumFormantFilter.connect(myceliumFormantGain);
      myceliumFormantGain.connect(volBus);
      volBus.connect(getLiveMasterBus(ctx, "drone"));
      const collectiveFx = ensureCollectiveMemoryFx(ctx);
      const spiralDevice = ensurePsychedelicSpiralDevice(ctx);
      if (collectiveFx.drone) {
        rhythmBus.connect(collectiveFx.drone.input);
      }
      if (spiralDevice && psychedelicSpiralSendsRef.current.drone) {
        volBus.connect(psychedelicSpiralSendsRef.current.drone);
      }
      if (transientDriveSendsRef.current.drone) {
        volBus.connect(transientDriveSendsRef.current.drone);
      }
      if (schwarmdeuterSendsRef.current.drone) {
        volBus.connect(schwarmdeuterSendsRef.current.drone);
      }
      flangerLfo.start();

      refs.flangerDelay = flangerDelay;
      refs.flangerFeedback = flangerFeedback;
      refs.flangerLfo = flangerLfo;
      refs.flangerLfoGain = flangerLfoGain;
      refs.flangerWet = flangerWet;
      refs.myceliumFormantFilter = myceliumFormantFilter;
      refs.myceliumFormantGain = myceliumFormantGain;
    }

    const routeToGroupBus = (node: AudioNode | null) => {
      if (!node || !refs.droneGroupBus) return;
      try {
        node.disconnect();
      } catch {}
      node.connect(refs.droneGroupBus);
    };

    routeToGroupBus(refs.gain);
    routeToGroupBus(refs.gainB);
    routeToGroupBus(refs.overtoneMaster);
    routeToGroupBus(refs.manualJiMaster);
    routeToGroupBus(refs.myzelMasterGain);

    refs.droneVolumeBus.gain.setTargetAtTime(clamp(droneVolume, 0, 1), ctx.currentTime, 0.04);

    const current = nexusParamsRef.current;
    const activeMix = mix ?? current.droneJIOvertones;
    const timbre = clamp(timbreOverride ?? current.droneTimbre ?? 0, 0, 1);
    const master = refs.manualJiMaster;
    if (master) {
      master.gain.setTargetAtTime(0.28 + timbre * 0.72, ctx.currentTime, 0.06);
    }
    for (const node of DRONE_JI_OVERTONES) {
      const gainNode = nexusRefs.current.manualJiGains[node.label];
      if (!gainNode) continue;
      const slider = clamp(activeMix[node.label] ?? 0, 0, 1);
      const perPartial = slider * (0.008 + 0.07 * timbre);
      gainNode.gain.setTargetAtTime(perPartial, ctx.currentTime, 0.05);
    }
  };

  const ensureMyzelSynth = (ctx: AudioContext) => {
    const refs = nexusRefs.current;
    if (refs.myzelMasterGain) return refs.myzelMasterGain;

    const carrierOsc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const carrierGain = ctx.createGain();
    const subGain = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    const bodyGain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const driveGain = ctx.createGain();
    const driveShaper = ctx.createWaveShaper();
    const master = ctx.createGain();

    carrierOsc.type = "sawtooth";
    subOsc.type = "triangle";
    carrierGain.gain.value = 0.0001;
    subGain.gain.value = 0.0001;
    bodyGain.gain.value = 0.0001;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 900;
    lowpass.Q.value = 0.85;
    driveGain.gain.value = 1;
    driveShaper.curve = myzelDriveEnabled ? createMyzelDriveCurve(myzelInterpreterMix.driveAmount) : null;
    driveShaper.oversample = myzelDriveEnabled ? "4x" : "none";
    master.gain.value = 0.0001;

    carrierOsc.connect(carrierGain);
    subOsc.connect(subGain);
    carrierGain.connect(lowpass);
    subGain.connect(lowpass);
    lowpass.connect(bodyGain);
    bodyGain.connect(pan);

    const formantFilters: BiquadFilterNode[] = [];
    const formantGains: GainNode[] = [];
    for (let i = 0; i < 3; i += 1) {
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      f.type = "bandpass";
      f.frequency.value = 420 + i * 320;
      f.Q.value = 4;
      g.gain.value = 0.0001;
      lowpass.connect(f);
      f.connect(g);
      g.connect(pan);
      formantFilters.push(f);
      formantGains.push(g);
    }

    const overtoneOscs: OscillatorNode[] = [];
    const overtoneGains: GainNode[] = [];
    for (let i = 0; i < 3; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "triangle" : "sine";
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(pan);
      osc.start();
      overtoneOscs.push(osc);
      overtoneGains.push(gain);
    }

    const constellationFilter = ctx.createBiquadFilter();
    constellationFilter.type = "bandpass";
    constellationFilter.frequency.value = 1100;
    constellationFilter.Q.value = 2.2;

    const constellationOscs: OscillatorNode[] = [];
    const constellationGains: GainNode[] = [];
    for (let i = 0; i < 3; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "triangle" : i === 1 ? "sine" : "sawtooth";
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(constellationFilter);
      osc.start();
      constellationOscs.push(osc);
      constellationGains.push(gain);
    }
    constellationFilter.connect(pan);

    pan.connect(driveGain);
    driveGain.connect(driveShaper);
    driveShaper.connect(master);
    master.connect(refs.droneGroupBus ?? getLiveMasterBus(ctx, "drone"));
    const collectiveFx = ensureCollectiveMemoryFx(ctx);
    const spiralDevice = ensurePsychedelicSpiralDevice(ctx);
    if (collectiveFx.myzel) {
      master.connect(collectiveFx.myzel.input);
    }
    if (spiralDevice && psychedelicSpiralSendsRef.current.myzel) {
      master.connect(psychedelicSpiralSendsRef.current.myzel);
    }
    if (schwarmdeuterSendsRef.current.myzel) {
      master.connect(schwarmdeuterSendsRef.current.myzel);
    }
    carrierOsc.start();
    subOsc.start();

    refs.myzelCarrierOsc = carrierOsc;
    refs.myzelSubOsc = subOsc;
    refs.myzelCarrierGain = carrierGain;
    refs.myzelSubGain = subGain;
    refs.myzelBodyGain = bodyGain;
    refs.myzelLowpass = lowpass;
    refs.myzelPan = pan;
    refs.myzelDriveGain = driveGain;
    refs.myzelDriveShaper = driveShaper;
    refs.myzelMasterGain = master;
    if (myzelPostFxSendsRef.current.myzel && !myzelPostFxConnectionsRef.current.myzel) {
      master.connect(myzelPostFxSendsRef.current.myzel);
      myzelPostFxConnectionsRef.current.myzel = true;
    }
    refs.myzelFormantFilters = formantFilters;
    refs.myzelFormantGains = formantGains;
    refs.myzelOvertoneOscs = overtoneOscs;
    refs.myzelOvertoneGains = overtoneGains;
    refs.myzelConstellationFilter = constellationFilter;
    refs.myzelConstellationOscs = constellationOscs;
    refs.myzelConstellationGains = constellationGains;

    return master;
  };

  const setDronePreset = (preset: DronePreset) => {
    const byPreset = nexusParamsRef.current.droneJIOvertonesByPreset;
    const presetMix = byPreset[preset] ?? createEmptyOvertoneMix();
    updateNParams({
      dronePreset: preset,
      droneJIOvertones: { ...presetMix },
    });
  };

  const setDroneOvertone = (label: string, value: number) => {
    const activePreset = nexusParamsRef.current.dronePreset;
    const currentByPreset = nexusParamsRef.current.droneJIOvertonesByPreset;
    const nextForPreset = {
      ...(currentByPreset[activePreset] ?? createEmptyOvertoneMix()),
      [label]: value,
    };
    updateNParams({
      droneJIOvertones: nextForPreset,
      droneJIOvertonesByPreset: {
        ...currentByPreset,
        [activePreset]: nextForPreset,
      },
    });
  };

  const setWaveOvertone = (label: string, value: number) => {
    updateNParams({
      waveOvertones: {
        ...nexusParamsRef.current.waveOvertones,
        [label]: value,
      },
    });
  };

  const applyWaveOvertonePreset = (presetId: WaveOvertoneMixPresetId) => {
    const preset = WAVE_OVERTONE_MIX_PRESETS.find((entry) => entry.value === presetId);
    if (!preset) return;
    updateNParams({
      waveOvertonesEnabled: presetId === "empty" ? nexusParamsRef.current.waveOvertonesEnabled : true,
      waveOvertones: { ...preset.mix },
      waveOvertoneGlobalLevel: preset.globalLevel,
    });
  };

  const previewWavePresetSelection = async (preset: WaveSoundPreset) => {
    const ctx = await initAudio();
    if (!ctx) return;
    const runtimeBefore = { ...waveSoundRuntimeRef.current };
    const previousOvertonesEnabled = nexusParamsRef.current.waveOvertonesEnabled;
    const previousQueue = [...waveOvertoneArpQueueRef.current];
    waveSoundRuntimeRef.current = {
      ...runtimeBefore,
      enabled: true,
      preset,
      volume: Math.max(runtimeBefore.volume, 0.22),
    };
    nexusParamsRef.current.waveOvertonesEnabled = false;
    waveOvertoneArpQueueRef.current = [];
    try {
      playWaveStartSound(220, false);
    } finally {
      waveOvertoneArpQueueRef.current = previousQueue;
      nexusParamsRef.current.waveOvertonesEnabled = previousOvertonesEnabled;
      waveSoundRuntimeRef.current = runtimeBefore;
    }
  };

  const previewParticlePresetSelection = async (preset: ParticlePreset) => {
    const ctx = await initAudio();
    if (!ctx) return;
    const previewVolume = clamp(Math.max(nexusParamsRef.current.particleVolume, 0.12), 0.08, 0.24);
    playNexusAgentTone(330, previewVolume, undefined, undefined, preset, { x: GAME_WIDTH * 0.5, y: GAME_HEIGHT * 0.45 });
  };

  const enqueueWaveOvertoneArp = (
    baseFreq: number,
    baseVolume: number,
    activeMix: ActiveWaveOvertone[],
    isSector: boolean,
  ) => {
    const params = nexusParamsRef.current;
    if (!params.waveOvertonesEnabled) return;
    if (!(params.waveOvertoneMode === "arp" || params.waveOvertoneMode === "hybrid")) return;
    const ctx = audioCtxRef.current ?? audioCtx;
    if (!ctx || activeMix.length === 0) return;

    const overtoneGlobalLevel = clamp(params.waveOvertoneGlobalLevel ?? 1, 0, 2.5);
    const bpm = Math.max(40, params.quantizeBpm || gridTempoBpm || 108);
    const step = getWaveOvertoneArpStepSeconds(bpm, params.waveOvertoneArpRate);
    const firstDueTime = quantizeUpToStep(getAudioNowSec(ctx), step, Math.min(0.012, step * 0.35));
    const sequence = buildWaveOvertoneArpSequence(activeMix, params.waveOvertoneArpPattern, params.waveOvertoneArpSteps);
    if (!sequence.length) return;

    const durationMul = params.waveOvertoneArpRate === 64 ? 1.65 : params.waveOvertoneArpRate === 32 ? 1.34 : 1.08;
    const noteDuration = clamp(step * durationMul, 0.05, isSector ? 0.18 : 0.16);
    const waveform = params.waveOvertoneWaveform as OscillatorType;
    const baseCutoff = waveform === "sawtooth" || waveform === "square" ? 2100 : 2500;

    sequence.forEach((entry, index) => {
      const accent = index === 0 ? 1.16 : index % 4 === 0 ? 1.08 : index % 2 === 0 ? 1.02 : 0.96;
      waveOvertoneArpQueueRef.current.push({
        dueTime: firstDueTime + index * step,
        freq: clamp(baseFreq * entry.node.ratio, 45, 3600),
        amp: clamp(baseVolume * (0.18 + entry.amount * 0.34) * accent * overtoneGlobalLevel * (isSector ? 1.08 : 1), 0.0001, 0.42),
        duration: noteDuration,
        waveform,
        cutoff: clamp(baseCutoff + entry.amount * 1800, 900, 5200),
        q: 1.2 + entry.amount * 1.8,
        prominence: 0.56 + entry.amount * 0.26,
      });
    });

    if (waveOvertoneArpQueueRef.current.length > 384) {
      waveOvertoneArpQueueRef.current.splice(0, waveOvertoneArpQueueRef.current.length - 384);
    }
  };

  const activeParticleNodes = getParticleNodes(nParamsUI.particleSystem);
  const areDirectParticlesMuted = (params: typeof nexusParamsRef.current) => params.quantizeOn || params.particleMute;

  const spawnAgentImpactRipple = (agentIndex: number, x: number, y: number) => {
    const refs = nexusRefs.current;
    const total = refs.agents.length;
    const hue = getImpactRippleHue(nexusParamsRef.current.particleSystem, agentIndex, total);
    refs.impactRipples.push({ x, y, radius: 2, life: 1, hue });
    if (refs.impactRipples.length > 260) {
      refs.impactRipples.splice(0, refs.impactRipples.length - 260);
    }
  };

  const updateManualGridMutedSteps = (steps: number[]) => {
    const len = getTuningSteps(nexusParamsRef.current.gridTuning);
    const normalized = [...new Set(steps.map((step) => ((step % len) + len) % len))].sort((a, b) => a - b);
    updateNParams({ manualGridMutedSteps: normalized });
  };

  const toggleManualGridStepMute = (step: number) => {
    const len = getTuningSteps(nexusParamsRef.current.gridTuning);
    const normalized = ((step % len) + len) % len;
    const current = nexusParamsRef.current.manualGridMutedSteps ?? [];
    const next = current.includes(normalized)
      ? current.filter((value) => value !== normalized)
      : [...current, normalized];
    updateManualGridMutedSteps(next);
    if (nexusParamsRef.current.lockCursorToGrid) {
      commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: false });
    }
  };

  const setManualGridStepOffset = (step: number, offsetValue: number) => {
    const len = getTuningSteps(nexusParamsRef.current.gridTuning);
    const normalized = ((step % len) + len) % len;
    const current = [...(nexusParamsRef.current.manualGridStepOffsets ?? Array.from({ length: len }, () => 0))];
    current[normalized] = clamp(offsetValue, -50, 50);
    updateNParams({ manualGridStepOffsets: current });
    if (nexusParamsRef.current.lockCursorToGrid) {
      commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: false });
    }
  };

  const changeGridTuning = (nextTuning: GridTuning) => {
    const p = nexusParamsRef.current;

    const newGridStates = { ...p.gridStates };
    newGridStates[p.gridTuning] = {
      mutes: [...p.manualGridMutedSteps],
      offsets: [...p.manualGridStepOffsets]
    };

    const availableModes = getModesForSystem(nextTuning);
    const resolvedGridMode = availableModes.some((mode) => mode.value === p.gridMode)
      ? p.gridMode
      : availableModes[0]?.value ?? "chromatic";

    let nextMutes: number[] = [];
    let nextOffsets: number[] = [];

    if (p.rememberGrid && newGridStates[nextTuning]) {
      nextMutes = [...newGridStates[nextTuning].mutes];
      nextOffsets = [...newGridStates[nextTuning].offsets];
    } else {
      const len = getTuningSteps(nextTuning);
      nextOffsets = Array.from({ length: len }, () => 0);
      const mask = deriveModeMask(resolvedGridMode, nextTuning);
      for (let i = 0; i < len; i++) {
        if (!mask[i]) nextMutes.push(i);
      }
    }

    updateNParams({ 
      gridTuning: nextTuning,
      gridMode: resolvedGridMode,
      gridStates: newGridStates,
      manualGridMutedSteps: nextMutes,
      manualGridStepOffsets: nextOffsets
    });

    keyboardWindowOffsetRef.current = 0;
    if (p.lockCursorToGrid) {
      commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: false, refreshKeyboardWindow: true });
    } else {
      setKeyboardWindowStamp((prev) => prev + 1);
    }
  };

  const getVisibleGridLines = (p: typeof nexusParamsRef.current): GridLine[] => {
    const octaves = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    const manualMuted = new Set(p.manualGridMutedSteps ?? []);
    const offsets = p.manualGridStepOffsets ?? [];

    if (p.gridTuning === "ji") {
      return [0.125, 0.25, 0.5, 1, 2, 4].flatMap((oct) =>
        JI_NODES.map((ji, idx) => {
          const offsetCents = (offsets[idx] ?? 0) * 10;
          const freq = p.gridBase * oct * ji.ratio * Math.pow(2, offsetCents / 1200);
          return {
            id: `ji-${oct}-${idx}`,
            label: `${ji.label} (${freq.toFixed(1)}Hz)`,
            freq,
            manualMuted: manualMuted.has(idx),
            modeMuted: false,
            stepIndex: idx,
          };
        })
      ).filter((line) => line.freq >= 55 && line.freq <= 440);
    }
    
    if (p.gridTuning === "bp") {
      const tritaveShifts = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
      return tritaveShifts.flatMap((tri) =>
        BP_13TET_RATIOS.map((_, step) => {
          const offset = offsets[step] ?? 0;
          const freq = p.gridBase * Math.pow(3, (step + offset) / 13) * Math.pow(3, tri);
          return {
            id: `bp-${tri}-${step}`,
            label: step === 0 ? `BP Root (${freq.toFixed(1)}Hz)` : `BP ${step} (${freq.toFixed(1)}Hz)`,
            freq,
            manualMuted: manualMuted.has(step),
            modeMuted: false,
            stepIndex: step,
          };
        })
      ).filter((line) => line.freq >= 55 && line.freq <= 440);
    }
    
    if (p.gridTuning === "gamelan" || p.gridTuning === "maqam") {
      const centsList = p.gridTuning === "gamelan" ? GAMELAN_PELOG_CENTS : MAQAM_RAST_CENTS;
      const labelPrefix = p.gridTuning === "gamelan" ? "Pelog" : "Maqam";
      return octaves.flatMap(oct => centsList.map((cents, step) => {
        const offsetCents = (offsets[step] ?? 0) * 10;
        const freq = p.gridBase * Math.pow(2, (cents + offsetCents) / 1200) * Math.pow(2, oct);
        return {
          id: `${p.gridTuning}-${oct}-${step}`,
          label: (oct === 0 && step === 0) ? `${labelPrefix} Root (${freq.toFixed(1)}Hz)` : `${labelPrefix} ${step + 1} (${freq.toFixed(1)}Hz)`,
          freq,
          manualMuted: manualMuted.has(step),
          modeMuted: false,
          stepIndex: step,
        };
      })).filter((line) => line.freq >= 55 && line.freq <= 440);
    }

    const edo = parseInt(p.gridTuning.replace("edo", ""), 10);
    if (!isNaN(edo)) {
      return octaves.flatMap(oct => Array.from({ length: edo }, (_, step) => {
        const offset = offsets[step] ?? 0;
        const freq = p.gridBase * Math.pow(2, (step + offset) / edo) * Math.pow(2, oct);
        return {
          id: `${p.gridTuning}-${oct}-${step}`,
          label: (oct === 0 && step === 0) ? `Root (${freq.toFixed(1)}Hz)` : `${step > 0 ? "+" : ""}${step} (${freq.toFixed(1)}Hz)`,
          freq,
          manualMuted: manualMuted.has(step),
          modeMuted: false,
          stepIndex: step,
        };
      })).filter((line) => line.freq >= 55 && line.freq <= 440);
    }
    return [];
  };

  useEffect(() => {
    myceliumDroneAmountRef.current = clamp(0.12 + tParams.intensityGlobal * 0.68, 0, 1);
  }, [tParams.intensityGlobal]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      myceliumDroneModRef.current = deriveDroneMyceliumMod(
        myceliumSnapshotRef.current,
        myceliumDroneAmountRef.current,
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!nParamsUI.waveOvertonesEnabled || nParamsUI.waveOvertoneMode === "direct") {
      waveOvertoneArpQueueRef.current = [];
    }
  }, [nParamsUI.waveOvertonesEnabled, nParamsUI.waveOvertoneMode]);

  useEffect(() => {
    if (!audioCtx || room !== "RESONANCE") return;

    const stopWaveArpEngine = () => {
      if (waveOvertoneArpTimerRef.current !== null) {
        window.clearInterval(waveOvertoneArpTimerRef.current);
        waveOvertoneArpTimerRef.current = null;
      }
      waveOvertoneArpQueueRef.current = [];
    };

    waveOvertoneArpTimerRef.current = window.setInterval(() => {
      const ctx = audioCtxRef.current ?? audioCtx;
      if (!ctx) return;
      const queue = waveOvertoneArpQueueRef.current;
      const now = getAudioNowSec(ctx) + 0.02;
      let idx = 0;
      while (idx < queue.length) {
        const item = queue[idx];
        if (item.dueTime > now) {
          idx += 1;
          continue;
        }
        const plan = beginTransientEvent("other", 1, item.amp * 1.8);
        playScheduledTone(
          item.freq,
          Math.max(0, item.dueTime - getAudioNowSec(ctx)),
          item.duration,
          item.waveform,
          item.amp,
          item.q,
          item.cutoff,
          [transientDriveSendsRef.current.waves, collectiveFxRef.current.waves?.input],
          { source: "other", plan, prominence: item.prominence },
        );
        queue.splice(idx, 1);
      }
    }, 20);

    return stopWaveArpEngine;
  }, [audioCtx, room]);

  useEffect(() => {
    if (!audioCtx || room !== "RESONANCE") return;

    const snapshotAgentHits = () =>
      nexusRefs.current.agents.map((agent) => {
        const hit = agent.lastHit ?? 0;
        return Number.isFinite(hit) ? hit : 0;
      });

    const stopQuantizeEngines = () => {
      if (particleQuantizeRafRef.current !== null) {
        cancelAnimationFrame(particleQuantizeRafRef.current);
        particleQuantizeRafRef.current = null;
      }
      if (particleQuantizeTimerRef.current !== null) {
        window.clearInterval(particleQuantizeTimerRef.current);
        particleQuantizeTimerRef.current = null;
      }
      particleQuantizeQueueRef.current = [];
      particleQuantizeSeenRef.current = [];
    };

    if (!nexusParamsRef.current.quantizeOn) {
      stopQuantizeEngines();
      return;
    }

    particleQuantizeQueueRef.current = [];
    particleQuantizeSeenRef.current = snapshotAgentHits();

    const loop = () => {
      const liveParams = nexusParamsRef.current;
      if (!liveParams.quantizeOn) {
        particleQuantizeRafRef.current = requestAnimationFrame(loop);
        return;
      }

      const agents = nexusRefs.current.agents;
      if (particleQuantizeSeenRef.current.length !== agents.length) {
        particleQuantizeSeenRef.current = snapshotAgentHits();
      }

      const now = getAudioNowSec(audioCtx);
      const step = getQuantizeStepSeconds(gridTempoBpm, quantizeGrid);
      const baseFreq = freqFromY(nexusRefs.current.cursorY);

      for (let i = 0; i < agents.length; i += 1) {
        const hit = agents[i].lastHit ?? 0;
        const lastSeen = particleQuantizeSeenRef.current[i] ?? 0;
        if (!Number.isFinite(hit) || hit <= lastSeen) continue;

        particleQuantizeSeenRef.current[i] = hit;
        if (!(liveParams.agentEnabled[i] ?? true)) continue;

        const hitGain = clamp(agents[i].lastHitGain ?? 1, 0, 1);
        const vol = liveParams.particleVolume * (liveParams.agentVolumes[i] ?? 1);
        const ampWithWave = vol * Math.pow(hitGain, 2.2);
        const amp = liveParams.particlePreset === "crystal_bowl" ? Math.min(ampWithWave, 0.24) : ampWithWave;
        particleQuantizeQueueRef.current.push({
          dueTime: Math.ceil(now / step) * step,
          freq: clamp(baseFreq * agents[i].ratio, 40, 2400),
          amp,
          preset: liveParams.particlePreset,
          x: agents[i].lastHitX ?? agents[i].x,
          y: agents[i].lastHitY ?? agents[i].y,
          waveGain: hitGain,
        });
      }

      particleQuantizeRafRef.current = requestAnimationFrame(loop);
    };

    particleQuantizeRafRef.current = requestAnimationFrame(loop);
    particleQuantizeTimerRef.current = window.setInterval(() => {
      if (!audioCtx) return;
      const now = getAudioNowSec(audioCtx) + 0.02;
      const queue = particleQuantizeQueueRef.current;
      let idx = 0;
      while (idx < queue.length) {
        const item = queue[idx];
        if (item.dueTime > now) {
          idx += 1;
          continue;
        }
        const send = nexusParamsRef.current.echoOn && nexusRefs.current.delayNode ? nexusRefs.current.delayNode : undefined;
        playNexusAgentTone(item.freq, item.amp, send, item.dueTime, item.preset, { x: item.x, y: item.y });
        queue.splice(idx, 1);
      }
    }, 20);

    return stopQuantizeEngines;
  }, [audioCtx, room, gridTempoBpm, quantizeGrid, nParamsUI.quantizeOn, nParamsUI.particlePreset, nParamsUI.agentEnabled, nParamsUI.agentVolumes, nParamsUI.particleSystem, nParamsUI.churchMode]);

  const enterArenaWorkspace = (startLevel: number) => {
    if (startLevel >= 3) {
      setRoom("L3LAB");
      return;
    }
    const g = gameRefs.current;
    const clampedLevel = clamp(startLevel, 1, 9);
    g.playerX = GAME_WIDTH / 2;
    g.playerY = GAME_HEIGHT - 60;
    g.orb.x = GAME_WIDTH / 2;
    g.orb.y = 140;
    g.orb.vx = 120 + clampedLevel * 18;
    g.orb.vy = -50 - clampedLevel * 8;
    g.lasers = [];
    g.bolts = [];
    g.hearts = [];
    g.particles = [];
    g.level = clampedLevel;
    g.levelUpTimer = 0;
    g.levelUpFrom = clampedLevel;
    g.levelUpTo = clampedLevel;
    g.score = 0;
    g.hits = 0;
    g.totalScore = 0;
    g.hp = 6;
    g.elapsed = 0;
    g.enemyTimer = 0;
    g.laserTimer = 0;
    g.invuln = 0;
    g.over = false;
    g.won = false;
    g.commonsClock = 0;
    g.commonsStep = 0;
    setGameActive(true);
    setGameHud({
      score: 0,
      goal: 46,
      total: 0,
      hp: 6,
      phase: clampedLevel >= 3 ? "Resonance Field" : "Dormant",
      time: 0,
      level: clampedLevel,
      anchor: "Root",
      message: clampedLevel >= 3 ? "Arbeitsraum L3 aktiv: Resonanzfeld + Gated Attacks" : "Irrlicht wartet.",
    });
    setRoom("GAME");
  };

  useEffect(() => {
    if (!gameActive) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const g = gameRefs.current;
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      if (!g.over && !g.won && g.level >= 3) {
        const t = g.elapsed;
        const fieldA = {
          x: GAME_WIDTH * 0.5 + Math.sin(t * 0.92 + 0.4) * 210,
          y: GAME_HEIGHT * 0.32 + Math.cos(t * 0.71) * 120,
        };
        const fieldB = {
          x: GAME_WIDTH * 0.5 + Math.cos(t * 0.58 + 1.6) * 240,
          y: GAME_HEIGHT * 0.36 + Math.sin(t * 0.87 + 0.3) * 110,
        };

        const pullA = 0.9;
        const pullB = 0.6;
        g.orb.vx += ((fieldA.x - g.orb.x) * pullA + (fieldB.x - g.orb.x) * pullB) * dt;
        g.orb.vy += ((fieldA.y - g.orb.y) * pullA + (fieldB.y - g.orb.y) * pullB) * dt;

        g.commonsClock += dt;
        const stepDur = Math.max(0.08, 0.16 - (g.level - 3) * 0.01);
        while (g.commonsClock >= stepDur) {
          g.commonsClock -= stepDur;
          g.commonsStep = (g.commonsStep + 1) % 16;

          const gateHit = g.commonsStep === 0 || g.commonsStep === 3 || g.commonsStep === 6 || g.commonsStep === 10 || g.commonsStep === 14;
          if (gateHit) {
            const dx = g.playerX - g.orb.x;
            const dy = g.playerY - g.orb.y;
            const base = Math.atan2(dy, dx);
            const spread = 0.36;
            for (const offset of [-spread, 0, spread]) {
              const a = base + offset;
              const speed = 175 + g.level * 18;
              g.bolts.push({ x: g.orb.x, y: g.orb.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 6 });
            }
            if (g.bolts.length > 90) g.bolts.splice(0, g.bolts.length - 90);
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameActive]);

  const toggleNexusAgent = (index: number) => {
    const nextEnabled = [...nexusParamsRef.current.agentEnabled];
    nextEnabled[index] = !nextEnabled[index];
    const agent = nexusRefs.current.agents[index];
    if (agent) {
      agent.lastHit = nextEnabled[index] ? 0 : Number.POSITIVE_INFINITY;
    }
    updateNParams({ agentEnabled: nextEnabled });
  };

  const setNexusAgentVolume = (index: number, value: number) => {
    const nextVolumes = [...nexusParamsRef.current.agentVolumes];
    nextVolumes[index] = value;
    updateNParams({ agentVolumes: nextVolumes });
  };

  const setParticleSystem = (system: ParticleSystem) => {
    const nodes = getParticleNodes(system);
    const availableModes = getModesForSystem(system);
    const resolvedMode = availableModes.some((entry) => entry.value === nexusParamsRef.current.churchMode)
      ? nexusParamsRef.current.churchMode
      : availableModes[0]?.value ?? "chromatic";
    const nextEnabled = defaultAgentEnabled(system, resolvedMode);
    const nextVolumes = nodes.map(() => 1);
    const centerX = GAME_WIDTH * 0.5;
    const centerY = GAME_HEIGHT * 0.5;
    nexusRefs.current.agents = nodes.map((node, idx) => ({
      x: centerX + Math.cos((Math.PI * 2 * idx) / nodes.length) * (120 + Math.random() * 90),
      y: centerY + Math.sin((Math.PI * 2 * idx) / nodes.length) * (120 + Math.random() * 90),
      vx: (Math.random() - 0.5) * 50,
      vy: (Math.random() - 0.5) * 50,
      ratio: node.ratio,
      label: node.label,
      phase: Math.random() * Math.PI * 2,
      lastHit: 0,
      lastHitGain: 1,
      lastHitX: centerX,
      lastHitY: centerY,
      history: [],
    }));
    const currentParams = nexusParamsRef.current;
    updateNParams({
      particleSystem: system,
      churchMode: resolvedMode,
      agentEnabled: nextEnabled,
      agentVolumes: nextVolumes,
      quantizeOn: currentParams.quantizeOn,
      quantizeBpm: currentParams.quantizeBpm,
    });
  };

  const cycleParticleSystem = (direction: 1 | -1 = 1) => {
    const systems: ParticleSystem[] = ["ji", "12edo", "bp"];
    const current = nexusParamsRef.current.particleSystem;
    const currentIndex = systems.indexOf(current);
    const nextIndex = (currentIndex + direction + systems.length) % systems.length;
    setParticleSystem(systems[nextIndex]);
  };

  const setChurchMode = (mode: ChurchMode) => {
    const availableModes = getModesForSystem(nexusParamsRef.current.particleSystem);
    const resolvedMode = availableModes.some((entry) => entry.value === mode)
      ? mode
      : availableModes[0]?.value ?? "chromatic";
    const nextEnabled = deriveModeMask(resolvedMode, nexusParamsRef.current.particleSystem);
    nexusRefs.current.agents.forEach((agent, idx) => {
      if (idx >= nextEnabled.length) return;
      agent.lastHit = nextEnabled[idx] ? 0 : Number.POSITIVE_INFINITY;
    });
    updateNParams({ churchMode: resolvedMode, agentEnabled: nextEnabled });
  };

  const setGridMode = (mode: ChurchMode) => {
    const availableModes = getModesForSystem(nexusParamsRef.current.gridTuning);
    const resolvedMode = availableModes.some((entry) => entry.value === mode)
      ? mode
      : availableModes[0]?.value ?? "chromatic";
    const mask = deriveModeMask(resolvedMode, nexusParamsRef.current.gridTuning);
    const len = getTuningSteps(nexusParamsRef.current.gridTuning);
    const nextMutes: number[] = [];
    for (let i = 0; i < len; i++) {
      if (!mask[i]) nextMutes.push(i);
    }
    
    updateNParams({ gridMode: resolvedMode, manualGridMutedSteps: nextMutes });

    if (nexusParamsRef.current.lockCursorToGrid) {
      commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: false });
    }
  };


  const mergeMetaPresetDefinition = (base: MetaPresetDefinition, override?: Partial<MetaPresetDefinition>): MetaPresetDefinition => {
    if (!override) return base;
    return {
      ...base,
      ...override,
      tParams: override.tParams ? { ...(base.tParams ?? {}), ...override.tParams } : base.tParams,
      room3Body: override.room3Body ? {
        ...(base.room3Body ?? {}),
        ...override.room3Body,
        controls: override.room3Body.controls ? { ...(base.room3Body?.controls ?? {}), ...override.room3Body.controls } : base.room3Body?.controls,
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
  };

  const resolveMetaPreset = (presetId: MetaPresetId): MetaPresetDefinition | null => {
    const base = META_PRESETS.find((entry) => entry.id === presetId);
    if (!base) return null;
    const override = sessionMetaOverrides[presetId]?.preset;
    return mergeMetaPresetDefinition(base, override);
  };

  const applyMetaPreset = (presetId: MetaPresetId) => {
    const preset = resolveMetaPreset(presetId);
    if (!preset) return;
    const sessionUiPatch = (sessionMetaOverrides[presetId]?.uiPatch ?? {}) as Partial<typeof nParamsUI>;

    setActiveMetaPresetId(presetId);
    setActiveOvertoneMixer("drone");

    if (preset.tParams) {
      setTParams(preset.tParams);
    }
    if (typeof preset.myzelEnabled === "boolean") {
      topologyLoopErrorRef.current = null;
      setSystemState("Fließendes Myzel");
      setMyzelEnabled(preset.myzelEnabled);
    }
    if (preset.myzelPattern) setMyzelPattern(preset.myzelPattern);
    if (preset.myzelBallMode) setMyzelBallMode(preset.myzelBallMode);
    if (preset.myzelNodeMode) setMyzelNodeMode(preset.myzelNodeMode);
    if (typeof preset.myzelStep16ths === "number") setMyzelStep16ths(preset.myzelStep16ths);
    if (typeof preset.droneVolume === "number") setDroneVolume(preset.droneVolume);
    if (typeof preset.waveSoundEnabled === "boolean") setWaveSoundEnabled(preset.waveSoundEnabled);
    if (typeof preset.waveSoundVolume === "number") setWaveSoundVolume(preset.waveSoundVolume);
    setWaveSoundPreset(preset.waveSoundPreset);
    if (typeof preset.quantizeGrid === "number") {
      setQuantizeGridMode(preset.quantizeGrid);
    }
    if (typeof preset.gridTempoBpm === "number") {
      setGridTempoBpm(preset.gridTempoBpm);
    }
    if (preset.room3Body) {
      if (typeof preset.room3Body.enabled === "boolean") {
        setRoom3BodyEnabled(preset.room3Body.enabled);
      }
      if (preset.room3Body.controls) {
        setRoom3BodyControls((prev) => ({ ...prev, ...preset.room3Body?.controls }));
      }
    }
    if (preset.collectiveMemory) {
      if (typeof preset.collectiveMemory.enabled === "boolean") setCollectiveMemoryEnabled(preset.collectiveMemory.enabled);
      if (typeof preset.collectiveMemory.window === "number") setCollectiveMemoryWindow(preset.collectiveMemory.window);
      setCollectiveMemoryUi((prev) => ({
        ...prev,
        ...(preset.collectiveMemory?.drone ? { drone: { ...prev.drone, ...preset.collectiveMemory.drone } } : {}),
        ...(preset.collectiveMemory?.particles ? { particles: { ...prev.particles, ...preset.collectiveMemory.particles } } : {}),
        ...(preset.collectiveMemory?.waves ? { waves: { ...prev.waves, ...preset.collectiveMemory.waves } } : {}),
        ...(preset.collectiveMemory?.myzel ? { myzel: { ...prev.myzel, ...preset.collectiveMemory.myzel } } : {}),
      }));
    }
    if (preset.spiral) {
      if (typeof preset.spiral.enabled === "boolean") setPsychedelicSpiralEnabled(preset.spiral.enabled);
      if (typeof preset.spiral.follow === "number") setPsychedelicSpiralFollow(preset.spiral.follow);
      setPsychedelicSpiralUi((prev) => ({
        ...prev,
        ...(typeof preset.spiral?.drive === "number" ? { drive: preset.spiral.drive } : {}),
        ...(typeof preset.spiral?.color === "number" ? { color: preset.spiral.color } : {}),
        ...(typeof preset.spiral?.motion === "number" ? { motion: preset.spiral.motion } : {}),
        ...(typeof preset.spiral?.feedback === "number" ? { feedback: preset.spiral.feedback } : {}),
        ...(typeof preset.spiral?.bloom === "number" ? { bloom: preset.spiral.bloom } : {}),
        ...(typeof preset.spiral?.mix === "number" ? { mix: preset.spiral.mix } : {}),
        ...(typeof preset.spiral?.stereoWidth === "number" ? { stereoWidth: preset.spiral.stereoWidth } : {}),
        ...(typeof preset.spiral?.outputGain === "number" ? { outputGain: preset.spiral.outputGain } : {}),
        ...(preset.spiral?.drone ? { drone: { ...prev.drone, ...preset.spiral.drone } } : {}),
        ...(preset.spiral?.particles ? { particles: { ...prev.particles, ...preset.spiral.particles } } : {}),
        ...(preset.spiral?.waves ? { waves: { ...prev.waves, ...preset.spiral.waves } } : {}),
        ...(preset.spiral?.myzel ? { myzel: { ...prev.myzel, ...preset.spiral.myzel } } : {}),
      }));
    }
    if (preset.transientDrive) {
      setTransientDriveUi((prev) => ({
        ...prev,
        ...(preset.transientDrive?.drone ? { drone: { ...prev.drone, ...preset.transientDrive.drone } } : {}),
        ...(preset.transientDrive?.particles ? { particles: { ...prev.particles, ...preset.transientDrive.particles } } : {}),
        ...(preset.transientDrive?.waves ? { waves: { ...prev.waves, ...preset.transientDrive.waves } } : {}),
        ...(preset.transientDrive?.myzel ? { myzel: { ...prev.myzel, ...preset.transientDrive.myzel } } : {}),
      }));
    }
    if (preset.liveMastering) {
      if (typeof preset.liveMastering.enabled === "boolean") setLiveMasteringEnabled(preset.liveMastering.enabled);
      if (typeof preset.liveMastering.strength === "number") setLiveMasteringStrength(preset.liveMastering.strength);
      if (typeof preset.liveMastering.glue === "number") setLiveMasteringGlue(preset.liveMastering.glue);
      if (typeof preset.liveMastering.air === "number") setLiveMasteringAir(preset.liveMastering.air);
    }

    const patch = preset.nexusPatch ?? {};
    const resolvedGridTuning = patch.gridTuning ?? nexusParamsRef.current.gridTuning;
    const resolvedGridMode = patch.gridMode ?? nexusParamsRef.current.gridMode;
    const resolvedParticleSystem = patch.particleSystem ?? nexusParamsRef.current.particleSystem;
    const resolvedChurchMode = patch.churchMode ?? nexusParamsRef.current.churchMode;

    if (patch.gridTuning) {
      changeGridTuning(patch.gridTuning);
    }
    if (patch.gridMode) {
      setGridMode(patch.gridMode);
    }
    if (patch.particleSystem) {
      setParticleSystem(patch.particleSystem);
    }
    if (patch.churchMode) {
      setChurchMode(patch.churchMode);
    }

    const defaultDroneMix = { ...(initialOvertonesByPreset.current[preset.dronePreset] ?? createEmptyOvertoneMix()) };
    const nextDroneMix = createMetaOvertoneMix({
      ...defaultDroneMix,
      ...(preset.droneOvertones ?? {}),
    });
    const nextWaveMix = createMetaOvertoneMix({
      ...(preset.waveOvertones ?? {}),
    });
    const nextGridMutes = buildGridMuteList(resolvedGridTuning, resolvedGridMode, preset.gridAllowedSteps);
    const nextGridOffsets = buildGridOffsets(resolvedGridTuning, preset.gridOffsets);
    const particleNodes = getParticleNodes(resolvedParticleSystem);
    const fallbackEnabled = deriveModeMask(resolvedChurchMode, resolvedParticleSystem).slice(0, particleNodes.length);
    const nextAgentEnabled = preset.agentEnabledSteps && preset.agentEnabledSteps.length
      ? Array.from({ length: particleNodes.length }, (_, idx) => preset.agentEnabledSteps?.includes(idx) ?? false)
      : fallbackEnabled;
    const nextAgentVolumes = Array.from({ length: particleNodes.length }, (_, idx) => {
      const explicit = preset.agentVolumes?.[idx];
      if (typeof explicit === "number") return clamp(explicit, 0, 1.5);
      return nextAgentEnabled[idx] ? 1 : 0;
    });

    nexusRefs.current.agents.forEach((agent, idx) => {
      if (idx >= nextAgentEnabled.length) {
        agent.lastHit = Number.POSITIVE_INFINITY;
        return;
      }
      agent.lastHit = nextAgentEnabled[idx] ? 0 : Number.POSITIVE_INFINITY;
    });

    updateNParams({
      ...patch,
      ...sessionUiPatch,
      quantizeBpm: preset.gridTempoBpm ?? patch.quantizeBpm ?? nexusParamsRef.current.quantizeBpm,
      dronePreset: preset.dronePreset,
      particlePreset: preset.particlePreset,
      droneJIOvertones: nextDroneMix,
      droneJIOvertonesByPreset: {
        ...nexusParamsRef.current.droneJIOvertonesByPreset,
        [preset.dronePreset]: nextDroneMix,
      },
      waveOvertones: nextWaveMix,
      manualGridMutedSteps: nextGridMutes,
      manualGridStepOffsets: nextGridOffsets,
      agentEnabled: nextAgentEnabled,
      agentVolumes: nextAgentVolumes,
    });

    primeMyzelFromY(nexusRefs.current.cursorY, "toggle");
    requestAnimationFrame(() => {
      const refNow = nexusParamsRef.current;
      applyRealtimeDroneOvertones(refNow.droneJIOvertones, refNow.droneTimbre);
    });
  };

  const initAudio = async () => {
    if (!audioCtx) {
      const ctx = new window.AudioContext({ latencyHint: "interactive" });
      await ctx.resume();
      ensureFinalMixBus(ctx);
      audioCtxRef.current = ctx;
      setAudioCtx(ctx);
      return ctx;
    }
    if (audioCtx.state !== "running") {
      await audioCtx.resume();
    }
    audioCtxRef.current = audioCtx;
    ensureFinalMixBus(audioCtx);
    return audioCtx;
  };

  const scheduleSilentWarmTone = (ctx: AudioContext, destination: AudioNode, freq: number, offset: number, cutoff: number) => {
    const now = ctx.currentTime + offset;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = freq > 1200 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.setValueAtTime(freq > 1000 ? 1.2 : 0.8, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.00012, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    osc.onended = () => {
      try { osc.disconnect(); } catch {}
      try { filter.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    };
    osc.start(now);
    osc.stop(now + 0.18);
  };

  const prewarmAudioRuntime = async (ctx: AudioContext) => {
    if (audioWarmupDoneRef.current) return;
    if (audioWarmupPromiseRef.current) return audioWarmupPromiseRef.current;

    audioWarmupPromiseRef.current = (async () => {
      const mainBus = ensureFinalMixBus(ctx);
      const droneBus = getLiveMasterBus(ctx, "drone");
      const rhythmBus = getLiveMasterBus(ctx, "rhythm");
      const spaceBus = getLiveMasterBus(ctx, "space");

      // Prime the common short-tone path before the first dense user burst hits the graph.
      scheduleSilentWarmTone(ctx, mainBus, 220, 0.0, 1800);
      scheduleSilentWarmTone(ctx, mainBus, 660, 0.03, 2600);
      scheduleSilentWarmTone(ctx, droneBus, 110, 0.06, 900);
      scheduleSilentWarmTone(ctx, rhythmBus, 1800, 0.09, 5200);
      scheduleSilentWarmTone(ctx, spaceBus, 440, 0.12, 2400);

      // Also instantiate the regular drone/body buses once so the first user gesture is not paying that cost.
      applyRealtimeDroneOvertones();
      ensureMyzelSynth(ctx);

      await new Promise<void>((resolve) => window.setTimeout(resolve, 260));
      audioWarmupDoneRef.current = true;
      audioWarmupPromiseRef.current = null;
    })();

    return audioWarmupPromiseRef.current;
  };

  const ensureAudioReady = async () => {
    const ctx = await initAudio();
    if (ctx.state !== "running") {
      await ctx.resume();
    }
    ensureFinalMixBus(ctx);
    return ctx;
  };

  const stopMaterialLoopPlayback = () => {
    if (materialLoopSourceRef.current) {
      try { materialLoopSourceRef.current.stop(); } catch {}
      try { materialLoopSourceRef.current.disconnect(); } catch {}
      materialLoopSourceRef.current = null;
    }
    if (materialLoopGainRef.current) {
      try { materialLoopGainRef.current.disconnect(); } catch {}
      materialLoopGainRef.current = null;
    }
  };

  const getMaterialLoopInterpretationFactor = (mode: "normal" | "double" | "half") => {
    if (mode === "double") return 0.5;
    if (mode === "half") return 2;
    return 1;
  };

  const getEffectiveMaterialLoopBars = (entry: { bars: number } | null, mode: "normal" | "double" | "half") => {
    const baseBars = Math.max(1, Number(entry?.bars) || 1);
    return Math.max(0.25, baseBars * getMaterialLoopInterpretationFactor(mode));
  };

  const formatMaterialLoopBars = (bars: number) => {
    const rounded = Math.round(bars * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
  };

  useEffect(() => {
    if (!exportedLoopMaterials.length) {
      if (nexusParamsRef.current.materialLoopId) {
        updateNParams({ materialLoopId: '', materialLoopActive: false });
      }
      pendingRegisteredLoopIdRef.current = '';
      return;
    }
    const currentId = nexusParamsRef.current.materialLoopId;
    if (currentId && exportedLoopMaterials.some((entry) => entry.id === currentId)) return;
    const pendingId = pendingRegisteredLoopIdRef.current;
    const preferred = pendingId ? exportedLoopMaterials.find((entry) => entry.id === pendingId)?.id ?? '' : '';
    if (preferred) pendingRegisteredLoopIdRef.current = '';
    updateNParams({
      materialLoopId: preferred || exportedLoopMaterials[0].id,
      materialLoopActive: nexusParamsRef.current.materialLoopActive || !!preferred,
    });
  }, [exportedLoopMaterials]);

  useEffect(() => {
    const entry = selectedLoopMaterial;
    const ctx = audioCtxRef.current ?? audioCtx;

    if (!ctx || !nexusActive || !nParamsUI.materialLoopActive || !entry) {
      stopMaterialLoopPlayback();
      return;
    }

    let cancelled = false;
    const token = materialLoopTokenRef.current + 1;
    materialLoopTokenRef.current = token;

    const startLoop = async () => {
      let buffer = materialLoopCacheRef.current.get(entry.id);
      if (!buffer) {
        const data = await entry.blob.arrayBuffer();
        buffer = await ctx.decodeAudioData(data.slice(0));
        materialLoopCacheRef.current.set(entry.id, buffer);
      }
      if (cancelled || materialLoopTokenRef.current !== token) return;

      stopMaterialLoopPlayback();

      const barDur = (60 / Math.max(40, nParamsUI.quantizeBpm || 108)) * 4;
      const interpretedBars = getEffectiveMaterialLoopBars(entry, nParamsUI.materialLoopTimeMode);
      const desiredLoopDur = Math.max(0.25, barDur * interpretedBars);
      const loopStart = Math.max(0, Math.min(buffer.duration - 0.01, entry.loopStartSec ?? 0));
      const loopEnd = Math.max(loopStart + 0.01, Math.min(buffer.duration, entry.loopEndSec ?? buffer.duration));
      const sourceDuration = Math.max(0.01, loopEnd - loopStart);
      const playbackRate = clamp(sourceDuration / desiredLoopDur, 0.125, 8);

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;
      source.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);
      gain.gain.setValueAtTime(Math.max(0.0001, nParamsUI.materialLoopVolume), ctx.currentTime);
      source.connect(gain);
      gain.connect(getLiveMasterBus(ctx, "rhythm"));
      ensureMyzelPostFxRouter(ctx);
      if (myzelPostFxSendsRef.current.forge) {
        gain.connect(myzelPostFxSendsRef.current.forge);
      }

      materialLoopSourceRef.current = source;
      materialLoopGainRef.current = gain;

      const now = ctx.currentTime;
      const startAt = nParamsUI.materialLoopSyncToBeat
        ? Math.ceil((now + 1e-6) / barDur) * barDur
        : now + 0.01;

      source.onended = () => {
        if (materialLoopSourceRef.current === source) {
          try { source.disconnect(); } catch {}
          materialLoopSourceRef.current = null;
        }
        if (materialLoopGainRef.current === gain) {
          try { gain.disconnect(); } catch {}
          materialLoopGainRef.current = null;
        }
      };

      source.start(startAt, loopStart);
    };

    void startLoop().catch((error) => {
      console.error("[xensonar][material-loop]", error);
      stopMaterialLoopPlayback();
    });

    return () => {
      cancelled = true;
      materialLoopTokenRef.current += 1;
      stopMaterialLoopPlayback();
    };
  }, [audioCtx, nexusActive, nParamsUI.materialLoopActive, nParamsUI.materialLoopId, nParamsUI.materialLoopSyncToBeat, nParamsUI.materialLoopTimeMode, nParamsUI.materialLoopVolume, nParamsUI.quantizeBpm, selectedLoopMaterial]);

  const ensureRecordingDestination = (ctx: AudioContext, mode: RecordingSourceMode) => {
    if (mode === "without_drums") {
      if (!recordingDestinationWithoutDrumsRef.current) {
        const destination = ctx.createMediaStreamDestination();
        ensureNoDrumRecordTap(ctx)?.connect(destination);
        recordingDestinationWithoutDrumsRef.current = destination;
      }
      return recordingDestinationWithoutDrumsRef.current;
    }
    if (!recordingDestinationWithDrumsRef.current) {
      const destination = ctx.createMediaStreamDestination();
      (finalOutputTrimRef.current ?? ensureFinalMixBus(ctx)).connect(destination);
      recordingDestinationWithDrumsRef.current = destination;
    }
    return recordingDestinationWithDrumsRef.current;
  };

  const stopRecording = () => {
    if (recordingStopTimerRef.current !== null) {
      window.clearTimeout(recordingStopTimerRef.current);
      recordingStopTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    setRecordingState((prev) => ({ ...prev, isRecording: false }));
  };

  const startRecording = async () => {
    try {
      const ctx = await ensureAudioReady();
      const mode = recordingSourceMode;
      lastRecordingSourceModeRef.current = mode;
      const destination = ensureRecordingDestination(ctx, mode);
      if (!destination) return;

      recordedBufferRef.current = null;
      recordingChunksRef.current = [];
      recordingStartAtRef.current = performance.now();
      recordingMarkersRef.current = [];
      setRecordingMarkers([]);
      setRecordingWaveform([]);
      setRecordingCrop(null);
      setRecordingCropDraft(null);
      setRecordingPlayheadMs(0);
      updateRecordingPreviewUrl(null);

      const mimeType = getSupportedRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(destination.stream, { mimeType }) : new MediaRecorder(destination.stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setRecordingState((prev) => ({ ...prev, isRecording: false, exportStatus: "error", exportMessage: "Recorder-Fehler." }));
      };
      recorder.onstop = async () => {
        try {
          const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
          updateRecordingPreviewUrl(blob);
          const arrayBuffer = await blob.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
          recordedBufferRef.current = decoded;
          setRecordingWaveform(buildWaveformPeaks(decoded));
          setRecordingPlayheadMs(0);
          const markerCount = recordingMarkersRef.current.length;
          const modeLabel = lastRecordingSourceModeRef.current === "without_drums" ? "ohne Drums" : "mit Drums";
          setRecordingState((prev) => ({
            ...prev,
            isRecording: false,
            durationMs: Math.min(MAX_RECORDING_MS, Math.round(decoded.duration * 1000)),
            hasTake: decoded.duration > 0,
            exportStatus: "ready",
            exportMessage: markerCount > 0 ? `Take bereit (${modeLabel}, ${markerCount} Marker).` : `Take bereit (${modeLabel}).`,
          }));
        } catch {
          updateRecordingPreviewUrl(null);
          setRecordingState((prev) => ({ ...prev, isRecording: false, hasTake: false, exportStatus: "error", exportMessage: "Take konnte nicht dekodiert werden." }));
        }
      };

      recorder.start(250);
      recordingStopTimerRef.current = window.setTimeout(() => stopRecording(), MAX_RECORDING_MS);
      const modeLabel = mode === "without_drums" ? "ohne Drums" : "mit Drums";
      setRecordingState((prev) => ({ ...prev, isRecording: true, hasTake: false, durationMs: 0, exportStatus: "idle", exportMessage: `Aufnahme laeuft (${modeLabel})...` }));
    } catch {
      setRecordingState((prev) => ({ ...prev, isRecording: false, exportStatus: "error", exportMessage: "Audio konnte nicht initialisiert werden." }));
    }
  };

  const downloadRecordingWav = () => {
    downloadBufferRangeWav(null);
  };

  const downloadRecordingCropWav = () => {
    if (!recordingCrop) return;
    downloadBufferRangeWav(recordingCrop);
  };

  const triggerLogoMarkerPulse = () => {
    const id = `logo-pulse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setLogoMarkerPulses((prev) => [...prev, { id }]);
    window.setTimeout(() => {
      setLogoMarkerPulses((prev) => prev.filter((pulse) => pulse.id !== id));
    }, 1200);
  };

  const triggerSideMarkerPulse = (side: "left" | "right") => {
    const id = `side-pulse-${side}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setSideMarkerPulses((prev) => [...prev, { id, side }]);
    window.setTimeout(() => {
      setSideMarkerPulses((prev) => prev.filter((pulse) => pulse.id !== id));
    }, 1200);
  };

  const addRecordingMarker = (source: "key" | "logo" | "side" = "key") => {
    if (!recordingState.isRecording) return false;
    const startedAt = recordingStartAtRef.current ?? performance.now();
    const timeMs = clamp(Math.round(performance.now() - startedAt), 0, MAX_RECORDING_MS);
    setRecordingMarkers((prev) => {
      const nextMarker: RecordingMarker = {
        id: `marker-${timeMs}-${prev.length + 1}`,
        timeMs,
        usedInCrop: false,
      };
      const next = [...prev, nextMarker];
      recordingMarkersRef.current = next;
      const sourceLabel = source === "logo" ? " · Logo" : source === "side" ? " · Rand" : "";
      setRecordingState((state) => ({ ...state, exportMessage: `Marker M${next.length} @ ${formatDuration(timeMs)}${sourceLabel}` }));
      return next;
    });
    if (source === "logo") triggerLogoMarkerPulse();
    return true;
  };

  useEffect(() => {
    if (!recordingState.isRecording) return;
    let raf = 0;
    const tick = () => {
      const startedAt = recordingStartAtRef.current ?? performance.now();
      setRecordingState((prev) => ({ ...prev, durationMs: clamp(Math.round(performance.now() - startedAt), 0, MAX_RECORDING_MS) }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [recordingState.isRecording]);


  useEffect(() => {
    if (!recordingState.isRecording) return;
    const handleRecordingMarkerKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || isForgeHotkeyTarget(event.target)) return;
      const isMarkerHotkey = event.code === "F9" || event.key === "F9";
      if (!isMarkerHotkey) return;
      event.preventDefault();
      addRecordingMarker("key");
    };

    window.addEventListener("keydown", handleRecordingMarkerKey);
    return () => window.removeEventListener("keydown", handleRecordingMarkerKey);
  }, [recordingState.isRecording]);

  useEffect(() => {
    if (!recordingPreviewUrl) {
      setRecordingPlayheadMs(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      const el = recordingPreviewAudioRef.current;
      if (el) setRecordingPlayheadMs(clamp(Math.round(el.currentTime * 1000), 0, timelineDurationMs()));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [recordingPreviewUrl, recordingState.durationMs]);

  useEffect(() => {
    return () => {
      if (recordingStopTimerRef.current !== null) window.clearTimeout(recordingStopTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
      if (recordingPreviewUrlRef.current) {
        URL.revokeObjectURL(recordingPreviewUrlRef.current);
        recordingPreviewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!audioCtx) return;
    ensureFinalMixBus(audioCtx);
    ensureCollectiveMemoryFx(audioCtx);
    ensureTransientDriveDevice(audioCtx);
    ensureEnterHoldPsyFxDevice(audioCtx);
    ensureSchwarmdeuterDevice(audioCtx);
    const spiralDevice = ensurePsychedelicSpiralDevice(audioCtx);
    if (!spiralDevice) return;

    collectiveMemoryWindowRef.current = collectiveMemoryWindow;

    let lastCollectiveUiPush = 0;
    let lastSpiralUiPush = 0;
    let lastSchwarmUiPush = 0;
    let lastMyzelPostFxUiPush = 0;
    let lastMasterUiPush = 0;

    const scheduler = createControlScheduler({
      getAudioNow: () => audioCtx.currentTime,
      shouldRun: () => audioCtx.state === "running",
      onMetrics: (metrics) => {
        setControlPerfMonitor(metrics);
      },
      tasks: [
        {
          id: "collective-memory",
          intervalMs: 180,
          run: ({ audioNow, perfNow }) => {
            const fx = collectiveFxRef.current;
            const hasActiveRoute = collectiveMemoryEnabled && (Object.entries(collectiveMemoryUi) as Array<[keyof typeof collectiveMemoryUi, (typeof collectiveMemoryUi)[keyof typeof collectiveMemoryUi]]>).some(([, config]) => config.enabled && (config.send > 0.002 || config.wet > 0.002));

            (Object.entries(collectiveMemoryUi) as Array<[keyof typeof collectiveMemoryUi, (typeof collectiveMemoryUi)[keyof typeof collectiveMemoryUi]]>).forEach(([key, config]) => {
              const device = fx[key];
              if (!device) return;
              const active = hasActiveRoute && config.enabled;
              device.setSendLevel(active ? config.send : 0);
              device.setWet(active ? config.wet : 0);
            });

            if (!hasActiveRoute) {
              collectiveMemorySummaryRef.current = null;
              if (perfNow - lastCollectiveUiPush > 420) {
                lastCollectiveUiPush = perfNow;
                setCollectiveMemoryMonitor(null);
              }
              return;
            }

            const probe = finalMixProbeRef.current;
            if (!probe) return;
            const frame = readDescriptorProbe(probe, audioNow);
            pushDescriptorFrame(collectiveMemoryFramesRef.current, frame, collectiveMemoryWindowRef.current);
            const memory = summarizeDescriptorHistory(collectiveMemoryFramesRef.current, collectiveMemoryWindowRef.current);
            collectiveMemorySummaryRef.current = memory;
            (Object.values(fx).filter(Boolean) as CollectiveMemoryEffect[]).forEach((device) => device.updateFromMemory(memory, audioNow));
            if (perfNow - lastCollectiveUiPush > 360) {
              lastCollectiveUiPush = perfNow;
              setCollectiveMemoryMonitor(memory);
            }
          },
        },
        {
          id: "psychedelic-spiral",
          intervalMs: 66,
          run: ({ audioNow, perfNow }) => {
            const device = psychedelicSpiralRef.current;
            if (!device) return;

            const snapshot = myceliumSnapshotRef.current;
            const body = room3TimbreStateRef.current;
            const follow = clamp(psychedelicSpiralFollow, 0, 1);
            const effective = {
              enabled: psychedelicSpiralEnabled,
              drive: clamp(psychedelicSpiralUi.drive + follow * (body.saturationPre * 0.26 + snapshot.maxEnergy * 0.18), 0, 1),
              color: clamp(psychedelicSpiralUi.color + follow * (body.air * 0.16 + snapshot.constellationBrightness * 0.22), 0, 1),
              motion: clamp(psychedelicSpiralUi.motion + follow * (snapshot.constellationFlux * 0.28 + (1 - body.driftCoherence) * 0.24), 0, 1),
              feedback: clamp(psychedelicSpiralUi.feedback + follow * (snapshot.constellationTension * 0.2 + body.inharmonicity * 0.18), 0, 1),
              bloom: clamp(psychedelicSpiralUi.bloom + follow * (body.resonanceFocus * 0.22 + body.bodyMix * 0.18), 0, 1),
              mix: clamp(psychedelicSpiralUi.mix, 0, 1),
              stereoWidth: clamp(psychedelicSpiralUi.stereoWidth + follow * (body.partialGroups.shimmer * 0.08 + snapshot.constellationFlux * 0.08), 0, 1),
              outputGain: clamp(psychedelicSpiralUi.outputGain, 0, 1.5),
            };
            device.setOptions(effective);

            const sourceStates = {
              drone: psychedelicSpiralUi.drone,
              particles: psychedelicSpiralUi.particles,
              waves: psychedelicSpiralUi.waves,
              myzel: psychedelicSpiralUi.myzel,
            };
            (Object.keys(sourceStates) as Array<keyof typeof sourceStates>).forEach((key) => {
              const sendNode = psychedelicSpiralSendsRef.current[key];
              if (!sendNode) return;
              const cfg = sourceStates[key];
              const level = psychedelicSpiralEnabled && cfg.enabled ? cfg.send : 0;
              sendNode.gain.setTargetAtTime(level, audioNow, 0.08);
            });

            if (perfNow - lastSpiralUiPush > 320) {
              lastSpiralUiPush = perfNow;
              setPsychedelicSpiralMonitor({
                drive: effective.drive,
                color: effective.color,
                motion: effective.motion,
                feedback: effective.feedback,
                bloom: effective.bloom,
                mix: effective.mix,
                width: effective.stereoWidth,
              });
            }
          },
        },
        {
          id: "transient-drive",
          intervalMs: 74,
          run: ({ audioNow }) => {
            const device = transientDriveFxRef.current;
            if (!device) return;
            const snapshot = myceliumSnapshotRef.current;
            const body = room3TimbreStateRef.current;
            updateTransientDriveDevice(device, audioNow, {
              enabled: !!nParamsUI.droneDriveOn,
              amount: nParamsUI.droneDriveAmount ?? 0.36,
              tone: nParamsUI.droneDriveTone ?? 0.56,
              mix: clamp((nParamsUI.droneDriveMix ?? 0.48) * 0.9, 0, 1),
              output: nParamsUI.droneDriveOutput ?? 0.9,
              myzelGate: myzelEnabled ? myzelGateRef.current : 0,
              shimmer: myzelEnabled ? (myzelLayerModRef.current?.shimmer ?? 0) : 0,
              bodyCoupling: room3BodyEnabled ? room3BodyControlsRef.current.coupling : 0,
              bodyFlux: room3BodyEnabled ? snapshot.constellationFlux : 0,
              bodyTension: room3BodyEnabled ? snapshot.constellationTension : 0,
              bodyRoughness: room3BodyEnabled ? room3BodyControlsRef.current.roughness : 0,
              resonanceFocus: room3BodyEnabled ? body.resonanceFocus : 0.5,
            });

            const sourceStates = {
              drone: transientDriveUi.drone,
              particles: transientDriveUi.particles,
              waves: transientDriveUi.waves,
              myzel: transientDriveUi.myzel,
            };
            (Object.keys(sourceStates) as Array<keyof typeof sourceStates>).forEach((key) => {
              const sendNode = transientDriveSendsRef.current[key];
              if (!sendNode) return;
              const cfg = sourceStates[key];
              const level = nParamsUI.droneDriveOn && cfg.enabled ? cfg.send : 0;
              sendNode.gain.setTargetAtTime(level, audioNow, 0.08);
            });
          },
        },
        {
          id: "enter-psyfx",
          intervalMs: 72,
          run: ({ audioNow }) => {
            const device = enterHoldPsyFxRef.current;
            if (!device) return;
            device.setOptions({
              enabled: enterHoldPsyFxEnabled,
              bpm: Math.max(40, nexusParamsRef.current.quantizeBpm),
              depth: enterHoldPsyFxUi.depth,
              color: enterHoldPsyFxUi.color,
              flicker: enterHoldPsyFxUi.flicker,
              mix: enterHoldPsyFxUi.mix,
              bassMotion: enterHoldPsyFxUi.bassMotion,
              outputGain: enterHoldPsyFxUi.outputGain,
            }, audioNow);
            if (enterHoldPsyFxSendsRef.current.waves) {
              enterHoldPsyFxSendsRef.current.waves.gain.setTargetAtTime(enterHoldPsyFxEnabled ? enterHoldPsyFxUi.waveSend : 0, audioNow, 0.08);
            }
            if (enterHoldPsyFxSendsRef.current.bass) {
              enterHoldPsyFxSendsRef.current.bass.gain.setTargetAtTime(enterHoldPsyFxEnabled && enterHoldPsyFxUi.bassLink ? enterHoldPsyFxUi.bassSend : 0, audioNow, 0.08);
            }
          },
        },
        {
          id: "schwarmdeuter",
          intervalMs: clamp(schwarmUi.updateMs, 80, 260),
          run: ({ audioNow, perfNow }) => {
            const device = schwarmdeuterRef.current;
            if (!device) return;
            const sourceStates = {
              drone: schwarmUi.drone,
              particles: schwarmUi.particles,
              waves: schwarmUi.waves,
              myzel: schwarmUi.myzel,
            };
            const hasActiveRoute = schwarmEnabled && (Object.values(sourceStates) as Array<{ enabled: boolean; send: number }>).some((cfg) => cfg.enabled && cfg.send > 0.002);
            (Object.keys(sourceStates) as Array<keyof typeof sourceStates>).forEach((key) => {
              const sendNode = schwarmdeuterSendsRef.current[key];
              if (!sendNode) return;
              const cfg = sourceStates[key];
              sendNode.gain.setTargetAtTime(hasActiveRoute && cfg.enabled ? cfg.send : 0, audioNow, 0.08);
            });
            device.setParams({
              amount: schwarmUi.amount,
              interpretiveBias: schwarmUi.interpretiveBias,
              sensitivity: schwarmUi.sensitivity,
              memorySeconds: schwarmUi.memorySeconds,
              densityBias: schwarmUi.densityBias,
              weave: schwarmUi.weave,
              material: schwarmUi.material,
              bypass: !hasActiveRoute,
            });
            if (!hasActiveRoute) {
              if (perfNow - lastSchwarmUiPush > 420) {
                lastSchwarmUiPush = perfNow;
                setSchwarmMonitor(null);
              }
              return;
            }
            const particles = collectSchwarmSnapshots();
            const state = device.update({
              time: audioNow,
              dt: Math.max(1 / 120, clamp(schwarmUi.updateMs, 80, 260) / 1000),
              bounds: { width: GAME_WIDTH, height: GAME_HEIGHT },
              particles,
            });
            if (perfNow - lastSchwarmUiPush > 320) {
              lastSchwarmUiPush = perfNow;
              setSchwarmMonitor(state);
            }
          },
        },

        {
          id: "myzel-post-fx",
          intervalMs: 78,
          run: ({ audioNow, perfNow }) => {
            const router = myzelPostFxRouterRef.current;
            if (!router) return;
            const sourceLevels = {
              particles: clamp(nParamsUI.particleVolume / Math.max(0.001, PARTICLE_VOLUME_MAX), 0, 1),
              drone: clamp(droneVolume, 0, 1),
              waves: waveSoundEnabled ? clamp(waveSoundVolume * 2.4, 0, 1) : 0,
              myzel: myzelEnabled ? clamp((myzelInterpreterMixRef.current.hybridBlend * 0.35) + (myzelInterpreterMixRef.current.weaveBlend * 0.25) + (myzelInterpreterMixRef.current.driveAmount * 0.25) + ((myzelLayerModRef.current?.shimmer ?? 0) * 0.15), 0, 1) : 0,
              forge: nParamsUI.materialLoopActive ? clamp(nParamsUI.materialLoopVolume * 2.4, 0, 1) : 0,
            };
            const telemetry = updateMyzelPostFxRouter(router, {
              enabled: myzelPostFxEnabled,
              focusGroup: myzelPostFxGroup,
              depth: myzelPostFxDepth,
              parallel: myzelPostFxParallel,
              sourceLevels,
              liveMasterShares: {
                main: liveMasterMonitor.main,
                drone: liveMasterMonitor.drone,
                rhythm: liveMasterMonitor.rhythm,
                space: liveMasterMonitor.space,
              },
            }, audioNow);
            if (perfNow - lastMyzelPostFxUiPush > 320) {
              lastMyzelPostFxUiPush = perfNow;
              setMyzelPostFxMonitor({ ...telemetry });
            }
          },
        },

        {
          id: "live-mastering",
          intervalMs: 84,
          run: ({ audioNow, perfNow }) => {
            const liveMaster = liveMasteringRef.current;
            if (!liveMaster) return;
            const telemetry = updateLiveMasteringSystem(liveMaster, {
              enabled: liveMasteringEnabled,
              strength: liveMasteringStrength,
              glue: liveMasteringGlue,
              air: liveMasteringAir,
            }, audioNow);
            finalOutputTrimRef.current?.gain.setTargetAtTime(telemetry.trim, audioNow, 0.18);
            if (perfNow - lastMasterUiPush > 320) {
              lastMasterUiPush = perfNow;
              setLiveMasterMonitor({ ...telemetry });
            }
          },
        },
      ],
    });

    scheduler.start();
    return () => {
      scheduler.stop();
    };
  }, [
    audioCtx,
    collectiveMemoryEnabled,
    collectiveMemoryWindow,
    collectiveMemoryUi,
    psychedelicSpiralEnabled,
    psychedelicSpiralFollow,
    psychedelicSpiralUi,
    transientDriveUi,
    nParamsUI.droneDriveOn,
    nParamsUI.droneDriveAmount,
    nParamsUI.droneDriveTone,
    nParamsUI.droneDriveMix,
    nParamsUI.droneDriveOutput,
    myzelEnabled,
    room3BodyEnabled,
    myzelPostFxEnabled,
    myzelPostFxGroup,
    myzelPostFxDepth,
    myzelPostFxParallel,
    droneVolume,
    waveSoundEnabled,
    waveSoundVolume,
    nParamsUI.materialLoopActive,
    nParamsUI.materialLoopVolume,
    nParamsUI.particleVolume,
    liveMasteringEnabled,
    liveMasteringStrength,
    liveMasteringGlue,
    liveMasteringAir,
    schwarmEnabled,
    schwarmUi,
  ]);

  const playScheduledTone = (
    freq: number,
    offset: number,
    dur: number,
    type: OscillatorType,
    volume: number,
    q = 1,
    cutoff = 2400,
    targetDestinations?: AudioNode | Array<AudioNode | null | undefined> | null,
    options?: {
      source?: TransientSource;
      plan?: TransientEventPlan | null;
      prominence?: number;
    },
  ) => {
    const ctx = audioCtxRef.current ?? audioCtx;
    if (!ctx) return false;
    const activeCount = activeScheduledTonesRef.current.length;
    const mainOutput = ensureFinalMixBus(ctx);
    const now = ctx.currentTime + offset;
    const heldLong = longToneHoldRef.current;
    let ticket: TransientVoiceHandle | null = null;
    let overloadSoftening = 1;
    let gainScale = 1;
    let auxTargets = Array.isArray(targetDestinations)
      ? targetDestinations
      : targetDestinations
        ? [targetDestinations]
        : [];

    if (options?.plan && options?.source) {
      ticket = transientRuntimeRef.current.admitVoice(options.plan, options.prominence ?? 1);
      if (!ticket) return false;
      overloadSoftening = ticket.plan.envelopeScale;
      gainScale = ticket.plan.gainScale;
      auxTargets = transientRuntimeRef.current.pickTargets(auxTargets, ticket);
    } else {
      const fallbackLoad = activeCount >= 72 ? 1.35 : 1;
      overloadSoftening = fallbackLoad;
      if (activeCount >= 120) return false;
      if (activeCount >= 92) auxTargets = auxTargets.slice(0, 1);
      else if (activeCount >= 72) auxTargets = auxTargets.slice(0, 2);
    }

    const actualDur = heldLong ? dur * 6 : dur;
    const attackDur = Math.min(0.032, Math.max(0.005, actualDur * 0.18 * overloadSoftening));
    const releaseDur = Math.min(0.14, Math.max(0.03, actualDur * 0.42 * overloadSoftening));
    const peakAt = now + attackDur;
    const isWaveSource = options?.source === "wave";
    const useDecayEnvelope = isWaveSource;
    const releaseStart = useDecayEnvelope
      ? peakAt
      : now + Math.max(attackDur + 0.006, actualDur - releaseDur);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.setValueAtTime(q, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * gainScale), peakAt);
    if (useDecayEnvelope) {
      gain.gain.exponentialRampToValueAtTime(0.0001, now + actualDur);
    } else {
      gain.gain.setTargetAtTime(0.0001, releaseStart, Math.max(0.01, releaseDur * 0.34));
    }
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(mainOutput);
    auxTargets.forEach((target) => {
      if (target && target !== mainOutput) gain.connect(target);
    });
    const activeTone = { osc, gain, filter, ticket };
    activeScheduledTonesRef.current.push(activeTone);
    const cleanup = () => {
      activeScheduledTonesRef.current = activeScheduledTonesRef.current.filter((entry) => entry !== activeTone);
      transientRuntimeRef.current.releaseVoice(ticket);
      try { osc.disconnect(); } catch {}
      try { filter.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    };
    const stopAt = useDecayEnvelope ? now + actualDur + 0.08 : releaseStart + releaseDur + 0.08;
    osc.onended = cleanup;
    osc.start(now);
    osc.stop(stopAt);
    return true;
  };

  const playParticleNoiseAccent = (
    baseFreq: number,
    offset: number,
    volume: number,
    psyBias: number,
    targetDestinations?: AudioNode | Array<AudioNode | null | undefined> | null,
  ) => {
    const ctx = audioCtxRef.current ?? audioCtx;
    const refs = nexusRefs.current;
    if (!ctx || !refs.noiseBuffer) return false;
    const intensity = clamp(psyBias, 0, 1);
    if (intensity <= 0.04 || volume <= 0.0001) return false;

    const mainOutput = ensureFinalMixBus(ctx);
    const auxTargets = Array.isArray(targetDestinations)
      ? targetDestinations
      : targetDestinations
        ? [targetDestinations]
        : [];
    const startAt = ctx.currentTime + offset;
    const source = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const bandpass = ctx.createBiquadFilter();
    const shaper = ctx.createWaveShaper();
    const gain = ctx.createGain();

    source.buffer = refs.noiseBuffer;
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(clamp(baseFreq * (2.8 + intensity * 2.1), 1100, 6200), startAt);
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(clamp(baseFreq * (4.8 + intensity * 3.8), 1800, 8400), startAt);
    bandpass.Q.setValueAtTime(0.8 + intensity * 4.6, startAt);
    shaper.curve = createSoftClipCurve(0.85 + intensity * 1.6);
    shaper.oversample = "2x";

    const peakAt = startAt + (0.0012 + (1 - intensity) * 0.0018);
    const endAt = startAt + (0.016 + intensity * 0.028);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * (0.02 + intensity * 0.11)), peakAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    source.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(shaper);
    shaper.connect(gain);
    gain.connect(mainOutput);
    auxTargets.forEach((target) => {
      if (target && target !== mainOutput) gain.connect(target);
    });

    const cleanup = () => {
      try { source.disconnect(); } catch {}
      try { highpass.disconnect(); } catch {}
      try { bandpass.disconnect(); } catch {}
      try { shaper.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    };
    source.onended = cleanup;
    source.start(startAt);
    source.stop(endAt + 0.02);
    return true;
  };

  const triggerRoom3BodyExciter = (
    profile: Room3ExciterProfile,
    freq: number,
    intensity: number,
    options?: { voiceBudget?: number; bodyScale?: number },
  ) => {
    if (!audioCtx || !myzelEnabled || !room3BodyEnabledRef.current) return;
    const refs = nexusRefs.current;
    const destination = refs.room3BodyExciterGain;
    if (!destination) return;

    const ctx = audioCtx;
    const now = ctx.currentTime;
    const bodyScale = clamp(options?.bodyScale ?? 1, 0, 1.25);
    const safeIntensity = clamp(intensity * bodyScale, 0, 1.4);
    if (safeIntensity <= 0.001) return;

    const modal = room3ModalStateRef.current;
    const controls = room3BodyControlsRef.current;
    const bodyScalar = 0.28 + controls.coupling * 0.72;
    const baseFreq = modal.modes[1]?.freq ?? modal.modes[0]?.freq ?? freq;

    const connectVoiceChain = (source: AudioNode, base: number, level: number, startAt: number) => {
      const bandpass = ctx.createBiquadFilter();
      const highpass = ctx.createBiquadFilter();
      const lowpass = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      bandpass.type = "bandpass";
      bandpass.frequency.setValueAtTime(foldFreqIntoRange(base * 0.78 + baseFreq * 0.22, 70, 6200), startAt);
      bandpass.Q.setValueAtTime(profile.q, startAt);
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(profile.highpassHz, startAt);
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(profile.lowpassHz, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(Math.max(0.0002, level), startAt + profile.attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + profile.duration);
      source.connect(bandpass);
      bandpass.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(destination);
      return () => {
        [bandpass, highpass, lowpass, gain].forEach((node) => {
          try { node.disconnect(); } catch {}
        });
      };
    };

    const selectedVoices = profile.voices.slice(0, Math.max(1, options?.voiceBudget ?? profile.voices.length));

    for (const voice of selectedVoices) {
      const osc = ctx.createOscillator();
      const startAt = now + (voice.delay ?? 0);
      const base = foldFreqIntoRange(freq * voice.ratio, 50, 4200);
      osc.type = voice.type;
      osc.frequency.setValueAtTime(base, startAt);
      if (voice.detuneCents) osc.detune.setValueAtTime(voice.detuneCents, startAt);
      const cleanup = connectVoiceChain(osc, base, safeIntensity * bodyScalar * profile.bodyGain * voice.gain, startAt);
      osc.start(startAt);
      osc.stop(startAt + profile.duration + 0.06);
      osc.onended = () => {
        try { osc.disconnect(); } catch {}
        cleanup();
      };
    }

    if (profile.noiseGain > 0 && refs.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = refs.noiseBuffer;
      const startAt = now;
      const cleanup = connectVoiceChain(noise, baseFreq * 1.4, safeIntensity * bodyScalar * profile.bodyGain * profile.noiseGain, startAt);
      noise.start(startAt);
      noise.stop(startAt + profile.duration + 0.04);
      noise.onended = () => {
        try { noise.disconnect(); } catch {}
        cleanup();
      };
    }
  };

  const releaseHeldScheduledTones = () => {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    for (const entry of activeScheduledTonesRef.current) {
      try {
        const current = Math.max(0.0001, entry.gain.gain.value || 0.0001);
        entry.gain.gain.cancelScheduledValues(now);
        entry.gain.gain.setValueAtTime(current, now);
        entry.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        entry.osc.stop(now + 0.22);
      } catch {}
    }
  };

  const clampFreq = (freq: number, min = 90, max = 1800) => {
    let out = freq;
    while (out < min) out *= 2;
    while (out > max) out *= 0.5;
    return out;
  };

  const edoFreq = (base: number, edo: number, step: number) => base * Math.pow(2, step / edo);

  const nextGameChaos = () => {
    const state = gameRefs.current;
    state.soundChaos = 3.88 * state.soundChaos * (1 - state.soundChaos);
    if (!Number.isFinite(state.soundChaos) || state.soundChaos <= 0.03 || state.soundChaos >= 0.97) {
      state.soundChaos = 0.47 + Math.random() * 0.18;
    }
    state.melodicDrift += (Math.random() - 0.5) * 0.13;
    state.melodicDrift = Math.max(-0.85, Math.min(0.85, state.melodicDrift));
    return Math.max(0.02, Math.min(0.98, state.soundChaos + state.melodicDrift * 0.2));
  };

  const hybridFreq = (base: number, anchorRatio: number, register: number) => {
    const c = nextGameChaos();
    const edo = RUN_EDOS[Math.floor(c * RUN_EDOS.length) % RUN_EDOS.length];
    const ratio = MICRO_RATIOS[Math.floor((c * 1000 + gameRefs.current.shotCount * 3) % MICRO_RATIOS.length)];
    const edoSpan = Math.max(4, Math.floor(edo * 0.78));
    const step = Math.floor((c * 997 + gameRefs.current.shotCount * 5) % edoSpan);
    const anchorBase = base * anchorRatio * Math.pow(2, register);
    const jiCandidate = anchorBase * ratio;
    const edoCandidate = edoFreq(anchorBase, edo, step);
    const blend = 0.28 + c * 0.48;
    return clampFreq(jiCandidate * (1 - blend) + edoCandidate * blend, 50, 2600);
  };

  const playPlayerShotMotif = (anchorRatio: number) => {
    const state = gameRefs.current;
    const c = nextGameChaos();
    const root = clampFreq(145 + 120 * c, 120, 480);
    const waveA: OscillatorType = c > 0.7 ? "sawtooth" : "square";
    const waveB: OscillatorType = c < 0.28 ? "sine" : "triangle";
    const f1 = hybridFreq(root, anchorRatio, c > 0.62 ? 0 : -1);
    const f2 = hybridFreq(root * 1.18, anchorRatio, 0);
    const f3 = hybridFreq(root * 0.92, anchorRatio, -1);
    const f4 = hybridFreq(root * 1.07, anchorRatio, 1);

    playScheduledTone(f1, 0, 0.075 + c * 0.03, waveA, 0.037 + c * 0.012, 2.2, 1700 + c * 1000);
    playScheduledTone(f2, 0.036, 0.09 + c * 0.03, waveB, 0.03 + c * 0.012, 2.5, 1300 + c * 900);
    if (state.shotCount % 2 === 0 || c > 0.63) {
      playScheduledTone(f3, 0.082, 0.1 + c * 0.05, "sine", 0.025 + c * 0.01, 1.9, 1200 + c * 700);
    }
    if (state.shotCount % 5 === 0 && c > 0.34) {
      playScheduledTone(f4, 0.118, 0.08 + c * 0.04, "triangle", 0.018 + c * 0.012, 2, 1800 + c * 1100);
    }
    state.shotCount += 1;
  };

  const playOrbShotSound = (anchorRatio: number, phase: string) => {
    const c = nextGameChaos();
    const bloom = phase === "Radiant" ? 1.42 : phase === "Unstable" ? 1.22 : 1.08;
    const base = hybridFreq(110 + c * 90, anchorRatio * bloom, -1);
    const overtone = hybridFreq(180 + c * 140, anchorRatio * (1.2 + c * 0.3), 0);
    playScheduledTone(base, 0, 0.11 + c * 0.05, "triangle", 0.043 + c * 0.012, 2.6, 920 + c * 780);
    playScheduledTone(overtone, 0.028, 0.07 + c * 0.04, c > 0.56 ? "square" : "sine", 0.024 + c * 0.011, 1.7, 1500 + c * 1200);
  };

  const playOrbHitSound = (anchorRatio: number) => {
    const c = nextGameChaos();
    const base = hybridFreq(210 + c * 220, anchorRatio, 0);
    const shardA = hybridFreq(320 + c * 200, anchorRatio * 1.11, 0);
    const shardB = hybridFreq(460 + c * 260, anchorRatio * 0.94, 1);
    playScheduledTone(base, 0, 0.1 + c * 0.04, "sine", 0.055 + c * 0.014, 2.8, 1800 + c * 1400);
    playScheduledTone(shardA, 0.026, 0.09 + c * 0.05, c > 0.65 ? "square" : "triangle", 0.034 + c * 0.016, 2.2, 1700 + c * 1300);
    playScheduledTone(shardB, 0.062, 0.11 + c * 0.05, "sine", 0.026 + c * 0.014, 1.9, 1500 + c * 1200);
  };

  const playPlayerHitSound = (anchorRatio: number) => {
    const c = nextGameChaos();
    const base = hybridFreq(58 + c * 36, anchorRatio * (0.88 + c * 0.2), -2);
    const growl = hybridFreq(78 + c * 40, anchorRatio * 0.76, -2);
    const undertow = hybridFreq(96 + c * 28, anchorRatio * 1.03, -1);
    playScheduledTone(base, 0, 0.25 + c * 0.15, "sawtooth", 0.07 + c * 0.03, 3.8, 420 + c * 260);
    playScheduledTone(growl, 0.04, 0.3 + c * 0.16, "triangle", 0.064 + c * 0.024, 4.2, 350 + c * 220);
    playScheduledTone(undertow, 0.09, 0.2 + c * 0.08, "sine", 0.032 + c * 0.016, 2.3, 660 + c * 260);
  };

  const playHeartPickupChord = (anchorRatio: number) => {
    const c = nextGameChaos();
    const root = clampFreq(210 + c * 130, 160, 780) * anchorRatio;
    const chordSets: number[][] = [
      [1, 5 / 4, 3 / 2],
      [1, 6 / 5, 3 / 2],
      [1, 4 / 3, 5 / 3],
      [1, 7 / 6, 14 / 9],
      [1, 9 / 8, 15 / 8],
    ];
    const set = chordSets[Math.floor((c * 100 + gameRefs.current.totalScore) % chordSets.length)];
    const edo = RUN_EDOS[Math.floor((c * 1000 + gameRefs.current.level) % RUN_EDOS.length)];
    const edoOffset = Math.floor((c * 17 + gameRefs.current.shotCount) % 5) - 2;
    const edoRatio = Math.pow(2, edoOffset / edo);
    const register = c > 0.55 ? 0 : -1;
    set.forEach((ratio, idx) => {
      const voice = clampFreq(root * ratio * edoRatio * Math.pow(2, register), 120, 2000);
      playScheduledTone(voice, idx * 0.045, 0.28 + c * 0.12, idx === 0 ? "triangle" : "sine", 0.042 - idx * 0.007, 1.7, 1700 + idx * 260 + c * 500);
    });
  };

  const playNexusAgentTone = (
    freq: number,
    volume: number,
    targetDestination?: AudioNode,
    when?: number,
    presetOverride?: ParticlePreset,
    impactPosition?: { x: number; y: number },
  ) => {
    const ctx = audioCtxRef.current ?? audioCtx;
    if (!ctx) return;
    const preset = presetOverride ?? nexusParamsRef.current.particlePreset;
    const offset = when !== undefined ? Math.max(0, when - ctx.currentTime) : 0;
    const particleAxes = impactPosition
      ? computeParticleGradientAxes(
          impactPosition.x,
          impactPosition.y,
          nexusParamsRef.current.particleGradientX,
          nexusParamsRef.current.particleGradientY,
        )
      : { brightness: 0, attackHardness: 0 };
    const { brightness, attackHardness } = particleAxes;
    const sitarBias = clamp(brightness, 0, 1);
    const psyBias = clamp(attackHardness, 0, 1);
    const brightnessCutoff = 700 + sitarBias * 4200 + psyBias * 900;
    const resonance = 1.2 + sitarBias * 2.8 + psyBias * 4.8;
    const sustainGain = 0.88 + sitarBias * 0.2 + (1 - psyBias) * 0.08;
    const transientGain = 0.9 + psyBias * 0.28 + sitarBias * 0.06;
    const sitarBuzzType: OscillatorType = sitarBias > 0.62 ? "sawtooth" : "square";
    const sitarBuzzFreq = freq * (1.85 + sitarBias * 1.35 + psyBias * 0.18);
    const sitarBuzzDur = 0.045 + sitarBias * 0.11 - psyBias * 0.015;
    const sitarBuzzCutoff = clamp(1700 + sitarBias * 1500 + psyBias * 260, 900, 5200);
    const psyShineType: OscillatorType = psyBias > 0.7 ? "square" : "triangle";
    const psyShineFreq = freq * (3.6 + psyBias * 3.2 + sitarBias * 0.32);
    const psyShineDur = 0.018 + psyBias * 0.04;
    const psyShineCutoff = clamp(3600 + psyBias * 3000 + sitarBias * 600, 2200, 9000);
    ensureCollectiveMemoryFx(ctx);
    ensurePsychedelicSpiralDevice(ctx);
    ensureTransientDriveDevice(ctx);
    ensureEnterHoldPsyFxDevice(ctx);
    ensureSchwarmdeuterDevice(ctx);
    ensureMyzelPostFxRouter(ctx);
    const particleTargets = [
      targetDestination,
      transientDriveSendsRef.current.particles,
      psychedelicSpiralSendsRef.current.particles,
      collectiveFxRef.current.particles?.input,
      schwarmdeuterSendsRef.current.particles,
      myzelPostFxSendsRef.current.particles,
    ];
    const particlePlan = beginTransientEvent("particle", getParticleTransientDemand(preset), volume * (0.84 + brightness * 0.26 + attackHardness * 0.14));
    const particleBodyVoiceBudget = particlePlan.bodyScale >= 0.84 ? 4 : particlePlan.bodyScale >= 0.56 ? 2 : 1;
    const particleToneOptions = (prominence: number) => ({ source: "particle" as const, plan: particlePlan, prominence });

    triggerRoom3BodyExciter(getParticleBodyExciterProfile(preset, particleAxes), freq, volume * (1.68 + sitarBias * 0.08 + (1 - psyBias) * 0.06), {
      voiceBudget: particleBodyVoiceBudget,
      bodyScale: particlePlan.bodyScale,
    });

    if (sitarBias > 0.08) {
      playScheduledTone(
        sitarBuzzFreq,
        offset + 0.002,
        Math.max(0.025, sitarBuzzDur),
        sitarBuzzType,
        volume * (0.08 + sitarBias * 0.18),
        2.4 + sitarBias * 4.4,
        sitarBuzzCutoff,
        particleTargets,
        particleToneOptions(0.18),
      );
    }
    if (psyBias > 0.1) {
      playScheduledTone(
        psyShineFreq,
        offset,
        psyShineDur,
        psyShineType,
        volume * (0.04 + psyBias * 0.12),
        1.1 + psyBias * 2.1,
        psyShineCutoff,
        particleTargets,
        particleToneOptions(0.12),
      );
      playParticleNoiseAccent(freq, offset, volume, psyBias, particleTargets);
    }

    if (preset === "glass_ping") {
      playScheduledTone(freq, offset, 0.3 + sitarBias * 0.26 - psyBias * 0.1 + Math.random() * 0.12, sitarBias > 0.52 ? "square" : "triangle", volume * sustainGain, 1.8 + sitarBias * 1.6 + psyBias * 2.2, brightnessCutoff + 900, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (2 + sitarBias * 0.44 + psyBias * 0.08), offset + 0.018, 0.14 + sitarBias * 0.18 - psyBias * 0.03, sitarBias > 0.62 ? "sawtooth" : "sine", volume * (0.16 + sitarBias * 0.24 + psyBias * 0.08), 1.3 + sitarBias * 1.6 + psyBias * 1.1, brightnessCutoff + 1900, particleTargets, particleToneOptions(0.44));
    } else if (preset === "marimba") {
      playScheduledTone(freq, offset, 0.18 + brightness * 0.08 - attackHardness * 0.05 + Math.random() * 0.08, "sine", volume * (0.88 + brightness * 0.2 + attackHardness * 0.16), 1.1 + attackHardness * 2.4, 900 + brightness * 2600, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (3.2 + brightness * 1.2), offset, 0.06 + brightness * 0.05 - attackHardness * 0.02, "triangle", volume * (0.14 + brightness * 0.22 + attackHardness * 0.06), 1 + attackHardness * 0.8, brightnessCutoff + 1500, particleTargets, particleToneOptions(0.28));
    } else if (preset === "soft_pluck") {
      playScheduledTone(freq, offset, 0.42 + sitarBias * 0.24 - psyBias * 0.12 + Math.random() * 0.1, sitarBias > 0.46 ? "square" : "triangle", volume * (0.66 + sitarBias * 0.2 + psyBias * 0.1), 2.1 + sitarBias * 1.8 + psyBias * 2.6, 620 + sitarBias * 2600 + psyBias * 600, particleTargets, particleToneOptions(1));
    } else if (preset === "fm_bell") {
      playScheduledTone(freq, offset, 0.62 + brightness * 0.34 - attackHardness * 0.12, "sine", volume * sustainGain, 1.2 + attackHardness * 2.2, 1400 + brightness * 2000, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (1.38 + brightness * 0.16), offset, 0.34 + brightness * 0.18 - attackHardness * 0.06, "triangle", volume * (0.26 + brightness * 0.18 + attackHardness * 0.14), 1.1 + attackHardness * 1.1, 1800 + brightness * 2100, particleTargets, particleToneOptions(0.48));
      playScheduledTone(freq * (2.25 + brightness * 0.75), offset, 0.14 + brightness * 0.14 - attackHardness * 0.04, "triangle", volume * (0.1 + brightness * 0.1 + attackHardness * 0.06), 1, brightnessCutoff + 1800, particleTargets, particleToneOptions(0.22));
    } else if (preset === "pizzicato") {
      playScheduledTone(freq, offset, 0.1 + sitarBias * 0.06 - psyBias * 0.03, sitarBias > 0.44 ? "square" : "triangle", volume * transientGain, resonance + sitarBias * 1.8, 1500 + sitarBias * 1800 + psyBias * 800, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (1.02 + sitarBias * 0.12), offset + 0.008, 0.055 + sitarBias * 0.05 - psyBias * 0.015, sitarBias > 0.72 ? "sawtooth" : "triangle", volume * (0.12 + sitarBias * 0.18 + psyBias * 0.1), 1.8 + sitarBias * 2.6 + psyBias * 1.8, 1200 + sitarBias * 1600 + psyBias * 500, particleTargets, particleToneOptions(0.36));
    } else if (preset === "steel_pan") {
      playScheduledTone(freq, offset, 0.38 + brightness * 0.24 - attackHardness * 0.08, "sine", volume * (0.74 + brightness * 0.24 + attackHardness * 0.12), 1.1 + attackHardness * 2.4, 1100 + brightness * 2200, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (1.1 + brightness * 0.16), offset + 0.02, 0.24 + brightness * 0.16 - attackHardness * 0.04, "sine", volume * (0.2 + brightness * 0.18 + attackHardness * 0.08), 1, 1600 + brightness * 2100, particleTargets, particleToneOptions(0.52));
      playScheduledTone(freq * (2.05 + brightness * 0.85), offset + 0.05, 0.12 + brightness * 0.14 - attackHardness * 0.03, "triangle", volume * (0.08 + brightness * 0.12 + attackHardness * 0.06), 1, brightnessCutoff + 1650, particleTargets, particleToneOptions(0.24));
    } else if (preset === "crystal_bowl") {
      playScheduledTone(freq, offset, 1.1 + brightness * 0.7 - attackHardness * 0.12, "sine", volume * (0.84 + brightness * 0.18), 1 + attackHardness * 0.9, 700 + brightness * 1100, particleTargets, particleToneOptions(1));
      playScheduledTone(freq + (1.1 + brightness * 2.2), offset + 0.08, 0.95 + brightness * 0.66 - attackHardness * 0.08, "sine", volume * (0.26 + brightness * 0.18 + attackHardness * 0.08), 1, 840 + brightness * 1150, particleTargets, particleToneOptions(0.42));
    } else if (preset === "velvet_bloom") {
      playScheduledTone(freq, offset, 0.92 + brightness * 0.62 - attackHardness * 0.16, "triangle", volume * (0.7 + brightness * 0.16 + (1 - attackHardness) * 0.1), 1 + attackHardness * 1.4, 800 + brightness * 1650, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (1.45 + brightness * 0.14), offset + 0.05, 0.72 + brightness * 0.42 - attackHardness * 0.12, "sine", volume * (0.2 + brightness * 0.14 + (1 - attackHardness) * 0.06), 1, 1120 + brightness * 1700, particleTargets, particleToneOptions(0.48));
      playScheduledTone(freq * (2 + brightness * 0.28), offset + 0.1, 0.42 + brightness * 0.3 - attackHardness * 0.08, "sine", volume * (0.1 + brightness * 0.09), 1, 1520 + brightness * 1500, particleTargets, particleToneOptions(0.22));
    } else if (preset === "shimmer_pad") {
      playScheduledTone(freq, offset, 1.28 + brightness * 0.92 - attackHardness * 0.16, "sine", volume * (0.66 + brightness * 0.2 + (1 - attackHardness) * 0.08), 1 + attackHardness * 0.9, 720 + brightness * 1450, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (2.01 + brightness * 0.16), offset + 0.06, 0.92 + brightness * 0.68 - attackHardness * 0.1, "triangle", volume * (0.18 + brightness * 0.16), 1, 1040 + brightness * 1900, particleTargets, particleToneOptions(0.38));
      playScheduledTone(freq * (3.02 + brightness * 0.24), offset + 0.12, 0.62 + brightness * 0.5 - attackHardness * 0.08, "sine", volume * (0.1 + brightness * 0.08), 1, 1450 + brightness * 2050, particleTargets, particleToneOptions(0.18));
    } else if (preset === "dust_chime") {
      playScheduledTone(freq, offset, 0.12 + brightness * 0.1 - attackHardness * 0.04, "sine", volume * (0.46 + brightness * 0.22 + attackHardness * 0.1), 3 + attackHardness * 2.6, 2400 + brightness * 2800, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (2.62 + brightness * 0.38), offset + 0.008, 0.08 + brightness * 0.07 - attackHardness * 0.02, "triangle", volume * (0.08 + brightness * 0.12 + attackHardness * 0.06), 2 + attackHardness * 0.8, 4100 + brightness * 2200, particleTargets, particleToneOptions(0.26));
      playScheduledTone(freq * (3.92 + brightness * 0.48), offset + 0.016, 0.06 + brightness * 0.05 - attackHardness * 0.02, "sine", volume * (0.04 + brightness * 0.08), 1.6, 5200, particleTargets, particleToneOptions(0.14));
    } else if (preset === "rubber_click") {
      playScheduledTone(freq * (0.84 + brightness * 0.1), offset, 0.07 + brightness * 0.02 - attackHardness * 0.025, "triangle", volume * (0.74 + attackHardness * 0.14), 1.1 + attackHardness * 1.6, 820 + brightness * 1040, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * 0.52, offset + 0.004, 0.04 + brightness * 0.02 - attackHardness * 0.015, "sine", volume * (0.12 + brightness * 0.1), 1, 500 + brightness * 460, particleTargets, particleToneOptions(0.24));
    } else if (preset === "reed_pop") {
      playScheduledTone(freq, offset, 0.11 + sitarBias * 0.06 - psyBias * 0.025, sitarBias > 0.38 ? "square" : "triangle", volume * (0.54 + sitarBias * 0.16 + psyBias * 0.1), 2 + sitarBias * 2.8 + psyBias * 2.2, 1200 + sitarBias * 1700 + psyBias * 600, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (1.46 + sitarBias * 0.22), offset + 0.008, 0.095 + sitarBias * 0.04 - psyBias * 0.015, sitarBias > 0.62 ? "sawtooth" : "triangle", volume * (0.1 + sitarBias * 0.1 + psyBias * 0.05), 2.6 + sitarBias * 1.4 + psyBias * 0.8, 1850 + sitarBias * 1700 + psyBias * 900, particleTargets, particleToneOptions(0.28));
    } else if (preset === "granular_spark") {
      playScheduledTone(freq, offset, 0.075 + sitarBias * 0.035 - psyBias * 0.02, sitarBias > 0.54 ? "square" : "triangle", volume * (0.34 + sitarBias * 0.14 + psyBias * 0.06), 3.2 + sitarBias * 1.4 + psyBias * 2.1, 2400 + sitarBias * 1800 + psyBias * 1200, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (2.22 + sitarBias * 0.42), offset + 0.003, 0.055 + sitarBias * 0.04 - psyBias * 0.015, sitarBias > 0.68 ? "sawtooth" : "sine", volume * (0.08 + sitarBias * 0.1), 2.4 + sitarBias * 1 + psyBias * 0.9, 3900 + sitarBias * 1300 + psyBias * 1400, particleTargets, particleToneOptions(0.22));
      playScheduledTone(freq * (3.36 + sitarBias * 0.3 + psyBias * 0.6), offset + 0.01, 0.04 + sitarBias * 0.025 + psyBias * 0.015, psyBias > 0.6 ? "square" : "sine", volume * (0.05 + sitarBias * 0.04 + psyBias * 0.05), 1.8 + psyBias * 1.1, 5000 + sitarBias * 700 + psyBias * 1800, particleTargets, particleToneOptions(0.12));
    } else if (preset === "woodblock") {
      playScheduledTone(freq, offset, 0.05 + brightness * 0.03 - attackHardness * 0.018, "triangle", volume * (0.58 + brightness * 0.22 + attackHardness * 0.1), 1 + attackHardness * 2.4, 850 + brightness * 1900, particleTargets, particleToneOptions(1));
      playScheduledTone(freq * (0.48 + brightness * 0.1), offset, 0.04 + brightness * 0.02 - attackHardness * 0.015, "triangle", volume * (0.26 + brightness * 0.16), 1, 520 + brightness * 980, particleTargets, particleToneOptions(0.28));
    }
  };

  const spawnNexusRipple = (direction?: "left" | "right" | "up" | "down") => {
    if (!nexusActive) return;
    const refs = nexusRefs.current;
    const p = nexusParamsRef.current;
    const x = refs.cursorX;
    const y = refs.cursorY;
    const maxRadius = BASE_WAVE_MAX_RADIUS * clamp(p.waveRadius ?? 1, 0.35, 2.2);
    refs.ripples.push({ x, y, radius: 0, life: 1, maxRadius, decay: p.waveDecay ?? "linear", direction, hitAgents: [] });

    const cursorFreq = freqFromY(y);
    markWaveLaunch();
    playWaveStartSound(cursorFreq, false);
  };

  const triggerDirectedPulse = (direction: "left" | "right" | "up" | "down") => {
    if (!nexusActive) return;

    const refs = nexusRefs.current;
    const p = nexusParamsRef.current;
    const maxRadius = BASE_WAVE_MAX_RADIUS * clamp(p.waveRadius ?? 1, 0.35, 2.2);
    refs.sectorPulses.push({
      x: refs.cursorX,
      y: refs.cursorY,
      radius: 0,
      life: 1,
      maxRadius,
      decay: p.waveDecay ?? "linear",
      direction,
      hitAgents: [],
    });
    if (refs.sectorPulses.length > 18) {
      refs.sectorPulses.shift();
    }

    const cursorFreq = freqFromY(refs.cursorY);
    markWaveLaunch();
    playWaveStartSound(cursorFreq, true);
  };

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;

    const refs = nexusRefs.current;
    if (!refs.manualJiMaster) {
      const master = audioCtx.createGain();
      master.gain.value = 0.85;
      if (refs.droneGroupBus) master.connect(refs.droneGroupBus);
      else master.connect(getLiveMasterBus(audioCtx, "drone"));
      refs.manualJiMaster = master;
    }

    DRONE_JI_OVERTONES.forEach((node) => {
      if (refs.manualJiOscs[node.label]) return;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = "sine";
      g.gain.value = 0;
      osc.connect(g);
      g.connect(refs.manualJiMaster!);
      osc.start();
      refs.manualJiOscs[node.label] = osc;
      refs.manualJiGains[node.label] = g;
    });

    let raf = 0;
    const tick = () => {
      const p = nexusParamsRef.current;
      const baseFreq = freqFromY(refs.cursorY);
      const timbreMix = clamp(p.droneTimbre, 0, 1);
      const floor = 0.004;
      const depth = 0.1;

      DRONE_JI_OVERTONES.forEach((node) => {
        const osc = refs.manualJiOscs[node.label];
        const g = refs.manualJiGains[node.label];
        if (!osc || !g) return;

        if (osc.type !== p.droneOvertoneWaveform) osc.type = p.droneOvertoneWaveform;
        const level = p.droneJIOvertones[node.label] ?? 0;
        osc.frequency.setTargetAtTime(baseFreq * node.ratio, audioCtx.currentTime, 0.03);
        const targetGain = level * (floor + depth * timbreMix);
        g.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.05);
      });


      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      Object.values(refs.manualJiOscs).forEach((osc) => {
        try {
          osc.stop();
        } catch {}
      });
      Object.values(refs.manualJiGains).forEach((g) => g.disconnect());
      refs.manualJiOscs = {};
      refs.manualJiGains = {};
      if (refs.manualJiMaster) {
        refs.manualJiMaster.disconnect();
        refs.manualJiMaster = null;
      }
    };
  }, [audioCtx, nexusActive]);

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;
    const refs = nexusRefs.current;
    if (!refs.filter || !refs.gain) return;

    if (!refs.overtoneMaster) {
      const overtoneMaster = audioCtx.createGain();
      overtoneMaster.gain.value = 0.72;
      if (refs.droneGroupBus) overtoneMaster.connect(refs.droneGroupBus);
      else overtoneMaster.connect(getLiveMasterBus(audioCtx, "drone"));
      refs.overtoneMaster = overtoneMaster;
    }

    for (const node of DRONE_JI_OVERTONES) {
      if (!refs.jiOscs[node.label]) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(refs.overtoneMaster);
        osc.start();
        refs.jiOscs[node.label] = osc;
        refs.jiGains[node.label] = gain;
      }
    }

    let raf = 0;
    const tick = () => {
      const now = audioCtx.currentTime;
      const baseHz = freqFromY(refs.cursorY);
      const timbreMix = clamp(nexusParamsRef.current.droneTimbre, 0, 1);
      for (const node of DRONE_JI_OVERTONES) {
        const osc = refs.jiOscs[node.label];
        const gain = refs.jiGains[node.label];
        if (!osc || !gain) continue;
        const slider = clamp(nexusParamsRef.current.droneJIOvertones[node.label] ?? 0, 0, 1);
        const targetFreq = clamp(baseHz * node.ratio, DRONE_MIN_FREQ * 0.5, DRONE_MAX_FREQ * 6);
        const targetGain = slider * (0.006 + timbreMix * 0.022);
        osc.frequency.setTargetAtTime(targetFreq, now, 0.04);
        gain.gain.setTargetAtTime(targetGain, now, 0.05);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      const refsNow = nexusRefs.current;
      Object.values(refsNow.jiOscs).forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      });
      Object.values(refsNow.jiGains).forEach((gain) => {
        try {
          gain.disconnect();
        } catch {}
      });
      refsNow.jiOscs = {};
      refsNow.jiGains = {};
      if (refsNow.overtoneMaster) {
        try {
          refsNow.overtoneMaster.disconnect();
        } catch {}
        refsNow.overtoneMaster = null;
      }
    };
  }, [audioCtx, nexusActive]);

  useEffect(() => {
    if (!resonanceInputActive) return;

    const setArrowState = (key: string, isPressed: boolean) => {
      if (key === "ArrowLeft") nexusArrowRef.current.left = isPressed;
      if (key === "ArrowRight") nexusArrowRef.current.right = isPressed;
      if (key === "ArrowUp") nexusArrowRef.current.up = isPressed;
      if (key === "ArrowDown") nexusArrowRef.current.down = isPressed;
    };

    const handleResonanceKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const k = event.key;
      const key = k.toLowerCase();
      const params = nexusParamsRef.current;
      const prevent = () => event.preventDefault();
      const runWithAudio = (fn: () => void) => {
        prevent();
        void ensureAudioReady().then(fn);
      };

      if (k === "ArrowLeft" || k === "ArrowRight") {
        setArrowState(k, true);
        prevent();
        return;
      }

      if (k === "ArrowUp" || k === "ArrowDown") {
        prevent();
        if (params.lockCursorToGrid) {
          if (event.repeat) return;
          const direction = k === "ArrowUp" ? 1 : -1;
          const nextY = stepYToGrid(
            nexusRefs.current.cursorY,
            direction,
            params.gridBase,
            params.gridTuning,
            params.manualGridMutedSteps,
            params.manualGridStepOffsets,
          );
          if (nextY !== nexusRefs.current.cursorY) {
            commitResonanceCursorY(nextY, { previewWave: true });
          }
          return;
        }
        setArrowState(k, true);
        return;
      }

      if (event.code === "Equal" || event.key === "`" || event.key === "´" || event.key === "Dead") {
        prevent();
        longToneHoldRef.current = true;
        setResonanceActionBadges((prev) => ({ ...prev, sustain: true }));
        return;
      }

      if (event.code === "Space") {
        prevent();
        waveSoundSwellHeldRef.current = true;
        setResonanceActionBadges((prev) => ({ ...prev, swell: true }));
        return;
      }

      if (event.code === "Backspace") {
        prevent();
        waveStartOctaveHoldRef.current = true;
        setResonanceActionBadges((prev) => ({ ...prev, octave: true }));
        return;
      }

      if (event.code === "Tab" && params.quantizeOn) {
        prevent();
        cycleQuantizeGrid();
        return;
      }

      if (event.key === "Enter") {
        enterHoldRef.current = true;
        runWithAudio(() => {
          const refs = nexusRefs.current;
          const p = nexusParamsRef.current;
          const maxRadius = BASE_WAVE_MAX_RADIUS * clamp(p.waveRadius ?? 1, 0.35, 2.2);
          refs.ripples.push({ x: refs.cursorX, y: refs.cursorY, radius: 0, life: 1, maxRadius, decay: p.waveDecay ?? "linear", hitAgents: [] });
          markWaveLaunch();
          playWaveStartSound(freqFromY(refs.cursorY), false);
        });
        return;
      }

      if (shouldToggleKeyboardMirror(event)) {
        prevent();
        keyboardMirrorRef.current = !keyboardMirrorRef.current;
        return;
      }

      if (isResonanceWaveTriggerKey(key)) {
        const direction = getWaveDirectionForKey(key);
        if (direction) {
          runWithAudio(() => triggerDirectedPulse(direction));
        }
        return;
      }

      if (isKeyboardWindowShiftCode(event.code)) {
        const direction = getKeyboardWindowShiftDirection(event.code);
        if (direction !== null) {
          runWithAudio(() => {
            previewKeyboardWindowShift(direction);
          });
        }
        return;
      }

      if (isPrevGridTuningKey(k)) {
        runWithAudio(() => {
          const nextTuning = nextGridTuning(params.gridTuning, -1);
          changeGridTuning(nextTuning);
        });
        return;
      }

      if (isNextGridTuningKey(k)) {
        runWithAudio(() => {
          const nextTuning = nextGridTuning(params.gridTuning, 1);
          changeGridTuning(nextTuning);
        });
        return;
      }

      if (isGridModeCycleEvent(event)) {
        const gridModes = getModesForSystem(params.gridTuning);
        const currentIndex = gridModes.findIndex((m) => m.value === params.gridMode);
        if (currentIndex !== -1) {
          runWithAudio(() => {
            const direction = getGridModeCycleDirection(event);
            const nextIndex = (currentIndex + direction + gridModes.length) % gridModes.length;
            const nextMode = gridModes[nextIndex].value;
            setGridMode(nextMode);
            keyboardWindowOffsetRef.current = 0;
            setKeyboardWindowStamp((prev) => prev + 1);
          });
        }
        return;
      }

      if (!event.repeat) {
        if (event.code === "CapsLock") {
          const patterns = DRUM_PATTERNS.map((entry) => entry.value);
          const currentIndex = patterns.indexOf(nexusParamsRef.current.drumPattern);
          const nextPattern = patterns[(currentIndex + 1 + patterns.length) % patterns.length] ?? "trip_hop";
          updateNParams({ drumPattern: nextPattern });
          prevent();
          return;
        }

        if (k === "m" || k === "n") {
          const particleModes = getModesForSystem(nexusParamsRef.current.particleSystem);
          const currentMode = nexusParamsRef.current.churchMode;
          const currentIndex = particleModes.findIndex((m) => m.value === currentMode);
          if (currentIndex !== -1) {
            const direction = k === "n" ? 1 : -1;
            let nextIndex = currentIndex + direction;
            if (nextIndex >= particleModes.length) nextIndex = 0;
            if (nextIndex < 0) nextIndex = particleModes.length - 1;
            setChurchMode(particleModes[nextIndex].value);
          }
          prevent();
          return;
        }

        if (k === "-" || k === "_") {
          cycleParticleSystem(k === "_" ? -1 : 1);
          prevent();
          return;
        }

        const agentIndex = AGENT_KEYS.indexOf(key);
        if (agentIndex !== -1 && agentIndex < nexusParamsRef.current.agentEnabled.length) {
          toggleNexusAgent(agentIndex);
          prevent();
          return;
        }
      }

      const pitchIdx = getKeyboardPitchIndexFromMap(key, KAMMERTON_KEY_MAP);
      if (pitchIdx >= 0) {
        const mappedPitchIdx = keyboardMirrorRef.current
          ? getMirroredKeyboardPitchIndex(pitchIdx, KAMMERTON_KEYS.length)
          : pitchIdx;
        runWithAudio(() => {
          triggerKeyboardWindowPitch(mappedPitchIdx);
        });
      }
    };

    const handleResonanceKeyUp = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || isForgeHotkeyTarget(event.target)) return;
      setArrowState(event.key, false);
      if (event.code === "Equal" || event.key === "`" || event.key === "´" || event.key === "Dead") {
        longToneHoldRef.current = false;
        setResonanceActionBadges((prev) => ({ ...prev, sustain: false }));
        releaseHeldScheduledTones();
      }
      if (event.code === "Space") {
        waveSoundSwellHeldRef.current = false;
        setResonanceActionBadges((prev) => ({ ...prev, swell: false }));
      }
      if (event.code === "Backspace") {
        waveStartOctaveHoldRef.current = false;
        setResonanceActionBadges((prev) => ({ ...prev, octave: false }));
      }
      if (event.key === "Enter") {
        enterHoldRef.current = false;
      }
    };

    window.addEventListener("keydown", handleResonanceKeyDown);
    window.addEventListener("keyup", handleResonanceKeyUp);
    return () => {
      window.removeEventListener("keydown", handleResonanceKeyDown);
      window.removeEventListener("keyup", handleResonanceKeyUp);
    };
  }, [resonanceInputActive, audioCtx, myzelEnabled]);

  useEffect(() => {
    if (!myzelEnabled) return;

    const baseFreq = 220;
    topologyLoopErrorRef.current = null;
    if (!topologyRefs.current.nodes.length) {
      topologyRefs.current.nodes = JI_NODES.map((ji) => ({
        x: TOPO_WIDTH * 0.1 + Math.random() * TOPO_WIDTH * 0.8,
        y: TOPO_HEIGHT * 0.1 + Math.random() * TOPO_HEIGHT * 0.8,
        freq: FREQ(baseFreq, ji.cents),
        energy: 0,
        label: ji.label,
      }));
    }
    topologyRefs.current.cursor = topologyRefs.current.cursor.x || topologyRefs.current.cursor.y
      ? topologyRefs.current.cursor
      : { x: TOPO_WIDTH / 2, y: TOPO_HEIGHT / 2, vx: 0, vy: 0 };

    const setTopologyStatus = (next: string) => {
      if (topologyLastStatusRef.current !== next) {
        topologyLastStatusRef.current = next;
        setSystemState(next);
      }
    };

    let animId = 0;
    let alive = true;
    const loop = () => {
      try {
        const refs = topologyRefs.current;
        const cur = refs.cursor;
        const { tension, slimLayers, rawReality } = tParams;
        const dissipationRate = 0.005 + slimLayers * 0.02;

        let maxEnergy = 0;
        let dominantFreq = baseFreq;
        let pullX = 0;
        let pullY = 0;
        let activeNode: SemanticNode | null = null;

        for (const node of refs.nodes) {
          const dx = node.x - cur.x;
          const dy = node.y - cur.y;
          const nodeDist = Math.max(1, Math.hypot(dx, dy));
          const force = (1 / (nodeDist + 10)) * tension * 500;
          pullX += (dx / nodeDist) * force;
          pullY += (dy / nodeDist) * force;

          if (nodeDist < 80) node.energy += 0.015 * (1 - slimLayers * 0.5);
          node.energy = Math.max(0, Math.min(1, node.energy - dissipationRate));

          if (node.energy > maxEnergy) {
            maxEnergy = node.energy;
            dominantFreq = node.freq;
            if (node.energy > 0.7) activeNode = node;
          }
        }

        cur.vx += (Math.random() - 0.5) * 2.5;
        cur.vy += (Math.random() - 0.5) * 2.5;
        cur.vx += pullX;
        cur.vy += pullY;
        cur.vx *= 0.94;
        cur.vy *= 0.94;
        cur.x += cur.vx;
        cur.y += cur.vy;

        if (cur.x < 0) {
          cur.x = 0;
          cur.vx = Math.abs(cur.vx);
        } else if (cur.x > TOPO_WIDTH) {
          cur.x = TOPO_WIDTH;
          cur.vx = -Math.abs(cur.vx);
        }
        if (cur.y < 0) {
          cur.y = 0;
          cur.vy = Math.abs(cur.vy);
        } else if (cur.y > TOPO_HEIGHT) {
          cur.y = TOPO_HEIGHT;
          cur.vy = -Math.abs(cur.vy);
        }

        if (activeNode) {
          setTopologyStatus(
            maxEnergy > 0.9
              ? `Strukturelle Resonanz: Myzel vibriert intensiv an [${activeNode.label}]`
              : `Lokale Verdichtung um [${activeNode.label}]`
          );
        } else {
          setTopologyStatus("Fließendes Myzel");
        }

        const nodeEnergyByLabel = Object.fromEntries(refs.nodes.map((node) => [node.label, node.energy]));
        const centerX = refs.nodes.reduce((sum, node) => sum + node.x, 0) / Math.max(1, refs.nodes.length);
        const centerY = refs.nodes.reduce((sum, node) => sum + node.y, 0) / Math.max(1, refs.nodes.length);
        const layoutSpread = refs.nodes.length
          ? refs.nodes.reduce((sum, node) => sum + Math.hypot(node.x - centerX, node.y - centerY), 0) / refs.nodes.length / 220
          : 0;

        let nearestNode: SemanticNode | null = null;
        let nearestNodeDist = Number.POSITIVE_INFINITY;
        for (const node of refs.nodes) {
          const nodeDist = Math.hypot(node.x - cur.x, node.y - cur.y);
          if (nodeDist < nearestNodeDist) {
            nearestNodeDist = nodeDist;
            nearestNode = node;
          }
        }

        const coherence = clamp((1 - clamp(layoutSpread, 0, 1)) * 0.45 + clamp(nearestNode?.energy ?? 0, 0, 1) * 0.35 + (1 - clamp(nearestNodeDist / 220, 0, 1)) * 0.2, 0, 1);
        const tensionField = clamp(tension * 0.45 + clamp(Math.hypot(cur.vx, cur.vy) / 12, 0, 1) * 0.3 + maxEnergy * 0.25, 0, 1);
        const constellationSignature = computeConstellationSignature(refs.nodes, TOPO_WIDTH, TOPO_HEIGHT);
        const prevConstellation = constellationStateRef.current;
        const ratioDelta = constellationSignature.ratios.reduce((sum, ratio, idx) => {
          const prevRatio = prevConstellation.ratios[idx] ?? ratio;
          return sum + Math.abs(ratio - prevRatio) / Math.max(0.001, prevRatio);
        }, 0) / Math.max(1, constellationSignature.ratios.length);
        const centroidDelta = Math.hypot(
          constellationSignature.centroidX - prevConstellation.centroidX,
          constellationSignature.centroidY - prevConstellation.centroidY,
        );
        const signatureDelta = clamp(
          ratioDelta * 0.65
            + Math.abs(constellationSignature.tension - prevConstellation.tension) * 0.55
            + Math.abs(constellationSignature.brightness - prevConstellation.brightness) * 0.45
            + centroidDelta * 0.4,
          0,
          1.25,
        );
        const constellationFlux = clamp(prevConstellation.flux * 0.82 + signatureDelta * 0.52, 0, 1);
        const constellationTension = clamp(constellationSignature.tension * 0.68 + tensionField * 0.32, 0, 1);
        const constellationBrightness = clamp(constellationSignature.brightness * 0.72 + maxEnergy * 0.14 + coherence * 0.14, 0, 1);
        constellationStateRef.current = {
          ...constellationSignature,
          flux: constellationFlux,
        };

        myceliumSnapshotRef.current = {
          tension,
          slimLayers,
          rawReality,
          maxEnergy,
          dominantFreq,
          activeNodeLabel: activeNode?.label ?? null,
          cursorNormalizedX: clamp(cur.x / TOPO_WIDTH, 0, 1),
          cursorNormalizedY: clamp(cur.y / TOPO_HEIGHT, 0, 1),
          myceliumBallSpeed: Math.hypot(cur.vx, cur.vy),
          nodeEnergyByLabel,
          layoutSpread: clamp(layoutSpread, 0, 1),
          nearestNodeLabel: nearestNode?.label ?? null,
          nearestNodeEnergy: clamp(nearestNode?.energy ?? 0, 0, 1),
          ballToNearestNodeNormDist: clamp(nearestNodeDist / 220, 0, 1),
          coherence,
          tensionField,
          constellationRatios: constellationSignature.ratios,
          constellationTension,
          constellationFlux,
          constellationBrightness,
          constellationCentroidX: constellationSignature.centroidX,
          constellationCentroidY: constellationSignature.centroidY,
        };

        if (myzelEnabled && nParamsUI.bassRootMode === "auto" && (room === "TOPOLOGY" || myzelPrimedYRef.current === null)) {
          primeMyzelFromY((cur.y / TOPO_HEIGHT) * GAME_HEIGHT, "topology");
        }

        const drawTopology = room === "TOPOLOGY" ? topologyCanvasRef.current : null;
        const c = drawTopology?.getContext("2d") ?? null;
        if (c) {
          c.fillStyle = "#0a0a0c";
          c.fillRect(0, 0, TOPO_WIDTH, TOPO_HEIGHT);

          c.strokeStyle = "rgba(255,255,255,0.05)";
          c.lineWidth = 1;
          refs.nodes.forEach((n1, i) => {
            refs.nodes.slice(i + 1).forEach((n2) => {
              const d = Math.hypot(n1.x - n2.x, n1.y - n2.y);
              if (d < 200) {
                c.beginPath();
                c.moveTo(n1.x, n1.y);
                c.lineTo(n2.x, n2.y);
                c.stroke();
              }
            });
          });

          refs.nodes.forEach((node) => {
            const radius = 4 + node.energy * 25;
            c.beginPath();
            c.arc(node.x, node.y, radius, 0, Math.PI * 2);
            const r = 100 + node.energy * 155;
            const g = 100 + node.energy * 100;
            const b = 200 - node.energy * 150;
            const a = 0.3 + node.energy * 0.5;
            c.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            c.fill();
            c.fillStyle = "rgba(255,255,255,0.75)";
            c.font = "10px monospace";
            c.fillText(node.label, node.x + 10, node.y - 10);
          });

          c.beginPath();
          c.arc(cur.x, cur.y, 5, 0, Math.PI * 2);
          c.fillStyle = "#fff";
          c.fill();
          c.strokeStyle = "rgba(255,255,255,0.3)";
          c.beginPath();
          c.moveTo(cur.x, cur.y);
          c.lineTo(cur.x - cur.vx * 6, cur.y - cur.vy * 6);
          c.stroke();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        topologyLoopErrorRef.current = message;
        console.error("[xensonar][topology-loop]", error);
        setTopologyStatus(`Myzel Fehler: ${message}`);
      } finally {
        if (alive) animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      alive = false;
      topologyDragRef.current = { nodeIndex: null, offsetX: 0, offsetY: 0 };
      cancelAnimationFrame(animId);
    };
  }, [myzelEnabled, tParams, room, nParamsUI.bassRootMode]);

  useEffect(() => {
    if (myzelEnabled) return;
    myzelGateRef.current = 0;
    myzelLayerModRef.current = deriveMyzelLayerMod(createEmptyMyceliumSnapshot(), tParams.intensityGlobal, nParamsUI.bassRootHz, myzelBallMode, myzelNodeMode);
    const refs = nexusRefs.current;
    const now = audioCtx?.currentTime ?? 0;
    refs.myzelMasterGain?.gain.setTargetAtTime(0.0001, now, 0.05);
  }, [myzelEnabled, audioCtx, tParams.intensityGlobal, nParamsUI.bassRootHz, myzelBallMode, myzelNodeMode]);

  useEffect(() => {
    const handleWheelCapture = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return;
      }
      if (isWheelScrollAllowedTarget(event.target)) return;
      event.preventDefault();
    };
    window.addEventListener("wheel", handleWheelCapture, { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel", handleWheelCapture, true);
    };
  }, []);

  useEffect(() => {
    const handleArrowKeyCapture = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const key = event.key;
      const isArrowKey = key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";
      if (!isArrowKey) return;
      if (isForgeHotkeyTarget(event.target) || gameInputActive || resonanceInputActive) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleArrowKeyCapture, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleArrowKeyCapture, true);
    };
  }, [gameInputActive, resonanceInputActive]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameInputActive || isEditableTarget(event.target) || isForgeHotkeyTarget(event.target)) return;
      applyGameKeyState(event, true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (!gameInputActive || isEditableTarget(event.target) || isForgeHotkeyTarget(event.target)) return;
      applyGameKeyState(event, false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameInputActive]);

  useEffect(() => {
    if (!resonanceInputActive) return;
    let raf = 0;
    const tick = () => {
      const speed = nexusParamsRef.current.cursorSpeed;
      let cursorXChanged = false;
      let cursorYChanged = false;
      if (nexusArrowRef.current.left) {
        nexusRefs.current.cursorX -= speed;
        cursorXChanged = true;
      }
      if (nexusArrowRef.current.right) {
        nexusRefs.current.cursorX += speed;
        cursorXChanged = true;
      }
      if (!nexusParamsRef.current.lockCursorToGrid) {
        if (nexusArrowRef.current.up) {
          nexusRefs.current.cursorY -= speed;
          cursorYChanged = true;
        }
        if (nexusArrowRef.current.down) {
          nexusRefs.current.cursorY += speed;
          cursorYChanged = true;
        }
      }

      if (cursorXChanged) {
        nexusRefs.current.cursorX = clamp(nexusRefs.current.cursorX, 0, GAME_WIDTH);
      }
      if (cursorXChanged || cursorYChanged) {
        focusCursorLastInputRef.current = "arrow";
      }
      if (cursorYChanged) {
        commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: true, primeSource: "resonance" });
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [resonanceInputActive, myzelEnabled, nParamsUI.bassRootMode]);

  useEffect(() => {
    if (room !== "RESONANCE" || !nexusActive || !audioCtx) return;
    const refs = nexusRefs.current;
    if (!refs.osc || !refs.filter || !refs.gain) return;

    if (!refs.oscB || !refs.gainB) {
      const oscB = audioCtx.createOscillator();
      const gainB = audioCtx.createGain();
      oscB.type = "triangle";
      oscB.detune.value = 6;
      gainB.gain.value = 0.0001;
      oscB.connect(gainB);
      gainB.connect(refs.filter);
      oscB.start();
      refs.oscB = oscB;
      refs.gainB = gainB;
    }

    if (!refs.lfo || !refs.lfoGain) {
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.13;
      lfoGain.gain.value = 0;
      lfo.connect(lfoGain);
      lfoGain.connect(refs.filter.detune);
      lfo.start();
      refs.lfo = lfo;
      refs.lfoGain = lfoGain;
    }

    return () => {
      refs.oscB?.stop();
      refs.oscB?.disconnect();
      refs.gainB?.disconnect();
      refs.lfo?.stop();
      refs.lfo?.disconnect();
      refs.lfoGain?.disconnect();
      refs.oscB = null;
      refs.gainB = null;
      refs.lfo = null;
      refs.lfoGain = null;
    };
  }, [room, nexusActive, audioCtx]);

  useEffect(() => {
    keyboardWindowOffsetRef.current = 0;
    setKeyboardWindowStamp((prev) => prev + 1);
    if (!nParamsUI.lockCursorToGrid) return;
    commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: false });
  }, [nParamsUI.lockCursorToGrid, nParamsUI.gridBase, nParamsUI.gridTuning, nParamsUI.manualGridMutedSteps, nParamsUI.manualGridStepOffsets]);

  useEffect(() => {
    if (room !== "RESONANCE" || !nexusActive || !audioCtx) return;

    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.value = 110;
    filter.type = "lowpass";
    filter.frequency.value = 400;
    filter.Q.value = 2;
    gain.gain.value = 0.02;

    osc.connect(filter);
    filter.connect(gain);
    osc.start();

    const delayNode = ctx.createDelay(3.0);
    const delayFeedback = ctx.createGain();
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(getLiveMasterBus(ctx, "space"));

    nexusRefs.current.osc = osc;
    nexusRefs.current.filter = filter;
    nexusRefs.current.gain = gain;
    nexusRefs.current.delayNode = delayNode;
    nexusRefs.current.delayFeedback = delayFeedback;

    if (Object.keys(nexusRefs.current.jiOscs).length === 0) {
      DRONE_JI_OVERTONES.forEach((node) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        g.gain.value = 0;
        o.connect(g);
        g.connect(filter);
        o.start();
        nexusRefs.current.jiOscs[node.label] = o;
        nexusRefs.current.jiGains[node.label] = g;
      });
    }

    if (nexusRefs.current.agents.length === 0) {
    nexusRefs.current.agents = JI_NODES.map((ji, idx) => ({
      x: GAME_WIDTH * (0.1 + Math.random() * 0.8),
      y: GAME_HEIGHT * (0.1 + Math.random() * 0.8),
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      ratio: ji.ratio,
      label: ji.label,
      phase: Math.random() * Math.PI * 2,
      lastHit: nexusParamsRef.current.agentEnabled[idx] ? 0 : Number.POSITIVE_INFINITY,
      lastHitGain: 1,
      lastHitX: GAME_WIDTH * 0.5,
      lastHitY: GAME_HEIGHT * 0.5,
      history: [],
    }));
    }

    applyRealtimeDroneOvertones();

    let rafId = 0;
    let t = 0;

    const loop = () => {
      t += 0.016;
      const canvas = nexusCanvasRef.current;
      if (!canvas) return;
      const c = canvas.getContext("2d");
      if (!c) return;

      const state = nexusRefs.current;
      const p = nexusParamsRef.current;
      const preset = PRESET_MAP[p.dronePreset] ?? PRESET_MAP.warm_pad;
      const tParam = clamp(p.droneTimbre, 0, 1);
      const profileMix = Math.pow(tParam, 1.15);
      const overtoneCents = Math.log2(preset.overtoneRatio) * 1200;
      const myceliumMod = myceliumDroneModRef.current;
      const myzelWeave = myzelEnabled ? myzelLayerModRef.current : null;
      const myzelGate = myzelEnabled ? myzelGateRef.current : 0;
      const room3Timbre = room3BodyEnabled && myzelEnabled ? room3TimbreStateRef.current : null;

      const targetFreq = 55 + (1 - state.cursorY / GAME_HEIGHT) * 385;
      const weaveCutoffMul = myzelWeave
        ? clamp(0.88 + (myzelWeave.lowpassHz / 3200) * 0.28 + myzelGate * 0.12 + myzelWeave.shimmer * 1.5, 0.78, 1.45)
        : 1;
      const weaveGainLift = myzelWeave ? 1 + myzelGate * 0.06 + myzelWeave.shimmer * 0.55 : 1;
      const weaveBaseHz = myzelWeave ? blendHz(targetFreq, myzelWeave.baseHz, clamp(0.08 + myzelGate * 0.12 + myzelWeave.shimmer * 0.22, 0, 0.32), DRONE_MIN_FREQ, DRONE_MAX_FREQ) : targetFreq;
      const bodyCutoffMul = room3Timbre ? clamp(0.92 + room3Timbre.air * 0.16 + room3Timbre.resonanceFocus * 0.14 - room3Timbre.damping * 0.08, 0.82, 1.34) : 1;
      const targetCutoff = (preset.cutoffBase + (state.cursorX / GAME_WIDTH) * preset.cutoffSpan) * (1 + myceliumMod.filterBias) * weaveCutoffMul * bodyCutoffMul;

      state.wobble *= 0.975;
      state.wobblePhase += 0.15 + state.wobble * 0.25;
      const wobbleLFO = Math.sin(state.wobblePhase) * state.wobble;

      const effectiveVibrato = clamp((p.droneVibrato || 0) + myceliumMod.vibratoBias, 0, 1);
      const vibratoRatio = Math.pow(2, (Math.sin(t * 5 * Math.PI * 2) * 50 * effectiveVibrato) / 1200);
      const finalBaseFreq = (weaveBaseHz + wobbleLFO * 4) * vibratoRatio;

      const now = ctx.currentTime;
      if (state.myceliumFormantFilter && state.myceliumFormantGain) {
        state.myceliumFormantFilter.frequency.setTargetAtTime(myceliumMod.formantCenterHz, now, 0.18);
        state.myceliumFormantFilter.Q.setTargetAtTime(myceliumMod.formantQ, now, 0.18);
        state.myceliumFormantGain.gain.setTargetAtTime(myceliumMod.formantWet, now, 0.18);
      }

      if (osc.type !== preset.oscA) osc.type = preset.oscA;
      if (filter.type !== preset.filterType) filter.type = preset.filterType;

      osc.frequency.setTargetAtTime(finalBaseFreq, now, 0.15);
      filter.frequency.setTargetAtTime(targetCutoff + wobbleLFO * 800, now, 0.15);
      filter.Q.setTargetAtTime(preset.qBase + tParam * preset.qSpan + (room3Timbre?.resonanceFocus ?? 0) * 0.9, now, 0.15);
      gain.gain.setTargetAtTime((preset.gainA + tParam * preset.gainASpan + wobbleLFO * 0.015) * weaveGainLift * (1 + (room3Timbre?.bodyMix ?? 0) * 0.06), now, 0.15);

      if (state.oscB && state.gainB) {
        if (state.oscB.type !== preset.oscB) state.oscB.type = preset.oscB;
        state.oscB.frequency.setTargetAtTime(finalBaseFreq, now, 0.15);
        state.oscB.detune.setTargetAtTime(overtoneCents + profileMix * preset.overtoneDriftCents + (room3Timbre?.inharmonicity ?? 0) * 22, now, 0.15);
        state.gainB.gain.setTargetAtTime((preset.gainBBase + profileMix * preset.gainBProfile) * (1 + myzelGate * 0.08 + (room3Timbre?.partialGroups.formant ?? 0) * 0.04), now, 0.15);
      }
      if (state.lfo && state.lfoGain) {
        state.lfo.frequency.setTargetAtTime(preset.lfoBase + tParam * preset.lfoSpan, now, 0.15);
        state.lfoGain.gain.setTargetAtTime(2 + tParam * 10, now, 0.15);
      }

      DRONE_JI_OVERTONES.forEach((node) => {
        const o = state.jiOscs[node.label];
        const g = state.jiGains[node.label];
        if (o && g) {
          o.frequency.setTargetAtTime(finalBaseFreq * node.ratio, now, 0.15);
          const vol = p.droneJIOvertones[node.label] || 0;
          g.gain.setTargetAtTime(vol * 0.015, now, 0.15);
        }
        const mOsc = state.manualJiOscs[node.label];
        if (mOsc) mOsc.frequency.setTargetAtTime(finalBaseFreq * node.ratio, now, 0.15);
      });

      if (state.delayNode && state.delayFeedback) {
        state.delayNode.delayTime.setTargetAtTime(p.echoTempo / 1000, now, 0.1);
        state.delayFeedback.gain.setTargetAtTime(p.echoOn ? clamp(p.echoDecay ?? 0.6, 0, 0.96) : 0, now, 0.1);
      }

      const bg = c.createRadialGradient(state.cursorX, state.cursorY, 0, GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH);
      bg.addColorStop(0, "#1a1525");
      bg.addColorStop(1, "#050508");
      c.fillStyle = bg;
      c.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      c.strokeStyle = "rgba(120, 90, 160, 0.06)";
      c.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        for (let x = 0; x < GAME_WIDTH; x += 50) {
          const y = GAME_HEIGHT / 2 + Math.sin(x * 0.005 + t + i) * 150 * Math.sin(t * 0.2 + i * 0.5);
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }

      state.ripples = state.ripples.filter((r) => r.life > 0 && r.radius <= r.maxRadius + 16);
      state.ripples.forEach((r) => {
        r.radius += BASE_WAVE_SPEED;
        r.life = Math.max(0, 1 - r.radius / Math.max(1, r.maxRadius));
        const progress = r.maxRadius > 0 ? r.radius / r.maxRadius : 0;
        const scalar = waveIntensityScalar(progress, r.decay);
        c.beginPath();
        c.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        c.strokeStyle = `rgba(200, 150, 255, ${Math.max(0, r.life * scalar)})`;
        c.lineWidth = 1.5 + scalar * 1.8;
        c.stroke();
      });

      state.sectorPulses = state.sectorPulses.filter((pulse) => pulse.life > 0.01 && pulse.radius <= pulse.maxRadius + 16);
      state.sectorPulses.forEach((pulse) => {
        pulse.radius += BASE_WAVE_SPEED;
        pulse.life = Math.max(0, 1 - pulse.radius / Math.max(1, pulse.maxRadius));

        const centerAngle = pulse.direction === "right" ? 0 : pulse.direction === "up" ? -Math.PI / 2 : pulse.direction === "left" ? Math.PI : Math.PI / 2;
        const halfSector = Math.PI / 4;
        const start = centerAngle - halfSector;
        const end = centerAngle + halfSector;
        const progress = pulse.maxRadius > 0 ? pulse.radius / pulse.maxRadius : 0;
        const scalar = waveIntensityScalar(progress, pulse.decay);

        c.save();
        c.strokeStyle = `rgba(196, 181, 253, ${Math.max(0, pulse.life * scalar)})`;
        c.lineWidth = 1.5 + scalar * 1.8;
        c.beginPath();
        c.arc(pulse.x, pulse.y, pulse.radius, start, end);
        c.stroke();
        c.restore();
      });

      state.impactRipples = state.impactRipples.filter((ripple) => ripple.life > 0.02 && ripple.radius < 64);
      state.impactRipples.forEach((ripple) => {
        ripple.radius += 1.85;
        ripple.life -= 0.046;
        c.beginPath();
        c.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        if (ripple.hue === null) {
          c.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, ripple.life * 0.9)})`;
        } else {
          c.strokeStyle = `hsla(${ripple.hue}, 92%, 64%, ${Math.max(0, ripple.life * 0.86)})`;
        }
        c.lineWidth = 1.15;
        c.stroke();
      });

      state.agents.forEach((agent, aIdx) => {
        const agentHue = getImpactRippleHue(p.particleSystem, aIdx, state.agents.length) ?? 220;
        agent.vx += (Math.random() - 0.5) * 0.15;
        agent.vy += (Math.random() - 0.5) * 0.15;

        const cdx = state.cursorX - agent.x;
        const cdy = state.cursorY - agent.y;
        const cdist = Math.max(1, Math.hypot(cdx, cdy));
        if (cdist < 250) {
          agent.vx += (cdx / cdist) * 0.04;
          agent.vy += (cdy / cdist) * 0.04;
        }

        state.ripples.forEach((r) => {
          const rdx = r.x - agent.x;
          const rdy = r.y - agent.y;
          const rdist = Math.hypot(rdx, rdy);
          if (Math.abs(rdist - r.radius) < 8 && performance.now() - agent.lastHit > 400) {
            agent.lastHit = performance.now();
            spawnAgentImpactRipple(aIdx, agent.x, agent.y);
            const waveProgress = r.maxRadius > 0 ? r.radius / r.maxRadius : 0;
            const waveGain = waveIntensityScalar(waveProgress, r.decay);
            agent.lastHitGain = waveGain;
            agent.lastHitX = agent.x;
            agent.lastHitY = agent.y;

            agent.vx -= (rdx / rdist) * 3;
            agent.vy -= (rdy / rdist) * 3;
            state.wobble = Math.min(1.0, state.wobble + 0.35);

            if (!areDirectParticlesMuted(p) && p.agentEnabled[aIdx]) {
              const agentVolume = p.particleVolume * (p.agentVolumes[aIdx] ?? 1) * Math.pow(waveGain, 2.2);
              const soundFreq = clampFreq(targetFreq * agent.ratio, 80, 2400);
              playNexusAgentTone(
                soundFreq,
                agentVolume,
                p.echoOn && state.delayNode ? state.delayNode : undefined,
                undefined,
                undefined,
                { x: agent.x, y: agent.y },
              );
            }
          }
        });

        state.sectorPulses.forEach((pulse) => {
          if (pulse.hitAgents.includes(aIdx)) return;

          const dx = agent.x - pulse.x;
          const dy = agent.y - pulse.y;
          const dist = Math.hypot(dx, dy);
          if (Math.abs(dist - pulse.radius) > 8) return;

          const centerAngle = pulse.direction === "right" ? 0 : pulse.direction === "up" ? -Math.PI / 2 : pulse.direction === "left" ? Math.PI : Math.PI / 2;
          const halfSector = Math.PI / 4;
          const angle = Math.atan2(dy, dx);
          let delta = angle - centerAngle;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          if (Math.abs(delta) > halfSector) return;

          pulse.hitAgents.push(aIdx);
          agent.lastHit = performance.now();
          spawnAgentImpactRipple(aIdx, agent.x, agent.y);
          const waveProgress = pulse.maxRadius > 0 ? pulse.radius / pulse.maxRadius : 0;
          const waveGain = waveIntensityScalar(waveProgress, pulse.decay);
          agent.lastHitGain = waveGain;
          agent.lastHitX = agent.x;
          agent.lastHitY = agent.y;

          agent.vx += (dx / dist) * 3;
          agent.vy += (dy / dist) * 3;
          state.wobble = Math.min(1.0, state.wobble + 0.35);

          if (!areDirectParticlesMuted(p) && p.agentEnabled[aIdx]) {
            const agentVolume = p.particleVolume * (p.agentVolumes[aIdx] ?? 1) * Math.pow(waveGain, 2.2);
            const hitFreq = clampFreq(targetFreq * agent.ratio, 80, 2400);
            playNexusAgentTone(
              hitFreq,
              agentVolume,
              p.echoOn && state.delayNode ? state.delayNode : undefined,
              undefined,
              undefined,
              { x: agent.x, y: agent.y },
            );
          }
        });

        const speed = Math.hypot(agent.vx, agent.vy);
        if (speed > 2.5) {
          agent.vx = (agent.vx / speed) * 2.5;
          agent.vy = (agent.vy / speed) * 2.5;
        }

        agent.x += agent.vx;
        agent.y += agent.vy;

        if (agent.x < 50) agent.vx += 0.1;
        if (agent.x > GAME_WIDTH - 50) agent.vx -= 0.1;
        if (agent.y < 50) agent.vy += 0.1;
        if (agent.y > GAME_HEIGHT - 50) agent.vy -= 0.1;

        agent.history.push({ x: agent.x, y: agent.y });
        if (agent.history.length > 25) agent.history.shift();

        if (agent.history.length > 1) {
          c.beginPath();
          c.moveTo(agent.history[0].x, agent.history[0].y);
          for (let i = 1; i < agent.history.length; i++) c.lineTo(agent.history[i].x, agent.history[i].y);
          c.strokeStyle = `hsla(${agentHue}, 88%, 68%, ${0.13 + Math.sin(t * 2 + agent.phase) * 0.1})`;
          c.lineWidth = 3;
          c.stroke();
        }

        const hitGlow = Math.max(0, 1 - (performance.now() - agent.lastHit) * 0.002);
        c.fillStyle = `hsla(${agentHue}, 90%, ${72 + hitGlow * 10}%, ${0.38 + hitGlow * 0.58})`;
        c.beginPath();
        c.arc(agent.x, agent.y, 4 + hitGlow * 3, 0, Math.PI * 2);
        c.fill();

        c.fillStyle = `hsla(${agentHue}, 98%, ${82 + hitGlow * 8}%, ${0.34 + hitGlow * 0.66})`;
        c.font = "10px monospace";
        c.fillText(agent.label, agent.x + 8, agent.y + 4);
      });

      const focusCursor = focusCursorRef.current;
      const tetherDx = focusCursor.x - state.cursorX;
      const tetherDy = focusCursor.y - state.cursorY;
      const tetherDist = Math.hypot(tetherDx, tetherDy);

      const aura = c.createRadialGradient(state.cursorX, state.cursorY, 0, state.cursorX, state.cursorY, 120);
      aura.addColorStop(0, "rgba(220, 180, 255, 0.15)");
      aura.addColorStop(1, "rgba(220, 180, 255, 0)");
      c.fillStyle = aura;
      c.beginPath();
      c.arc(state.cursorX, state.cursorY, 120, 0, Math.PI * 2);
      c.fill();

      if (tetherDist > 2.5) {
        c.save();
        c.strokeStyle = `rgba(150, 210, 255, ${clamp(0.14 + tetherDist / 180, 0.16, 0.34)})`;
        c.lineWidth = 1;
        c.setLineDash([4, 4]);
        c.beginPath();
        c.moveTo(focusCursor.x, focusCursor.y);
        c.lineTo(state.cursorX, state.cursorY);
        c.stroke();
        c.restore();
      }

      c.save();
      c.strokeStyle = tetherDist > 2.5 ? "rgba(140, 220, 255, 0.9)" : "rgba(200, 220, 255, 0.62)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(focusCursor.x - 9, focusCursor.y);
      c.lineTo(focusCursor.x + 9, focusCursor.y);
      c.moveTo(focusCursor.x, focusCursor.y - 9);
      c.lineTo(focusCursor.x, focusCursor.y + 9);
      c.stroke();
      c.beginPath();
      c.arc(focusCursor.x, focusCursor.y, 2.2, 0, Math.PI * 2);
      c.fillStyle = tetherDist > 2.5 ? "rgba(188, 238, 255, 0.95)" : "rgba(228, 236, 255, 0.72)";
      c.fill();
      c.restore();

      c.fillStyle = "rgba(255, 255, 255, 0.9)";
      c.beginPath();
      c.arc(state.cursorX, state.cursorY, 4 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
      c.fill();

      if (p.gridOn) {
        c.fillStyle = "rgba(255, 255, 255, 0.35)";
        c.font = "10px monospace";
        c.textAlign = "left";

        const lines = getVisibleGridLines(p);
        const nowMs = performance.now();

        if (p.lockCursorToGrid) {
          const cursorFreq = freqFromY(state.cursorY);
          const cursorY = yFromFreq(cursorFreq);

          let nearestLineFreq: number | null = null;
          let nearestDist = Number.POSITIVE_INFINITY;
          for (const line of lines) {
            const y = GAME_HEIGHT * (1 - (line.freq - 55) / 385);
            const dist = Math.abs(y - cursorY);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestLineFreq = line.freq;
            }
          }

          if (nearestLineFreq !== null) {
            const prev = activeGridLineFreqRef.current;
            if (prev === null || Math.abs(prev - nearestLineFreq) > 0.001) {
              if (prev !== null) {
                previousGridLineFreqRef.current = prev;
                previousGridLineAtRef.current = nowMs;
              }
              activeGridLineFreqRef.current = nearestLineFreq;
              activeGridLineSinceRef.current = nowMs;
            }
          }
        } else {
          if (activeGridLineFreqRef.current !== null) {
            previousGridLineFreqRef.current = activeGridLineFreqRef.current;
            previousGridLineAtRef.current = nowMs;
          }
          activeGridLineFreqRef.current = null;
          activeGridLineSinceRef.current = 0;
        }

        const activeFreq = activeGridLineFreqRef.current;
        const activeAt = activeGridLineSinceRef.current;
        const previousFreq = previousGridLineFreqRef.current;
        const previousAt = previousGridLineAtRef.current;
        const activeY = activeFreq !== null ? yFromFreq(activeFreq) : null;
        const activeProgress = activeAt > 0 ? clamp((nowMs - activeAt) / 1000, 0, 1) : 0;
        const previousY = previousFreq !== null ? yFromFreq(previousFreq) : null;
        const previousProgress = previousAt > 0 ? clamp(1 - (nowMs - previousAt) / 650, 0, 1) : 0;
        const cursorXNorm = clamp(state.cursorX / GAME_WIDTH, 0, 1);
        const pulse = 0.92 + 0.08 * (0.5 + 0.5 * Math.sin(nowMs * 0.007));
        const keyboardGridDesc = buildKeyboardGridFrequencies(
          p.gridBase,
          p.gridTuning,
          p.manualGridMutedSteps,
          p.manualGridStepOffsets,
        );
        const keyboardWindowStart = Math.max(0, Math.min(Math.round(keyboardWindowOffsetRef.current), Math.max(0, keyboardGridDesc.length - 1)));
        const keyboardWindowEnd = Math.max(keyboardWindowStart, Math.min(keyboardGridDesc.length - 1, keyboardWindowStart + KAMMERTON_KEYS.length - 1));
        const keyboardWindowFreqs = keyboardGridDesc.slice(keyboardWindowStart, keyboardWindowEnd + 1);
        const isLineInKeyboardWindow = (freq: number) => keyboardWindowFreqs.some((target) => Math.abs(target - freq) < 0.12);
        lines.forEach((line) => {
          const y = GAME_HEIGHT * (1 - (line.freq - 55) / 385);
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(GAME_WIDTH, y);
          const isMuted = line.manualMuted || line.modeMuted;
          const isPlayedLine = p.lockCursorToGrid && activeY !== null && Math.abs(y - activeY) <= 1.4;
          const isAfterGlowLine = !isPlayedLine && previousY !== null && previousProgress > 0 && Math.abs(y - previousY) <= 1.4;
          if (isMuted) {
            c.strokeStyle = "rgba(255, 255, 255, 0.03)";
          } else if (isPlayedLine) {
            const blend = activeProgress * pulse;
            const bright = `rgba(78, 164, 98, ${0.68 * blend})`;
            const base = `rgba(42, 88, 58, ${0.16 + 0.34 * blend})`;
            const grad = c.createLinearGradient(0, y, GAME_WIDTH, y);
            const l = clamp(cursorXNorm - 0.16, 0, 1);
            const r = clamp(cursorXNorm + 0.16, 0, 1);
            grad.addColorStop(0, base);
            grad.addColorStop(l, base);
            grad.addColorStop(cursorXNorm, bright);
            grad.addColorStop(r, base);
            grad.addColorStop(1, base);
            c.strokeStyle = grad;
          } else if (isAfterGlowLine) {
            const alpha = 0.05 + 0.18 * previousProgress;
            c.strokeStyle = `rgba(48, 104, 66, ${alpha})`;
          } else {
            c.strokeStyle = "rgba(255, 255, 255, 0.12)";
          }
          c.stroke();
          
          const inKeyboardWindow = isLineInKeyboardWindow(line.freq);
          c.fillStyle = isMuted
            ? (inKeyboardWindow ? "rgba(255, 196, 196, 0.22)" : "rgba(255, 160, 160, 0.1)")
            : (inKeyboardWindow ? "rgba(235, 245, 255, 0.48)" : "rgba(255, 255, 255, 0.24)");
          c.fillText(line.label, 20, y - 4);

          if (line.stepIndex !== undefined) {
            c.beginPath();
            c.moveTo(15, y);
            c.lineTo(0, y - 5);
            c.lineTo(0, y + 5);
            c.closePath();
            if (isMuted) {
              c.fillStyle = inKeyboardWindow ? "rgba(255, 110, 110, 0.42)" : "rgba(110, 44, 44, 0.32)";
            } else if (isPlayedLine) {
              c.fillStyle = "rgba(78, 164, 98, 0.92)";
            } else if (inKeyboardWindow) {
              c.fillStyle = "rgba(132, 200, 255, 0.96)";
            } else {
              c.fillStyle = "rgba(86, 126, 168, 0.38)";
            }
            c.fill();
          }
        });
      }

      rafId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(rafId);
      osc.stop();
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
      if (nexusRefs.current.delayNode) nexusRefs.current.delayNode.disconnect();
      if (nexusRefs.current.delayFeedback) nexusRefs.current.delayFeedback.disconnect();
      Object.values(nexusRefs.current.jiOscs).forEach((o) => {
        o.stop();
        o.disconnect();
      });
      Object.values(nexusRefs.current.jiGains).forEach((g) => g.disconnect());
      nexusRefs.current.jiOscs = {};
      nexusRefs.current.jiGains = {};
    };
  }, [room, nexusActive, audioCtx]);

  useEffect(() => {
    if (room !== "GAME" || !gameActive) return;

    let rafId = 0;
    let last = performance.now();
    let hudTick = 0;

    const drawSurrealLandscape = (ctx: CanvasRenderingContext2D, t: number, level: number) => {
      const levelTwoPalette = level >= 2;
      const bg = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      if (levelTwoPalette) {
        bg.addColorStop(0, "#dce2d6");
        bg.addColorStop(0.44, "#c5c99f");
        bg.addColorStop(1, "#b3a177");
      } else {
        bg.addColorStop(0, "#d9d7d0");
        bg.addColorStop(0.5, "#c7c2b5");
        bg.addColorStop(1, "#b7ab98");
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      for (let i = 0; i < 14; i += 1) {
        const alpha = 0.08 + (i % 3) * 0.03;
        const stroke = levelTwoPalette ? "125, 170, 98" : "130, 140, 145";
        ctx.strokeStyle = `rgba(${stroke}, ${alpha})`;
        ctx.lineWidth = 8 + (i % 4) * 5;
        ctx.beginPath();
        ctx.moveTo(-60, 80 + i * 28);
        for (let x = 0; x <= GAME_WIDTH + 60; x += 70) {
          const y = 140 + i * 20 + Math.sin((x + t * 0.09 + i * 70) * 0.011) * (26 + i * 1.3);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT * 0.58);
      ctx.rotate(Math.sin(t * 0.00012) * 0.22);
      ctx.strokeStyle = levelTwoPalette ? "rgba(145, 132, 84, 0.35)" : "rgba(120, 98, 80, 0.32)";
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.ellipse(0, 0, 220, 140, 0, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 7; i += 1) {
        const ring = levelTwoPalette ? "188, 205, 139" : "180, 168, 144";
        ctx.strokeStyle = `rgba(${ring}, ${0.09 + i * 0.015})`;
        ctx.lineWidth = 12 - i;
        ctx.beginPath();
        ctx.ellipse(0, 0, 200 - i * 18, 125 - i * 13, Math.sin(t * 0.00016 + i) * 0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      if (levelTwoPalette) {
        ctx.save();
        ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT * 0.44);
        ctx.strokeStyle = "rgba(118, 155, 72, 0.24)";
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(-300, -20);
        ctx.bezierCurveTo(-180, -140, -40, -140, 40, -10);
        ctx.bezierCurveTo(120, 100, 210, 80, 300, -5);
        ctx.stroke();

        ctx.strokeStyle = "rgba(200, 182, 116, 0.25)";
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(-260, 70);
        ctx.bezierCurveTo(-120, 145, 10, 150, 130, 95);
        ctx.bezierCurveTo(210, 58, 240, 10, 278, 0);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(GAME_WIDTH / 2, GAME_HEIGHT - 95);
      ctx.fillStyle = levelTwoPalette ? "rgba(84, 86, 44, 0.6)" : "rgba(64, 58, 52, 0.72)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = levelTwoPalette ? "rgba(224, 219, 170, 0.52)" : "rgba(180, 166, 148, 0.62)";
      ctx.beginPath();
      ctx.arc(-11, -8, 7, 0, Math.PI * 2);
      ctx.arc(11, -8, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const spawnBurst = (x: number, y: number, hue: number) => {
      for (let i = 0; i < 10; i += 1) {
        gameRefs.current.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          life: 0.4 + Math.random() * 0.5,
          hue,
        });
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      hudTick += dt;

      const canvas = gameCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const state = gameRefs.current;
      state.elapsed += dt;
      state.invuln = Math.max(0, state.invuln - dt);
      state.levelUpTimer = Math.max(0, state.levelUpTimer - dt);

      const levelGoal = 34 + state.level * 12;
      const phase = state.score >= levelGoal * 0.72 ? "Radiant" : state.score >= levelGoal * 0.38 ? "Unstable" : "Dormant";
      const levelBoost = 1 + (state.level - 1) * 0.24;
      const enemyRateBase = phase === "Radiant" ? 0.32 : phase === "Unstable" ? 0.5 : 0.76;
      const enemyRate = enemyRateBase / levelBoost;
      const playerSpeed = 510;

      if (!state.over) {
        if (keyRef.current.left) state.playerX -= playerSpeed * dt;
        if (keyRef.current.right) state.playerX += playerSpeed * dt;
        state.playerX = Math.max(28, Math.min(GAME_WIDTH - 28, state.playerX));

        state.laserTimer -= dt;

        const hiddenTension = 0.48 + Math.sin(state.elapsed * 0.21 + state.phaseA) * 0.28;
        const hiddenSlim = 0.56 + Math.sin(state.elapsed * 0.17 + state.phaseB) * 0.32;
        const hiddenRaw = 0.5 + Math.sin(state.elapsed * 0.13 + state.phaseC) * 0.36;
        const centerX = GAME_WIDTH * 0.5;
        const centerY = GAME_HEIGHT * 0.46;

        let pullX = 0;
        let pullY = 0;
        state.anchorDist = Number.POSITIVE_INFINITY;
        state.anchors.forEach((anchor, idx) => {
          const orbitPhase = state.elapsed * (0.18 + anchor.orbit * 0.16) + anchor.jitter;
          const radialBreath = anchor.radius * (0.72 + hiddenSlim * 0.45) + Math.sin(state.elapsed * (0.7 + idx * 0.08) + anchor.jitter) * (15 + hiddenRaw * 18);
          const theta = anchor.angle + orbitPhase;
          anchor.x = centerX + Math.cos(theta) * radialBreath;
          anchor.y = centerY + Math.sin(theta) * radialBreath * (0.67 + hiddenTension * 0.26);

          const dx = anchor.x - state.orb.x;
          const dy = anchor.y - state.orb.y;
          const dist = Math.max(24, Math.hypot(dx, dy));
          const influence = (anchor.weight * (0.5 + hiddenTension)) / (dist * dist + 1000);
          pullX += dx * influence;
          pullY += dy * influence;
          if (dist < state.anchorDist) {
            state.anchorDist = dist;
            state.activeAnchorRatio = anchor.ratio;
            state.activeAnchorLabel = anchor.label;
          }
        });

        if (keyRef.current.shoot && state.laserTimer <= 0) {
          state.lasers.push({ x: state.playerX, y: state.playerY - 14, vx: 0, vy: -880, r: 5 });
          state.laserTimer = 0.13;
          playPlayerShotMotif(state.activeAnchorRatio);
        }

        const wander = (95 + hiddenRaw * 235) * levelBoost;
        const jerk = (210 + hiddenTension * 360) * levelBoost;
        state.orb.vx += pullX * (4100 + hiddenTension * 4300) * dt * (1 + (state.level - 1) * 0.18) + (Math.random() - 0.5) * (wander + jerk * Math.random()) * dt;
        state.orb.vy += pullY * (4100 + hiddenTension * 4300) * dt * (1 + (state.level - 1) * 0.18) + (Math.random() - 0.5) * (wander + jerk * Math.random()) * dt;

        const damping = Math.min(0.985, 0.89 + hiddenSlim * 0.07 + (state.level - 1) * 0.012);
        state.orb.vx *= damping;
        state.orb.vy *= damping;
        const maxSpeed = 250 + hiddenRaw * 260 + (phase === "Radiant" ? 120 : phase === "Unstable" ? 60 : 0) + (state.level - 1) * 120;
        const speed = Math.hypot(state.orb.vx, state.orb.vy);
        if (speed > maxSpeed) {
          state.orb.vx = (state.orb.vx / speed) * maxSpeed;
          state.orb.vy = (state.orb.vy / speed) * maxSpeed;
        }
        state.orb.x += state.orb.vx * dt;
        state.orb.y += state.orb.vy * dt;

        const pad = 48;
        if (state.orb.x < pad) {
          state.orb.x = pad;
          state.orb.vx = Math.abs(state.orb.vx) * 0.8;
        }
        if (state.orb.x > GAME_WIDTH - pad) {
          state.orb.x = GAME_WIDTH - pad;
          state.orb.vx = -Math.abs(state.orb.vx) * 0.8;
        }
        if (state.orb.y < pad) {
          state.orb.y = pad;
          state.orb.vy = Math.abs(state.orb.vy) * 0.8;
        }
        if (state.orb.y > GAME_HEIGHT * 0.72) {
          state.orb.y = GAME_HEIGHT * 0.72;
          state.orb.vy = -Math.abs(state.orb.vy) * 0.8;
        }

        state.orb.r = 29 + hiddenTension * 4 + Math.sin(state.elapsed * (2.6 + hiddenRaw)) * 3;

        state.enemyTimer -= dt;
        if (state.enemyTimer <= 0) {
          const chaosPulse = nextGameChaos();
          const isLevelOne = state.level === 1;
          const isLevelTwo = state.level === 2;
          const projectileSpeedScale = isLevelOne ? 0.72 : isLevelTwo ? 0.84 : 1;
          const projectileSize = isLevelOne ? 6 : isLevelTwo ? 6.6 : 7.5;
          const pattern = chaosPulse < 0.33 ? "fan" : chaosPulse < 0.66 ? "spiral" : "aim";
          if (pattern === "fan") {
            const spread = isLevelOne ? 1 : isLevelTwo ? (phase === "Radiant" ? 2 : 1) : phase === "Radiant" ? 4 : phase === "Unstable" ? 3 : 2;
            for (let i = -spread; i <= spread; i += 1) {
              const angle = Math.PI / 2 + i * (0.12 + chaosPulse * 0.12);
              const speed = (230 + Math.random() * 170) * projectileSpeedScale;
              state.bolts.push({ x: state.orb.x, y: state.orb.y + 20, vx: Math.cos(angle) * speed * 0.48, vy: Math.sin(angle) * speed, r: projectileSize + Math.random() * (isLevelOne ? 1.1 : 2) });
            }
          } else if (pattern === "spiral") {
            const burst = isLevelOne ? 3 : isLevelTwo ? (phase === "Radiant" ? 4 : 3) : phase === "Radiant" ? 6 : 4;
            const spinBase = state.elapsed * 4.6 + chaosPulse * Math.PI * 2;
            for (let i = 0; i < burst; i += 1) {
              const angle = spinBase + i * ((Math.PI * 2) / burst);
              const speed = (210 + i * 24 + Math.random() * 70) * projectileSpeedScale;
              state.bolts.push({ x: state.orb.x, y: state.orb.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: isLevelOne ? 5.8 : 6.5 });
            }
          } else {
            const aimDx = state.playerX - state.orb.x;
            const aimDy = state.playerY - state.orb.y;
            const aimNorm = Math.max(1, Math.hypot(aimDx, aimDy));
            const aimed = isLevelOne ? 2 : isLevelTwo ? (phase === "Radiant" ? 3 : 2) : phase === "Radiant" ? 4 : 3;
            for (let i = 0; i < aimed; i += 1) {
              const jitter = (Math.random() - 0.5) * (isLevelOne ? 0.62 : isLevelTwo ? 0.58 : 0.46);
              const cs = Math.cos(jitter);
              const sn = Math.sin(jitter);
              const ux = aimDx / aimNorm;
              const uy = aimDy / aimNorm;
              const rx = ux * cs - uy * sn;
              const ry = ux * sn + uy * cs;
              const speed = (290 + Math.random() * 120 + i * 24) * projectileSpeedScale;
              state.bolts.push({ x: state.orb.x, y: state.orb.y, vx: rx * speed, vy: ry * speed, r: projectileSize });
            }
          }
          const cadenceJitter = isLevelOne ? 0.92 + nextGameChaos() * 1.25 : isLevelTwo ? 0.72 + nextGameChaos() * 1.14 : 0.44 + nextGameChaos() * (0.98 + state.level * 0.06);
          state.enemyTimer = enemyRate * cadenceJitter;
          if (!isLevelOne && !isLevelTwo && phase !== "Dormant" && nextGameChaos() > 0.74) state.enemyTimer *= 0.56;
          playOrbShotSound(state.activeAnchorRatio, phase);
        }
      }

      state.lasers = state.lasers.filter((laser) => {
        laser.x += laser.vx * dt;
        laser.y += laser.vy * dt;
        return laser.y > -30;
      });

      state.bolts = state.bolts.filter((bolt) => {
        bolt.x += bolt.vx * dt;
        bolt.y += bolt.vy * dt;
        return bolt.y < GAME_HEIGHT + 35 && bolt.x > -40 && bolt.x < GAME_WIDTH + 40;
      });

      for (let i = state.lasers.length - 1; i >= 0; i -= 1) {
        const laser = state.lasers[i];
        const dx = laser.x - state.orb.x;
        const dy = laser.y - state.orb.y;
        if (Math.hypot(dx, dy) < state.orb.r + laser.r) {
          state.lasers.splice(i, 1);
          state.score += 1;
          state.totalScore += 1;
          state.hits += 1;
          spawnBurst(state.orb.x, state.orb.y, 38);
          playOrbHitSound(state.activeAnchorRatio);
          const heartChance = state.level === 1 ? 0.08 : state.level === 2 ? 0.06 : 0.04;
          if (Math.random() < heartChance && state.hearts.length < 1 && state.heartDropCooldown <= 0) {
            state.hearts.push({ x: state.orb.x + (Math.random() - 0.5) * 20, y: state.orb.y + 10, vx: (Math.random() - 0.5) * 90, vy: 68 + Math.random() * 55, r: 10, spin: Math.random() * Math.PI * 2, life: 8 });
            state.heartDropCooldown = 6 + Math.random() * 5;
          }
          if (state.score >= levelGoal) {
            const previousLevel = state.level;
            state.level += 1;
            state.score = 0;
            state.levelUpFrom = previousLevel;
            state.levelUpTo = state.level;
            state.levelUpTimer = 1.8;
            state.enemyTimer = 0.5;
            state.orb.x = GAME_WIDTH * (0.25 + Math.random() * 0.5);
            state.orb.y = 120 + Math.random() * 120;
            state.orb.vx = (120 + Math.random() * 130) * (Math.random() > 0.5 ? 1 : -1) * (1 + (state.level - 1) * 0.2);
            state.orb.vy = (-40 + Math.random() * 120) * (1 + (state.level - 1) * 0.2);
            state.bolts.length = 0;
            state.lasers.length = 0;
            state.hearts.length = 0;
            state.heartDropCooldown = 2.5;
            state.hp = 6;
            spawnBurst(state.orb.x, state.orb.y, 56);
          }
        }
      }

      for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
        const bolt = state.bolts[i];
        const dx = bolt.x - state.playerX;
        const dy = bolt.y - state.playerY;
        if (Math.hypot(dx, dy) < state.playerRadius + bolt.r && state.invuln <= 0) {
          state.bolts.splice(i, 1);
          state.hp -= 1;
          state.invuln = 0.8;
          spawnBurst(state.playerX, state.playerY, 195);
          playPlayerHitSound(state.activeAnchorRatio);
          if (state.hp <= 0) {
            state.over = true;
            state.won = false;
          }
        }
      }

      state.particles = state.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= dt;
        return p.life > 0;
      });

      state.hearts = state.hearts.filter((heart) => {
        heart.x += heart.vx * dt;
        heart.y += heart.vy * dt;
        heart.vx *= 0.985;
        heart.vy += 18 * dt;
        heart.spin += dt * 1.7;
        heart.life -= dt;
        if (heart.life <= 0 || heart.y > GAME_HEIGHT + 30 || heart.x < -40 || heart.x > GAME_WIDTH + 40) return false;
        const dx = heart.x - state.playerX;
        const dy = heart.y - state.playerY;
        if (Math.hypot(dx, dy) < state.playerRadius + heart.r + 2) {
          state.hp = Math.min(6, state.hp + 1);
          spawnBurst(heart.x, heart.y, 118);
          playHeartPickupChord(state.activeAnchorRatio);
          return false;
        }
        return true;
      });

      state.heartDropCooldown = Math.max(0, state.heartDropCooldown - dt);

      drawSurrealLandscape(ctx, now, state.level);

      const aura = ctx.createRadialGradient(state.orb.x, state.orb.y, 10, state.orb.x, state.orb.y, 90);
      aura.addColorStop(0, "rgba(238, 255, 220, 0.85)");
      aura.addColorStop(0.45, "rgba(160, 248, 245, 0.35)");
      aura.addColorStop(1, "rgba(80, 110, 130, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(state.orb.x, state.orb.y, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,240,0.96)";
      ctx.beginPath();
      ctx.arc(state.orb.x, state.orb.y, state.orb.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 180, 90, 0.9)";
      ctx.lineWidth = 2.5;
      state.lasers.forEach((laser) => {
        ctx.beginPath();
        ctx.moveTo(laser.x, laser.y + 20);
        ctx.lineTo(laser.x, laser.y - 12);
        ctx.stroke();
      });

      ctx.fillStyle = "rgba(130, 220, 255, 0.78)";
      state.bolts.forEach((bolt) => {
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, bolt.r, 0, Math.PI * 2);
        ctx.fill();
      });

      state.hearts.forEach((heart) => {
        ctx.save();
        ctx.translate(heart.x, heart.y);
        ctx.rotate(Math.sin(heart.spin) * 0.22);
        const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 24);
        glow.addColorStop(0, "rgba(245, 122, 162, 0.56)");
        glow.addColorStop(1, "rgba(245, 122, 162, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 119, 156, 0.96)";
        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.bezierCurveTo(-12, -2, -13, -15, -3.2, -16);
        ctx.bezierCurveTo(0, -15, 0.6, -11, 0, -8);
        ctx.bezierCurveTo(-0.6, -11, 0, -15, 3.2, -16);
        ctx.bezierCurveTo(13, -15, 12, -2, 0, 8);
        ctx.fill();
        ctx.restore();
      });

      const turretGlow = ctx.createRadialGradient(state.playerX, state.playerY - 6, 4, state.playerX, state.playerY - 6, 30);
      turretGlow.addColorStop(0, "rgba(255, 244, 196, 0.45)");
      turretGlow.addColorStop(1, "rgba(255, 244, 196, 0)");
      ctx.fillStyle = turretGlow;
      ctx.beginPath();
      ctx.arc(state.playerX, state.playerY - 6, 32, 0, Math.PI * 2);
      ctx.fill();

      const hull = ctx.createLinearGradient(state.playerX, state.playerY - 16, state.playerX, state.playerY + 16);
      hull.addColorStop(0, state.invuln > 0 ? "rgba(255, 232, 170, 0.98)" : "rgba(68, 66, 59, 0.98)");
      hull.addColorStop(1, state.invuln > 0 ? "rgba(188, 146, 85, 0.98)" : "rgba(26, 25, 23, 0.98)");
      ctx.fillStyle = hull;
      ctx.beginPath();
      ctx.moveTo(state.playerX - 28, state.playerY + 12);
      ctx.lineTo(state.playerX - 18, state.playerY - 10);
      ctx.lineTo(state.playerX + 18, state.playerY - 10);
      ctx.lineTo(state.playerX + 28, state.playerY + 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(214, 192, 143, 0.9)";
      ctx.fillRect(state.playerX - 8, state.playerY - 26, 16, 16);
      ctx.fillStyle = "rgba(188, 148, 92, 0.96)";
      ctx.fillRect(state.playerX - 4, state.playerY - 40, 8, 16);

      ctx.strokeStyle = "rgba(255, 219, 156, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(state.playerX - 18, state.playerY - 1);
      ctx.lineTo(state.playerX + 18, state.playerY - 1);
      ctx.stroke();

      state.particles.forEach((p) => {
        ctx.fillStyle = `hsla(${p.hue}, 80%, 72%, ${Math.max(0, p.life)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      });

      if (state.levelUpTimer > 0 && !state.over) {
        const alpha = Math.min(0.85, state.levelUpTimer / 1.8);
        ctx.fillStyle = `rgba(7, 8, 10, ${0.24 + alpha * 0.32})`;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255, 228, 164, ${0.65 + alpha * 0.35})`;
        ctx.font = "700 36px Space Grotesk";
        ctx.fillText(`LEVEL ${state.levelUpTo}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 18);
        ctx.font = "500 16px Space Grotesk";
        ctx.fillStyle = `rgba(226, 219, 196, ${0.7 + alpha * 0.25})`;
        ctx.fillText(`Uebergang von Level ${state.levelUpFrom} zu ${state.levelUpTo} - Irrlicht beschleunigt.`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 18);
      }

      if (state.over) {
        ctx.fillStyle = "rgba(0,0,0,0.48)";
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        ctx.fillStyle = "#f4ecd9";
        ctx.font = "700 36px Space Grotesk";
        ctx.textAlign = "center";
        ctx.fillText(state.won ? "Irrlicht gebunden" : "Das Irrlicht entkommt", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 22);
        ctx.font = "500 18px Space Grotesk";
        ctx.fillText("Druecke Restart fuer einen neuen Run.", GAME_WIDTH / 2, GAME_HEIGHT / 2 + 18);
      }

      if (hudTick > 0.12) {
        hudTick = 0;
        setGameHud({
          score: state.score,
          goal: 34 + state.level * 12,
          total: state.totalScore,
          hp: Math.max(0, state.hp),
          phase,
          time: state.elapsed,
          level: state.level,
          anchor: state.activeAnchorLabel,
          message: state.over
            ? state.won
              ? "Run erfolgreich abgeschlossen."
              : "Run beendet."
            : state.levelUpTimer > 0
              ? `Level Up: ${state.levelUpFrom} -> ${state.levelUpTo}. Das Irrlicht ist jetzt schneller.`
              : `Level ${state.level}: Weiche den Energiephaenomenen aus und triff das Irrlicht.`,
        });
      }

      if (!state.over) {
        rafId = requestAnimationFrame(tick);
      } else {
        setGameActive(false);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [room, gameActive]);

  const startGameRun = async () => {
    await initAudio();
    gameRefs.current = {
      playerX: GAME_WIDTH / 2,
      playerY: GAME_HEIGHT - 60,
      playerRadius: 18,
      orb: { x: GAME_WIDTH / 2, y: 140, r: 34, vx: 150, vy: -70 },
      anchors: JI_NODES.map((ji, idx) => ({
        ratio: ji.ratio,
        label: ji.label,
        angle: (Math.PI * 2 * idx) / JI_NODES.length,
        radius: 80 + idx * 24,
        jitter: Math.random() * Math.PI * 2,
        orbit: 0.8 + Math.random() * 0.9,
        weight: 0.7 + ji.ratio * 0.35,
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT * 0.46,
      })),
      phaseA: Math.random() * Math.PI * 2,
      phaseB: Math.random() * Math.PI * 2,
      phaseC: Math.random() * Math.PI * 2,
      soundChaos: 0.52 + Math.random() * 0.18,
      melodicDrift: (Math.random() - 0.5) * 0.3,
      activeAnchorRatio: 1,
      activeAnchorLabel: "Root",
      anchorDist: Number.POSITIVE_INFINITY,
      chaos: 0.63,
      shotCount: 0,
      lasers: [],
      bolts: [],
      hearts: [],
      heartDropCooldown: 0,
      particles: [],
      score: 0,
      totalScore: 0,
      level: 1,
      levelUpTimer: 0,
      levelUpFrom: 1,
      levelUpTo: 1,
      hp: 6,
      hits: 0,
      elapsed: 0,
      enemyTimer: 0.9,
      laserTimer: 0,
      invuln: 0,
      over: false,
      won: false,
      commonsClock: 0,
      commonsStep: 0,
      commonsStepDur: 0.14,
    };
    setGameHud({
      score: 0,
      goal: 46,
      total: 0,
      hp: 6,
      phase: "Dormant",
      time: 0,
      level: 1,
      anchor: "Root",
      message: "Run gestartet. Unsichtbare JI-Anker formen den Irrlichtflug.",
    });
    setGameActive(true);
  };

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;
    let raf = 0;

    const syncDroneMix = () => {
      const refs = nexusRefs.current;
      const now = audioCtx.currentTime;

      if (refs.droneVolumeBus) refs.droneVolumeBus.gain.setTargetAtTime(clamp(droneVolume, 0, 1), now, 0.03);

      let rGain = 1.0;
      if (refs.droneRhythmGain) {
        const mode = nParamsUI.droneRhythm;
        if (mode !== "Off") {
          const tempo = clamp(nParamsUI.quantizeBpm || 120, 40, 240);
          const beatLen = 60 / tempo;
          const step16 = beatLen / 4;
          const time = now;

          if (mode === "Puls 1/4") {
            const phase = (time % beatLen) / beatLen;
            rGain = Math.max(0, 1 - Math.pow(phase, 1.5));
          } else if (mode === "Puls 1/8") {
            const phase = (time % (beatLen / 2)) / (beatLen / 2);
            rGain = Math.max(0, 1 - Math.pow(phase, 1.2));
          } else if (mode === "Puls 1/16") {
            const phase = (time % step16) / step16;
            rGain = Math.max(0, 1 - phase);
          } else if (mode === "Synkope") {
            const absoluteStep = Math.floor(time / step16);
            const step = absoluteStep % 16;
            const pattern = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0];
            const pVal = pattern[step] ?? 0;
            const phase = (time % step16) / step16;
            rGain = pVal * Math.max(0, 1 - Math.pow(phase, 0.7));
          }
        }
      }

      const presetMix = nParamsUI.droneJIOvertonesByPreset?.[nParamsUI.dronePreset];
      const mix = presetMix ?? nParamsUI.droneJIOvertones;
      const timbre = clamp(nParamsUI.droneTimbre, 0, 1);
      const myzelGate = myzelEnabled ? myzelGateRef.current : 0;
      const myzelLayer = myzelEnabled ? myzelLayerModRef.current : null;
      const room3Modal = room3BodyEnabled && myzelEnabled ? room3ModalStateRef.current : null;
      const weaveRatios = myzelLayer?.overtoneRatios ?? [];

      if (refs.droneRhythmGain) {
        const wovenRhythm = clamp(rGain * (0.78 + myzelGate * 0.28) + myzelGate * 0.08, 0, 1.15);
        refs.droneRhythmGain.gain.setTargetAtTime(wovenRhythm, now, 0.03);
      }

      if (refs.manualJiMaster) {
        refs.manualJiMaster.gain.setTargetAtTime(1 + myzelGate * 0.12 + (myzelLayer?.shimmer ?? 0) * 1.5, now, 0.05);
      }

      if (refs.droneDriveRefs) {
        updateDroneDriveInsert(refs.droneDriveRefs, now, {
          enabled: !!nParamsUI.droneDriveOn,
          amount: nParamsUI.droneDriveAmount ?? 0.36,
          tone: nParamsUI.droneDriveTone ?? 0.56,
          mix: nParamsUI.droneDriveMix ?? 0.48,
          output: nParamsUI.droneDriveOutput ?? 0.9,
          myzelGate,
          shimmer: myzelLayer?.shimmer ?? 0,
          bodyCoupling: room3BodyEnabled ? room3BodyControls.coupling : 0,
          bodyFlux: room3Modal?.exciterGain ?? 0,
          bodyTension: room3Modal?.preDriveAmount ?? 0,
          bodyRoughness: room3BodyEnabled ? room3BodyControls.roughness : 0,
          resonanceFocus: room3BodyEnabled ? room3TimbreStateRef.current.resonanceFocus : 0.5,
        });
      }

      if (refs.flangerWet && refs.flangerFeedback) {
        const myceliumFlanger = myceliumDroneModRef.current.flangerBias;
        const weaveFlanger = (myzelLayer?.shimmer ?? 0) * 1.8 + myzelGate * 0.12;
        const flangerAmt = clamp((nParamsUI.droneFlanger ?? 0) + myceliumFlanger + weaveFlanger, 0, 1);
        refs.flangerWet.gain.setTargetAtTime(flangerAmt * 0.8, now, 0.05);
        refs.flangerFeedback.gain.setTargetAtTime(0.4 + flangerAmt * 0.5, now, 0.05);
      }

      for (const overtone of DRONE_JI_OVERTONES) {
        const gain = refs.manualJiGains[overtone.label];
        if (gain) {
          const amount = clamp(mix?.[overtone.label] ?? 0, 0, 1);
          const weaveMatch = myzelEnabled ? getWeaveMatch(overtone.label, weaveRatios) : 0;
          const weaveBoost = 1 + weaveMatch * (0.28 + myzelGate * 0.35);
          const shimmerLift = 1 + (myzelLayer?.shimmer ?? 0) * 2.2;
          const bodyWeight = room3Modal ? getPartialGroupWeight(overtone.label, room3Modal.partialGroups) : 1;
          const target = clamp(amount * timbre * 0.22 * weaveBoost * shimmerLift * bodyWeight, 0, 0.42);
          gain.gain.setTargetAtTime(target, now, 0.02);
        }
      }

      raf = requestAnimationFrame(syncDroneMix);
    };

    raf = requestAnimationFrame(syncDroneMix);
    return () => cancelAnimationFrame(raf);
  }, [audioCtx, nexusActive, myzelEnabled, droneVolume, nParamsUI.droneTimbre, nParamsUI.dronePreset, nParamsUI.droneJIOvertones, nParamsUI.droneJIOvertonesByPreset, nParamsUI.droneRhythm, nParamsUI.quantizeBpm, nParamsUI.droneFlanger, nParamsUI.droneDriveOn, nParamsUI.droneDriveAmount, nParamsUI.droneDriveTone, nParamsUI.droneDriveMix, nParamsUI.droneDriveOutput, room3BodyEnabled, room3BodyControls.coupling, room3BodyControls.roughness, room3BodyControls.resonance]);

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;
    let timerID = 0;

    const drumMachine = createDrumMachine(audioCtx, ensureDrumMixBus(audioCtx));

    const resolveBassRootHz = () => {
      const p = nexusParamsRef.current;
      if (p.bassRootMode === "fixed") return p.bassRootHz;
      let cursorFreq = freqFromY(nexusRefs.current.cursorY);
      while (cursorFreq > 80) cursorFreq /= 2;
      return cursorFreq;
    };

    const getDrumStyle = (): DrumStyle => ({
      edge: clamp(nexusParamsRef.current.drumEdge ?? DEFAULT_DRUM_STYLE.edge, 0, 1),
      softness: clamp(nexusParamsRef.current.drumSoftness ?? DEFAULT_DRUM_STYLE.softness, 0, 1),
      air: clamp(nexusParamsRef.current.drumAir ?? DEFAULT_DRUM_STYLE.air, 0, 1),
      snap: clamp(nexusParamsRef.current.drumSnap ?? DEFAULT_DRUM_STYLE.snap, 0, 1),
      swing: clamp(nexusParamsRef.current.grooveSwing ?? DEFAULT_DRUM_STYLE.swing, 0, 1),
    });

    const playBassNote = (time: number, freq: number, vol: number, dur: number, accent = 0.72, extras?: { glideToNext?: boolean; ghost?: boolean }) => {
      const p = nexusParamsRef.current;
      const tone = clamp(p.bassTone ?? 0.48, 0, 1);
      const grit = clamp(p.bassGrit ?? 0.18, 0, 1);
      const ghost = !!extras?.ghost;
      const osc = audioCtx.createOscillator();
      const oscB = audioCtx.createOscillator();
      const subOsc = audioCtx.createOscillator();
      const pre = audioCtx.createGain();
      const shaper = audioCtx.createWaveShaper();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      osc.type = grit > 0.56 ? "square" : "sawtooth";
      oscB.type = ghost ? "sine" : "triangle";
      subOsc.type = "sine";
      osc.connect(pre);
      oscB.connect(pre);
      subOsc.connect(pre);
      pre.connect(shaper);
      shaper.connect(filter);
      filter.connect(gain);
      gain.connect(ensureFinalMixBus(audioCtx));
      if (enterHoldPsyFxEnabled && enterHoldRef.current) {
        ensureEnterHoldPsyFxDevice(audioCtx);
        if (enterHoldPsyFxSendsRef.current.bass) gain.connect(enterHoldPsyFxSendsRef.current.bass);
      }
      shaper.curve = (() => {
        const samples = 1024;
        const curve = new Float32Array(samples);
        const amount = 0.65 + grit * 2.6;
        for (let i = 0; i < samples; i += 1) {
          const x = (i / (samples - 1)) * 2 - 1;
          curve[i] = Math.tanh(x * amount);
        }
        return curve;
      })();
      pre.gain.value = (ghost ? 0.46 : 0.7) + grit * 0.16;
      filter.type = "lowpass";
      const openHz = clamp(freq * (1.8 + tone * 3.8) * (0.9 + accent * 0.25), 120, 4200);
      const closedHz = clamp(freq * (0.95 + tone * 1.4), 80, 2200);
      filter.frequency.setValueAtTime(openHz, time);
      filter.frequency.exponentialRampToValueAtTime(closedHz, time + dur * 0.58);
      filter.Q.setValueAtTime((ghost ? 0.35 : 0.55) + grit * 1.1 + accent * 0.22, time);
      osc.frequency.setValueAtTime(freq, time);
      oscB.frequency.setValueAtTime(freq * (ghost ? 1.0015 : 1.004), time);
      subOsc.frequency.setValueAtTime(freq / 2, time);
      if (extras?.glideToNext) {
        const glideTime = Math.min(time + dur * 0.42, time + 0.08);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.122, glideTime);
        oscB.frequency.exponentialRampToValueAtTime(freq * 1.118, glideTime);
      }
      gain.gain.setValueAtTime(Math.max(0.0001, vol * (ghost ? 0.42 : 0.72 + accent * 0.5)), time);
      gain.gain.setTargetAtTime(0.0001, time + dur * 0.76, (ghost ? 0.016 : 0.024) + (1 - tone) * 0.02);
      osc.start(time);
      oscB.start(time);
      subOsc.start(time);
      osc.stop(time + dur);
      oscB.stop(time + dur);
      subOsc.stop(time + dur);
    };

    const scheduleRhythmForgeDrumStep = (pattern: GeneratedPattern, step: number, time: number, drumLevel: number, kit: DrumKit, drumStyle: DrumStyle) => {
      const softSwing = (pattern.swing - 0.5) * 0.032;
      const push = step % 2 === 1 ? softSwing : -softSwing * 0.3;
      const scheduledTime = Math.max(0, time + push);
      const dStepKick = pattern.kick[step];
      const dStepSnare = pattern.snare[step];
      const dStepHat = pattern.hat[step];
      if (dStepKick?.active) drumMachine.trigger("kick", scheduledTime, drumLevel * (0.72 + (dStepKick.accent ?? 0.6) * 0.55), kit, drumStyle);
      if (dStepSnare?.active) drumMachine.trigger((dStepSnare.accent ?? 0.6) > 0.78 ? "snare" : "clap", scheduledTime, drumLevel * (0.42 + (dStepSnare.accent ?? 0.6) * 0.5), kit, drumStyle);
      if (dStepHat?.active) {
        const hatVoice = (dStepHat.accent ?? 0.4) > 0.62 && step % 4 === 3 ? "hat_open" : "hat_closed";
        drumMachine.trigger(hatVoice, scheduledTime, drumLevel * (0.2 + (dStepHat.accent ?? 0.4) * 0.34), kit, drumStyle);
      }
    };

    const scheduleExportedDrumConfigStep = (stepIndex: number, time: number, drumLevel: number, drumStyle: DrumStyle) => {
      const entry = selectedExportedDrumConfig;
      if (!entry) return;
      const totalSteps = Math.max(1, entry.stepCount || entry.bars * 16 || 16);
      const localStep = ((stepIndex % totalSteps) + totalSteps) % totalSteps;
      const laneOrder = (entry.laneOrder?.length ? entry.laneOrder : ["kick", "snare", "hatClosed", "hatOpen", "clap", "perc"]) as DrumLaneId[];
      laneOrder.forEach((laneId) => {
        const value = entry.laneSteps?.[laneId]?.[localStep] ?? 0;
        if (value <= 0) return;
        const gain = drumLevel * (value >= 0.95 ? 1 : value >= 0.8 ? 0.84 : 0.62);
        const voice = laneId === "hatClosed" ? "hat_closed" : laneId === "hatOpen" ? "hat_open" : laneId;
        drumMachine.trigger(voice as any, time, gain, entry.drumKit as DrumKit, {
          ...drumStyle,
          edge: laneId === "hatClosed" || laneId === "hatOpen" ? Math.max(drumStyle.edge, 0.58) : drumStyle.edge,
          air: laneId === "hatOpen" || laneId === "clap" ? Math.max(drumStyle.air, 0.54) : drumStyle.air,
          snap: value >= 0.95 ? Math.max(drumStyle.snap, 0.68) : drumStyle.snap,
          softness: laneId === "kick" ? Math.min(drumStyle.softness, 0.42) : drumStyle.softness,
        });
      });
    };

    const scheduleRhythmForgeBassStep = (pattern: GeneratedPattern, step: number, time: number, bassLevel: number) => {
      const softSwing = (pattern.swing - 0.5) * 0.032;
      const push = step % 2 === 1 ? softSwing : -softSwing * 0.3;
      const scheduledTime = Math.max(0, time + push);
      const bStep = pattern.bass[step];
      if (bStep?.active) {
        const baseDur = (60 / Math.max(40, nexusParamsRef.current.quantizeBpm) / 4) * (0.66 + pattern.noteLength);
        const dur = bStep.tie ? baseDur * 1.55 : baseDur;
        const freq = resolveBassRootHz() * bStep.ratio * Math.pow(2, bStep.octave);
        playBassNote(scheduledTime, freq, bassLevel, dur, bStep.accent ?? 0.7, { glideToNext: bStep.glideToNext, ghost: (bStep.accent ?? 0.7) < 0.45 });
      }
    };

    const schedulePsyBassStep = (pattern: PsyBassPattern, step: number, time: number, bassLevel: number) => {
      const softSwing = pattern.swing * 0.028;
      const push = step % 2 === 1 ? softSwing : -softSwing * 0.18;
      const scheduledTime = Math.max(0, time + push);
      const bStep = pattern.steps[step % pattern.steps.length];
      if (!bStep?.active) return;
      const freq = pattern.rootHz * Math.pow(2, (bStep.semitone + bStep.octave * 12) / 12);
      const stepBase = 60 / Math.max(40, nexusParamsRef.current.quantizeBpm) / 4;
      const dur = stepBase * clamp(0.22 + bStep.length * 1.25, 0.12, 1.7);
      playBassNote(scheduledTime, freq, bassLevel * (bStep.ghost ? 0.64 : 1), dur, bStep.accent, { glideToNext: bStep.glideToNext, ghost: bStep.ghost });
    };

    const applyMyzelLayerStep = (time: number, step: number) => {
      const refs = nexusRefs.current;
      if (!myzelEnabled) {
        if (refs.myzelMasterGain) refs.myzelMasterGain.gain.setTargetAtTime(0.0001, time, 0.05);
        return;
      }
      const baseHz = nParamsUI.bassRootMode === "fixed"
        ? nParamsUI.bassRootHz
        : getInterpreterMyzelBaseHz();
      ensureMyzelSynth(audioCtx);

      const constellationFlux = clamp(myceliumSnapshotRef.current.constellationFlux ?? 0, 0, 1);
      const shouldRefreshLayer = step % Math.max(1, myzelStep16ths) === 0 || constellationFlux > 0.04;
      if (shouldRefreshLayer) {
        myzelLayerModRef.current = deriveMyzelLayerMod(
          myceliumSnapshotRef.current,
          tParams.intensityGlobal,
          baseHz,
          myzelBallMode,
          myzelNodeMode,
        );
      }

      const mod = myzelLayerModRef.current;
      const gate = getMyzelPatternLevel(myzelPattern, step);
      const weaveBlend = clamp(myzelInterpreterMix.weaveBlend, 0, 1);
      const constellationBlend = clamp(myzelInterpreterMix.constellationBlend, 0, 1);
      const gateFloor = clamp(((myceliumSnapshotRef.current.constellationFlux ?? 0) * 0.55 + (myceliumSnapshotRef.current.constellationTension ?? 0) * 0.2) * (0.25 + constellationBlend * 0.95), 0, 0.78);
      const effectiveGate = Math.max(gate, gateFloor);
      myzelGateRef.current = effectiveGate;
      const droneOvertones = getDominantDroneRatios(getActiveDroneOvertoneMix());
      const wovenRatios = mod.overtoneRatios.map((ratio, idx) => {
        const droneRatio = droneOvertones[idx]?.ratio;
        const blend = droneRatio ? (0.22 + effectiveGate * 0.34) * weaveBlend : 0;
        return droneRatio ? ratio + (droneRatio - ratio) * blend : ratio;
      });
      const wovenLowpass = clamp(
        mod.lowpassHz * (0.94 + ((droneOvertones[0]?.amount ?? 0) * 0.22 + mod.shimmer * 0.8) * weaveBlend + (myceliumSnapshotRef.current.constellationBrightness ?? 0.5) * 0.12 * constellationBlend),
        220,
        3400,
      );
      refs.myzelCarrierOsc?.frequency.setTargetAtTime(mod.baseHz, time, 0.08);
      refs.myzelSubOsc?.frequency.setTargetAtTime(mod.baseHz / 2, time, 0.08);
      refs.myzelCarrierGain?.gain.setTargetAtTime(mod.carrierGain * (0.55 + effectiveGate * 0.45 + weaveBlend * 0.08), time, 0.07);
      refs.myzelSubGain?.gain.setTargetAtTime(mod.subGain * (0.45 + effectiveGate * 0.55), time, 0.07);
      refs.myzelBodyGain?.gain.setTargetAtTime(mod.bodyGain * (0.68 + effectiveGate * 0.28 + weaveBlend * 0.12), time, 0.08);
      refs.myzelLowpass?.frequency.setTargetAtTime(wovenLowpass, time, 0.12);
      refs.myzelPan?.pan.setTargetAtTime(mod.pan, time, 0.1);
      refs.myzelMasterGain?.gain.setTargetAtTime(Math.max(0.0001, mod.masterGain * effectiveGate * (0.94 + weaveBlend * 0.12 + constellationBlend * 0.16)), time, 0.09);
      refs.myzelFormantFilters.forEach((filter, idx) => {
        const formantScale = 0.94 + (droneOvertones[idx]?.amount ?? 0) * 0.18 * weaveBlend;
        filter.frequency.setTargetAtTime((mod.formantCenters[idx] ?? mod.formantCenters[0]) * formantScale, time, 0.11);
        filter.Q.setTargetAtTime(mod.formantQ, time, 0.12);
      });
      refs.myzelFormantGains.forEach((gain, idx) => {
        const droneLift = 0.88 + (droneOvertones[idx]?.amount ?? 0) * 0.45 * weaveBlend;
        gain.gain.setTargetAtTime(Math.max(0.0001, (mod.formantGains[idx] ?? 0.0001) * droneLift), time, 0.09);
      });
      refs.myzelOvertoneOscs.forEach((osc, idx) => {
        osc.frequency.setTargetAtTime(mod.baseHz * (wovenRatios[idx] ?? mod.overtoneRatios[idx] ?? 1.5), time, 0.1);
      });
      refs.myzelOvertoneGains.forEach((gain, idx) => {
        const droneLift = 0.78 + (droneOvertones[idx]?.amount ?? 0) * 0.65 * weaveBlend + effectiveGate * 0.18;
        gain.gain.setTargetAtTime(Math.max(0.0001, (mod.overtoneGains[idx] ?? 0.0001) * droneLift * (0.6 + effectiveGate * 0.4)), time, 0.09);
      });
    };

    const schedule = () => {
      const p = nexusParamsRef.current;
      const stepMs = 60 / Math.max(40, p.quantizeBpm) / 4;
      const now = audioCtx.currentTime;
      let nextStep = nexusRefs.current.nextAbsoluteStep ?? Math.ceil(now / stepMs);
      if (Math.abs(nextStep * stepMs - now) > 1.0) nextStep = Math.ceil(now / stepMs);

      while (nextStep * stepMs < now + 0.1) {
        const nextNoteTime = nextStep * stepMs;
        const step = nextStep % 16;

        if (step % 4 === 0) {
          const delayMs = Math.max(0, (nextNoteTime - now) * 1000);
          const timeoutId = window.setTimeout(() => {
            setMetronomePulse((prev) => prev + 1);
          }, delayMs);
          metronomeTimeoutsRef.current.push(timeoutId);
        }

        const drumStyle = getDrumStyle();
        const root = resolveBassRootHz();
        const barIndex = Math.floor(nextStep / 16);
        const groove = grooveStateFromMycelium(myceliumSnapshotRef.current, nextNoteTime);

        if (p.drumActive) {
          if (p.drumConfigMode === "exported" && selectedExportedDrumConfig) {
            scheduleExportedDrumConfigStep(nextStep, nextNoteTime, p.drumVolume, drumStyle);
          } else if (isRhythmForgePattern(p.drumPattern)) {
            if (rhythmForgeDrumBarIndexRef.current !== barIndex || !rhythmForgeDrumPatternRef.current) {
              rhythmForgeDrumPatternRef.current = generateRhythmForgePattern({
                barIndex,
                seed: rhythmForgeSeedRef.current ^ 0x1f17,
                rootHz: root,
                baseSwing: 0.04 + drumStyle.swing * 0.1,
                descriptors: groove.descriptors,
                flavor: getRhythmForgeFlavor(p.drumPattern),
              });
              rhythmForgeDrumBarIndexRef.current = barIndex;
            }
            scheduleRhythmForgeDrumStep(rhythmForgeDrumPatternRef.current!, step, nextNoteTime, p.drumVolume, p.drumKit ?? "dusty_tape", drumStyle);
          } else {
            drumMachine.schedulePattern(p.drumPattern, step, nextNoteTime, p.drumVolume, p.drumKit ?? "dusty_tape", drumStyle);
          }
        }

        if (p.bassActive) {
          const v = p.bassVolume;
          if (isRhythmForgePattern(p.bassPattern)) {
            if (rhythmForgeBassBarIndexRef.current !== barIndex || !rhythmForgeBassPatternRef.current) {
              rhythmForgeBassPatternRef.current = generateRhythmForgePattern({
                barIndex,
                seed: rhythmForgeSeedRef.current ^ 0x51b3,
                rootHz: root,
                baseSwing: 0.04 + drumStyle.swing * 0.1,
                descriptors: groove.descriptors,
                flavor: getRhythmForgeFlavor(p.bassPattern),
              });
              rhythmForgeBassBarIndexRef.current = barIndex;
            }
            scheduleRhythmForgeBassStep(rhythmForgeBassPatternRef.current!, step, nextNoteTime, v);
          } else if (isPsyBassPattern(p.bassPattern)) {
            if (psyBassBarIndexRef.current !== barIndex || !psyBassPatternRef.current) {
              const style = getPsyBassStyle(p.bassPattern);
              const styleMorph = ({ classicOffbeat: 0.04, rolling: 0.36, gallop: 0.62, tripletGhost: 0.72, darkForest: 0.9 } as Record<PsyBassStyle, number>)[style];
              psyBassPatternRef.current = generatePsyBassPattern({
                barIndex,
                seed: rhythmForgeSeedRef.current ^ 0x9d31,
                rootHz: root,
                stepCount: 16,
                baseSwing: 0.02 + drumStyle.swing * 0.08,
                styleMorph,
                density: clamp(0.68 + (p.bassGrit ?? 0.18) * 0.16 + groove.descriptors.pressure * 0.1, 0, 1),
                descriptors: groove.descriptors,
              });
              psyBassBarIndexRef.current = barIndex;
            }
            schedulePsyBassStep(psyBassPatternRef.current!, step, nextNoteTime, v);
          } else if (p.bassPattern === "offbeat") {
            if (step % 4 === 2) playBassNote(nextNoteTime, root, v, stepMs * 1.5, 0.72);
          } else if (p.bassPattern === "walking") {
            if (step % 4 === 0) {
              const intervals = [1, 1.189, 1.333, 1.498];
              playBassNote(nextNoteTime, root * intervals[(step / 4) % 4], v, stepMs * 1.8, 0.68);
            }
          } else if (p.bassPattern === "stotter") {
            if ([0, 1, 3, 4, 6, 8, 9, 11, 14].includes(step)) playBassNote(nextNoteTime, root * (step % 8 === 0 ? 1 : 1.5), v, stepMs * 0.8, 0.78);
          } else if (p.bassPattern === "arpeggio") {
            if (step % 2 === 0) {
              const intervals = [1, 1.5, 2, 2.5];
              playBassNote(nextNoteTime, root * intervals[(step / 2) % 4], v, stepMs * 1.5, 0.64);
            }
          }
        }

        applyMyzelLayerStep(nextNoteTime, step);

        nextStep++;
      }
      nexusRefs.current.nextAbsoluteStep = nextStep;
      timerID = window.setTimeout(schedule, 25);
    };

    schedule();
    return () => {
      window.clearTimeout(timerID);
      metronomeTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      metronomeTimeoutsRef.current = [];
    };
  }, [
    audioCtx,
    nexusActive,
    myzelEnabled,
    myzelPattern,
    myzelStep16ths,
    myzelBallMode,
    myzelNodeMode,
    tParams.intensityGlobal,
    nParamsUI.bassRootMode,
    nParamsUI.bassRootHz,
    nParamsUI.drumConfigMode,
    selectedExportedDrumConfig,
    myzelInterpreterMix.hybridBlend,
    myzelInterpreterMix.weaveBlend,
    myzelInterpreterMix.constellationBlend,
    myzelInterpreterMix.driveAmount,
    myzelInterpreterMix.driveResponse,
    myzelDriveEnabled,
  ]);

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;
    let raf = 0;
    const tick = () => {
      const refs = nexusRefs.current;
      const now = audioCtx.currentTime;
      if (!myzelEnabled) {
        refs.myzelConstellationGains.forEach((gain) => gain.gain.setTargetAtTime(0.0001, now, 0.04));
        raf = requestAnimationFrame(tick);
        return;
      }

      ensureMyzelSynth(audioCtx);
      const snapshot = myceliumSnapshotRef.current;
      const baseHz = nParamsUI.bassRootMode === "fixed"
        ? nParamsUI.bassRootHz
        : getInterpreterMyzelBaseHz();
      const tension = clamp(snapshot.constellationTension ?? 0, 0, 1);
      const flux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
      const brightness = clamp(snapshot.constellationBrightness ?? 0.5, 0, 1);
      const centroidX = clamp(snapshot.constellationCentroidX ?? 0.5, 0, 1);
      const centroidY = clamp(snapshot.constellationCentroidY ?? 0.5, 0, 1);
      const constellationBlend = clamp(myzelInterpreterMix.constellationBlend, 0, 1);
      const gateLift = clamp(0.45 + myzelGateRef.current * 0.55, 0.35, 1);
      const ratios = (snapshot.constellationRatios?.length ? snapshot.constellationRatios : myzelLayerModRef.current.overtoneRatios).slice(0, 3);
      const dynamicDrive = myzelDriveEnabled
        ? clamp(myzelInterpreterMix.driveAmount + (tension * 0.55 + flux * 0.95 + brightness * 0.22) * myzelInterpreterMix.driveResponse, 0, 1)
        : 0;
      const drivePreGain = myzelDriveEnabled
        ? 1 + dynamicDrive * 8.5 + constellationBlend * flux * 2.6 + tension * 1.4
        : 1;
      refs.myzelDriveGain?.gain.setTargetAtTime(drivePreGain, now, myzelDriveEnabled && flux > 0.18 ? 0.02 : 0.05);
      refs.myzelConstellationFilter?.frequency.setTargetAtTime(
        foldFreqIntoRange(baseHz * (1.8 + brightness * 2.2 + centroidY * 0.65), 240, 3600),
        now,
        flux > 0.18 ? 0.02 : 0.06,
      );
      refs.myzelConstellationFilter?.Q.setTargetAtTime(1.4 + (tension * 7.5 + flux * 3.5) * (0.35 + constellationBlend * 0.65), now, 0.04);
      refs.myzelConstellationOscs.forEach((osc, idx) => {
        const ratio = ratios[idx] ?? (1.25 + idx * 0.35);
        const detuneCents = ((centroidX - 0.5) * (idx === 0 ? 10 : idx === 1 ? 16 : 24)) + (flux * (idx + 1) * 3);
        const targetFreq = clamp(baseHz * ratio * Math.pow(2, detuneCents / 1200), DRONE_MIN_FREQ * 0.75, DRONE_MAX_FREQ * 8);
        osc.frequency.setTargetAtTime(targetFreq, now, flux > 0.18 ? 0.02 : 0.05);
      });
      refs.myzelConstellationGains.forEach((gain, idx) => {
        const idxBias = idx === 0 ? 1 : idx === 1 ? 0.72 : 0.54;
        const target = Math.max(
          0.0001,
          (0.002 + tension * 0.012 + brightness * 0.006 + flux * 0.03) * idxBias * gateLift * constellationBlend,
        );
        gain.gain.setTargetAtTime(target, now, flux > 0.18 ? 0.018 : 0.05);
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    audioCtx,
    nexusActive,
    myzelEnabled,
    nParamsUI.bassRootMode,
    nParamsUI.bassRootHz,
    myzelInterpreterMix.constellationBlend,
    myzelInterpreterMix.driveAmount,
    myzelInterpreterMix.driveResponse,
    myzelDriveEnabled,
  ]);

  useEffect(() => {
    if (!audioCtx || !nexusActive) return;

    const refs = nexusRefs.current;
    const ctx = audioCtx;

    if (!refs.noiseBuffer) {
      const bufferSize = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) data[i] = Math.random() * 2 - 1;
      refs.noiseBuffer = buffer;
    }

    if (!refs.room3BodyMaster) {
      const noiseSource = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      const pulseOsc = ctx.createOscillator();
      const pulseGain = ctx.createGain();
      const exciterGain = ctx.createGain();
      const preDriveGain = ctx.createGain();
      const preDriveShaper = ctx.createWaveShaper();
      const toneBus = ctx.createGain();
      const highpass = ctx.createBiquadFilter();
      const lowpass = ctx.createBiquadFilter();
      const postDriveShaper = ctx.createWaveShaper();
      const master = ctx.createGain();
      const modeFilters: BiquadFilterNode[] = [];
      const modeGains: GainNode[] = [];

      noiseSource.buffer = refs.noiseBuffer;
      noiseSource.loop = true;
      noiseGain.gain.value = 0.0001;
      pulseOsc.type = "square";
      pulseOsc.frequency.value = 220;
      pulseGain.gain.value = 0.0001;
      exciterGain.gain.value = 0.0001;
      preDriveGain.gain.value = 1;
      preDriveShaper.curve = createMyzelDriveCurve(0.18);
      preDriveShaper.oversample = "4x";
      highpass.type = "highpass";
      highpass.frequency.value = 120;
      lowpass.type = "lowpass";
      lowpass.frequency.value = 4200;
      postDriveShaper.curve = createSoftClipCurve(0.18);
      postDriveShaper.oversample = "4x";
      master.gain.value = 0.0001;

      noiseSource.connect(noiseGain);
      pulseOsc.connect(pulseGain);
      noiseGain.connect(exciterGain);
      pulseGain.connect(exciterGain);
      exciterGain.connect(preDriveGain);
      preDriveGain.connect(preDriveShaper);

      for (let i = 0; i < 4; i += 1) {
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        filter.type = "bandpass";
        filter.frequency.value = 220 * (1.2 + i * 0.44);
        filter.Q.value = 3.5 + i;
        gain.gain.value = 0.0001;
        preDriveShaper.connect(filter);
        filter.connect(gain);
        gain.connect(toneBus);
        modeFilters.push(filter);
        modeGains.push(gain);
      }

      toneBus.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(postDriveShaper);
      postDriveShaper.connect(master);
      master.connect(refs.droneGroupBus ?? getLiveMasterBus(ctx, "drone"));

      noiseSource.start();
      pulseOsc.start();

      refs.room3BodyNoiseSource = noiseSource;
      refs.room3BodyNoiseGain = noiseGain;
      refs.room3BodyPulseOsc = pulseOsc;
      refs.room3BodyPulseGain = pulseGain;
      refs.room3BodyExciterGain = exciterGain;
      refs.room3BodyPreDriveGain = preDriveGain;
      refs.room3BodyPreDriveShaper = preDriveShaper;
      refs.room3BodyToneBus = toneBus;
      refs.room3BodyHighpass = highpass;
      refs.room3BodyLowpass = lowpass;
      refs.room3BodyPostDriveShaper = postDriveShaper;
      refs.room3BodyMaster = master;
      refs.room3BodyModeFilters = modeFilters;
      refs.room3BodyModeGains = modeGains;
    }

    let raf = 0;
    const tick = () => {
      const now = ctx.currentTime;
      const snapshot = myceliumSnapshotRef.current;
      const gate = myzelEnabled ? myzelGateRef.current : 0;
      const controls = room3BodyControlsRef.current;
      const mix = myzelInterpreterMixRef.current;
      const baseHz = nParamsUI.bassRootMode === "fixed"
        ? nParamsUI.bassRootHz
        : resolveInterpreterMyzelBaseHz(
            myzelPrimedYRef.current,
            nexusRefs.current.cursorY,
            snapshot,
            freqFromY,
            DRONE_MIN_FREQ,
            DRONE_MAX_FREQ,
            mix.hybridBlend,
          );

      const modField = deriveRoom3ModField(snapshot, gate, controls);
      room3ModFieldRef.current = modField;
      const timbreState = deriveRoom3TimbreState(snapshot, modField, controls);
      room3TimbreStateRef.current = timbreState;
      const modalState = deriveRoom3ModalBody(snapshot, baseHz, timbreState, modField, nParamsUI.dronePreset);
      room3ModalStateRef.current = modalState;

      const bypass = !myzelEnabled || !room3BodyEnabledRef.current;
      const activeMaster = bypass ? 0.0001 : modalState.masterGain;
      const exciterOpen = bypass ? 0.0001 : 0.55 + modField.gateBody * 0.45;

      refs.room3BodyPulseOsc?.frequency.setTargetAtTime(modalState.pulseFrequency, now, 0.06);
      refs.room3BodyPulseGain?.gain.setTargetAtTime(bypass ? 0.0001 : modalState.exciterGain * (0.72 + timbreState.exciterHardness * 0.42), now, 0.04);
      refs.room3BodyNoiseGain?.gain.setTargetAtTime(bypass ? 0.0001 : modalState.noiseGain, now, 0.04);
      refs.room3BodyExciterGain?.gain.setTargetAtTime(exciterOpen, now, 0.05);
      refs.room3BodyPreDriveGain?.gain.setTargetAtTime(bypass ? 1 : 1 + modalState.preDriveAmount * 5.5, now, 0.05);
      refs.room3BodyHighpass?.frequency.setTargetAtTime(modalState.highpassHz, now, 0.06);
      refs.room3BodyLowpass?.frequency.setTargetAtTime(modalState.lowpassHz, now, 0.06);
      refs.room3BodyMaster?.gain.setTargetAtTime(activeMaster, now, 0.08);

      if (refs.room3BodyPreDriveShaper) {
        const next = modalState.preDriveAmount;
        if (Math.abs(next - room3BodyCurveRef.current.pre) > 0.03) {
          room3BodyCurveRef.current.pre = next;
          refs.room3BodyPreDriveShaper.curve = createMyzelDriveCurve(next);
          refs.room3BodyPreDriveShaper.oversample = "4x";
        }
      }

      if (refs.room3BodyPostDriveShaper) {
        const next = modalState.postDriveAmount;
        if (Math.abs(next - room3BodyCurveRef.current.post) > 0.03) {
          room3BodyCurveRef.current.post = next;
          refs.room3BodyPostDriveShaper.curve = createSoftClipCurve(next);
          refs.room3BodyPostDriveShaper.oversample = "4x";
        }
      }

      refs.room3BodyModeFilters.forEach((filter, idx) => {
        const mode = modalState.modes[idx] ?? modalState.modes[modalState.modes.length - 1];
        if (!mode) return;
        filter.frequency.setTargetAtTime(mode.freq, now, 0.05);
        filter.Q.setTargetAtTime(mode.q, now, 0.06);
      });
      refs.room3BodyModeGains.forEach((gainNode, idx) => {
        const mode = modalState.modes[idx] ?? modalState.modes[modalState.modes.length - 1];
        if (!mode) return;
        gainNode.gain.setTargetAtTime(bypass ? 0.0001 : mode.gain, now, 0.05);
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      try { refs.room3BodyNoiseSource?.stop(); } catch {}
      try { refs.room3BodyPulseOsc?.stop(); } catch {}
      [
        refs.room3BodyNoiseSource,
        refs.room3BodyNoiseGain,
        refs.room3BodyPulseOsc,
        refs.room3BodyPulseGain,
        refs.room3BodyExciterGain,
        refs.room3BodyPreDriveGain,
        refs.room3BodyPreDriveShaper,
        refs.room3BodyToneBus,
        refs.room3BodyHighpass,
        refs.room3BodyLowpass,
        refs.room3BodyPostDriveShaper,
        refs.room3BodyMaster,
        ...refs.room3BodyModeFilters,
        ...refs.room3BodyModeGains,
      ].forEach((node) => {
        try { node?.disconnect(); } catch {}
      });
      refs.room3BodyNoiseSource = null;
      refs.room3BodyNoiseGain = null;
      refs.room3BodyPulseOsc = null;
      refs.room3BodyPulseGain = null;
      refs.room3BodyExciterGain = null;
      refs.room3BodyPreDriveGain = null;
      refs.room3BodyPreDriveShaper = null;
      refs.room3BodyToneBus = null;
      refs.room3BodyHighpass = null;
      refs.room3BodyLowpass = null;
      refs.room3BodyPostDriveShaper = null;
      refs.room3BodyMaster = null;
      refs.room3BodyModeFilters = [];
      refs.room3BodyModeGains = [];
    };
  }, [audioCtx, nexusActive, myzelEnabled, nParamsUI.bassRootMode, nParamsUI.bassRootHz, nParamsUI.dronePreset]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const params = nexusParamsRef.current;
      const baseVol = nParamsUI.particleVolume;
      if (impactDecayOn && waveLaunchAtRef.current > 0) {
        const now = getAudioNowSec(audioCtx);
        const elapsed = Math.max(0, now - waveLaunchAtRef.current);
        const scalar = clamp(1 - elapsed / 1.25, 0.2, 1);
        waveImpactDecayRef.current = scalar;
        params.particleVolume = baseVol * scalar;
      } else {
        waveImpactDecayRef.current = 1;
        params.particleVolume = baseVol;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audioCtx, impactDecayOn, nParamsUI.particleVolume]);

  useEffect(() => {
    if (room !== "GAME" || !gameActive) return;
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const g = gameRefs.current;
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;

      if (g.level >= 3 && !g.over && !g.won) {
        g.commonsStepDur = 60 / (108 + (g.level - 3) * 8) / 4;
        g.commonsClock += dt;
        g.phaseA += dt * (0.8 + g.level * 0.09);

        const fieldA = {
          x: GAME_WIDTH * (0.5 + Math.sin(g.phaseA * 0.91) * 0.22),
          y: GAME_HEIGHT * (0.32 + Math.cos(g.phaseA * 1.17) * 0.14),
        };
        const fieldB = {
          x: GAME_WIDTH * (0.5 + Math.cos(g.phaseA * 0.67 + 0.8) * 0.18),
          y: GAME_HEIGHT * (0.35 + Math.sin(g.phaseA * 0.83 + 0.3) * 0.16),
        };

        const pull = 28 + g.level * 5;
        g.orb.vx += ((fieldA.x - g.orb.x) * 0.55 + (fieldB.x - g.orb.x) * 0.45) * dt * (pull / 100);
        g.orb.vy += ((fieldA.y - g.orb.y) * 0.55 + (fieldB.y - g.orb.y) * 0.45) * dt * (pull / 100);

        while (g.commonsClock >= g.commonsStepDur) {
          g.commonsClock -= g.commonsStepDur;
          g.commonsStep = (g.commonsStep + 1) % 16;
          const step = g.commonsStep;
          const gateHit = [0, 3, 6, 10, 14].includes(step);
          if (gateHit) {
            const targetAngle = Math.atan2(g.playerY - g.orb.y, g.playerX - g.orb.x);
            const spread = 0.32 + (step % 2) * 0.08;
            [-spread, 0, spread].forEach((offset) => {
              const angle = targetAngle + offset;
              const speed = 170 + g.level * 18;
              g.bolts.push({ x: g.orb.x, y: g.orb.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 6 });
            });
          }

          if (step % 4 === 0) {
            g.orb.vx += (Math.random() - 0.5) * (95 + g.level * 10);
            g.orb.vy += (Math.random() - 0.5) * (80 + g.level * 9);
          }

          if (g.bolts.length > 140) g.bolts.splice(0, g.bolts.length - 140);
        }
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [room, gameActive]);

  useEffect(() => {
    if (room !== "GAME" || !gameActive) return;

    let raf = 0;
    let prev = performance.now();
    const gatedHits = new Set([0, 3, 6, 10, 14]);

    const loop = (now: number) => {
      const dt = Math.min(0.035, (now - prev) / 1000);
      prev = now;
      const g = gameRefs.current;

      if (g.level >= 3 && !g.over && !g.won) {
        g.phaseA += dt * (0.82 + g.level * 0.06);
        g.phaseB += dt * (0.57 + g.level * 0.05);

        const fieldA = {
          x: GAME_WIDTH * 0.5 + Math.cos(g.phaseA) * 220,
          y: GAME_HEIGHT * 0.38 + Math.sin(g.phaseA * 1.13) * 120,
        };
        const fieldB = {
          x: GAME_WIDTH * 0.5 + Math.cos(g.phaseB + 1.7) * 180,
          y: GAME_HEIGHT * 0.34 + Math.sin(g.phaseB * 1.37 + 0.6) * 140,
        };

        const dxA = fieldA.x - g.orb.x;
        const dyA = fieldA.y - g.orb.y;
        const dxB = fieldB.x - g.orb.x;
        const dyB = fieldB.y - g.orb.y;
        const distA = Math.max(30, Math.hypot(dxA, dyA));
        const distB = Math.max(30, Math.hypot(dxB, dyB));
        const pull = 22 + g.level * 3.5;

        g.orb.vx += ((dxA / distA) * pull + (dxB / distB) * pull * 0.9) * dt;
        g.orb.vy += ((dyA / distA) * pull + (dyB / distB) * pull * 0.9) * dt;
        g.orb.vx += (-dyA / distA) * 16 * dt;
        g.orb.vy += (dxB / distB) * 14 * dt;

        const maxSpeed = 300 + (g.level - 2) * 40;
        const speed = Math.hypot(g.orb.vx, g.orb.vy);
        if (speed > maxSpeed) {
          const k = maxSpeed / speed;
          g.orb.vx *= k;
          g.orb.vy *= k;
        }

        g.commonsStepDur = Math.max(0.085, 0.14 - (g.level - 3) * 0.008);
        g.commonsClock += dt;
        while (g.commonsClock >= g.commonsStepDur) {
          g.commonsClock -= g.commonsStepDur;
          g.commonsStep = (g.commonsStep + 1) % 16;

          if (gatedHits.has(g.commonsStep)) {
            const px = g.playerX;
            const py = g.playerY;
            const base = Math.atan2(py - g.orb.y, px - g.orb.x);
            const spread = 0.32;
            const spd = 230 + g.level * 15;
            [-spread, 0, spread].forEach((off) => {
              const a = base + off;
              g.bolts.push({ x: g.orb.x, y: g.orb.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7 });
            });
          }

          if (g.commonsStep % 4 === 0) {
            const nudge = 34 + g.level * 3;
            g.orb.vx += Math.cos(g.phaseA * 1.8 + g.commonsStep) * nudge;
            g.orb.vy += Math.sin(g.phaseB * 1.5 + g.commonsStep) * nudge;
          }
        }

        if (g.bolts.length > 120) g.bolts.splice(0, g.bolts.length - 120);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [room, gameActive]);

  useEffect(() => {
    const defaultParticleSystem: ParticleSystem = "ji";
    const defaultParticleMode: ChurchMode = "ionian";
    const defaultGridTuning: GridTuning = "12edo";
    const defaultGridMode: ChurchMode = "ionian";
    const defaultAgentEnabledState = defaultAgentEnabled(defaultParticleSystem, defaultParticleMode);
    const defaultGridMutedSteps = getMutedStepsForMode(defaultGridMode, defaultGridTuning);
    setDronePreset("fjord_tape");
    updateNParams({
      gridOn: true,
      showGrid: true,
      lockCursorToGrid: true,
      cursorSnap: true,
      gridTuning: defaultGridTuning,
      gridMode: defaultGridMode,
      manualGridMutedSteps: defaultGridMutedSteps,
      manualGridStepOffsets: Array.from({ length: getTuningSteps(defaultGridTuning) }, () => 0),
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
      agentEnabled: defaultAgentEnabledState,
      agentVolumes: defaultAgentEnabledState.map(() => 1),
    } as any);
    setDroneVolume(0.15);
    setWaveSoundVolume(0.22);
    setWaveSoundPreset("tape_halo");
  }, []);

  useEffect(() => {
    const onKeyCapture = (event: KeyboardEvent) => {
      if (!resonanceInputActive || isEditableTarget(event.target) || isForgeHotkeyTarget(event.target)) return;
      if (shouldCaptureResonanceKey(event)) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyCapture, true);
    return () => window.removeEventListener("keydown", onKeyCapture, true);
  }, [resonanceInputActive]);

  useEffect(() => {
    if (!resonanceInputActive) {
      setResonanceInputIndicator(false);
      return;
    }

    refreshResonanceInputIndicator();
    window.addEventListener("focusin", refreshResonanceInputIndicator);
    window.addEventListener("focusout", refreshResonanceInputIndicator);
    window.addEventListener("pointerdown", refreshResonanceInputIndicator);

    return () => {
      window.removeEventListener("focusin", refreshResonanceInputIndicator);
      window.removeEventListener("focusout", refreshResonanceInputIndicator);
      window.removeEventListener("pointerdown", refreshResonanceInputIndicator);
    };
  }, [resonanceInputActive]);

  useEffect(() => {
    if (!resonanceInputActive) {
      waveSoundSwellHeldRef.current = false;
      waveSoundSwellRef.current = 0;
      waveStartOctaveHoldRef.current = false;
      longToneHoldRef.current = false;
      setResonanceActionBadges({ octave: false, sustain: false, swell: false });
      releaseHeldScheduledTones();
      return;
    }

    let raf = 0;
    const tick = () => {
      if (waveSoundSwellHeldRef.current) {
        waveSoundSwellRef.current = Math.min(1, waveSoundSwellRef.current + 0.028);
      } else {
        waveSoundSwellRef.current = Math.max(0, waveSoundSwellRef.current - 0.12);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [resonanceInputActive]);

  useEffect(() => {
    const shaper = nexusRefs.current.myzelDriveShaper;
    const gain = nexusRefs.current.myzelDriveGain;
    if (!shaper || !gain) return;
    shaper.curve = myzelDriveEnabled ? createMyzelDriveCurve(myzelInterpreterMix.driveAmount) : null;
    shaper.oversample = myzelDriveEnabled ? "4x" : "none";
    gain.gain.setTargetAtTime(myzelDriveEnabled ? Math.max(1, 1 + myzelInterpreterMix.driveAmount * 2.5) : 1, audioCtx?.currentTime ?? 0, 0.04);
  }, [audioCtx, myzelDriveEnabled, myzelInterpreterMix.driveAmount, nexusActive]);

  useEffect(() => {
    const handleMouseEntropy = (event: MouseEvent) => {
      const now = performance.now();
      const dt = Math.max(0, now - lastMouseEntropyStampRef.current);
      lastMouseEntropyStampRef.current = now;
      const mix = (
        ((event.clientX + 1) * 73856093) ^
        ((event.clientY + 1) * 19349663) ^
        ((Math.round(dt * 1000) + 1) * 83492791) ^
        Math.round(now * 1000)
      ) >>> 0;
      mouseEntropyRef.current ^= mix;
      mouseEntropyRef.current = Math.imul(mouseEntropyRef.current ^ (mouseEntropyRef.current >>> 15), 2246822519) >>> 0;
      mouseEntropyRef.current ^= mouseEntropyRef.current >>> 13;
    };
    window.addEventListener("mousemove", handleMouseEntropy, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseEntropy);
  }, []);

  const createEntropySeed = () => {
    const heapEntropy = typeof performance !== "undefined" && "memory" in performance
      ? Number((performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory?.usedJSHeapSize ?? 0)
      : 0;
    let seed = (
      mouseEntropyRef.current ^
      Math.floor(performance.now() * 1000) ^
      Math.floor((audioCtxRef.current?.currentTime ?? 0) * 1000000) ^
      heapEntropy
    ) >>> 0;
    if (!seed) seed = 0x9e3779b9;
    return seed >>> 0;
  };

  const createXorShift = (initialSeed: number) => {
    let seed = initialSeed >>> 0;
    return () => {
      seed ^= seed << 13;
      seed >>>= 0;
      seed ^= seed >>> 17;
      seed >>>= 0;
      seed ^= seed << 5;
      seed >>>= 0;
      return (seed >>> 0) / 4294967296;
    };
  };

  const chooseOne = <T,>(items: readonly T[], rand: () => number): T => items[Math.floor(rand() * items.length) % items.length]!;
  const randRange = (rand: () => number, min: number, max: number, digits = 2) => Number((min + (max - min) * rand()).toFixed(digits));
  const randBool = (rand: () => number, threshold = 0.5) => rand() < threshold;

  const buildRandomOvertoneMix = (rand: () => number) => {
    const base = createEmptyOvertoneMix();
    const entries = Object.keys(base);
    const mix: Record<string, number> = {};
    let activeCount = 0;
    entries.forEach((key, idx) => {
      const keep = rand() < (idx < 4 ? 0.62 : 0.32);
      if (!keep) return;
      activeCount += 1;
      mix[key] = randRange(rand, 0.04, idx < 3 ? 0.92 : 0.58);
    });
    if (!activeCount && entries[0]) mix[entries[0]] = 0.82;
    return mix;
  };

  const buildRandomMetaSessionOverride = (rand: () => number) => {
    const gridTuning = chooseOne(GRID_TUNING_OPTIONS.map((entry) => entry.value), rand) as GridTuning;
    const particleSystem = chooseOne(["ji", "bp", ...RUN_EDOS] as ParticleSystem[], rand);
    const gridMode = chooseOne(getModesForSystem(gridTuning).map((entry) => entry.value), rand) as ChurchMode;
    const churchMode = chooseOne(getModesForSystem(particleSystem).map((entry) => entry.value), rand) as ChurchMode;
    const buildSend = (chance = 0.38) => ({ enabled: randBool(rand, chance), send: randRange(rand, 0.04, 0.72) });
    const buildMemory = () => ({ enabled: randBool(rand, 0.44), send: randRange(rand, 0.02, 0.52), wet: randRange(rand, 0.05, 0.64) });
    return {
      preset: {
        dronePreset: chooseOne(DRONE_PRESETS.map((entry) => entry.value), rand) as DronePreset,
        particlePreset: chooseOne(PARTICLE_PRESETS.map((entry) => entry.value), rand) as ParticlePreset,
        waveSoundPreset: chooseOne(WAVE_SOUND_PRESETS.map((entry) => entry.value), rand) as WaveSoundPreset,
        waveSoundEnabled: randBool(rand, 0.12),
        waveSoundVolume: randRange(rand, 0.14, 0.34),
        droneVolume: randRange(rand, 0.02, 0.24),
        quantizeGrid: chooseOne([8, 16, 32, 64] as const, rand) as QuantizeGrid,
        gridTempoBpm: Math.round(randRange(rand, 82, 148, 0)),
        myzelEnabled: true,
        myzelPattern: chooseOne(MYZEL_PATTERNS.map((entry) => entry.value), rand) as MyzelPattern,
        myzelBallMode: chooseOne(MYZEL_BALL_MODE_OPTIONS.map((entry) => entry.value), rand) as MyzelBallMode,
        myzelNodeMode: chooseOne(MYZEL_NODE_MODE_OPTIONS.map((entry) => entry.value), rand) as MyzelNodeMode,
        myzelStep16ths: chooseOne([1, 2, 4, 8] as const, rand),
        tParams: {
          tension: randRange(rand, 0.18, 0.96),
          slimLayers: randRange(rand, 0.08, 0.94),
          rawReality: randRange(rand, 0.12, 0.96),
          intensityGlobal: randRange(rand, 0.28, 1),
        },
        room3Body: {
          enabled: randBool(rand, 0.14),
          controls: {
            coupling: randRange(rand, 0.14, 0.96),
            material: randRange(rand, 0, 1),
            air: randRange(rand, 0, 1),
            roughness: randRange(rand, 0, 1),
            resonance: randRange(rand, 0.12, 0.96),
          },
        },
        collectiveMemory: {
          enabled: randBool(rand, 0.48),
          window: randRange(rand, 3, 15, 1),
          drone: buildMemory(),
          particles: buildMemory(),
          waves: buildMemory(),
          myzel: buildMemory(),
        },
        spiral: {
          enabled: randBool(rand, 0.52),
          follow: randRange(rand, 0, 1),
          drive: randRange(rand, 0, 1),
          color: randRange(rand, 0, 1),
          motion: randRange(rand, 0, 1),
          feedback: randRange(rand, 0.04, 0.82),
          bloom: randRange(rand, 0, 1),
          mix: randRange(rand, 0.4, 0.96),
          stereoWidth: randRange(rand, 0.08, 1),
          outputGain: randRange(rand, 0.38, 1),
          drone: buildSend(),
          particles: buildSend(),
          waves: buildSend(),
          myzel: buildSend(),
        },
        transientDrive: {
          drone: buildSend(),
          particles: buildSend(),
          waves: buildSend(),
          myzel: buildSend(),
        },
        liveMastering: {
          enabled: randBool(rand, 0.52),
          strength: randRange(rand, 0, 1),
          glue: randRange(rand, 0, 1),
          air: randRange(rand, 0, 1),
        },
        nexusPatch: {
          echoOn: randBool(rand, 0.62),
          echoTempo: Math.round(randRange(rand, 180, 720, 0)),
          echoDecay: randRange(rand, 0.16, 0.84),
          waveRadius: randRange(rand, 0.88, 1.42),
          waveDecay: chooseOne(WAVE_DECAY_PRESETS.map((entry) => entry.value), rand) as WaveDecayPreset,
          gridOn: true,
          gridBase: chooseOne([110, 123.47, 130.81, 146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66, 329.63, 392, 415.3, 440] as const, rand),
          gridTuning,
          gridMode,
          particleSystem,
          churchMode,
          lockCursorToGrid: randBool(rand, 0.24),
          cursorSpeed: Math.round(randRange(rand, 2, 8, 0)),
          droneTimbre: randRange(rand, 0, 1),
          droneVibrato: randRange(rand, 0, 1),
          droneFlanger: randRange(rand, 0, 1),
          droneRhythm: chooseOne(["Off", "Puls 1/4", "Puls 1/8", "Puls 1/16", "Synkope"] as const, rand),
          droneDriveOn: randBool(rand, 0.58),
          droneDriveAmount: randRange(rand, 0, 0.82),
          droneDriveTone: randRange(rand, 0, 1),
          droneDriveMix: randRange(rand, 0, 1),
          droneDriveOutput: randRange(rand, 0.22, 1),
          drumActive: randBool(rand, 0.08),
          drumPattern: chooseOne(DRUM_PATTERNS.map((entry) => entry.value), rand) as DrumPattern,
          drumKit: chooseOne(DRUM_KITS.map((entry) => entry.value), rand) as DrumKit,
          drumVolume: randRange(rand, 0.2, 0.72),
          bassActive: randBool(rand, 0.12),
          bassPattern: chooseOne(BASS_PATTERNS.map((entry) => entry.value), rand) as BassPattern,
          bassVolume: randRange(rand, 0.16, 0.62),
          bassRootMode: randBool(rand, 0.68) ? "auto" : "fixed",
          bassRootHz: chooseOne([41.2, 55, 61.74, 73.42, 82.41, 98, 110] as const, rand),
          particleGradientX: chooseOne(PARTICLE_GRADIENT_PRESETS.map((entry) => entry.value), rand) as ParticleGradientPreset,
          particleGradientY: chooseOne(PARTICLE_GRADIENT_PRESETS.map((entry) => entry.value), rand) as ParticleGradientPreset,
          waveTimbreGradientEnabled: randBool(rand, 0.52),
          waveTimbreGradientX: chooseOne(WAVE_TIMBRE_GRADIENT_PRESETS.map((entry) => entry.value), rand) as WaveTimbreGradientPreset,
          waveVolumeGradientEnabled: randBool(rand, 0.36),
          waveVolumeGradientX: chooseOne(WAVE_VOLUME_GRADIENT_PRESETS.map((entry) => entry.value), rand) as WaveVolumeGradientPreset,
          waveOvertonesEnabled: randBool(rand, 0.56),
          droneOvertoneWaveform: chooseOne(["sine", "triangle", "square", "sawtooth"] as const, rand),
          waveOvertoneWaveform: chooseOne(["sine", "triangle", "square", "sawtooth"] as const, rand),
          particleVolume: randRange(rand, 0.08, 0.28),
          particleMute: false,
          quantizeOn: randBool(rand, 0.48),
          quantizeBpm: Math.round(randRange(rand, 84, 156, 0)),
        },
        droneOvertones: buildRandomOvertoneMix(rand),
        waveOvertones: buildRandomOvertoneMix(rand),
      } as Partial<MetaPresetDefinition>,
      uiPatch: {
        drumEdge: randRange(rand, 0, 1),
        drumSoftness: randRange(rand, 0, 1),
        drumAir: randRange(rand, 0, 1),
        drumSnap: randRange(rand, 0, 1),
        grooveSwing: randRange(rand, 0, 1),
        bassTone: randRange(rand, 0, 1),
        bassGrit: randRange(rand, 0, 1),
      },
    };
  };

  const randomizeMetaPresetForSession = (presetId: MetaPresetId) => {
    if (mandalaRandomizingPresetId || rouletteIsSpinning) return;
    const token = ++mandalaSpinTokenRef.current;
    setMandalaRandomizingPresetId(presetId);
    const rand = createXorShift(createEntropySeed());
    let colorIndex = Math.floor(rand() * MANDALA_RANDOMIZER_COLORS.length);
    let stepsLeft = 14 + Math.floor(rand() * 18);
    const totalSteps = Math.max(stepsLeft, 1);

    const tick = () => {
      if (token != mandalaSpinTokenRef.current) return;
      setMandalaPresetColorOverrides((prev) => ({
        ...prev,
        [presetId]: MANDALA_RANDOMIZER_COLORS[colorIndex % MANDALA_RANDOMIZER_COLORS.length],
      }));
      if (stepsLeft <= 0) {
        const override = buildRandomMetaSessionOverride(rand);
        setSessionMetaOverrides((prev) => ({ ...prev, [presetId]: override }));
        setMandalaRandomizingPresetId(null);
        applyMetaPreset(presetId);
        return;
      }
      colorIndex = (colorIndex + 1) % MANDALA_RANDOMIZER_COLORS.length;
      stepsLeft -= 1;
      const progress = 1 - stepsLeft / totalSteps;
      const delay = 48 + progress * progress * 260 + rand() * 26;
      window.setTimeout(tick, delay);
    };

    tick();
  };

  const startMetaPresetRoulette = () => {
    if (rouletteIsSpinning || mandalaRandomizingPresetId || !META_PRESETS.length) return;
    const token = ++rouletteSpinTokenRef.current;
    setRouletteIsSpinning(true);
    let seed = createEntropySeed();
    if (!seed) seed = 0xa341316c;
    const nextRand = createXorShift(seed);
    const ids = META_PRESETS.map((preset) => preset.id);
    let currentIndex = Math.floor(nextRand() * ids.length);
    const targetIndex = Math.floor(nextRand() * ids.length);
    const extraRounds = 3 + Math.floor(nextRand() * 4);
    let stepsLeft = extraRounds * ids.length + ((targetIndex - currentIndex + ids.length) % ids.length);
    const totalSteps = Math.max(stepsLeft, 1);

    const spinTick = () => {
      if (token !== rouletteSpinTokenRef.current) return;
      setRoulettePreviewPresetId(ids[currentIndex]);
      if (stepsLeft <= 0) {
        const winner = ids[targetIndex];
        setRoulettePreviewPresetId(winner);
        setRouletteIsSpinning(false);
        applyMetaPreset(winner);
        window.setTimeout(() => {
          if (rouletteSpinTokenRef.current === token) setRoulettePreviewPresetId(null);
        }, 260);
        return;
      }
      currentIndex = (currentIndex + 1) % ids.length;
      stepsLeft -= 1;
      const progress = 1 - stepsLeft / totalSteps;
      const delay = 44 + progress * progress * 310 + nextRand() * 24;
      window.setTimeout(spinTick, delay);
    };

    spinTick();
  };

  const activeMetaPreset = activeMetaPresetId ? resolveMetaPreset(activeMetaPresetId) : null;
  const highlightedMandalaPresetId = roulettePreviewPresetId ?? activeMetaPresetId;
  const mandalaPresetColors = Object.fromEntries(META_PRESETS.map((preset, idx) => [preset.id, mandalaPresetColorOverrides[preset.id] ?? MANDALA_PRESET_COLORS[idx % MANDALA_PRESET_COLORS.length]])) as Record<MetaPresetId, string>;
  const particleSystemLabel = nParamsUI.particleSystem === "ji"
    ? "Just Intonation"
    : nParamsUI.particleSystem === "bp"
      ? "Bohlen-Pierce"
      : getOptionLabel(GRID_TUNING_OPTIONS, `${nParamsUI.particleSystem}` as GridTuning);
  const particleModeLabel = getOptionLabel(getModesForSystem(nParamsUI.particleSystem), nParamsUI.churchMode);
  const gridTuningLabel = getOptionLabel(GRID_TUNING_OPTIONS, nParamsUI.gridTuning);
  const defaultGridMutedSteps = getMutedStepsForMode(nParamsUI.gridMode, nParamsUI.gridTuning);
  const gridOffsets = nParamsUI.manualGridStepOffsets ?? [];
  const gridIsCustom = gridOffsets.some((offset) => Math.abs(offset) > 0.02) || !sameNumberSet(nParamsUI.manualGridMutedSteps, defaultGridMutedSteps);
  const gridModeLabel = gridIsCustom ? "Custom" : getOptionLabel(getModesForSystem(nParamsUI.gridTuning), nParamsUI.gridMode);
  const particleDefaultMask = deriveModeMask(nParamsUI.churchMode, nParamsUI.particleSystem).slice(0, activeParticleNodes.length);
  const particleCurrentMask = activeParticleNodes.map((_, idx) => !!nParamsUI.agentEnabled[idx]);
  const particleIsCustom = !sameBooleanArray(particleDefaultMask, particleCurrentMask);
  const particleDisplayModeLabel = particleIsCustom ? `${particleModeLabel}*` : particleModeLabel;
  const keyboardGridDesc = buildKeyboardGridFrequencies(nParamsUI.gridBase, nParamsUI.gridTuning, nParamsUI.manualGridMutedSteps, nParamsUI.manualGridStepOffsets);
  const keyboardWindowStart = Math.max(0, Math.min(Math.round(keyboardWindowOffsetRef.current), Math.max(0, keyboardGridDesc.length - 1)));
  const keyboardWindowEnd = Math.max(keyboardWindowStart, Math.min(keyboardGridDesc.length - 1, keyboardWindowStart + KAMMERTON_KEYS.length - 1));
  const keyboardWindowFirstHz = keyboardGridDesc[keyboardWindowStart] ?? null;
  const keyboardWindowLastHz = keyboardGridDesc[keyboardWindowEnd] ?? null;
  void keyboardWindowStamp;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-300 font-mono flex flex-col">
      <style>{`@keyframes logoMarkerPulse { 0% { opacity: 0.95; transform: translate(-50%, -50%) scale(0.2); } 70% { opacity: 0.55; } 100% { opacity: 0; transform: translate(-50%, -50%) scale(6.2); } }
@keyframes mandalaCenterPulse {
  0%, 100% { transform: scale(1); opacity: 0.82; }
  50% { transform: scale(1.08); opacity: 1; }
}`} </style>
      <header className="p-4 border-b border-neutral-800 flex justify-between items-center bg-black">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (recordingState.isRecording) addRecordingMarker("logo");
            }}
            className="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            aria-label={recordingState.isRecording ? "Marker setzen" : "Xensonar Logo"}
            title={recordingState.isRecording ? "Marker setzen (Logo/F9)" : "Xensonar Logo"}
          >
            {logoMarkerPulses.map((pulse, idx) => (
              <span
                key={pulse.id}
                className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-emerald-300/80"
                style={{
                  width: 16,
                  height: 16,
                  transform: "translate(-50%, -50%)",
                  animation: `logoMarkerPulse 1.2s ease-out ${idx * 0.04}s forwards`,
                }}
              />
            ))}
            <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 text-neutral-300">
              <g stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round">
                {/* central 8-ray mandala: 4 rotated ellipses */}
                <ellipse cx="32" cy="32" rx="3.4" ry="12.2" />
                <ellipse cx="32" cy="32" rx="3.4" ry="12.2" transform="rotate(45 32 32)" />
                <ellipse cx="32" cy="32" rx="3.4" ry="12.2" transform="rotate(90 32 32)" />
                <ellipse cx="32" cy="32" rx="3.4" ry="12.2" transform="rotate(135 32 32)" />

                {/* ring petals: 4 overlapping circles */}
                <circle cx="32" cy="23" r="9.2" />
                <circle cx="41" cy="32" r="9.2" />
                <circle cx="32" cy="41" r="9.2" />
                <circle cx="23" cy="32" r="9.2" />

                {/* cardinal outward triangles */}
                <polygon points="32,4.4 38.0,10.5 26.0,10.5" />
                <polygon points="59.6,32 53.5,38.0 53.5,26.0" />
                <polygon points="32,59.6 26.0,53.5 38.0,53.5" />
                <polygon points="4.4,32 10.5,26.0 10.5,38.0" />

                {/* corner right-angle triangles */}
                <polygon points="13.1,13.1 21.1,13.1 13.1,21.1" />
                <polygon points="50.9,13.1 42.9,13.1 50.9,21.1" />
                <polygon points="13.1,50.9 21.1,50.9 13.1,42.9" />
                <polygon points="50.9,50.9 42.9,50.9 50.9,42.9" />
              </g>

              {/* 8 ring dots */}
              <circle cx="32" cy="14.0" r="1.5" fill="currentColor" />
              <circle cx="44.7" cy="19.3" r="1.5" fill="currentColor" />
              <circle cx="50.0" cy="32" r="1.5" fill="currentColor" />
              <circle cx="44.7" cy="44.7" r="1.5" fill="currentColor" />
              <circle cx="32" cy="50.0" r="1.5" fill="currentColor" />
              <circle cx="19.3" cy="44.7" r="1.5" fill="currentColor" />
              <circle cx="14.0" cy="32" r="1.5" fill="currentColor" />
              <circle cx="19.3" cy="19.3" r="1.5" fill="currentColor" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-widest bg-gradient-to-r from-violet-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent" style={{ fontFamily: "'Trebuchet MS', serif" }}>
              XENSONAR
            </h1>
            <p className="text-[10px] text-neutral-400 tracking-widest uppercase mt-0.5">Microtonal Synthesizer</p>
          </div>
          <svg
            width="20"
            height="28"
            viewBox="0 0 20 28"
            fill="none"
            aria-hidden="true"
            className="text-sky-300 -ml-2"
          >
            <path d="M5 4 C8.5 8.5, 8.5 19.5, 5 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M9.5 2.5 C14.5 8, 14.5 20, 9.5 25.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button className={`px-4 py-1 text-sm ${room === "MAIN" ? "bg-white text-black" : "border border-neutral-700"}`} onClick={() => setRoom("MAIN")}>I. DAS INSTRUMENT</button>
          <button className={`px-4 py-1 text-sm ${room === "NEXUS" ? "bg-white text-black" : "border border-neutral-700"}`} onClick={() => setRoom("NEXUS")}>II. DER NEXUS</button>
          <button className={`px-4 py-1 text-sm ${room === "TOPOLOGY" ? "bg-white text-black" : "border border-neutral-700"}`} onClick={() => setRoom("TOPOLOGY")}>III. TOPOLOGICAL MANIFOLD</button>
          <button className={`px-4 py-1 text-sm ${room === "L3LAB" ? "bg-cyan-200 text-black" : "border border-neutral-700"}`} onClick={() => setRoom("L3LAB")}>III.2 MATERIALSCHMIEDE</button>
          <button className={`px-4 py-1 text-sm ${room === "GAME" ? "bg-amber-200 text-black" : "border border-neutral-700"}`} onClick={() => setRoom("GAME")}>IV. IRRLICHT ARENA</button>
          <button className={`px-4 py-1 text-sm ${room === "RESONANCE" ? "bg-purple-300 text-black" : "border border-neutral-700"}`} onClick={() => setRoom("RESONANCE")}>V. XENSONAR SYNTH</button>
        </div>
      </header>

      <main className="flex-1 p-6 relative">
        {(room === "MAIN" || room === "NEXUS") && (
          <div className="flex items-center justify-center h-full opacity-50">
            <p>Die konventionellen Räume I und II sind archiviert.</p>
          </div>
        )}

        {room === "TOPOLOGY" && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="border border-neutral-800 bg-black p-6">
              <h2 className="text-2xl text-white mb-2">Die Begriffliche Ökologie · III.1 Myzel / Mastering Engine Room</h2>
              <p className="text-sm text-neutral-400 mb-4 leading-relaxed max-w-3xl">Sprache ist ein Feld mit Knoten und Vektoren. Die Energie entsteht durch Struktur und Relation. Die Verdichtung an einem Knoten ist kein Fehler, sondern ein Zustand des Systems.</p>
              <div className="mb-6 rounded border border-fuchsia-900/40 bg-fuchsia-950/15 p-3 text-xs leading-relaxed text-neutral-300">
                <div className="mb-1 uppercase tracking-[0.25em] text-fuchsia-300">{getMachineRoomDefinition('myzelMastering').stageLabel}</div>
                <div>{getMachineRoomDefinition('myzelMastering').summary}</div>
                <div className="mt-1 text-neutral-500">{getTransitionGuidingSentence()}</div>
              </div>
              <div className="mb-6 rounded border border-fuchsia-900/30 bg-black/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-300">Post-FX Wege · nachgelagerte Zuständigkeit</div>
                    <div className="text-sm text-neutral-100">Aktive Fokusgruppe: {activeMyzelPostFxGroup.label}</div>
                    <div className="max-w-4xl text-xs leading-relaxed text-neutral-400">{describeScopedMyzelRoute(myzelPostFxGroup)}</div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400">
                    <div className="uppercase tracking-[0.2em] text-neutral-500">Gleitende Balance</div>
                    <div className="mt-1">Myzel übernimmt hier nur nachgelagerte Formung. Erzeugung und Segmentbau bleiben in Forge oder Room V, damit die Kern-App ihre Balance im Übergang behält.</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-5">
                  {MYZEL_POST_FX_GROUPS.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setMyzelPostFxGroup(group.id)}
                      className={`rounded border px-3 py-2 text-left text-xs transition-colors ${myzelPostFxGroup === group.id ? 'border-fuchsia-500 bg-fuchsia-950/30 text-fuchsia-100' : 'border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:bg-neutral-900'}`}
                    >
                      <div className="uppercase tracking-[0.2em] text-[10px] text-fuchsia-300/80">{group.label}</div>
                      <div className="mt-1 leading-relaxed text-neutral-400">{group.summary}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400">
                    <div className="uppercase tracking-[0.2em] text-neutral-500">Router</div>
                    <button
                      type="button"
                      onClick={() => setMyzelPostFxEnabled((prev) => !prev)}
                      className={`mt-2 w-full rounded border px-3 py-2 text-left text-xs transition-colors ${myzelPostFxEnabled ? 'border-fuchsia-500 bg-fuchsia-950/30 text-fuchsia-100' : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:bg-neutral-900'}`}
                    >
                      {myzelPostFxEnabled ? 'Scoped Post-FX aktiv' : 'Scoped Post-FX bypass'}
                    </button>
                    <div className="mt-2 leading-relaxed">Die neue Routing-Tiefe sitzt parallel zur Kern-App: selektierte Gruppen bekommen eine eigene Myzel-Parallelstufe, ohne Erzeugungszuständigkeiten zurückzuschieben.</div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400">
                    <div className="uppercase tracking-[0.2em] text-neutral-500">Handoff-Folge</div>
                    <label className="mt-2 flex items-center gap-2 text-xs text-neutral-300"><input type="checkbox" checked={myzelFollowForgeHandoff} onChange={(e) => setMyzelFollowForgeHandoff(e.target.checked)} /> Myzel folgt bevorzugter Forge-Handoff-Gruppe</label>
                    <div className="mt-2 leading-relaxed">{selectedLoopHandoffProfile ? summarizeHandoffProfile(selectedLoopHandoffProfile) : 'Noch kein aktives Forge-Material mit Handoff-Profil ausgewählt.'}</div>
                    {selectedLoopHandoffProfile && (
                      <div className="mt-2 text-neutral-500">Balance-Träger: {selectedLoopMaterial?.balanceCarrier ?? selectedLoopHandoffProfile.balanceCarrier}</div>
                    )}
                  </div>
                  <label className="block text-xs text-neutral-400">
                    <span className="block text-neutral-500 mb-1">Fokustiefe {(myzelPostFxDepth * 100).toFixed(0)}%</span>
                    <input type="range" min="0" max="1" step="0.01" value={myzelPostFxDepth} onChange={(e) => setMyzelPostFxDepth(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                  </label>
                  <label className="block text-xs text-neutral-400">
                    <span className="block text-neutral-500 mb-1">Parallelität {(myzelPostFxParallel * 100).toFixed(0)}%</span>
                    <input type="range" min="0" max="1" step="0.01" value={myzelPostFxParallel} onChange={(e) => setMyzelPostFxParallel(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                  </label>
                  <div className="rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400">
                    <div className="uppercase tracking-[0.2em] text-neutral-500">Empfängt von</div>
                    <div className="mt-1">{activeMyzelPostFxGroup.receivesFrom}</div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-[11px] text-neutral-400">
                    <div className="uppercase tracking-[0.2em] text-neutral-500">Stabil bleibt es durch</div>
                    <div className="mt-1">{activeMyzelPostFxGroup.keepsStableBy}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 xl:grid-cols-[1.25fr_1fr]">
                  <div className="rounded border border-neutral-800 bg-neutral-950/40 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-300">Routen-Monitor</div>
                        <div className="text-xs text-neutral-500">Welche Gruppen die neue Myzel-Parallelstufe gerade bevorzugt mitnimmt.</div>
                      </div>
                      <div className="text-[11px] text-neutral-500">Fokus: {myzelPostFxMonitor?.focusLabel ?? activeMyzelPostFxGroup.label} · Summensend {((myzelPostFxMonitor?.totalSend ?? 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-5">
                      {([
                        ['particles', 'Partikel'],
                        ['drone', 'Drone'],
                        ['waves', 'Wellenstarter'],
                        ['myzel', 'Myzel'],
                        ['forge', 'Forge'],
                      ] as const).map(([key, label]) => {
                        const weight = myzelPostFxMonitor?.weights[key] ?? 0;
                        return (
                          <div key={key} className="rounded border border-neutral-800 bg-black/30 px-2 py-2 text-[11px] text-neutral-400">
                            <div className="uppercase tracking-[0.18em] text-neutral-500">{label}</div>
                            <div className="mt-2 h-2 overflow-hidden rounded bg-neutral-900">
                              <div className="h-full rounded bg-fuchsia-500/80" style={{ width: `${Math.round(weight * 100)}%` }} />
                            </div>
                            <div className="mt-1 text-right text-neutral-500">{Math.round(weight * 100)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-neutral-950/40 px-3 py-3 text-[11px] leading-relaxed text-neutral-400">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-fuchsia-300">Gleitende Zuständigkeitsverschiebung</div>
                    <ul className="mt-2 space-y-1">
                      <li>• Forge-Material wird jetzt hörbar als eigene Post-FX-Route mitgenommen, statt nur begrifflich erwähnt zu werden.</li>
                      <li>• Partikel, Drone und Wellenstarter bleiben weiterhin in Room V erzeugt; Myzel bekommt nur die nachgelagerte Parallelfärbung.</li>
                      <li>• Die Balance der Kern-App bleibt erhalten, weil der Router additive Send-Stufen nutzt und nicht die Primärwege kappt.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Semantische Spannung</label>
                  <input type="range" min="0" max="1" step="0.01" value={tParams.tension} onChange={(e) => setTParams({ ...tParams, tension: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Layer Slimness</label>
                  <input type="range" min="0" max="1" step="0.01" value={tParams.slimLayers} onChange={(e) => setTParams({ ...tParams, slimLayers: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Rohe Realität</label>
                  <input type="range" min="0" max="1" step="0.01" value={tParams.rawReality} onChange={(e) => setTParams({ ...tParams, rawReality: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Intensität Global</label>
                  <input type="range" min="0" max="1" step="0.01" value={tParams.intensityGlobal} onChange={(e) => setTParams({ ...tParams, intensityGlobal: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Myzel Rhythmus</label>
                  <select value={myzelPattern} onChange={(e) => setMyzelPattern(e.target.value as MyzelPattern)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                    {MYZEL_PATTERNS.map((pattern) => <option key={pattern.value} value={pattern.value}>{pattern.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Ball-Deutung</label>
                  <select value={myzelBallMode} onChange={(e) => setMyzelBallMode(e.target.value as MyzelBallMode)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                    {MYZEL_BALL_MODE_OPTIONS.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Node-Deutung</label>
                  <select value={myzelNodeMode} onChange={(e) => setMyzelNodeMode(e.target.value as MyzelNodeMode)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                    {MYZEL_NODE_MODE_OPTIONS.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Myzel-Takt (16tel)</label>
                  <select value={String(myzelStep16ths)} onChange={(e) => setMyzelStep16ths(parseInt(e.target.value, 10))} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                    {Array.from({ length: 9 }, (_, i) => i + 1).map((step) => <option key={step} value={step}>{step}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-6 border border-neutral-800 bg-neutral-950/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-neutral-800 pb-1">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Interpreter · Raum III → Raum V</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMyzelDriveEnabled((prev) => !prev)}
                      className={`px-2.5 py-1 text-[10px] uppercase tracking-widest border transition-colors ${myzelDriveEnabled ? "border-rose-400/70 text-rose-100 bg-rose-950/30 hover:bg-rose-900/40" : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`}
                    >
                      Myzel Drive {myzelDriveEnabled ? "An" : "Aus"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoom3BodyEnabled((prev) => !prev)}
                      className={`px-2.5 py-1 text-[10px] uppercase tracking-widest border transition-colors ${room3BodyEnabled ? "border-cyan-400/70 text-cyan-100 bg-cyan-950/30 hover:bg-cyan-900/40" : "border-neutral-700 text-neutral-300 hover:bg-neutral-900"}`}
                    >
                      Körper {room3BodyEnabled ? "An" : "Aus"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMyzelInterpreterMix({ hybridBlend: 0.64, weaveBlend: 0.58, constellationBlend: 0.74, driveAmount: 0.22, driveResponse: 0.68 });
                        setMyzelDriveEnabled(true);
                        setRoom3BodyControls(DEFAULT_ROOM3_BODY_CONTROLS);
                        setRoom3BodyEnabled(true);
                      }}
                      className="px-2 py-1 text-[10px] uppercase tracking-widest border border-neutral-700 text-neutral-300 hover:bg-neutral-900"
                    >
                      Reset Mix
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Hybrid ↔ Woven: {(myzelInterpreterMix.hybridBlend * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.hybridBlend} onChange={(e) => setMyzelInterpreterMix((prev) => ({ ...prev, hybridBlend: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Woven Pull: {(myzelInterpreterMix.weaveBlend * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.weaveBlend} onChange={(e) => setMyzelInterpreterMix((prev) => ({ ...prev, weaveBlend: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Sternbild Direktheit: {(myzelInterpreterMix.constellationBlend * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.constellationBlend} onChange={(e) => setMyzelInterpreterMix((prev) => ({ ...prev, constellationBlend: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Myzel Drive: {myzelDriveEnabled ? `${(myzelInterpreterMix.driveAmount * 100).toFixed(0)}%` : "Bypass"}</label>
                    <input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.driveAmount} disabled={!myzelDriveEnabled} onChange={(e) => setMyzelInterpreterMix((prev) => ({ ...prev, driveAmount: parseFloat(e.target.value) }))} className={`w-full cursor-pointer ${myzelDriveEnabled ? "" : "opacity-35"}`} />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Drive Reaktion: {(myzelInterpreterMix.driveResponse * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={myzelInterpreterMix.driveResponse} onChange={(e) => setMyzelInterpreterMix((prev) => ({ ...prev, driveResponse: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Körper-Kopplung: {(room3BodyControls.coupling * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={room3BodyControls.coupling} onChange={(e) => setRoom3BodyControls((prev) => ({ ...prev, coupling: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Materialachse: {(room3BodyControls.material * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={room3BodyControls.material} onChange={(e) => setRoom3BodyControls((prev) => ({ ...prev, material: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Luft / Noise: {(room3BodyControls.air * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={room3BodyControls.air} onChange={(e) => setRoom3BodyControls((prev) => ({ ...prev, air: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Rauheit: {(room3BodyControls.roughness * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={room3BodyControls.roughness} onChange={(e) => setRoom3BodyControls((prev) => ({ ...prev, roughness: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Resonanzfokus: {(room3BodyControls.resonance * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={room3BodyControls.resonance} onChange={(e) => setRoom3BodyControls((prev) => ({ ...prev, resonance: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-neutral-500 leading-relaxed">
                  Hybrid ↔ Woven mischt den robusteren Y/Topologie-Anker mit dem älteren woven-Pfad. Woven Pull zieht Obertöne in den Drone-Bus. Sternbild Direktheit öffnet den direkten Layout-Kanal. Der Drive arbeitet als myzelbasierter Fold/Soft-Clip. Der neue Körper ergänzt Room III um eine kleine Exciter-Resonator-Schicht: Sternbild-Flux, Zug und Helligkeit verschieben jetzt Material, Dämpfung, Rauheit und Partialgruppen statt nur Gain und Filter. Aktuelle Materialfamilie: <span className="text-cyan-200">{getRoom3MaterialLabel(room3BodyControls.material, myceliumSnapshotRef.current.constellationTension ?? 0, myceliumSnapshotRef.current.constellationBrightness ?? 0.5)}</span>.
                </div>
              </div>
              <div className="flex justify-between items-end mb-2 gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={toggleMyzelEnabled} className={`px-6 py-2 border ${myzelEnabled ? "bg-amber-900 border-amber-500 text-amber-100" : "border-neutral-600 text-white hover:bg-neutral-800"}`}>{myzelEnabled ? "MYZEL DEAKTIVIEREN" : "MYZEL AKTIVIEREN"}</button>
                  <button
                    onClick={() => {
                      topologyRefs.current.nodes = JI_NODES.map((ji) => ({
                        x: TOPO_WIDTH * 0.1 + Math.random() * TOPO_WIDTH * 0.8,
                        y: TOPO_HEIGHT * 0.1 + Math.random() * TOPO_HEIGHT * 0.8,
                        freq: FREQ(220, ji.cents),
                        energy: 0,
                        label: ji.label,
                      }));
                    }}
                    className="px-3 py-2 border border-neutral-700 text-neutral-300 hover:bg-neutral-900 text-xs uppercase tracking-widest"
                  >
                    Layout Reset
                  </button>
                </div>
                <div className="text-right space-y-1">
                  <div><span className="text-amber-400 text-sm tracking-wide">{systemState}</span></div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
                    Myzel: {myceliumSnapshotRef.current.activeNodeLabel ?? "-"} · Energy {myceliumSnapshotRef.current.maxEnergy.toFixed(2)} · Drift {myceliumSnapshotRef.current.myceliumBallSpeed.toFixed(2)} · Sternbild {myceliumSnapshotRef.current.constellationRatios.map((ratio) => ratio.toFixed(2)).join("/")} · Zug {myceliumSnapshotRef.current.constellationTension.toFixed(2)} · Flux {myceliumSnapshotRef.current.constellationFlux.toFixed(2)} · Körper {room3BodyEnabled ? room3TimbreStateRef.current.materialLabel : "Bypass"} · Prime {myzelPrimedYRef.current !== null ? `${Math.round(freqFromY(myzelPrimedYRef.current))}Hz/${myzelPrimedSourceRef.current}` : "-"}
                  </div>
                </div>
              </div>
              <div className="relative border border-neutral-800 bg-neutral-950 overflow-hidden" style={{ height: TOPO_HEIGHT }}>
                {myzelEnabled ? (
                  <canvas
                    ref={topologyCanvasRef}
                    width={TOPO_WIDTH}
                    height={TOPO_HEIGHT}
                    className="w-full h-full cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const scaleX = TOPO_WIDTH / rect.width;
                      const scaleY = TOPO_HEIGHT / rect.height;
                      const x = (e.clientX - rect.left) * scaleX;
                      const y = (e.clientY - rect.top) * scaleY;
                      const nodes = topologyRefs.current.nodes;
                      let hitIndex: number | null = null;
                      for (let i = nodes.length - 1; i >= 0; i -= 1) {
                        const node = nodes[i];
                        const radius = 10 + node.energy * 28;
                        if (Math.hypot(node.x - x, node.y - y) <= radius) {
                          hitIndex = i;
                          break;
                        }
                      }
                      if (hitIndex !== null) {
                        const node = nodes[hitIndex];
                        topologyDragRef.current = {
                          nodeIndex: hitIndex,
                          offsetX: x - node.x,
                          offsetY: y - node.y,
                        };
                      }
                    }}
                    onMouseMove={(e) => {
                      const drag = topologyDragRef.current;
                      if (drag.nodeIndex === null) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const scaleX = TOPO_WIDTH / rect.width;
                      const scaleY = TOPO_HEIGHT / rect.height;
                      const x = (e.clientX - rect.left) * scaleX;
                      const y = (e.clientY - rect.top) * scaleY;
                      const node = topologyRefs.current.nodes[drag.nodeIndex];
                      if (!node) return;
                      node.x = clamp(x - drag.offsetX, 16, TOPO_WIDTH - 16);
                      node.y = clamp(y - drag.offsetY, 16, TOPO_HEIGHT - 16);
                    }}
                    onMouseUp={() => {
                      topologyDragRef.current = { nodeIndex: null, offsetX: 0, offsetY: 0 };
                    }}
                    onMouseLeave={() => {
                      topologyDragRef.current = { nodeIndex: null, offsetX: 0, offsetY: 0 };
                    }}
                  />
                ) : <div className="absolute inset-0 flex items-center justify-center text-neutral-700">[ OFFLINE ]</div>}
              </div>
            </div>
          </div>
        )}

        {room === "GAME" && (
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="border border-neutral-800 bg-black p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-2xl text-amber-100">IV. Irrlicht Arena</h2>
                  <p className="text-sm text-neutral-400">Waberndes Irrlicht in surrealer Landschaft. Unsichtbare JI-Anker (z.B. 3/2, 15/8) verschieben sich im Hintergrund und lenken seine Bahn. Steuerung: A/D oder Pfeile, Schuss: Space.</p>
                </div>
                <button onClick={() => void startGameRun()} className="px-5 py-2 border border-amber-300 text-amber-100 hover:bg-amber-200/20">{gameActive ? "Restart Run" : "Start Run"}</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm mb-4">
                <div className="border border-neutral-800 p-2">Score: <span className="text-amber-200">{gameHud.score}</span> / {gameHud.goal}</div>
                <div className="border border-neutral-800 p-2">Total: <span className="text-yellow-100">{gameHud.total}</span></div>
                <div className="border border-neutral-800 p-2">HP: <span className="text-cyan-200">{gameHud.hp}</span></div>
                <div className="border border-neutral-800 p-2">Phase: <span className="text-fuchsia-200">{gameHud.phase}</span></div>
                <div className="border border-neutral-800 p-2">Zeit: <span className="text-emerald-200">{gameHud.time.toFixed(1)}s</span></div>
                <div className="border border-neutral-800 p-2">Level: <span className="text-orange-200">{gameHud.level}</span></div>
                <div className="border border-neutral-800 p-2">Anchor: <span className="text-violet-200">{gameHud.anchor}</span></div>
                <div className="border border-neutral-800 p-2 col-span-2 md:col-span-2">{gameHud.message}</div>
              </div>
              <div className="border border-neutral-800 bg-neutral-900 overflow-hidden"><canvas ref={gameCanvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} className="w-full h-auto" /></div>
            </div>
          </div>
        )}

        <div className="mb-2 border border-neutral-800 bg-neutral-950/70 px-3 py-1.5 text-[10px]">
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap leading-none">
            <div className="shrink-0 text-neutral-300">
              <span className="mr-2 uppercase tracking-widest text-[10px] text-neutral-500">Partikel</span>
              <span className="text-amber-200">{particleSystemLabel}</span>
              <span className="text-neutral-500"> · </span>
              <span className="text-neutral-200">{particleDisplayModeLabel}</span>
              <span className="text-neutral-500"> · </span>
              <span className="text-cyan-200">{formatHzCompact(cursorHudHz)}</span>
            </div>
            <span className="h-4 w-px shrink-0 bg-neutral-800" aria-hidden="true" />
            <div className="shrink-0 text-neutral-300">
              <span className="mr-2 uppercase tracking-widest text-[10px] text-neutral-500">Fretboard</span>
              <span className="text-violet-200">{gridTuningLabel}</span>
              <span className="text-neutral-500"> · </span>
              <span className="text-neutral-200">{gridModeLabel}</span>
              <span className="text-neutral-500"> · </span>
              <span className="text-cyan-200">{formatHzCompact(nParamsUI.gridBase, 1)}</span>
            </div>
            <span className="h-4 w-px shrink-0 bg-neutral-800" aria-hidden="true" />
            <div className="shrink-0 text-neutral-300">
              <span className="mr-2 uppercase tracking-widest text-[10px] text-neutral-500">Fenster</span>
              <span className="text-neutral-200">{keyboardWindowStart + 1}-{keyboardWindowEnd + 1}</span>
              <span className="text-neutral-500"> · </span>
              <span className="text-cyan-200">{keyboardWindowFirstHz !== null ? formatHzCompact(keyboardWindowFirstHz) : "-"}</span>
              <span className="text-neutral-500"> → </span>
              <span className="text-cyan-200">{keyboardWindowLastHz !== null ? formatHzCompact(keyboardWindowLastHz) : "-"}</span>
            </div>
            <span className="ml-auto" />
            <div className="flex items-center gap-2 pl-1">
              <StatusGlyph kind="octave" active={resonanceActionBadges.octave} title="Oktavierung aktiv" />
              <StatusGlyph kind="sustain" active={resonanceActionBadges.sustain} title="Verlängerung aktiv" />
              <StatusGlyph kind="swell" active={resonanceActionBadges.swell} title="Lautheits-Swell aktiv" />
              <StatusGlyph kind="echo" active={nParamsUI.echoOn} title="Echo aktiv" />
              <StatusGlyph kind="drive" active={myzelDriveEnabled} title="Myzel-Drive aktiv" />
            </div>
          </div>
        </div>

        {(room === "RESONANCE" || room === "MAIN" || room === "NEXUS") && (
          <>
            <button
              type="button"
              onClick={() => {
                if (addRecordingMarker("side")) triggerSideMarkerPulse("left");
              }}
              disabled={!recordingState.isRecording}
              className={`hidden xl:flex fixed items-start justify-start px-3 py-3 text-left transition-colors overflow-hidden ${recordingState.isRecording ? "left-[12px] cursor-pointer hover:bg-neutral-950/25" : "left-[12px] cursor-default opacity-40 pointer-events-none"}`}
              style={{ top: 156, bottom: 24, width: 'max(0px, calc((100vw - 72rem) / 2 - 28px))' }}
              aria-label="Marker links setzen"
              title={recordingState.isRecording ? "Marker setzen" : "Marker nur waehrend Aufnahme"}
            >
              {sideMarkerPulses.filter((pulse) => pulse.side === "left").map((pulse, idx) => (
                <span
                  key={pulse.id}
                  className="pointer-events-none absolute left-3 top-3 rounded-full border border-emerald-300/80"
                  style={{
                    width: 16,
                    height: 16,
                    animation: `logoMarkerPulse 1.2s ease-out ${idx * 0.04}s forwards`,
                  }}
                />
              ))}
              <span className="relative z-10 text-[10px] leading-tight text-neutral-500">klicke die Flaeche um eine Markierung in der Aufnahme zu setzen.</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (addRecordingMarker("side")) triggerSideMarkerPulse("right");
              }}
              disabled={!recordingState.isRecording}
              className={`hidden xl:flex fixed items-start justify-end px-3 py-3 text-right transition-colors overflow-hidden ${recordingState.isRecording ? "cursor-pointer hover:bg-neutral-950/25" : "cursor-default opacity-40 pointer-events-none"}`}
              style={{ top: 156, bottom: 24, right: `${scrollbarInsetPx}px`, width: `max(0px, calc((100vw - 72rem) / 2 - ${scrollbarInsetPx + 16}px))` }}
              aria-label="Marker rechts setzen"
              title={recordingState.isRecording ? "Marker setzen" : "Marker nur waehrend Aufnahme"}
            >
              {sideMarkerPulses.filter((pulse) => pulse.side === "right").map((pulse, idx) => (
                <span
                  key={pulse.id}
                  className="pointer-events-none absolute right-3 top-3 rounded-full border border-emerald-300/80"
                  style={{
                    width: 16,
                    height: 16,
                    animation: `logoMarkerPulse 1.2s ease-out ${idx * 0.04}s forwards`,
                  }}
                />
              ))}
              <span className="relative z-10 text-[10px] leading-tight text-neutral-500">Hier geht&apos;s auch</span>
            </button>
            <div className="max-w-6xl mx-auto space-y-4">
            <div className="border border-neutral-800 bg-black p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-2xl text-purple-200">V. Xensonar Synth</h2>
                  <p className="text-sm text-neutral-400">Bewege Maus/Touch oder die Pfeiltasten als Fokus-Vektor durch den harmonischen Raum. Ein Klick erzeugt einen Resonanz-Ripple. Duenes Fadenkreuz = Fokus-Cursor, heller Ball = Wellenstarter-Ball. Kammerton-Keys: 1-0, Q-P (abwaerts). Zielwellen: Y links, X rechts, C oben, V unten.</p>
                </div>
                <button
                  onClick={async () => {
                    if (!nexusActive) {
                      const ctx = await ensureAudioReady();
                      await prewarmAudioRuntime(ctx);
                      setNexusActive(true);
                      return;
                    }
                    setNexusActive(false);
                  }}
                  className={`w-[28rem] max-w-full h-12 px-5 rounded-sm border font-semibold tracking-wide transition-all ${nexusActive ? "bg-gradient-to-r from-violet-900/90 to-purple-800/90 border-violet-400 text-violet-100 shadow-[0_0_14px_rgba(167,139,250,0.28)]" : "bg-neutral-900 border-neutral-500 text-neutral-100 hover:bg-neutral-800"}`}
                >
                  {nexusActive && resonanceInputIndicator ? "Hast du schon aus- und wieder anschalten probiert?" : "Power"}
                </button>
              </div>
              <div className="flex flex-col gap-4 mb-4">
              <div className="border border-neutral-800 bg-neutral-900 overflow-hidden relative cursor-crosshair">
                {!nexusActive && <div className="absolute inset-0 flex items-center justify-center text-neutral-700 pointer-events-none z-10">[ OFFLINE - AKTIVIEREN FUER AUDIO & DRIFT ]</div>}
                <canvas
                  ref={nexusCanvasRef}
                  width={GAME_WIDTH}
                  height={GAME_HEIGHT}
                  className="w-full h-auto block"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    updateNParams({ echoOn: !nexusParamsRef.current.echoOn });
                  }}
                  onMouseMove={(e) => {
                    if (audioCtx && audioCtx.state !== "running") {
                      void audioCtx.resume();
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    const scaleX = GAME_WIDTH / rect.width;
                    const scaleY = GAME_HEIGHT / rect.height;
                    const rawX = (e.clientX - rect.left) * scaleX;
                    const rawY = (e.clientY - rect.top) * scaleY;
                    updateFocusCursor(rawX, rawY, "mouse");
                    
                    if (activeGridDragStepRef.current !== null && activeGridDragStartYRef.current !== null) {
                        activeGridDragMovedRef.current = true;
                        const deltaY = rawY - activeGridDragStartYRef.current;
                        const offsetDelta = -deltaY / 25;
                        setManualGridStepOffset(activeGridDragStepRef.current, activeGridDragBaseOffsetRef.current + offsetDelta);
                    } else {
                        nexusRefs.current.cursorX = rawX;
                        commitResonanceCursorY(rawY, { primeSource: "resonance" });
                    }
                  }}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    (document.activeElement as HTMLElement)?.blur();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const scaleX = GAME_WIDTH / rect.width;
                    const scaleY = GAME_HEIGHT / rect.height;
                    const clickX = (e.clientX - rect.left) * scaleX;
                    const clickY = (e.clientY - rect.top) * scaleY;
                    updateFocusCursor(clickX, clickY, "mouse");
                    
                    if (clickX < 30) {
                        const lines = getVisibleGridLines(nexusParamsRef.current);
                        const clickedLine = lines.find(l => Math.abs(yFromFreq(l.freq) - clickY) < 12);
                        if (clickedLine && clickedLine.stepIndex !== undefined) {
                            activeGridDragStepRef.current = clickedLine.stepIndex;
                            activeGridDragStartYRef.current = clickY;
                            activeGridDragBaseOffsetRef.current = nexusParamsRef.current.manualGridStepOffsets[clickedLine.stepIndex] ?? 0;
                            activeGridDragMovedRef.current = false;
                            return; 
                        }
                    }

                    void ensureAudioReady().then(() => {
                      spawnNexusRipple();
                    });
                  }}
                  onMouseUp={() => {
                      if (activeGridDragStepRef.current !== null) {
                          if (!activeGridDragMovedRef.current) {
                              toggleManualGridStepMute(activeGridDragStepRef.current);
                          }
                          activeGridDragStepRef.current = null;
                      }
                  }}
                  onMouseLeave={() => {
                      activeGridDragStepRef.current = null;
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Harmonisches System</h3>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Kammerton: {nParamsUI.gridBase}Hz (Raster-Ausrichtung)</label>
                    <input type="range" min="300" max="500" step="1" value={nParamsUI.gridBase} onChange={(e) => updateNParams({ gridBase: parseInt(e.target.value) })} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center justify-between text-xs text-neutral-400">
                      <span>Partikel System</span>
                      <span className="text-emerald-400">(-_)</span>
                    </label>
                    <select value={nParamsUI.particleSystem} onChange={(e) => setParticleSystem(e.target.value as ParticleSystem)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                      <option value="ji">Just Intonation</option>
                      <option value="12edo">12 EDO</option>
                      <option value="bp">Bohlen-Pierce (13-TET)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center justify-between text-xs text-neutral-400">
                      <span>Partikel Modus</span>
                      <span className="text-emerald-400">(N / M)</span>
                    </label>
                    <select value={nParamsUI.churchMode} onChange={(e) => setChurchMode(e.target.value as ChurchMode)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                      {getModesForSystem(nParamsUI.particleSystem).map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center justify-between text-xs text-neutral-400">
                      <span>Raster System</span>
                      <span className="text-emerald-400">(; , / : .)</span>
                    </label>
                    <select
                      value={nParamsUI.gridTuning}
                      onChange={(e) => {
                        changeGridTuning(e.target.value as GridTuning);
                      }}
                      className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300"
                    >
                      {GRID_TUNING_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2">
                    <label className="mb-1 flex items-center justify-between text-xs text-neutral-400">
                      <span>Raster Modus</span>
                      <span className="text-emerald-400">(AltGr / Strg)</span>
                    </label>
                    <select value={nParamsUI.gridMode} onChange={(e) => setGridMode(e.target.value as ChurchMode)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                      {getModesForSystem(nParamsUI.gridTuning).map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                      <input 
                        type="checkbox" 
                        checked={nParamsUI.rememberGrid} 
                        onChange={(e) => updateNParams({ rememberGrid: e.target.checked })} 
                      />
                      Raster merken
                    </label>
                    <button 
                      onClick={() => {
                        const len = getTuningSteps(nParamsUI.gridTuning);
                        const emptyMutes: number[] = [];
                        const emptyOffsets = Array.from({ length: len }, () => 0);
                        updateNParams({
                          manualGridMutedSteps: emptyMutes,
                          manualGridStepOffsets: emptyOffsets
                        });
                        if (nParamsUI.lockCursorToGrid) {
                          commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: false });
                        }
                      }} 
                      className="px-2 py-0.5 border border-neutral-700 bg-neutral-900 text-neutral-400 text-xs hover:bg-neutral-800 ml-auto"
                    >
                      Raster Reset
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Steuerung & Raum</h3>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Cursor-Speed (Pfeile): {nParamsUI.cursorSpeed.toFixed(1)}</label>
                    <input type="range" min="1" max="14" step="0.5" value={nParamsUI.cursorSpeed} onChange={(e) => updateNParams({ cursorSpeed: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 mt-2"><input type="checkbox" checked={nParamsUI.gridOn} onChange={(e) => updateNParams({ gridOn: e.target.checked })} />Tuning Raster sichtbar</label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.lockCursorToGrid} onChange={(e) => { const lock = e.target.checked; updateNParams({ lockCursorToGrid: lock }); if (lock) { commitResonanceCursorY(nexusRefs.current.cursorY, { syncHud: false }); } }} />Cursor an Raster anpassen</label>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Zeit & Echo</h3>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.quantizeOn} onChange={(e) => { quantizeAnchorRef.current = null; updateNParams({ quantizeOn: e.target.checked }); }} />Quantisierung (Experiment: nur Partikel-Sounds)</label>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">16tel Tempo: {nParamsUI.quantizeBpm} BPM</label>
                    <input type="range" min="40" max="240" step="1" value={nParamsUI.quantizeBpm} onChange={(e) => { quantizeAnchorRef.current = null; updateNParams({ quantizeBpm: parseInt(e.target.value, 10) }); }} className="w-full cursor-pointer" />
                  </div>
                  <hr className="border-neutral-800 my-1" />
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.echoOn} onChange={(e) => updateNParams({ echoOn: e.target.checked })} />Partikel Echo Aktiv</label>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Echo Tempo: {nParamsUI.echoTempo}ms</label>
                    <input type="range" min="100" max="1000" step="10" value={nParamsUI.echoTempo} onChange={(e) => updateNParams({ echoTempo: parseInt(e.target.value) })} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Echo Decay: {(clamp(nParamsUI.echoDecay ?? 0.6, 0, 0.96) * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="0.96" step="0.01" value={nParamsUI.echoDecay ?? 0.6} onChange={(e) => updateNParams({ echoDecay: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                  </div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Drone · Begleitung · Drive</h3>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Gesamtlautstärke: {(droneVolume * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={droneVolume} onChange={(e) => setDroneVolume(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Drone Klangfarbe: {(nParamsUI.droneTimbre * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneTimbre} onChange={(e) => { const next = parseFloat(e.target.value); updateNParams({ droneTimbre: next }); applyRealtimeDroneOvertones(undefined, next); }} className="w-full cursor-pointer" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Vibrato</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneVibrato} onChange={(e) => updateNParams({ droneVibrato: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Flanger</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneFlanger} onChange={(e) => updateNParams({ droneFlanger: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Drive Insert</label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 mb-1"><input type="checkbox" checked={!!nParamsUI.droneDriveOn} onChange={(e) => updateNParams({ droneDriveOn: e.target.checked })} /><span className="text-xs text-neutral-400">{nParamsUI.droneDriveOn ? "An" : "Aus"}</span></label>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Drive: {((nParamsUI.droneDriveAmount ?? 0.36) * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneDriveAmount ?? 0.36} onChange={(e) => updateNParams({ droneDriveAmount: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Tone</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneDriveTone ?? 0.56} onChange={(e) => updateNParams({ droneDriveTone: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Mix</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneDriveMix ?? 0.48} onChange={(e) => updateNParams({ droneDriveMix: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Output</label>
                      <input type="range" min="0.3" max="1.2" step="0.01" value={nParamsUI.droneDriveOutput ?? 0.9} onChange={(e) => updateNParams({ droneDriveOutput: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2">
                    <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-500">Drive Quellen</div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["drone", "Drone"],
                        ["particles", "Partikel"],
                        ["waves", "Wellenstarter"],
                        ["myzel", "Myzel"],
                      ] as const).map(([key, label]) => {
                        const cfg = transientDriveUi[key];
                        return (
                          <div key={key} className="rounded border border-neutral-800 bg-neutral-950/50 p-2">
                            <label className="mb-1 flex items-center gap-2 text-xs text-neutral-300">
                              <input type="checkbox" checked={cfg.enabled} onChange={(e) => updateTransientDriveSource(key, { enabled: e.target.checked })} />
                              <span>{label}</span>
                              <span className="ml-auto text-[10px] text-neutral-500">{(cfg.send * 100).toFixed(0)}%</span>
                            </label>
                            <input type="range" min="0" max="1" step="0.01" value={cfg.send} onChange={(e) => updateTransientDriveSource(key, { send: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 flex items-center justify-between text-xs text-neutral-400">
                        <span>Quantisierung</span>
                        <span className="text-emerald-300">(Tab)</span>
                      </label>
                      <select value={String(quantizeGrid)} onChange={(e) => { const grid = parseInt(e.target.value, 10) as QuantizeGrid; quantizeAnchorRef.current = null; nexusRefs.current.nextAbsoluteStep = null; particleQuantizeQueueRef.current = []; particleQuantizeSeenRef.current = []; if (particleQuantizeTimerRef.current) { window.clearInterval(particleQuantizeTimerRef.current); particleQuantizeTimerRef.current = null; } setQuantizeGrid(grid); updateNParams({ quantizeBpm: gridTempoBpm }); }} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        <option value="16">16tel</option>
                        <option value="32">32tel</option>
                        <option value="64">64tel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Grid-Tempo: {gridTempoBpm} BPM ({quantizeStepMs}ms)</label>
                      <input type="range" min="40" max="240" step="1" value={gridTempoBpm} onChange={(e) => { const bpm = parseInt(e.target.value, 10); setGridTempoBpm(bpm); updateNParams({ quantizeBpm: bpm }); }} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Drone Rhythmus (Gate)</label>
                    <select value={nParamsUI.droneRhythm} onChange={(e) => updateNParams({ droneRhythm: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                      <option value="Off">Aus (Dauerstrich)</option>
                      <option value="Puls 1/4">Langsamer Puls (1/4)</option>
                      <option value="Puls 1/8">Treibender Puls (1/8)</option>
                      <option value="Puls 1/16">Stottern (1/16)</option>
                      <option value="Synkope">Synkope (Pattern)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Myzel / Wohnzimmer (geteilt)</label>
                      <button
                        onClick={toggleMyzelEnabled}
                        className={`w-full px-3 py-2 border text-sm ${myzelEnabled ? "bg-amber-900 border-amber-500 text-amber-100" : "border-neutral-700 text-neutral-200 hover:bg-neutral-900"}`}
                      >
                        {myzelEnabled ? "Myzel Deaktivieren" : "Myzel Aktivieren"}
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Myzel-Takt</label>
                      <select value={String(myzelStep16ths)} onChange={(e) => setMyzelStep16ths(parseInt(e.target.value, 10))} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {Array.from({ length: 9 }, (_, i) => i + 1).map((step) => <option key={step} value={step}>{step} / 16</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-start bg-neutral-900/50 p-4 border border-neutral-800">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs text-neutral-400 mb-1">Drone Sound Preset</label>
                      <select value={nParamsUI.dronePreset} onChange={(e) => { const nextPreset = e.target.value as DronePreset; setDronePreset(nextPreset); requestAnimationFrame(() => { const refNow = nexusParamsRef.current; const mix = refNow.droneJIOvertonesByPreset?.[nextPreset] ?? refNow.droneJIOvertones; applyRealtimeDroneOvertones(mix, refNow.droneTimbre); }); }} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {DRONE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Partikel Sound</label>
                      <select value={nParamsUI.particlePreset} onChange={(e) => { const nextPreset = e.target.value as ParticlePreset; updateNParams({ particlePreset: nextPreset }); void previewParticlePresetSelection(nextPreset); }} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {PARTICLE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="col-span-2">
                      <label className="block text-xs text-neutral-400 mb-1">Wellenstart-Sound Preset</label>
                      <select value={waveSoundPreset} onChange={(e) => { const nextPreset = e.target.value as WaveSoundPreset; setWaveSoundPreset(nextPreset); void previewWavePresetSelection(nextPreset); }} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {WAVE_SOUND_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 mb-1"><input type="checkbox" checked={waveSoundEnabled} onChange={(e) => setWaveSoundEnabled(e.target.checked)} /><span className="text-xs text-neutral-400">An</span></label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2 rounded-sm">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.waveTimbreGradientEnabled} onChange={(e) => updateNParams({ waveTimbreGradientEnabled: e.target.checked })} />Wellenstarter Timbre-Gradient X</label>
                        <span className={`text-[10px] uppercase tracking-widest ${nParamsUI.waveTimbreGradientEnabled ? "text-cyan-300" : "text-neutral-500"}`}>{nParamsUI.waveTimbreGradientEnabled ? "aktiv" : "inaktiv"}</span>
                      </div>
                      <select value={nParamsUI.waveTimbreGradientX} onChange={(e) => updateNParams({ waveTimbreGradientX: e.target.value as WaveTimbreGradientPreset })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {WAVE_TIMBRE_GRADIENT_PRESETS.map((preset) => <option key={`wave-grad-${preset.value}`} value={preset.value}>{preset.label}</option>)}
                      </select>
                      <div className="mt-1 text-[10px] text-neutral-500">Reagiert auf die X-Achse von Wellenstarter und Klaviatur.</div>
                    </div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-3 py-2 rounded-sm">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.waveVolumeGradientEnabled} onChange={(e) => updateNParams({ waveVolumeGradientEnabled: e.target.checked })} />Wellenstarter Lautstärke-Gradient X</label>
                        <span className={`text-[10px] uppercase tracking-widest ${nParamsUI.waveVolumeGradientEnabled ? "text-cyan-300" : "text-neutral-500"}`}>{nParamsUI.waveVolumeGradientEnabled ? "aktiv" : "inaktiv"}</span>
                      </div>
                      <select value={nParamsUI.waveVolumeGradientX} onChange={(e) => updateNParams({ waveVolumeGradientX: e.target.value as WaveVolumeGradientPreset })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {WAVE_VOLUME_GRADIENT_PRESETS.map((preset) => <option key={`wave-vol-grad-${preset.value}`} value={preset.value}>{preset.label}</option>)}
                      </select>
                      <div className="mt-1 text-[10px] text-neutral-500">Optionaler X-Lautstärkeverlauf: links leiser oder rechts leiser.</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Partikel Farbgradient X</label>
                      <select value={nParamsUI.particleGradientX} onChange={(e) => updateNParams({ particleGradientX: e.target.value as ParticleGradientPreset })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {PARTICLE_GRADIENT_PRESETS.map((preset) => <option key={`x-${preset.value}`} value={preset.value}>{preset.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Partikel Farbgradient Y</label>
                      <select value={nParamsUI.particleGradientY} onChange={(e) => updateNParams({ particleGradientY: e.target.value as ParticleGradientPreset })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {PARTICLE_GRADIENT_PRESETS.map((preset) => <option key={`y-${preset.value}`} value={preset.value}>{preset.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Wellenstart Lautstärke: {(waveSoundVolume * 100).toFixed(0)}%</label>
                    <input type="range" min="0" max="0.5" step="0.01" value={waveSoundVolume} onChange={(e) => setWaveSoundVolume(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={nParamsUI.waveOvertonesEnabled} onChange={(e) => updateNParams({ waveOvertonesEnabled: e.target.checked })} />Wellenstarter Obertöne aktiv</label>
                  {activeOvertoneMixer === "waves" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Oberton-Modus</label>
                        <select value={nParamsUI.waveOvertoneMode} onChange={(e) => updateNParams({ waveOvertoneMode: e.target.value as WaveOvertoneMode })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                          {WAVE_OVERTONE_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Arp Raster</label>
                        <select value={String(nParamsUI.waveOvertoneArpRate)} onChange={(e) => updateNParams({ waveOvertoneArpRate: parseInt(e.target.value, 10) as WaveOvertoneArpRate })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                          {WAVE_OVERTONE_ARP_RATES.map((rate) => <option key={`wave-overtone-arp-${rate}`} value={rate}>{rate}stel</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Arp Muster</label>
                        <select value={nParamsUI.waveOvertoneArpPattern} onChange={(e) => updateNParams({ waveOvertoneArpPattern: e.target.value as WaveOvertoneArpPattern })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                          {WAVE_OVERTONE_ARP_PATTERNS.map((pattern) => <option key={pattern.value} value={pattern.value}>{pattern.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Arp Schritte: {nParamsUI.waveOvertoneArpSteps}</label>
                        <input type="range" min="2" max="16" step="1" value={nParamsUI.waveOvertoneArpSteps} onChange={(e) => updateNParams({ waveOvertoneArpSteps: parseInt(e.target.value, 10) })} className="w-full cursor-pointer" />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">
                      {activeOvertoneMixer === "drone" ? "Drone Oberton Wellenform" : "Wellenstarter Oberton Wellenform"}
                    </label>
                    <select
                      value={activeOvertoneMixer === "drone" ? nParamsUI.droneOvertoneWaveform : nParamsUI.waveOvertoneWaveform}
                      onChange={(e) => updateNParams(activeOvertoneMixer === "drone"
                        ? { droneOvertoneWaveform: e.target.value as WaveOvertoneWaveform }
                        : { waveOvertoneWaveform: e.target.value as WaveOvertoneWaveform })}
                      className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300"
                    >
                      <option value="sine">Sine</option>
                      <option value="triangle">Triangle</option>
                      <option value="square">Square</option>
                      <option value="sawtooth">Sawtooth</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 uppercase tracking-widest">
                    <button type="button" onClick={() => setActiveOvertoneMixer("drone")} className={`px-2 py-1 border ${activeOvertoneMixer === "drone" ? "border-fuchsia-400 text-fuchsia-200 bg-fuchsia-950/30" : "border-neutral-700 text-neutral-400"}`}>Drone Mixer</button>
                    <button type="button" onClick={() => setActiveOvertoneMixer("waves")} className={`px-2 py-1 border ${activeOvertoneMixer === "waves" ? "border-cyan-400 text-cyan-200 bg-cyan-950/30" : "border-neutral-700 text-neutral-400"}`}>Wellenstarter Mixer</button>
                  </div>
                  {activeOvertoneMixer === "waves" && (
                    <div className="bg-black/30 p-2 border border-neutral-800">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Wellenstarter-Obertöne</div>
                        <span className={`text-[10px] uppercase tracking-widest ${nParamsUI.waveOvertonesEnabled ? "text-cyan-300" : "text-neutral-500"}`}>
                          {nParamsUI.waveOvertonesEnabled ? `aktiv · ${nParamsUI.waveOvertoneMode}` : "inaktiv"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Global-Level: {Math.round((nParamsUI.waveOvertoneGlobalLevel ?? 1) * 100)}%</label>
                          <input type="range" min="0" max="2.5" step="0.01" value={nParamsUI.waveOvertoneGlobalLevel ?? 1} onChange={(e) => updateNParams({ waveOvertoneGlobalLevel: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Mix-Preset</label>
                          <div className="flex items-center gap-2">
                            <select value={selectedWaveOvertonePreset} onChange={(e) => setSelectedWaveOvertonePreset(e.target.value as WaveOvertoneMixPresetId)} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                              {WAVE_OVERTONE_MIX_PRESETS.map((preset) => <option key={`wave-overtone-preset-${preset.value}`} value={preset.value}>{preset.label}</option>)}
                            </select>
                            <button type="button" onClick={() => applyWaveOvertonePreset(selectedWaveOvertonePreset)} className="px-2 py-1 border border-cyan-700 text-cyan-200 bg-cyan-950/30 text-xs">Laden</button>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-1 max-h-32 overflow-y-auto pr-1">
                        {DRONE_JI_OVERTONES.map((node) => (
                          <div key={`wave-${node.label}`} className="flex items-center gap-1 bg-neutral-950 px-1 py-0.5 border border-neutral-800">
                            <span className="text-[10px] text-neutral-400 w-7">{node.label}</span>
                            <input type="range" min="0" max="1" step="0.01" value={nParamsUI.waveOvertones[node.label] || 0} onChange={(e) => setWaveOvertone(node.label, parseFloat(e.target.value))} className="h-1 w-full cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Wellenradius: {(nParamsUI.waveRadius ?? 1).toFixed(2)}x</label>
                    <input type="range" min="0.35" max="2.2" step="0.01" value={nParamsUI.waveRadius ?? 1} onChange={(e) => updateNParams({ waveRadius: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Wellendecay</label>
                    <select value={nParamsUI.waveDecay ?? "linear"} onChange={(e) => updateNParams({ waveDecay: e.target.value as WaveDecayPreset })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                      {WAVE_DECAY_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
                    </select>
                  </div>

                  {activeOvertoneMixer === "drone" && (
                    <div className="bg-black/30 p-2 border border-neutral-800">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2">Drone-JI Obertöne (Mischpult)</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-1 max-h-32 overflow-y-auto pr-1">
                        {DRONE_JI_OVERTONES.map((node) => (
                          <div key={node.label} className="flex items-center gap-1 bg-neutral-950 px-1 py-0.5 border border-neutral-800">
                            <span className="text-[10px] text-neutral-400 w-7">{node.label}</span>
                            <input type="range" min="0" max="1" step="0.01" value={nParamsUI.droneJIOvertones[node.label] || 0} onChange={(e) => { const value = parseFloat(e.target.value); setDroneOvertone(node.label, value); applyRealtimeDroneOvertones({ ...nexusParamsRef.current.droneJIOvertones, [node.label]: value }); }} className="h-1 w-full cursor-pointer" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-neutral-400">Partikel Lautstärke (Agent Pings)</label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400">
                        <input type="checkbox" checked={nParamsUI.particleMute} onChange={(e) => { const muteAll = e.target.checked; nexusRefs.current.agents.forEach((agent) => { agent.lastHit = muteAll ? Number.POSITIVE_INFINITY : 0; }); updateNParams({ particleMute: muteAll, agentEnabled: activeParticleNodes.map(() => !muteAll) }); }} />
                        Mute
                      </label>
                    </div>
                    <input type="range" min="0" max={PARTICLE_VOLUME_MAX} step="0.01" value={nParamsUI.particleVolume} onChange={(e) => updateNParams({ particleVolume: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">Partikel einzeln schalten (Keyboard: A S D F G H J K L Oe Ae # -)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeParticleNodes.map((node, idx) => {
                      const enabled = nParamsUI.agentEnabled[idx] ?? true;
                      const volume = nParamsUI.agentVolumes[idx] ?? 1;
                      return (
                        <div key={node.label} className="border border-amber-500/50 bg-amber-950/10 px-2 py-1 text-left text-xs flex items-center gap-2 text-amber-100">
                          <button
                            type="button"
                            onClick={() => toggleNexusAgent(idx)}
                            className={`inline-block h-4 w-4 border ${enabled ? "bg-emerald-400 border-emerald-200" : "bg-neutral-900 border-emerald-600"}`}
                            aria-label={`${node.label} toggeln`}
                          />
                          <span className="min-w-10 text-amber-100">{node.label}</span>
                          <input type="range" min="0" max="1.5" step="0.01" value={volume} onChange={(e) => setNexusAgentVolume(idx, parseFloat(e.target.value))} className="h-1 flex-1 cursor-pointer" aria-label={`${node.label} Lautstaerke`} />
                          <span className="w-4 text-right font-semibold uppercase text-amber-200">{AGENT_KEYS[idx] ?? "-"}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 border border-neutral-800 bg-neutral-950/70 p-3">
                    <div className="mx-auto aspect-square w-full">
                      <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-label="Xensonar Harmonic Mandala mit Meta-Presets">
                        <defs>
                          <filter id="mandala-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="0.22" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Subtle VHS-style chroma split overlays */}
                        <g transform="translate(49.65 50)" stroke="rgba(56,189,248,0.14)">
                          <ellipse rx="4" ry="18" />
                          <ellipse rx="4" ry="18" transform="rotate(45)" />
                          <ellipse rx="4" ry="18" transform="rotate(90)" />
                          <ellipse rx="4" ry="18" transform="rotate(135)" />
                          <circle cx="0" cy="-18" r="18" />
                          <circle cx="18" cy="0" r="18" />
                          <circle cx="0" cy="18" r="18" />
                          <circle cx="-18" cy="0" r="18" />
                          <polygon points="0,-48 9,-38 -9,-38" />
                          <polygon points="48,0 38,-9 38,9" />
                          <polygon points="0,48 -9,38 9,38" />
                          <polygon points="-48,0 -38,9 -38,-9" />
                        </g>

                        <g transform="translate(50.35 50)" stroke="rgba(232,121,249,0.14)">
                          <ellipse rx="4" ry="18" />
                          <ellipse rx="4" ry="18" transform="rotate(45)" />
                          <ellipse rx="4" ry="18" transform="rotate(90)" />
                          <ellipse rx="4" ry="18" transform="rotate(135)" />
                          <circle cx="0" cy="-18" r="18" />
                          <circle cx="18" cy="0" r="18" />
                          <circle cx="0" cy="18" r="18" />
                          <circle cx="-18" cy="0" r="18" />
                          <polygon points="0,-48 9,-38 -9,-38" />
                          <polygon points="48,0 38,-9 38,9" />
                          <polygon points="0,48 -9,38 9,38" />
                          <polygon points="-48,0 -38,9 -38,-9" />
                        </g>

                        <g transform="translate(50 50)" stroke="#5f5f5f" filter="url(#mandala-soft-glow)">
                          <ellipse rx="4" ry="18" />
                          <ellipse rx="4" ry="18" transform="rotate(45)" />
                          <ellipse rx="4" ry="18" transform="rotate(90)" />
                          <ellipse rx="4" ry="18" transform="rotate(135)" />

                          <circle cx="0" cy="-18" r="18" />
                          <circle cx="18" cy="0" r="18" />
                          <circle cx="0" cy="18" r="18" />
                          <circle cx="-18" cy="0" r="18" />

                          {MANDALA_DOT_POSITIONS.map((dot) => {
                            const dotColor = mandalaPresetColors[dot.id];
                            const isSpinning = mandalaRandomizingPresetId === dot.id;
                            return (
                              <g
                                key={`mandala-dot-${dot.id}`}
                                role="button"
                                tabIndex={0}
                                onClick={() => randomizeMetaPresetForSession(dot.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    randomizeMetaPresetForSession(dot.id);
                                  }
                                }}
                                aria-label={`Meta-Preset ${dot.id} fuer diese Sitzung zufaellig ueberschreiben`}
                                style={{ cursor: mandalaRandomizingPresetId || rouletteIsSpinning ? "wait" : "pointer" }}
                              >
                                <title>Sitzungs-Zufall fuer dieses Meta-Preset</title>
                                <circle cx={dot.cx} cy={dot.cy} r="4.1" fill={hexToRgba(dotColor, isSpinning ? 0.18 : 0.09)} stroke={isSpinning ? dotColor : "#5f5f5f"} strokeWidth={isSpinning ? 1.6 : 1.1} />
                                <circle cx={dot.cx} cy={dot.cy} r="1.9" fill={isSpinning ? dotColor : "#737373"} />
                              </g>
                            );
                          })}

                          <polygon points="0,-48 9,-38 -9,-38" />
                          <polygon points="48,0 38,-9 38,9" />
                          <polygon points="0,48 -9,38 9,38" />
                          <polygon points="-48,0 -38,9 -38,-9" />

                          <polygon points="-31,-31 -20,-31 -31,-20" />
                          <polygon points="31,-31 20,-31 31,-20" />
                          <polygon points="31,31 20,31 31,20" />
                          <polygon points="-31,31 -20,31 -31,20" />
                        </g>

                        <g transform="translate(50 50)">
                          {META_PRESETS.map((preset) => {
                            const color = mandalaPresetColors[preset.id];
                            const active = highlightedMandalaPresetId === preset.id;
                            return (
                              <g
                                key={preset.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => applyMetaPreset(preset.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    applyMetaPreset(preset.id);
                                  }
                                }}
                                style={{ cursor: "pointer" }}
                                aria-label={`Meta-Preset ${preset.label} laden`}
                              >
                                <title>{preset.label}: {preset.description}</title>
                                <polygon
                                  points={preset.points}
                                  fill={active ? hexToRgba(color, 0.22) : hexToRgba(color, 0.08)}
                                  stroke={active ? color : hexToRgba(color, 0.48)}
                                  strokeWidth={active ? 2.6 : 1.45}
                                  style={active ? { filter: `drop-shadow(0 0 8px ${hexToRgba(color, 0.55)})` } : undefined}
                                />
                              </g>
                            );
                          })}
                          <g
                            role="button"
                            tabIndex={0}
                            onClick={startMetaPresetRoulette}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                startMetaPresetRoulette();
                              }
                            }}
                            aria-label="Zufälliges Meta-Preset auswürfeln"
                            style={{ cursor: mandalaRandomizingPresetId || rouletteIsSpinning ? "wait" : "pointer" }}
                          >
                            <title>Zufälliges Meta-Preset auswürfeln</title>
                            <circle cx="0" cy="0" r="6.2" fill={rouletteIsSpinning ? "rgba(250, 204, 21, 0.12)" : "rgba(255,255,255,0.025)"} stroke={rouletteIsSpinning ? "#fde047" : "rgba(163,163,163,0.28)"} strokeWidth="1.1" style={rouletteIsSpinning ? { animation: 'mandalaCenterPulse 0.42s ease-in-out infinite' } : undefined} />
                            <circle cx="0" cy="0" r="2.5" fill={rouletteIsSpinning ? "#facc15" : "rgba(212,212,212,0.42)"} />
                            <circle cx="0" cy="0" r="1.1" fill={rouletteIsSpinning ? "#fff7ae" : "rgba(255,255,255,0.75)"} />
                          </g>
                        </g>
                      </svg>
                    </div>
                    <div className="mt-2 flex flex-col gap-1 text-[10px] uppercase tracking-widest text-neutral-500">
                      <div className="flex items-center justify-between gap-2">
                        <span>Meta-Presets auf den 8 Außenpfeilen</span>
                        <span>{rouletteIsSpinning || mandalaRandomizingPresetId ? "würfelt" : activeMetaPreset ? "aktiv" : "klick lädt"}</span>
                      </div>
                      <div className={`min-h-[2.5rem] leading-relaxed ${activeMetaPreset ? "text-amber-300" : "text-neutral-500"}`}>
                        {rouletteIsSpinning ? "Mitte klicken: das Mandala würfelt ein Meta-Preset aus Mausbewegung und Rechnerjitter." : mandalaRandomizingPresetId ? "Die inneren Punkte überschreiben das zugehörige Meta-Preset für diese Sitzung per Rechner- und Mauszufall." : activeMetaPreset ? `${activeMetaPreset.label}${activeMetaPresetId && sessionMetaOverrides[activeMetaPresetId]?.preset ? " · Session-Zufall" : ""} · ${activeMetaPreset.description}` : "12 Uhr beginnen, dann im Uhrzeigersinn weiterschalten. Mitte klickt Glücksrad, die inneren Punkte würfeln das jeweilige Preset neu aus."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Collective Memory · Harmonic</h3>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={collectiveMemoryEnabled} onChange={(e) => setCollectiveMemoryEnabled(e.target.checked)} />Effektgerät aktiv</label>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Memory-Fenster: {collectiveMemoryWindow.toFixed(1)}s</label>
                      <input type="range" min="2" max="16" step="0.5" value={collectiveMemoryWindow} onChange={(e) => setCollectiveMemoryWindow(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {([
                      ["drone", "Drone"],
                      ["particles", "Partikel"],
                      ["waves", "Wellenstarter"],
                      ["myzel", "Myzel"],
                    ] as const).map(([key, label]) => {
                      const cfg = collectiveMemoryUi[key];
                      return (
                        <div key={key} className="border border-neutral-800 bg-neutral-950/50 p-2 flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={cfg.enabled} onChange={(e) => updateCollectiveMemoryUi(key, { enabled: e.target.checked })} />{label}</label>
                          <div>
                            <label className="block text-[11px] text-neutral-500 mb-1">Send {(cfg.send * 100).toFixed(0)}%</label>
                            <input type="range" min="0" max="1.2" step="0.01" value={cfg.send} onChange={(e) => updateCollectiveMemoryUi(key, { send: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                          </div>
                          <div>
                            <label className="block text-[11px] text-neutral-500 mb-1">Wet {(cfg.wet * 100).toFixed(0)}%</label>
                            <input type="range" min="0" max="1" step="0.01" value={cfg.wet} onChange={(e) => updateCollectiveMemoryUi(key, { wet: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-neutral-500">
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Energie <span className="text-neutral-300">{((collectiveMemoryMonitor?.energy ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Helligkeit <span className="text-neutral-300">{((collectiveMemoryMonitor?.brightness ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Root <span className="text-neutral-300">{collectiveMemoryMonitor ? formatHzCompact(collectiveMemoryMonitor.harmonicRootHz) : "—"}</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Spannung <span className="text-neutral-300">{((collectiveMemoryMonitor?.intervalTension ?? 0) * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-xs text-neutral-500">Das Gerät hört auf den Gesamtmix, bildet über einige Sekunden ein harmonisches Gedächtnis und färbt Drone, Partikel, Wellenstarter und Myzel als eigene Sends zurück in den Musik-Bus. Mehr Fenster = trägeres Erinnern, kleinere Fenster = reaktiver.</div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Psychedelic Spiral · Parallelgerät</h3>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={psychedelicSpiralEnabled} onChange={(e) => setPsychedelicSpiralEnabled(e.target.checked)} />Spiralgerät aktiv</label>
                    <div className="text-[11px] text-neutral-500">Kritisch integriert: nicht als Master, sondern als kohärenter Parallelraum auf dem Space-Bus. Tastatur- und Rastersteuerung bleiben unberührt.</div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Drive {(psychedelicSpiralUi.drive * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.drive} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, drive: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Color {(psychedelicSpiralUi.color * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.color} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, color: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Motion {(psychedelicSpiralUi.motion * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.motion} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, motion: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Feedback {(psychedelicSpiralUi.feedback * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.feedback} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, feedback: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Bloom {(psychedelicSpiralUi.bloom * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.bloom} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, bloom: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Mix {(psychedelicSpiralUi.mix * 100).toFixed(0)}%</label>
                      <input type="range" min="0.4" max="1" step="0.01" value={psychedelicSpiralUi.mix} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, mix: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Breite {(psychedelicSpiralUi.stereoWidth * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralUi.stereoWidth} onChange={(e) => setPsychedelicSpiralUi((prev) => ({ ...prev, stereoWidth: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Follow {(psychedelicSpiralFollow * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={psychedelicSpiralFollow} onChange={(e) => setPsychedelicSpiralFollow(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {([
                      ["drone", "Drone"],
                      ["particles", "Partikel"],
                      ["waves", "Wellenstarter"],
                      ["myzel", "Myzel"],
                    ] as const).map(([key, label]) => {
                      const cfg = psychedelicSpiralUi[key];
                      return (
                        <div key={key} className="border border-neutral-800 bg-neutral-950/50 p-2 flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={cfg.enabled} onChange={(e) => updatePsychedelicSpiralSource(key, { enabled: e.target.checked })} />{label}</label>
                          <div>
                            <label className="block text-[11px] text-neutral-500 mb-1">Send {(cfg.send * 100).toFixed(0)}%</label>
                            <input type="range" min="0" max="1" step="0.01" value={cfg.send} onChange={(e) => updatePsychedelicSpiralSource(key, { send: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-neutral-500">
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Drive <span className="text-neutral-300">{(psychedelicSpiralMonitor.drive * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Motion <span className="text-neutral-300">{(psychedelicSpiralMonitor.motion * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Bloom <span className="text-neutral-300">{(psychedelicSpiralMonitor.bloom * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Breite <span className="text-neutral-300">{(psychedelicSpiralMonitor.width * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-xs text-neutral-500">Das Spiralgerät sitzt als modulare Parallelstufe auf dem Space-Bus. Es sammelt je nach Send-Anteilen Drone, Partikel, Wellenstarter und Myzel ein und bleibt dadurch kohärent mit Raum III, statt als globaler Master-Matsch alles gleich zu färben.</div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Enter Hold · Psy Pulse Phaser</h3>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={enterHoldPsyFxEnabled} onChange={(e) => setEnterHoldPsyFxEnabled(e.target.checked)} />Gerät aktiv</label>
                    <div className="text-xs text-neutral-500">wirkt nur solange <span className="text-neutral-300">Enter</span> gehalten wird</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Depth {(enterHoldPsyFxUi.depth * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.depth} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, depth: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Color {(enterHoldPsyFxUi.color * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.color} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, color: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Flicker {(enterHoldPsyFxUi.flicker * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.flicker} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, flicker: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Mix {(enterHoldPsyFxUi.mix * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.mix} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, mix: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Bass Motion {(enterHoldPsyFxUi.bassMotion * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.bassMotion} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, bassMotion: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Output {(enterHoldPsyFxUi.outputGain * 100).toFixed(0)}%</label>
                      <input type="range" min="0.3" max="1.4" step="0.01" value={enterHoldPsyFxUi.outputGain} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, outputGain: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded border border-neutral-800 bg-neutral-950/50 p-3">
                      <label className="block text-xs text-neutral-400 mb-1">Wave Send {(enterHoldPsyFxUi.waveSend * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.waveSend} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, waveSend: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div className="rounded border border-neutral-800 bg-neutral-950/50 p-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 mb-1"><input type="checkbox" checked={enterHoldPsyFxUi.bassLink} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, bassLink: e.target.checked }))} />Bass mitnehmen</label>
                      <label className="block text-xs text-neutral-400 mb-1">Bass Send {(enterHoldPsyFxUi.bassSend * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={enterHoldPsyFxUi.bassSend} onChange={(e) => setEnterHoldPsyFxUi((prev) => ({ ...prev, bassSend: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="text-xs text-neutral-500">Enter bleibt weiter der normale Ringwellen-Trigger. Solange die Taste gehalten wird, bekommen Wellenstarter einen tempo-synchronen Psy-Pulse-Phaser; der Bass kann optional in einer dunkleren, weniger hektischen Variante mitlaufen.</div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Schwarmdeuter · Particle Body Reader</h3>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={schwarmEnabled} onChange={(e) => setSchwarmEnabled(e.target.checked)} />Schwarmdeuter aktiv</label>
                    <div className="text-[11px] text-neutral-500">Läuft nur, wenn aktivierte Quellen wirklich Send haben. Partikelzustand wird gelesen, Audio bleibt als modulare Parallelstufe patchbar.</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Amount {(schwarmUi.amount * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.amount} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, amount: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Interpretation {(schwarmUi.interpretiveBias * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.interpretiveBias} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, interpretiveBias: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Sensitivity {(schwarmUi.sensitivity * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.sensitivity} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, sensitivity: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Memory {schwarmUi.memorySeconds.toFixed(1)}s</label>
                      <input type="range" min="0.6" max="4" step="0.1" value={schwarmUi.memorySeconds} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, memorySeconds: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Density {(schwarmUi.densityBias * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.densityBias} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, densityBias: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Weave {(schwarmUi.weave * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={schwarmUi.weave} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, weave: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Update {Math.round(schwarmUi.updateMs)}ms</label>
                      <input type="range" min="80" max="260" step="10" value={schwarmUi.updateMs} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, updateMs: parseFloat(e.target.value) }))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Material</label>
                      <select value={schwarmUi.material} onChange={(e) => setSchwarmUi((prev) => ({ ...prev, material: e.target.value as SchwarmMaterial }))} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {SCHWARM_MATERIAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div className="rounded border border-neutral-800 bg-neutral-950/40 px-2 py-2 text-[11px] text-neutral-500">
                      Control Load <span className="text-neutral-300">{(controlPerfMonitor.workRatio * 100).toFixed(0)}%</span> · {controlPerfMonitor.taskRuns} Ticks/Window · {controlPerfMonitor.avgWorkMs.toFixed(2)}ms Arbeit/Frame
                    </div>
                    <div className="rounded border border-neutral-800 bg-neutral-950/40 px-2 py-2 text-[11px] text-neutral-500">
                      Transienten <span className="text-neutral-300">{transientRuntimeMonitor.activeVoices}/{transientRuntimeMonitor.hardLimit}</span> · Load <span className="text-neutral-300">{(transientRuntimeMonitor.load * 100).toFixed(0)}%</span> · Drop <span className="text-neutral-300">{transientRuntimeMonitor.droppedVoices}</span> · Send-Trims <span className="text-neutral-300">{transientRuntimeMonitor.gatedSends}</span>
                    </div>
                  </div>
                  <div className="rounded border border-neutral-800 bg-neutral-950/40 p-2">
                    <div className="mb-2 text-[10px] uppercase tracking-widest text-neutral-500">Schwarm Quellen</div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["drone", "Drone"],
                        ["particles", "Partikel"],
                        ["waves", "Wellenstarter"],
                        ["myzel", "Myzel"],
                      ] as const).map(([key, label]) => {
                        const cfg = schwarmUi[key];
                        return (
                          <div key={key} className="rounded border border-neutral-800 bg-neutral-950/50 p-2">
                            <label className="mb-1 flex items-center gap-2 text-xs text-neutral-300">
                              <input type="checkbox" checked={cfg.enabled} onChange={(e) => updateSchwarmSource(key, { enabled: e.target.checked })} />
                              <span>{label}</span>
                              <span className="ml-auto text-[10px] text-neutral-500">{(cfg.send * 100).toFixed(0)}%</span>
                            </label>
                            <input type="range" min="0" max="1" step="0.01" value={cfg.send} onChange={(e) => updateSchwarmSource(key, { send: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-neutral-500">
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Kohäsion <span className="text-neutral-300">{((schwarmMonitor?.descriptors.cohesion ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Turbulenz <span className="text-neutral-300">{((schwarmMonitor?.descriptors.turbulence ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Kristall <span className="text-neutral-300">{((schwarmMonitor?.descriptors.crystallization ?? 0) * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Druck <span className="text-neutral-300">{((schwarmMonitor?.descriptors.pressure ?? 0) * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-xs text-neutral-500">Der Schwarmdeuter liest Agenten- und Partikelzustände, nicht nur das Audiosignal. So bleibt die Interpretation an Bewegung, Dichte und Wiederkehr gekoppelt. Zugleich ist er als eigene Parallelstufe abschaltbar und per Update-Intervall zügelbar.</div>
                </div>

                <div className="bg-neutral-900/50 p-4 border border-neutral-800 flex flex-col gap-3">
                  <h3 className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-neutral-800 pb-1">Live Mastering · Bus Glue</h3>
                  <div className="grid grid-cols-2 gap-2 items-end">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300"><input type="checkbox" checked={liveMasteringEnabled} onChange={(e) => setLiveMasteringEnabled(e.target.checked)} />Live-Mastering aktiv</label>
                    <div className="text-[11px] text-neutral-500">Kritisch übernommen: der Bus-Gedanke taugt, aber hier als vorsichtiger Insert zwischen Sammelbussen und Endstufe, damit Routing und Tastatursteuerung stabil bleiben.</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Balance {(liveMasteringStrength * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={liveMasteringStrength} onChange={(e) => setLiveMasteringStrength(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Glue {(liveMasteringGlue * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={liveMasteringGlue} onChange={(e) => setLiveMasteringGlue(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Air {(liveMasteringAir * 100).toFixed(0)}%</label>
                      <input type="range" min="0" max="1" step="0.01" value={liveMasteringAir} onChange={(e) => setLiveMasteringAir(parseFloat(e.target.value))} className="w-full cursor-pointer" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] text-neutral-500">
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Main <span className="text-neutral-300">{(liveMasterMonitor.main * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Drone <span className="text-neutral-300">{(liveMasterMonitor.drone * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Rhythm <span className="text-neutral-300">{(liveMasterMonitor.rhythm * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Space <span className="text-neutral-300">{(liveMasterMonitor.space * 100).toFixed(0)}%</span></div>
                    <div className="border border-neutral-800 bg-neutral-950/40 px-2 py-1">Trim <span className="text-neutral-300">{(liveMasterMonitor.trim * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-xs text-neutral-500">Drone, Rhythmus und Space laufen in getrennte Sammelpfade, werden dort sanft balanciert und erst dann in Clip/Limiter geschoben. Drums bleiben beim Stem-Recording weiter separat; die Tastatur- und Fenstersteuerung wurde nicht angerührt.</div>
                </div>
              </div>
              <div className="bg-neutral-900/50 p-4 border border-neutral-800 mt-4">
                <div className="flex items-center justify-between gap-3 mb-3 border-b border-neutral-800 pb-1">
                  <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Groove & Bass (Quantisiert)</div>
                  <button onClick={() => enterArenaWorkspace(3)} className="px-2 py-1 text-[10px] uppercase tracking-widest border border-emerald-700 text-emerald-200 hover:bg-emerald-950/40">Temp Workspace: L3 Test</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 font-semibold"><input type="checkbox" checked={nParamsUI.drumActive} onChange={(e) => updateNParams({ drumActive: e.target.checked })} />Drums Aktiv</label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-neutral-500">Metronom</span>
                      {[0, 1, 2, 3].map((dot) => {
                        const active = metronomePulse % 4 === dot;
                        return (
                          <span
                            key={dot}
                            className={`h-2.5 w-2.5 rounded-full border ${active ? "bg-emerald-300 border-emerald-200" : "bg-neutral-900 border-neutral-700"}`}
                          />
                        );
                      })}
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Drum Quelle</label>
                      <select value={nParamsUI.drumConfigMode} onChange={(e) => updateNParams({ drumConfigMode: e.target.value as "preset" | "exported" })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        <option value="preset">Preset</option>
                        <option value="exported">Forge Export</option>
                      </select>
                    </div>
                    {nParamsUI.drumConfigMode === "exported" ? (
                      <>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Drum Config</label>
                          <select value={nParamsUI.drumConfigId} onChange={(e) => updateNParams({ drumConfigId: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                            {exportedDrumConfigs.length === 0 && <option value="">Keine exportierte Drum-Konfiguration</option>}
                            {exportedDrumConfigs.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.bars}T · {entry.drumKit}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button type="button" disabled={!selectedExportedDrumConfig} onClick={() => void renameSelectedDrumConfig()} className="rounded border border-neutral-700 px-2 py-1 text-neutral-200 hover:bg-neutral-900 disabled:opacity-50">Umbenennen</button>
                          <button type="button" disabled={!selectedExportedDrumConfig} onClick={() => void removeSelectedDrumConfig()} className="rounded border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/40 disabled:opacity-50">Löschen</button>
                        </div>
                        {selectedExportedDrumConfig && (
                          <div className="text-[11px] text-neutral-500 border border-neutral-800 bg-neutral-950/40 px-2 py-2">
                            {selectedExportedDrumConfig.name} · {selectedExportedDrumConfig.bars} Takte · {selectedExportedDrumConfig.drumKit}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Drum Pattern</label>
                          <select value={nParamsUI.drumPattern} onChange={(e) => updateNParams({ drumPattern: e.target.value as DrumPattern })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">{DRUM_PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-400 mb-1">Drum Klang</label>
                          <select value={nParamsUI.drumKit ?? "dusty_tape"} onChange={(e) => updateNParams({ drumKit: e.target.value as DrumKit })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">{DRUM_KITS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Drum Lautstärke</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.drumVolume} onChange={(e) => updateNParams({ drumVolume: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 font-semibold"><input type="checkbox" checked={nParamsUI.bassActive} onChange={(e) => updateNParams({ bassActive: e.target.checked })} />Bass Aktiv</label>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Bass Pattern</label>
                      <select value={nParamsUI.bassPattern} onChange={(e) => updateNParams({ bassPattern: e.target.value as BassPattern })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">{BASS_PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Bass Lautstärke</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.bassVolume} onChange={(e) => updateNParams({ bassVolume: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm text-neutral-300 font-semibold h-5">Bass Root Steuerung</label>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Bass Root Mode</label>
                      <select value={nParamsUI.bassRootMode} onChange={(e) => updateNParams({ bassRootMode: e.target.value as "auto" | "fixed" })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        <option value="auto">Auto (Drone Follow)</option>
                        <option value="fixed">Fixed (Custom Hz)</option>
                      </select>
                    </div>
                    {nParamsUI.bassRootMode === "fixed" && (
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Root Hz: {nParamsUI.bassRootHz}Hz</label>
                        <input type="range" min="30" max="100" step="1" value={nParamsUI.bassRootHz} onChange={(e) => updateNParams({ bassRootHz: parseInt(e.target.value) })} className="w-full cursor-pointer" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Bass Tone: {nParamsUI.bassTone.toFixed(2)}</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.bassTone} onChange={(e) => updateNParams({ bassTone: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Bass Grit: {nParamsUI.bassGrit.toFixed(2)}</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.bassGrit} onChange={(e) => updateNParams({ bassGrit: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-300 font-semibold"><input type="checkbox" checked={nParamsUI.materialLoopActive} onChange={(e) => updateNParams({ materialLoopActive: e.target.checked })} />Materialspur Aktiv</label>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Material-Loop</label>
                      <select value={nParamsUI.materialLoopId} onChange={(e) => updateNParams({ materialLoopId: e.target.value })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        {exportedLoopMaterials.length === 0 && <option value="">Kein exportierter Loop in dieser Sitzung</option>}
                        {exportedLoopMaterials.map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.name} · {entry.bars}T · Forge-BPM ignoriert · {entry.renderMode}</option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-400"><input type="checkbox" checked={nParamsUI.materialLoopSyncToBeat} onChange={(e) => updateNParams({ materialLoopSyncToBeat: e.target.checked })} />am Taktstart an Beat koppeln</label>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Takt-Interpretation</label>
                      <select value={nParamsUI.materialLoopTimeMode} onChange={(e) => updateNParams({ materialLoopTimeMode: e.target.value as "normal" | "double" | "half" })} className="w-full bg-neutral-950 border border-neutral-700 p-1 text-sm text-neutral-300">
                        <option value="normal">Normal</option>
                        <option value="double">Double Time</option>
                        <option value="half">Half Time</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Materialspur Lautstärke</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.materialLoopVolume} onChange={(e) => updateNParams({ materialLoopVolume: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div className="text-[11px] leading-relaxed text-neutral-500">III.2-Loops werden hier als Ganzes auf die aktuelle Taktlaenge gebracht. Maßgeblich sind die exportierten Takte; odd bars wie 3 oder 5 bleiben gueltig. Falls sich ein Import halbiert oder verdoppelt anfuehlt, kannst du hier direkt auf Double Time oder Half Time umstellen.</div>
                    {selectedLoopMaterial && (
                      <div className="text-[11px] text-neutral-500 border border-neutral-800 bg-neutral-950/40 px-2 py-2 space-y-1">
                        <div>Aktiv: <span className="text-neutral-300">{selectedLoopMaterial.name}</span> · {selectedLoopMaterial.bars} exportierte Takte · Forge-BPM wird nicht für das Playback verwendet</div>
                        <div>Interpretation in Xensonar: <span className="text-cyan-300">{nParamsUI.materialLoopTimeMode === 'normal' ? 'Normal' : nParamsUI.materialLoopTimeMode === 'double' ? 'Double Time' : 'Half Time'}</span> · wirksam {formatMaterialLoopBars(getEffectiveMaterialLoopBars(selectedLoopMaterial, nParamsUI.materialLoopTimeMode))} Takte bei {Math.round(nParamsUI.quantizeBpm || 108)} BPM</div>
                        <div>Importpfad: <span className="text-emerald-300">{selectedLoopMaterial.renderMode?.includes('source-direct') ? 'Direktquelle / unbearbeiteter Loop' : 'Forge-Render / Übersetzung'}</span></div>
                        <div>Bevorzugte Myzel-Gruppe: <span className="text-fuchsia-300">{effectiveLoopMyzelGroup ? (MYZEL_POST_FX_GROUPS.find((entry) => entry.id === effectiveLoopMyzelGroup)?.label ?? effectiveLoopMyzelGroup) : '—'}</span></div>
                        <div>{selectedLoopMaterial.routeSummary ?? selectedLoopHandoffProfile?.routeSummary ?? 'Noch keine explizite Handoff-Summary vorhanden.'}</div>
                        <div className="text-neutral-600">{selectedLoopMaterial.stabilizeBy ?? selectedLoopHandoffProfile?.stabilizeBy ?? ''}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm text-neutral-300 font-semibold h-5">Drum Feinschliff</label>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Edge: {nParamsUI.drumEdge.toFixed(2)}</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.drumEdge} onChange={(e) => updateNParams({ drumEdge: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Softness: {nParamsUI.drumSoftness.toFixed(2)}</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.drumSoftness} onChange={(e) => updateNParams({ drumSoftness: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Air: {nParamsUI.drumAir.toFixed(2)}</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.drumAir} onChange={(e) => updateNParams({ drumAir: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Snap: {nParamsUI.drumSnap.toFixed(2)}</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.drumSnap} onChange={(e) => updateNParams({ drumSnap: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Groove Swing: {nParamsUI.grooveSwing.toFixed(2)}</label>
                      <input type="range" min="0" max="1" step="0.01" value={nParamsUI.grooveSwing} onChange={(e) => updateNParams({ grooveSwing: parseFloat(e.target.value) })} className="w-full cursor-pointer" />
                    </div>
                    <div className="text-[11px] leading-relaxed text-neutral-500">RhythmForge-Patterns lesen das Sternbild und formen daraus Basslaeufe und Drum-Phrasen, waehrend Xensonars Drum-Koerper und Timinglogik erhalten bleiben.</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-neutral-900/50 p-4 border border-neutral-800">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3 border-b border-neutral-800 pb-1">
                  <div>
                    <div className="text-[10px] text-neutral-500 uppercase tracking-widest">Master Aufnahme (WAV)</div>
                    <div className="text-sm text-neutral-400">Nimmt den aktuellen Gesamtmix auf (max. 15 Minuten) auf. Waehrenddessen setzen F9, das Logo oder die grossen Flaechen links/rechts neben dem Panel gruene Marker.</div>
                    <div className="mt-2 text-[11px] text-neutral-500">{recordingSourceMode === "without_drums" ? "Aufnahmequelle: Mix ohne Drums, Live-Drums bleiben hoerbar." : "Aufnahmequelle: kompletter Mix inklusive Drums."}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 rounded border border-neutral-800 bg-neutral-950/60 p-1">
                      <span className="px-1 text-[10px] uppercase tracking-widest text-neutral-500">Drums im Take</span>
                      <button
                        type="button"
                        onClick={() => setRecordingSourceMode("with_drums")}
                        disabled={recordingState.isRecording}
                        className={`px-2 py-1 text-xs border ${recordingSourceMode === "with_drums" ? "border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-100" : "border-neutral-800 text-neutral-400"} ${recordingState.isRecording ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        mit
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordingSourceMode("without_drums")}
                        disabled={recordingState.isRecording}
                        className={`px-2 py-1 text-xs border ${recordingSourceMode === "without_drums" ? "border-emerald-500 bg-emerald-950/40 text-emerald-100" : "border-neutral-800 text-neutral-400"} ${recordingState.isRecording ? "opacity-60 cursor-not-allowed" : ""}`}
                      >
                        ohne
                      </button>
                    </div>
                    <button
                      onClick={() => { if (recordingState.isRecording) stopRecording(); else void startRecording(); }}
                      className={`px-3 py-1.5 border text-sm ${recordingState.isRecording ? "border-red-500 bg-red-950/50 text-red-100" : "border-fuchsia-500 bg-fuchsia-950/40 text-fuchsia-100"}`}
                    >
                      {recordingState.isRecording ? `Stop (${formatDuration(recordingState.durationMs)})` : "Rec"}
                    </button>
                    <button
                      onClick={() => addRecordingMarker("logo")}
                      disabled={!recordingState.isRecording}
                      className={`px-3 py-1.5 border text-sm ${recordingState.isRecording ? "border-emerald-500 bg-emerald-950/40 text-emerald-100" : "border-neutral-800 text-neutral-600 cursor-not-allowed"}`}
                    >
                      marker (F9 / Rand)
                    </button>
                    <input
                      value={recordingState.filenameBase}
                      onChange={(e) => setRecordingState((prev) => ({ ...prev, filenameBase: e.target.value || "xensonar-take" }))}
                      className="bg-neutral-950 border border-neutral-700 px-2 py-1 text-sm text-neutral-200"
                      placeholder="Dateiname"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="text-sm text-neutral-300">
                      {recordingState.hasTake ? `Take: ${formatDuration(recordingState.durationMs)} · Marker: ${recordingMarkers.length}` : recordingState.isRecording ? `Aufnahme laeuft: ${formatDuration(recordingState.durationMs)} / ${formatDuration(MAX_RECORDING_MS)}` : "Noch keine Take"}
                      <div className={`text-xs mt-1 ${recordingState.exportStatus === "error" ? "text-red-300" : recordingState.exportStatus === "ready" ? "text-emerald-300" : "text-neutral-500"}`}>
                        {recordingState.exportMessage || "Recorder bereit."}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={downloadRecordingWav}
                        disabled={!recordingState.hasTake}
                        className="px-4 py-2 border border-neutral-700 text-neutral-200 disabled:text-neutral-600 disabled:border-neutral-800 hover:bg-neutral-800"
                      >
                        download full
                      </button>
                      <button
                        onClick={downloadRecordingCropWav}
                        disabled={!recordingState.hasTake || !recordingCrop}
                        className="px-4 py-2 border border-neutral-700 text-neutral-200 disabled:text-neutral-600 disabled:border-neutral-800 hover:bg-neutral-800"
                      >
                        download crop
                      </button>
                    </div>
                  </div>

                  {recordingState.hasTake && recordingPreviewUrl && (
                    <div className="flex flex-col gap-3">
                      <audio ref={recordingPreviewAudioRef} src={recordingPreviewUrl} controls className="w-full h-10" />
                      <div
                        ref={recordingTimelineRef}
                        onMouseDown={handleTimelinePointerDown}
                        className="w-full h-28 border border-neutral-800 bg-black/70 cursor-crosshair select-none relative"
                        title="Klick & Ziehen = Crop-Auswahl. Klick = Abspielposition setzen."
                      >
                        <svg viewBox={`0 0 ${Math.max(1, recordingWaveform.length)} 100`} preserveAspectRatio="none" className="w-full h-full block">
                          <rect x="0" y="0" width={Math.max(1, recordingWaveform.length)} height="100" fill="rgba(0,0,0,0.82)" />
                          {(() => {
                            const activeCrop = recordingCropDraft ?? recordingCrop;
                            if (!activeCrop || !recordingState.durationMs) return null;
                            const x = (activeCrop.startMs / recordingState.durationMs) * Math.max(1, recordingWaveform.length);
                            const w = ((activeCrop.endMs - activeCrop.startMs) / recordingState.durationMs) * Math.max(1, recordingWaveform.length);
                            return <rect x={x} y={0} width={Math.max(1, w)} height={100} fill="rgba(52, 211, 153, 0.18)" stroke="rgba(52, 211, 153, 0.75)" strokeWidth={1} />;
                          })()}
                          {recordingWaveform.map((peak, i) => {
                            const height = Math.max(1, peak * 42);
                            const y1 = 50 - height;
                            const y2 = 50 + height;
                            return <line key={`wf-${i}`} x1={i + 0.5} y1={y1} x2={i + 0.5} y2={y2} stroke="rgba(216, 180, 254, 0.75)" strokeWidth={0.9} />;
                          })}
                          {recordingMarkers.map((marker) => {
                            const x = recordingState.durationMs ? (marker.timeMs / recordingState.durationMs) * Math.max(1, recordingWaveform.length) : 0;
                            return <line key={marker.id} x1={x} y1={0} x2={x} y2={100} stroke={marker.usedInCrop ? "rgba(96,165,250,0.9)" : "rgba(74, 222, 128, 0.95)"} strokeWidth={2.2} />;
                          })}
                          {recordingState.durationMs > 0 && (
                            <line
                              x1={(recordingPlayheadMs / recordingState.durationMs) * Math.max(1, recordingWaveform.length)}
                              y1={0}
                              x2={(recordingPlayheadMs / recordingState.durationMs) * Math.max(1, recordingWaveform.length)}
                              y2={100}
                              stroke="rgba(255,255,255,0.9)"
                              strokeWidth={1.6}
                            />
                          )}
                        </svg>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-neutral-500">
                        <div>Gruene Striche = Marker (F9 / Logo / linke oder rechte Aussenflaeche), Blau = Marker liegt bereits in einem exportierten Crop.</div>
                        <div>
                          {recordingCrop ? `Crop: ${formatDuration(recordingCrop.startMs)} - ${formatDuration(recordingCrop.endMs)} (${formatDuration(recordingCrop.endMs - recordingCrop.startMs)})` : "Klick & Ziehen in die Leiste, um einen Crop-Bereich zu setzen."}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 bg-black p-4 border border-neutral-800 text-neutral-400 text-sm">
                <h3 className="text-xs text-pink-400 uppercase tracking-widest mb-2 font-bold border-b border-neutral-800 pb-1">Bedienungsanleitung & Steuerung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <h4 className="text-neutral-300 font-semibold mb-1">Performance & Wellen</h4>
                    <ul className="space-y-1">
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Maus</kbd> oder <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Touch</kbd>: Fokus-Vektor (Pitch / Spektrum) bewegen</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Pfeiltasten</kbd>: Cursor bewegen (rastet bei "Cursor an Raster anpassen" exakt ein)</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Links-Klick</kbd> oder <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Enter</kbd>: Resonanz-Ripple (Ringwelle) abfeuern; bei aktivem Enter-Hold-Gerät färbt gehaltenes Enter die Wellenstarter zusätzlich</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Rechtsklick</kbd>: nur Echo an/aus (keine Ringwelle)</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Y</kbd> <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">X</kbd> <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">C</kbd> <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">V</kbd>: Gerichtete Sektorwellen feuern (Links, Rechts, Oben, Unten)</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Space</kbd> (halten): Alle waehrenddessen neu gespielten Wellenstarter schwellen an; der Grundton wird wieder mit angehoben, waehrend die tiefere Lage erhalten bleiben darf; nach Loslassen schwillt es schnell ab</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Backspace</kbd> (halten): Wellenstart-Sound sowie Klaviatur- und Pfeiltasten-Sound (gleicher Sound ohne Welle) werden eine Oktave hoeher gespielt</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-neutral-300 font-semibold mb-1">Harmonische Steuerung</h4>
                    <ul className="space-y-1">
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">1 - 0</kbd> und <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Q - P</kbd>: OR-Klaviatur auf dem aktuellen Raster spielen</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">^ / °</kbd>: Klaviatur-Spiegelung an/aus (nur Zuordnungsebene)</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">?/ß</kbd> und <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Ue</kbd> (deutsche Tastatur): Fenster der Klaviatur verschieben; <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Ue</kbd> liegt hinter <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">P</kbd></li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">M / N</kbd>, <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">, / .</kbd> sowie <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">AltGr / Strg</kbd>: Partikel Modus / Raster System / Raster Modus durchschalten</li>
                      <li>Custom Tuning im Raster: links auf das kleine Dreieck einer Linie klicken zum Muten/Entmuten, oder nach oben/unten ziehen fuer manuellen Step-Offset (Feintuning pro Stufe)</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Tab</kbd>: Quantisierungsgrad durchschalten (16tel, 32tel, 64tel) (Zeitraster, bringt die Partikelsounds auf den Beat)</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">-_</kbd>: Partikel-System durchschalten</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">´ / `</kbd>: Töne halten; loslassen dämpft schnell ab</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Caps Lock</kbd>: Drum Pattern zyklisch durchschalten</li>
                      <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">A ... #</kbd>: Einzelne Partikel / Obertoene im Raum an- und ausschalten</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
        )}

        {room === "COMMONS" && <ResonanceCommonsRoom onBack={() => setRoom("RESONANCE")} />}
        {room === "L3LAB" && <Level3LabRoom onBack={() => setRoom("RESONANCE")} />}
      </main>
    </div>
  );
}
