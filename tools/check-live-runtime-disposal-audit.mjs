#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function exists(path) {
  return existsSync(join(root, path));
}

function requireFile(path) {
  if (!exists(path)) failures.push(`missing file: ${path}`);
}

function requireContains(path, needle) {
  if (!exists(path)) {
    failures.push(`missing file for content check: ${path}`);
    return;
  }
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path} does not contain required text: ${needle}`);
}

function requireNotContains(path, needle) {
  if (!exists(path)) return;
  const text = read(path);
  if (text.includes(needle)) failures.push(`${path} contains forbidden text: ${needle}`);
}

function walkFiles(dir, out = []) {
  const full = join(root, dir);
  if (!existsSync(full)) return out;
  for (const name of readdirSync(full)) {
    const path = join(full, name);
    const rel = join(dir, name).replaceAll('\\', '/');
    if (name === 'node_modules' || name === 'dist') continue;
    const stat = statSync(path);
    if (stat.isDirectory()) walkFiles(rel, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) out.push(rel);
  }
  return out;
}

function countRegex(text, regex) {
  return [...text.matchAll(regex)].length;
}

const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version ?? '').trim();
const expectedVersion = '3.2.91.4.114.36';
const docPath = `docs/LIVE_RUNTIME_DISPOSAL_AUDIT_${expectedVersion}.md`;
const manifestPath = `XENSONAR_SOURCE_MANIFEST_${expectedVersion}.json`;

if (!pkg.scripts?.['xensonar:check-live-runtime-disposal-audit']) {
  failures.push('package.json missing script: xensonar:check-live-runtime-disposal-audit');
}

requireFile(docPath);
requireFile(manifestPath);
requireFile('src/features/xensonar/recording/useRecordingRuntimeBoundary.ts');
requireFile('src/features/xensonar/recording/useRecordingRuntimeLifecycle.ts');
requireFile('src/features/xensonar/recording/recordingEffectHandlers.ts');
requireFile('src/features/xensonar/recording/objectUrlUtils.ts');
requireFile('src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts');
requireFile('src/features/xensonar/material/materialLoopRuntimeBoundary.ts');
requireFile('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts');
requireFile('src/features/xensonar/audio/audioGraphConnectionRegistry.ts');
requireFile('src/features/xensonar/audio/liveMasterBusRuntimeBoundary.ts');

requireContains(docPath, expectedVersion);
requireContains(docPath, 'passive audit');
requireContains(docPath, 'no audio behavior change');
requireContains(docPath, 'Root Follow');
requireContains(docPath, 'Materialspur');
requireContains(docPath, 'Recording');
requireContains(docPath, 'AudioGraph');

requireContains('src/features/xensonar/recording/useRecordingRuntimeBoundary.ts', 'useRecordingRuntimeLifecycle({');
requireContains('src/features/xensonar/recording/useRecordingRuntimeLifecycle.ts', 'cleanupRecordingRuntime({');
requireContains('src/features/xensonar/recording/useRecordingRuntimeLifecycle.ts', "window.removeEventListener('keydown', handleRecordingMarkerKey)");
requireContains('src/features/xensonar/recording/recordingEffectHandlers.ts', 'window.clearTimeout(recordingStopTimerRef.current)');
requireContains('src/features/xensonar/recording/recordingEffectHandlers.ts', "mediaRecorderRef.current.state !== 'inactive'");
requireContains('src/features/xensonar/recording/recordingEffectHandlers.ts', 'cancelAnimationFrame(raf)');
requireContains('src/features/xensonar/recording/recordingEffectHandlers.ts', 'revokeManagedObjectUrl(recordingPreviewUrlRef.current)');
requireContains('src/features/xensonar/recording/objectUrlUtils.ts', 'revokeManagedObjectUrl');
requireContains('src/features/xensonar/recording/objectUrlUtils.ts', 'replaceManagedObjectUrl');
requireContains('src/features/xensonar/recording/objectUrlUtils.ts', 'URL.revokeObjectURL(url)');

requireContains('src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts', 'stopRootFollowPlaybackNodesBoundary');
requireContains('src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts', 'window.clearTimeout(refs.timerRef.current)');
requireContains('src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts', 'refs.activeNodesRef.current.clear()');
requireContains('src/features/xensonar/material/materialLoopRuntimeBoundary.ts', 'stopMaterialLoopPlaybackNodesBoundary');
requireContains('src/features/xensonar/material/materialLoopRuntimeBoundary.ts', 'stopMaterialLoopPlayback({');
requireContains('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'stopQuantizedCollisionRuntime');
requireContains('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'cancelQuantizedTrafficAnimationFrame(refs');
requireContains('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'clearQuantizedTrafficFlushInterval(refs');
requireContains('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'refs.waveCollisionQueueRef.current = []');

requireContains('src/features/xensonar/audio/audioGraphConnectionRegistry.ts', 'markAudioGraphConnectionReleased');
requireContains('src/features/xensonar/audio/audioGraphConnectionRegistry.ts', 'markAudioGraphConnectionNativeDisconnectUnknown');
requireContains('src/features/xensonar/audio/audioGraphConnectionRegistry.ts', 'knownActive');
requireNotContains('src/features/xensonar/audio/audioGraphConnectionRegistry.ts', 'AudioNode.prototype');
requireNotContains('src/features/xensonar/audio/audioGraphConnectionRegistry.ts', '.disconnect()');
requireNotContains('src/features/xensonar/audio/liveMasterBusRuntimeBoundary.ts', '.disconnect()');

const scannedDirs = [
  'src/App.tsx',
  'src/features/xensonar/rootFollow',
  'src/features/xensonar/material',
  'src/features/xensonar/recording',
  'src/features/xensonar/audio',
  'src/features/xensonar/audioTraffic',
  'src/features/xensonar/diagnostics',
  'src/features/l3lab/spectralForge',
  'src/features/l3lab/canonicalForge',
];

const files = [];
for (const item of scannedDirs) {
  const full = join(root, item);
  if (!existsSync(full)) continue;
  const stat = statSync(full);
  if (stat.isDirectory()) walkFiles(item, files);
  else files.push(item);
}

const counts = {
  files: files.length,
  setTimeout: 0,
  setInterval: 0,
  clearTimeout: 0,
  clearInterval: 0,
  requestAnimationFrame: 0,
  cancelAnimationFrame: 0,
  addEventListener: 0,
  removeEventListener: 0,
  createObjectURL: 0,
  revokeObjectURL: 0,
  connectAudioGraphNode: 0,
  markAudioGraphConnectionReleased: 0,
  disconnectCalls: 0,
};

for (const file of files) {
  const text = read(file);
  counts.setTimeout += countRegex(text, /\bsetTimeout\s*\(/g);
  counts.setInterval += countRegex(text, /\bsetInterval\s*\(/g);
  counts.clearTimeout += countRegex(text, /\bclearTimeout\s*\(/g);
  counts.clearInterval += countRegex(text, /\bclearInterval\s*\(/g);
  counts.requestAnimationFrame += countRegex(text, /\brequestAnimationFrame\s*\(/g);
  counts.cancelAnimationFrame += countRegex(text, /\bcancelAnimationFrame\s*\(/g);
  counts.addEventListener += countRegex(text, /\.addEventListener\s*\(/g);
  counts.removeEventListener += countRegex(text, /\.removeEventListener\s*\(/g);
  counts.createObjectURL += countRegex(text, /\bURL\.createObjectURL\s*\(/g);
  counts.revokeObjectURL += countRegex(text, /\bURL\.revokeObjectURL\s*\(/g);
  counts.connectAudioGraphNode += countRegex(text, /\bconnectAudioGraphNode\s*\(/g);
  counts.markAudioGraphConnectionReleased += countRegex(text, /\bmarkAudioGraphConnectionReleased\s*\(/g);
  counts.disconnectCalls += countRegex(text, /\.disconnect\s*\(/g);
}

if (counts.removeEventListener < 8) failures.push(`unexpectedly low removeEventListener count: ${counts.removeEventListener}`);
if (counts.cancelAnimationFrame < 8) failures.push(`unexpectedly low cancelAnimationFrame count: ${counts.cancelAnimationFrame}`);
if (counts.clearTimeout < 3) failures.push(`unexpectedly low clearTimeout count: ${counts.clearTimeout}`);
if (counts.revokeObjectURL < 2) failures.push(`unexpectedly low revokeObjectURL count: ${counts.revokeObjectURL}`);
if (counts.connectAudioGraphNode < 8) failures.push(`unexpectedly low connectAudioGraphNode count: ${counts.connectAudioGraphNode}`);

if (exists(manifestPath)) {
  const manifest = JSON.parse(read(manifestPath));
  if (manifest.patch !== 'live_runtime_disposal_audit_1') failures.push(`${manifestPath} patch ${manifest.patch} != live_runtime_disposal_audit_1`);
  if (!manifest.validation?.includes('xensonar:check-live-runtime-disposal-audit')) {
    failures.push(`${manifestPath} validation does not include xensonar:check-live-runtime-disposal-audit`);
  }
}

if (failures.length) {
  console.error('[xensonar-live-runtime-disposal-audit] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xensonar-live-runtime-disposal-audit] ok');
console.log(JSON.stringify({
  version,
  scannedRuntimeFiles: counts.files,
  lifecycleCounts: counts,
  note: 'passive audit only; no runtime disposal gate or audio event reduction is introduced',
}, null, 2));
