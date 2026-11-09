#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  policy: 'src/features/xensonar/audio/holisticPressureBudgetPolicy.ts',
  holistic: 'src/features/xensonar/audio/holisticVoicePoolFallback.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  pkg: 'package.json',
};
const missing = [];
function read(path) { return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : ''; }
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) missing.push(`${path}: missing ${label}`);
}
for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) missing.push(`missing ${label} file ${file}`);
}

must(files.policy, 'worklet-capacity-first-fluid-default', 'capacity-first fluid default strategy');
must(files.policy, 'primaryGoal: "increase-maximum-event-density-via-worklet"', 'primary goal is worklet event-density increase');
must(files.policy, 'foregroundsEventReduction: false', 'event reduction not foregrounded');
must(files.policy, 'legacyFallbackBeforeThinning: true', 'legacy fallback before thinning');
must(files.policy, 'eventThinningLastResortOnly: true', 'thinning is last resort');
must(files.policy, 'root-material-worklet-capacity', 'root/material first capacity priority');
must(files.policy, 'wave-starter-bounded-microrelease', 'wellenstarter bounded microrelease priority');
must(files.policy, 'particle-strong-impact-preservation', 'particle strong impact preservation priority');
must(files.policy, 'legacy-thinning-last-resort', 'legacy thinning last resort priority');
must(files.policy, 'bounded-microrelease-no-catchup', 'wellenstarter no catch-up directive');
must(files.policy, 'preserve-strong-impact-thin-only-under-legacy-pressure', 'particle preservation directive');
must(files.policy, 'formatHolisticPressureBudgetPolicyUiValue', 'UI formatter');
must(files.policy, '__XENSONAR_HOLISTIC_PRESSURE_BUDGET_POLICY__', 'browser global');

must(files.panel, 'buildHolisticPressureBudgetPolicy', 'panel builds policy from holistic report');
must(files.panel, 'formatHolisticPressureBudgetPolicyUiValue', 'panel formats pressure policy');
must(files.panel, '__XENSONAR_HOLISTIC_PRESSURE_BUDGET_POLICY__', 'panel publishes policy global');
must(files.panel, 'Pressure-Policy', 'Pressure-Policy UI line');
must(files.browserProbe, '__XENSONAR_HOLISTIC_PRESSURE_BUDGET_POLICY__', 'browser probe reads policy global');
must(files.browserProbe, "valueAfterLabel('Pressure-Policy')", 'browser probe reads Pressure-Policy line');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-holistic-pressure-budget-policy']) {
  missing.push('package script xensonar:check-holistic-pressure-budget-policy missing');
}

if (missing.length) {
  console.error('[holistic-pressure-budget-policy] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[holistic-pressure-budget-policy] OK · Capacity-first fluid default policy protects Worklet event-density expansion and keeps thinning as Legacy-pressure last resort.');
