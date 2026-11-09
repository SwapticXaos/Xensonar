/**
 * Locks Jump+Run composition preset persistence behavior.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  clearPlatformerCompositionPreset,
  exportPlatformerCompositionPresetLibrary,
  importPlatformerCompositionPresetLibrary,
  listPlatformerCompositionPresets,
  loadPlatformerCompositionPreset,
  loadPlatformerCompositionPresetById,
  removePlatformerCompositionPreset,
  saveNamedPlatformerCompositionPreset,
  savePlatformerCompositionPreset,
  type PlatformerCompositionPreset,
} from "../platformerPresetPersistence";

const STORAGE_KEY = "xensonar_platformer_composition_preset";

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
      for (const key of Object.keys(store)) delete store[key];
    },
  };
}

function createPreset(overrides: Partial<PlatformerCompositionPreset> = {}): PlatformerCompositionPreset {
  return {
    version: 1,
    savedAt: 12345,
    phrase: [0, 3, 7, 10],
    movementEvents: [
      { kind: "step", semi: 3, energy: 0.8, t: 0.1, lane: 1, airborne: false },
      { kind: "jump", semi: 7, energy: 0.9, t: 0.2, lane: 2, airborne: true },
    ],
    tuningMode: "ji",
    arrangementMode: "balanced",
    formMode: "auto",
    sectionBias: "auto",
    evolutionDepth: 0.68,
    tempoFollow: 0.62,
    bpm: 118,
    masterVolume: 0.6,
    composerOn: true,
    ...overrides,
  };
}

describe("platformerPresetPersistence", () => {
  beforeAll(() => {
    (globalThis as unknown as { localStorage: ReturnType<typeof createLocalStorageMock> }).localStorage =
      createLocalStorageMock();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it("saves and loads quick preset round-trip", () => {
    const preset = createPreset();
    savePlatformerCompositionPreset(preset);

    const loaded = loadPlatformerCompositionPreset();
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(
      expect.objectContaining({
        tuningMode: "ji",
        sectionBias: "auto",
        bpm: 118,
        phrase: [0, 3, 7, 10],
      }),
    );
  });

  it("returns null when quick preset missing", () => {
    expect(loadPlatformerCompositionPreset()).toBeNull();
  });

  it("round-trips obstacle movement events with detail metadata", () => {
    const preset = createPreset({
      movementEvents: [
        { kind: "sync_gate", semi: 11, energy: 0.84, t: 0.25, lane: 3, airborne: true, detail: 0.82 },
        { kind: "phase_gate", semi: 9, energy: 0.76, t: 0.4, lane: 4, airborne: false, detail: 2 },
        { kind: "tuning_crystal", semi: 14, energy: 0.9, t: 0.6, lane: 5, airborne: true, detail: -1 },
        { kind: "chord_fork", semi: 7, energy: 0.8, t: 0.8, lane: 2, airborne: false, detail: 1 },
        { kind: "silence_field", semi: 3, energy: 0.62, t: 1.1, lane: 1, airborne: false, detail: 0.74 },
      ],
    });

    savePlatformerCompositionPreset(preset);
    const loaded = loadPlatformerCompositionPreset();

    expect(loaded?.movementEvents).toEqual([
      { kind: "sync_gate", semi: 11, energy: 0.84, t: 0.25, lane: 3, airborne: true, ordinal: 0, detail: 0.82 },
      { kind: "phase_gate", semi: 9, energy: 0.76, t: 0.4, lane: 4, airborne: false, ordinal: 1, detail: 2 },
      { kind: "tuning_crystal", semi: 14, energy: 0.9, t: 0.6, lane: 5, airborne: true, ordinal: 2, detail: -1 },
      { kind: "chord_fork", semi: 7, energy: 0.8, t: 0.8, lane: 2, airborne: false, ordinal: 3, detail: 1 },
      { kind: "silence_field", semi: 3, energy: 0.62, t: 1.1, lane: 1, airborne: false, ordinal: 4, detail: 0.74 },
    ]);
  });

  it("saves and lists named presets newest first", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1000);
    const listA = saveNamedPlatformerCompositionPreset("Loop A", createPreset({ phrase: [1, 2, 3] }));
    const firstId = listA[0]?.id;
    nowSpy.mockReturnValueOnce(2000);
    const listB = saveNamedPlatformerCompositionPreset("Loop B", createPreset({ phrase: [7, 8, 9] }));
    nowSpy.mockRestore();

    expect(firstId).toBeTruthy();
    expect(listB).toHaveLength(2);
    expect(listB[0]?.name).toBe("Loop B");
    expect(listB[1]?.name).toBe("Loop A");
    expect(listPlatformerCompositionPresets()).toHaveLength(2);
  });

  it("loads and removes preset by id", () => {
    const saved = saveNamedPlatformerCompositionPreset("Delete Me", createPreset());
    const id = saved[0]?.id;
    expect(id).toBeTruthy();

    const loaded = loadPlatformerCompositionPresetById(id!);
    expect(loaded).not.toBeNull();
    expect(loaded?.phrase).toEqual([0, 3, 7, 10]);

    const next = removePlatformerCompositionPreset(id!);
    expect(next).toHaveLength(0);
    expect(loadPlatformerCompositionPresetById(id!)).toBeNull();
  });

  it("updates existing named preset when id is provided", () => {
    const saved = saveNamedPlatformerCompositionPreset("Session 1", createPreset({ phrase: [1, 1, 1] }));
    const id = saved[0]?.id;
    expect(id).toBeTruthy();

    const next = saveNamedPlatformerCompositionPreset("Session 1 Updated", createPreset({ phrase: [5, 6, 7] }), id);
    expect(next).toHaveLength(1);
    expect(next[0]?.name).toBe("Session 1 Updated");

    const loaded = loadPlatformerCompositionPresetById(id!);
    expect(loaded?.phrase).toEqual([5, 6, 7]);
  });

  it("sanitizes invalid fields on load", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        items: [{
          id: "test-id",
          name: "",
          savedAt: -1,
          preset: {
            version: 1,
            savedAt: -2,
            phrase: [1, "bad", 999],
            movementEvents: [
              { kind: "step", semi: 999, energy: 99, t: -4, lane: 1234, airborne: 0 },
              { kind: "phase_gate", semi: 2, energy: 0.4, t: 0.1, lane: 0, airborne: false, detail: 99 },
              { kind: "silence_field", semi: -8, energy: 0.1, t: 0.2, lane: 2, airborne: true, detail: -99 },
              { kind: "bad_kind", semi: 2, energy: 0.2, t: 0.1, lane: 0, airborne: false },
            ],
            tuningMode: "unknown",
            arrangementMode: "broken",
            formMode: "weird",
            sectionBias: "strange",
            evolutionDepth: 8,
            tempoFollow: -3,
            bpm: 999,
            masterVolume: -2,
            composerOn: "yes",
          },
        }],
      }),
    );

    const listed = listPlatformerCompositionPresets();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(
      expect.objectContaining({
        id: "test-id",
        name: "Session Loop",
      }),
    );
    expect(listed[0]?.preset).toEqual(
      expect.objectContaining({
        tuningMode: "12edo",
        arrangementMode: "balanced",
        formMode: "auto",
        sectionBias: "auto",
        evolutionDepth: 1,
        tempoFollow: 0,
        bpm: 200,
        masterVolume: 0,
        composerOn: true,
        phrase: [1, 48],
      }),
    );
    expect(listed[0]?.preset.movementEvents).toEqual([
      { kind: "step", semi: 48, energy: 1, t: 0, lane: 64, airborne: false, ordinal: 0 },
      { kind: "phase_gate", semi: 2, energy: 0.4, t: 0.1, lane: 0, airborne: false, ordinal: 1, detail: 8 },
      { kind: "silence_field", semi: -8, energy: 0.1, t: 0.2, lane: 2, airborne: true, ordinal: 2, detail: -8 },
    ]);
  });

  it("migrates legacy single-preset storage payload", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: 456,
        phrase: [0, 2, 5],
        movementEvents: [{ kind: "step", semi: 2, energy: 0.7, t: 0.2, lane: 1, airborne: false }],
        tuningMode: "bp",
        arrangementMode: "cinematic",
        formMode: "abca",
        sectionBias: "B",
        evolutionDepth: 0.42,
        tempoFollow: 0.8,
        bpm: 120,
        masterVolume: 0.5,
        composerOn: false,
      }),
    );
    const listed = listPlatformerCompositionPresets();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe("Legacy Quick Save");
    expect(listed[0]?.preset.tuningMode).toBe("bp");
    expect(listed[0]?.preset.arrangementMode).toBe("cinematic");
    expect(listed[0]?.preset.formMode).toBe("abca");
    expect(listed[0]?.preset.sectionBias).toBe("B");
    expect(listed[0]?.preset.evolutionDepth).toBe(0.42);
    expect(listed[0]?.preset.tempoFollow).toBe(0.8);
  });

  it("clear removes all presets", () => {
    saveNamedPlatformerCompositionPreset("One", createPreset());
    expect(listPlatformerCompositionPresets().length).toBeGreaterThan(0);
    clearPlatformerCompositionPreset();
    expect(listPlatformerCompositionPresets()).toHaveLength(0);
  });

  it("does not store empty preset data", () => {
    saveNamedPlatformerCompositionPreset("Empty", createPreset({ phrase: [], movementEvents: [] }));
    expect(listPlatformerCompositionPresets()).toHaveLength(0);
  });

  it("exports and re-imports library payload", () => {
    saveNamedPlatformerCompositionPreset("Export A", createPreset({ phrase: [1, 2, 3] }));
    saveNamedPlatformerCompositionPreset("Export B", createPreset({ phrase: [7, 8, 9] }));
    const raw = exportPlatformerCompositionPresetLibrary();

    clearPlatformerCompositionPreset();
    const result = importPlatformerCompositionPresetLibrary(raw, "replace");

    expect(result.imported).toBe(2);
    expect(result.rejected).toBe(0);
    expect(result.items).toHaveLength(2);
    expect(listPlatformerCompositionPresets()).toHaveLength(2);
  });

  it("imports with merge and replace modes", () => {
    saveNamedPlatformerCompositionPreset("Keep", createPreset({ phrase: [0, 1, 2] }));
    const source = {
      version: 1,
      items: [{
        id: "imported-slot",
        name: "Imported",
        savedAt: 9999,
        preset: createPreset({ phrase: [9, 9, 9], savedAt: 9999, arrangementMode: "glitch" }),
      }],
    };

    const mergeResult = importPlatformerCompositionPresetLibrary(JSON.stringify(source), "merge");
    expect(mergeResult.imported).toBe(1);
    expect(mergeResult.items).toHaveLength(2);

    const replaceResult = importPlatformerCompositionPresetLibrary(JSON.stringify(source), "replace");
    expect(replaceResult.imported).toBe(1);
    expect(replaceResult.items).toHaveLength(1);
    expect(replaceResult.items[0]?.id).toBe("imported-slot");
    expect(replaceResult.items[0]?.preset.arrangementMode).toBe("glitch");
  });

  it("reports invalid import payloads", () => {
    saveNamedPlatformerCompositionPreset("Baseline", createPreset());

    const badJson = importPlatformerCompositionPresetLibrary("{ not-json", "merge");
    expect(badJson.imported).toBe(0);
    expect(badJson.rejected).toBe(1);
    expect(badJson.items).toHaveLength(1);

    const badItems = importPlatformerCompositionPresetLibrary(JSON.stringify({ version: 1, items: [{ foo: 1 }] }), "merge");
    expect(badItems.imported).toBe(0);
    expect(badItems.rejected).toBe(1);
    expect(badItems.items).toHaveLength(1);
  });
});
