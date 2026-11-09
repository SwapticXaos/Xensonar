import type { CanonicalDrumVoiceId, CanonicalLoopComposerState, CanonicalLoopNoteEvent, CanonicalLoopTrack } from './sessionTypes';
import { createDrumMachine } from '../../resonance/drumMachine';
import { mergeDrumLaneKitOverrides, resolveDrumLaneKit } from '../../xensonar/groove/drumKitRouting';
import { resolveDrumLaneSettings, type DrumLaneSettingsMap } from '../../xensonar/groove/drumLaneSettings';
import { buildVisibleDrumPatternMatrix } from '../../xensonar/drumPatternMachine';
import { createDrumProgram, forEachDrumProgramEvent } from './drumProgram';
import { resolveSamplePlaybackProfile } from '@/features/soundLibrary/samplePlaybackProfile';
import {
  type PreviewRequest,
  type NodeRegistrar,
  type SchedulingContext,
  type SamplePlaybackDef,
  type InstrumentVoiceDef,
} from './canonicalPreviewContracts';
import {
  loadSamplePlaybackMap,
  resolveEffectiveInstrumentPresetId,
  resolveInstrumentDef,
} from './canonicalPreviewVoices';
import {
  noteChannelIndex,
  noteDurationUnits,
  noteFadeInUnits,
  noteFadeOutUnits,
  noteStartUnit,
  previewComposerDurationSec,
  previewDrumDurationSec,
  previewTotalDurationSec,
  ratioFrequency,
  totalComposerSteps,
} from './canonicalPreviewTiming';
import {
  describeMaterialElasticPitch,
  scheduleDynamicFieldGainAutomation,
  scheduleLocalFieldElasticPitchSlice,
  scheduleMaterialElasticSlice,
} from './canonicalPreviewMaterialElastic';
import { ensureLocalFieldState, getLocalFieldTargetState, localFieldPitchSemitoneOffset, resolveLocalFieldCurve } from './localField';
import { isMaterialImportBody, isMaterialImportFragment } from './loopImportExportContracts';
import {
  beginLoopPreviewToken,
  createLoopBufferSource,
  getActiveLoopPreviewState,
  getAudibleLoopPreviewContextTime,
  getLoopPreviewContext,
  isLoopPreviewTokenCurrent,
  registerLoopPreviewNode,
  setActiveLoopPreviewState,
  setLoopPreviewPlayheadFrame,
  stopLoopComposerPreview,
  type ActiveLoopPreviewState,
} from './loopPreviewSession';

export {
  hasSeekableLoopComposerPreview,
  seekLoopComposerPreviewToStep,
  stopLoopComposerPreview,
} from './loopPreviewSession';

export { LOOP_TRACK_INSTRUMENTS } from './canonicalPreviewVoices';
export type { LoopTrackInstrumentPreset } from './canonicalPreviewContracts';
export { describeMaterialElasticPitch } from './canonicalPreviewMaterialElastic';

const DRUM_VOICE_TO_MACHINE: Record<CanonicalDrumVoiceId, 'kick' | 'snare' | 'hat_closed' | 'hat_open' | 'clap' | 'perc'> = {
  kick: 'kick',
  snare: 'snare',
  hatClosed: 'hat_closed',
  hatOpen: 'hat_open',
  clap: 'clap',
  perc: 'perc',
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sampleCurveValue(curve: ArrayLike<number>, ratio: number) {
  const count = curve.length;
  if (!count) return 0;
  const safeRatio = clamp(ratio, 0, 1);
  const position = safeRatio * Math.max(0, count - 1);
  const left = Math.floor(position);
  const right = Math.min(count - 1, left + 1);
  const frac = position - left;
  const leftValue = Number(curve[left] ?? 0);
  const rightValue = Number(curve[right] ?? leftValue);
  return leftValue + (rightValue - leftValue) * frac;
}

function buildPitchFieldSemitoneCurve(fields: ReturnType<typeof ensureLocalFieldState>[], sampleCount = 96) {
  const resolved = fields.map((field) => ({ field, curve: resolveLocalFieldCurve(field, Math.max(32, sampleCount)).resolved }));
  const mapped = new Float32Array(Math.max(32, sampleCount));
  for (let index = 0; index < mapped.length; index += 1) {
    const progress = mapped.length <= 1 ? 0 : index / Math.max(1, mapped.length - 1);
    let semitoneOffset = 0;
    resolved.forEach(({ curve }) => {
      semitoneOffset += localFieldPitchSemitoneOffset(sampleCurveValue(curve, progress));
    });
    mapped[index] = semitoneOffset;
  }
  return mapped;
}

function applySynthPitchFieldAutomation(args: {
  param: AudioParam;
  noteStart: number;
  noteEnd: number;
  oscStart: number;
  oscStop: number;
  baseFrequency: number;
  semitoneCurve: Float32Array;
}) {
  const { param, noteStart, noteEnd, oscStart, oscStop, baseFrequency, semitoneCurve } = args;
  const curveEnd = Math.max(oscStart + 0.01, Math.min(noteEnd, oscStop));
  const duration = curveEnd - oscStart;
  if (duration <= 0.01 || semitoneCurve.length < 2) {
    param.setValueAtTime(baseFrequency, oscStart);
    return;
  }
  const noteDuration = Math.max(0.0001, noteEnd - noteStart);
  const startRatio = clamp((oscStart - noteStart) / noteDuration, 0, 1);
  const endRatio = clamp((curveEnd - noteStart) / noteDuration, startRatio, 1);
  const sampleCount = Math.max(24, Math.ceil(duration * 180));
  const frequencyCurve = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const localRatio = sampleCount <= 1 ? 0 : index / Math.max(1, sampleCount - 1);
    const progress = startRatio + (endRatio - startRatio) * localRatio;
    const semitoneOffset = sampleCurveValue(semitoneCurve, progress);
    frequencyCurve[index] = Math.max(20, Math.min(12000, baseFrequency * Math.pow(2, semitoneOffset / 12)));
  }
  param.setValueAtTime(frequencyCurve[0] ?? baseFrequency, oscStart);
  param.setValueCurveAtTime(frequencyCurve, oscStart, duration);
  param.setValueAtTime(frequencyCurve[frequencyCurve.length - 1] ?? baseFrequency, curveEnd);
}

function resolveCarrierIntegralTimbreVoice(note: CanonicalLoopNoteEvent): InstrumentVoiceDef | null {
  const timbre = (note as { carrierIntegralTimbre?: unknown }).carrierIntegralTimbre as {
    schemaVersion?: string;
    oscillators?: Array<{ type?: OscillatorType; gain?: number; freqMul?: number; detune?: number }>;
    filterType?: BiquadFilterType;
    filterFrequency?: number;
    filterQ?: number;
    attackScale?: number;
    releaseScale?: number;
    transientGain?: number;
    panSpread?: number;
    outputGain?: number;
  } | null | undefined;
  if (!timbre || timbre.schemaVersion !== 'carrier-integral-timbre-v1' || !Array.isArray(timbre.oscillators) || timbre.oscillators.length === 0) return null;
  // CarrierIntegralTimbreSnapshot oscillators are already normalized by the synth-lab snapshot builder.
  // Do not multiply outputGain a second time here; Root-Follow uses the baked oscillator gains too.
  const oscillators = timbre.oscillators
    .map((osc) => ({
      type: osc.type === 'sine' || osc.type === 'triangle' || osc.type === 'sawtooth' || osc.type === 'square' ? osc.type : 'sine',
      gain: Math.max(0, Math.min(1.2, Number.isFinite(osc.gain ?? NaN) ? Number(osc.gain) : 0)),
      freqMul: Math.max(0.125, Math.min(8, Number.isFinite(osc.freqMul ?? NaN) ? Number(osc.freqMul) : 1)),
      detune: Math.max(-1200, Math.min(1200, Number.isFinite(osc.detune ?? NaN) ? Number(osc.detune) : 0)),
    }))
    .filter((osc) => osc.gain > 0.0001);
  if (oscillators.length === 0) return null;
  return {
    oscillators,
    filterType: timbre.filterType ?? 'lowpass',
    filterFrequency: Math.max(80, Math.min(12000, Number.isFinite(timbre.filterFrequency ?? NaN) ? Number(timbre.filterFrequency) : 1800)),
    filterQ: Math.max(0.05, Math.min(20, Number.isFinite(timbre.filterQ ?? NaN) ? Number(timbre.filterQ) : 0.7)),
    attackScale: Math.max(0.002, Math.min(0.8, Number.isFinite(timbre.attackScale ?? NaN) ? Number(timbre.attackScale) : 0.04)),
    releaseScale: Math.max(0.01, Math.min(1.8, Number.isFinite(timbre.releaseScale ?? NaN) ? Number(timbre.releaseScale) : 0.22)),
    transientGain: Math.max(0, Math.min(1.5, Number.isFinite(timbre.transientGain ?? NaN) ? Number(timbre.transientGain) : 0.08)),
    panSpread: Math.max(0, Math.min(1, Number.isFinite(timbre.panSpread ?? NaN) ? Number(timbre.panSpread) : 0.12)),
  };
}



function buildCarrierFieldVoicePitchCurve(args: {
  clipPitchCurve: Float32Array | null;
  voiceLocalField: ReturnType<typeof ensureLocalFieldState> | null | undefined;
  voiceStart: number;
  voiceDur: number;
  noteStart: number;
  nominalDur: number;
}) {
  const { clipPitchCurve, voiceLocalField, voiceStart, voiceDur, noteStart, nominalDur } = args;
  const voiceField = voiceLocalField ? getLocalFieldTargetState(ensureLocalFieldState(voiceLocalField), 'pitch-elastic') : null;
  const voicePitchCurve = voiceField && voiceField.enabled && !voiceField.bypassed
    ? buildPitchFieldSemitoneCurve([voiceField], 128)
    : null;
  if ((!clipPitchCurve || clipPitchCurve.length < 2) && (!voicePitchCurve || voicePitchCurve.length < 2)) return null;
  const sampleCount = 128;
  const combined = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const localRatio = sampleCount <= 1 ? 0 : index / Math.max(1, sampleCount - 1);
    const absoluteRatio = clamp(((voiceStart - noteStart) + voiceDur * localRatio) / Math.max(0.0001, nominalDur), 0, 1);
    const clipOffset = clipPitchCurve && clipPitchCurve.length > 1 ? sampleCurveValue(clipPitchCurve, absoluteRatio) : 0;
    const voiceOffset = voicePitchCurve && voicePitchCurve.length > 1 ? sampleCurveValue(voicePitchCurve, localRatio) : 0;
    combined[index] = clipOffset + voiceOffset;
  }
  return combined;
}

function scheduleCarrierIntegralFieldClip(args: {
  ctx: SchedulingContext;
  destination: GainNode;
  note: CanonicalLoopNoteEvent;
  preset: InstrumentVoiceDef;
  baseFrequency: number;
  noteStart: number;
  nominalDur: number;
  fadeOut: number;
  trackVolume: number;
  liveSynthPitchCurve: Float32Array | null;
  registerNode: NodeRegistrar;
}) {
  const { ctx, destination, note, preset, baseFrequency, noteStart, nominalDur, fadeOut, trackVolume, liveSynthPitchCurve, registerNode } = args;
  const field = note.carrierIntegralField;
  if (!field || field.schemaVersion !== 'carrier-integral-field-v1' || !Array.isArray(field.voices) || field.voices.length === 0) return false;
  const releaseScale = preset.releaseScale ?? 0.12;
  const attackScale = preset.attackScale ?? 0.02;
  const transientGain = preset.transientGain ?? 0.08;
  const totalStop = noteStart + nominalDur + fadeOut + 0.04;
  const maxVoices = Math.max(1, Math.min(192, field.voices.length));
  field.voices.slice(0, maxVoices).forEach((voice, voiceIndex) => {
    const voiceStart = noteStart + Math.max(0, Math.min(1, voice.startRatio)) * nominalDur;
    const voiceDur = Math.max(0.018, Math.min(Math.max(0.02, nominalDur), Math.max(0.001, voice.durationRatio) * nominalDur));
    const voiceGain = ctx.createGain();
    const voiceDynamicGain = ctx.createGain();
    const sourceTrackVolume = Math.max(0, Math.min(1.5, Number.isFinite(voice.trackVolume ?? NaN) ? Number(voice.trackVolume) : 0.75));
    const clipGlobalVolume = Math.max(0.05, Math.min(1.5, trackVolume));
    // Root-Follow parity: one voice gain formula, not outer note-gain multiplied by another inner gain.
    const peak = Math.max(0.0001, Math.min(1.4, (voice.velocity ?? 0.75) * sourceTrackVolume * clipGlobalVolume * 0.42));
    const attack = Math.min(voiceDur * 0.48, Math.max(0.002, voiceDur * attackScale));
    const release = Math.min(voiceDur * 0.68, Math.max(0.006, voiceDur * releaseScale));
    voiceGain.gain.setValueAtTime(0.0001, voiceStart);
    voiceGain.gain.linearRampToValueAtTime(peak, voiceStart + attack);
    voiceGain.gain.setValueAtTime(peak, Math.max(voiceStart + attack, voiceStart + voiceDur * 0.78));
    voiceGain.gain.linearRampToValueAtTime(0.0001, Math.min(totalStop, voiceStart + voiceDur + release));
    voiceDynamicGain.gain.setValueAtTime(1, voiceStart);
    scheduleDynamicFieldGainAutomation(voiceDynamicGain, [voice.localField ?? null], voiceStart, voiceDur, Math.min(totalStop, voiceStart + voiceDur + release));
    voiceDynamicGain.connect(voiceGain);
    voiceGain.connect(destination);
    registerNode?.(voiceGain);
    registerNode?.(voiceDynamicGain);

    const voicePitchCurve = buildCarrierFieldVoicePitchCurve({
      clipPitchCurve: liveSynthPitchCurve,
      voiceLocalField: voice.localField ?? null,
      voiceStart,
      voiceDur,
      noteStart,
      nominalDur,
    });

    preset.oscillators.forEach((oscDef, oscIndex) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const partialStart = voiceStart + Math.max(0, oscDef.startOffsetSec ?? 0);
      const partialEnd = Math.min(totalStop, Math.max(partialStart + 0.02, voiceStart + voiceDur * Math.max(0.16, oscDef.durationMul ?? 1) + release + 0.02));
      const relativeSemitones = Number.isFinite(voice.relativeSemitones ?? NaN) ? Number(voice.relativeSemitones) : 0;
      const oscillatorBaseFrequency = Math.max(20, Math.min(12000, baseFrequency * Math.pow(2, relativeSemitones / 12) * Math.max(0.125, oscDef.freqMul ?? 1)));
      osc.type = oscDef.type;
      if (voicePitchCurve) {
        applySynthPitchFieldAutomation({
          param: osc.frequency,
          noteStart: voiceStart,
          noteEnd: voiceStart + voiceDur,
          oscStart: partialStart,
          oscStop: partialEnd,
          baseFrequency: oscillatorBaseFrequency,
          semitoneCurve: voicePitchCurve,
        });
      } else {
        osc.frequency.setValueAtTime(oscillatorBaseFrequency, partialStart);
      }
      if (oscDef.detune) osc.detune.setValueAtTime(oscDef.detune, partialStart);
      oscGain.gain.setValueAtTime(Math.max(0.0001, oscDef.gain * (1 + transientGain)), partialStart);
      oscGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, oscDef.gain), partialStart + Math.max(0.01, voiceDur * 0.25));
      osc.connect(oscGain);
      oscGain.connect(voiceDynamicGain);
      osc.start(partialStart);
      osc.stop(partialEnd);
      registerNode?.(osc);
      registerNode?.(oscGain);
      void voiceIndex;
      void oscIndex;
    });
  });
  return true;
}

function buildPreviewDrumStyle(args: { laneId: CanonicalDrumVoiceId; value: number; laneSettings?: DrumLaneSettingsMap | null }) {
  const laneSettings = resolveDrumLaneSettings({ laneId: args.laneId, laneSettings: args.laneSettings });
  return {
    swing: 0.24,
    edge: args.laneId === 'hatClosed' || args.laneId === 'hatOpen' ? 0.58 : 0.46,
    snap: args.value >= 0.95 ? 0.68 : 0.52,
    air: args.laneId === 'hatOpen' || args.laneId === 'clap' ? 0.54 : 0.36,
    softness: args.laneId === 'kick' ? 0.42 : 0.5,
    pan: laneSettings.pan,
    decayScale: laneSettings.decay,
    chokeGroup: laneSettings.chokeGroup,
  };
}

function scheduleNote(
  ctx: SchedulingContext,
  master: GainNode,
  state: CanonicalLoopComposerState,
  note: CanonicalLoopNoteEvent,
  track: CanonicalLoopTrack,
  loopStartSec: number,
  stepDurationSec: number,
  samplePlaybackMap: Map<string, SamplePlaybackDef>,
  registerNode: NodeRegistrar = null,
) {
  const resolvedInstrument = resolveInstrumentDef(resolveEffectiveInstrumentPresetId(track, note), samplePlaybackMap);
  const carrierTimbreVoice = resolvedInstrument.kind === 'synth' ? resolveCarrierIntegralTimbreVoice(note) : null;
  const preset = resolvedInstrument.kind === 'synth' ? (carrierTimbreVoice ?? resolvedInstrument.voice) : null;
  const startUnit = noteStartUnit(state, note);
  const durationUnits = noteDurationUnits(state, note);
  const noteStart = loopStartSec + startUnit * stepDurationSec;
  const nominalDur = Math.max(0.04, durationUnits * stepDurationSec);
  const attackScale = preset?.attackScale ?? 0.02;
  const releaseScale = preset?.releaseScale ?? 0.12;
  const transientGain = preset?.transientGain ?? 0.08;
  const panSpread = preset?.panSpread ?? 0.12;
  const isMaterialLoopBody = isMaterialImportBody(note);
  const isMaterialFragment = isMaterialImportFragment(note);
  const minimumCutHealInSec = isMaterialLoopBody ? 0.0035 : 0.002;
  const minimumCutHealOutSec = isMaterialLoopBody ? 0.0055 : 0.006;
  const fadeIn = Math.min(nominalDur * 0.8, Math.max(minimumCutHealInSec, noteFadeInUnits(note) * stepDurationSec || nominalDur * attackScale));
  const fadeOut = Math.min(nominalDur * 0.8, Math.max(minimumCutHealOutSec, noteFadeOutUnits(note) * stepDurationSec || nominalDur * releaseScale));
  const noteEnd = noteStart + nominalDur + fadeOut + 0.02;
  const freq = Math.max(20, Math.min(12000, ratioFrequency(state, note, resolvedInstrument)));
  const voiceGain = ctx.createGain();
  const dynamicFieldGain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  const pan = Math.max(-1, Math.min(1, (startUnit / Math.max(1, totalComposerSteps(state) - 1) - 0.5) * panSpread * 2 + (track.pan ?? 0)));
  panner.pan.setValueAtTime(pan, noteStart);
  dynamicFieldGain.gain.setValueAtTime(1, noteStart);
  dynamicFieldGain.connect(voiceGain);

  let postVoiceDestination: AudioNode = voiceGain;
  if (preset?.filterType) {
    const filter = ctx.createBiquadFilter();
    filter.type = preset.filterType;
    filter.frequency.setValueAtTime(preset.filterFrequency ?? 1200, noteStart);
    filter.Q.setValueAtTime(preset.filterQ ?? 0.7, noteStart);
    voiceGain.connect(filter);
    postVoiceDestination = filter;
    registerNode?.(filter);
  }

  const isCarrierIntegralFieldClip = !!note.carrierIntegralField && note.carrierIntegralField.schemaVersion === 'carrier-integral-field-v1';
  const peak = isCarrierIntegralFieldClip ? 1 : Math.max(0.001, note.velocity * track.volume * 0.45);
  voiceGain.gain.setValueAtTime(0.0001, noteStart);
  voiceGain.gain.linearRampToValueAtTime(peak, noteStart + fadeIn);
  voiceGain.gain.setValueAtTime(peak, noteStart + nominalDur * 0.82);
  voiceGain.gain.linearRampToValueAtTime(0.0001, noteStart + nominalDur + fadeOut);
  scheduleDynamicFieldGainAutomation(
    dynamicFieldGain,
    [resolvedInstrument.kind === 'sample' ? resolvedInstrument.volumeEnvelope : null, note.localField ? ensureLocalFieldState(note.localField) : null],
    noteStart,
    nominalDur,
    noteEnd,
  );

  postVoiceDestination.connect(panner);
  panner.connect(master);
  registerNode?.(voiceGain);
  registerNode?.(dynamicFieldGain);
  registerNode?.(panner);

  const liveSynthPitchFields = resolvedInstrument.kind === 'synth'
    ? [note.localField ? getLocalFieldTargetState(ensureLocalFieldState(note.localField), 'pitch-elastic') : null]
      .filter((field): field is NonNullable<typeof field> => !!field && field.enabled && !field.bypassed)
    : [];
  const liveSynthPitchCurve = liveSynthPitchFields.length > 0 ? buildPitchFieldSemitoneCurve(liveSynthPitchFields, 96) : null;

  if (resolvedInstrument.kind === 'sample') {
    const playbackProfile = resolveSamplePlaybackProfile({
      loaded: resolvedInstrument,
      targetHz: freq,
      minRate: 0.125,
      maxRate: 8,
      fallbackHz: state.baseHz ?? 220,
      requestedDurationSec: nominalDur,
    });
    const safeOffsetSec = Math.max(0, Number.isFinite((note as { sampleOffsetSec?: number }).sampleOffsetSec) ? Number((note as { sampleOffsetSec: number }).sampleOffsetSec) : 0);
    const requestedSliceDurationSec = Number.isFinite((note as { samplePlaybackDurationSec?: number }).samplePlaybackDurationSec)
      ? Math.max(0.005, Number((note as { samplePlaybackDurationSec: number }).samplePlaybackDurationSec))
      : null;
    const bufferRemainingSec = Math.max(0.005, resolvedInstrument.buffer.duration - safeOffsetSec);
    const naturalSliceDurationSec = requestedSliceDurationSec != null
      ? Math.max(0.005, Math.min(bufferRemainingSec, requestedSliceDurationSec))
      : Math.max(0.005, bufferRemainingSec);
    const materialPitchMode = (note as { materialPitchMode?: string }).materialPitchMode;
    const materialSourceFixed = materialPitchMode === 'source-fixed';
    const materialSourceGranular = materialPitchMode === 'source-granular';
    const materialAnchorHz = materialSourceFixed
      ? freq
      : Number.isFinite((note as { anchorHz?: number }).anchorHz)
        ? Math.max(1, Number((note as { anchorHz: number }).anchorHz))
        : (resolvedInstrument.baseHz ?? freq);
    const materialRatePolicy = isMaterialLoopBody && !materialSourceFixed ? 'open-musical' as const : 'bounded' as const;
    const elasticPitch = describeMaterialElasticPitch({ targetHz: freq, anchorHz: materialAnchorHz, ratePolicy: materialRatePolicy });
    const pitchFields = [resolvedInstrument.pitchEnvelope, note.localField ? getLocalFieldTargetState(ensureLocalFieldState(note.localField), 'pitch-elastic') : null]
      .filter((field): field is NonNullable<typeof field> => !!field && field.enabled && !field.bypassed);
    const pitchFieldActive = pitchFields.length > 0;
    const pitchDistanceFromAnchorCents = isMaterialLoopBody && !materialSourceFixed
      ? Math.abs(1200 * Math.log2(Math.max(0.0001, freq / Math.max(0.0001, materialAnchorHz))))
      : 0;
    const pitchMovedAwayFromAnchor = pitchDistanceFromAnchorCents > 6;
    const rawMaterialAnchorPosition = isMaterialLoopBody && !materialSourceFixed && pitchDistanceFromAnchorCents <= 6;
    const durationDeviationTolerance = isMaterialFragment
      ? Math.max(0.024, naturalSliceDurationSec * 0.08)
      : Math.max(0.018, naturalSliceDurationSec * 0.05);
    const durationDeviatesFromSlice = isMaterialLoopBody
      ? Math.abs(nominalDur - naturalSliceDurationSec) > durationDeviationTolerance
      : false;
    const shouldUseElasticMaterial = isMaterialLoopBody
      && naturalSliceDurationSec > 0.005
      && !rawMaterialAnchorPosition
      && (materialSourceGranular || pitchMovedAwayFromAnchor || durationDeviatesFromSlice);
    if (pitchFieldActive) {
      scheduleLocalFieldElasticPitchSlice({
        ctx,
        destination: dynamicFieldGain,
        buffer: resolvedInstrument.buffer,
        noteStart,
        noteEnd,
        nominalDur,
        safeOffsetSec,
        sliceDurationSec: naturalSliceDurationSec,
        basePlaybackRate: materialSourceFixed ? 1 : shouldUseElasticMaterial ? elasticPitch.elasticRate : playbackProfile.playbackRate,
        fields: pitchFields,
        quality: isMaterialFragment ? 'fragment' : 'base',
        registerNode,
        ratePolicy: materialRatePolicy,
      });
      return;
    }
    if (shouldUseElasticMaterial) {
      scheduleMaterialElasticSlice({
        ctx,
        destination: dynamicFieldGain,
        buffer: resolvedInstrument.buffer,
        noteStart,
        noteEnd,
        nominalDur,
        safeOffsetSec,
        sliceDurationSec: naturalSliceDurationSec,
        playbackRate: materialSourceFixed ? 1 : elasticPitch.elasticRate,
        quality: isMaterialFragment ? 'fragment' : 'base',
        registerNode,
        ratePolicy: materialRatePolicy,
      });
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = resolvedInstrument.buffer;
    const shouldLoopSlice = requestedSliceDurationSec == null
      ? (nominalDur > Math.max(0.08, playbackProfile.naturalDurationSec * 0.95) || playbackProfile.shouldLoop)
      : false;
    const directPlaybackRate = rawMaterialAnchorPosition ? 1 : playbackProfile.playbackRate;
    source.playbackRate.setValueAtTime(directPlaybackRate, noteStart);
    source.loop = shouldLoopSlice;
    if (shouldLoopSlice) {
      source.loopStart = safeOffsetSec;
      source.loopEnd = Math.min(resolvedInstrument.buffer.duration, safeOffsetSec + naturalSliceDurationSec);
    }
    source.connect(dynamicFieldGain);
    if (requestedSliceDurationSec != null) {
      const renderedSliceDurationSec = Math.min(bufferRemainingSec, naturalSliceDurationSec / Math.max(directPlaybackRate, 0.0001));
      source.start(noteStart, safeOffsetSec, renderedSliceDurationSec);
    } else {
      source.start(noteStart, safeOffsetSec);
    }
    source.stop(noteEnd);
    registerNode?.(source);
    return;
  }

  if (!preset) return;

  if (scheduleCarrierIntegralFieldClip({
    ctx,
    destination: dynamicFieldGain,
    note,
    preset,
    baseFrequency: freq,
    noteStart,
    nominalDur,
    fadeOut,
    trackVolume: track.volume,
    liveSynthPitchCurve,
    registerNode,
  })) {
    return;
  }

  preset.oscillators.forEach((oscDef) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const partialStart = noteStart + Math.max(0, oscDef.startOffsetSec ?? 0);
    const partialEnd = Math.max(partialStart + 0.02, noteStart + nominalDur * Math.max(0.16, oscDef.durationMul ?? 1) + fadeOut + 0.02);
    const oscillatorBaseFrequency = Math.max(20, Math.min(12000, freq * Math.max(0.125, oscDef.freqMul ?? 1)));
    osc.type = oscDef.type;
    if (liveSynthPitchCurve) {
      applySynthPitchFieldAutomation({
        param: osc.frequency,
        noteStart,
        noteEnd: noteStart + nominalDur,
        oscStart: partialStart,
        oscStop: partialEnd,
        baseFrequency: oscillatorBaseFrequency,
        semitoneCurve: liveSynthPitchCurve,
      });
    } else {
      osc.frequency.setValueAtTime(oscillatorBaseFrequency, partialStart);
    }
    if (oscDef.detune) osc.detune.setValueAtTime(oscDef.detune, partialStart);
    oscGain.gain.setValueAtTime(Math.max(0.0001, oscDef.gain * (1 + transientGain)), partialStart);
    oscGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, oscDef.gain), partialStart + Math.max(0.01, nominalDur * 0.25));
    osc.connect(oscGain);
    oscGain.connect(dynamicFieldGain);
    osc.start(partialStart);
    osc.stop(partialEnd);
    registerNode?.(osc);
    registerNode?.(oscGain);
  });
}

function schedulePresetDrumPattern(
  ctx: SchedulingContext,
  master: GainNode,
  request: PreviewRequest,
  loopStartSec: number,
  totalDurationSec: number,
) {
  if (!request.drumPattern || !request.drumKit) return;
  const matrix = buildVisibleDrumPatternMatrix({
    pattern: request.drumPattern,
    bars: Math.max(1, request.bars),
    segmentsPerBar: request.drumSegmentsPerBar ?? 16,
    segmentMarkers: request.drumSegmentMarkers,
  });
  scheduleCustomDrumPattern(ctx, master, {
    ...request,
    customDrumPattern: {
      useCustom: true,
      presetSource: request.drumPattern,
      bars: matrix.bars,
      segmentsPerBar: matrix.segmentsPerBar,
      segmentMarkers: [...matrix.segmentMarkers],
      stepCount: matrix.stepCount,
      laneOrder: [...matrix.laneOrder],
      laneSteps: Object.fromEntries(matrix.laneOrder.map((laneId) => [laneId, [...(((matrix as any).laneSteps ?? {})[laneId] ?? [])]])) as any,
    },
  }, loopStartSec, totalDurationSec);
}

function scheduleCustomDrumPattern(
  ctx: SchedulingContext,
  master: GainNode,
  request: PreviewRequest,
  loopStartSec: number,
  totalDurationSec: number,
) {
  const drumKit = request.drumKit;
  if (!request.customDrumPattern || !drumKit) return;
  const machine = createDrumMachine(ctx as unknown as AudioContext, master);
  const drumProgram = createDrumProgram({
    presetSource: request.customDrumPattern.presetSource,
    globalKit: request.drumKit ?? 'synthetic-kit',
    bars: request.customDrumPattern.bars || request.bars,
    segmentsPerBar: request.customDrumPattern.segmentsPerBar,
    segmentMarkers: request.customDrumPattern.segmentMarkers ?? [],
    stepCount: request.customDrumPattern.stepCount,
    laneOrder: request.customDrumPattern.laneOrder,
    laneSteps: request.customDrumPattern.laneSteps as any,
    laneKitOverrides: mergeDrumLaneKitOverrides(request.drumLaneKitOverrides, undefined),
    laneSettings: request.drumLaneSettings,
    stepPrograms: request.customDrumPattern.stepPrograms,
  });
  forEachDrumProgramEvent(drumProgram, (event) => {
    const time = loopStartSec + event.startRatio * totalDurationSec;
    const baseGain = (request.drumLevel ?? 0.84) * event.laneSettings.level * (event.value >= 0.95 ? 1.0 : event.value >= 0.8 ? 0.84 : 0.62);
    const layers = event.layers.length ? event.layers : [{ id: 'primary', active: true, levelScale: 1, decayScale: 1, panOffset: 0, gradient: 0 }];
    layers.forEach((layer) => {
      if (!layer.active) return;
      const style = buildPreviewDrumStyle({ laneId: event.laneId, value: event.value, laneSettings: request.drumLaneSettings });
      machine.trigger(
        DRUM_VOICE_TO_MACHINE[event.laneId],
        time,
        baseGain * layer.levelScale,
        layer.kit ?? event.kit ?? resolveDrumLaneKit({ laneId: event.laneId, globalKit: drumKit, overrides: drumProgram.laneKitOverrides }),
        {
          ...style,
          pan: Math.max(-1, Math.min(1, style.pan + layer.panOffset)),
          decayScale: style.decayScale * layer.decayScale,
          snap: Math.max(0, Math.min(1, style.snap + layer.gradient * 0.08)),
          air: Math.max(0, Math.min(1, style.air + Math.max(0, layer.gradient) * 0.06)),
          edge: Math.max(0, Math.min(1, style.edge + Math.max(0, -layer.gradient) * 0.06)),
        },
      );
    });
  });
}

function scheduleDrumPattern(
  ctx: SchedulingContext,
  master: GainNode,
  request: PreviewRequest,
  loopStartSec: number,
  totalDurationSec: number,
) {
  if (request.customDrumPattern?.useCustom) {
    scheduleCustomDrumPattern(ctx, master, request, loopStartSec, totalDurationSec);
    return;
  }
  schedulePresetDrumPattern(ctx, master, request, loopStartSec, totalDurationSec);
}

function encodeAudioBufferToWav(buffer: AudioBuffer) {
  const channels = Math.max(1, buffer.numberOfChannels || 1);
  const frameCount = Math.max(1, buffer.length || 1);
  const sampleRate = buffer.sampleRate || 44100;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const wav = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wav);
  const writeAscii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let i = 0; i < frameCount; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel]?.[i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([wav], { type: 'audio/wav' });
}

export async function renderLoopComposerToAudioBuffer(request: PreviewRequest, options?: { sampleRate?: number; tailSec?: number }) {
  const sampleRate = Math.max(22050, Math.min(96000, options?.sampleRate ?? 44100));
  const totalSteps = totalComposerSteps(request.composer);
  const composerDurationSec = previewComposerDurationSec(request);
  const drumDurationSec = previewDrumDurationSec(request);
  const totalDurationSec = previewTotalDurationSec(request);
  const stepDurationSec = composerDurationSec / totalSteps;
  const lengthSec = totalDurationSec + Math.max(0.02, options?.tailSec ?? 0.18);
  const ctx = new OfflineAudioContext(2, Math.ceil(lengthSec * sampleRate), sampleRate);
  const samplePlaybackMap = await loadSamplePlaybackMap(request, ctx);
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.85, 0);
  master.connect(ctx.destination);

  const notes = request.noteId
    ? request.composer.notes.filter((note) => note.id === request.noteId)
    : request.composer.notes.filter((note) => request.trackIds.includes(note.trackId));

  notes.forEach((note) => {
    const track = request.composer.tracks.find((entry) => entry.id === note.trackId);
    const pitchStep = request.composer.pitchSteps[noteChannelIndex(request.composer, note)] ?? request.composer.pitchSteps[0];
    if (!track || !track.enabled || !pitchStep || pitchStep.muted) return;
    scheduleNote(ctx, master, request.composer, note, track, 0, stepDurationSec, samplePlaybackMap, null);
  });
  scheduleDrumPattern(ctx, master, request, 0, drumDurationSec || totalDurationSec);
  return await ctx.startRendering();
}

export async function renderLoopComposerToWavBlob(request: PreviewRequest, options?: { sampleRate?: number; tailSec?: number }) {
  const buffer = await renderLoopComposerToAudioBuffer(request, options);
  return encodeAudioBufferToWav(buffer);
}

export async function startLoopComposerPreview(request: PreviewRequest) {
  stopLoopComposerPreview();
  const ctx = getLoopPreviewContext();
  if (ctx.state === 'suspended') await ctx.resume();
  const token = beginLoopPreviewToken();
  const totalSteps = totalComposerSteps(request.composer);
  const composerDurationSec = previewComposerDurationSec(request);
  const drumDurationSec = previewDrumDurationSec(request);
  const totalDurationSec = previewTotalDurationSec(request);
  const stepDurationSec = composerDurationSec / totalSteps;
  const computeStartLeadSec = () => {
    const outputLatency = Number.isFinite((ctx as AudioContext & { outputLatency?: number }).outputLatency)
      ? Math.max(0, (ctx as AudioContext & { outputLatency?: number }).outputLatency as number)
      : 0;
    const baseLatency = Number.isFinite(ctx.baseLatency) ? Math.max(0, ctx.baseLatency) : 0;
    return Math.max(0.018, Math.min(0.05, baseLatency + outputLatency * 0.35 + 0.006));
  };
  const notes = request.noteId
    ? request.composer.notes.filter((note) => note.id === request.noteId)
    : request.composer.notes.filter((note) => request.trackIds.includes(note.trackId));
  const playheadCallback = request.onComposerPlayhead ?? request.onPlayhead;

  if (request.loop && !request.noteId) {
    const renderedBuffer = await renderLoopComposerToAudioBuffer(request, { tailSec: 0.02 });
    if (!isLoopPreviewTokenCurrent(token)) return;
    const startTime = ctx.currentTime + computeStartLeadSec();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, startTime);
    master.gain.linearRampToValueAtTime(0.82, startTime + 0.02);
    master.connect(ctx.destination);
    registerLoopPreviewNode(master);
    const loopState: ActiveLoopPreviewState = {
      token,
      ctx,
      source: null as unknown as AudioBufferSourceNode,
      master,
      renderedBuffer,
      totalDurationSec,
      totalSteps,
      stepDurationSec,
      startTime,
      loopOffsetSec: 0,
      playheadCallback,
      globalPlayheadCallback: request.onGlobalPlayheadRatio,
    };
    loopState.source = createLoopBufferSource(ctx, loopState, 0, startTime);
    setActiveLoopPreviewState(loopState);
    playheadCallback?.(0);
    request.onGlobalPlayheadRatio?.(0);

    const updateLoopPlayhead = () => {
      const state = getActiveLoopPreviewState();
      if (!state || state.token !== token) return;
      const now = getAudibleLoopPreviewContextTime(state.ctx);
      const rel = Math.max(0, now - state.startTime);
      const cycleRel = state.totalDurationSec > 0 ? (state.loopOffsetSec + rel) % state.totalDurationSec : 0;
      state.playheadCallback?.(Math.min(state.totalSteps, cycleRel / state.stepDurationSec));
      state.globalPlayheadCallback?.(Math.max(0, Math.min(1, cycleRel / Math.max(0.001, state.totalDurationSec))));
      if (typeof requestAnimationFrame !== 'undefined') {
        setLoopPreviewPlayheadFrame(requestAnimationFrame(updateLoopPlayhead));
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      setLoopPreviewPlayheadFrame(requestAnimationFrame(updateLoopPlayhead));
    }
    return;
  }

  const samplePlaybackMap = await loadSamplePlaybackMap(request, ctx);
  if (!isLoopPreviewTokenCurrent(token)) return;
  const startTime = ctx.currentTime + computeStartLeadSec();
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, startTime);
  master.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
  master.connect(ctx.destination);
  registerLoopPreviewNode(master);

  const firstSelectedNote = request.noteId ? notes[0] as CanonicalLoopNoteEvent | undefined : undefined;
  const selectedNoteStartOffsetSec = firstSelectedNote
    ? noteStartUnit(request.composer, firstSelectedNote) * stepDurationSec
    : 0;
  const noteLoopStartSec = request.noteId
    ? startTime - selectedNoteStartOffsetSec
    : startTime;

  notes.forEach((note) => {
    const track = request.composer.tracks.find((entry) => entry.id === note.trackId);
    const pitchStep = request.composer.pitchSteps[noteChannelIndex(request.composer, note)] ?? request.composer.pitchSteps[0];
    if (!track || !track.enabled || !pitchStep || pitchStep.muted) return;
    scheduleNote(ctx, master, request.composer, note, track, noteLoopStartSec, stepDurationSec, samplePlaybackMap, (node) => registerLoopPreviewNode(node));
  });
  if (!request.noteId) {
    scheduleDrumPattern(ctx, master, request, startTime, drumDurationSec || totalDurationSec);
  }

  const previewDuration = firstSelectedNote
    ? Math.max(0.45, Math.min(2.4, noteDurationUnits(request.composer, firstSelectedNote) * stepDurationSec + (noteFadeOutUnits(firstSelectedNote) * stepDurationSec)))
    : totalDurationSec;
  const endTime = startTime + previewDuration;

  playheadCallback?.(firstSelectedNote ? noteStartUnit(request.composer, firstSelectedNote) : 0);
  request.onGlobalPlayheadRatio?.(0);
  const updatePlayhead = () => {
    if (!isLoopPreviewTokenCurrent(token)) return;
    const now = getAudibleLoopPreviewContextTime(ctx);
    if (now >= endTime) {
      playheadCallback?.(null);
      request.onGlobalPlayheadRatio?.(null);
      request.onEnded?.();
      stopLoopComposerPreview();
      return;
    }
    const rel = Math.max(0, now - startTime);
    const composerUnit = firstSelectedNote
      ? noteStartUnit(request.composer, firstSelectedNote) + rel / stepDurationSec
      : Math.min(totalSteps, rel / stepDurationSec);
    playheadCallback?.(composerUnit);
    request.onGlobalPlayheadRatio?.(Math.max(0, Math.min(1, rel / Math.max(0.001, totalDurationSec))));
    if (typeof requestAnimationFrame !== 'undefined') {
      setLoopPreviewPlayheadFrame(requestAnimationFrame(updatePlayhead));
    }
  };
  if (typeof requestAnimationFrame !== 'undefined') {
    setLoopPreviewPlayheadFrame(requestAnimationFrame(updatePlayhead));
  }
}
