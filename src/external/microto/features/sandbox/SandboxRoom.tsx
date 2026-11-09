import * as React from 'react';
/**
 * Minimal standalone room (SANDBOX) per NEW-ROOM-TEMPLATE-v1.md.
 * Validates: useCanvasRoom (loop), useRoomLifecycle, StandaloneRoomFrame.
 * Pointer-down on canvas plays a one-shot tone (vision: exploratory instrument; shared features/audio).
 */

import { useCallback, useMemo, useRef } from "react";
import type { InputLogEntry, InputHandlers } from "../../shared/input/useRoomInput";
import { useRoomFirstRunHint } from "../runtime/useRoomFirstRunHint";
import { useStandaloneRoomRuntime } from "../runtime/useStandaloneRoomRuntime";
import { StandaloneRoomFrame } from "../../app/components/StandaloneRoomFrame";
import { WorldSummaryHud } from "../../app/components/WorldSummaryHud";
import { createTonePlayer } from "../audio";
import { type Room } from "../../app/roomRegistry";
import type { KeymapRegistryRef } from "../input/useInputRouter";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { CANVAS_WIDTH_SANDBOX, CANVAS_HEIGHT_SANDBOX } from "../../shared/canvasConstants";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import type { HarmonicWorld, HarmonicWorldExport } from "../../domain/harmonicWorld";
import { mapSandboxHarmonicView } from "./harmonicAdapter";
import { RoomRecommendedWorldsStrip } from "../../app/components/RoomRecommendedWorldsStrip";

const W = CANVAS_WIDTH_SANDBOX;
const H = CANVAS_HEIGHT_SANDBOX;

/** Same base contract as other standalone rooms (getStandaloneRoomBaseProps). keymapRegistryRef is passed but not used (SANDBOX is pointer-only). */
type SandboxRoomProps = {
  room: Room;
  onBack: () => void;
  onInputEvent?: (entry: InputLogEntry) => void;
  /** Passed from getStandaloneRoomBaseProps; not used (SANDBOX pointer-only, does not register with input router). */
  keymapRegistryRef?: KeymapRegistryRef;
  audioCtx?: AudioContext | null;
  onEnableAudio?: EnsureAudio;
  /** Optional shared harmonic context; used only for HUD display. */
  globalHarmonicContext?: GlobalHarmonicContext;
  /** Optional shared harmonic world; used for world-aware HUD labels. */
  harmonicWorld?: HarmonicWorld | null;
  /** Optional: load a harmonic world (enables "Recommended for this room" strip). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
  /** When set, first-run dismiss is routed via global keydown (vision §8). */
  firstRunDismissRef?: React.MutableRefObject<(() => void) | null>;
};

export function SandboxRoom({
  room,
  onBack,
  onInputEvent,
  keymapRegistryRef: _keymapRegistryRef,
  audioCtx,
  onEnableAudio,
  globalHarmonicContext,
  harmonicWorld,
  onImportWorld,
  firstRunDismissRef,
}: SandboxRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  const { firstRunHint, showFirstRunHint, dismissHint } = useRoomFirstRunHint("SANDBOX", {
    dismissOnGlobalInput: true,
    firstRunDismissRef,
  });

  const active = room === "SANDBOX";

  const playScheduledTone = useMemo(() => createTonePlayer(() => audioCtx ?? null), [audioCtx]);

  const handlePointerDown = useCallback(
    async (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (showFirstRunHint) dismissHint();
      onInputEvent?.({ room: "SANDBOX", type: "pointerdown", pointer: { x: e.clientX, y: e.clientY } });

      if (onEnableAudio && !audioCtx) {
        await onEnableAudio();
      }

      const root = globalHarmonicContext?.baseFreq ?? 220;
      const rect = canvasRef.current?.getBoundingClientRect();
      const yNorm =
        rect && rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5;
      const clamped = Math.min(1, Math.max(0, yNorm));
      const semis = (1 - clamped) * 24 - 12;
      const freq = root * Math.pow(2, semis / 12);

      playScheduledTone(freq, 0, 0.12, "sine", 0.18);
    },
    [
      audioCtx,
      dismissHint,
      globalHarmonicContext,
      onEnableAudio,
      onInputEvent,
      playScheduledTone,
      showFirstRunHint,
    ],
  );

  const update = useCallback((dt: number) => {
    tRef.current += dt;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#404040";
    ctx.font = "24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Sandbox — pointer down to play tone", W / 2, H / 2);
    ctx.font = "14px monospace";
    ctx.fillStyle = "#606060";
    ctx.fillText(`t = ${tRef.current.toFixed(1)}s`, W / 2, H / 2 + 32);
  }, []);

  const inputHandlers: InputHandlers = {};

  const harmonicView = mapSandboxHarmonicView(globalHarmonicContext, harmonicWorld);

  useStandaloneRoomRuntime({
    room,
    roomId: "SANDBOX",
    canvasRef,
    active,
    update,
    draw,
    inputHandlers,
    registerRaf: true,
    lifecycle: { onUnmount: () => {} },
  });

  return (
    <StandaloneRoomFrame
      title="IX. Sandbox"
      description="Pointer down on canvas to play a tone (enable audio if needed). Shared loop and lifecycle."
      onBack={onBack}
    >
      <WorldSummaryHud
        world={harmonicWorld}
        slice={harmonicView.quantizeSlice}
        rootHz={globalHarmonicContext?.baseFreq}
        tuningLabel={harmonicView.tuningLabel}
        modeLabel={harmonicView.modeLabel}
        className="mb-3"
        worldHintChildren={
          <>
            Sandbox spielt Einzeltone im aktiven Welt-Gitter; klicke an verschiedene Stellen, um Root, Spannweite und
            Stimmung dieser Welt im ganz einfachen Setup zu erkunden.
          </>
        }
      />
      <RoomRecommendedWorldsStrip
        room={room}
        onImportWorld={onImportWorld}
        harmonicWorld={harmonicWorld}
        limit={5}
        className="mb-3"
      />
      {showFirstRunHint && firstRunHint && (
        <p className="mb-3 text-sm text-neutral-300 border border-neutral-700 p-2 rounded">{firstRunHint}</p>
      )}
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-full border border-neutral-700 touch-none cursor-pointer"
        style={{ maxHeight: "70vh" }}
        onPointerDown={handlePointerDown}
      />
    </StandaloneRoomFrame>
  );
}
