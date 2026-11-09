import { readFileSync } from 'node:fs';

const bridgePath = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts';
const bridge = readFileSync(bridgePath, 'utf8');
const processMatch = bridge.match(/\n  process\(_inputs, outputs\) \{[\s\S]*?\n  \}\n\}\n\nregisterProcessor/);

const required = [
  ['bounded append helper for worklet event ingress', bridge, 'compactAndAppendBoundedEvents(queue, incoming, minEndSec, maxLength)'],
  ['granular ingress uses bounded append helper', bridge, 'this.compactAndAppendBoundedEvents(this.granularEvents, kept, currentTime - 0.05, 96)'],
  ['direct ingress uses bounded append helper', bridge, 'this.compactAndAppendBoundedEvents(this.events, kept, currentTime - 0.05, 128)'],
  ['granular hot path compacts in place', bridge, 'let granularWriteIndex = 0'],
  ['granular hot path truncates original queue in place', bridge, 'if (granularWriteIndex < granularQueueLength) this.granularEvents.length = granularWriteIndex'],
  ['direct hot path compacts in place', bridge, 'let directWriteIndex = 0'],
  ['direct hot path truncates original queue in place', bridge, 'if (directWriteIndex < directQueueLength) this.events.length = directWriteIndex'],
  ['throughput reports hot-path compaction count', bridge, 'processHotPathCompactionCount: this.processHotPathCompactionCount'],
  ['snapshot exposes hot-path direct drops', bridge, 'processHotPathDroppedDirectCount: number'],
  ['snapshot exposes hot-path granular drops', bridge, 'processHotPathDroppedGranularCount: number'],
  ['summary exposes hot-path retained direct queue', bridge, 'processHotPathRetainedDirectCount: snapshot?.processHotPathRetainedDirectCount ?? 0'],
  ['summary exposes hot-path retained granular queue', bridge, 'processHotPathRetainedGranularCount: snapshot?.processHotPathRetainedGranularCount ?? 0'],
];

const missing = required.filter(([, haystack, needle]) => !haystack.includes(needle));
const processBody = processMatch ? processMatch[0] : '';
const forbiddenInProcess = [
  ['granular still-array allocation', 'const stillGranular = []'],
  ['direct still-array allocation', 'const stillActive = []'],
  ['granular slice reassignment', 'this.granularEvents = stillGranular.slice(-96)'],
  ['direct slice reassignment', 'this.events = stillActive.slice(-128)'],
  ['filter use inside process', '.filter('],
  ['map use inside process', '.map('],
  ['concat use inside process', '.concat('],
  ['slice use inside process', '.slice('],
].filter(([, needle]) => processBody.includes(needle));

const forbiddenIngress = [
  ['granular ingress filter/concat/slice chain', 'this.granularEvents = this.granularEvents.filter'],
  ['direct ingress filter/concat/slice chain', 'this.events = this.events.filter'],
].filter(([, needle]) => bridge.includes(needle));

if (!processMatch || missing.length || forbiddenInProcess.length || forbiddenIngress.length) {
  console.error('[check-root-follow-worklet-process-hot-path-compaction] FAIL');
  if (!processMatch) console.error('- could not isolate AudioWorklet process() body');
  for (const [label, , needle] of missing) console.error(`- ${label}: missing ${needle}`);
  for (const [label, needle] of forbiddenInProcess) console.error(`- forbidden in process(): ${label}: ${needle}`);
  for (const [label, needle] of forbiddenIngress) console.error(`- forbidden ingress pattern: ${label}: ${needle}`);
  process.exit(1);
}

console.log('[check-root-follow-worklet-process-hot-path-compaction] OK: AudioWorklet process() avoids fresh filter/map/concat/slice queue arrays and compacts direct/granular queues in place.');
