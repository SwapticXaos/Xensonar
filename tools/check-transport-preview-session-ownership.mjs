import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const transport = read('src/features/l3lab/spectralForge/components/TransportBar.tsx');
const sessionHook = read('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts');
const route = read('src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewRoute.ts');

if (!transport.includes('useSpectralForgePreviewSession')) {
  throw new Error('TransportBar must consume the shared preview session hook.');
}
if (!transport.includes('previewSessionDriver,')) {
  throw new Error('TransportBar must obtain previewSessionDriver from useSpectralForgePreviewSession.');
}
if (transport.includes('reduceSpectralForgePreviewSession')) {
  throw new Error('TransportBar must not own the preview reducer directly after session ownership probe.');
}
if (transport.includes('previewSessionRef')) {
  throw new Error('TransportBar must not keep a local previewSessionRef shadow state.');
}
for (const marker of [
  'previewSessionDriver.schedule(',
  'previewSessionDriver.beginPrewarm(',
  'previewSessionDriver.reportProgress(',
  'previewSessionDriver.markReady(',
  'previewSessionDriver.markStale(',
  'previewSessionDriver.markError(',
  'previewSessionDriver.markPlaying(',
  'previewSessionDriver.markPlayEnded(',
]) {
  if (!transport.includes(marker)) throw new Error(`TransportBar no longer mirrors preview session via driver marker: ${marker}`);
}
if (!sessionHook.includes('getSessionState: () => SpectralForgePreviewSessionState')) {
  throw new Error('useSpectralForgePreviewSession must expose a read-only getSessionState boundary for TransportBar alignment.');
}
if (!sessionHook.includes('getSessionState,')) {
  throw new Error('useSpectralForgePreviewSession must return getSessionState.');
}
for (const helper of ['previewRouteCanAutoAfterPaint', 'previewRouteSupportsLoopPlayback', 'previewRouteWaitingLabel']) {
  if (!route.includes(`export function ${helper}`)) throw new Error(`Preview route helper missing: ${helper}`);
}
console.log('[xensonar] transport preview session ownership probe green');
