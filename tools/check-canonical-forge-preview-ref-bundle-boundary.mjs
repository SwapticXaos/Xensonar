#!/usr/bin/env node
import fs from 'node:fs';

const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const hookPath = 'src/features/l3lab/canonicalForge/useCanonicalForgePreviewRefs.ts';

const fail = (message) => {
  console.error(`[canonical-forge-preview-ref-bundle-boundary] ${message}`);
  process.exit(1);
};

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : fail(`missing ${path}`);
const room = read(roomPath);
const hook = read(hookPath);

if (!room.includes("import { useCanonicalForgePreviewRefs } from './useCanonicalForgePreviewRefs';")) {
  fail('CanonicalForgeRoom must import useCanonicalForgePreviewRefs.');
}

if (!room.includes('} = useCanonicalForgePreviewRefs();')) {
  fail('CanonicalForgeRoom must obtain preview refs from useCanonicalForgePreviewRefs.');
}

for (const forbidden of [
  'const audioPreviewRef = useRef<HTMLAudioElement | null>',
  'const selectionLoopPreviewCtxRef = useRef<AudioContext | null>',
  'const selectionLoopPreviewSourceRef = useRef<AudioBufferSourceNode | null>',
  'const selectionLoopPreviewGainRef = useRef<GainNode | null>',
  'const selectionLoopPreviewStartTimeRef = useRef(0)',
  'const selectionLoopPreviewDurationRef = useRef(0)',
  'const selectionLoopPreviewAnimationRef = useRef<number | null>',
  'const sourceAuditionCtxRef = useRef<AudioContext | null>',
  'const sourceAuditionSourceRef = useRef<AudioBufferSourceNode | null>',
  'const sourceAuditionGainRef = useRef<GainNode | null>',
  'const sourceAuditionStartTimeRef = useRef(0)',
  'const sourceAuditionDurationRef = useRef(0)',
  'const sourceAuditionAnimationRef = useRef<number | null>',
  "const sourceAuditionModeRef = useRef<'sourceWindow' | 'sourceFull' | null>",
]) {
  if (room.includes(forbidden)) {
    fail(`CanonicalForgeRoom still locally owns preview ref detail: ${forbidden}`);
  }
}

for (const required of [
  'export function useCanonicalForgePreviewRefs',
  'audioPreviewRef',
  'selectionLoopPreviewCtxRef',
  'selectionLoopPreviewSourceRef',
  'selectionLoopPreviewGainRef',
  'selectionLoopPreviewStartTimeRef',
  'selectionLoopPreviewDurationRef',
  'selectionLoopPreviewAnimationRef',
  'sourceAuditionCtxRef',
  'sourceAuditionSourceRef',
  'sourceAuditionGainRef',
  'sourceAuditionStartTimeRef',
  'sourceAuditionDurationRef',
  'sourceAuditionAnimationRef',
  'sourceAuditionModeRef',
]) {
  if (!hook.includes(required)) {
    fail(`preview ref hook is missing required contract: ${required}`);
  }
}

for (const forbidden of [
  'audioEngine',
  'createCanonicalSourcePreviewController',
  'startForgeSelectionLoopPreview',
  'stopForgePreviewAudio',
  'window.addEventListener',
  'document.',
  'setStatus',
  'setIsPlaying',
  'setPlayheadPosition',
]) {
  if (hook.includes(forbidden)) {
    fail(`preview ref hook must stay ref-only and behavior-free; found: ${forbidden}`);
  }
}

const roomLines = room.split(/\r?\n/).length;
if (roomLines > 1735) {
  fail(`CanonicalForgeRoom exceeds preview-ref boundary threshold (${roomLines} > 1735).`);
}

console.log(JSON.stringify({ ok: true, roomLines, hookLines: hook.split(/\r?\n/).length }, null, 2));
