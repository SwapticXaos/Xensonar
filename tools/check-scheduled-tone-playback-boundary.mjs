#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/audio/scheduledTonePlaybackBoundary.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function playScheduledToneWithLifecycle', 'scheduled tone playback boundary export missing'],
  [boundary, 'isAudioEventValid(deps.ctx, now, maxLatenessSec)', 'boundary must own stale scheduled-tone gate'],
  [boundary, 'safeApplyAttack({', 'boundary must own scheduled-tone attack envelope'],
  [boundary, 'safeApplyExponentialRelease({', 'boundary must own wave-source decay envelope'],
  [boundary, 'registerScheduledToneLifecycle({', 'boundary must register scheduled-tone lifecycle'],
  [boundary, 'disconnectScheduledToneNodes(osc, filter, gain)', 'boundary must use lifecycle disconnect helper'],
  [boundary, 'deps.transientRuntime.admitVoice', 'boundary must own transient admission for scheduled tones'],
  [boundary, 'deps.transientRuntime.pickTargets', 'boundary must own target reduction through transient runtime'],
  [app, 'playScheduledToneWithLifecycle({', 'App.tsx must delegate scheduled-tone playback into the boundary'],
  [app, 'getMainOutput: ensureFinalMixBus', 'App.tsx must pass final mix bus as an explicit adapter'],
  [app, 'heldLong: longToneHoldRef.current', 'App.tsx must pass held-long state as explicit data'],
];

for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInApp = [
  'safeApplyAttack({',
  'safeApplyExponentialRelease({',
  'isAudioEventValid(ctx, now, maxLatenessSec)',
  'registerScheduledToneLifecycle({',
  'disconnectScheduledToneNodes(osc, filter, gain)',
  'const activeCount = activeScheduledTonesRef.current.length;\n    const mainOutput = ensureFinalMixBus(ctx);',
  'osc.frequency.value = freq;\n    const envelope = safeApplyAttack',
];
for (const needle of forbiddenInApp) {
  if (app.includes(needle)) failures.push(`App.tsx still owns scheduled-tone playback detail: ${needle}`);
}

const forbiddenInBoundary = [
  'useRef(',
  'useState(',
  'useEffect(',
  'audioCtxRef',
  'longToneHoldRef',
  'ensureFinalMixBus(',
  'transientRuntimeRef',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`scheduled-tone playback boundary depends on App-local runtime detail: ${needle}`);
}

if (failures.length) {
  console.error('[scheduled-tone-playback-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[scheduled-tone-playback-boundary] OK');
