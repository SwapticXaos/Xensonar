#!/usr/bin/env node
import fs from 'node:fs';

const panelPath = 'src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx';
const hookPath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts';
const panel = fs.readFileSync(panelPath, 'utf8');
const hook = fs.readFileSync(hookPath, 'utf8');

function fail(message) {
  console.error(`[check-basis-hearing-audition-hook-boundary] ${message}`);
  process.exit(1);
}

for (const required of [
  'export function useBasisHearingAudition',
  'selectAndPreviewHearingOption',
  'resolveOptionUi',
  'useSpectralForgePreviewSession<',
  'previewSession.getPreparedEntry',
  'previewSession.getOrStartInflight',
  'previewSession.recordEvent',
]) {
  if (!hook.includes(required)) fail(`hook missing required contract: ${required}`);
}

for (const forbidden of [
  'basisHearingPreparedCacheRef',
  'basisHearingPrewarmInflightRef',
  'basisHearingAuditionGenerationRef',
  'basisHearingPreviewSessionRef',
  'reduceSpectralForgePreviewSession',
  'prewarmSpectralForgeBasisHearingPreview',
  'playSpectralForgeBasisHearingPreview',
  'buildBasisHearingStableRequestKey',
]) {
  if (panel.includes(forbidden)) fail(`HarmonizerPanel still owns audition lifecycle internals: ${forbidden}`);
}

if (!panel.includes("useBasisHearingAudition()")) {
  fail('HarmonizerPanel must use the audition hook.');
}
if (!panel.includes('resolveOptionUi(option)')) {
  fail('HarmonizerPanel must ask the hook for option UI state.');
}

console.log('[check-basis-hearing-audition-hook-boundary] OK');
