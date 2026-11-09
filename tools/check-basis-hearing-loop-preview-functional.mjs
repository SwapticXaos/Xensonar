#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const transport = read('src/features/l3lab/spectralForge/components/TransportBar.tsx');
const basisPreview = read('src/features/l3lab/spectralForge/components/transportBar/spectralForgeBasisHearingPreview.ts');
const basisAudition = read('src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts');
const previewSession = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralPreviewSession.ts');
const auditionContext = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionContext.ts');
const auditionRoutes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');
const audioEngine = read('src/features/l3lab/spectralForge/audio/AudioEngine.ts');
const pkg = read('package.json');

const failures = [];
const must = (haystack, needle, label = needle) => {
  if (!haystack.includes(needle)) failures.push(`missing ${label}`);
};
const mustNot = (haystack, needle, label = needle) => {
  if (haystack.includes(needle)) failures.push(`unexpected ${label}`);
};

if (!transport.includes('const previewLoopAppliesToCurrentRoute = previewRenderRouteKind === "spectral" || previewRenderRouteKind === "basis-hearing";') && !transport.includes('const previewLoopAppliesToCurrentRoute = previewRouteSupportsLoopPlayback(previewRenderRouteKind);')) failures.push('missing loop checkbox applies to spectral and basis-hearing routes');
must(transport, 'const previewLoopToggleDisabled = !previewLoopAppliesToCurrentRoute;', 'loop checkbox is not disabled for basis-hearing');
must(transport, 'loopPreview: previewLoopEnabled', 'Transport passes loop checkbox into playback');
must(transport, 'const previewLoopEnabled = !!materialExport.loopPreview', 'Transport loop state is store-backed, not remount-local');
must(transport, 'updateMaterialExport({ loopPreview: e.currentTarget.checked })', 'Transport checkbox persists loop state');
mustNot(transport, 'previewLoopToggleDisabled = previewRenderRouteKind !== "spectral"', 'old basis-hearing-disabled loop toggle');

must(basisAudition, 'loopPreview: !!materialExport.loopPreview', 'basis hearing click uses the same loop preference as TransportBar');
must(basisAudition, 'setBasisHearingTransportBridge', 'basis hearing audition reports progress to transport bridge');
must(basisPreview, 'loopPreview?: boolean;', 'basis preview request exposes loopPreview');
must(basisPreview, 'loopPreview: !!request.loopPreview', 'basis preview forwards loopPreview');
must(previewSession, 'loopPreview?: boolean;', 'carrier preview session accepts loopPreview');
must(previewSession, 'loopPreview: !!args.loopPreview', 'carrier preview session forwards loopPreview');
must(auditionContext, 'loopPreview: boolean;', 'audition context stores loopPreview');
must(auditionContext, 'const loopPreview = !!request.loopPreview;', 'audition context normalizes loopPreview');
must(auditionRoutes, 'loopPreview: context.loopPreview', 'audition routes pass loopPreview to audio playback');
must(audioEngine, 'loopPreview?: boolean;', 'audio engine preview playback accepts loopPreview');
must(audioEngine, 'loopPreview: !!options.loopPreview', 'rendered buffer preview uses loopPreview');
must(audioEngine, 'if (!loopPreview && pos >= 1)', 'root-follow preview only stops at end when not looping');
must(audioEngine, '? (elapsed % previewDurationSec) / previewDurationSec', 'root-follow loop playhead wraps position');
must(pkg, 'xensonar:check-basis-hearing-loop-preview-functional', 'package script for loop preview check');

if (failures.length) {
  console.error('[basis-hearing-loop-preview-functional] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[basis-hearing-loop-preview-functional] PASS');
console.log('- Loop checkbox is active for both main spectral preview and basis-hearing preview.');
console.log('- Rendered buffer and carrier-integral audition routes receive the loopPreview playback flag.');
console.log('- Root-follow preview playhead wraps when loop playback is enabled.');
