#!/usr/bin/env node
import fs from 'node:fs';

const types = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewSessionTypes.ts', 'utf8');
const readyGate = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportReadyGate.ts', 'utf8');
const playbackGate = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPlaybackGate.ts', 'utf8');
const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const derivation = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPreviewDerivation.ts', 'utf8');
const hook = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');

function must(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`[xensonar][check-preview-session-typed-request-ready-gate] missing ${label}: ${needle}`);
    process.exit(1);
  }
}
function mustNot(source, needle, label) {
  if (source.includes(needle)) {
    console.error(`[xensonar][check-preview-session-typed-request-ready-gate] forbidden ${label}: ${needle}`);
    process.exit(1);
  }
}

must(types, 'export type SpectralForgePreviewRequestIdentity', 'shared request identity type');
must(types, 'createSpectralForgePreviewRequestIdentity', 'request identity constructor');
must(hook, 'SpectralForgePreviewRequestIdentity', 'session hook imports shared identity type');
must(readyGate, 'currentRequest: SpectralForgePreviewRequestIdentity', 'ready gate typed current request');
must(playbackGate, 'currentRequest: SpectralForgePreviewRequestIdentity', 'playback gate typed current request');
must(transport, 'const previewDerivation = React.useMemo', 'TransportBar memoizes preview derivation once');
must(derivation, 'const currentPreviewRequest = createSpectralForgePreviewRequestIdentity({', 'preview derivation creates typed request identity');
must(transport, 'currentPreviewRequest,', 'TransportBar consumes typed current request from derivation');
must(transport, 'currentRequest: currentPreviewRequest', 'TransportBar passes typed request to gates');
mustNot(readyGate, 'routeKind: SpectralForgePreviewRouteKind;\n  currentRequestKey: string;', 'loose ready gate route/key pair');
mustNot(playbackGate, 'routeKind: SpectralForgePreviewRouteKind;\n  currentRequestKey: string;', 'loose playback gate route/key pair');

console.log('[xensonar][check-preview-session-typed-request-ready-gate] ok');
