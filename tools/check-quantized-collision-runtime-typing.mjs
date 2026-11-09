#!/usr/bin/env node
import fs from 'node:fs';

const file = 'src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts';
const hookFile = 'src/features/xensonar/audioTraffic/useQuantizedTrafficBoundary.ts';
const runtime = fs.readFileSync(file, 'utf8');
const hook = fs.readFileSync(hookFile, 'utf8');
const failures = [];
const requireText = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const forbidText = (label, content, needle) => {
  if (content.includes(needle)) failures.push(`${label} still contains ${needle}`);
};

requireText(file, runtime, 'export type QuantizedCollisionNexusRefs');
requireText(file, runtime, 'export type QuantizedCollisionLiveParams');
requireText(file, runtime, "import type { NexusAgent }");
requireText(file, runtime, "import type { AppNexusParams }");
requireText(file, runtime, "function resolveAgentAudioIntentHit(agent: NexusAgent)");
requireText(file, runtime, "liveParams: QuantizedCollisionLiveParams;");
requireText(hookFile, hook, "import type { QuantizedCollisionLiveParams, QuantizedCollisionNexusRefs, QuantizedCollisionRuntimeRefs }");
requireText(hookFile, hook, "nexusRefs: MutableRefObject<QuantizedCollisionNexusRefs>");
requireText(hookFile, hook, "nexusParamsRef: MutableRefObject<QuantizedCollisionLiveParams>");
requireText(hookFile, hook, "quantizedTrafficQueueRefs: QuantizedTrafficQueueBoundaryRefs & QuantizedCollisionRuntimeRefs");
forbidText(file, runtime, 'nexusRefs: { current: any }');
forbidText(file, runtime, 'nexusParamsRef: { current: any }');
forbidText(file, runtime, 'function resolveAgentAudioIntentHit(agent: any)');
forbidText(file, runtime, 'liveParams: any;');
forbidText(file, runtime, '.map((agent: any)');

const report = {
  ok: failures.length === 0,
  scope: 'quantized-collision-runtime typing contract',
  protectedContract: [
    'collision runtime reads explicit NexusAgent hit fields',
    'collision runtime reads a narrowed AppNexusParams live-policy surface',
    'traffic boundary hook exposes refs as both queue-reset and collision-runtime contract',
    'no hidden any on nexusRefs/nexusParamsRef/liveParams in quantizedCollisionRuntime',
  ],
  files: [file, hookFile],
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
