/**
 * Platformer audio for Jump Run Soundtrack.
 * Extracted from JumpRunSoundtrackRoom to reduce room LOC and align with arena state/draw/audio pattern.
 * Owns WebAudio graph (filter, master gain), one-shot voices, and composer phrase state.
 */
import type { MutableRefObject } from "react";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { clamp } from "../../shared/tuning/grid";
import type { PlatformerPuzzleToken } from "./platformerAdventure";
import {
buildCompletionArrangement,
deriveMovementTheme,
type CompletionArrangement,
type CompletionIntroPattern,
type CompletionPattern,
type CompletionTheme,
type MovementEvent,
type MovementEventKind,
type PlatformerArrangementForm,
type PlatformerArrangementMode,
type PlatformerAuditionSection,
type PlatformerTuningMode
} from "./platformerArrangement";
import { createPlatformerAudioCues } from "./platformerAudioCues";
import { createPlatformerAuditionScheduler } from "./platformerAuditionScheduler";
import { createCompletionLoopRunner } from "./platformerCompletionLoopRunner";
import {
processMovementFrame as processCaptureFrame,
recordMovementEvent as recordCaptureEvent,
resetCompositionCapture as resetCapture
} from "./platformerComposerCapture";
import {
createPlatformerComposerPreview,
emptyPlatformerComposerPreview,
type PlatformerComposerPreview,
} from "./platformerComposerPreview";
import { buildPlatformerLevelMemory,type PlatformerLevelMemory } from "./platformerNpcMirror";
import type { PlatformerNpcNoteOrb } from "./platformerNpcMusic";
import type { PlatformerSectionBias } from "./platformerSectionBias";
import type { Coin,ComposerObstacleKind } from "./platformerState";
export { platformerPitchToFreq } from "./platformerArrangement";
export type {
MovementEvent,
MovementEventKind,
PlatformerArrangementForm,
PlatformerArrangementMode,
PlatformerAuditionSection,
PlatformerTuningMode
} from "./platformerArrangement";

export type PlatformerComposerObstacleHit = {
  kind: ComposerObstacleKind;
  lane: number;
  energy: number;
  airborne: boolean;
  detail?: number;
};

export type MusicState = {
  ctx: AudioContext | null;
  master: GainNode | null;
  filter: BiquadFilterNode | null;
  phrase: number[];
  nextComposerAt: number;
  composerStep: number;
  lastFootAt: number;
  completionPhrase: number[];
  nextCompletionAt: number;
  completionStep: number;
  completionLoopArmed: boolean;
  nextMotionSampleAt: number;
  motionSampleIndex: number;
  lastMovementTime: number;
  lastMotionDir: -1 | 0 | 1;
  eventOrdinal: number;
  movementEvents: MovementEvent[];
  completionPattern: CompletionPattern | null;
  completionArrangement: CompletionArrangement | null;
  completionTheme: CompletionTheme | null;
  completionIntroPattern: CompletionIntroPattern | null;
  nextCompletionIntroAt: number;
  completionIntroStep: number;
  completionIntroComplete: boolean;
  completionCyclePattern: CompletionPattern | null;
  completionCycleKey: string;
  lastLevelMemory?: PlatformerLevelMemory | null;
  lastLevelMemoryCapturedAt?: number;
};

export type PlatformerAudioApi = {
  playVoice: (freq: number, type: OscillatorType, volume: number, duration: number, when?: number, detuneCents?: number) => void;
  pushPhrase: (semi: number) => void;
  getCompositionSummary: () => {
    events: number;
    form: string;
    steps: number;
    sections: number;
    targetBpm: number;
    complexity: number;
    cycle: number;
  };
  getComposerPreview: (bpm: number) => PlatformerComposerPreview;
  auditionPreviewSection: (section: PlatformerAuditionSection, bpm: number) => boolean;
  auditionPreviewForm: (bpm: number) => boolean;
  resetCompositionCapture: () => void;
  captureMovementFrame: (x: number, y: number, vx: number, vy: number, onGround: boolean, simTime: number) => void;
  playJumpCue: () => void;
  playLandCue: (energy: number) => void;
  playStepCue: (x: number, speed: number) => void;
  playCoinCue: (coin: Coin, modeShift: number, nextModeShift?: number) => void;
  playNpcOrbCue: (orb: PlatformerNpcNoteOrb, modeShift: number) => void;
  playPuzzleStepCue: (target: PlatformerPuzzleToken, stepIndex: number, success: boolean) => void;
  playGateUnlockCue: (label: string) => void;
  playCheckpointChord: (milestone: number) => void;
  playFallCue: () => void;
  captureComposerObstacleHit: (hit: PlatformerComposerObstacleHit) => void;
  armCompletionLoop: () => void;
  scheduleCompletionLoop: (bpm: number) => void;
  ensureAudio: () => Promise<AudioContext | null>;
  teardown: () => void;
};
export type CreatePlatformerAudioOpts = {
  musicRef: MutableRefObject<MusicState>;
  masterVolume: number;
  tuningMode?: PlatformerTuningMode;
  arrangementMode?: PlatformerArrangementMode;
  formMode?: PlatformerArrangementForm;
  sectionBias?: PlatformerSectionBias;
  evolutionDepth?: number;
  tempoFollow?: number;
  /** Shared context from App (do not close on teardown). */
  audioCtx?: AudioContext | null;
  onEnableAudio?: EnsureAudio;
};
export function createPlatformerAudioApi(opts: CreatePlatformerAudioOpts): PlatformerAudioApi {
  const {
    musicRef,
    masterVolume,
    tuningMode = "12edo",
    arrangementMode = "balanced",
    formMode = "auto",
    sectionBias = "auto",
    evolutionDepth = 0.68,
    tempoFollow = 0.62,
    audioCtx: sharedCtx,
    onEnableAudio,
  } = opts;
  const arrangementEnergy = clamp(evolutionDepth, 0, 1);
  const tempoFollowAmount = clamp(tempoFollow, 0, 1);
  let previewCacheKey = "";
  let previewCache: PlatformerComposerPreview | null = null;
  const invalidatePreviewCache = () => {
    previewCacheKey = "";
    previewCache = null;
  };

  const playVoice = (
    freq: number,
    type: OscillatorType,
    volume: number,
    duration: number,
    when?: number,
    detuneCents = 0,
  ) => {
    const m = musicRef.current;
    if (!m.ctx || !m.filter) return;
    const ctx = m.ctx;
    const t0 = when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(clamp(freq, 35, 3200), t0);
    osc.detune.setValueAtTime(detuneCents, t0);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t0 + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, duration));
    osc.connect(env);
    env.connect(m.filter);
    osc.start(t0);
    osc.stop(t0 + Math.max(0.06, duration) + 0.04);
  };

  const pushPhrase = (semi: number) => {
    const phrase = musicRef.current.phrase;
    phrase.push(semi);
    if (phrase.length > 24) {
      phrase.splice(0, phrase.length - 24);
    }
    invalidatePreviewCache();
  };

  const getCompositionSummary = () => {
    const m = musicRef.current;
    const arrangement = m.completionArrangement;
    const complexity = arrangement ? arrangement.complexity : 0;
    const stepsPerSection = arrangement?.sectionLengthSteps ?? (m.completionPattern?.lengthSteps ?? 0);
    const cycle = stepsPerSection > 0 ? Math.floor(m.completionStep / stepsPerSection) : 0;
    return {
      events: m.movementEvents.length,
      form: arrangement?.formLabel ?? (m.completionLoopArmed ? "A" : "--"),
      steps: arrangement?.sectionLengthSteps ?? (m.completionPattern?.lengthSteps ?? 0),
      sections: arrangement?.sections.length ?? 0,
      targetBpm: Math.round(arrangement?.targetBpm ?? 0),
      complexity: Number(complexity.toFixed(2)),
      cycle,
    };
  };

  const getComposerPreview = (bpm: number): PlatformerComposerPreview => {
    const m = musicRef.current;
    if (m.movementEvents.length === 0) {
      previewCacheKey = "empty";
      previewCache = emptyPlatformerComposerPreview();
      return previewCache;
    }
    const melodic = m.movementEvents
      .filter((event) => event.kind !== "motion")
      .map((event) => event.semi);
    const fallbackPhrase = melodic.length > 0
      ? melodic.slice(-24)
      : (m.phrase.length > 0 ? [...m.phrase] : []);
    if (fallbackPhrase.length === 0) {
      previewCacheKey = "empty";
      previewCache = emptyPlatformerComposerPreview();
      return previewCache;
    }

    const controlBpm = clamp(bpm, 50, 200);
    const cacheKey = JSON.stringify({
      bpm: controlBpm,
      phrase: fallbackPhrase,
      events: m.movementEvents,
      mode: arrangementMode,
      form: formMode,
      sectionBias,
      evolution: Number(arrangementEnergy.toFixed(3)),
      tuning: tuningMode,
    });
    if (previewCache && previewCacheKey === cacheKey) {
      return previewCache;
    }

    const arrangement = buildCompletionArrangement(
      m.movementEvents,
      fallbackPhrase.length > 0 ? fallbackPhrase : [0, 3, 7, 10],
      60 / controlBpm / 2,
      arrangementMode,
      arrangementEnergy,
      formMode,
      sectionBias,
    );
    const preview = createPlatformerComposerPreview(arrangement, m.movementEvents.length, sectionBias);

    previewCacheKey = cacheKey;
    previewCache = preview;
    return preview;
  };

  const resetCompositionCapture = () => {
    resetCapture(musicRef.current);
    invalidatePreviewCache();
  };

  const recordMovementEvent = (
    kind: MovementEventKind,
    semi: number,
    energy: number,
    lane = 0,
    airborne = false,
    detail?: number,
  ) => {
    recordCaptureEvent(musicRef.current, kind, semi, energy, lane, airborne, detail);
    invalidatePreviewCache();
  };

  const captureMovementFrame = (x: number, y: number, vx: number, vy: number, onGround: boolean, simTime: number) => {
    processCaptureFrame(musicRef.current, x, y, vx, vy, onGround, simTime, pushPhrase);
    invalidatePreviewCache();
  };

  const audition = createPlatformerAuditionScheduler({
    musicRef,
    playVoice,
    arrangementMode,
    formMode,
    sectionBias,
    arrangementEnergy,
    tuningMode,
    tempoFollowAmount,
  });

  const cues = createPlatformerAudioCues({
    musicRef,
    playVoice,
    pushPhrase,
    recordMovementEvent,
    tuningMode,
  });

  const armCompletionLoop = () => {
    const m = musicRef.current;
    const melodic = m.movementEvents
      .filter((ev) => ev.kind !== "motion")
      .map((ev) => ev.semi);
    const sourcePhrase = melodic.length > 0
      ? melodic.slice(-24)
      : (m.phrase.length > 0 ? m.phrase : [0, 3, 7, 10]);
    const theme = deriveMovementTheme(m.movementEvents, sourcePhrase);
    const composedPhrase = [
      ...theme.groundMotif,
      ...theme.airMotif.slice(0, 4),
      ...theme.accentMotif,
      ...theme.cadenceMotif,
    ];
    m.completionTheme = theme;
    m.completionPhrase = composedPhrase.length > 0 ? composedPhrase.slice(-24) : [...sourcePhrase];
    m.lastLevelMemory = buildPlatformerLevelMemory(m.movementEvents, m.completionPhrase);
    m.lastLevelMemoryCapturedAt = m.lastLevelMemory ? Date.now() : undefined;
    m.completionPattern = null;
    m.completionArrangement = null;
    m.completionIntroPattern = null;
    m.nextCompletionIntroAt = 0;
    m.completionIntroStep = 0;
    m.completionIntroComplete = false;
    m.completionCyclePattern = null;
    m.completionCycleKey = "";
    m.nextCompletionAt = 0;
    m.completionStep = 0;
    m.completionLoopArmed = true;
  };

  const { scheduleCompletionLoop } = createCompletionLoopRunner({
    musicRef,
    playVoice,
    arrangementMode,
    formMode,
    sectionBias,
    arrangementEnergy,
    tempoFollowAmount,
    tuningMode,
  });

  const ensureAudio = async (): Promise<AudioContext | null> => {
    if (musicRef.current.ctx != null) {
      if (musicRef.current.ctx.state === "suspended") {
        await musicRef.current.ctx.resume();
      }
      return musicRef.current.ctx;
    }

    let ctx: AudioContext;
    const shared = sharedCtx ?? null;
    if (shared) {
      if (shared.state !== "running") await shared.resume();
      if (shared.state === "running") {
        ctx = shared;
      } else if (onEnableAudio) {
        const c = await onEnableAudio();
        ctx = c ?? new AudioContext();
      } else {
        ctx = new AudioContext();
      }
    } else if (onEnableAudio) {
      const c = await onEnableAudio();
      ctx = c ?? new AudioContext();
    } else {
      ctx = new AudioContext();
    }

    const filter = ctx.createBiquadFilter();
    const master = ctx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = 8200;
    filter.Q.value = 0.8;
    master.gain.value = masterVolume;
    filter.connect(master);
    master.connect(ctx.destination);
    musicRef.current.ctx = ctx;
    musicRef.current.master = master;
    musicRef.current.filter = filter;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx;
  };

  const teardown = () => {
    const m = musicRef.current;
    if (m.master) m.master.disconnect();
    if (m.ctx && m.ctx !== sharedCtx) m.ctx.close();
    m.ctx = null;
    m.master = null;
    m.filter = null;
    m.completionPattern = null;
    m.completionArrangement = null;
    m.completionTheme = null;
    m.completionIntroPattern = null;
    m.nextCompletionIntroAt = 0;
    m.completionIntroStep = 0;
    m.completionIntroComplete = false;
    m.completionCyclePattern = null;
    m.completionCycleKey = "";
    m.movementEvents = [];
    m.lastLevelMemory = null;
    m.lastLevelMemoryCapturedAt = undefined;
  };

  return {
    playVoice,
    pushPhrase,
    getCompositionSummary,
    getComposerPreview,
    auditionPreviewSection: audition.auditionPreviewSection,
    auditionPreviewForm: audition.auditionPreviewForm,
    resetCompositionCapture,
    captureMovementFrame,
    playJumpCue: cues.playJumpCue,
    playLandCue: cues.playLandCue,
    playStepCue: cues.playStepCue,
    playCoinCue: cues.playCoinCue,
    playNpcOrbCue: cues.playNpcOrbCue,
    playPuzzleStepCue: cues.playPuzzleStepCue,
    playGateUnlockCue: cues.playGateUnlockCue,
    playCheckpointChord: cues.playCheckpointChord,
    playFallCue: cues.playFallCue,
    captureComposerObstacleHit: cues.captureComposerObstacleHit,
    armCompletionLoop,
    scheduleCompletionLoop,
    ensureAudio,
    teardown,
  };
}
