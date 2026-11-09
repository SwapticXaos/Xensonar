#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const exists = (path) => existsSync(join(root, path));
const requireFile = (path) => { if (!exists(path)) failures.push(`missing file: ${path}`); };
const requireContains = (path, needle) => {
  if (!exists(path)) { failures.push(`missing file for content check: ${path}`); return; }
  if (!read(path).includes(needle)) failures.push(`${path} does not contain required text: ${needle}`);
};
const requireNotContains = (path, needle) => {
  if (exists(path) && read(path).includes(needle)) failures.push(`${path} contains forbidden text: ${needle}`);
};

const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version ?? '').trim();
const manifestPath = `XENSONAR_SOURCE_MANIFEST_${version}.json`;
const doc = `docs/QUANTIZED_TRAFFIC_TIMER_REGISTRY_${version}.md`;
const registry = 'src/features/xensonar/audioTraffic/quantizedTrafficTimerRegistry.ts';
const runtime = 'src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts';

if (!pkg.scripts?.['xensonar:check-quantized-traffic-timer-registry']) failures.push('missing script: xensonar:check-quantized-traffic-timer-registry');

for (const file of [
  registry,
  runtime,
  doc,
  manifestPath,
  'src/features/xensonar/audioTraffic/quantizedTrafficQueueBoundary.ts',
  'src/features/xensonar/audioTraffic/audioTrafficForensics.ts',
  'src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts',
  'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx',
  'src/features/xensonar/rooms/quantizeGridActions.ts',
  'src/features/xensonar/rooms/resonancePanelProps.ts',
]) requireFile(file);

for (const needle of [
  'scheduleQuantizedTrafficAnimationFrame',
  'cancelQuantizedTrafficAnimationFrame',
  'startQuantizedTrafficFlushInterval',
  'clearQuantizedTrafficFlushInterval',
  'summarizeQuantizedTrafficTimerRegistry',
  "label: QUANTIZED_TRAFFIC_PARTICLE_RAF_LABEL",
  "label: QUANTIZED_TRAFFIC_FLUSH_INTERVAL_LABEL",
  "subsystem: 'quantized-traffic'",
]) requireContains(registry, needle);

for (const forbidden of [
  'AudioNode.prototype',
  'disposeAll',
  '.disconnect(',
  '.stop(',
  'URL.revokeObjectURL',
]) requireNotContains(registry, forbidden);

for (const needle of [
  'scheduleQuantizedTrafficAnimationFrame(refs, loop',
  'startQuantizedTrafficFlushInterval(',
  'refs,',
  'cancelQuantizedTrafficAnimationFrame(',
  'clearQuantizedTrafficFlushInterval(',
  'stopQuantizedCollisionRuntime(refs)',
]) requireContains(runtime, needle);

requireNotContains(runtime, 'refs.particleQuantizeRafRef.current = requestAnimationFrame(loop);');
requireNotContains(runtime, 'refs.particleQuantizeTimerRef.current = window.setInterval(');

requireContains('src/features/xensonar/audioTraffic/quantizedTrafficQueueBoundary.ts', 'clearQuantizedTrafficFlushInterval(refs');
requireContains('src/features/xensonar/rooms/quantizeGridActions.ts', 'resetQuantizedTrafficQueuesBoundary(refs)');
requireContains('src/features/xensonar/rooms/quantizeGridActions.ts', 'onWaveOvertoneArpQueueClear');
requireContains('src/features/xensonar/rooms/resonancePanelProps.ts', 'clearQuantizedTrafficFlushInterval({ particleQuantizeTimerRef: args.particleQuantizeTimerRef }');
requireContains('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', "| 'quantized-traffic'");
requireContains('src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts', 'quantizedTrafficRuntime: summarizeQuantizedTrafficTimerRegistry()');
requireContains('src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx', 'Raster-Verkehr');

for (const protectedPath of [
  'src/features/xensonar/rootFollow/useRootFollowLoopPlayback.ts',
  'src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts',
  'src/features/xensonar/material/materialLoopRuntimeBoundary.ts',
  'src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts',
  'src/features/l3lab/spectralForge/SpectralForgeRoom.tsx',
]) {
  requireNotContains(protectedPath, 'summarizeQuantizedTrafficTimerRegistry');
  requireNotContains(protectedPath, 'scheduleQuantizedTrafficAnimationFrame');
  requireNotContains(protectedPath, 'startQuantizedTrafficFlushInterval');
}

for (const needle of [
  version,
  'passive timer registry',
  'no event-density reduction',
  'Root Follow',
  'Materialspur',
  'Wellenstarter-Arp',
  'resetQuantizedTrafficQueuesBoundary',
]) requireContains(doc, needle);

if (exists(manifestPath)) {
  const manifest = JSON.parse(read(manifestPath));
  if (manifest.version !== version) failures.push(`${manifestPath} version ${manifest.version} != ${version}`);
  if (manifest.patch !== 'health_guard_cleanup') failures.push(`${manifestPath} patch ${manifest.patch} != health_guard_cleanup`);
  for (const required of [
    'xensonar:check-quantized-traffic-timer-registry',
    'xensonar:check-wave-starter-hold-segment-clock',
    'xensonar:check-wave-starter-gesture-loop-worklet-bridge',
    'xensonar:check-material-intake-live-loop-boundary',
  ]) {
    if (!manifest.validation?.includes(required)) failures.push(`${manifestPath} validation does not include ${required}`);
  }
}

if (failures.length) {
  console.error('[xensonar-quantized-traffic-timer-registry] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[xensonar-quantized-traffic-timer-registry] ok');
console.log(JSON.stringify({ version, registry, note: 'passive quantized-traffic timer/RAF registry only; no scheduling or event-density reduction' }, null, 2));
