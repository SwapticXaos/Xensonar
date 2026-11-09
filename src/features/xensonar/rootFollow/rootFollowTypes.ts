import type { RootFollowSpectralWindowMeta } from './rootFollowSpectralWindowMeta';
import type { LocalFieldModuleState } from '../../l3lab/canonicalForge/localField';
export type RootFollowSourceKind = 'material' | 'synth';
export type RootFollowRenderMode = 'flowing' | 'grainy' | 'direct';

export type RootFollowSynthTrackSnapshot = {
  id: string;
  label: string;
  color: string;
  instrumentRole: 'bass' | 'companion' | 'aux' | 'texture';
  instrumentPreset: string | null;
  patternPresetId: string | null;
  enabled: boolean;
  volume: number;
  pan: number;
};

export type RootFollowSynthNoteClass = 'standard' | 'material-base' | 'material-fragment' | 'carrier-field' | 'carrier-fragment';
export type RootFollowSynthRenderSourceKind = 'synth-live' | 'synth-frozen-sample' | 'material-import' | 'sample-block';

const ROOT_FOLLOW_SYNTH_RENDER_SOURCE_KINDS: RootFollowSynthRenderSourceKind[] = ['synth-live', 'synth-frozen-sample', 'material-import', 'sample-block'];

export function normalizeRootFollowSynthRenderSourceKind(value: unknown): RootFollowSynthRenderSourceKind | null {
  return typeof value === 'string' && ROOT_FOLLOW_SYNTH_RENDER_SOURCE_KINDS.includes(value as RootFollowSynthRenderSourceKind)
    ? value as RootFollowSynthRenderSourceKind
    : null;
}

export function inferRootFollowSynthRenderSourceKind(args: {
  renderSourceKind?: unknown;
  noteClass?: RootFollowSynthNoteClass | null;
  presetId?: string | null;
}): RootFollowSynthRenderSourceKind {
  const explicit = normalizeRootFollowSynthRenderSourceKind(args.renderSourceKind);
  if (explicit) return explicit;
  if (args.noteClass === 'material-base' || args.noteClass === 'material-fragment') return 'material-import';
  if (typeof args.presetId === 'string' && args.presetId.startsWith('sample:')) return 'sample-block';
  return 'synth-live';
}

export function rootFollowRenderSourceUsesAudioElasticity(kind: RootFollowSynthRenderSourceKind | null | undefined): boolean {
  return kind === 'material-import' || kind === 'sample-block' || kind === 'synth-frozen-sample';
}

export type RootFollowSynthNoteSnapshot = {
  carrierIntegralTimbre?: RootFollowCarrierTimbreSnapshot | null;
  materialPitchMode?: string | null;
  compiledGainCurve?: number[] | null;
  compiledPitchSemitones?: number[] | null;
  panOverride?: number | null;
  id: string;
  trackId: string;
  startBeat: number;
  durationBeats: number;
  gridStepOffset: number;
  channelIndex: number;
  octaveOffset: number;
  velocity: number;
  gate: number;
  lineId: string | null;
  lineHz: number | null;
  instrumentPresetOverride: string | null;
  noteClass: RootFollowSynthNoteClass;
  renderSourceKind: RootFollowSynthRenderSourceKind;
  sourceMaterialId: string | null;
  anchorHz: number | null;
  sourceTempoBpm: number | null;
  sourceLoopDurationSec: number | null;
  sampleOffsetSec: number | null;
  samplePlaybackDurationSec: number | null;
  fadeInBeats: number;
  fadeOutBeats: number;
  localField: LocalFieldModuleState | null;
  spectralWindowMeta?: RootFollowSpectralWindowMeta | null;
};

export type RootFollowSynthPatternSnapshot = {
  bars: number;
  beatsPerBar: number;
  stepsPerBar: number;
  segmentCount: number;
  baseHz: number;
  tuning: string;
  repetitionModel: string;
  activeTrackIds: string[];
  tracks: RootFollowSynthTrackSnapshot[];
  notes: RootFollowSynthNoteSnapshot[];
};

export type RootFollowSynthPatchTrackSnapshot = {
  id: string;
  instrumentPreset: string | null;
  patternPresetId: string | null;
  enabled: boolean;
  volume: number;
  pan: number;
};

export type RootFollowCarrierTimbreSnapshot = {
  schemaVersion: 'carrier-integral-timbre-v1';
  presetId: string;
  paramsHash: string;
  oscillators: Array<{
    type: OscillatorType;
    gain: number;
    freqMul: number;
    detune: number;
  }>;
  filterType: BiquadFilterType;
  filterFrequency: number;
  filterQ: number;
  attackScale: number;
  releaseScale: number;
  transientGain: number;
  panSpread: number;
  drive: number;
  outputGain: number;
};


export type RootFollowFormantBandRole = 'core-line' | 'body-band' | 'surface-band' | 'residual-band' | 'transient-dust';

export type RootFollowFormantBandPlan = {
  id: string;
  role: RootFollowFormantBandRole;
  centerRatioCurve: number[];
  bandwidthRatioCurve: number[];
  gainCurve: number[];
  confidenceCurve?: number[];
  roughnessCurve?: number[];
};

export type RootFollowFormantWindowPlan = {
  schemaVersion: 'root-follow-formant-window-plan-v1';
  sourceMachineId: string;
  sourceSchemaVersion: string;
  curveResolution: number;
  maxBands: number;
  rootReferenceHz: number;
  durationBeats: number;
  bands: RootFollowFormantBandPlan[];
  roughnessCurve: number[];
  transientDustCurve: number[];
  residualEnergyCurve: number[];
  summary: {
    inputEnergy: number;
    retainedLineEnergy: number;
    textureEnergy: number;
    transientEnergy: number;
    rawMaxSliceGain: number;
    maxSliceGain: number;
    safeGainCeiling: number;
    gainCeilingScaleCount: number;
    bandCount: number;
    curveResolution: number;
    estimatedAutomationCurves: number;
    emptySliceCount: number;
    opposingTrackPairCount: number;
    maxResidualSlice: number;
    maxRoughnessSlice: number;
    maxTransientDustSlice: number;
  };
};

export type RootFollowSynthPatchSnapshot = {
  compositionPresetId: string;
  baseHz: number;
  tuning: string;
  repetitionModel: string;
  trackPatches: RootFollowSynthPatchTrackSnapshot[];
  carrierIntegralTimbre: RootFollowCarrierTimbreSnapshot | null;
};

export type RootFollowBankEntryConfig = {
  sourceKind: RootFollowSourceKind;
  renderMode: RootFollowRenderMode;
  anchorGridStep: number | null;
  synthPattern: RootFollowSynthPatternSnapshot | null;
  synthPatch: RootFollowSynthPatchSnapshot | null;
  formantWindowPlan: RootFollowFormantWindowPlan | null;
};

export type RootFollowBankRecord = {
  schemaVersion: 3;
  memberIds: string[];
  orderedIds: string[];
  aliases: Record<string, string>;
  entryConfigs: Record<string, RootFollowBankEntryConfig>;
};

export const DEFAULT_ROOT_FOLLOW_BANK_SCHEMA_VERSION = 3 as const;

export const DEFAULT_MATERIAL_ROOT_FOLLOW_ENTRY_CONFIG: RootFollowBankEntryConfig = {
  sourceKind: 'material',
  renderMode: 'flowing',
  anchorGridStep: null,
  synthPattern: null,
  synthPatch: null,
  formantWindowPlan: null,
};

export const DEFAULT_SYNTH_ROOT_FOLLOW_ENTRY_CONFIG: RootFollowBankEntryConfig = {
  sourceKind: 'synth',
  renderMode: 'direct',
  anchorGridStep: null,
  synthPattern: null,
  synthPatch: null,
  formantWindowPlan: null,
};

function clampFiniteNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(value ?? NaN)) return fallback;
  return Math.max(min, Math.min(max, Number(value)));
}

function filterStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function normalizeSynthTrackSnapshot(raw: unknown): RootFollowSynthTrackSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<RootFollowSynthTrackSnapshot>;
  if (typeof parsed.id !== 'string') return null;
  return {
    id: parsed.id,
    label: typeof parsed.label === 'string' ? parsed.label : parsed.id,
    color: typeof parsed.color === 'string' ? parsed.color : '#c084fc',
    instrumentRole: parsed.instrumentRole === 'bass' || parsed.instrumentRole === 'companion' || parsed.instrumentRole === 'aux' || parsed.instrumentRole === 'texture'
      ? parsed.instrumentRole
      : 'aux',
    instrumentPreset: typeof parsed.instrumentPreset === 'string' ? parsed.instrumentPreset : null,
    patternPresetId: typeof parsed.patternPresetId === 'string' ? parsed.patternPresetId : null,
    enabled: parsed.enabled !== false,
    volume: clampFiniteNumber(parsed.volume, 0.8, 0, 1),
    pan: clampFiniteNumber(parsed.pan, 0, -1, 1),
  };
}

function normalizeSynthNoteSnapshot(raw: unknown, fallbackTrackPresetId: string | null = null): RootFollowSynthNoteSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<RootFollowSynthNoteSnapshot>;
  if (typeof parsed.id !== 'string' || typeof parsed.trackId !== 'string') return null;
  const noteClass: RootFollowSynthNoteClass = parsed.noteClass === 'material-base' || parsed.noteClass === 'material-fragment' || parsed.noteClass === 'carrier-field' || parsed.noteClass === 'carrier-fragment' ? parsed.noteClass : 'standard';
  const instrumentPresetOverride = typeof parsed.instrumentPresetOverride === 'string' ? parsed.instrumentPresetOverride : null;
  const durationBeats = clampFiniteNumber(parsed.durationBeats, 0.25, 0.0625);
  return {
    id: parsed.id,
    trackId: parsed.trackId,
    startBeat: clampFiniteNumber(parsed.startBeat, 0, 0),
    durationBeats,
    gridStepOffset: Math.round(clampFiniteNumber(parsed.gridStepOffset, 0)),
    channelIndex: Math.round(clampFiniteNumber(parsed.channelIndex, 0, 0)),
    octaveOffset: Math.round(clampFiniteNumber(parsed.octaveOffset, 0)),
    velocity: clampFiniteNumber(parsed.velocity, 0.8, 0, 1),
    gate: clampFiniteNumber(parsed.gate, 1, 0, 1.5),
    lineId: typeof parsed.lineId === 'string' ? parsed.lineId : null,
    lineHz: Number.isFinite(parsed.lineHz ?? NaN) ? Math.max(1, Number(parsed.lineHz)) : null,
    instrumentPresetOverride,
    compiledGainCurve: Array.isArray(parsed.compiledGainCurve) ? parsed.compiledGainCurve.slice(0, 512).map(v => clampFiniteNumber(v, 1, 0, 4)) : null,
    compiledPitchSemitones: Array.isArray(parsed.compiledPitchSemitones) ? parsed.compiledPitchSemitones.slice(0, 512).map(v => clampFiniteNumber(v, 0, -48, 48)) : null,
    panOverride: Number.isFinite(parsed.panOverride) ? clampFiniteNumber(parsed.panOverride, 0, -1, 1) : null,
    carrierIntegralTimbre: normalizeRootFollowCarrierTimbreSnapshot(parsed.carrierIntegralTimbre),
    materialPitchMode: typeof parsed.materialPitchMode === "string" ? parsed.materialPitchMode : null,
    noteClass,
    renderSourceKind: inferRootFollowSynthRenderSourceKind({
      renderSourceKind: parsed.renderSourceKind,
      noteClass,
      presetId: instrumentPresetOverride ?? fallbackTrackPresetId,
    }),
    sourceMaterialId: typeof parsed.sourceMaterialId === 'string' ? parsed.sourceMaterialId : null,
    anchorHz: Number.isFinite(parsed.anchorHz ?? NaN) ? Math.max(1, Number(parsed.anchorHz)) : null,
    sourceTempoBpm: Number.isFinite(parsed.sourceTempoBpm ?? NaN) ? Math.max(1, Number(parsed.sourceTempoBpm)) : null,
    sourceLoopDurationSec: Number.isFinite(parsed.sourceLoopDurationSec ?? NaN) ? Math.max(0.005, Number(parsed.sourceLoopDurationSec)) : null,
    sampleOffsetSec: Number.isFinite(parsed.sampleOffsetSec ?? NaN) ? Math.max(0, Number(parsed.sampleOffsetSec)) : null,
    samplePlaybackDurationSec: Number.isFinite(parsed.samplePlaybackDurationSec ?? NaN) ? Math.max(0.005, Number(parsed.samplePlaybackDurationSec)) : null,
    fadeInBeats: clampFiniteNumber(parsed.fadeInBeats, 0, 0, durationBeats),
    fadeOutBeats: clampFiniteNumber(parsed.fadeOutBeats, 0, 0, durationBeats),
    localField: parsed.localField && typeof parsed.localField === 'object' ? parsed.localField as LocalFieldModuleState : null,
    spectralWindowMeta: parsed.spectralWindowMeta && typeof parsed.spectralWindowMeta === 'object' ? parsed.spectralWindowMeta as RootFollowSpectralWindowMeta : null,
  };
}

export function normalizeRootFollowSynthPatternSnapshot(raw: unknown): RootFollowSynthPatternSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<RootFollowSynthPatternSnapshot>;
  const tracks = Array.isArray(parsed.tracks)
    ? parsed.tracks.map(normalizeSynthTrackSnapshot).filter((entry): entry is RootFollowSynthTrackSnapshot => Boolean(entry))
    : [];
  const trackPresetById = new Map(tracks.map((track) => [track.id, track.instrumentPreset] as const));
  return {
    bars: Math.max(1, Math.round(clampFiniteNumber(parsed.bars, 1, 1))),
    beatsPerBar: Math.max(1, clampFiniteNumber(parsed.beatsPerBar, 4, 1)),
    stepsPerBar: Math.max(1, Math.round(clampFiniteNumber(parsed.stepsPerBar, 16, 1))),
    segmentCount: Math.max(1, Math.round(clampFiniteNumber(parsed.segmentCount, 4, 1))),
    baseHz: Math.max(1, clampFiniteNumber(parsed.baseHz, 220, 1)),
    tuning: typeof parsed.tuning === 'string' ? parsed.tuning : '12edo',
    repetitionModel: typeof parsed.repetitionModel === 'string' ? parsed.repetitionModel : 'octave',
    activeTrackIds: Array.from(new Set(filterStringArray(parsed.activeTrackIds))),
    tracks,
    notes: Array.isArray(parsed.notes)
      ? parsed.notes.map((note) => {
        const rawNote = note && typeof note === 'object' ? note as Partial<RootFollowSynthNoteSnapshot> : null;
        const fallbackTrackPresetId = typeof rawNote?.trackId === 'string' ? trackPresetById.get(rawNote.trackId) ?? null : null;
        return normalizeSynthNoteSnapshot(note, fallbackTrackPresetId);
      }).filter((entry): entry is RootFollowSynthNoteSnapshot => Boolean(entry))
      : [],
  };
}

function normalizeSynthPatchTrackSnapshot(raw: unknown): RootFollowSynthPatchTrackSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<RootFollowSynthPatchTrackSnapshot>;
  if (typeof parsed.id !== 'string') return null;
  return {
    id: parsed.id,
    instrumentPreset: typeof parsed.instrumentPreset === 'string' ? parsed.instrumentPreset : null,
    patternPresetId: typeof parsed.patternPresetId === 'string' ? parsed.patternPresetId : null,
    enabled: parsed.enabled !== false,
    volume: clampFiniteNumber(parsed.volume, 0.8, 0, 1),
    pan: clampFiniteNumber(parsed.pan, 0, -1, 1),
  };
}

export function normalizeRootFollowCarrierTimbreSnapshot(raw: unknown): RootFollowCarrierTimbreSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<RootFollowCarrierTimbreSnapshot>;
  if (parsed.schemaVersion !== 'carrier-integral-timbre-v1') return null;
  const oscillators: RootFollowCarrierTimbreSnapshot['oscillators'] = [];
  if (Array.isArray(parsed.oscillators)) {
    for (const osc of parsed.oscillators) {
      if (!osc || typeof osc !== 'object') continue;
      const candidate = osc as Partial<RootFollowCarrierTimbreSnapshot['oscillators'][number]>;
      const type: OscillatorType = candidate.type === 'sine' || candidate.type === 'square' || candidate.type === 'sawtooth' || candidate.type === 'triangle'
        ? candidate.type
        : 'sine';
      const gain = clampFiniteNumber(candidate.gain, 0.1, 0, 1);
      if (gain <= 0.0001) continue;
      oscillators.push({
        type,
        gain,
        freqMul: clampFiniteNumber(candidate.freqMul, 1, 0.125, 8),
        detune: clampFiniteNumber(candidate.detune, 0, -1200, 1200),
      });
      if (oscillators.length >= 6) break;
    }
  }
  const filterType: BiquadFilterType = parsed.filterType === 'lowpass' || parsed.filterType === 'highpass' || parsed.filterType === 'bandpass'
    ? parsed.filterType
    : 'bandpass';
  return {
    schemaVersion: 'carrier-integral-timbre-v1',
    presetId: typeof parsed.presetId === 'string' ? parsed.presetId : 'neutral-body',
    paramsHash: typeof parsed.paramsHash === 'string' ? parsed.paramsHash : 'unknown',
    oscillators,
    filterType,
    filterFrequency: clampFiniteNumber(parsed.filterFrequency, 1650, 160, 7200),
    filterQ: clampFiniteNumber(parsed.filterQ, 0.9, 0.1, 8),
    attackScale: clampFiniteNumber(parsed.attackScale, 0.08, 0.005, 0.6),
    releaseScale: clampFiniteNumber(parsed.releaseScale, 0.42, 0.04, 1.4),
    transientGain: clampFiniteNumber(parsed.transientGain, 0.1, 0, 0.45),
    panSpread: clampFiniteNumber(parsed.panSpread, 0.14, 0, 0.65),
    drive: clampFiniteNumber(parsed.drive, 0.18, 0, 1),
    outputGain: clampFiniteNumber(parsed.outputGain, 0.82, 0.18, 1),
  };
}

function normalizeRootFollowSynthPatchSnapshot(raw: unknown): RootFollowSynthPatchSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<RootFollowSynthPatchSnapshot>;
  return {
    compositionPresetId: typeof parsed.compositionPresetId === 'string' ? parsed.compositionPresetId : 'jazz',
    baseHz: Math.max(1, clampFiniteNumber(parsed.baseHz, 220, 1)),
    tuning: typeof parsed.tuning === 'string' ? parsed.tuning : '12edo',
    repetitionModel: typeof parsed.repetitionModel === 'string' ? parsed.repetitionModel : 'octave',
    trackPatches: Array.isArray(parsed.trackPatches)
      ? parsed.trackPatches.map(normalizeSynthPatchTrackSnapshot).filter((entry): entry is RootFollowSynthPatchTrackSnapshot => Boolean(entry))
      : [],
    carrierIntegralTimbre: normalizeRootFollowCarrierTimbreSnapshot(parsed.carrierIntegralTimbre ?? null),
  };
}


function normalizeNumberCurve(value: unknown, lengthHint = 64, min = -Infinity, max = Infinity): number[] {
  const source = Array.isArray(value) ? value : ArrayBuffer.isView(value) ? Array.from(value as unknown as ArrayLike<number>) : [];
  const out = source
    .map((entry) => clampFiniteNumber(entry, 0, min, max))
    .filter((entry) => Number.isFinite(entry));
  if (out.length) return out.slice(0, 512);
  return new Array(Math.max(2, Math.min(512, Math.round(lengthHint || 64)))).fill(0);
}

function normalizeRootFollowFormantBandPlan(raw: unknown, lengthHint: number): RootFollowFormantBandPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<RootFollowFormantBandPlan>;
  const role: RootFollowFormantBandRole = parsed.role === 'body-band' || parsed.role === 'surface-band' || parsed.role === 'residual-band' || parsed.role === 'transient-dust'
    ? parsed.role
    : 'core-line';
  const id = typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id : `root-follow-formant-band-${role}`;
  return {
    id,
    role,
    centerRatioCurve: normalizeNumberCurve(parsed.centerRatioCurve, lengthHint, 0.03125, 96),
    bandwidthRatioCurve: normalizeNumberCurve(parsed.bandwidthRatioCurve, lengthHint, 0.001, 16),
    gainCurve: normalizeNumberCurve(parsed.gainCurve, lengthHint, 0, 1),
    confidenceCurve: Array.isArray(parsed.confidenceCurve) || ArrayBuffer.isView(parsed.confidenceCurve as unknown as ArrayBufferView)
      ? normalizeNumberCurve(parsed.confidenceCurve, lengthHint, 0, 1)
      : undefined,
    roughnessCurve: Array.isArray(parsed.roughnessCurve) || ArrayBuffer.isView(parsed.roughnessCurve as unknown as ArrayBufferView)
      ? normalizeNumberCurve(parsed.roughnessCurve, lengthHint, 0, 1)
      : undefined,
  };
}

function normalizeRootFollowFormantWindowPlan(raw: unknown): RootFollowFormantWindowPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<RootFollowFormantWindowPlan> & { summary?: Partial<RootFollowFormantWindowPlan['summary']> };
  if (parsed.schemaVersion !== 'root-follow-formant-window-plan-v1') return null;
  const curveResolution = Math.max(2, Math.min(512, Math.round(clampFiniteNumber(parsed.curveResolution, 64, 2, 512))));
  const maxBands = Math.max(1, Math.min(32, Math.round(clampFiniteNumber(parsed.maxBands, 8, 1, 32))));
  const bands = Array.isArray(parsed.bands)
    ? parsed.bands.map((band) => normalizeRootFollowFormantBandPlan(band, curveResolution)).filter((band): band is RootFollowFormantBandPlan => Boolean(band)).slice(0, maxBands)
    : [];
  const summary: Partial<RootFollowFormantWindowPlan['summary']> = parsed.summary ?? {};
  return {
    schemaVersion: 'root-follow-formant-window-plan-v1',
    sourceMachineId: typeof parsed.sourceMachineId === 'string' ? parsed.sourceMachineId : 'unknown-formant-machine',
    sourceSchemaVersion: typeof parsed.sourceSchemaVersion === 'string' ? parsed.sourceSchemaVersion : 'unknown-source-schema',
    curveResolution,
    maxBands,
    rootReferenceHz: clampFiniteNumber(parsed.rootReferenceHz, 110, 1, 48000),
    durationBeats: clampFiniteNumber(parsed.durationBeats, 4, 0.0625, 512),
    bands,
    roughnessCurve: normalizeNumberCurve(parsed.roughnessCurve, curveResolution, 0, 1),
    transientDustCurve: normalizeNumberCurve(parsed.transientDustCurve, curveResolution, 0, 1),
    residualEnergyCurve: normalizeNumberCurve(parsed.residualEnergyCurve, curveResolution, 0, 1),
    summary: {
      inputEnergy: clampFiniteNumber(summary.inputEnergy, 0, 0),
      retainedLineEnergy: clampFiniteNumber(summary.retainedLineEnergy, 0, 0),
      textureEnergy: clampFiniteNumber(summary.textureEnergy, 0, 0),
      transientEnergy: clampFiniteNumber(summary.transientEnergy, 0, 0),
      rawMaxSliceGain: clampFiniteNumber(summary.rawMaxSliceGain, 0, 0),
      maxSliceGain: clampFiniteNumber(summary.maxSliceGain, 0, 0),
      safeGainCeiling: clampFiniteNumber(summary.safeGainCeiling, 0.86, 0, 4),
      gainCeilingScaleCount: Math.round(clampFiniteNumber(summary.gainCeilingScaleCount, 0, 0)),
      bandCount: Math.round(clampFiniteNumber(summary.bandCount, bands.length, 0)),
      curveResolution: Math.round(clampFiniteNumber(summary.curveResolution, curveResolution, 2, 512)),
      estimatedAutomationCurves: Math.round(clampFiniteNumber(summary.estimatedAutomationCurves, bands.length * 3 + 3, 0)),
      emptySliceCount: Math.round(clampFiniteNumber(summary.emptySliceCount, 0, 0)),
      opposingTrackPairCount: Math.round(clampFiniteNumber(summary.opposingTrackPairCount, 0, 0)),
      maxResidualSlice: clampFiniteNumber(summary.maxResidualSlice, 0, 0),
      maxRoughnessSlice: clampFiniteNumber(summary.maxRoughnessSlice, 0, 0),
      maxTransientDustSlice: clampFiniteNumber(summary.maxTransientDustSlice, 0, 0),
    },
  };
}

export function normalizeRootFollowBankEntryConfig(raw: unknown): RootFollowBankEntryConfig {
  const parsed = raw && typeof raw === 'object' ? raw as Partial<RootFollowBankEntryConfig> & Record<string, unknown> : {};
  const sourceKind = parsed.sourceKind === 'synth' ? 'synth' : 'material';
  const renderMode = parsed.renderMode === 'grainy'
    ? 'grainy'
    : parsed.renderMode === 'direct'
      ? 'direct'
      : 'flowing';
  const synthPattern = normalizeRootFollowSynthPatternSnapshot(parsed.synthPattern ?? null);
  const synthPatch = normalizeRootFollowSynthPatchSnapshot(parsed.synthPatch ?? null);
  const formantWindowPlan = normalizeRootFollowFormantWindowPlan(parsed.formantWindowPlan ?? null);
  return {
    sourceKind,
    renderMode: sourceKind === 'synth' ? 'direct' : (renderMode === 'direct' ? 'flowing' : renderMode),
    anchorGridStep: Number.isFinite(parsed.anchorGridStep ?? NaN) ? Math.round(Number(parsed.anchorGridStep)) : null,
    synthPattern: sourceKind === 'synth' ? synthPattern : null,
    synthPatch: sourceKind === 'synth' ? synthPatch : null,
    formantWindowPlan,
  };
}

export function rootFollowBankEntryConfigEquals(a: RootFollowBankEntryConfig, b: RootFollowBankEntryConfig) {
  return JSON.stringify(normalizeRootFollowBankEntryConfig(a)) === JSON.stringify(normalizeRootFollowBankEntryConfig(b));
}

export function createEmptyRootFollowBankRecord(): RootFollowBankRecord {
  return {
    schemaVersion: DEFAULT_ROOT_FOLLOW_BANK_SCHEMA_VERSION,
    memberIds: [],
    orderedIds: [],
    aliases: {},
    entryConfigs: {},
  };
}
