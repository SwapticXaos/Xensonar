import fs from 'node:fs';

const panel = fs.readFileSync('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'utf8');

const required = [
  ['agency data marker', 'data-performance-crisis-agency-note="recording-burst-agency"'],
  ['musical priority agency', 'Rastertreue, Attack, Dichte, Direktheit oder Stabilität'],
  ['recording burst note', 'Live-Bursts'],
  ['open recording style allowance', 'Klangforschungs-Situationen'],
  ['wave starter load note marker', 'data-performance-crisis-wave-starter-load-note="smooth-before-thin"'],
  ['wave starter smooth before thin note', 'Wellenstarter'],
];

const failed = required.filter(([, needle]) => !panel.includes(needle)).map(([name, needle]) => `${name}: missing ${needle}`);

if (/onStartAudioBurstRecorder|onExportAudioBurstRecorder|onRunAudioPairTherapistReset/.test(panel)) {
  failed.push('Performance crisis text patch must not duplicate Burst/PaarTherapeut actions.');
}

if (failed.length) {
  console.error('[performance-crisis-agency-ui-text] FAIL');
  for (const failure of failed) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[performance-crisis-agency-ui-text] OK');
