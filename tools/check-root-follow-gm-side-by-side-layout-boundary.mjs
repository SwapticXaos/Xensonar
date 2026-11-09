import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let ok = true;
const fail = (msg) => {
  console.error(`[check-root-follow-gm-side-by-side-layout-boundary] ${msg}`);
  ok = false;
};
const expect = (cond, msg) => {
  if (!cond) fail(msg);
};

const layoutPath =
  "src/features/xensonar/rooms/materialLoopPanel/rootFollowSideBySideLayout.ts";
const loopDialogPath =
  "src/features/xensonar/rooms/materialLoopPanel/LoopBankManagerDialog.tsx";
const gmDialogPath =
  "src/features/xensonar/rooms/materialLoopPanel/RootFollowGranularManagerDialog.tsx";
const layout = read(layoutPath);
const loopDialog = read(loopDialogPath);
const gmDialog = read(gmDialogPath);

expect(
  layout.includes("ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT"),
  "Shared side-by-side layout contract missing",
);
expect(
  layout.includes('leftDialogClass: "h-[calc(100vh-1.5rem)] max-w-[64rem]"') ||
    layout.includes("leftDialogClass: 'h-[calc(100vh-1.5rem)] max-w-[64rem]'"),
  "RFL side-by-side window should use more of the previous RFL/GM gap without overlapping the GM",
);
expect(
  layout.includes(
    'rightDialogClass: "pointer-events-auto h-[calc(100vh-1.5rem)] max-w-[42rem]"',
  ) ||
    layout.includes(
      "rightDialogClass: 'pointer-events-auto h-[calc(100vh-1.5rem)] max-w-[42rem]'",
    ),
  "GM side-by-side window should stay constrained while RFL takes more of the previous gap",
);
expect(
  layout.includes("rightOverlayClass:") &&
    layout.includes(
      "pointer-events-none items-start justify-end bg-transparent px-3 pb-3 pt-3",
    ),
  "GM side-by-side overlay should top-align with a narrow RFL/GM gap",
);
expect(
  loopDialog.includes("ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.leftDialogClass"),
  "RFL dialog must consume shared side-by-side width contract",
);
expect(
  loopDialog.includes("ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.leftOverlayClass"),
  "RFL overlay must consume shared side-by-side overlay contract",
);
expect(
  gmDialog.includes("ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.rightDialogClass"),
  "GM dialog must consume shared side-by-side width contract",
);
expect(
  gmDialog.includes("ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.rightOverlayClass"),
  "GM overlay must consume shared side-by-side overlay contract",
);
expect(
  !loopDialog.includes("max-w-[62rem]"),
  "Old RFL side-by-side width leaves too little GM clearance",
);
expect(
  !gmDialog.includes("max-w-[50rem]"),
  "Old GM side-by-side width can overlap RFL on presentation-sized viewports",
);
expect(
  gmDialog.includes(
    'data-xensonar-granular-manager-pitch-audition-rail="bounded"',
  ),
  "GM side-by-side patch must include the bounded pitch rail between RFL and GM controls",
);

if (!ok) process.exit(1);
console.log("[check-root-follow-gm-side-by-side-layout-boundary] ok");
