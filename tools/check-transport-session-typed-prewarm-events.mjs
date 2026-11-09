#!/usr/bin/env node
import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const sessionHook = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');

const requiredTransport = [
  'previewSessionDriver.beginPrewarm(inputPreviewRequest)',
  'previewSessionDriver.reportProgress(inputPreviewRequest, progress)',
  'previewSessionDriver.markReady(',
  'previewSessionDriver.markStale(inputPreviewRequest)',
  'previewSessionDriver.markError(',
];
const forbiddenRaw = [
  "recordPreviewSessionEvent({ type: 'prewarmStart'",
  "recordPreviewSessionEvent({ type: 'prewarmProgress'",
  "recordPreviewSessionEvent({ type: 'ready'",
  "recordPreviewSessionEvent({ type: 'staleResult'",
  "recordPreviewSessionEvent({ type: 'error'",
  'markPreviewSessionPrewarmStart(',
  'markPreviewSessionPrewarmProgress(',
  'markPreviewSessionReady(',
  'markPreviewSessionStale(',
  'markPreviewSessionError(',
];

for (const marker of requiredTransport) {
  if (!transport.includes(marker)) throw new Error(`TransportBar missing driver prewarm marker: ${marker}`);
}
for (const marker of forbiddenRaw) {
  if (transport.includes(marker)) throw new Error(`TransportBar still writes old prewarm event/helper: ${marker}`);
}
const onStartCount = (sessionHook.match(/onStart\?\.\(\);/g) ?? []).length;
if (onStartCount !== 1) throw new Error(`expected exactly one onStart?.() in session inflight helper, found ${onStartCount}`);
console.log('[check-transport-session-typed-prewarm-events] OK');
