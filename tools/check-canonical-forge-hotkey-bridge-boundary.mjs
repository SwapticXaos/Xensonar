#!/usr/bin/env node
import fs from 'node:fs';

const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const hookPath = 'src/features/l3lab/canonicalForge/useCanonicalForgeHotkeyBridge.ts';

const fail = (message) => {
  console.error(`[canonical-forge-hotkey-bridge-boundary] ${message}`);
  process.exit(1);
};

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : fail(`missing ${path}`);
const room = read(roomPath);
const hook = read(hookPath);

if (!room.includes("import { useCanonicalForgeHotkeyBridge } from './useCanonicalForgeHotkeyBridge';")) {
  fail('CanonicalForgeRoom must import useCanonicalForgeHotkeyBridge.');
}

if (!room.includes('useCanonicalForgeHotkeyBridge({')) {
  fail('CanonicalForgeRoom must delegate global undo/redo + stamp fallback hotkeys to useCanonicalForgeHotkeyBridge.');
}

const bridgeIndex = room.indexOf('useCanonicalForgeHotkeyBridge({');
const bridgeBlock = room.slice(bridgeIndex, bridgeIndex + 700);
for (const required of [
  'forgeHotkeyScopeActiveRef',
  'performActiveUndo',
  'performActiveRedo',
  'handleStampTransformKey',
]) {
  if (!bridgeBlock.includes(required)) {
    fail(`hotkey bridge call is missing ${required}.`);
  }
}

const forbiddenRoomPatterns = [
  "event.ctrlKey || event.metaKey",
  "window.addEventListener('keydown', onKey)",
  "key === 'y' || (key === 'z' && event.shiftKey)",
  "handleStampTransformKey(event, 'fallback');",
];
for (const forbidden of forbiddenRoomPatterns) {
  if (room.includes(forbidden)) {
    fail(`CanonicalForgeRoom still owns global hotkey bridge detail: ${forbidden}`);
  }
}

for (const required of [
  'export function useCanonicalForgeHotkeyBridge',
  "window.addEventListener('keydown', onKey)",
  "event.ctrlKey || event.metaKey",
  "performActiveUndo();",
  "performActiveRedo();",
  "handleStampTransformKey(event, 'fallback');",
  'isEditableKeyboardTarget',
]) {
  if (!hook.includes(required)) {
    fail(`hotkey bridge hook is missing required detail: ${required}`);
  }
}

for (const forbidden of [
  'audioEngine',
  'createCanonicalSourcePreviewController',
  'createMelodicPreviewTransportController',
  'localStorage',
  'sessionStorage',
  'requestAnimationFrame',
  'setInterval',
]) {
  if (hook.includes(forbidden)) {
    fail(`hotkey bridge must stay input/lifecycle-only; found: ${forbidden}`);
  }
}

const roomLines = room.split(/\r?\n/).length;
if (roomLines > 1735) {
  fail(`CanonicalForgeRoom exceeds hotkey bridge boundary threshold (${roomLines} > 1735).`);
}

console.log(JSON.stringify({ ok: true, roomLines, hookLines: hook.split(/\r?\n/).length }, null, 2));
