import { describe, expect, it } from "vitest";

import {
  ROOM_LIFECYCLE_CONTRACT,
  useRoomLifecycle,
} from "../roomLifecycle";

describe("roomLifecycle contract", () => {
  it("exposes ROOM_LIFECYCLE_CONTRACT with mount and unmount guidance", () => {
    expect(ROOM_LIFECYCLE_CONTRACT).toBeDefined();
    expect(typeof ROOM_LIFECYCLE_CONTRACT.mount).toBe("string");
    expect(typeof ROOM_LIFECYCLE_CONTRACT.unmount).toBe("string");
    expect(ROOM_LIFECYCLE_CONTRACT.mount.length).toBeGreaterThan(0);
    expect(ROOM_LIFECYCLE_CONTRACT.unmount.length).toBeGreaterThan(0);
    expect(ROOM_LIFECYCLE_CONTRACT.mount.toLowerCase()).toMatch(/raf|input|audio/);
    expect(ROOM_LIFECYCLE_CONTRACT.unmount.toLowerCase()).toMatch(/raf|input|audio|cleanup/);
  });

  it("exports useRoomLifecycle as a function (room lifecycle helper)", () => {
    expect(typeof useRoomLifecycle).toBe("function");
  });
});
