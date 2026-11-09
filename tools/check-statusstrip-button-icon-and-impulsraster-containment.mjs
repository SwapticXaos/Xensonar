import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
let ok = true;
const fail = (msg) => {
  console.error(
    `[check-statusstrip-button-icon-and-impulsraster-containment] ${msg}`,
  );
  ok = false;
};
const expect = (cond, msg) => {
  if (!cond) fail(msg);
};

const strip = read("src/features/xensonar/rooms/ResonanceStatusStrip.tsx");
const dialog = read(
  "src/features/xensonar/rooms/materialLoopPanel/LoopBankManagerDialog.tsx",
);
const panel = read(
  "src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx",
);
const impulseControls = read(
  "src/features/xensonar/rooms/materialLoopPanel/RootFollowImpulseRasterControls.tsx",
);
const hotkeys = read(
  "src/features/xensonar/material/materialLoopHotkeyRouting.ts",
);
const iconBadge = read("src/features/xensonar/rooms/RootFollowIconBadge.tsx");

const fixedTopButtons = (
  strip.match(/inline-flex h-6 max-w-\[8\.4rem\]/g) ?? []
).length;
expect(
  fixedTopButtons >= 4,
  `Statusstrip loop buttons should share the same fixed height; found ${fixedTopButtons}`,
);
expect(
  strip.includes('<RootFollowIconBadge variant="status" />'),
  "Root-Follow status strip should use the shared icon badge",
);
expect(
  iconBadge.includes("absolute h-3.5 w-3.5 rounded-full bg-white"),
  "Root-Follow shared icon should use a smaller white circle behind the icon",
);
expect(
  !strip.includes(
    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white",
  ),
  "Root-Follow status icon must not use the old oversized badge",
);
expect(
  dialog.includes('<RootFollowIconBadge variant="window" />'),
  "Root-Follow dialog icon should use the shared icon badge",
);
expect(
  hotkeys.includes("event.code === 'Backquote'"),
  "^/° hotkey toggle must remain physical Backquote-based on German keyboards",
);
expect(
  !hotkeys.includes("event.key ==="),
  "^/° hotkey toggle should not depend on layout-sensitive event.key values",
);

expect(
  panel.includes("import { RootFollowImpulseRasterControls }"),
  "Impulsraster controls should be extracted from the large material loop panel",
);
expect(
  impulseControls.includes('{expanded ? "Einklappen" : "Bearbeiten"}'),
  "Impulsraster collapse affordance should say Einklappen, not Weniger",
);
expect(
  impulseControls.includes(
    'data-xensonar-root-follow-impulsraster-pip-preview="contained-grid"',
  ),
  "Impulsraster preview pips must be constrained in a contained grid",
);
expect(
  impulseControls.includes(
    'data-xensonar-root-follow-impulsraster-preview-group="wrapped"',
  ),
  "Impulsraster preview groups must wrap instead of growing horizontally",
);
expect(
  impulseControls.includes(
    'data-xensonar-root-follow-impulsraster-expanded-overview="true"',
  ),
  "Expanded Impulsraster should show an overview body instead of hiding controls in an internal scroll viewport",
);
expect(
  !impulseControls.includes(
    "overflow-x-auto overflow-y-auto overscroll-contain",
  ),
  "Expanded Impulsraster should not solve overview by adding the 5.116 internal scroll viewport",
);
expect(
  impulseControls.includes("bg-neutral-950/95") &&
    impulseControls.includes("shadow-xl shadow-black/45"),
  "Expanded Impulsraster must be opaque/dominant rather than a transparent ineffective overlap",
);
expect(
  impulseControls.includes(
    "const ROOT_FOLLOW_IMPULSRASTER_PREVIEW_COLUMNS = 32",
  ),
  "Impulsraster preview column cap should be named and widened for overview mode",
);
expect(
  impulseControls.includes(
    "const ROOT_FOLLOW_IMPULSRASTER_PREVIEW_MIN_BARS = 4",
  ) &&
    impulseControls.includes(
      "const ROOT_FOLLOW_IMPULSRASTER_PREVIEW_DEFAULT_BARS = 4",
    ),
  "Impulsraster preview must keep at least four visible beat bars for polyrhythm analysis",
);
expect(
  impulseControls.includes(
    'data-xensonar-root-follow-impulsraster-preview-bars-input="true"',
  ),
  "Impulsraster preview should expose a compact visible beat-bar count control",
);
expect(
  impulseControls.includes("cycles: previewBars"),
  "Impulsraster preview groups should follow the user-set previewBars value",
);
expect(
  impulseControls.includes(
    "const ROOT_FOLLOW_IMPULSRASTER_PATTERN_COLUMNS = 16",
  ),
  "Root-Follow segment pattern column cap should be named and wide enough for overview mode",
);
expect(
  impulseControls.includes(
    "maxColumns={ROOT_FOLLOW_IMPULSRASTER_PATTERN_COLUMNS}",
  ),
  "Root-Follow segment pattern should use the named column cap",
);
expect(
  panel.includes(
    'className="min-w-0 max-w-full rounded border border-violet-900/50',
  ),
  "Root-Follow manager details must not expand the edit grid sideways",
);
expect(
  panel.includes("editColumnLowerControls={rootFollowAnchorLowerControls}"),
  "Tonaler Anker should live in the right edit column, not in the Root-Follow detail column",
);
expect(
  dialog.includes('data-xensonar-rfl-edit-column-lower-controls="true"'),
  "Loop manager should expose lower right-column controls for the tonal anchor",
);
expect(
  panel.includes('data-xensonar-rfl-detail-summary="hover-compact"'),
  "Verbose Root-Follow detail summary should be compact in view and moved to a hover title",
);
expect(
  dialog.includes("xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"),
  "Loop manager edit/detail grid must use minmax columns to prevent child overflow over the edit column",
);
expect(
  dialog.includes('<div className="min-w-0 max-w-full">{detailControls}</div>'),
  "Prioritized detail controls should be wrapped in a width-contained column",
);
const normalImportRenders = (
  dialog.match(
    /!prioritizeDetailControls \? renderLoopImportControls\(\) : null/g,
  ) ?? []
).length;
expect(
  normalImportRenders === 1,
  `Normal loop import controls should render once; found ${normalImportRenders}`,
);

if (!ok) process.exit(1);
console.log("[check-statusstrip-button-icon-and-impulsraster-containment] ok");
