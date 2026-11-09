/**
 * Locks platformerAudio API shape and teardown behavior (STRUCTURE opt #48).
 * createPlatformerAudioApi powers JumpRunSoundtrackRoom; teardown must clear refs.
 */

import { describe, expect, it } from "vitest";
import type { MutableRefObject } from "react";
import { createPlatformerAudioApi, platformerPitchToFreq, type MusicState } from "../platformerAudio";
import type { Coin } from "../platformerState";
import {
  createPlatformerNpcOrb,
  getPlatformerModeShiftSemis,
  getPlatformerNpcOrbSemi,
  getPlatformerTriadSemis,
} from "../platformerNpcMusic";

function createMusicRef(overrides: Partial<MusicState> = {}): MutableRefObject<MusicState> {
  const state: MusicState = {
    ctx: null,
    master: null,
    filter: null,
    phrase: [],
    nextComposerAt: 0,
    composerStep: 0,
    lastFootAt: 0,
    completionPhrase: [],
    nextCompletionAt: 0,
    completionStep: 0,
    completionLoopArmed: false,
    completionTheme: null,
    completionIntroPattern: null,
    nextCompletionIntroAt: 0,
    completionIntroStep: 0,
    completionIntroComplete: false,
    nextMotionSampleAt: 0,
    motionSampleIndex: 0,
    lastMovementTime: 0,
    lastMotionDir: 0,
    eventOrdinal: 0,
    movementEvents: [],
    completionPattern: null,
    completionArrangement: null,
    completionCyclePattern: null,
    completionCycleKey: "",
    ...overrides,
  };
  return { current: state };
}

describe("platformerAudio createPlatformerAudioApi", () => {
  it("platformerPitchToFreq maps 12edo / ji / bp modes", () => {
    expect(platformerPitchToFreq(220, 12, "12edo")).toBeCloseTo(440, 5);
    expect(platformerPitchToFreq(220, 7, "19edo")).not.toBeCloseTo(platformerPitchToFreq(220, 7, "12edo"), 5);
    expect(platformerPitchToFreq(220, 7, "22edo")).not.toBeCloseTo(platformerPitchToFreq(220, 7, "12edo"), 5);
    expect(platformerPitchToFreq(220, 7, "ji")).toBeCloseTo(330, 5); // pure 3/2
    expect(platformerPitchToFreq(220, 13, "bp")).toBeCloseTo(660, 5); // tritave 3/1
  });

  it("returns API with all required methods", () => {
    const musicRef = createMusicRef();
    const api = createPlatformerAudioApi({
      musicRef,
      masterVolume: 0.5,
    });

    expect(api).toMatchObject({
      playVoice: expect.any(Function),
      pushPhrase: expect.any(Function),
      getCompositionSummary: expect.any(Function),
      getComposerPreview: expect.any(Function),
      auditionPreviewSection: expect.any(Function),
      auditionPreviewForm: expect.any(Function),
      resetCompositionCapture: expect.any(Function),
      captureMovementFrame: expect.any(Function),
      playJumpCue: expect.any(Function),
      playLandCue: expect.any(Function),
      playStepCue: expect.any(Function),
      playCoinCue: expect.any(Function),
      playNpcOrbCue: expect.any(Function),
      playPuzzleStepCue: expect.any(Function),
      playGateUnlockCue: expect.any(Function),
      playCheckpointChord: expect.any(Function),
      playFallCue: expect.any(Function),
      captureComposerObstacleHit: expect.any(Function),
      armCompletionLoop: expect.any(Function),
      scheduleCompletionLoop: expect.any(Function),
      ensureAudio: expect.any(Function),
      teardown: expect.any(Function),
    });
  });

  it("pushPhrase appends to phrase and trims to 24", () => {
    const musicRef = createMusicRef({ phrase: [] });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.pushPhrase(7);
    expect(musicRef.current.phrase).toEqual([7]);

    api.pushPhrase(0);
    expect(musicRef.current.phrase).toEqual([7, 0]);

    for (let i = 0; i < 25; i++) api.pushPhrase(i);
    expect(musicRef.current.phrase).toHaveLength(24);
    expect(musicRef.current.phrase[0]).toBe(1);
    expect(musicRef.current.phrase[23]).toBe(24);
  });

  it("teardown clears ctx, master, filter when not shared", () => {
    const musicRef = createMusicRef({
      ctx: { close: () => {} } as unknown as AudioContext,
      master: { disconnect: () => {} } as unknown as GainNode,
      filter: {} as BiquadFilterNode,
      phrase: [1, 2, 3],
    });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.teardown();

    expect(musicRef.current.ctx).toBeNull();
    expect(musicRef.current.master).toBeNull();
    expect(musicRef.current.filter).toBeNull();
    expect(musicRef.current.phrase).toEqual([1, 2, 3]);
  });

  it("teardown does not close shared audioCtx", () => {
    const sharedCtx = { close: () => {} } as unknown as AudioContext;
    const musicRef = createMusicRef({
      ctx: sharedCtx,
      master: { disconnect: () => {} } as unknown as GainNode,
      filter: {} as BiquadFilterNode,
    });
    const api = createPlatformerAudioApi({
      musicRef,
      masterVolume: 0.5,
      audioCtx: sharedCtx,
    });

    api.teardown();

    expect(musicRef.current.ctx).toBeNull();
    expect(musicRef.current.master).toBeNull();
    expect(musicRef.current.filter).toBeNull();
  });

  it("playVoice is no-op when ctx is null", () => {
    const musicRef = createMusicRef();
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    expect(() => api.playVoice(440, "sine", 0.1, 0.1)).not.toThrow();
  });

  it("armCompletionLoop snapshots current phrase and enables loop playback", () => {
    const musicRef = createMusicRef({ phrase: [2, 5, 9] });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.armCompletionLoop();

    expect(musicRef.current.completionLoopArmed).toBe(true);
    expect(musicRef.current.completionPhrase.slice(0, 3)).toEqual([2, 5, 9]);
    expect(musicRef.current.completionPhrase.length).toBeGreaterThanOrEqual(3);
    expect(musicRef.current.completionTheme).not.toBeNull();
    expect(musicRef.current.completionStep).toBe(0);
    expect(musicRef.current.nextCompletionAt).toBe(0);
  });

  it("armCompletionLoop derives movement motifs and primes finish intro state", () => {
    const musicRef = createMusicRef({
      phrase: [0, 3, 7, 10],
      movementEvents: [
        { kind: "step", semi: 2, energy: 0.7, t: 0.1, lane: 0, airborne: false },
        { kind: "jump", semi: 7, energy: 0.95, t: 0.2, lane: 2, airborne: true },
        { kind: "coin", semi: 12, energy: 0.9, t: 0.3, lane: 4, airborne: false },
        { kind: "land", semi: 0, energy: 0.6, t: 0.4, lane: 1, airborne: false },
      ],
    });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.armCompletionLoop();

    expect(musicRef.current.completionLoopArmed).toBe(true);
    expect(musicRef.current.completionTheme).not.toBeNull();
    expect(musicRef.current.completionTheme?.groundMotif.length).toBeGreaterThan(0);
    expect(musicRef.current.completionTheme?.airMotif.length).toBeGreaterThan(0);
    expect(musicRef.current.completionTheme?.accentMotif.length).toBeGreaterThan(0);
    expect(musicRef.current.completionTheme?.syncDensity).toBe(0);
    expect(musicRef.current.completionTheme?.phaseWeights[0]).toBeCloseTo(1 / 3, 4);
    expect(musicRef.current.completionTheme?.phaseWeights[1]).toBeCloseTo(1 / 3, 4);
    expect(musicRef.current.completionTheme?.phaseWeights[2]).toBeCloseTo(1 / 3, 4);
    expect(musicRef.current.completionTheme?.tuningBias).toBe(0);
    expect(musicRef.current.completionTheme?.forkBias).toBe(0);
    expect(musicRef.current.completionTheme?.restDensity).toBe(0);
    expect(musicRef.current.completionPhrase.length).toBeGreaterThan(4);
    expect(musicRef.current.completionIntroPattern).toBeNull();
    expect(musicRef.current.completionIntroStep).toBe(0);
    expect(musicRef.current.completionIntroComplete).toBe(false);
  });

  it("armCompletionLoop snapshots last-level memory for the next live run", () => {
    const musicRef = createMusicRef({
      phrase: [2, 5, 9, 12],
      movementEvents: [
        { kind: "step", semi: 2, energy: 0.72, t: 0.1, lane: 0, airborne: false },
        { kind: "jump", semi: 7, energy: 0.88, t: 0.2, lane: 2, airborne: true },
        { kind: "npc_orb", semi: 11, energy: 0.84, t: 0.3, lane: 4, airborne: true },
      ],
    });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.armCompletionLoop();

    expect(musicRef.current.lastLevelMemory).not.toBeNull();
    expect(musicRef.current.lastLevelMemory?.phrase.length).toBeGreaterThan(0);
    expect(musicRef.current.lastLevelMemory?.motif[0]).toBe(0);
    expect(musicRef.current.lastLevelMemory?.seed).toBeGreaterThan(0);
  });

  it("captureComposerObstacleHit records obstacle events and pushes phrase data", () => {
    const musicRef = createMusicRef({ phrase: [] });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.captureMovementFrame(200, 340, 280, -20, false, 1.1);
    api.captureComposerObstacleHit({ kind: "sync_gate", lane: 2, energy: 0.9, airborne: true, detail: 0.84 });
    api.captureComposerObstacleHit({ kind: "phase_gate", lane: 4, energy: 0.75, airborne: false, detail: 2 });
    api.captureComposerObstacleHit({ kind: "tuning_crystal", lane: 5, energy: 0.95, airborne: true, detail: -1 });
    api.captureComposerObstacleHit({ kind: "chord_fork", lane: 3, energy: 0.82, airborne: false, detail: 1 });
    api.captureComposerObstacleHit({ kind: "silence_field", lane: 1, energy: 0.7, airborne: false, detail: 0.72 });

    expect(musicRef.current.movementEvents.slice(-5)).toEqual([
      expect.objectContaining({ kind: "sync_gate", detail: 0.84 }),
      expect.objectContaining({ kind: "phase_gate", detail: 2 }),
      expect.objectContaining({ kind: "tuning_crystal", detail: -1 }),
      expect.objectContaining({ kind: "chord_fork", detail: 1 }),
      expect.objectContaining({ kind: "silence_field", detail: 0.72 }),
    ]);
    expect(musicRef.current.phrase.length).toBeGreaterThan(0);
  });

  it("maps collectible qualities and npc orbs into ordered melodic events", () => {
    const musicRef = createMusicRef({ phrase: [] });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });
    const redCoin: Coin = {
      id: 0,
      x: 720,
      y: 300,
      taken: false,
      spin: 0,
      kind: "coin_red",
    };
    const mushroom: Coin = {
      id: 1,
      x: 840,
      y: 300,
      taken: false,
      spin: 0,
      kind: "mushroom",
    };
    const orb = createPlatformerNpcOrb({
      id: "npc-camel",
      animal: "camel",
      label: "Camel",
      scaleId: "maqam_hijaz",
      throwStyle: "arc",
      color: "#f59e0b",
      x: 900,
      y: 260,
      lane: 3,
      lastThrowAt: 0,
      throwInterval: 1.1,
      phase: 0,
      orbCursor: 2,
      throwDirection: 1,
      rootOffset: 0,
    }, 7);

    api.captureMovementFrame(200, 340, 280, -20, false, 1.1);
    api.playCoinCue(redCoin, 0);
    api.playNpcOrbCue(orb, 0);
    api.playCoinCue(mushroom, 0, 1);

    expect(musicRef.current.movementEvents.map((event) => event.kind)).toEqual([
      "motion",
      "coin",
      "coin",
      "coin",
      "npc_orb",
      "mode_shift",
      "mode_shift",
      "mode_shift",
    ]);
    expect(musicRef.current.movementEvents.slice(1).map((event) => event.semi)).toEqual([
      ...getPlatformerTriadSemis("coin_red", Math.floor((redCoin.x / 4300) * 7) % 7, 0),
      getPlatformerNpcOrbSemi(orb, 0),
      ...getPlatformerModeShiftSemis(Math.floor((mushroom.x / 4300) * 7) % 7, 1),
    ]);
    expect(musicRef.current.movementEvents.slice(1).map((event) => event.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(musicRef.current.phrase.slice(-7)).toEqual(musicRef.current.movementEvents.slice(1).map((event) => event.semi));
  });

  it("records puzzle-step and gate-unlock events for arrangement playback", () => {
    const musicRef = createMusicRef({ phrase: [] });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.playPuzzleStepCue("major", 1, true);
    api.playPuzzleStepCue("minor", 2, false);
    api.playGateUnlockCue("Echo Gate");

    expect(musicRef.current.movementEvents.map((event) => event.kind)).toEqual([
      "puzzle_step",
      "gate_unlock",
    ]);
    expect(musicRef.current.phrase).toContain(19);
  });

  it("armCompletionLoop derives obstacle-aware theme metrics", () => {
    const musicRef = createMusicRef({
      phrase: [0, 3, 7, 10],
      movementEvents: [
        { kind: "sync_gate", semi: 10, energy: 0.92, t: 0.2, lane: 2, airborne: true, detail: 0.88 },
        { kind: "phase_gate", semi: 7, energy: 0.82, t: 0.4, lane: 3, airborne: false, detail: 2 },
        { kind: "tuning_crystal", semi: 14, energy: 0.9, t: 0.6, lane: 4, airborne: true, detail: -1 },
        { kind: "chord_fork", semi: 9, energy: 0.84, t: 0.7, lane: 5, airborne: false, detail: 1 },
        { kind: "silence_field", semi: 3, energy: 0.62, t: 0.75, lane: 2, airborne: false, detail: 0.8 },
        { kind: "step", semi: 2, energy: 0.7, t: 0.8, lane: 1, airborne: false },
      ],
    });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.armCompletionLoop();

    expect(musicRef.current.completionTheme?.syncDensity).toBeGreaterThan(0.3);
    expect(musicRef.current.completionTheme?.phaseWeights[2]).toBeGreaterThan(musicRef.current.completionTheme?.phaseWeights[0] ?? 0);
    expect(musicRef.current.completionTheme?.tuningBias).toBeLessThan(0);
    expect(musicRef.current.completionTheme?.forkBias).toBeGreaterThan(0.5);
    expect(musicRef.current.completionTheme?.restDensity).toBeGreaterThan(0.2);
  });

  it("scheduleCompletionLoop is a no-op when audio context is missing", () => {
    const musicRef = createMusicRef({ phrase: [0, 3, 7], completionLoopArmed: true });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    expect(() => api.scheduleCompletionLoop(120)).not.toThrow();
    expect(musicRef.current.completionStep).toBe(0);
    expect(musicRef.current.nextCompletionAt).toBe(0);
  });

  it("getCompositionSummary reports defaults before arrangement is built", () => {
    const musicRef = createMusicRef();
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    expect(api.getCompositionSummary()).toEqual({
      events: 0,
      form: "--",
      steps: 0,
      sections: 0,
      targetBpm: 0,
      complexity: 0,
      cycle: 0,
    });
  });

  it("getComposerPreview stays empty until movement DNA exists", () => {
    const musicRef = createMusicRef({ phrase: [0, 3, 7, 10] });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    expect(api.getComposerPreview(110)).toEqual({
      ready: false,
      events: 0,
      formLabel: "--",
      targetBpm: 0,
      complexity: 0,
      sectionBias: "auto",
      phaseFocus: "--",
      tuningTilt: 0,
      forkBias: 0,
      restDensity: 0,
      routeSignature: "--",
      routeMode: "balanced",
      routeBias: 0,
      routeTravel: 0,
      routeColor: "--",
      routeGroove: "--",
      routeLeadVoice: "--",
      motifLengths: {
        ground: 0,
        air: 0,
        accent: 0,
        cadence: 0,
        roots: 0,
      },
      timeline: [],
    });
  });

  it("getCompositionSummary returns arrangement tempo and complexity", () => {
    const musicRef = createMusicRef({
      movementEvents: [{ kind: "step", semi: 2, energy: 0.7, t: 0.1, lane: 0, airborne: false }],
      completionLoopArmed: true,
      completionArrangement: {
        sections: [],
        order: [0, 1, 2, 1],
        sectionLengthSteps: 64,
        formLabel: "ABCB",
        targetBpm: 132.6,
        complexity: 1.37,
        seed: 42,
        theme: {
          groundMotif: [0, 3, 7],
          airMotif: [12, 15, 19],
          accentMotif: [12, 19],
          cadenceMotif: [7, 10],
          rootContour: [0, 3, 5, 7],
          strideDensity: 0.5,
          airDensity: 0.4,
          accentDensity: 0.3,
          laneCenter: 0.5,
          syncDensity: 0.2,
          phaseWeights: [0.33, 0.34, 0.33],
          tuningBias: 0,
          forkBias: 0,
          restDensity: 0,
          routeProfile: {
            first: "unset",
            second: "unset",
            lowCount: 0,
            highCount: 0,
            signature: "--",
            mode: "balanced",
            branchBias: 0,
            splitMotion: 0,
          },
          routeOrchestration: {
            colorLabel: "CENTERLINE+",
            grooveLabel: "even shimmer",
            leadVoiceLabel: "triangle lead",
            leadWave: "triangle",
            answerWave: "sine",
            arpWave: "triangle",
            padWave: "sine",
            bassWave: "sine",
            ghostWave: "square",
            leadLift: 0,
            arpLift: 12,
            bassLift: -4,
            responseShift: 7,
            filterBias: 0,
            accentBias: 0.04,
            harmonicLift: 1,
            drumBias: 1,
            hatBias: 1,
            ghostBias: 1,
            tempoBias: 0,
          },
        },
      },
    });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    expect(api.getCompositionSummary()).toEqual({
      events: 1,
      form: "ABCB",
      steps: 64,
      sections: 0,
      targetBpm: 133,
      complexity: 1.37,
      cycle: 0,
    });
  });

  it("getComposerPreview derives live arrangement telemetry from movement and obstacle events", () => {
    const musicRef = createMusicRef({
      phrase: [0, 3, 7, 10],
      movementEvents: [
        { kind: "step", semi: 2, energy: 0.68, t: 0.1, lane: 1, airborne: false },
        { kind: "jump", semi: 9, energy: 0.92, t: 0.2, lane: 3, airborne: true },
        { kind: "sync_gate", semi: 11, energy: 0.94, t: 0.26, lane: 2, airborne: true, detail: 0.91 },
        { kind: "phase_gate", semi: 7, energy: 0.82, t: 0.36, lane: 4, airborne: false, detail: 2 },
        { kind: "tuning_crystal", semi: 14, energy: 0.88, t: 0.48, lane: 5, airborne: true, detail: -1 },
        { kind: "chord_fork", semi: 5, energy: 0.84, t: 0.61, lane: 2, airborne: false, detail: 1 },
        { kind: "silence_field", semi: 1, energy: 0.7, t: 0.76, lane: 0, airborne: false, detail: 0.82 },
      ],
    });
    const api = createPlatformerAudioApi({
      musicRef,
      masterVolume: 0.5,
      formMode: "abca",
      arrangementMode: "cinematic",
      evolutionDepth: 0.74,
      tempoFollow: 0.7,
      tuningMode: "ji",
    });

    const preview = api.getComposerPreview(118);

    expect(preview.ready).toBe(true);
    expect(preview.events).toBe(7);
    expect(preview.formLabel).toBe("ABCA");
    expect(preview.sectionBias).toBe("auto");
    expect(preview.targetBpm).toBeGreaterThan(90);
    expect(preview.complexity).toBeGreaterThan(0.8);
    expect(preview.phaseFocus).toBe("C");
    expect(preview.tuningTilt).toBeLessThan(0);
    expect(preview.forkBias).toBeGreaterThan(0.4);
    expect(preview.restDensity).toBeGreaterThan(0.15);
    expect(preview.routeColor).not.toBe("--");
    expect(preview.routeGroove).not.toBe("--");
    expect(preview.routeLeadVoice).not.toBe("--");
    expect(preview.motifLengths.ground).toBeGreaterThan(0);
    expect(preview.motifLengths.air).toBeGreaterThan(0);
    expect(preview.motifLengths.accent).toBeGreaterThan(0);
    expect(preview.motifLengths.cadence).toBeGreaterThan(0);
    expect(preview.motifLengths.roots).toBeGreaterThan(0);
    expect(preview.timeline).toHaveLength(4);
    expect(preview.timeline.map((slot) => slot.label)).toEqual(["A", "B", "C", "A"]);
    expect(preview.timeline.some((slot) => slot.restSteps > 0)).toBe(true);
  });

  it("getComposerPreview applies section bias to auto-form arrangement", () => {
    const movementEvents = [
      { kind: "step", semi: 2, energy: 0.72, t: 0.1, lane: 1, airborne: false },
      { kind: "jump", semi: 8, energy: 0.92, t: 0.2, lane: 2, airborne: true },
      { kind: "coin", semi: 12, energy: 0.82, t: 0.3, lane: 4, airborne: false },
      { kind: "land", semi: 3, energy: 0.66, t: 0.42, lane: 2, airborne: false },
      { kind: "turn", semi: 5, energy: 0.74, t: 0.52, lane: 3, airborne: false },
      { kind: "checkpoint", semi: 7, energy: 0.88, t: 0.68, lane: 5, airborne: false },
    ];

    const autoApi = createPlatformerAudioApi({
      musicRef: createMusicRef({
        phrase: [0, 3, 7, 10],
        movementEvents: [...movementEvents],
      }),
      masterVolume: 0.5,
      formMode: "auto",
    });
    const focusApi = createPlatformerAudioApi({
      musicRef: createMusicRef({
        phrase: [0, 3, 7, 10],
        movementEvents: [...movementEvents],
      }),
      masterVolume: 0.5,
      formMode: "auto",
      sectionBias: "C",
    });

    const autoPreview = autoApi.getComposerPreview(112);
    const focusPreview = focusApi.getComposerPreview(112);

    expect(focusPreview.sectionBias).toBe("C");
    expect(focusPreview.timeline.filter((slot) => slot.label === "C").length).toBeGreaterThanOrEqual(2);
    expect(focusPreview.formLabel).not.toBe(autoPreview.formLabel);
  });

  it("captureMovementFrame records motion events and updates phrase over time", () => {
    const musicRef = createMusicRef({ phrase: [] });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.captureMovementFrame(100, 420, 260, -40, true, 0);
    api.captureMovementFrame(120, 410, 280, -10, true, 0.04);
    api.captureMovementFrame(160, 360, 310, -120, false, 0.2);

    expect(musicRef.current.movementEvents.length).toBe(2);
    expect(musicRef.current.phrase.length).toBeGreaterThan(0);
    expect(musicRef.current.lastMovementTime).toBe(0.2);
  });

  it("resetCompositionCapture clears movement and loop data", () => {
    const musicRef = createMusicRef({
      movementEvents: [{ kind: "step", semi: 3, energy: 0.8, t: 0.2, lane: 1, airborne: false }],
      completionPhrase: [0, 5, 7],
      completionLoopArmed: true,
      completionStep: 5,
      nextCompletionAt: 9,
      completionPattern: {
        lengthSteps: 64,
        lead: Array.from({ length: 64 }, () => null),
        arp: Array.from({ length: 64 }, () => null),
        bass: Array.from({ length: 64 }, () => null),
        kick: Array.from({ length: 64 }, () => false),
        snare: Array.from({ length: 64 }, () => false),
        hat: Array.from({ length: 64 }, () => false),
        ghost: Array.from({ length: 64 }, () => false),
        accent: Array.from({ length: 64 }, () => 0.2),
        tension: Array.from({ length: 64 }, () => 0.3),
        barRoots: Array.from({ length: 8 }, () => 0),
        barChords: Array.from({ length: 8 }, () => [0, 7, 10]),
        swing: 0.03,
        density: 0.7,
        airRatio: 0.2,
      },
      completionArrangement: {
        sections: [],
        order: [0, 1],
        sectionLengthSteps: 64,
        formLabel: "AB",
        targetBpm: 120,
        complexity: 1.1,
        seed: 7,
        theme: {
          groundMotif: [0, 3, 7],
          airMotif: [12, 15, 19],
          accentMotif: [12, 19],
          cadenceMotif: [7, 10],
          rootContour: [0, 3, 5, 7],
          strideDensity: 0.5,
          airDensity: 0.4,
          accentDensity: 0.3,
          laneCenter: 0.5,
          syncDensity: 0.2,
          phaseWeights: [0.33, 0.34, 0.33],
          tuningBias: 0,
          forkBias: 0,
          restDensity: 0,
          routeProfile: {
            first: "unset",
            second: "unset",
            lowCount: 0,
            highCount: 0,
            signature: "--",
            mode: "balanced",
            branchBias: 0,
            splitMotion: 0,
          },
          routeOrchestration: {
            colorLabel: "CENTERLINE+",
            grooveLabel: "even shimmer",
            leadVoiceLabel: "triangle lead",
            leadWave: "triangle",
            answerWave: "sine",
            arpWave: "triangle",
            padWave: "sine",
            bassWave: "sine",
            ghostWave: "square",
            leadLift: 0,
            arpLift: 12,
            bassLift: -4,
            responseShift: 7,
            filterBias: 0,
            accentBias: 0.04,
            harmonicLift: 1,
            drumBias: 1,
            hatBias: 1,
            ghostBias: 1,
            tempoBias: 0,
          },
        },
      },
    });
    const api = createPlatformerAudioApi({ musicRef, masterVolume: 0.5 });

    api.resetCompositionCapture();

    expect(musicRef.current.movementEvents).toHaveLength(0);
    expect(musicRef.current.completionPhrase).toHaveLength(0);
    expect(musicRef.current.completionLoopArmed).toBe(false);
    expect(musicRef.current.completionTheme).toBeNull();
    expect(musicRef.current.completionIntroPattern).toBeNull();
    expect(musicRef.current.nextCompletionIntroAt).toBe(0);
    expect(musicRef.current.completionIntroStep).toBe(0);
    expect(musicRef.current.completionIntroComplete).toBe(false);
    expect(musicRef.current.completionStep).toBe(0);
    expect(musicRef.current.nextCompletionAt).toBe(0);
    expect(musicRef.current.completionPattern).toBeNull();
    expect(musicRef.current.completionArrangement).toBeNull();
    expect(musicRef.current.completionCyclePattern).toBeNull();
    expect(musicRef.current.completionCycleKey).toBe("");
  });
});
