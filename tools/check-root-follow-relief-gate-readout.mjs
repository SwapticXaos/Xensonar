#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  renderer: 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts',
  forensics: 'src/features/xensonar/audioTraffic/audioTrafficForensics.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  burstPanel: 'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx',
};

const text = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, fs.readFileSync(path, 'utf8')]),
);

const required = [
  ['renderer', 'type RootFollowLegacyReliefGate'],
  ['renderer', 'resolveStableLaneReliefGate'],
  ['renderer', 'legacyReliefGate: "granular-primary-health"'],
  ['renderer', 'legacyReliefGate: "stable-lane-sustained-relief"'],
  ['renderer', 'legacyReliefGate,'],
  ['renderer', 'legacyReliefGateSource'],
  ['forensics', 'export type RootFollowLegacyReliefGate'],
  ['forensics', 'legacyReliefGate: RootFollowLegacyReliefGate'],
  ['forensics', 'stableLaneReliefEvents: number'],
  ['forensics', "entry.kind === 'worklet-stable-lane-blend'"],
  ['forensics', "entry.kind === 'worklet-stable-lane-relieves-legacy-slice'"],
  ['forensics', "legacyReliefGate = 'granular-primary-health'"],
  ['panel', 'data-root-follow-legacy-relief-gate-readout'],
  ['panel', 'aktuelle Verantwortungsschicht'],
  ['panel', 'Legacy-Relief Gate'],
  ['panel', 'Relief Events'],
  ['burstPanel', 'data-root-follow-relief-gate-diagnostic'],
  ['burstPanel', 'Relief-Gate'],
];

const failures = [];
for (const [key, needle] of required) {
  if (!text[key].includes(needle)) failures.push(`${files[key]}: missing ${needle}`);
}

if (/stableLaneReliefReady\s*&&\s*granularWorkletPrimaryCanMuteLegacy/.test(text.renderer)) {
  failures.push('Renderer must not silently bind Primary Candidate to Stable-Lane relief readiness');
}
if (!/return "granular-primary-health"/.test(text.renderer)) {
  failures.push('Renderer must keep granular Primary Candidate as its own relief gate label');
}
if (!/return "stable-lane-sustained-relief"/.test(text.renderer)) {
  failures.push('Renderer must keep Stable-Lane sustained relief as its own relief gate label');
}

if (failures.length) {
  console.error('[check-root-follow-relief-gate-readout] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-root-follow-relief-gate-readout] OK');
