#!/usr/bin/env node
import fs from 'node:fs';

const bridge = fs.readFileSync('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'utf8');
const traffic = fs.readFileSync('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'utf8');
const analyzer = fs.readFileSync('tools/analyze-burst-diagnosis-log-meter.mjs', 'utf8');

const requiredBridge = [
  'bridgeSessionId: number;',
  'processorGeneration: number;',
  "type: 'root-follow-worklet-stable-lane-buffer-transfer'",
  "type: 'root-follow-worklet-stable-lane-buffer-ack'",
  "type: 'root-follow-worklet-stable-lane-plan'",
  "type: 'root-follow-worklet-stable-lane-ack'",
  'stableLaneBufferGenerationForTransfer',
  'stableLaneBufferSessionSignature',
  'stale-buffer-generation',
  'missing-buffer',
  'stableLaneBufferAcked',
  'stableLanePlanAcked',
  'stableLaneBufferRejectCount',
  'stableLanePlanRejectCount',
];
const requiredTraffic = [
  'workletBridgeSessionId',
  'workletProcessorGeneration',
  'workletStableLaneBufferAcked',
  'workletStableLanePlanAcked',
  'workletStableLaneBufferRejectCount',
  'workletStableLanePlanRejectCount',
  'workletStableLaneBufferGeneration',
];
const requiredAnalyzer = [
  '3.2.91.6.9.116-stable-lane-buffer-plan-generation-split',
  'maxWorkletBridgeSessionId',
  'workletStableLaneBufferAcked',
  'workletStableLanePlanAcked',
  'maxWorkletStableLaneBufferAckCount',
  'maxWorkletStableLanePlanAckCount',
];

const missing = [];
for (const token of requiredBridge) if (!bridge.includes(token)) missing.push(`bridge:${token}`);
for (const token of requiredTraffic) if (!traffic.includes(token)) missing.push(`traffic:${token}`);
for (const token of requiredAnalyzer) if (!analyzer.includes(token)) missing.push(`analyzer:${token}`);

if (/stableLaneActive:\s*true,\s*stableLanePlanAcked:\s*false/.test(bridge)) {
  missing.push('bridge:stableLaneActive must not be optimistically forced true while awaiting ack');
}
if (!bridge.includes('stableLaneActive: handle.snapshot.stableLaneActive && handle.snapshot.lastStableLaneBufferAvailable')) {
  missing.push('bridge:stableLaneActive awaiting-ack guard missing');
}
if (!bridge.includes('this.sampleBuffers.set(this.makeStableLaneBufferKey(entryId, bufferGeneration), bufferState)')) {
  missing.push('processor:generation-keyed buffer map missing');
}
if (!bridge.includes('const bufferKey = this.makeStableLaneBufferKey(entryId, bufferGeneration)')) {
  missing.push('processor:generation-keyed plan lookup missing');
}

if (missing.length) {
  console.error('[check-stable-lane-buffer-plan-generation-split] missing contracts:');
  for (const item of missing) console.error(` - ${item}`);
  process.exit(1);
}
console.log('[check-stable-lane-buffer-plan-generation-split] OK');
