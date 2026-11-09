/**
 * Locks session memory: last content room persist/resume (vision §5 discoverability).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLastContentRoom, setLastContentRoom } from "../sessionMemory";

describe("sessionMemory", () => {
  const storage: Record<string, string> = {};
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        for (const k of Object.keys(storage)) delete storage[k];
      },
      length: 0,
      key: () => null,
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when storage is empty", () => {
    expect(getLastContentRoom()).toBeNull();
  });

  it("returns null when stored value is not a content room", () => {
    storage["xensonar_last_content_room"] = "MAIN";
    expect(getLastContentRoom()).toBeNull();
    storage["xensonar_last_content_room"] = "NEXUS";
    expect(getLastContentRoom()).toBeNull();
    storage["xensonar_last_content_room"] = "INVALID";
    expect(getLastContentRoom()).toBeNull();
  });

  it("returns room when stored value is a content room", () => {
    setLastContentRoom("RESONANCE");
    expect(getLastContentRoom()).toBe("RESONANCE");
    setLastContentRoom("PLATFORMER");
    expect(getLastContentRoom()).toBe("PLATFORMER");
  });

  it("does not persist MAIN or NEXUS (only content rooms overwrite)", () => {
    setLastContentRoom("RESONANCE");
    expect(getLastContentRoom()).toBe("RESONANCE");
    setLastContentRoom("MAIN");
    expect(getLastContentRoom()).toBe("RESONANCE");
    setLastContentRoom("NEXUS");
    expect(getLastContentRoom()).toBe("RESONANCE");
  });
});
