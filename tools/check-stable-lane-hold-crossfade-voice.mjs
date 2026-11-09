#!/usr/bin/env node
import fs from 'node:fs';

const bridge = fs.readFileSync('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'utf8');
const traffic = fs.readFileSync('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'utf8');
const analyzer = fs.readFileSync('tools/analyze-burst-diagnosis-log-meter.mjs', 'utf8');

const requiredBridge = [
  'previousStableLane',
  'stableLaneFadeFrames',
  'fadeFramesRemaining',
  'fadeFramesTotal',
  'fadeOutGain',
  'stableLaneCrossfadeFrameCount',
  'stableLaneGainRampFrameCount',
  'lane.fadeInFramesRemaining',
  'stableLaneGain += (targetGain - this.stableLaneGain) * 0.0065',
  'gainParam.setTargetAtTime(stableLaneBlendTarget, args.audioNowSec, 0.055)',
];
const requiredTraffic = [
  'workletStableLaneCrossfadeFrameCount',
  'workletStableLaneGainRampFrameCount',
];
const requiredAnalyzer = [
  'maxWorkletStableLaneCrossfadeFrameCount',
  'maxWorkletStableLaneGainRampFrameCount',
];

const missing = [];
for (const token of requiredBridge) if (!bridge.includes(token)) missing.push(`bridge:${token}`);
for (const token of requiredTraffic) if (!traffic.includes(token)) missing.push(`traffic:${token}`);
for (const token of requiredAnalyzer) if (!analyzer.includes(token)) missing.push(`analyzer:${token}`);

if (!bridge.includes('const hasPreviousStableLane = this.previousStableLane !== null;')) {
  missing.push('bridge:previous lane must keep process path alive during crossfade');
}
if (!bridge.includes('stableCrossfadeFramesThisQuantum') || !bridge.includes('stableGainRampFramesThisQuantum')) {
  missing.push('processor:crossfade/gain-ramp counters missing');
}
if (/setTargetAtTime\(0\.58/.test(bridge)) {
  missing.push('bridge:legacy/worklet additive output gain still too hot at 0.58');
}

if (missing.length) {
  console.error('[check-stable-lane-hold-crossfade-voice] missing contracts:');
  for (const item of missing) console.error(` - ${item}`);
  process.exit(1);
}
console.log('[check-stable-lane-hold-crossfade-voice] OK');
