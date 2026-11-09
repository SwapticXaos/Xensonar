#!/usr/bin/env node
import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const session = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');
const legacyBoundaryPath = 'src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPlaybackSession.ts';

function must(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`[xensonar][check-transport-playback-session-boundary] missing ${label}: ${needle}`);
    process.exit(1);
  }
}
function mustNot(source, needle, label) {
  if (source.includes(needle)) {
    console.error(`[xensonar][check-transport-playback-session-boundary] forbidden ${label}: ${needle}`);
    process.exit(1);
  }
}

if (fs.existsSync(legacyBoundaryPath)) {
  console.error(`[xensonar][check-transport-playback-session-boundary] obsolete playback-session shim still exists: ${legacyBoundaryPath}`);
  process.exit(1);
}

must(session, 'markPlaying: (request: SpectralForgePreviewRequest) =>', 'driver playback start method');
must(session, 'markPlayEnded: (request: SpectralForgePreviewRequest) =>', 'driver playback end method');
must(transport, 'previewSessionDriver.markPlaying(playSessionRequest)', 'TransportBar starts playback through driver');
must(transport, 'previewSessionDriver.markPlayEnded(playSessionRequest)', 'TransportBar finishes playback through driver');
mustNot(transport, "recordPreviewSessionEvent({ type: 'playStart'", 'inline playStart event in TransportBar');
mustNot(transport, "recordPreviewSessionEvent({ type: 'playEnd'", 'inline playEnd event in TransportBar');
mustNot(transport, 'markSpectralForgeTransportPlaybackStarted', 'legacy playback-start helper import or call');
mustNot(transport, 'finishSpectralForgeTransportPlayback', 'legacy playback-finish helper import or call');

console.log('[xensonar][check-transport-playback-session-boundary] ok');
