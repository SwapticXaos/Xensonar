#!/usr/bin/env node
import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const sessionHook = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');

function must(source, needle, label) {
  if (!source.includes(needle)) throw new Error(`missing ${label}: ${needle}`);
}
function mustNot(source, needle, label) {
  if (source.includes(needle)) throw new Error(`forbidden ${label}: ${needle}`);
}

must(transport, 'previewSessionDriver,', 'driver destructuring from useSpectralForgePreviewSession');
must(transport, 'createSpectralForgePreviewRequest({', 'typed PreviewRequest creation');
must(transport, 'previewSessionDriver.schedule(', 'driver schedule use');
must(transport, 'previewSessionDriver.beginPrewarm(', 'driver beginPrewarm use');
must(transport, 'previewSessionDriver.reportProgress(', 'driver reportProgress use');
must(transport, 'previewSessionDriver.markReady(', 'driver markReady use');
must(transport, 'previewSessionDriver.markStale(', 'driver markStale use');
must(transport, 'previewSessionDriver.markError(', 'driver markError use');
must(transport, 'previewSessionDriver.markPlaying(', 'driver markPlaying use');
must(transport, 'previewSessionDriver.markPlayEnded(', 'driver markPlayEnded use');
must(sessionHook, 'export type SpectralForgePreviewSessionDriver =', 'driver contract type');
must(sessionHook, 'currentRequestRef.current = request;', 'driver owns current request on schedule');

mustNot(transport, 'recordEvent: recordPreviewSessionEvent', 'raw recordEvent alias in TransportBar');
mustNot(transport, 'recordPreviewSessionEvent({', 'raw event writes in TransportBar');
mustNot(transport, 'markPrewarmStart: markPreviewSessionPrewarmStart', 'typed helper alias superseded by driver');
mustNot(transport, 'markPrewarmProgress: markPreviewSessionPrewarmProgress', 'typed helper alias superseded by driver');
mustNot(transport, 'markReady: markPreviewSessionReady', 'typed helper alias superseded by driver');
mustNot(transport, 'markStale: markPreviewSessionStale', 'typed helper alias superseded by driver');
mustNot(transport, 'markError: markPreviewSessionError', 'typed helper alias superseded by driver');
mustNot(transport, 'markSpectralForgeTransportPlaybackStarted({', 'playback start helper superseded by driver');
mustNot(transport, 'finishSpectralForgeTransportPlayback({', 'playback finish helper superseded by driver');

console.log('[check-transport-uses-preview-session-driver] OK');
