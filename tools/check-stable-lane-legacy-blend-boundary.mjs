#!/usr/bin/env node
import fs from 'node:fs';
import ts from './typescript-runtime.mjs';

const bridge = fs.readFileSync('src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts', 'utf8');
const renderer = fs.readFileSync('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'utf8');
const policy = fs.readFileSync('src/features/xensonar/rootFollow/rootFollowLaneOwnershipPolicy.ts', 'utf8');
const traffic = fs.readFileSync('src/features/xensonar/audioTraffic/audioTrafficForensics.ts', 'utf8');

const requiredPolicy = [
  'export function resolveRootFollowStableLaneBlend',
  'stableLaneProven',
  'stableLaneReliefReady',
  'STABLE_LANE_RELIEF_MIN_RENDERED_FRAMES = 8192',
  'STABLE_LANE_RELIEF_MIN_ACTIVE_QUANTA = 8',
  `return {\n    legacyBlend: 0,\n    stableLaneBlend: 0.72,`,
  'export function shouldRelieveLegacyRootFollowMaterialSlice',
  'args.stableLaneEnabled &&',
  'args.stableLaneReliefReady &&',
  '!args.primaryCandidateCanMuteLegacy',
];
const requiredRenderer = [
  'resolveRootFollowStableLaneBlend',
  'shouldRelieveLegacyRootFollowMaterialSlice',
  'legacyBlendGain.gain.setTargetAtTime(',
  'stableLaneBlend.legacyBlend,',
  'ctx.currentTime,',
  '0.055,',
  'const legacyBaseDestination =',
  'stableLaneWorkletPilotEnabled && stableLaneBlend.legacyBlend < 0.999',
  'destination: legacyDestination',
  'stableLaneBlend: stableLaneBlend.stableLaneBlend',
  'legacyBlend: stableLaneBlend.legacyBlend',
  'kind: "worklet-stable-lane-blend"',
];
const requiredBridge = [
  'stableLaneBlend?: number',
  'legacyBlend?: number',
  'clampStableLanePilotBlend',
  'const stableLaneBlendTarget = clampStableLanePilotBlend(',
  'args.lanePlan.stableLaneBlend,',
  '0.42,',
  'gainParam.setTargetAtTime(',
  'stableLaneBlendTarget,',
  'args.audioNowSec,',
  '0.055,',
  'stableLaneBlendTarget:',
  'legacyBlendTarget:',
];
const requiredTraffic = [
  "| 'worklet-stable-lane-blend'",
  "| 'worklet-stable-lane-relieves-legacy-slice'",
];

const missing = [];
for (const token of requiredPolicy) if (!policy.includes(token)) missing.push(`policy:${token}`);
for (const token of requiredRenderer) if (!renderer.includes(token)) missing.push(`renderer:${token}`);
for (const token of requiredBridge) if (!bridge.includes(token)) missing.push(`bridge:${token}`);
for (const token of requiredTraffic) if (!traffic.includes(token)) missing.push(`traffic:${token}`);

if ((policy.includes('legacyBlend: 0,') || policy.includes('legacyBlend: 0.0,')) && !renderer.includes('stable-lane-sustained-replaces-legacy-material-slice')) {
  missing.push('renderer:legacy full relief must only appear behind stable-lane sustained ownership transfer');
}
if (policy.includes('stableLaneEnabled && args.stableLaneProven && !args.primaryCandidateCanMuteLegacy')) {
  missing.push('renderer:legacy relief still gated by stableLaneProven instead of stableLaneReliefReady');
}
if (/setTargetAtTime\(0\.58/.test(bridge)) {
  missing.push('bridge:old hot stable-lane output gain still present');
}
if (/stableLaneActive:\s*lanePosted/.test(bridge)) {
  missing.push('bridge:traffic must not equate posted plan with acknowledged active stable lane');
}

// Execute the extracted ownership policy itself for four characteristic states.
try {
  const js = ts.transpileModule(policy, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  const fakeRequire = (id) => {
    if (id.includes('canonicalPreviewMaterialElastic')) return { describeMaterialElasticPitch: ({ targetHz, anchorHz }) => ({ elasticRate: targetHz / anchorHz }) };
    if (id.includes('resonanceRuntimeMath')) return { clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) };
    if (id.includes('rootFollowMicroCutSafety')) return { smoothRootFollowMaterialTargetHz: ({ rawHz }) => rawHz };
    return {};
  };
  new Function('module', 'exports', 'require', js)(module, module.exports, fakeRequire);
  const { resolveRootFollowStableLaneBlend, shouldRelieveLegacyRootFollowMaterialSlice } = module.exports;
  const now = performance.now();
  const base = {
    enabled: true,
    stableLanePlanAcked: true,
    stableLaneBufferAcked: true,
    stableLaneRenderedFrameCount: 12000,
    stableLaneRenderedFrameDelta: 512,
    stableLaneActiveRenderQuantumCount: 12,
    activeRenderQuantumCount: 12,
    lastStableLaneFrameAdvanceAtMs: now,
    processLoopActive: true,
    processorErrorCount: 0,
    lastMessageAtMs: now,
    lastStableLaneAckAtMs: now,
    primaryAudition: false,
  };
  const disabled = resolveRootFollowStableLaneBlend({ ...base, enabled: false });
  if (disabled.legacyBlend !== 1 || disabled.stableLaneBlend !== 0 || disabled.stableLaneReliefReady) missing.push('policy:disabled ownership behavior drift');
  const warming = resolveRootFollowStableLaneBlend({ ...base, stableLaneRenderedFrameCount: 4096 });
  if (warming.legacyBlend !== 0.68 || warming.stableLaneBlend !== 0.56 || warming.stableLaneReliefReady) missing.push('policy:warmup blend behavior drift');
  const ready = resolveRootFollowStableLaneBlend(base);
  if (ready.legacyBlend !== 0 || ready.stableLaneBlend !== 0.72 || !ready.stableLaneReliefReady) missing.push('policy:sustained ownership behavior drift');
  const fallback = resolveRootFollowStableLaneBlend({ ...base, processLoopActive: false });
  if (fallback.legacyBlend !== 1 || fallback.stableLaneBlend !== 0.42 || fallback.fallbackReason !== 'process-loop-inactive') missing.push('policy:fallback behavior drift');
  if (!shouldRelieveLegacyRootFollowMaterialSlice({ stableLaneEnabled: true, stableLaneReliefReady: true, primaryCandidateCanMuteLegacy: false })) missing.push('policy:relief predicate behavior drift');
  if (shouldRelieveLegacyRootFollowMaterialSlice({ stableLaneEnabled: true, stableLaneReliefReady: false, primaryCandidateCanMuteLegacy: false })) missing.push('policy:warmup must not relieve legacy');
} catch (error) {
  missing.push(`policy:behavioral probe failed: ${error?.message || error}`);
}

if (missing.length) {
  console.error('[check-stable-lane-legacy-blend-boundary] missing contracts:');
  for (const item of missing) console.error(` - ${item}`);
  process.exit(1);
}
console.log('[check-stable-lane-legacy-blend-boundary] OK');
