import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const auditionRoutes = fs.readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts', 'utf8');

function fail(message) {
  console.error(`[xensonar][preview-route-gate-cleanup] ${message}`);
  process.exit(1);
}

if (!transport.includes('previewRenderCanAutoAfterPaint')) {
  fail('TransportBar must keep the route-gate value visible at the auto-prewarm callsite.');
}

if (!transport.includes('if (!previewRenderCanAutoAfterPaint || isPlaying || rendering) return;')) {
  fail('TransportBar auto-prewarm effect must be gated by previewRenderCanAutoAfterPaint.');
}

if (transport.includes('previewRenderRouteKind === "none" || isPlaying || rendering')) {
  fail('TransportBar still uses the older route-kind guard instead of the route-gate boundary.');
}

if (transport.includes('previewRenderRouteKind === "spectral" || previewRenderRouteKind === "basis-hearing"')) {
  fail('TransportBar still hardcodes the spectral/basis-hearing route predicate.');
}

const duplicateCooperative = /cooperative:\s*Boolean\(request\.onRenderProgress\),\s*\n\s*cooperative:\s*Boolean\(request\.onRenderProgress\),/.test(auditionRoutes);
if (duplicateCooperative) {
  fail('carrierIntegralAuditionRoutes still contains a duplicate cooperative field in the HX prewarm renderer call.');
}

console.log('[xensonar][preview-route-gate-cleanup] ok');
