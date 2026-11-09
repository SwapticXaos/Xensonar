#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [
  {
    path: 'src/features/xensonar/rooms/WaveStarterHoldPatternEditorSlot.tsx',
    patterns: [
      'ResonanceInlineEditorSlot',
      'Gallopp',
      'Einsatz frei',
      'normalizeWaveStarterHoldPatternSteps',
    ],
  },
  {
    path: 'src/features/xensonar/rooms/ResonanceSoundPalettePanel.tsx',
    patterns: [
      'Enter-Hold Muster',
      'Klaviatur-Hold Muster',
      'waveStarterHoldPatternSteps',
      'keyboardHoldPatternSteps',
    ],
  },
  {
    path: 'src/features/xensonar/input/waveStarterHoldSegmentClock.ts',
    patterns: [
      'normalizeWaveStarterHoldPatternSteps',
      'isWaveStarterHoldPatternStepActive',
      'gesture-pattern-muted-step',
      'patternMutedPulseCount',
      'activeStepsByLane',
    ],
  },
  {
    path: 'src/App.tsx',
    patterns: [
      'resolveWaveStarterHoldPatternStepsForLane',
      'activeSteps: resolveWaveStarterHoldPatternStepsForLane("wellenstart")',
      'activeSteps: resolveWaveStarterHoldPatternStepsForLane("klaviatur")',
      'activeStepsByLane',
    ],
  },
  {
    path: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
    patterns: [
      'activeSteps?: number[]',
      'gesture.activeSteps',
      'stepActive',
      'activeSteps[stepIndex] !== 0',
    ],
  },
];

const failures = [];
for (const check of checks) {
  const content = read(check.path);
  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) failures.push(`${check.path}: missing ${pattern}`);
  }
}

if (failures.length) {
  console.error('[check-wavestarter-hold-pattern-workbench] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[check-wavestarter-hold-pattern-workbench] PASS');
