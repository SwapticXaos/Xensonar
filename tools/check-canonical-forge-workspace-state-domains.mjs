#!/usr/bin/env node
import fs from 'node:fs';

const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const sourcePath = 'src/features/l3lab/canonicalForge/useCanonicalForgeSourceWorkspaceState.ts';
const melodicPath = 'src/features/l3lab/canonicalForge/useCanonicalForgeMelodicWorkspaceState.ts';

const fail = (message) => {
  console.error(`[canonical-forge-workspace-state-domains] ${message}`);
  process.exit(1);
};
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : fail(`missing ${file}`);
const room = read(roomPath);
const source = read(sourcePath);
const melodic = read(melodicPath);

for (const required of [
  "import { useCanonicalForgeSourceWorkspaceState } from './useCanonicalForgeSourceWorkspaceState';",
  "import { useCanonicalForgeMelodicWorkspaceState } from './useCanonicalForgeMelodicWorkspaceState';",
  'useCanonicalForgeSourceWorkspaceState(initialState)',
  'useCanonicalForgeMelodicWorkspaceState(initialState)',
]) {
  if (!room.includes(required)) fail(`CanonicalForgeRoom missing workspace-state boundary: ${required}`);
}

const sourceStates = [
  'rawSourceAsset', 'sourceAsset', 'bundle', 'spectralData', 'sourceView', 'secondaryView', 'viewBlend',
  'sourcePreviewMode', 'playheadPosition', 'isPlaying', 'busy', 'revision', 'auditionView',
  'auditionBlendAmount', 'selectedProjectId',
];
const melodicStates = [
  'loopComposer', 'loopPatternVariants', 'loopPatternLinks', 'savedMelodicProjects',
  'selectedMelodicProjectId', 'melodicSampleEntries', 'autoZoomOnDenseOverlap', 'lockTrackEditing',
  'chordVoicing', 'chordStrumSteps', 'chordVelocitySlope', 'pendingImageImport',
  'materialFragmentGuideSnapshot', 'clipPreviewStep', 'selectionLoopPreviewPlaying',
];

for (const state of [...sourceStates, ...melodicStates]) {
  if (new RegExp(`const\\s*\\[\\s*${state}\\b`).test(room)) {
    fail(`CanonicalForgeRoom still owns workspace state cell: ${state}`);
  }
}
for (const state of sourceStates) {
  if (!source.includes(state)) fail(`source workspace state owner missing: ${state}`);
}
for (const state of melodicStates) {
  if (!melodic.includes(state)) fail(`melodic workspace state owner missing: ${state}`);
}

for (const [label, text] of [['source', source], ['melodic', melodic]]) {
  for (const forbidden of ['useEffect(', 'useLayoutEffect(', 'useRef(', 'audioEngine', 'window.', 'document.', 'requestAnimationFrame']) {
    if (text.includes(forbidden)) fail(`${label} workspace state owner must remain state-only; found: ${forbidden}`);
  }
}
for (const forbidden of ['loopComposer', 'melodicSampleEntries', 'selectedMelodicProjectId']) {
  if (source.includes(forbidden)) fail(`source workspace state owner crossed into melodic domain: ${forbidden}`);
}
for (const forbidden of ['spectralData', 'sourceAsset', 'sourceView', 'audioPreview']) {
  if (melodic.includes(forbidden)) fail(`melodic workspace state owner crossed into source/spectral domain: ${forbidden}`);
}

const roomLines = room.split(/\r?\n/).length;
if (roomLines > 1140) fail(`CanonicalForgeRoom should stay below 1140 lines after workspace-state split; saw ${roomLines}`);

console.log(JSON.stringify({
  ok: true,
  roomLines,
  sourceOwnerLines: source.split(/\r?\n/).length,
  melodicOwnerLines: melodic.split(/\r?\n/).length,
  sourceStateCells: sourceStates.length,
  melodicStateCells: melodicStates.length,
}, null, 2));
