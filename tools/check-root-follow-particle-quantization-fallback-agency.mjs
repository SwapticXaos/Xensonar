import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path}: missing ${label}`);
}

must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "export type CrisisQuantizationMode", 'shared quantization mode type');
must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "'fallback'", 'fallback mode');
must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "export type CrisisQuantizationGrid", 'shared quantization grid type');
must('src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', "customSegmentsPerBar", 'other/custom segment field');
must('src/features/xensonar/performanceCrisis/crisisQuantizationFallbackPolicy.ts', 'normalizeCrisisSegmentsPerBar', 'segment normalizer');
must('src/features/xensonar/performanceCrisis/crisisQuantizationFallbackPolicy.ts', 'resolveCrisisQuantizedValue', 'root follow quantized value helper');
must('src/features/xensonar/performanceCrisis/crisisQuantizationFallbackPolicy.ts', 'resolveCrisisQuantizedEventTime', 'particle quantized event helper');
must('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts', 'rootFollowQuantizationMode?: CrisisQuantizationModeSelection', 'root follow runtime override');
must('src/features/xensonar/performanceCrisis/performanceCrisisRuntimePolicies.ts', 'particleQuantizationMode?: CrisisQuantizationModeSelection', 'particle runtime override');
must('src/features/xensonar/material/useRootFollowLoopPlayback.ts', 'resolveEffectiveRootHzForWindow', 'root follow last-valid/fallback reader');
must('src/features/xensonar/material/useRootFollowLoopPlayback.ts', 'scheduler-tick-quantized-fallback', 'root follow quantized lifecycle marker');
must('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'resolveCrisisQuantizedEventTime', 'particle queue quantization decision');
must('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'particlePolicy?.quantization', 'particle quantization policy use');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Root Follow Loop Quantisierung', 'root follow UI controls');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Partikel-Zeit unter Druck', 'particle UI controls');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'other: Taktsegmente', 'root follow custom segment input');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'Raster aus Zeit &amp; Echo', 'particle grid must be canonical Zeit & Echo mirror');
must('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'freie', 'root follow agency explanation');
must('src/App.tsx', 'rootFollowPolicy: performanceCrisisRuntimePolicy.rootFollow', 'App passes root follow policy');

const app = read('src/App.tsx');
const policyState = read('src/features/xensonar/performanceCrisis/usePerformanceCrisisUiPolicyState.ts');
const boundary = read('src/features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary.ts');
if (!(app.includes('performanceCrisisRuntimePolicy.particles') && policyState.includes('particleQuantizationMode') && boundary.includes('particleQuantizationMode'))) {
  failures.push('App/performance crisis boundary: missing particle quantization controls');
}


const helper = read('src/features/xensonar/performanceCrisis/crisisQuantizationFallbackPolicy.ts');
if (helper.includes('while (') || helper.includes('for (;;)')) failures.push('Quantization fallback helper must stay cheap, no open-ended fallback cascade.');
if (!helper.includes('256')) failures.push('Custom segment count should be clamped to a finite range.');

if (failures.length) {
  console.error('[root-follow-particle-quantization-fallback-agency] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[root-follow-particle-quantization-fallback-agency] OK · Root Follow and Partikel quantization fallback are shared, optional, finite, and UI-bound.');
