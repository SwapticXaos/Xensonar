#!/usr/bin/env node
import fs from 'node:fs';

const hook = fs.readFileSync('src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts', 'utf8');
const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');

const checks = [
  [hook.includes('buildSpectralForgeTransportPreviewRequestKey'), 'basis hearing hook builds canonical transport request key'],
  [hook.includes('carrierIntegralSelection: selection') && hook.includes('carrierIntegralHarmonicXplore: nextHarmonicXplore'), 'basis hearing snapshot is patched with selected hearing values'],
  [hook.includes('requestKey: transportRequestKey'), 'basis hearing bridge publishes transport request key'],
  [hook.includes('setShowPlayheadMarker(true);') && hook.indexOf('setShowPlayheadMarker(true);') < hook.indexOf('return playSpectralForgeBasisHearingPreview({'), 'click audition marker is shown before scheduling audio playback'],
  [transport.includes('basisHearingTransportBridge.requestKey === currentPreviewPreparedToken'), 'TransportBar rejects stale basis-hearing bridge progress by request key'],
  [transport.indexOf('markPlaybackStarted();') < transport.indexOf('const result = await playSpectralForgeBasisHearingPreview({'), 'TransportBar basis-hearing playback marks start before audio scheduling'],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  console.error('[basis-hearing-preview-truth] FAIL');
  for (const [, message] of failed) console.error('-', message);
  process.exit(1);
}
console.log('[basis-hearing-preview-truth] PASS');
for (const [, message] of checks) console.log('-', message);
