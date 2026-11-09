#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');

const workletBridge = read('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts');
const traffic = read('src/features/xensonar/audioTraffic/audioTrafficForensics.ts');
const meter = read('tools/analyze-burst-diagnosis-log-meter.mjs');

const required = [
  ['worklet bridge throughput post', workletBridge, 'root-follow-worklet-throughput-meter'],
  ['worklet process quantum counter', workletBridge, 'processQuantumCount'],
  ['worklet active render quantum counter', workletBridge, 'activeRenderQuantumCount'],
  ['worklet processorerror guard', workletBridge, 'node.onprocessorerror'],
  ['worklet global debug snapshot', traffic, '__XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__'],
  ['stress comparison worklet throughput', traffic, 'workletThroughputSignal'],
  ['stress comparison quantized 16', traffic, 'maxQuantizedTrafficEventsPer16Ms'],
  ['stress comparison quantized 50', traffic, 'maxQuantizedTrafficEventsPer50Ms'],
  ['meter quantized 50 field', meter, 'maxQuantizedTraffic50'],
  ['meter worklet throughput signal field', meter, 'workletThroughputSignal'],
  ['meter worklet quantum field', meter, 'maxWorkletProcessQuantumCount'],
];

const missing = required.filter(([, content, needle]) => !content.includes(needle));
if (missing.length) {
  console.error('[worklet-throughput-and-quantized-traffic-probe] Missing contracts:');
  for (const [label, , needle] of missing) console.error(`- ${label}: ${needle}`);
  process.exit(1);
}

console.log('[worklet-throughput-and-quantized-traffic-probe] OK · Worklet throughput and quantized-traffic counters are exported for later visible-browser runs.');
