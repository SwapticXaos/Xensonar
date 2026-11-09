#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const hookPath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts';
const hook = readFileSync(hookPath, 'utf8');

const required = [
  'createSpectralForgePreviewRequest',
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

const forbidden = [
  'previewSession.scheduleRequest(',
  'previewSession.previewSessionDriver.',
  'previewSession.markPrewarmStart(',
  'previewSession.markPrewarmProgress(',
  'previewSession.markReady(',
  'previewSession.markPlaying(',
  'previewSession.markPlayEnded(',
  'previewSession.markError(',
];

const missing = required.filter((needle) => !hook.includes(needle));
const forbiddenFound = forbidden.filter((needle) => hook.includes(needle));

if (missing.length || forbiddenFound.length) {
  console.error('[xensonar][check] Basis-Hearing must use PreviewSessionDriver.');
  if (missing.length) console.error('Missing:', missing.join('\n  - '));
  if (forbiddenFound.length) console.error('Forbidden direct calls:', forbiddenFound.join('\n  - '));
  process.exit(1);
}

console.log('[xensonar][check] Basis-Hearing uses PreviewSessionDriver.');
