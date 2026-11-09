import fs from 'node:fs';
const path = 'src/features/l3lab/spectralForge/components/TransportBar.tsx';
const src = fs.readFileSync(path, 'utf8');
const required = [
  'renderFillVisualActive',
  'renderFillVisualProgress',
  'renderFillRawActiveRef',
  'renderFillRawProgressRef',
  'renderFillStartedAtRef',
  'requestAnimationFrame(tick)',
  'renderFillVisualActive && (',
  'data-xensonar-spectralforge-render-fill-layered="true"',
  'style={{ height: `${renderFillPercent}%` }}',
  'bg-neutral-700',
  'bg-emerald-500/90',
  'renderFillRawActive = rendering || prewarmRendering',
];
const missing = required.filter((needle) => !src.includes(needle));
if (missing.length) {
  console.error('[spectralforge-play-button-render-fill-animation-contract] missing:', missing.join(', '));
  process.exit(1);
}
if (src.includes('linear-gradient(to top')) {
  console.error('[spectralforge-play-button-render-fill-animation-contract] stale gradient-only fill found');
  process.exit(1);
}
if (!src.includes('setRenderFillVisualProgress(0.035)')) {
  console.error('[spectralforge-play-button-render-fill-animation-contract] render-start latch does not begin at render cycle start');
  process.exit(1);
}
console.log('[spectralforge-play-button-render-fill-animation-contract] OK');
