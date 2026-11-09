import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { JumpRunSoundtrackRoom } from "../JumpRunSoundtrackRoom";

describe("JumpRunSoundtrackRoom", () => {
  it("renders without throwing through the standalone runtime path", () => {
    expect(() =>
      renderToString(
        <JumpRunSoundtrackRoom
          room="PLATFORMER"
          onBack={vi.fn()}
        />,
      ),
    ).not.toThrow();
  });
});
