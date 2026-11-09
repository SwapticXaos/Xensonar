#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  live: 'src/features/xensonar/diagnostics/stableLaneLiveDeliveryProof.ts',
  holistic: 'src/features/xensonar/audio/holisticVoicePoolFallback.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  core: 'src/core/audio/audioWorkletVoicePoolBoundary.ts',
  pkg: 'package.json',
};
const missing = [];
for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) missing.push(`missing ${label} file ${file}`);
}
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) missing.push(`${file}: missing ${label}`);
}

must(files.live, 'StableLaneLiveDeliveryProofReport', 'live delivery proof report type');
must(files.live, 'buildStableLaneLiveDeliveryProofReport', 'live delivery proof builder');
must(files.live, 'worklet-stable-lane-pilot-ui-default-not-arrived', 'UI default arrival blocker');
must(files.live, 'stable-lane-runtime-policy-not-observed', 'runtime policy blocker');
must(files.live, 'stable-lane-plan-transport-not-posted', 'plan transport blocker');
must(files.live, 'stable-lane-blend-or-relief-event-not-observed', 'blend/relief blocker');
must(files.live, 'stable-lane-frame-proof-missing', 'frame proof blocker');
must(files.live, 'formatStableLaneLiveDeliveryProofUiValue', 'live delivery UI formatter');

must(files.holistic, 'ROOT_FOLLOW_STABLE_LANE_VOICE_POOL_PREPARATION', 'root/material voice pool preparation');
must(files.holistic, 'WAVE_STARTER_BOUNDED_VOICE_POOL_PREPARATION', 'wave starter voice pool preparation');
must(files.holistic, 'PARTICLE_INTENT_VOICE_POOL_PREPARATION', 'particle voice pool preparation');
must(files.holistic, 'HOLISTIC_XENSONAR_VOICE_POOL_PREPARATIONS', 'holistic preparation list');
must(files.holistic, 'laneId: "wave-starter"', 'wave starter lane id');
must(files.holistic, 'laneId: "particles"', 'particle lane id');
must(files.holistic, 'bounded latest-intent voice pool', 'Wellenstarter bounded latest-intent semantics');
must(files.holistic, 'intent-admission pool', 'Partikel admission pool semantics');
must(files.holistic, 'preservesMainThreadReferencePath: true', 'fallback reference path preservation');
must(files.holistic, 'buildHolisticVoicePoolFallbackReport', 'holistic fallback report builder');
must(files.holistic, 'formatHolisticVoicePoolFallbackUiValue', 'holistic UI formatter');

must(files.panel, '__XENSONAR_STABLE_LANE_LIVE_DELIVERY_PROOF__', 'live delivery browser global');
must(files.panel, '__XENSONAR_HOLISTIC_VOICE_POOL_FALLBACK_REPORT__', 'holistic voice pool browser global');
must(files.panel, 'Live-Ankunft', 'Live-Ankunft UI line');
must(files.panel, 'Voice-Pool Gesamt', 'Voice-Pool Gesamt UI line');
must(files.panel, 'data-root-follow-live-delivery-proof', 'live delivery DOM marker');
must(files.panel, 'data-holistic-voice-pool-fallback', 'holistic DOM marker');
must(files.panel, 'formatStableLaneLiveDeliveryProofUiValue', 'live delivery formatter used in UI');
must(files.panel, 'formatHolisticVoicePoolFallbackUiValue', 'holistic formatter used in UI');

must(files.browserProbe, '__XENSONAR_STABLE_LANE_LIVE_DELIVERY_PROOF__', 'browser probe reads live delivery global');
must(files.browserProbe, '__XENSONAR_HOLISTIC_VOICE_POOL_FALLBACK_REPORT__', 'browser probe reads holistic global');
must(files.browserProbe, "valueAfterLabel('Live-Ankunft')", 'browser probe reads Live-Ankunft line');
must(files.browserProbe, "valueAfterLabel('Voice-Pool Gesamt')", 'browser probe reads Voice-Pool line');

must(files.core, 'wave-starter', 'core voice pool lane includes wave starter');
must(files.core, 'particles', 'core voice pool lane includes particles');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-stable-lane-live-delivery-holistic-voice-pool']) {
  missing.push('package script xensonar:check-stable-lane-live-delivery-holistic-voice-pool missing');
}

if (missing.length) {
  console.error('[stable-lane-live-delivery-holistic-voice-pool] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[stable-lane-live-delivery-holistic-voice-pool] OK · Worklet Stable-Lane live-delivery proof and holistic Wellenstarter/Partikel voice-pool fallback contract are wired into browser-visible diagnostics.');
