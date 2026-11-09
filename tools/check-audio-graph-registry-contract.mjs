import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = path.join(root, 'src/features/xensonar/audio/audioGraphConnectionRegistry.ts');
const liveBoundaryPath = path.join(root, 'src/features/xensonar/audio/liveMasterBusRuntimeBoundary.ts');
const registry = fs.readFileSync(registryPath, 'utf8');
const liveBoundary = fs.readFileSync(liveBoundaryPath, 'utf8');

const failures = [];

const requireIncludes = (text, needle, label) => {
  if (!text.includes(needle)) failures.push(`${label} missing: ${needle}`);
};
const forbidIncludes = (text, needle, label) => {
  if (text.includes(needle)) failures.push(`${label} must not contain: ${needle}`);
};

requireIncludes(registry, 'AudioGraphConnectionLifecycleStatus', 'registry lifecycle type');
requireIncludes(registry, 'ManagedAudioGraphConnection', 'managed connection handle');
requireIncludes(registry, 'activeConnections', 'active connection map');
requireIncludes(registry, 'knownActive', 'known-active snapshot field');
requireIncludes(registry, 'markAudioGraphConnectionReleased', 'release marker');
requireIncludes(registry, 'markAudioGraphConnectionNativeDisconnectUnknown', 'native disconnect uncertainty marker');
requireIncludes(registry, 'connectAudioGraphNode', 'explicit tracked connection wrapper');
requireIncludes(registry, "'unknown-after-native-disconnect'", 'unknown native-disconnect lifecycle state');
requireIncludes(liveBoundary, 'connectAudioGraphNode', 'live master boundary tracked connection usage');

forbidIncludes(registry, 'AudioNode.prototype', 'registry');
forbidIncludes(registry, 'connectOnce', 'registry');
forbidIncludes(registry, '.disconnect(', 'registry');

if (failures.length) {
  console.error('[audio-graph-registry-contract] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[audio-graph-registry-contract] OK · passive lifecycle registry with known-active telemetry; no global AudioNode monkey-patching or connectOnce gate');
