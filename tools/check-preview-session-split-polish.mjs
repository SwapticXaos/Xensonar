#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(rel, 'utf8');
const fail = (message) => {
  console.error(`[xensonar][preview-session-split-polish] ${message}`);
  process.exit(1);
};

const session = read('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts');
const orchestrator = read('src/features/l3lab/spectralForge/components/previewSession/useTransportPrewarmOrchestrator.ts');
const gate = read('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportReadyGate.ts');
const truth = read('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPreviewTruth.ts');

for (const needle of [
  'useSpectralForgePreviewSession — preview-session machine + driver boundary',
  'useTransportPrewarmOrchestrator and are re-exposed here for API continuity',
  'export type {\n  SpectralForgeTransportPreparedPayload,\n  SpectralForgeTransportPrewarmState,\n} from "./useTransportPrewarmOrchestrator";',
]) {
  if (!session.includes(needle)) fail(`session hook missing split-polish marker: ${needle}`);
}

for (const needle of [
  'useTransportPrewarmOrchestrator — 7.6.36',
  'Prepared payload slot: one active transport payload, guarded by requestKey',
  'UI state setters: drive the transport prewarm fill without owning playback',
  'Serial flight control: one active run, one coalesced rerun request',
  'Schedule token: monotonically increasing stale-async guard',
  'Timer ownership remains local to the transport orchestrator',
]) {
  if (!orchestrator.includes(needle)) fail(`orchestrator missing self-description marker: ${needle}`);
}

if (gate.includes('Session state is the single source of truth for readiness')) {
  fail('riskier session-only ReadyGate wording from the alternative branch was imported');
}

if (!gate.includes('resolveSpectralForgeTransportPreviewTruth(input)')) {
  fail('ReadyGate no longer delegates to the preview-truth resolver');
}
if (!truth.includes('sessionContradictsPrepared')) {
  fail('conservative prepared-token/session contradiction guard disappeared from preview-truth resolver');
}

console.log('[xensonar] preview session split polish green');
