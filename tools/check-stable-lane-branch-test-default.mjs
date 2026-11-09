#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (path) => fs.readFileSync(path, 'utf8');
const must = (path, needle, label) => {
  if (!read(path).includes(needle)) failures.push(`${path}: missing ${label}`);
};
const mustNot = (path, needle, label) => {
  if (read(path).includes(needle)) failures.push(`${path}: forbidden ${label}`);
};

must(
  'src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts',
  'XENSONAR_AUDIO_WORKLET_BRANCH_TEST_ROOT_FOLLOW_VOICE_ENGINE_MODE',
  'named branch-test default constant',
);
must(
  'src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts',
  "'worklet-stable-lane-pilot'",
  'Stable-Lane Pilot default value',
);
must(
  'src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts',
  'XENSONAR_AUDIO_WORKLET_BRANCH_TEST_ROOT_FOLLOW_VOICE_ENGINE_MODE',
  'UI policy state uses branch-test default',
);
must(
  'src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts',
  'useState<RootFollowVoiceEngineMode>(\n      XENSONAR_AUDIO_WORKLET_BRANCH_TEST_ROOT_FOLLOW_VOICE_ENGINE_MODE',
  'fresh UI session starts in Stable-Lane Pilot',
);
mustNot(
  'src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts',
  'useState<RootFollowVoiceEngineMode>("shadow-plan")',
  'old shadow-plan fresh-session default',
);
must(
  'src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts',
  'Worklet Stable-Lane Pilot',
  'UI exposes Stable-Lane Pilot selector option via shared options',
);
must(
  'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts',
  'stableLaneReliefReady',
  'Stable-Lane sustained relief gate remains present',
);
must(
  'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts',
  'legacyReliefGate: "stable-lane-sustained-relief"',
  'Stable-Lane relief readout remains wired',
);

if (failures.length) {
  console.error('[check-stable-lane-branch-test-default] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[check-stable-lane-branch-test-default] OK');
