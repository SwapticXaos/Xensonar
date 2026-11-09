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

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'worklet-granular-primary-candidate'", 'primary candidate voice-engine mode');
must('src/features/xensonar/performanceCrisis/rootFollowVoiceEngineOptions.ts', 'Worklet Granular-Primary Kandidat', 'UI exposes primary candidate option via shared options');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Pilot-Health ready', 'UI states health-gated replacement');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'granularWorkletPrimaryCandidateEnabled', 'material renderer gates primary candidate mode');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'granularWorkletPrimaryCanMuteLegacy', 'legacy mute gate exists');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'pilotHealth === "pilot-ready"', 'primary candidate requires ready pilot health');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'granularAccepted > 0', 'primary candidate requires accepted windows');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'granularBufferAvailable', 'primary candidate requires buffer availability');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'worklet-primary-candidate-mutes-legacy-slice', 'traffic marker for health-gated legacy mute');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'scheduleMaterialElasticSlice({', 'legacy material scheduler remains available');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'scheduleElasticPhaseWindow({', 'legacy fragment scheduler remains available');
mustNot('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'refs.gainRef.current.disconnect', 'primary candidate must not disconnect legacy bus');

if (failures.length) {
  console.error('[check-root-follow-worklet-granular-primary-candidate] FAIL');
  failures.forEach((failure) => console.error(' - ' + failure));
  process.exit(1);
}
console.log('[check-root-follow-worklet-granular-primary-candidate] OK');
