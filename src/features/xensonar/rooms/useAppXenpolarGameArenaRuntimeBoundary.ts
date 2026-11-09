import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  advanceGameChaos,
  captureIrrlichtArenaEvent,
  clampFreq,
  createActiveIrrlichtArenaHud,
  createActiveIrrlichtArenaState,
  createIrrlichtArenaInterpreter,
  hybridGameFreq,
  playHeartPickupChord as playHeartPickupChordAction,
  playOrbHitSound as playOrbHitSoundAction,
  playOrbShotSound as playOrbShotSoundAction,
  playPlayerHitSound as playPlayerHitSoundAction,
  playPlayerShotMotif as playPlayerShotMotifAction,
} from "@/features/xensonar/rooms/xenpolarExtrasBridge";
import type {
  IrrlichtArenaHudState,
  IrrlichtArenaInterpreter,
  IrrlichtArenaInterpreterSnapshot,
  IrrlichtArenaRuntimeState,
} from "@/features/xensonar/rooms/xenpolarExtrasBridge";
import { GAME_HEIGHT, GAME_WIDTH, MICRO_RATIOS, RUN_EDOS } from "../domain/instrumentData";
import type { Room } from "../domain/runtimeTypes";

import { useIrrlichtArenaFrameRuntime } from "./useIrrlichtArenaFrameRuntime";
import type { AppXenpolarGameKeyState, AppXenpolarGamePlayScheduledTone } from "./irrlichtArenaRuntimeBoundaryTypes";
export type { AppXenpolarGameKeyState, AppXenpolarGamePlayScheduledTone } from "./irrlichtArenaRuntimeBoundaryTypes";

export type AppXenpolarGameArenaRuntimeBoundaryArgs = {
  room: Room;
  setRoom: (room: Room) => void;
  gameCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  gameRefs: MutableRefObject<IrrlichtArenaRuntimeState>;
  gameActive: boolean;
  setGameActive: Dispatch<SetStateAction<boolean>>;
  setGameHud: Dispatch<SetStateAction<IrrlichtArenaHudState>>;
  keyRef: MutableRefObject<AppXenpolarGameKeyState>;
  arenaInterpreterRef: MutableRefObject<IrrlichtArenaInterpreter>;
  getArenaInterpreterSnapshot: (phase: string) => IrrlichtArenaInterpreterSnapshot;
  setArenaSeedStatus: Dispatch<SetStateAction<string>>;
  initAudio: () => Promise<void>;
  playScheduledTone: AppXenpolarGamePlayScheduledTone;
  clampValue: (value: number, min: number, max: number) => number;
};

export type AppXenpolarGameArenaRuntimeBoundary = {
  enterArenaWorkspace: (startLevel: number) => void;
  startGameRun: () => Promise<void>;
};

export function useAppXenpolarGameArenaRuntimeBoundary(args: AppXenpolarGameArenaRuntimeBoundaryArgs): AppXenpolarGameArenaRuntimeBoundary {
  const {
    room,
    setRoom,
    gameCanvasRef,
    gameRefs,
    gameActive,
    setGameActive,
    setGameHud,
    keyRef,
    arenaInterpreterRef,
    getArenaInterpreterSnapshot,
    setArenaSeedStatus,
    initAudio,
    playScheduledTone,
    clampValue,
  } = args;

  const nextGameChaos = () => advanceGameChaos(gameRefs.current, Math.random(), Math.random());

  const hybridFreq = (base: number, anchorRatio: number, register: number) => hybridGameFreq({
    base,
    anchorRatio,
    register,
    chaos: nextGameChaos(),
    shotCount: gameRefs.current.shotCount,
    runEdos: RUN_EDOS,
    microRatios: MICRO_RATIOS,
  });

  const playPlayerShotMotif = (anchorRatio: number) => {
    playPlayerShotMotifAction({
      gameState: gameRefs.current,
      anchorRatio,
      nextGameChaos,
      hybridFreq,
      clampFreq,
      playScheduledTone,
    });
  };

  const playOrbShotSound = (anchorRatio: number, phase: string) => {
    playOrbShotSoundAction({
      anchorRatio,
      phase,
      nextGameChaos,
      hybridFreq,
      playScheduledTone,
    });
  };

  const playOrbHitSound = (anchorRatio: number) => {
    playOrbHitSoundAction({
      anchorRatio,
      nextGameChaos,
      hybridFreq,
      playScheduledTone,
    });
  };

  const playPlayerHitSound = (anchorRatio: number) => {
    playPlayerHitSoundAction({
      anchorRatio,
      nextGameChaos,
      hybridFreq,
      playScheduledTone,
    });
  };

  const playHeartPickupChord = (anchorRatio: number) => {
    playHeartPickupChordAction({
      gameState: gameRefs.current,
      anchorRatio,
      nextGameChaos,
      clampFreq,
      playScheduledTone,
    });
  };

  useIrrlichtArenaFrameRuntime({
    room,
    gameActive,
    gameCanvasRef,
    gameRefs,
    keyRef,
    arenaInterpreterRef,
    getArenaInterpreterSnapshot,
    setGameHud,
    setGameActive,
    setArenaSeedStatus,
    clampValue,
    nextGameChaos,
    playPlayerShotMotif,
    playOrbShotSound,
    playOrbHitSound,
    playPlayerHitSound,
    playHeartPickupChord,
  });


  const enterArenaWorkspace = (startLevel: number) => {
    if (startLevel >= 3) {
      setRoom("L3LAB");
      return;
    }
    const g = gameRefs.current;
    const clampedLevel = clampValue(startLevel, 1, 9);
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


  const startGameRun = async () => {
    await initAudio();
    gameRefs.current = createActiveIrrlichtArenaState();
    arenaInterpreterRef.current = createIrrlichtArenaInterpreter();
    arenaInterpreterRef.current.lastPlayerX = GAME_WIDTH / 2;
    arenaInterpreterRef.current.lastOrbX = GAME_WIDTH / 2;
    arenaInterpreterRef.current.lastOrbY = 140;
    captureIrrlichtArenaEvent(arenaInterpreterRef.current, getArenaInterpreterSnapshot("Dormant"), "checkpoint", { energy: 0.45, lane: 3, airborne: false, t: 0, detail: 0 });
    setArenaSeedStatus("Run aktiv. Die Irrlicht-Arena kann jetzt als Melodic-Loop-Seed gelesen werden.");
    setGameHud(createActiveIrrlichtArenaHud());
    setGameActive(true);
  };

  return { enterArenaWorkspace, startGameRun };
}
