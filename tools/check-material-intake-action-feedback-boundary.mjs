#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[material-intake-action-feedback-boundary] ${message}`);
    process.exit(1);
  }
};

const panelPath = 'src/features/l3lab/materialIntake/MaterialIntakePanel.tsx';
const feedbackHookPath = 'src/features/l3lab/materialIntake/useMaterialIntakeActionFeedback.ts';

for (const relative of [panelPath, feedbackHookPath]) {
  assert(fs.existsSync(path.join(root, relative)), `Missing ${relative}`);
}

const panel = read(panelPath);
const feedbackHook = read(feedbackHookPath);

for (const marker of [
  "import { useMaterialIntakeActionFeedback } from './useMaterialIntakeActionFeedback';",
  'const { pendingMap, successMap, runActionWithFeedback } = useMaterialIntakeActionFeedback();',
  'pending={!!pendingMap',
  'success={!!successMap',
  'buildCommittedPayload',
  'sendRawRootFollowLoop',
  'sendRawSampleToMelodicLoop',
  'useMaterialIntakeEntryGateway',
]) {
  assert(panel.includes(marker), `MaterialIntakePanel.tsx missing expected marker: ${marker}`);
}

for (const forbidden of [
  'successTimeoutsRef',
  'setPendingMap',
  'setSuccessMap',
  'const flashSuccess',
  'const runActionWithFeedback = async',
]) {
  assert(!panel.includes(forbidden), `MaterialIntakePanel.tsx still owns action feedback detail: ${forbidden}`);
}

for (const marker of [
  'export type MaterialIntakeActionFeedbackKey',
  'export type MaterialIntakeActionFeedbackAction',
  'export interface MaterialIntakeActionFeedbackState',
  'export function useMaterialIntakeActionFeedback',
  'const DEFAULT_SUCCESS_FLASH_MS = 1200',
  'successTimeoutsRef',
  'const [pendingMap, setPendingMap]',
  'const [successMap, setSuccessMap]',
  'const flashSuccess = useCallback',
  'const runActionWithFeedback = useCallback',
  'window.clearTimeout(timeoutId)',
]) {
  assert(feedbackHook.includes(marker), `useMaterialIntakeActionFeedback.ts missing expected marker: ${marker}`);
}

for (const forbidden of [
  'CommittedLoopPayload',
  'sendRawToAdapter',
  'sendRawToTarget',
  'useMaterialIntakeEntryGateway',
  'recordSpectralForgeEntryScrollDiagnostic',
  'buildCommittedPayload',
  'loopPreviewEngine',
]) {
  assert(!feedbackHook.includes(forbidden), `Action feedback hook must stay UI-feedback-only, found: ${forbidden}`);
}

const panelLines = panel.split(/\r?\n/).length;
assert(panelLines <= 870, `MaterialIntakePanel.tsx did not shrink into expected range after feedback extraction: ${panelLines} lines (>870)`);

console.log('[material-intake-action-feedback-boundary] ok');
