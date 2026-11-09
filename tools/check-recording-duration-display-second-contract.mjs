import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}
function fail(message) {
  console.error(`[recording-duration-display-second-contract] ${message}`);
  process.exit(1);
}
function requireContains(path, needle) {
  const source = read(path);
  if (!source.includes(needle)) fail(`${path} missing ${needle}`);
}
function requireNotContains(path, needle) {
  const source = read(path);
  if (source.includes(needle)) fail(`${path} must not contain ${needle}`);
}

const effect = 'src/features/xensonar/recording/recordingEffectHandlers.ts';
const registry = 'src/features/xensonar/recording/recordingDisposalRegistry.ts';

requireContains(effect, 'registerRecordingDurationDisplaySecondTick');
requireContains(effect, 'Math.floor(elapsedMs / 1000) * 1000');
requireContains(effect, 'prev.durationMs === visibleDurationMs ? prev');
requireContains(effect, 'window.setInterval(commitVisibleSecond, 1000)');
requireContains(effect, 'window.clearInterval(intervalId)');
requireNotContains(effect, 'registerRecordingDurationRaf');
requireNotContains(effect, 'const resource = registerRecordingDurationRaf();');
requireContains(registry, 'RECORDING_DURATION_DISPLAY_TICK_RESOURCE_ID');
requireContains(registry, "kind: 'interval'");
requireContains(registry, "label: 'recording.duration.display-second-tick'");
requireContains(registry, 'visibleResolutionMs: 1000');
requireContains(registry, 'pollIntervalMs: 1000');

console.log('[recording-duration-display-second-contract] ok');
