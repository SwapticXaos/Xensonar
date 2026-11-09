#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const failures = [];
const read = (path) => {
  if (!existsSync(path)) {
    failures.push(`missing ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
};
const requireContains = (path, needle, msg = '') => {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path} missing ${JSON.stringify(needle)}${msg ? ` · ${msg}` : ''}`);
};
const requireNotContains = (path, needle, msg = '') => {
  const text = read(path);
  if (text.includes(needle)) failures.push(`${path} still contains ${JSON.stringify(needle)}${msg ? ` · ${msg}` : ''}`);
};

requireContains('src/features/xensonar/material/protectedMaterialTrackLane.ts', 'resolveProtectedMaterialTrackPlaybackPlan', 'Materialspur playback must have its own protected plan.');
requireContains('src/features/xensonar/material/protectedMaterialTrackLane.ts', 'AUDIO_LANE_IDS.MATERIAL_TRACK', 'Materialspur must be assigned to the protected material lane.');
requireContains('src/features/xensonar/material/protectedMaterialTrackLane.ts', 'createSharedAudioTimeSnapshot', 'Materialspur must derive start timing from shared audio time.');
requireContains('src/features/xensonar/material/protectedMaterialTrackLane.ts', 'MATERIAL_TRACK_TRANSPORT_ANCHOR_SEC', 'Protected material lane must not depend on cursor/particle anchors.');
requireContains('src/features/xensonar/material/protectedMaterialTrackLane.ts', 'getEffectiveMaterialLoopBars', 'Materialspur loop interpretation must keep existing bar contract.');

requireContains('src/features/xensonar/material/materialLoopPlaybackWorkflow.ts', 'resolveProtectedMaterialTrackPlaybackPlan', 'Workflow must call protected plan builder.');
requireContains('src/features/xensonar/material/materialLoopPlaybackWorkflow.ts', 'playbackPlan.startAtSec', 'Playback start must come from protected plan.');
requireContains('src/features/xensonar/material/materialLoopPlaybackWorkflow.ts', 'playbackPlan.playbackRate', 'Playback rate must come from protected plan.');
requireContains('src/features/xensonar/material/materialLoopPlaybackWorkflow.ts', 'registerMaterialTrackAudioSource', 'Existing lifecycle probe must stay active.');
requireNotContains('src/features/xensonar/material/materialLoopPlaybackWorkflow.ts', 'const barDur = (60 / Math.max(40, quantizeBpm || 108)) * 4;', 'Old inline material timing math must be removed.');
requireNotContains('src/features/xensonar/material/materialLoopPlaybackWorkflow.ts', 'const startAt = syncToBeat', 'Old inline start-at calculation must be removed.');

const workflow = read('src/features/xensonar/material/materialLoopPlaybackWorkflow.ts');
if (!/source\.start\(playbackPlan\.startAtSec,\s*playbackPlan\.loopStartSec\)/.test(workflow)) {
  failures.push('materialLoopPlaybackWorkflow.ts must start source from protected playbackPlan start/loopStart');
}

if (failures.length) {
  console.error('[protected-material-lane-contract] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true }, null, 2));
