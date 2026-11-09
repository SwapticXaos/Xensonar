#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const browserProbePath = path.join(root, 'tools/check-stable-lane-browser-responsibility-readout.mjs');
const perfPanelPath = path.join(root, 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const packagePath = path.join(root, 'package.json');

const missing = [];
if (!fs.existsSync(browserProbePath)) missing.push('missing tools/check-stable-lane-browser-responsibility-readout.mjs');

const browserProbe = fs.existsSync(browserProbePath) ? fs.readFileSync(browserProbePath, 'utf8') : '';
const perfPanel = fs.readFileSync(perfPanelPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const requiredProbeMarkers = [
  'stable-lane-browser-responsibility-readout.json',
  '__XENSONAR_STABLE_LANE_RESPONSIBILITY_READOUT__',
  'Root-Follow Voice Engine wählen',
  'worklet-stable-lane-pilot',
  'Legacy-Relief Gate',
  'Stable Lane',
  'Frame-Delta',
  'Lane-Quanten',
  'Plan-Transport',
  'SAB-Readiness',
  'Boot-Probe',
  'Audio-Probe',
  'Silent-Plan Probe',
  '__XENSONAR_STABLE_LANE_AB_REPORT__',
  '__XENSONAR_STABLE_LANE_STRESS_SCENARIO_HARNESS__',
  'A/B-Report',
  'Stress-Harness',
  'Click/Burst Proxy',
  'Relief-Proof',
  'Expressive Pressure',
  'SAB-Differenz',
  '__XENSONAR_STABLE_LANE_CLICK_BURST_PROXY_REPORT__',
  '__XENSONAR_STABLE_LANE_ROOT_MATERIAL_RELIEF_PROOF_REPORT__',
  '__XENSONAR_STABLE_LANE_EXPRESSIVE_PRESSURE_ADDON_REPORT__',
  '__XENSONAR_STABLE_LANE_SAB_DIFFERENTIAL_REPORT__',
  '__XENSONAR_STABLE_LANE_SYNTHETIC_SILENT_PLAN_PROBE__',
  '__XENSONAR_STABLE_LANE_BOOT_PROBE__',
  '__XENSONAR_STABLE_LANE_AUDIO_CONTEXT_USER_GESTURE_PROBE__',
  'Live-Ankunft',
  'Voice-Pool Gesamt',
  'Pressure-Policy',
  '__XENSONAR_HOLISTIC_PRESSURE_BUDGET_POLICY__',
  '__XENSONAR_STABLE_LANE_LIVE_DELIVERY_PROOF__',
  '__XENSONAR_HOLISTIC_VOICE_POOL_FALLBACK_REPORT__',
  'browser-navigation-blocked-by-policy',
  'strict-ui',
  'message-port',
];

const requiredUiMarkers = [
  'StableLaneResponsibilityReadoutSnapshot',
  '__XENSONAR_STABLE_LANE_RESPONSIBILITY_READOUT__',
  'data-root-follow-browser-responsibility-readout="true"',
  'data-root-follow-browser-responsibility-voice-engine',
  'data-root-follow-browser-responsibility-plan-transport',
  'browserResponsibilityReadout.planTransport',
  'browserResponsibilityReadout.reliefEvents',
  'browserResponsibilityReadout.blend',
  'rootFollowVoiceEngineMode',
  'sabReadinessReadout',
  'data-root-follow-synthetic-silent-plan-probe',
  'formatStableLaneABReportUiValue',
  'formatStableLaneStressHarnessUiValue',
  'formatStableLaneClickBurstProxyUiValue',
  'formatStableLaneRootMaterialReliefProofUiValue',
  'formatStableLaneExpressivePressureAddOnUiValue',
  'formatStableLaneSabReadinessDifferentialUiValue',
  'data-root-follow-stable-lane-ab-report',
  'data-root-follow-stable-lane-stress-harness',
  'Silent-Plan Probe',
  'Click/Burst Proxy',
  'Relief-Proof',
  'Expressive Pressure',
  'SAB-Differenz',
  '__XENSONAR_STABLE_LANE_CLICK_BURST_PROXY_REPORT__',
  '__XENSONAR_STABLE_LANE_ROOT_MATERIAL_RELIEF_PROOF_REPORT__',
  '__XENSONAR_STABLE_LANE_EXPRESSIVE_PRESSURE_ADDON_REPORT__',
  '__XENSONAR_STABLE_LANE_SAB_DIFFERENTIAL_REPORT__',
  '__XENSONAR_STABLE_LANE_SYNTHETIC_SILENT_PLAN_PROBE__',
  'formatStableLaneLiveDeliveryProofUiValue',
  'formatHolisticPressureBudgetPolicyUiValue',
  'Pressure-Policy',
];

for (const marker of requiredProbeMarkers) {
  if (!browserProbe.includes(marker)) missing.push(`browser responsibility probe missing ${marker}`);
}
for (const marker of requiredUiMarkers) {
  if (!perfPanel.includes(marker)) missing.push(`ui responsibility readout missing ${marker}`);
}

if (!pkg.scripts?.['xensonar:check-stable-lane-browser-responsibility-readout']) {
  missing.push('package script xensonar:check-stable-lane-browser-responsibility-readout missing');
}
if (!pkg.scripts?.['xensonar:check-stable-lane-browser-responsibility-readout-contract']) {
  missing.push('package script xensonar:check-stable-lane-browser-responsibility-readout-contract missing');
}

if (browserProbe.includes('playwright') || browserProbe.includes('puppeteer')) {
  missing.push('browser responsibility probe should use installed Chromium/CDP directly, not add Playwright/Puppeteer dependency');
}

if (missing.length) {
  console.error('[check-stable-lane-browser-responsibility-readout-contract] FAIL');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[check-stable-lane-browser-responsibility-readout-contract] OK: browser-visible responsibility readout probe covers voice-engine, relief gate, frame delta, lane quanta, transport and SAB status.');
