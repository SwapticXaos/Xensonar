#!/usr/bin/env node
import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const sessionHook = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');
const transportOrchestrator = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useTransportPrewarmOrchestrator.ts', 'utf8');

const requiredTransport = [
  'isSerialPrewarmInFlight',
  'beginTransportSerialPrewarmRun',
  'finishTransportSerialPrewarmRun',
  'requestTransportSerialPrewarmRerun',
  'requestTransportSerialPrewarmRerunIfInFlight',
  'hasSerialPrewarmRerun',
  'consumeSerialPrewarmRerun',
  'useSpectralForgePreviewSession()',
];

const forbiddenTransport = [
  'previewPrewarmInFlightRef = useRef',
  'previewPrewarmRerunRequestedRef = useRef',
  'previewPrewarmInFlightRef.current',
  'previewPrewarmRerunRequestedRef.current',
];

const requiredHook = [
  'serialPrewarmInFlightRef',
  'serialPrewarmRerunRequestedRef',
  'isSerialPrewarmInFlight',
  'beginTransportSerialPrewarmRun',
  'finishTransportSerialPrewarmRun',
  'requestTransportSerialPrewarmRerun',
  'requestTransportSerialPrewarmRerunIfInFlight',
  'hasSerialPrewarmRerun',
  'consumeSerialPrewarmRerun',
];

const missingTransport = requiredTransport.filter((needle) => !transport.includes(needle));
const presentForbidden = forbiddenTransport.filter((needle) => transport.includes(needle));
const missingHook = requiredHook.filter((needle) => !sessionHook.includes(needle) && !transportOrchestrator.includes(needle));

if (missingTransport.length || presentForbidden.length || missingHook.length) {
  console.error('[xensonar][check-transport-preview-session-single-flight-probe] failed');
  if (missingTransport.length) console.error('Missing TransportBar markers:', missingTransport.join(', '));
  if (presentForbidden.length) console.error('Forbidden TransportBar markers:', presentForbidden.join(', '));
  if (missingHook.length) console.error('Missing session/orchestrator markers:', missingHook.join(', '));
  process.exit(1);
}

console.log('[xensonar][check-transport-preview-session-single-flight-probe] ok');
