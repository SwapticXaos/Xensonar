import * as React from 'react';
/**
 * Centralized room content router: given current room and app-provided props,
 * renders the active room content. Keeps App.tsx focused on state and hooks;
 * program flow: App → AppShell → AppRoomContent (router) → room components.
 * Data-driven: ROOM_RENDERERS map makes adding a room a single entry (NEW-ROOM-TEMPLATE, REFLECTION §8a).
 */

import type { MutableRefObject, RefObject } from "react";
import { type Room, ROOMS_WITH_CONTENT, ROOMS_WITH_RENDERERS } from "./roomRegistry";
import type { InputLogEntry } from "../shared/input/useRoomInput";
import { type KeymapRegistryRef } from "../features/input/useInputRouter";
import type { EnsureAudio } from "../shared/audio/audioInit";
import { type ResonanceState } from "../features/resonance/config/state";
import type { ResonanceSceneId } from "../features/resonance/config/scenes";
import type { HarmonicWorld, HarmonicWorldExport } from "../domain/harmonicWorld";
import { TopologyRoom } from "../features/topology/TopologyRoom";
import { GameRoomView } from "../features/arena/GameRoomView";
import type { ArenaHud } from "../features/arena/arenaState";
import { ResonanceRoom } from "../features/resonance/components/ResonanceRoom";
import { ResonanceCommonsRoom } from "../features/commons/ResonanceCommonsRoom";
import { Level3LabRoom } from "../features/level3/Level3LabRoom";
import { SandboxRoom } from "../features/sandbox/SandboxRoom";
import { TuningLabRoom } from "../features/tuningLab/TuningLabRoom";
import { JumpRunSoundtrackRoom } from "../game/jumpRunSoundtrack/JumpRunSoundtrackRoom";
import { HexEvoBridgeRoom } from "../game/hexEvo/HexEvoBridgeRoom";
import { WelcomeMainNexus } from "./components/WelcomeMainNexus";
import { WorldGalleryRoom } from "../features/worldGallery/WorldGalleryRoom";
import { WorldLabRoom } from "../features/worldLab/WorldLabRoom";
import {
  buildRoomRuntimeContext,
  getStandaloneRoomPropsWithAudioFromContext,
  type RoomRuntimeContext,
} from "../features/runtime/roomRuntime";

/** Re-export from roomRegistry (single source of truth). Content rooms = TOP_NAV_ROOMS order. */
export { ROOMS_WITH_CONTENT };

export type AppRoomContentProps = {
  room: Room;
  setRoom: (r: Room) => void;
  logInputEvent: (entry: InputLogEntry) => void;
  /** When provided, standalone rooms (Commons, L3, Platformer, Sandbox, TuningLab) receive it; key-driven rooms register with global input router (vision §8). */
  keymapRegistryRef?: KeymapRegistryRef;
  /** When set, rooms use it for first-run dismiss (single keydown; vision §8). */
  firstRunDismissRef?: React.MutableRefObject<(() => void) | null>;
  audioCtx: AudioContext | null;
  initAudio: EnsureAudio;
  topologyQuantizeRef: MutableRefObject<Pick<ResonanceState, "quantizeOn" | "quantizeBpm" | "quantizeSubdivision">>;
  globalHarmonicContext?: import("../features/resonance/config/stateSlices").GlobalHarmonicContext;
  harmonicWorld?: HarmonicWorld;
  /** Optional callback used by rooms (e.g. Tuning Lab) to set global root in Hz via App/updateNParams. */
  setGlobalRootHz?: (hz: number) => void;
  /** Optional: change the current Resonance scene/world from MAIN/NEXUS welcome or other surfaces. */
  onSelectResonanceScene?: (sceneId: ResonanceSceneId) => void;
  /** Optional: import a harmonic world export from world-aware rooms (Gallery, Lab). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
  /** Optional: play a short audio preview of the current harmonic world (used by world-aware rooms). */
  onPreviewWorldTone?: (world: HarmonicWorld) => void;
  gameActive: boolean;
  gameHud: ArenaHud;
  startGameRun: () => void;
  gameCanvasRef: RefObject<HTMLCanvasElement | null>;
  gameWidth: number;
  gameHeight: number;
  resonanceRoomProps: React.ComponentProps<typeof ResonanceRoom>;
};

type ContentRenderer = (ctx: RoomRuntimeContext) => React.ReactNode;

/** Base props for standalone-style rooms (Commons, L3, Platformer, Sandbox, TuningLab). Single contract aligned with roomRuntime: room, onBack, onInputEvent, keymapRegistryRef, firstRunDismissRef. Exported for tests. */
export function getStandaloneRoomBaseProps(p: AppRoomContentProps) {
  return {
    room: p.room,
    onBack: () => p.setRoom("RESONANCE"),
    onInputEvent: p.logInputEvent,
    keymapRegistryRef: p.keymapRegistryRef,
    firstRunDismissRef: p.firstRunDismissRef,
  };
}

/** Base props + audio (audioCtx, onEnableAudio) for standalone rooms that need audio. Reduces duplication in ROOM_RENDERERS. Exported for tests. */
export function getStandaloneRoomPropsWithAudio(p: AppRoomContentProps) {
  return {
    ...getStandaloneRoomBaseProps(p),
    audioCtx: p.audioCtx,
    onEnableAudio: p.initAudio,
  };
}

/** Data-driven room renderers. Each receives RoomRuntimeContext; destructures what it needs. Adding a room = add to roomRegistry then one entry here. */
const ROOM_RENDERERS: Partial<Record<Room, ContentRenderer>> = {
  TOPOLOGY: (ctx) => (
    <TopologyRoom
      room={ctx.room}
      audioCtx={ctx.audioCtx}
      initAudio={ctx.initAudio}
      topologyQuantizeRef={ctx.topologyQuantizeRef}
      globalHarmonicContext={ctx.globalHarmonicContext}
      harmonicWorld={ctx.harmonicWorld}
      firstRunDismissRef={ctx.firstRunDismissRef}
    />
  ),
  GAME: (ctx) => (
    <GameRoomView
      gameActive={ctx.game.active}
      gameHud={ctx.game.hud}
      harmonicSlice={ctx.topologyQuantizeRef.current}
      globalHarmonicContext={ctx.globalHarmonicContext}
      harmonicWorld={ctx.harmonicWorld}
      startGameRun={ctx.game.startRun}
      gameCanvasRef={ctx.game.canvasRef}
      gameWidth={ctx.game.width}
      gameHeight={ctx.game.height}
      onSelectRoom={ctx.navigateTo}
      firstRunDismissRef={ctx.firstRunDismissRef}
    />
  ),
  RESONANCE: (ctx) => (
    <ResonanceRoom
      {...ctx.resonanceRoomProps}
      harmonicWorld={ctx.harmonicWorld}
    />
  ),
  COMMONS: (ctx) => (
    <ResonanceCommonsRoom
      {...getStandaloneRoomPropsWithAudioFromContext(ctx)}
      onSelectRoom={ctx.navigateTo}
      globalHarmonicContext={ctx.globalHarmonicContext}
      harmonicWorld={ctx.harmonicWorld}
      onImportWorld={ctx.onImportWorld}
    />
  ),
  L3LAB: (ctx) => (
    <Level3LabRoom
      {...getStandaloneRoomPropsWithAudioFromContext(ctx)}
      globalHarmonicContext={ctx.globalHarmonicContext}
      harmonicWorld={ctx.harmonicWorld}
      onImportWorld={ctx.onImportWorld}
    />
  ),
  PLATFORMER: (ctx) => (
    <JumpRunSoundtrackRoom
      {...getStandaloneRoomPropsWithAudioFromContext(ctx)}
      globalHarmonicContext={ctx.globalHarmonicContext}
      harmonicWorld={ctx.harmonicWorld}
      onImportWorld={ctx.onImportWorld}
    />
  ),

  HEXEVO: (ctx) => (
    <HexEvoBridgeRoom
      room={ctx.room}
      onBack={() => ctx.navigateTo("RESONANCE")}
      onSelectRoom={ctx.navigateTo}
    />
  ),
  SANDBOX: (ctx) => (
    <SandboxRoom
      {...getStandaloneRoomPropsWithAudioFromContext(ctx)}
      globalHarmonicContext={ctx.globalHarmonicContext}
      harmonicWorld={ctx.harmonicWorld}
      onImportWorld={ctx.onImportWorld}
    />
  ),
  TUNINGLAB: (ctx) => (
    <TuningLabRoom
      {...getStandaloneRoomPropsWithAudioFromContext(ctx)}
      globalHarmonicContext={ctx.globalHarmonicContext}
      setGlobalRootHz={ctx.setGlobalRootHz}
      harmonicWorld={ctx.harmonicWorld}
      onImportWorld={ctx.onImportWorld}
    />
  ),
  WORLDLAB: (ctx) => (
    <WorldLabRoom
      room={ctx.room}
      onBack={() => ctx.navigateTo("RESONANCE")}
      globalHarmonicContext={ctx.globalHarmonicContext}
      harmonicWorld={ctx.harmonicWorld}
    />
  ),
  WORLDGALLERY: (ctx) => (
    <WorldGalleryRoom
      room={ctx.room}
      onBack={() => ctx.navigateTo("RESONANCE")}
      globalHarmonicContext={ctx.globalHarmonicContext}
      harmonicWorld={ctx.harmonicWorld}
      onSelectResonanceScene={ctx.onSelectResonanceScene}
      onImportWorld={ctx.onImportWorld}
      onPreviewWorldTone={ctx.onPreviewWorldTone}
      onSelectRoom={ctx.navigateTo}
      initAudio={ctx.initAudio}
    />
  ),
};

/** Dev-only: ensure ROOM_RENDERERS has an entry for every ROOMS_WITH_RENDERERS room (single-source invariant). */
if (import.meta.env.DEV) {
  for (const r of ROOMS_WITH_RENDERERS) {
    if (!ROOM_RENDERERS[r]) {
      console.error(
        `[XENSONAR] ROOM_RENDERERS missing entry for "${r}". Add to ROOM_RENDERERS in AppRoomContent.tsx when adding a room. ROOMS_WITH_RENDERERS comes from roomRegistry.`,
      );
    }
  }
}

/** Re-export from roomRegistry (single source). Invariant: ROOM_RENDERERS has an entry for each. See roomRegistry.test.ts. */
export { ROOMS_WITH_RENDERERS };

export function AppRoomContent(props: AppRoomContentProps) {
  const { room } = props;
  if (room === "MAIN" || room === "NEXUS") {
    return (
      <WelcomeMainNexus
        setRoom={props.setRoom}
        initAudio={props.initAudio}
        onSelectResonanceScene={props.onSelectResonanceScene}
        onImportWorld={props.onImportWorld}
      />
    );
  }
  const ctx = buildRoomRuntimeContext(props);
  const render = ROOM_RENDERERS[room];
  return render ? render(ctx) : null;
}
