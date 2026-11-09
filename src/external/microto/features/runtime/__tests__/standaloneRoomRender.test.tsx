import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ResonanceCommonsRoom } from "../../commons/ResonanceCommonsRoom";
import { Level3LabRoom } from "../../level3/Level3LabRoom";
import { SandboxRoom } from "../../sandbox/SandboxRoom";
import { TuningLabRoom } from "../../tuningLab/TuningLabRoom";

type StandaloneRoomCase = {
  label: string;
  room: "COMMONS" | "L3LAB" | "SANDBOX" | "TUNINGLAB";
  Component:
    | typeof ResonanceCommonsRoom
    | typeof Level3LabRoom
    | typeof SandboxRoom
    | typeof TuningLabRoom;
};

const STANDALONE_ROOM_CASES: StandaloneRoomCase[] = [
  { label: "ResonanceCommonsRoom", room: "COMMONS", Component: ResonanceCommonsRoom },
  { label: "Level3LabRoom", room: "L3LAB", Component: Level3LabRoom },
  { label: "SandboxRoom", room: "SANDBOX", Component: SandboxRoom },
  { label: "TuningLabRoom", room: "TUNINGLAB", Component: TuningLabRoom },
];

describe("standalone room render smoke tests", () => {
  it.each(STANDALONE_ROOM_CASES)(
    "renders $label without throwing through useStandaloneRoomRuntime",
    ({ Component, room }) => {
      expect(() =>
        renderToString(
          <Component
            room={room}
            onBack={vi.fn()}
          />,
        ),
      ).not.toThrow();
    },
  );
});
