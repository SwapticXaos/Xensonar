#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function exists(path) {
  return existsSync(join(root, path));
}

const matrixPath = 'tools/smartMerge/879CompletionMatrix.json';
if (!exists(matrixPath)) {
  console.error(`[smart-merge-879-completion] missing ${matrixPath}`);
  process.exit(1);
}

const matrix = readJson(matrixPath);
const pkg = readJson('package.json');
const scripts = pkg.scripts ?? {};

if (!String(matrix.version ?? '').trim()) failures.push('matrix.version must identify the historical Smart-Merge matrix line');
if (!String(matrix.sourceBaseline ?? '').trim() || !String(matrix.comparisonBaseline ?? '').trim()) {
  failures.push('historical Smart-Merge matrix must retain sourceBaseline and comparisonBaseline provenance');
}

const slices = Array.isArray(matrix.slices) ? matrix.slices : [];
if (slices.length < 8) failures.push(`expected at least 8 smart-merge slices, found ${slices.length}`);

const requiredIds = [
  'package_station_import_export',
  'material_fragmentation_labor_import',
  'random_demo_default',
  'performance_crisis_management',
  'particle_policy_and_lane',
  'wave_starter_runtime',
  'audio_lane_shared_time',
  'carrier_integral_rendered_material',
  'donatello_dieter_render_bodies',
  'myzel_synth_and_room3',
  'build_profiles_and_source_hygiene',
];
const ids = new Set(slices.map((slice) => slice.id));
for (const id of requiredIds) {
  if (!ids.has(id)) failures.push(`missing required slice id: ${id}`);
}

for (const requiredScript of matrix.requiredPatchflowScripts ?? []) {
  if (!scripts[requiredScript]) failures.push(`required patchflow script missing in package.json: ${requiredScript}`);
}

const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
const appLines = app.split(/\r?\n/).length;
if (appLines >= 7765) failures.push(`App.tsx line count ${appLines} must remain below 6.8.7 boundary 7765`);

for (const slice of slices) {
  if (!slice.id || !slice.status || !slice.classification) failures.push(`slice has incomplete metadata: ${JSON.stringify(slice)}`);
  const criticalFiles = Array.isArray(slice.criticalFiles) ? slice.criticalFiles : [];
  if (criticalFiles.length === 0) failures.push(`slice ${slice.id} has no criticalFiles`);
  const isActive = String(slice.status).startsWith('active');
  const sanityScripts = Array.isArray(slice.sanityScripts) ? slice.sanityScripts : [];
  const plannedScripts = Array.isArray(slice.plannedSanityScripts) ? slice.plannedSanityScripts : [];

  if (isActive) {
    if (sanityScripts.length === 0) failures.push(`active slice ${slice.id} has no sanityScripts`);
    for (const file of criticalFiles) {
      if (!exists(file)) failures.push(`active slice ${slice.id} critical file missing: ${file}`);
    }
    for (const script of sanityScripts) {
      if (!scripts[script]) failures.push(`active slice ${slice.id} sanity script missing in package.json: ${script}`);
    }
  } else if (slice.status === 'pending') {
    if (plannedScripts.length === 0) failures.push(`pending slice ${slice.id} has no plannedSanityScripts`);
    if (!String(slice.acceptance ?? '').trim()) failures.push(`pending slice ${slice.id} has no acceptance text`);
    const presentPendingFiles = criticalFiles.filter((file) => exists(file));
    if (presentPendingFiles.length) {
      warnings.push(`pending slice ${slice.id} already has files present; verify whether status should become active: ${presentPendingFiles.join(', ')}`);
    }
  }
}

// Guard against repeating the 6.9.0.0/0.1 diagnostic duplication mistake.
// Diagnostic labels may appear only as a delegation note; they must not become tabs/actions here.
const performancePanelPath = 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx';
const performancePanelModelPath = 'src/features/xensonar/performanceCrisis/performanceCrisisPanelModel.ts';
if (exists(performancePanelPath)) {
  const panel = readFileSync(join(root, performancePanelPath), 'utf8');
  const model = exists(performancePanelModelPath) ? readFileSync(join(root, performancePanelModelPath), 'utf8') : '';
  if (!model.includes('export type PerformanceCrisisTab = "granular" | "particles" | "wave";')) {
    failures.push('Performance Crisis tab contract must stay limited to granular/particles/wave in performanceCrisisPanelModel.ts');
  }
  if (!panel.includes('import { TAB_LABELS, type PerformanceCrisisTab } from "../performanceCrisisPanelModel";')) {
    failures.push('PerformanceCrisisManagementPanel must consume the canonical tab model rather than redefining tabs');
  }
  for (const forbidden of [
    "activeTab === 'burst'",
    "activeTab === 'browser'",
    "setActiveTab('burst')",
    "setActiveTab('browser')",
    'onExportMarker',
    'onResetBurstRecorder',
    'onRunBrowserAppTherapist',
  ]) {
    if (panel.includes(forbidden)) failures.push(`PerformanceCrisisManagementPanel must not duplicate diagnostic actions: found ${forbidden}`);
  }
  if (!panel.includes('data-performance-crisis-diagnostics-delegation="burst-panel"')) {
    failures.push('PerformanceCrisisManagementPanel must delegate diagnostics to the existing Burst panel, not rebuild it');
  }
}

if (warnings.length) {
  console.warn('[smart-merge-879-completion] warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error('[smart-merge-879-completion] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[smart-merge-879-completion] ok');
console.log(JSON.stringify({
  matrixVersion: matrix.version,
  packageVersion: pkg.version,
  sliceCount: slices.length,
  active: slices.filter((slice) => String(slice.status).startsWith('active')).map((slice) => slice.id),
  pending: slices.filter((slice) => slice.status === 'pending').map((slice) => slice.id),
  appLines,
}, null, 2));
