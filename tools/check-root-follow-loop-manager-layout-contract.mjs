import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dialogPath =
  "src/features/xensonar/rooms/materialLoopPanel/LoopBankManagerDialog.tsx";
const dialog = fs.readFileSync(path.join(root, dialogPath), "utf8");
const iconBadge = fs.readFileSync(
  path.join(root, "src/features/xensonar/rooms/RootFollowIconBadge.tsx"),
  "utf8",
);
let ok = true;
const fail = (msg) => {
  console.error(`[check-root-follow-loop-manager-layout-contract] ${msg}`);
  ok = false;
};
const expect = (cond, msg) => {
  if (!cond) fail(msg);
};

const sideBySideLayout = fs.readFileSync(
  path.join(
    root,
    "src/features/xensonar/rooms/materialLoopPanel/rootFollowSideBySideLayout.ts",
  ),
  "utf8",
);
expect(
  dialog.includes("ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT.leftDialogClass"),
  "Root-Follow loop manager should use shared GM side-by-side width contract",
);
expect(
  sideBySideLayout.includes("rightDialogClass"),
  "Shared GM side-by-side layout contract missing right dialog lane",
);
expect(
  sideBySideLayout.includes("h-[calc(100vh-1.5rem)]"),
  "RFL/GM side-by-side layout should align window heights",
);
expect(
  dialog.includes('<RootFollowIconBadge variant="window" />'),
  "Root-Follow window icon should use the shared white-circle badge",
);
expect(
  iconBadge.includes("data-xensonar-root-follow-icon-bg"),
  "Shared Root-Follow icon should expose the white-circle background marker",
);

expect(
  dialog.includes("const renderLoopImportControls ="),
  "Loop import controls should be a reusable local render fragment, not duplicated grid blocks",
);
expect(
  dialog.includes("data-xensonar-loop-import-placement={") &&
    dialog.includes(
      'prioritizeDetailControls ? \"edit-column\" : \"grid-column\"',
    ),
  "Loop import placement marker must distinguish RFL edit-column layout from normal grid layout",
);
expect(
  dialog.includes("? renderLoopImportControls(") &&
    dialog.includes(
      "mt-3 rounded border border-cyan-700/70 bg-cyan-950/20 p-3",
    ),
  "When detail controls are prioritized, Loop-Import should sit under the edit/delete controls instead of below the left RFL controls",
);
expect(
  dialog.includes(
    "{!prioritizeDetailControls ? renderLoopImportControls() : null}",
  ),
  "Normal material-loop manager should still render Loop-Import in the grid column",
);
expect(
  dialog.includes("prioritizeDetailControls"),
  "RFL manager layout split contract missing",
);
expect(
  dialog.includes("afterImportControls"),
  "RFL manager must be able to place GM/hotkey tools under Loop-Import",
);
expect(
  dialog.includes("editColumnLowerControls"),
  "RFL manager must be able to place tonal anchor lower in the right edit column",
);
expect(
  dialog.includes('data-xensonar-rfl-tools-under-loop-import="true"'),
  "RFL tools should have an explicit under-import placement marker",
);
expect(
  dialog.includes('data-xensonar-rfl-edit-column-lower-controls="true"'),
  "Tonal anchor lower-right-column slot should have an explicit placement marker",
);

const loopImportOccurrences = (dialog.match(/Loop-Import/g) ?? []).length;
expect(
  loopImportOccurrences === 1,
  `Loop-Import visible label should be defined once in the shared render fragment, found ${loopImportOccurrences}`,
);

if (!ok) process.exit(1);
console.log("[check-root-follow-loop-manager-layout-contract] ok");
