/**
 * Locks preset save/load contract (vision §6: preset as named domain).
 * usePresetHandlers composes these; persistence is the single storage boundary.
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { createDefaultResonanceState } from "../config/defaults";
import { loadResonancePreset, saveResonancePreset } from "../presetPersistence";

const STORAGE_KEY = "xensonar_resonance_preset"; // must match presetPersistence.ts

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
}

describe("presetPersistence", () => {
  beforeAll(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof createLocalStorageMock> }).localStorage =
      createLocalStorageMock();
  });

  afterEach(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof createLocalStorageMock> }).localStorage.removeItem(
      STORAGE_KEY,
    );
  });

  it("saveResonancePreset writes state to localStorage", () => {
    const state = createDefaultResonanceState();
    saveResonancePreset(state);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as unknown;
    expect(parsed).toEqual(expect.objectContaining({ gridBase: state.gridBase, gridOn: state.gridOn }));
  });

  it("loadResonancePreset returns null when no preset stored", () => {
    expect(loadResonancePreset()).toBeNull();
  });

  it("loadResonancePreset returns parsed state after save (round-trip)", () => {
    const state = createDefaultResonanceState();
    saveResonancePreset(state);
    const loaded = loadResonancePreset();
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(expect.objectContaining({ gridBase: state.gridBase, gridOn: state.gridOn }));
  });

  it("loadResonancePreset returns null for invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not json");
    expect(loadResonancePreset()).toBeNull();
  });

  it("loadResonancePreset returns null for non-object stored value", () => {
    localStorage.setItem(STORAGE_KEY, "42");
    expect(loadResonancePreset()).toBeNull();
  });
});
