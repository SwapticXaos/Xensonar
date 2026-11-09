/**
 * Performance setlist domain: load/save, add/remove, next/prev (vision §2 §3).
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import type { HarmonicWorldExport } from "../harmonicWorld";
import {
  loadWorldSetlist,
  addToSetlist,
  removeFromSetlist,
  setlistGoNext,
  setlistGoPrev,
  getSetlistSlotExport,
  findSetlistIndexForExport,
  hasSetlistSlots,
} from "../worldSetlist";

function makeExport(overrides: Partial<HarmonicWorldExport> = {}): HarmonicWorldExport {
  return {
    version: 1,
    id: null,
    label: "Test World",
    description: null,
    baseFreq: 220,
    gridTuning: "ji",
    quantizeOn: true,
    quantizeBpm: 96,
    quantizeSubdivision: "16",
    tags: [],
    profile: { intensity: "balanced" },
    mood: null,
    exportedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("worldSetlist", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: () => {},
        clear: () => storage.clear(),
        key: () => null,
        length: 0,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads empty setlist when nothing stored", () => {
    const setlist = loadWorldSetlist();
    expect(setlist.slots).toHaveLength(0);
    expect(setlist.currentIndex).toBe(0);
  });

  it("adds world to setlist and persists", () => {
    const initial = loadWorldSetlist();
    const exportData = makeExport({ label: "First" });
    const next = addToSetlist(initial, exportData);
    expect(next.slots).toHaveLength(1);
    expect(next.currentIndex).toBe(0);
    expect(next.slots[0]?.label).toBe("First");
    const loaded = loadWorldSetlist();
    expect(loaded.slots).toHaveLength(1);
  });

  it("getSetlistSlotExport returns export at index or null", () => {
    const initial = loadWorldSetlist();
    const a = addToSetlist(initial, makeExport({ label: "A" }));
    const b = addToSetlist(a, makeExport({ label: "B" }));
    expect(getSetlistSlotExport(b, 0)?.label).toBe("A");
    expect(getSetlistSlotExport(b, 1)?.label).toBe("B");
    expect(getSetlistSlotExport(b, 2)).toBeNull();
    expect(getSetlistSlotExport(b, -1)).toBeNull();
  });

  it("setlistGoNext advances currentIndex and persists", () => {
    let s = loadWorldSetlist();
    s = addToSetlist(s, makeExport({ label: "1" }));
    s = addToSetlist(s, makeExport({ label: "2" }));
    expect(s.currentIndex).toBe(1);
    s = setlistGoNext(s);
    expect(s.currentIndex).toBe(1);
    s = setlistGoPrev(s);
    expect(s.currentIndex).toBe(0);
    s = setlistGoNext(s);
    expect(s.currentIndex).toBe(1);
    s = setlistGoNext(s);
    expect(s.currentIndex).toBe(1);
  });

  it("removeFromSetlist removes slot and adjusts currentIndex", () => {
    let s = loadWorldSetlist();
    s = addToSetlist(s, makeExport({ label: "A" }));
    s = addToSetlist(s, makeExport({ label: "B" }));
    s = addToSetlist(s, makeExport({ label: "C" }));
    expect(s.slots).toHaveLength(3);
    s = removeFromSetlist(s, 1);
    expect(s.slots.map((x) => x.label)).toEqual(["A", "C"]);
    expect(s.currentIndex).toBe(1);
    s = removeFromSetlist(s, 1);
    expect(s.slots.map((x) => x.label)).toEqual(["A"]);
    expect(s.currentIndex).toBe(0);
  });

  it("findSetlistIndexForExport returns index or -1", () => {
    let s = loadWorldSetlist();
    const exportA = makeExport({ id: "a", label: "A" });
    const exportB = makeExport({ id: "b", label: "B" });
    s = addToSetlist(s, exportA);
    s = addToSetlist(s, exportB);
    expect(findSetlistIndexForExport(s, exportA)).toBe(0);
    expect(findSetlistIndexForExport(s, exportB)).toBe(1);
    expect(findSetlistIndexForExport(s, makeExport({ id: "c" }))).toBe(-1);
  });

  it("hasSetlistSlots returns true only when slots exist", () => {
    expect(hasSetlistSlots(loadWorldSetlist())).toBe(false);
    const s = addToSetlist(loadWorldSetlist(), makeExport());
    expect(hasSetlistSlots(s)).toBe(true);
  });

  it("capping at MAX_SLOTS (8) when adding", () => {
    let s = loadWorldSetlist();
    for (let i = 0; i < 10; i++) {
      s = addToSetlist(s, makeExport({ label: `World ${i}` }));
    }
    expect(s.slots).toHaveLength(8);
  });
});
