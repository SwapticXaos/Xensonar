import fs from 'node:fs';

const route = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewRoute.ts', 'utf8');
const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
for (const needle of ['previewRouteCanAutoAfterPaint', 'previewRouteSupportsLoopPlayback', 'previewRouteWaitingLabel']) {
  if (!route.includes(needle)) throw new Error(`route boundary missing ${needle}`);
  if (!transport.includes(needle)) throw new Error(`TransportBar does not use ${needle}`);
}
if (transport.includes('previewRenderRouteKind === "spectral" || previewRenderRouteKind === "basis-hearing"')) {
  throw new Error('TransportBar still hardcodes spectral/basis-hearing route predicate');
}
if (transport.includes('Hörweise wartet auf Regler-Freigabe') && !route.includes('Hörweise wartet auf Regler-Freigabe')) {
  throw new Error('TransportBar still owns route-specific waiting label copy');
}
console.log('[xensonar] transport preview route boundary green');
