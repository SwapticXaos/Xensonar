#!/usr/bin/env node
import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');

function must(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`missing ${label}: ${needle}`);
}
function mustAtLeast(source, needle, count, label) {
  const hits = source.split(needle).length - 1;
  if (hits < count) throw new Error(`expected at least ${count} ${label}, got ${hits}: ${needle}`);
}

must(transport, 'type SpectralForgePreviewRequest', 'typed active playback request import');
must(transport, 'const currentTransportPlaybackRequestRef = useRef<SpectralForgePreviewRequest | null>(null);', 'current playback request ref');
must(transport, 'currentTransportPlaybackRequestRef.current = playSessionRequest;', 'playback start stores active request');
mustAtLeast(transport, 'previewSessionDriver.markPlayEnded(activePlaybackRequest);', 2, 'manual stop playEnd reporting');
must(transport, 'currentTransportPlaybackRequestRef.current = null;', 'manual stop clears active request');
must(transport, 'if (currentTransportPlaybackRequestRef.current?.identity.requestKey === playSessionRequest.identity.requestKey)', 'natural finish clears only matching active request');

console.log('[check-transport-manual-stop-session-end] OK');
