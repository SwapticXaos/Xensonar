import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mustContain = [
  ['src/features/xensonar/performanceCrisis/performanceCrisisTypes.ts', ['PerformanceCrisisPresetId', 'GranularRootFollowCrisisPolicy', 'ParticlePerformancePolicy', 'WaveStarterPerformancePolicy']],
  ['src/features/xensonar/performanceCrisis/performanceCrisisPresetRegistry.ts', ['open-687', 'pressure-safe-6879', 'live-protection', 'studio-density', 'diagnostic-strict']],
  ['src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', ['Performance &amp; Krisenmanagement', 'data-performance-crisis-diagnostics-delegation']],
  ['src/features/xensonar/performanceCrisis/performanceCrisisPanelModel.ts', ['Granular / Root-Follow', 'Partikel', 'Wellenstarter']],
  ['src/features/xensonar/layout/AppMainContent.tsx', ['PerformanceCrisisManagementPanel', 'performanceCrisisPanelProps', 'ResonanceBurstDiagnosticsPanel']],
  ['src/App.tsx', ['useAppResonancePanelPropsBoundary', 'performanceCrisisUiPolicyState', 'buildAppResonancePanelCallsiteSources', 'performanceCrisis: {']],
  ['src/features/xensonar/layout/appResonancePanelCallsiteSourceTypes.ts', ['AppPanelPerformanceCrisisCallsiteSource', "'rootFollowGranulationSource'"]],
  ['src/features/xensonar/layout/appResonancePanelCallsiteSources.ts', ['buildAppResonancePanelCallsiteSources', 'performanceCrisis,']],
  ['src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts', ['buildPerformanceCrisisPanelProps', 'performanceCrisisPanelProps']],
  ['src/features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary.ts', ['buildAppPerformanceCrisisPanelBoundary', 'performanceCrisisPresetId', 'setPerformanceCrisisPresetId', 'rootFollowGranulationSource', 'applyGranularRootFollowSettings: updateRootFollowGranularSettings']],
];

const failures = [];
for (const [rel, needles] of mustContain) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    failures.push(`missing file: ${rel}`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${rel}: missing ${needle}`);
  }
}


const panelText = fs.readFileSync(path.join(root, 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx'), 'utf8');
if (/PerformanceCrisisTab = [^;]*(burst|therapist)/.test(panelText)) {
  failures.push('PerformanceCrisisManagementPanel must not duplicate Burst-Diagnose or Browser/App as tabs');
}
if (/onStartAudioBurstRecorder|onExportAudioBurstRecorder|onRunAudioPairTherapistReset/.test(panelText)) {
  failures.push('PerformanceCrisisManagementPanel must not duplicate operational Burst/PaarTherapeut actions');
}

const appText = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
if (/rootFollowCrisisState|rootFollowOverloadState|granularPressureState/.test(appText)) {
  failures.push('App.tsx contains a forbidden duplicate Root-Follow crisis state name');
}

if (failures.length) {
  console.error('[performance-crisis-management-contract] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[performance-crisis-management-contract] OK');
