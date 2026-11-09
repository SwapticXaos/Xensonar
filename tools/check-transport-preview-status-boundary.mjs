#!/usr/bin/env node
import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const status = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPreviewStatus.ts', 'utf8');

const mustContainStatus = [
  'resolveSpectralForgeTransportPrewarmStatus',
  'resolveSpectralForgePlaybackCacheStatus',
  'Hörweise wird fertig vorgerechnet',
  'Vorschau wird fertig vorgerechnet',
  'Hörweise wartet auf den neuesten Reglerstand',
  'Vorschau aus Cache',
  'Vorschau gerendert',
];
const mustContainTransport = [
  'resolveSpectralForgeTransportPrewarmStatus',
  'resolveSpectralForgePlaybackCacheStatus',
];
const forbiddenTransport = [
  "'Hörweise wird fertig vorgerechnet'",
  "'Vorschau wird fertig vorgerechnet'",
  "'Hörweise wartet auf den neuesten Reglerstand'",
  "'Vorschau wartet auf den neuesten Stand'",
  "'Vorschau aus Cache'",
  "'Vorschau gerendert'",
];

for (const marker of mustContainStatus) {
  if (!status.includes(marker)) throw new Error(`status boundary missing marker: ${marker}`);
}
for (const marker of mustContainTransport) {
  if (!transport.includes(marker)) throw new Error(`TransportBar does not use status boundary marker: ${marker}`);
}
for (const marker of forbiddenTransport) {
  if (transport.includes(marker)) throw new Error(`TransportBar still owns transport status literal: ${marker}`);
}
console.log('[check-transport-preview-status-boundary] OK');
