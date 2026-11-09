#!/usr/bin/env node
import fs from 'node:fs';

const bridgePath = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts';
const appPath = 'src/App.tsx';
const bridge = fs.readFileSync(bridgePath, 'utf8');
const app = fs.readFileSync(appPath, 'utf8');

const requiredBridgeSnippets = [
  'keepAliveGain.gain.value = 1',
  "data.type === 'root-follow-worklet-shadow-ready'",
  "data.type === 'root-follow-worklet-pong'",
  'processorReady: handle.snapshot.processorReady || readyMessage || throughputMeter || pongMessage',
  'processLoopActive: nextProcessQuantumCount > 0',
  'stableLanePlanRejectedReason',
  'stableLanePlanAcked',
  'postedBufferTransferSignatures.set(ctx, new Set<string>())',
  'primeRootFollowWorkletLiveness',
];

const requiredAppSnippets = [
  'primeRootFollowWorkletLiveness',
  'root-follow-worklet-liveness-prime',
  'rootFollowVoiceEngineMode === "worklet-stable-lane-pilot"',
  'rootFollowVoiceEngineMode === "worklet-granular-pilot"',
];

const missing = [];
for (const snippet of requiredBridgeSnippets) {
  if (!bridge.includes(snippet)) missing.push(`${bridgePath}: ${snippet}`);
}
for (const snippet of requiredAppSnippets) {
  if (!app.includes(snippet)) missing.push(`${appPath}: ${snippet}`);
}

if (missing.length) {
  console.error('[worklet-liveness-eager-bridge] Missing required snippets:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[worklet-liveness-eager-bridge] OK · eager liveness prime, ready/pong handling, truthful stable-lane ack status, and non-zero keepalive are present.');
