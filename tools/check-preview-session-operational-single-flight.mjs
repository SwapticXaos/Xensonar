#!/usr/bin/env node
import fs from 'node:fs';

const session = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');
const basis = fs.readFileSync('src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts', 'utf8');

const requiredSessionMarkers = [
  'SpectralForgePreviewRequestIdentity',
  'SpectralForgePreviewScheduleRequest',
  'previewSessionDriver',
  'schedule: (request: SpectralForgePreviewRequest)',
  'beginPrewarm: (request: SpectralForgePreviewRequest)',
  'markReady: (request: SpectralForgePreviewRequest',
  'markStale: (request: SpectralForgePreviewRequest)',
  'markError: (request: SpectralForgePreviewRequest',
  'markPlaying: (request: SpectralForgePreviewRequest)',
  'markPlayEnded: (request: SpectralForgePreviewRequest)',
];

const missingSession = requiredSessionMarkers.filter((marker) => !session.includes(marker));
if (!/reportProgress:\s*\(\s*request:\s*SpectralForgePreviewRequest/.test(session)) {
  missingSession.push('reportProgress: typed request method');
}
if (!/type:\s*['"]staleResult['"]/.test(session)) {
  missingSession.push('staleResult event emission');
}
if (missingSession.length) {
  console.error('[xensonar][check-preview-session-operational-single-flight] Missing session markers:', missingSession);
  process.exit(1);
}

const forbiddenBasisMarkers = [
  'previewSession.recordEvent({ type:',
  'previewSession.recordEvent({\n      type:',
  'previewSession.scheduleRequest({',
  'previewSession.markPrewarmStart({',
  'previewSession.markPrewarmProgress({',
  'previewSession.markReady({',
  'previewSession.markPlaying({',
  'previewSession.markPlayEnded({',
  'previewSession.markError({',
  'previewSession.previewSessionDriver.',
];
const presentForbidden = forbiddenBasisMarkers.filter((marker) => basis.includes(marker));
if (presentForbidden.length) {
  console.error('[xensonar][check-preview-session-operational-single-flight] Basis-Hearing still bypasses PreviewSessionDriver:', presentForbidden);
  process.exit(1);
}

const requiredBasisMarkers = [
  'previewSessionDriver.schedule(previewRequest)',
  'previewSessionDriver.beginPrewarm(previewRequest)',
  'updateBasisHearingAndSession({',
  "session: { type: 'progress'",
  "session: { type: 'ready'",
  'previewSessionDriver.canPlay(previewRequest)',
  "session: { type: 'playing'",
  "session: { type: 'play-ended'",
  "session: { type: 'error'",
];
const missingBasis = requiredBasisMarkers.filter((marker) => !basis.includes(marker));
if (missingBasis.length) {
  console.error('[xensonar][check-preview-session-operational-single-flight] Basis-Hearing missing driver usage:', missingBasis);
  process.exit(1);
}

console.log('[xensonar][check-preview-session-operational-single-flight] ok');
