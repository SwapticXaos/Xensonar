#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  guard: 'src/features/xensonar/audio/holisticCapacityFirstAdmissionGuard.ts',
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

must(files.guard, 'capacity-first-density-preservation-thinning-last-resort', 'guard id');
must(files.guard, 'increase-maximum-musical-event-density-via-worklet-lanes', 'musical density goal');
must(files.guard, 'allowsProactiveEventReduction: false', 'proactive event reduction denied');
must(files.guard, 'thinningAllowedOnlyAfterLegacyPressure: true', 'thinning only after legacy pressure');
must(files.guard, 'rootMaterialReductionAllowed: false', 'root/material reduction closed');
must(files.guard, 'worklet-capacity-expansion', 'root worklet capacity mode');
must(files.guard, 'bounded-microrelease-density-preserving', 'wellenstarter density preserving mode');
must(files.guard, 'bounded-microrelease-stale-only-last-resort', 'wellenstarter stale-only last resort');
must(files.guard, 'impact-preserving-density', 'particle impact preserving mode');
must(files.guard, 'impact-preserving-weak-intent-last-resort', 'particle weak intent last resort');
must(files.guard, 'event-reduction-open-before-legacy-pressure', 'early reduction violation check');
must(files.guard, 'formatHolisticCapacityFirstAdmissionGuardUiValue', 'guard UI formatter');
must(files.guard, '__XENSONAR_HOLISTIC_CAPACITY_FIRST_ADMISSION_GUARD__', 'browser global');

must(files.panel, 'buildHolisticCapacityFirstAdmissionGuard', 'panel builds capacity guard');
must(files.panel, 'formatHolisticCapacityFirstAdmissionGuardUiValue', 'panel formats capacity guard');
must(files.panel, '__XENSONAR_HOLISTIC_CAPACITY_FIRST_ADMISSION_GUARD__', 'panel publishes guard global');
must(files.panel, 'Capacity-Guard', 'Capacity-Guard UI line');

must(files.browserProbe, '__XENSONAR_HOLISTIC_CAPACITY_FIRST_ADMISSION_GUARD__', 'browser probe reads guard global');
must(files.browserProbe, "valueAfterLabel('Capacity-Guard')", 'browser probe reads Capacity-Guard line');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-holistic-capacity-first-admission-guard']) {
  missing.push('package script xensonar:check-holistic-capacity-first-admission-guard missing');
}

if (missing.length) {
  console.error('[holistic-capacity-first-admission-guard] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[holistic-capacity-first-admission-guard] OK · Capacity-first admission guard keeps density preservation ahead of last-resort thinning.');
