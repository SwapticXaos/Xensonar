#!/usr/bin/env node
import fs from 'node:fs';

const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const buildersPath = 'src/features/l3lab/canonicalForge/canonicalControllerArgBuilders.ts';

const fail = (message) => {
  console.error(`[canonical-forge-preview-controller-args-boundary] ${message}`);
  process.exit(1);
};

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : fail(`missing ${path}`);
const room = read(roomPath);
const builders = read(buildersPath);

if (!room.includes('flattenCanonicalControllerArgGroups<CanonicalSourcePreviewControllerArgs>')) {
  fail('CanonicalForgeRoom must use generic grouped flattener for preview args.');
}

if (!builders.includes('export type CanonicalSourcePreviewControllerArgs')) {
  fail('canonicalControllerArgBuilders must export CanonicalSourcePreviewControllerArgs.');
}

if (!builders.includes("import { createCanonicalSourcePreviewController } from './canonicalSourcePreviewController';")) {
  fail('canonicalControllerArgBuilders must type preview args against createCanonicalSourcePreviewController.');
}

const createIndex = room.indexOf('createCanonicalSourcePreviewController(');
if (createIndex < 0) {
  fail('CanonicalForgeRoom no longer wires createCanonicalSourcePreviewController.');
}
const previewControllerBlock = room.slice(createIndex, createIndex + 2600);
if (!previewControllerBlock.includes('flattenCanonicalControllerArgGroups<CanonicalSourcePreviewControllerArgs>({')) {
  fail('createCanonicalSourcePreviewController must receive grouped args through the generic flattener.');
}
for (const group of ['state:', 'refs:', 'deps:', 'actions:']) {
  if (!previewControllerBlock.includes(group)) {
    fail(`preview controller args must be grouped by ${group}`);
  }
}
for (const required of [
  'previewAudioRef',
  'sourceAuditionCtxRef',
  'sourceAuditionModeRef',
  'selectionLoopPreviewCtxRef',
  'selectionLoopPreviewAnimationRef',
  'selectionLoopPreviewPlaying',
  'stopAllForge2Preview',
  'setSelectionLoopPreviewPlaying',
]) {
  if (!previewControllerBlock.includes(required)) {
    fail(`preview args group is missing required field: ${required}`);
  }
}

for (const forbidden of [
  'buildCanonicalSourcePreviewControllerArgs',
  'startForgeSelectionLoopPreview',
  'stopForgePreviewAudio',
  'toggleForgeSelectionLoopPreview',
  'AudioContext()',
  'window.addEventListener',
  'setInterval',
  'requestAnimationFrame',
]) {
  if (builders.includes(forbidden)) {
    fail(`controller arg file must remain thin/generic; found: ${forbidden}`);
  }
}

const roomLines = room.split(/\r?\n/).length;
if (roomLines > 1735) {
  fail(`CanonicalForgeRoom exceeds preview controller args boundary threshold (${roomLines} > 1735).`);
}

console.log(JSON.stringify({ ok: true, roomLines, argFileLines: builders.split(/\r?\n/).length }, null, 2));
