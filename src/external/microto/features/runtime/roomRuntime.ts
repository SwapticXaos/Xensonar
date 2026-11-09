/**
 * Room runtime context: single spine object for room wiring (vision §6 modular domains, §8 reduce duplication).
 * AppRoomContent builds this from AppRoomContentProps and passes it to room renderers.
 * Adding a room = one ROOM_RENDERERS entry that receives ctx and destructures what it needs.
 * See docu/FIX-NEXT-runtime-harmonic-context-facades.md.
 */

import type { ComponentProps, MutableRefObject, RefObject } from "react";
import type { Room } from "../../app/roomRegistry";
import type { InputLogEntry } from "../../shared/input/useRoomInput";
import type { KeymapRegistryRef } from "../input/useInputRouter";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import type { ResonanceState } from "../resonance/config/state";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import type { HarmonicWorld, HarmonicWorldExport } from "../../domain/harmonicWorld";
import type { ResonanceSceneId } from "../resonance/config/scenes";
import type { ArenaHud } from "../arena/arenaState";
import type { ResonanceRoom } from "../resonance/components/ResonanceRoom";

/** Narrow quantize slice for Topology; keeps topology decoupled from full resonance state. */
export type TopologyQuantizeRef = MutableRefObject<
  Pick<ResonanceState, "quantizeOn" | "quantizeBpm" | "quantizeSubdivision">
>;

/** Game slice passed to GAME room. */
export type RoomRuntimeGame = {
  active: boolean;
  hud: ArenaHud;
  startRun: () => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
};

/**
 * Single context object for room content. Room renderers receive ctx and destructure what they need.
 * navigateTo(room) is the single API for room changes; App remains the authority for room state.
 */
export type RoomRuntimeContext = {
  room: Room;
  /** Single navigation API; delegates to App setRoom. Use for back (e.g. navigateTo("RESONANCE")) or any room switch. */
  navigateTo: (room: Room) => void;
  logInputEvent: (entry: InputLogEntry) => void;
  keymapRegistryRef: KeymapRegistryRef | undefined;
  /** When set, rooms register first-run dismiss here for single keydown (vision §8). */
  firstRunDismissRef?: MutableRefObject<(() => void) | null>;
  audioCtx: AudioContext | null;
  initAudio: EnsureAudio;
  topologyQuantizeRef: TopologyQuantizeRef;
  /** Optional shared harmonic center for rooms that want to display or react to it. */
  globalHarmonicContext?: GlobalHarmonicContext;
  /** Optional harmonic world view-model derived from global context + scene. */
  harmonicWorld?: HarmonicWorld;
  /** Optional callback allowing rooms (e.g. World Gallery, MAIN/NEXUS surfaces) to change the active Resonance scene/world. */
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  /** Optional callback allowing rooms to import a harmonic world export (paste/load/gallery). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
  /** Optional callback for rooms (e.g. Tuning Lab) to set the global root in Hz via App/updateNParams. */
  setGlobalRootHz?: (hz: number) => void;
  /** Optional callback to play a short audio preview of the current harmonic world. */
  onPreviewWorldTone?: (world: HarmonicWorld) => void;
  game: RoomRuntimeGame;
  resonanceRoomProps: ComponentProps<typeof ResonanceRoom>;
};

/** Props shape that AppRoomContent receives from App; builder consumes this. */
export type AppRoomContentPropsForRuntime = {
  room: Room;
  setRoom: (r: Room) => void;
  logInputEvent: (entry: InputLogEntry) => void;
  keymapRegistryRef?: KeymapRegistryRef;
  /** When set, rooms use it for first-run dismiss (single keydown; vision §8). */
  firstRunDismissRef?: MutableRefObject<(() => void) | null>;
  audioCtx: AudioContext | null;
  initAudio: EnsureAudio;
  topologyQuantizeRef: TopologyQuantizeRef;
  globalHarmonicContext?: GlobalHarmonicContext;
  harmonicWorld?: HarmonicWorld;
  /** Optional: change the current Resonance scene/world from non-Resonance rooms. */
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  onImportWorld?: (data: HarmonicWorldExport) => void;
  setGlobalRootHz?: (hz: number) => void;
  /** Optional: play a short audio preview of the current harmonic world. */
  onPreviewWorldTone?: (world: HarmonicWorld) => void;
  gameActive: boolean;
  gameHud: ArenaHud;
  startGameRun: () => void;
  gameCanvasRef: RefObject<HTMLCanvasElement | null>;
  gameWidth: number;
  gameHeight: number;
  resonanceRoomProps: ComponentProps<typeof ResonanceRoom>;
};

/**
 * Builds the room runtime context from AppRoomContent props.
 * Single place that maps setRoom → navigateTo and groups game/resonance slices.
 */
export function buildRoomRuntimeContext(p: AppRoomContentPropsForRuntime): RoomRuntimeContext {
  return {
    room: p.room,
    navigateTo: p.setRoom,
    logInputEvent: p.logInputEvent,
    keymapRegistryRef: p.keymapRegistryRef,
    firstRunDismissRef: p.firstRunDismissRef,
    audioCtx: p.audioCtx,
    initAudio: p.initAudio,
    topologyQuantizeRef: p.topologyQuantizeRef,
    globalHarmonicContext: p.globalHarmonicContext,
    harmonicWorld: p.harmonicWorld,
    onSelectResonanceScene: p.onSelectResonanceScene,
    onImportWorld: p.onImportWorld,
    setGlobalRootHz: p.setGlobalRootHz,
    onPreviewWorldTone: p.onPreviewWorldTone,
    game: {
      active: p.gameActive,
      hud: p.gameHud,
      startRun: p.startGameRun,
      canvasRef: p.gameCanvasRef,
      width: p.gameWidth,
      height: p.gameHeight,
    },
    resonanceRoomProps: p.resonanceRoomProps,
  };
}

/** Standalone room base props derived from context (room, onBack, onInputEvent, keymapRegistryRef, firstRunDismissRef). onBack = navigateTo(RESONANCE). */
export function getStandaloneRoomBasePropsFromContext(ctx: RoomRuntimeContext) {
  return {
    room: ctx.room,
    onBack: () => ctx.navigateTo("RESONANCE"),
    onInputEvent: ctx.logInputEvent,
    keymapRegistryRef: ctx.keymapRegistryRef,
    firstRunDismissRef: ctx.firstRunDismissRef,
  };
}

/** Standalone room base + audio (audioCtx, onEnableAudio) for rooms that need audio. */
export function getStandaloneRoomPropsWithAudioFromContext(ctx: RoomRuntimeContext) {
  return {
    ...getStandaloneRoomBasePropsFromContext(ctx),
    audioCtx: ctx.audioCtx,
    onEnableAudio: ctx.initAudio,
  };
}
