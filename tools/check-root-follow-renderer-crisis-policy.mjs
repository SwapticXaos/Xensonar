import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path}: missing ${label}`);
}

must('src/features/xensonar/rootFollow/rootFollowCrisisRenderPolicy.ts', 'buildRootFollowCrisisRenderEnvelope', 'root follow crisis render envelope');
must('src/features/xensonar/rootFollow/rootFollowCrisisRenderPolicy.ts', 'applyRootFollowCrisisDensityToGranularSettings', 'density-to-granular-settings binding');
must('src/features/xensonar/rootFollow/rootFollowCrisisRenderPolicy.ts', 'resolveRootFollowLateWindowStart', 'late/stale window policy');
must('src/features/xensonar/rootFollow/rootFollowCrisisRenderPolicy.ts', 'limitRootFollowDirectEventsUnderCrisis', 'direct event density/stale limiter');
must('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts', 'densityReductionUnderLoad: number', 'runtime density field');
must('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts', 'lateGrainStrategy', 'runtime late-grain field');
must('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts', 'staleWindowMs', 'runtime stale-window field');
must('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts', 'preventCatchUpStorm', 'runtime catch-up storm field');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'applyRootFollowCrisisDensityToGranularSettings', 'material renderer applies density');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', 'resolveRootFollowLateWindowStart', 'material renderer applies late/stale');
must('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts', "recordAudioPressureAdaptiveAction('root-follow-late-slice-resync')", 'material renderer records adaptive late action');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'limitRootFollowDirectEventsUnderCrisis', 'synth direct window applies event limiter');
must('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts', 'originalEventCount', 'synth direct traffic records reduced count');
must('src/features/xensonar/material/useRootFollowLoopPlayback.ts', 'rootFollowPolicy,', 'playback forwards root follow policy');
must('src/features/xensonar/material/useRootFollowLoopPlayback.ts', 'audioPressureBias: getAudioPressureBias?.() ?? 0', 'playback forwards pressure bias');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Renderer-Druckpfad', 'UI truth status changed to renderer-wired');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Wirksam: Druckreduktion', 'UI labels density as wired');

const helper = read('src/features/xensonar/rootFollow/rootFollowCrisisRenderPolicy.ts');
if (helper.includes('while (true') || helper.includes('for (;;)')) failures.push('Root-Follow crisis helper must not introduce open-ended fallback cascades.');
if (!helper.includes('smoothstep')) failures.push('Density reduction should be smoothed, not a hard threshold.');
if (!helper.includes('firstRootFollowSliceOnGridAtOrAfter')) failures.push('Stale resync must preserve transport/grid continuity.');

if (failures.length) {
  console.error('[root-follow-renderer-crisis-policy] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[root-follow-renderer-crisis-policy] OK · Root-Follow renderer reads density, Late-Grain, Stale and Catch-up policy.');
