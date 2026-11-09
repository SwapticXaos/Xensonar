import { describe, expect, it } from "vitest";
import { emptyPlatformerComposerPreview } from "../platformerComposerPreview";
import { tickPlatformer } from "../platformerTick";
import {
  PLAYER_H,
  PLAYER_W,
  VIEW_H,
  VIEW_W,
  createInitialState,
  createPlatforms,
} from "../platformerState";
import type { MusicState, PlatformerAudioApi } from "../platformerAudio";

const createMusicState = (): MusicState => ({
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
  nextMotionSampleAt: 0,
  motionSampleIndex: 0,
  lastMovementTime: 0,
  lastMotionDir: 0,
  eventOrdinal: 0,
  movementEvents: [],
  completionPattern: null,
  completionArrangement: null,
  completionTheme: null,
  completionIntroPattern: null,
  nextCompletionIntroAt: 0,
  completionIntroStep: 0,
  completionIntroComplete: false,
  completionCyclePattern: null,
  completionCycleKey: "",
});

const createApi = (
  calls: Array<Record<string, number | string | undefined>>,
): PlatformerAudioApi => ({
  playVoice: () => {},
  pushPhrase: () => {},
  getCompositionSummary: () => ({
    events: 0,
    form: "--",
    steps: 0,
    sections: 0,
    targetBpm: 0,
    complexity: 0,
    cycle: 0,
  }),
  getComposerPreview: () => emptyPlatformerComposerPreview(),
  auditionPreviewSection: () => false,
  auditionPreviewForm: () => false,
  resetCompositionCapture: () => {},
  captureMovementFrame: () => {},
  playJumpCue: () => {},
  playLandCue: () => {},
  playStepCue: () => {},
  playCoinCue: (coin, modeShift, nextModeShift) => {
    calls.push({
      source: coin.kind,
      modeShift,
      nextModeShift,
    });
  },
  playNpcOrbCue: (_orb, modeShift) => {
    calls.push({
      source: "npc_orb",
      modeShift,
    });
  },
  playPuzzleStepCue: (target, stepIndex, success) => {
    calls.push({
      source: success ? "puzzle_step" : "puzzle_fail",
      modeShift: stepIndex,
      nextModeShift: target.length,
    });
  },
  playGateUnlockCue: (label) => {
    calls.push({
      source: "gate_unlock",
      nextModeShift: label.length,
    });
  },
  playCheckpointChord: () => {},
  playFallCue: () => {},
  captureComposerObstacleHit: () => {},
  armCompletionLoop: () => {},
  scheduleCompletionLoop: () => {},
  ensureAudio: async () => null,
  teardown: () => {},
});

describe("platformerTick", () => {
  it("applies mushroom mode shifts before later pickups in the same tick", () => {
    const platforms = createPlatforms();
    const state = createInitialState([], [], platforms);
    const calls: Array<Record<string, number | string | undefined>> = [];
    const playerCenterX = 220;
    const playerCenterY = 210;

    state.player.x = playerCenterX - PLAYER_W * 0.5;
    state.player.y = playerCenterY - PLAYER_H * 0.45;
    state.coins = [
      { id: 0, x: playerCenterX, y: playerCenterY, taken: false, spin: 0, kind: "mushroom" },
      { id: 1, x: playerCenterX, y: playerCenterY, taken: false, spin: 0, kind: "coin_blue" },
    ];
    state.noteOrbs = [{
      id: 5,
      npcId: "npc-camel",
      animal: "camel",
      label: "Camel",
      scaleId: "maqam_hijaz",
      throwStyle: "arc",
      color: "#f59e0b",
      lane: 2,
      rootOffset: 0,
      noteIndex: 1,
      x: playerCenterX,
      y: playerCenterY,
      vx: 0,
      vy: 0,
      age: 0,
      life: 2,
      drift: 0,
    }];

    tickPlatformer(0, {
      simRef: { current: state },
      apiRef: { current: createApi(calls) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(calls).toEqual([
      { source: "mushroom", modeShift: 0, nextModeShift: 1 },
      { source: "coin_blue", modeShift: 1, nextModeShift: undefined },
      { source: "npc_orb", modeShift: 1 },
    ]);
    expect(state.modeShift).toBe(1);
    expect(state.coins.every((coin) => coin.taken)).toBe(true);
    expect(state.noteOrbs).toEqual([]);
  });

  it("spawns note orbs from visible npc anchors while the run is active", () => {
    const platforms = createPlatforms();
    const state = createInitialState([], [], platforms);
    const calls: Array<Record<string, number | string | undefined>> = [];
    const npc = state.musicNpcs[0];

    state.player.x = npc.x;
    state.player.y = npc.y;
    state.cameraX = Math.max(0, npc.x - VIEW_W * 0.35);
    state.musicNpcs[0] = {
      ...npc,
      lastThrowAt: -npc.throwInterval,
      orbCursor: 0,
    };

    tickPlatformer(0.16, {
      simRef: { current: state },
      apiRef: { current: createApi(calls) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(state.noteOrbs.length).toBe(1);
    expect(state.nextNpcOrbId).toBe(1);
    expect(state.musicNpcs[0].orbCursor).toBe(1);
    expect(calls).toEqual([]);
  });

  it("switches nearby NPCs into guide behavior when the player is stuck", () => {
    const platforms = createPlatforms();
    const state = createInitialState([], [], platforms);
    const calls: Array<Record<string, number | string | undefined>> = [];
    const panda = state.musicNpcs.find((npc) => npc.animal === "panda");

    expect(panda).toBeTruthy();
    state.coins = [];
    state.noteOrbs = [];
    state.musicNpcs = [{
      ...panda!,
      lastThrowAt: -panda!.throwInterval,
      orbCursor: 0,
    }];
    state.t = 8;
    state.lastProgressAt = 0;
    state.player.x = panda!.x;
    state.player.y = panda!.y;
    state.player.vx = 0;
    state.cameraX = Math.max(0, panda!.x - VIEW_W * 0.35);

    tickPlatformer(0.16, {
      simRef: { current: state },
      apiRef: { current: createApi(calls) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(state.musicNpcs[0].disposition).toBe("guide");
    expect(state.noteOrbs).toHaveLength(1);
    expect(state.noteOrbs[0].disposition).toBe("guide");
    expect(state.noteOrbs[0].tarotTitle).toBe("Star");
    expect((state.noteOrbs[0].pitchBias ?? 0)).toBe(7);
    expect(state.noteOrbs[0].loomActiveLabel).toBe("MEND");
    expect(state.noteOrbs[0].mirrorLabel).toBeTruthy();
  });

  it("lets guide fields widen collectible pickup range when the player is stuck", () => {
    const platforms = createPlatforms();
    const state = createInitialState([], [], platforms);
    const calls: Array<Record<string, number | string | undefined>> = [];
    const panda = state.musicNpcs.find((npc) => npc.animal === "panda");

    expect(panda).toBeTruthy();
    state.musicNpcs = [{ ...panda! }];
    state.noteOrbs = [];
    state.coins = [{
      id: 0,
      x: panda!.x + 26,
      y: panda!.y,
      taken: false,
      spin: 0,
      kind: "coin_red",
    }];
    state.t = 8;
    state.lastProgressAt = 0;
    state.player.x = panda!.x - PLAYER_W * 0.5;
    state.player.y = panda!.y - PLAYER_H * 0.45;
    state.player.vx = 0;
    state.cameraX = Math.max(0, panda!.x - VIEW_W * 0.35);

    tickPlatformer(0.05, {
      simRef: { current: state },
      apiRef: { current: createApi(calls) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(state.coins[0].taken).toBe(true);
    expect(calls.some((call) => call.source === "coin_red")).toBe(true);
  });

  it("bounces falling note orbs off platform tops without clipping through", () => {
    const platforms = createPlatforms();
    const plateau = platforms.find((platform) => platform.id === "plateau-1");
    const state = createInitialState([], [], platforms);

    expect(plateau).toBeTruthy();
    state.player.x = 40;
    state.player.y = 460;
    state.noteOrbs = [{
      id: 3,
      npcId: "npc-cat",
      animal: "cat",
      label: "Cat",
      scaleId: "major",
      throwStyle: "arc",
      color: "#fcd34d",
      lane: 1,
      rootOffset: 0,
      noteIndex: 0,
      x: plateau!.x + 44,
      y: plateau!.y - 11,
      vx: 0,
      vy: 90,
      age: 0,
      life: 2,
      drift: 0,
    }];

    tickPlatformer(0.08, {
      simRef: { current: state },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(state.noteOrbs).toHaveLength(1);
    expect(state.noteOrbs[0].y).toBeCloseTo(plateau!.y - 9, 4);
    expect(state.noteOrbs[0].vy).toBeLessThan(0);
  });

  it("relaunches fallen note orbs from their source npc instead of leaving them in gaps", () => {
    const platforms = createPlatforms();
    const state = createInitialState([], [], platforms);
    const sourceNpc = state.musicNpcs[0];

    state.player.x = sourceNpc.x + 240;
    state.player.y = sourceNpc.y + 120;
    state.noteOrbs = [{
      id: 9,
      npcId: sourceNpc.id,
      animal: sourceNpc.animal,
      label: sourceNpc.label,
      scaleId: sourceNpc.scaleId,
      throwStyle: sourceNpc.throwStyle,
      color: sourceNpc.color,
      lane: sourceNpc.lane,
      rootOffset: sourceNpc.rootOffset,
      noteIndex: 2,
      x: sourceNpc.x + 80,
      y: VIEW_H + 150,
      vx: 30,
      vy: 80,
      age: 0.6,
      life: 1.2,
      drift: 0,
    }];

    tickPlatformer(0.05, {
      simRef: { current: state },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(state.noteOrbs).toHaveLength(1);
    expect(state.noteOrbs[0].x).toBe(sourceNpc.x);
    expect(state.noteOrbs[0].y).toBe(sourceNpc.y - 12);
    expect(state.noteOrbs[0].age).toBe(0);
    expect(state.noteOrbs[0].vy).toBeLessThan(0);
  });

  it("opens the resonance gate after the required major-minor-npc puzzle sequence", () => {
    const platforms = createPlatforms();
    const state = createInitialState([], [], platforms);
    const calls: Array<Record<string, number | string | undefined>> = [];
    const [majorPedestal, minorPedestal, npcPedestal] = state.puzzlePedestals;

    state.coins = [];
    state.noteOrbs = [];
    state.musicNpcs = [];

    state.player.x = majorPedestal.x - PLAYER_W * 0.5;
    state.player.y = majorPedestal.y - PLAYER_H * 0.5;
    state.lastMelodyToken = "major";
    state.lastMelodyTokenAt = 0;
    tickPlatformer(0.1, {
      simRef: { current: state },
      apiRef: { current: createApi(calls) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    state.player.x = minorPedestal.x - PLAYER_W * 0.5;
    state.player.y = minorPedestal.y - PLAYER_H * 0.5;
    state.lastMelodyToken = "minor";
    state.lastMelodyTokenAt = state.t;
    tickPlatformer(0.5, {
      simRef: { current: state },
      apiRef: { current: createApi(calls) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    state.player.x = npcPedestal.x - PLAYER_W * 0.5;
    state.player.y = npcPedestal.y - PLAYER_H * 0.5;
    state.lastMelodyToken = "npc";
    state.lastMelodyTokenAt = state.t;
    tickPlatformer(0.5, {
      simRef: { current: state },
      apiRef: { current: createApi(calls) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(state.puzzlePedestals.every((pedestal) => pedestal.activated)).toBe(true);
    expect(state.resonanceGates[0].open).toBe(true);
    expect(calls.map((call) => call.source)).toEqual([
      "puzzle_step",
      "puzzle_step",
      "puzzle_step",
      "gate_unlock",
    ]);
  });

  it("lets supportive draft echoes solve the next pedestal even without a fresh melody token", () => {
    const platforms = createPlatforms();
    const state = createInitialState([], [], platforms);
    const calls: Array<Record<string, number | string | undefined>> = [];
    const panda = state.musicNpcs.find((npc) => npc.animal === "panda");
    const majorPedestal = state.puzzlePedestals[0];

    expect(panda).toBeTruthy();
    state.coins = [];
    state.noteOrbs = [];
    state.musicNpcs = [{
      ...panda!,
      x: majorPedestal.x,
      y: majorPedestal.y - 24,
      disposition: "guide",
      tarotOrientation: "upright",
      loomActiveLabel: "MEND",
    }];
    state.lastMelodyToken = null;
    state.player.x = majorPedestal.x - PLAYER_W * 0.5;
    state.player.y = majorPedestal.y - PLAYER_H * 0.5;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = false;
    state.player.wasGrounded = false;

    tickPlatformer(0.1, {
      simRef: { current: state },
      apiRef: { current: createApi(calls) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(state.puzzlePedestals[0].activated).toBe(true);
    expect(calls.some((call) => call.source === "puzzle_step")).toBe(true);
  });

  it("lets negative draft shadow tokens solve the next pedestal with an alternate music token", () => {
    const platforms = createPlatforms();
    const state = createInitialState([], [], platforms);
    const calls: Array<Record<string, number | string | undefined>> = [];
    const owl = state.musicNpcs.find((npc) => npc.animal === "owl");
    const majorPedestal = state.puzzlePedestals[0];

    expect(owl).toBeTruthy();
    state.coins = [];
    state.noteOrbs = [];
    state.musicNpcs = [{
      ...owl!,
      x: majorPedestal.x + 18,
      y: majorPedestal.y - 30,
      disposition: "mirror",
      tarotOrientation: "reversed",
      loomActiveLabel: "VEIL",
    }];
    state.lastMelodyToken = "mode";
    state.lastMelodyTokenAt = 0;
    state.player.x = majorPedestal.x - PLAYER_W * 0.5;
    state.player.y = majorPedestal.y - PLAYER_H * 0.5;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = false;
    state.player.wasGrounded = false;

    tickPlatformer(0.1, {
      simRef: { current: state },
      apiRef: { current: createApi(calls) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(state.puzzlePedestals[0].activated).toBe(true);
    expect(state.resonanceGates[0].open).toBe(false);
    expect(calls.some((call) => call.source === "puzzle_step")).toBe(true);
  });

  it("lets an active draft gate slit bypass the closed resonance gate collision", () => {
    const platforms = createPlatforms();
    const state = createInitialState([], [], platforms);
    const fox = state.musicNpcs.find((npc) => npc.animal === "fox");
    const gate = state.resonanceGates[0];

    expect(fox).toBeTruthy();
    state.coins = [];
    state.noteOrbs = [];
    state.musicNpcs = [{
      ...fox!,
      x: gate.x + 34,
      y: gate.y + gate.h - 52,
      disposition: "trickster",
      tarotOrientation: "reversed",
      loomActiveLabel: "RELEASE",
    }];
    state.player.x = gate.x - PLAYER_W - 4;
    state.player.y = gate.y + gate.h - PLAYER_H - 12;
    state.player.vx = 320;
    state.player.vy = 0;
    state.player.onGround = false;
    state.player.wasGrounded = false;
    state.cameraX = Math.max(0, gate.x - VIEW_W * 0.35);

    tickPlatformer(0.12, {
      simRef: { current: state },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo",
      arrangementMode: "balanced",
      formMode: "auto",
      sectionBias: "auto",
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    });

    expect(state.player.x).toBeGreaterThan(gate.x - PLAYER_W);
  });

  it("lets negative veil drafts seal the habitual branch with collision-active route locks", () => {
    const platforms = createPlatforms();
    const highFork = platforms.find((platform) => platform.id === "fork-1-high-a");
    const owlTemplate = createInitialState([], [], platforms).musicNpcs.find((npc) => npc.animal === "owl");

    expect(highFork).toBeTruthy();
    expect(owlTemplate).toBeTruthy();

    const baseState = createInitialState([], [], platforms);
    const sealedState = createInitialState([], [], platforms);
    baseState.coins = [];
    baseState.noteOrbs = [];
    baseState.musicNpcs = [];
    sealedState.coins = [];
    sealedState.noteOrbs = [];
    sealedState.musicNpcs = [{
      ...owlTemplate!,
      x: highFork!.x + 34,
      y: highFork!.y - 46,
      disposition: "mirror",
      tarotOrientation: "reversed",
      loomActiveLabel: "VEIL",
    }];

    for (const state of [baseState, sealedState]) {
      state.player.x = highFork!.x - PLAYER_W - 6;
      state.player.y = highFork!.y - PLAYER_H - 6;
      state.player.vx = 220;
      state.player.vy = 0;
      state.player.onGround = false;
      state.player.wasGrounded = false;
      state.cameraX = Math.max(0, highFork!.x - VIEW_W * 0.35);
    }

    const tickArgs = {
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo" as const,
      arrangementMode: "balanced" as const,
      formMode: "auto" as const,
      sectionBias: "auto" as const,
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    };

    tickPlatformer(0.08, {
      simRef: { current: baseState },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      ...tickArgs,
    });
    tickPlatformer(0.08, {
      simRef: { current: sealedState },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      ...tickArgs,
    });

    expect(baseState.player.x).toBeGreaterThan(sealedState.player.x);
    expect(sealedState.player.x).toBeCloseTo(highFork!.x + 8 - PLAYER_W, 3);
  });

  it("uses npc route hints to widen landing on the suggested fork branch before route commit", () => {
    const platforms = createPlatforms();
    const highFork = platforms.find((platform) => platform.id === "fork-1-high-a");
    const owlTemplate = createInitialState([], [], platforms).musicNpcs.find((npc) => npc.animal === "owl");

    expect(highFork).toBeTruthy();
    expect(owlTemplate).toBeTruthy();

    const baseState = createInitialState([], [], platforms);
    const guidedState = createInitialState([], [], platforms);
    baseState.coins = [];
    baseState.noteOrbs = [];
    baseState.musicNpcs = [];
    guidedState.coins = [];
    guidedState.noteOrbs = [];
    guidedState.musicNpcs = [{
      ...owlTemplate!,
      x: highFork!.x + 42,
      y: highFork!.y - 28,
      disposition: "mirror",
      tarotOrientation: "upright",
    }];

    for (const state of [baseState, guidedState]) {
      state.player.x = highFork!.x + 26;
      state.player.y = highFork!.y - PLAYER_H + 8;
      state.player.vx = 0;
      state.player.vy = 120;
      state.player.onGround = false;
      state.player.wasGrounded = false;
      state.cameraX = Math.max(0, highFork!.x - VIEW_W * 0.35);
    }

    const tickArgs = {
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo" as const,
      arrangementMode: "balanced" as const,
      formMode: "auto" as const,
      sectionBias: "auto" as const,
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    };

    tickPlatformer(0.05, {
      simRef: { current: baseState },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      ...tickArgs,
    });
    tickPlatformer(0.05, {
      simRef: { current: guidedState },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      ...tickArgs,
    });

    expect(baseState.player.onGround).toBe(false);
    expect(guidedState.player.onGround).toBe(true);
    expect(guidedState.player.y).toBeCloseTo(highFork!.y - PLAYER_H, 4);
  });

  it("materializes a temporary route bridge in the unresolved fork gap", () => {
    const platforms = createPlatforms();
    const highFork = platforms.find((platform) => platform.id === "fork-1-high-a");
    const owlTemplate = createInitialState([], [], platforms).musicNpcs.find((npc) => npc.animal === "owl");

    expect(highFork).toBeTruthy();
    expect(owlTemplate).toBeTruthy();

    const baseState = createInitialState([], [], platforms);
    const guidedState = createInitialState([], [], platforms);
    baseState.coins = [];
    baseState.noteOrbs = [];
    baseState.musicNpcs = [];
    guidedState.coins = [];
    guidedState.noteOrbs = [];
    guidedState.musicNpcs = [{
      ...owlTemplate!,
      x: highFork!.x + 24,
      y: highFork!.y - 24,
      disposition: "mirror",
      tarotOrientation: "upright",
    }];

    for (const state of [baseState, guidedState]) {
      state.player.x = 1650;
      state.player.y = 338;
      state.player.vx = 0;
      state.player.vy = 140;
      state.player.onGround = false;
      state.player.wasGrounded = false;
      state.cameraX = Math.max(0, highFork!.x - VIEW_W * 0.35);
    }

    const tickArgs = {
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo" as const,
      arrangementMode: "balanced" as const,
      formMode: "auto" as const,
      sectionBias: "auto" as const,
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    };

    tickPlatformer(0.05, {
      simRef: { current: baseState },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      ...tickArgs,
    });
    tickPlatformer(0.05, {
      simRef: { current: guidedState },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      ...tickArgs,
    });

    expect(baseState.player.onGround).toBe(false);
    expect(guidedState.player.onGround).toBe(true);
    expect(guidedState.player.y).toBeCloseTo(highFork!.y + 28 - PLAYER_H, 4);
  });

  it("lets guide fields extend pedestal touch range for the current melody token", () => {
    const platforms = createPlatforms();
    const pandaTemplate = createInitialState([], [], platforms).musicNpcs.find((npc) => npc.animal === "panda");

    expect(pandaTemplate).toBeTruthy();

    const baseState = createInitialState([], [], platforms);
    const guidedState = createInitialState([], [], platforms);
    const majorPedestal = guidedState.puzzlePedestals[0];
    baseState.coins = [];
    baseState.noteOrbs = [];
    baseState.musicNpcs = [];
    guidedState.coins = [];
    guidedState.noteOrbs = [];
    guidedState.musicNpcs = [{
      ...pandaTemplate!,
      x: majorPedestal.x,
      y: majorPedestal.y - 24,
      disposition: "guide",
      tarotOrientation: "upright",
    }];

    for (const state of [baseState, guidedState]) {
      state.coins = [];
      state.noteOrbs = [];
      state.lastMelodyToken = "major";
      state.lastMelodyTokenAt = 0;
      state.player.x = majorPedestal.x + 15;
      state.player.y = majorPedestal.y - PLAYER_H + 1;
      state.player.vx = 0;
      state.player.vy = 0;
      state.player.onGround = false;
      state.player.wasGrounded = false;
    }

    const tickArgs = {
      platforms,
      bpm: 110,
      composerOn: true,
      tuningMode: "12edo" as const,
      arrangementMode: "balanced" as const,
      formMode: "auto" as const,
      sectionBias: "auto" as const,
      evolutionDepth: 0.68,
      tempoFollow: 0.62,
      onHudUpdate: () => {},
      onComposerPreview: () => {},
    };

    tickPlatformer(0.1, {
      simRef: { current: baseState },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      ...tickArgs,
    });
    tickPlatformer(0.1, {
      simRef: { current: guidedState },
      apiRef: { current: createApi([]) },
      musicRef: { current: createMusicState() },
      ...tickArgs,
    });

    expect(baseState.puzzlePedestals[0].activated).toBe(false);
    expect(guidedState.puzzlePedestals[0].activated).toBe(true);
  });
});
