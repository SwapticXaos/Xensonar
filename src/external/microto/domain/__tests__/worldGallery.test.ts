import { describe, expect, it } from "vitest";
import { WORLD_GALLERY, WORLD_JOURNEYS } from "../worldGallery";

describe("worldGallery", () => {
  it("WORLD_GALLERY exports have stable unique ids when present", () => {
    const ids = WORLD_GALLERY.map((w) => w.id).filter((id): id is string => Boolean(id));
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("WORLD_JOURNEYS reference only gallery world ids", () => {
    const galleryIds = new Set(WORLD_GALLERY.map((w) => w.id).filter((id): id is string => Boolean(id)));
    const missing: Array<{ journeyId: string; worldId: string }> = [];
    for (const journey of WORLD_JOURNEYS) {
      for (const worldId of journey.worldIds) {
        if (!galleryIds.has(worldId)) {
          missing.push({ journeyId: journey.id, worldId });
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

