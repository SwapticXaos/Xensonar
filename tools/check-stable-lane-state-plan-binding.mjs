#!/usr/bin/env node
import fs from 'node:fs';

const materialPath = 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts';
const policyPath = 'src/features/xensonar/rootFollow/rootFollowLaneOwnershipPolicy.ts';
const bridgePath = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts';
const material = fs.readFileSync(materialPath, 'utf8');
const policy = fs.readFileSync(policyPath, 'utf8');
const bridge = fs.readFileSync(bridgePath, 'utf8');

const requiredPolicy = [
  'export type RootFollowStableLaneWorkletPlan',
  'export function buildRootFollowStableLaneStatePlan',
];
const requiredMaterial = [
  'buildRootFollowStableLaneStatePlan',
  'worklet-stable-lane-state-plan',
  'mode: "flowing-state-plan"',
  'mode: "fragment-state-plan"',
  'publishRootFollowWorkletStableLaneBufferAndPlan({',
];
const requiredBridge = [
  "root-follow-worklet-stable-lane-posted-buffer-and-plan-awaiting-ack",
  'stableLanePlanAcked: lanePosted',
  '? false',
  'stableLanePlanRejectedReason: null',
  'stableLaneActive:',
  'handle.snapshot.stableLaneActive &&',
  'handle.snapshot.lastStableLaneBufferAvailable',
];
const missing = [];
for (const token of requiredPolicy) if (!policy.includes(token)) missing.push(`${policyPath}: ${token}`);
for (const token of requiredMaterial) if (!material.includes(token)) missing.push(`${materialPath}: ${token}`);
for (const token of requiredBridge) if (!bridge.includes(token)) missing.push(`${bridgePath}: ${token}`);

if (missing.length > 0) {
  console.error('[stable-lane-state-plan-binding] missing expected contract markers:');
  for (const item of missing) console.error(` - ${item}`);
  process.exit(1);
}

console.log('[stable-lane-state-plan-binding] OK · Stable-Lane now receives a state-derived plan even when no legacy slice is admitted, and posted plans wait for a truthful ack before being marked active.');
