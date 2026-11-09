import { useEffect } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  buildIrrlichtArenaSeed,
  finalizeIrrlichtArenaRun,
  formatIrrlichtArenaSeedStatus,
  resolveArenaAnchorRatios,
} from "@/features/xensonar/rooms/xenpolarExtrasBridge";
import type {
  IrrlichtArenaHudState,
  IrrlichtArenaInterpreter,
  IrrlichtArenaInterpreterSnapshot,
  IrrlichtArenaRuntimeState,
} from "@/features/xensonar/rooms/xenpolarExtrasBridge";
import type { Room } from "../domain/runtimeTypes";
import { runIrrlichtArenaGameplayFrame } from "./irrlichtArenaGameplayFrame";
import { drawIrrlichtArenaFrame } from "./irrlichtArenaFrameRenderer";
import {
  runIrrlichtArenaLevel3PostGameplayFrame,
  runIrrlichtArenaLevel3PreGameplayFrame,
} from "./irrlichtArenaLevel3CommonsFrame";
import type { AppXenpolarGameKeyState } from "./irrlichtArenaRuntimeBoundaryTypes";

export type IrrlichtArenaFrameRuntimeArgs = {
  room: Room;
  gameActive: boolean;
  gameCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  gameRefs: MutableRefObject<IrrlichtArenaRuntimeState>;
  keyRef: MutableRefObject<AppXenpolarGameKeyState>;
  arenaInterpreterRef: MutableRefObject<IrrlichtArenaInterpreter>;
  getArenaInterpreterSnapshot: (phase: string) => IrrlichtArenaInterpreterSnapshot;
  setGameHud: Dispatch<SetStateAction<IrrlichtArenaHudState>>;
  setGameActive: Dispatch<SetStateAction<boolean>>;
  setArenaSeedStatus: Dispatch<SetStateAction<string>>;
  clampValue: (value: number, min: number, max: number) => number;
  nextGameChaos: () => number;
  playPlayerShotMotif: (anchorRatio: number) => void;
  playOrbShotSound: (anchorRatio: number, phase: string) => void;
  playOrbHitSound: (anchorRatio: number) => void;
  playPlayerHitSound: (anchorRatio: number) => void;
  playHeartPickupChord: (anchorRatio: number) => void;
};

/**
 * Single full-browser Irrlicht Arena frame owner.
 *
 * Patch 281 used four independent RAF loops.  Patch 285 keeps their
 * established mutation order inside one deterministic frame session:
 * legacy Level-3 pre-field -> gameplay/render/HUD -> legacy Level-3 post-field.
 */
export function useIrrlichtArenaFrameRuntime(args: IrrlichtArenaFrameRuntimeArgs) {
  const {
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
  } = args;

  useEffect(() => {
    if (room !== "GAME" || !gameActive) return;

    let rafId = 0;
    let last = performance.now();
    let hudTick = 0;

    const tick = (now: number) => {
      const rawDt = (now - last) / 1000;
      const dt = Math.min(0.033, rawDt);
      const secondaryLevel3Dt = Math.min(0.035, rawDt);
      last = now;
      hudTick += dt;

      const canvas = gameCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const state = gameRefs.current;

      // Preserve the first legacy RAF's position before the Patch-281 main tick.
      runIrrlichtArenaLevel3PreGameplayFrame(state, dt);

      const { phase } = runIrrlichtArenaGameplayFrame({
        state,
        dt,
        keys: keyRef.current,
        arenaInterpreter: arenaInterpreterRef.current,
        getArenaInterpreterSnapshot,
        clampValue,
        nextGameChaos,
        playPlayerShotMotif,
        playOrbShotSound,
        playOrbHitSound,
        playPlayerHitSound,
        playHeartPickupChord,
      });

      drawIrrlichtArenaFrame(ctx, state, now);

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
        // Preserve the two legacy post-main RAF contributions in registration order.
        runIrrlichtArenaLevel3PostGameplayFrame(state, dt, secondaryLevel3Dt);
        rafId = requestAnimationFrame(tick);
      } else {
        if (!arenaInterpreterRef.current.capture.finished) {
          finalizeIrrlichtArenaRun(arenaInterpreterRef.current, getArenaInterpreterSnapshot(phase));
          const { summary } = buildIrrlichtArenaSeed(arenaInterpreterRef.current, {
            name: `Irrlicht Arena · Level ${state.level}`,
            anchorRatios: resolveArenaAnchorRatios(state),
            rootHz: clampValue(state.activeAnchorRatio * 110, 55, 440),
            notes: `Arena-DNA aus Irrlicht Arena. Score ${state.totalScore}, Level ${state.level}, aktiver Anker ${state.activeAnchorLabel}.`,
          });
          setArenaSeedStatus(`Run abgeschlossen. ${formatIrrlichtArenaSeedStatus(summary)}`);
        }
        setGameActive(false);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [room, gameActive]);
}
