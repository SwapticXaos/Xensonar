import { useState, useRef, useEffect, useCallback } from "react";
import { type Room } from "../../app/roomRegistry";
import { JI_NODES } from "../../shared/tuning/harmonicNodes";
import { clamp } from "../../shared/tuning/grid";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { type PlayOneShotTone } from "../audio";
import { useRoomInput, type InputLogEntry } from "../../shared/input/useRoomInput";
import type { KeymapRegistryRef } from "../input/useInputRouter";
import { createInitialArenaState, createRunStartArenaState, INITIAL_ARENA_HUD, type ArenaGameState, type ArenaHud } from "./arenaState";
import { gameKeyLookup } from "./gameKeymap";
import { drawArenaFrame, drawSurrealLandscape } from "./arenaDraw";
import { tickArenaState, type ArenaKeys } from "./arenaPhysics";
import { useSimulationLoop } from "../runtime/useSimulationLoop";
import { VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS } from "../runtime/visualRuntimeContract";
import { createArenaSoundCallbacks } from "./arenaSoundPolicy";

type UseArenaLoopArgs = {
  setRoom: (room: Room) => void;
  room: Room;
  initAudio: EnsureAudio;
  playScheduledTone: PlayOneShotTone;
  clampFreq: (f: number, min: number, max: number) => number;
  gameWidth: number;
  gameHeight: number;
  /** Optional: log input events for full-session capture (e.g. performance recorder). */
  onInputEvent?: (entry: InputLogEntry) => void;
  /** When provided, GAME registers with global input router instead of using useRoomInput (vision §8). */
  keymapRegistryRef?: KeymapRegistryRef;
};

export function useArenaLoop({ room, setRoom, initAudio, playScheduledTone, clampFreq, gameWidth, gameHeight, onInputEvent, keymapRegistryRef }: UseArenaLoopArgs) {
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const keyRef = useRef({ left: false, right: false, shoot: false });
  const gameRefs = useRef<ArenaGameState>(createInitialArenaState(gameWidth, gameHeight));
  const [gameActive, setGameActive] = useState(false);
  const [gameHud, setGameHud] = useState<ArenaHud>(INITIAL_ARENA_HUD);

  const hudAccumRef = useRef(0);
  const lastNowRef = useRef(0);
  const soundCallbacksRef = useRef(
    createArenaSoundCallbacks(gameRefs, clampFreq, playScheduledTone),
  );
  soundCallbacksRef.current = createArenaSoundCallbacks(gameRefs, clampFreq, playScheduledTone);

  const startGameRun = async () => {
    const ctx = await initAudio();
    if (!ctx) return;
    gameRefs.current = createRunStartArenaState(gameWidth, gameHeight, { level: 1, anchorNodes: JI_NODES });
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
    if (room !== "GAME" || !keymapRegistryRef) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const action = gameKeyLookup(key, e.code);
      if (action) {
        keyRef.current[action] = true;
        if (action === "shoot") e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const action = gameKeyLookup(key, e.code);
      if (action) keyRef.current[action] = false;
    };
    keymapRegistryRef.current["GAME"] = { onKeyDown, onKeyUp };
    return () => {
      delete keymapRegistryRef.current["GAME"];
    };
  }, [room, keymapRegistryRef]);

  useRoomInput(
    room,
    "GAME",
    {
      onKeyDown: (event: KeyboardEvent) => {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        const action = gameKeyLookup(key, event.code);
        if (action) {
          keyRef.current[action] = true;
          if (action === "shoot") event.preventDefault();
        }
      },
      onKeyUp: (event: KeyboardEvent) => {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        const action = gameKeyLookup(key, event.code);
        if (action) keyRef.current[action] = false;
      },
    },
    onInputEvent ? { onInputEvent, useRouter: !!keymapRegistryRef } : { useRouter: !!keymapRegistryRef },
  );

  const arenaActive = room === "GAME" && gameActive;

  const arenaUpdate = useCallback(
    (dt: number, now?: number) => {
      const state = gameRefs.current;
      const keys: ArenaKeys = { left: keyRef.current.left, right: keyRef.current.right, shoot: keyRef.current.shoot };
      const result = tickArenaState(state, dt, keys, gameWidth, gameHeight);
      const sounds = soundCallbacksRef.current;

      if (result.playerShot) sounds.playPlayerShotMotif(state.activeAnchorRatio);
      if (result.orbShot) {
        const levelGoal = 34 + state.level * 12;
        const phase =
          state.score >= levelGoal * 0.72 ? "Radiant" : state.score >= levelGoal * 0.38 ? "Unstable" : "Dormant";
        sounds.playOrbShotSound(state.activeAnchorRatio, phase);
      }
      for (let i = 0; i < result.orbHitCount; i += 1) sounds.playOrbHitSound(state.activeAnchorRatio);
      if (result.playerHit) sounds.playPlayerHitSound(state.activeAnchorRatio);
      if (result.heartPickup) sounds.playHeartPickupChord(state.activeAnchorRatio);

      const levelGoal = 34 + state.level * 12;
      const phase =
        state.score >= levelGoal * 0.72 ? "Radiant" : state.score >= levelGoal * 0.38 ? "Unstable" : "Dormant";

      if (now !== undefined) lastNowRef.current = now;
      hudAccumRef.current += dt;
      if (hudAccumRef.current > 0.12) {
        hudAccumRef.current = 0;
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
      if (state.over) setGameActive(false);
    },
    [gameWidth, gameHeight],
  );

  const arenaDraw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const state = gameRefs.current;
      drawSurrealLandscape(ctx, lastNowRef.current, state.level, gameWidth, gameHeight);
      drawArenaFrame(ctx, state, gameWidth, gameHeight);
    },
    [gameWidth, gameHeight],
  );

  useSimulationLoop({
    canvasRef: gameCanvasRef,
    active: arenaActive,
    update: arenaUpdate,
    draw: arenaDraw,
    registerRaf: true,
    roomId: "GAME",
    maxFrameMs: VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS,
  });

  const enterArenaWorkspace = (startLevel: number) => {
    if (startLevel >= 3) {
      setRoom("L3LAB");
      return;
    }
    const clampedLevel = clamp(startLevel, 1, 9);
    gameRefs.current = createRunStartArenaState(gameWidth, gameHeight, {
      level: clampedLevel,
      anchorNodes: JI_NODES,
    });
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
      message: clampedLevel >= 3
        ? "Arbeitsraum L3 aktiv: Resonanzfeld + Gated Attacks"
        : "Irrlicht wartet.",
    });
    setRoom("GAME");
  };

  return {
    gameActive,
    setGameActive,
    gameHud,
    gameCanvasRef,
    startGameRun,
    enterArenaWorkspace,
  };
}
