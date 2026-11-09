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

const app = read('src/App.tsx');
const appLines = app.split(/\r?\n/).length;

requireContains('src/features/xensonar/audio/audioLaneContracts.ts', 'AUDIO_LANE_IDS', 'Shared lanes must have canonical IDs.');
requireContains('src/features/xensonar/audio/audioLaneContracts.ts', "MATERIAL_TRACK: 'material-track'", 'Material track must be explicitly protected.');
requireContains('src/features/xensonar/audio/audioLaneContracts.ts', "RHYTHM_PATTERN: 'rhythm-pattern'", 'Drum/Bass/stationary lane must be explicitly protected.');
requireContains('src/features/xensonar/audio/audioLaneContracts.ts', "ROOT_FOLLOW: 'root-follow'", 'Root-Follow must share the same lane taxonomy.');
requireContains('src/features/xensonar/audio/audioLaneContracts.ts', 'XENSONAR_TRANSIENT_RUNTIME_VOICE_LIMITS', 'Transient limits must be centralized instead of re-hardcoded per runtime.');

requireContains('src/features/xensonar/audioTraffic/sharedAudioTimeContract.ts', 'createSharedAudioTimeSnapshot', 'Shared time snapshot is the single time truth helper.');
requireContains('src/features/xensonar/audioTraffic/sharedAudioTimeContract.ts', 'commitSharedAudioTimeAnchor', 'Quantized lanes must commit one shared anchor.');
requireContains('src/features/xensonar/audioTraffic/sharedAudioTimeContract.ts', 'getAnchoredQuantizeDueTime', 'Shared time must use anchored quantize math.');

requireContains('src/features/xensonar/audio/stableRhythmLane.ts', 'resolveStableRhythmLaneTimeWindow', 'Stable rhythm lane must derive its window from shared audio time.');
requireContains('src/features/xensonar/audio/stableRhythmLane.ts', 'createSharedAudioTimeSnapshot', 'Stable rhythm lane must not own a separate now/anchor truth.');
requireContains('src/features/xensonar/audio/stableRhythmLane.ts', 'AUDIO_LANE_IDS.RHYTHM_PATTERN', 'Stable rhythm lane must identify itself as rhythm-pattern lane.');
requireContains('src/App.tsx', 'resolveStableRhythmLaneTimeWindow({', 'App should delegate stable lane time window computation.');
requireNotContains('src/App.tsx', 'resolveStableRhythmLanePrefillWindow({', 'App must not own the old prefill-only time truth.');
requireNotContains('src/App.tsx', 'let nextStep = nexusRefs.current.nextAbsoluteStep ?? Math.ceil(now / stepMs);', 'App must not resynchronize stable rhythm time inline.');

requireContains('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'createSharedAudioTimeSnapshot', 'Quantized traffic must share anchor/time contract.');
requireContains('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'commitSharedAudioTimeAnchor', 'Quantized traffic must commit its anchor through shared contract.');
requireContains('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'resolveQuantizedTrafficMicroJitterSec', 'Overflow deferral must be bounded/grid-aware, not raw now+lane offsets.');
requireNotContains('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'resolveQuantizeAnchor(refs.quantizeAnchorRef.current, now)', 'Quantized runtime must not directly own quantize anchor resolution.');

if (appLines >= 7765) failures.push(`App.tsx line count ${appLines} must remain below 6.8.7 boundary 7765`);

if (failures.length) {
  console.error('[audio-lane-shared-time-boundary] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, appLines }, null, 2));
