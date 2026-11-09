#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  harness: 'src/features/xensonar/diagnostics/stableLaneStressHarness.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  pkg: 'package.json',
};
const missing = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) missing.push(`missing ${label}: ${file}`);
}
const harness = read(files.harness);
const panel = read(files.panel);
const browserProbe = read(files.browserProbe);
const pkg = read(files.pkg);

for (const marker of [
  'StableLaneClickBurstProxyReport',
  'StableLaneRootMaterialReliefProofReport',
  'buildStableLaneClickBurstProxyReport',
  'buildStableLaneRootMaterialReliefProofReport',
  'stable-lane-click-burst-proxy',
  'stable-lane-root-material-relief-proof',
  'clickBurstProxyScore',
  'rootMaterialMicroSlicePressure',
  'defaultCandidateReady',
  'needs-fresh-frame-window',
  'needs-relief-event',
  'processor-errors',
  'formatStableLaneClickBurstProxyUiValue',
  'formatStableLaneRootMaterialReliefProofUiValue',
]) {
  if (!harness.includes(marker)) missing.push(`harness missing ${marker}`);
}

for (const marker of [
  '__XENSONAR_STABLE_LANE_CLICK_BURST_PROXY_REPORT__',
  '__XENSONAR_STABLE_LANE_ROOT_MATERIAL_RELIEF_PROOF_REPORT__',
  'Click/Burst Proxy',
  'Relief-Proof',
  'formatStableLaneClickBurstProxyUiValue',
  'formatStableLaneRootMaterialReliefProofUiValue',
]) {
  if (!panel.includes(marker)) missing.push(`panel missing ${marker}`);
}

for (const marker of [
  'liveClickBurstProxyReport',
  'liveRootMaterialReliefProofReport',
  'Click/Burst Proxy',
  'Relief-Proof',
  '__XENSONAR_STABLE_LANE_CLICK_BURST_PROXY_REPORT__',
  '__XENSONAR_STABLE_LANE_ROOT_MATERIAL_RELIEF_PROOF_REPORT__',
]) {
  if (!browserProbe.includes(marker)) missing.push(`browser probe missing ${marker}`);
}

if (!pkg.includes('xensonar:check-stable-lane-click-burst-relief-proof')) {
  missing.push('package script missing xensonar:check-stable-lane-click-burst-relief-proof');
}
if (harness.includes('new AudioContext(') || harness.includes('setInterval(')) {
  missing.push('click/burst proof domain must remain pure/report-only, not schedule audio directly');
}

if (missing.length) {
  console.error('[stable-lane-click-burst-relief-proof] FAIL');
  for (const item of missing) console.error(' - ' + item);
  process.exit(1);
}
console.log('[stable-lane-click-burst-relief-proof] OK · Click/Burst proxy metrics and Root/Material Relief-Proof report are browser-readable and report-only.');
