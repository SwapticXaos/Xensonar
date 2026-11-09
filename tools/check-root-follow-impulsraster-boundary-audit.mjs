#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const srcRoot = path.join(root, "src");
let ok = true;
const fail = (message) => {
  console.error(`[check-root-follow-impulsraster-boundary-audit] ${message}`);
  ok = false;
};
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

function collectSourceFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (
        entry === "node_modules" ||
        entry === "dist" ||
        entry === "dist-modular"
      )
        continue;
      collectSourceFiles(full, acc);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

function findMatchingParen(text, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function splitTopLevelArgs(argsText) {
  const args = [];
  let start = 0;
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let quote = null;
  let escaped = false;
  for (let index = 0; index < argsText.length; index += 1) {
    const char = argsText[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") paren += 1;
    else if (char === ")") paren -= 1;
    else if (char === "{") brace += 1;
    else if (char === "}") brace -= 1;
    else if (char === "[") bracket += 1;
    else if (char === "]") bracket -= 1;
    else if (char === "," && paren === 0 && brace === 0 && bracket === 0) {
      args.push(argsText.slice(start, index).trim());
      start = index + 1;
    }
  }
  const tail = argsText.slice(start).trim();
  if (tail) args.push(tail);
  return args;
}

function lineForIndex(text, index) {
  return text.slice(0, index).split("\n").length;
}

const policyPath =
  "src/features/xensonar/rootFollow/rootFollowImpulseRasterPolicy.ts";
const policy = read(policyPath);
if (
  !policy.includes("export type RootFollowImpulseRasterPatternNormalizeArgs")
) {
  fail("RootFollow impulse raster policy should expose named normalize args.");
}
if (
  !policy.includes(
    "/** @deprecated Use the named form: `{ counterDiv, everyFallback }`. */",
  )
) {
  fail(
    "Legacy positional overload should be visibly deprecated while it remains available.",
  );
}
if (
  !policy.includes("normalizeRootFollowImpulseRasterPattern(value?.pattern, {")
) {
  fail(
    "Policy self-normalization should use the named form too, not its own legacy positional overload.",
  );
}

const requiredNamedCallsiteFragments = [
  [
    "src/features/xensonar/material/loopLaneUiState.ts",
    "counterDiv: params.rootFollowImpulsRasterEvery",
  ],
  [
    "src/features/xensonar/rootFollow/rootFollowLoopUiStorage.ts",
    "counterDiv: parsed.rootFollowImpulsRasterEvery",
  ],
  [
    "src/features/xensonar/rooms/materialLoopPanel/RootFollowImpulseRasterControls.tsx",
    "counterDiv: safeCounterDiv",
  ],
];
for (const [relPath, fragment] of requiredNamedCallsiteFragments) {
  const content = read(relPath);
  if (!content.includes(fragment)) {
    fail(
      `${relPath} should make the counterDiv intent explicit via named normalize args.`,
    );
  }
}

for (const file of collectSourceFiles(srcRoot)) {
  const rel = path.relative(root, file);
  if (rel === policyPath) continue;
  const content = fs.readFileSync(file, "utf8");
  const needle = "normalizeRootFollowImpulseRasterPattern";
  let searchIndex = 0;
  while (true) {
    const callIndex = content.indexOf(needle, searchIndex);
    if (callIndex === -1) break;
    searchIndex = callIndex + needle.length;
    const prefix = content.slice(Math.max(0, callIndex - 20), callIndex);
    if (/function\s+$/.test(prefix) || /export\s+function\s+$/.test(prefix))
      continue;
    const openIndex = content.indexOf("(", callIndex + needle.length);
    if (openIndex === -1) continue;
    const closeIndex = findMatchingParen(content, openIndex);
    if (closeIndex === -1) {
      fail(
        `Could not parse ${needle} call at ${rel}:${lineForIndex(content, callIndex)}.`,
      );
      continue;
    }
    const args = splitTopLevelArgs(content.slice(openIndex + 1, closeIndex));
    if (args.length >= 2 && !args[1].trim().startsWith("{")) {
      fail(
        `${rel}:${lineForIndex(content, callIndex)} should use named normalize args, not positional counterDiv/everyFallback.`,
      );
    }
  }
}

const impulseControls = read(
  "src/features/xensonar/rooms/materialLoopPanel/RootFollowImpulseRasterControls.tsx",
);
if (
  !impulseControls.includes(
    'data-xensonar-root-follow-impulsraster-expanded-overview="true"',
  )
) {
  fail(
    "Impulsraster boundary should use the 5.118 overview body instead of the 5.116 internal scroll viewport.",
  );
}
if (
  impulseControls.includes("overflow-x-auto overflow-y-auto overscroll-contain")
) {
  fail(
    "Impulsraster boundary should not hide the expanded body inside the old internal scroll viewport.",
  );
}
if (!impulseControls.includes('{expanded ? "Einklappen" : "Bearbeiten"}')) {
  fail("Impulsraster boundary should keep Einklappen/Bearbeiten affordance.");
}

if (
  !impulseControls.includes(
    "const ROOT_FOLLOW_IMPULSRASTER_PREVIEW_MIN_BARS = 4",
  ) ||
  !impulseControls.includes(
    "const ROOT_FOLLOW_IMPULSRASTER_PREVIEW_DEFAULT_BARS = 4",
  ) ||
  !impulseControls.includes("cycles: previewBars")
) {
  fail(
    "Impulsraster preview should default to at least four beat bars and use the previewBars state, not a fixed two-bar preview.",
  );
}
if (
  !impulseControls.includes(
    'data-xensonar-root-follow-impulsraster-preview-bars-input="true"',
  )
) {
  fail("Impulsraster preview should expose a compact preview-bar count input.");
}

if (!ok) process.exit(1);
console.log("[check-root-follow-impulsraster-boundary-audit] ok");
