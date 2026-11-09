#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[material-intake-controller-actions-boundary] ${message}`);
    process.exit(1);
  }
};

const controllerPath = 'src/features/l3lab/materialIntake/useMaterialIntakeController.ts';
const actionsPath = 'src/features/l3lab/materialIntake/materialIntakeControllerActions.ts';

for (const relative of [controllerPath, actionsPath]) {
  assert(fs.existsSync(path.join(root, relative)), `Missing ${relative}`);
}

const controller = read(controllerPath);
const actions = read(actionsPath);

for (const marker of [
  "from './materialIntakeControllerActions';",
  'buildInitialSelectionForMaterialSource(loaded)',
  'sanitizeMaterialIntakeNameFromLabel(loaded.label)',
  'buildRepairUndoSnapshot(selection, repairResult)',
  'buildRepairedLoopSelection(repaired, source.durationSec)',
  'buildLoopRepairStatus(repaired, meter)',
  'cloneMaterialIntakeSelection(repairUndoState.selection)',
  'buildRepairCandidateSelection(candidate, source.durationSec)',
  'buildRepairCandidateStatus(candidate)',
  "buildRawSendStatusMessages('Xensonar')",
  'loopPreviewEngine.stop()',
  'repairLoopSelection(',
  'targetAdapter.commitLoop({ source, selection, readMode, repairResult })',
  'adapter.commitLoop({ source, selection, readMode, repairResult })',
]) {
  assert(controller.includes(marker), `useMaterialIntakeController.ts missing expected marker: ${marker}`);
}

for (const forbidden of [
  'const DEFAULT_DETAIL_DURATION',
  'const DEFAULT_LOOP_DURATION',
  'function sanitizeNameFromLabel',
  'function rangeEnd',
  'repaired.primary.startSec.toFixed(2)',
  'candidate.startSec.toFixed(2)',
  "success: 'Der Rohloop wurde an Xensonar gesendet.'",
]) {
  assert(!controller.includes(forbidden), `useMaterialIntakeController.ts still owns pure helper/status detail: ${forbidden}`);
}

for (const marker of [
  'export const MATERIAL_INTAKE_DEFAULT_DETAIL_DURATION = 16',
  'export const MATERIAL_INTAKE_DEFAULT_LOOP_DURATION = 8',
  'export interface MaterialIntakeRepairUndoSnapshot',
  'export function sanitizeMaterialIntakeNameFromLabel',
  'export function buildInitialSelectionForMaterialSource',
  'export function buildRepairUndoSnapshot',
  'export function cloneMaterialIntakeSelection',
  'export function buildRepairedLoopSelection',
  'export function buildRepairCandidateSelection',
  'export function buildLoopRepairStatus',
  'export function buildRepairCandidateStatus',
  'export function buildRawSendStatusMessages',
  'export function rangeEnd',
  "detailViewport: buildDetailViewport(",
  "Loop korrigiert: Start blieb auf",
  "Alternative übernommen: Start blieb auf",
]) {
  assert(actions.includes(marker), `materialIntakeControllerActions.ts missing expected marker: ${marker}`);
}

for (const forbidden of [
  'useCallback',
  'useEffect',
  'useMemo',
  'useState',
  'loopPreviewEngine',
  'repairLoopSelection',
  'MaterialTargetAdapter',
  'commitLoop',
  'setStatus',
  'setBusy',
  'setSelection',
  'setSource',
  'getMaterialIntakeSessionSnapshot',
  'setMaterialIntakeSessionSnapshot',
]) {
  assert(!actions.includes(forbidden), `materialIntakeControllerActions.ts must stay pure/factored-helper-only, found: ${forbidden}`);
}

const controllerLines = controller.split(/\r?\n/).length;
assert(controllerLines <= 285, `useMaterialIntakeController.ts should shrink after helper extraction; saw ${controllerLines} lines (>285)`);

console.log('[material-intake-controller-actions-boundary] ok');
