import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { INITIAL_ARENA_HUD } from "../../features/arena/arenaState";
import { createDefaultResonanceState } from "../../features/resonance/config/defaults";
import { createInitialNexusRefsState } from "../../features/resonance/resonanceRefs";
import { AppRoomContent, getStandaloneRoomBaseProps, getStandaloneRoomPropsWithAudio, ROOMS_WITH_CONTENT } from "../AppRoomContent";
import type { AppRoomContentProps } from "../AppRoomContent";
import type { Room } from "../roomRegistry";

/**
 * Locks the standalone room base props contract: getStandaloneRoomBaseProps returns
 * { room, onBack, onInputEvent, keymapRegistryRef, firstRunDismissRef } so Commons, L3, Platformer receive consistent props (aligned with roomRuntime).
 * getStandaloneRoomPropsWithAudio adds audioCtx and onEnableAudio for rooms that need audio.
 * Vision: reduce duplication (§8); NEW-ROOM-TEMPLATE-v1.md §1.
 */
describe("getStandaloneRoomBaseProps", () => {
  it("returns room, onBack, onInputEvent, keymapRegistryRef, and firstRunDismissRef", () => {
    const setRoom = vi.fn();
    const logInputEvent = vi.fn();
    const p = {
      room: "COMMONS" as Room,
      setRoom,
      logInputEvent,
    } as unknown as AppRoomContentProps;

    const base = getStandaloneRoomBaseProps(p);

    expect(base).toHaveProperty("room", "COMMONS");
    expect(base).toHaveProperty("onBack");
    expect(base).toHaveProperty("onInputEvent");
    expect(base).toHaveProperty("keymapRegistryRef");
    expect(base).toHaveProperty("firstRunDismissRef");
    expect(typeof base.onBack).toBe("function");
    expect(typeof base.onInputEvent).toBe("function");
  });

  it("onBack calls setRoom with RESONANCE", () => {
    const setRoom = vi.fn();
    const p = {
      room: "L3LAB" as Room,
      setRoom,
      logInputEvent: vi.fn(),
    } as unknown as AppRoomContentProps;

    const base = getStandaloneRoomBaseProps(p);
    base.onBack();

    expect(setRoom).toHaveBeenCalledTimes(1);
    expect(setRoom).toHaveBeenCalledWith("RESONANCE");
  });

  it("onInputEvent forwards to logInputEvent", () => {
    const logInputEvent = vi.fn();
    const p = {
      room: "PLATFORMER" as Room,
      setRoom: vi.fn(),
      logInputEvent,
    } as unknown as AppRoomContentProps;

    const base = getStandaloneRoomBaseProps(p);
    const entry = { room: "PLATFORMER" as Room, type: "keydown" as const, key: " " };
    base.onInputEvent(entry);

    expect(logInputEvent).toHaveBeenCalledTimes(1);
    expect(logInputEvent).toHaveBeenCalledWith(entry);
  });
});

describe("getStandaloneRoomPropsWithAudio", () => {
  it("returns base props plus audioCtx and onEnableAudio for COMMONS, L3LAB, PLATFORMER, SANDBOX, TUNINGLAB", () => {
    const initAudio = vi.fn();
    const p = {
      room: "COMMONS" as Room,
      setRoom: vi.fn(),
      logInputEvent: vi.fn(),
      audioCtx: null as AudioContext | null,
      initAudio,
    } as unknown as AppRoomContentProps;

    const withAudio = getStandaloneRoomPropsWithAudio(p);

    expect(withAudio).toHaveProperty("room", "COMMONS");
    expect(withAudio).toHaveProperty("onBack");
    expect(withAudio).toHaveProperty("onInputEvent");
    expect(withAudio).toHaveProperty("keymapRegistryRef");
    expect(withAudio).toHaveProperty("firstRunDismissRef");
    expect(withAudio).toHaveProperty("audioCtx", null);
    expect(withAudio).toHaveProperty("onEnableAudio", initAudio);
  });
});

function createAppRoomContentProps(room: Room): AppRoomContentProps {
  const initAudio = vi.fn(async () => null);

  return {
    room,
    setRoom: vi.fn(),
    logInputEvent: vi.fn(),
    audioCtx: null,
    initAudio,
    topologyQuantizeRef: {
      current: {
        quantizeOn: false,
        quantizeBpm: 120,
        quantizeSubdivision: "16",
      },
    } as AppRoomContentProps["topologyQuantizeRef"],
    gameActive: false,
    gameHud: INITIAL_ARENA_HUD,
    startGameRun: vi.fn(),
    gameCanvasRef: { current: null },
    gameWidth: 1100,
    gameHeight: 580,
    resonanceRoomProps: {
      nexusCanvasRef: { current: null },
      nParamsUI: createDefaultResonanceState(),
      setDronePreset: vi.fn(),
      updateNParams: vi.fn(),
      nexusActive: false,
      setNexusActive: vi.fn(),
      initAudio,
      nexusRefs: { current: createInitialNexusRefsState(1100, 580) },
      droneVolume: 0.3,
      setDroneVolume: vi.fn(),
      enterArenaWorkspace: vi.fn(),
      triggerSectorPulse: vi.fn(),
      toggleNexusAgent: vi.fn(),
      setNexusAgentVolume: vi.fn(),
      hyperCalibUI: { running: false, tapCount: 0, doneAt: 0 },
      hyperCalib2UI: { running: false, moveCount: 0, clickCount: 0, doneAt: 0 },
      handleHyperCalibrateButton: vi.fn(),
      handleHyperCali2Button: vi.fn(),
      registerHyperCali2Move: vi.fn(),
      registerHyperCali2Click: vi.fn(),
      setSwarmProfile: vi.fn(),
      setSwarmCount: vi.fn(),
      setParticleSystem: vi.fn(),
      setChurchMode: vi.fn(),
      savePreset: vi.fn(),
      loadPreset: vi.fn(),
    } as AppRoomContentProps["resonanceRoomProps"],
  };
}

describe("AppRoomContent", () => {
  it.each(ROOMS_WITH_CONTENT)("renders %s without throwing through the room router", (room) => {
    const props = createAppRoomContentProps(room);

    expect(() => renderToString(createElement(AppRoomContent, props))).not.toThrow();
  });
});
