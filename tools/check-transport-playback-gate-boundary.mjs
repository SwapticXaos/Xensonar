#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const transport = readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const boundary = readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPlaybackGate.ts', 'utf8');

function requireContains(source, needle, label) {
  if (!source.includes(needle)) {
    console.error(`[xensonar][check-transport-playback-gate-boundary] missing ${label}: ${needle}`);
    process.exit(1);
  }
}

function requireNotContains(source, needle, label) {
  if (source.includes(needle)) {
    console.error(`[xensonar][check-transport-playback-gate-boundary] forbidden ${label}: ${needle}`);
    process.exit(1);
  }
}

requireContains(boundary, 'resolveSpectralForgeTransportPlaybackGate', 'playback gate resolver');
requireContains(boundary, 'resolveBasisHearingPlaybackStatus', 'basis hearing status resolver');
requireContains(boundary, 'blockedStatusMessage', 'blocked play status');
requireContains(boundary, 'Play startet nicht als Renderauslöser', 'truthful blocked play copy');
requireContains(transport, 'resolveSpectralForgeTransportPlaybackGate', 'TransportBar imports playback resolver');
requireContains(transport, 'resolveBasisHearingPlaybackStatus', 'TransportBar imports basis hearing status resolver');
requireContains(transport, 'const playbackGate = resolveSpectralForgeTransportPlaybackGate', 'TransportBar delegates playback gate');
requireNotContains(transport, 'const routeCanShowRenderFeedback = previewRenderRouteKind !== "none";', 'inline route render feedback gate in handlePlay');
requireNotContains(transport, '? \'Vorhören wird vorbereitet · Play startet nicht als Renderauslöser\'', 'inline blocked play ternary');

console.log('[xensonar][check-transport-playback-gate-boundary] ok');
