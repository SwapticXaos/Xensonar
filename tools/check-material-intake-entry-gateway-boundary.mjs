#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[material-intake-entry-gateway-boundary] ${message}`);
    process.exit(1);
  }
};

const panelPath = 'src/features/l3lab/materialIntake/MaterialIntakePanel.tsx';
const gatewayHookPath = 'src/features/l3lab/materialIntake/useMaterialIntakeEntryGateway.ts';
const entryScrollPath = 'src/features/l3lab/materialIntake/entryScroll.ts';

for (const relative of [panelPath, gatewayHookPath, entryScrollPath]) {
  assert(fs.existsSync(path.join(root, relative)), `Missing ${relative}`);
}

const panel = read(panelPath);
const gatewayHook = read(gatewayHookPath);

for (const marker of [
  "import { useMaterialIntakeEntryGateway } from './useMaterialIntakeEntryGateway';",
  'useMaterialIntakeEntryGateway({',
  'sourceReady: !!source',
  'intakeGatewayRef,',
  'externalLoadFile,',
  'entryScrollIntent,',
  'loadSourceFromFile,',
  'runActionWithFeedback,',
  'buildCommittedPayload',
  'sendRawRootFollowLoop',
  'sendRawSampleToMelodicLoop',
]) {
  assert(panel.includes(marker), `MaterialIntakePanel.tsx missing expected marker: ${marker}`);
}

for (const forbidden of [
  'isMaterialIntakeGatewayIntent',
  'recordSpectralForgeEntryScrollDiagnostic',
  'scrollSpectralForgeToIntakeGateway',
  'externalLoadSignatureRef',
  'pendingEntryScrollIntentRef',
  'entryScrollRafIdsRef',
  'entryScrollTimersRef',
  'entryScrollAttemptRef',
  'clearScheduledEntryScroll',
  'runEntryScrollPass',
  'scheduleEntryScrollConvergence',
  'loadSourceFromFileRef',
]) {
  assert(!panel.includes(forbidden), `MaterialIntakePanel.tsx still owns entry gateway detail: ${forbidden}`);
}

for (const marker of [
  'export interface MaterialIntakeEntryGatewayOptions',
  'export function useMaterialIntakeEntryGateway',
  'externalLoadSignatureRef',
  'pendingEntryScrollIntentRef',
  'entryScrollRafIdsRef',
  'entryScrollTimersRef',
  'entryScrollAttemptRef',
  'cancelScheduledEntryScroll',
  'clearScheduledEntryScroll',
  'runEntryScrollPass',
  'scheduleEntryScrollConvergence',
  'ENTRY_SCROLL_RETRY_DELAYS_MS',
  'ENTRY_SCROLL_RAF_RETRIES',
  'recordSpectralForgeEntryScrollDiagnostic',
  'scrollSpectralForgeToIntakeGateway',
  'onExternalLoadConsumedRef.current?.()',
  'onEntryScrollIntentConsumedRef.current?.(intent.token)',
]) {
  assert(gatewayHook.includes(marker), `useMaterialIntakeEntryGateway.ts missing expected marker: ${marker}`);
}

for (const phase of [
  'intent-pending',
  'load-started',
  'load-finished',
  'external-load-consumed',
  'load-cancelled',
  'intent-seen',
  'intent-scheduled',
  'intent-still-pending',
  'intent-consumed',
  'cleanup',
]) {
  assert(gatewayHook.includes(`phase: '${phase}'`), `Entry gateway hook must preserve diagnostic phase: ${phase}`);
}

for (const forbidden of [
  'CommittedLoopPayload',
  'MaterialTargetAdapter',
  'sendRawToAdapter',
  'sendRawToTarget',
  'buildCommittedPayload',
  'loopPreviewEngine',
  'repairLoop',
  'undoRepairLoop',
  'applyRepairCandidate',
]) {
  assert(!gatewayHook.includes(forbidden), `Entry gateway hook must stay load/scroll-gateway-only, found: ${forbidden}`);
}

const panelLines = panel.split(/\r?\n/).length;
assert(panelLines <= 700, `MaterialIntakePanel.tsx did not shrink into expected range after entry gateway extraction: ${panelLines} lines (>700)`);

console.log('[material-intake-entry-gateway-boundary] ok');
