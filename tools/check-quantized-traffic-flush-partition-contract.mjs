#!/usr/bin/env node
import fs from 'node:fs';

const file = 'src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts';
const source = fs.readFileSync(file, 'utf8');
const fail = (message) => {
  console.error(`[check-quantized-traffic-flush-partition-contract] ${message}`);
  process.exit(1);
};

if (!source.includes('const dueItems: QueuedCollisionTrigger[] = [];')) {
  fail('flush path must collect due traffic with an explicit dueItems array');
}
if (!source.includes('let retainedCount = 0;')) {
  fail('flush path must retain future traffic in-place with retainedCount');
}
if (!source.includes('queue[retainedCount] = item;')) {
  fail('flush path does not compact the queue in-place');
}
if (!source.includes('queue.length = retainedCount;')) {
  fail('flush path must trim the retained queue after partitioning');
}
if (source.includes('queue.filter((item: QueuedCollisionTrigger) => item.dueTime <= now)')) {
  fail('flush path still allocates due traffic through Array.filter');
}
if (source.includes('refs.waveCollisionQueueRef.current = queue.filter')) {
  fail('flush path still replaces the queue through a second Array.filter');
}
if (!source.includes('dueItems.sort((a, b) => b.amp - a.amp)')) {
  fail('amplitude priority ordering for due events must remain intact');
}

console.log('[check-quantized-traffic-flush-partition-contract] ok');
