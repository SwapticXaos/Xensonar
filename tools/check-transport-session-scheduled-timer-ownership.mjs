#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const transportBar = readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const sessionHook = readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');
const transportOrchestrator = readFileSync('src/features/l3lab/spectralForge/components/previewSession/useTransportPrewarmOrchestrator.ts', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`[xensonar][transport-session-scheduled-timer-ownership] ${message}`);
    process.exit(1);
  }
}

assert(
  !transportBar.includes('previewPrewarmTimerRef = useRef'),
  'TransportBar must not own previewPrewarmTimerRef as a local scheduling truth.',
);
assert(
  !transportBar.includes('previewPrewarmTokenRef = useRef'),
  'TransportBar must not own previewPrewarmTokenRef as a local generation truth.',
);
assert(
  transportBar.includes('beginTransportPrewarmSchedule') &&
    transportBar.includes('isCurrentTransportPrewarmSchedule') &&
    transportBar.includes('setTransportPrewarmTimer') &&
    transportBar.includes('clearTransportPrewarmTimer'),
  'TransportBar must delegate transport scheduling timer/token ownership to useSpectralForgePreviewSession().',
);
assert(
  transportOrchestrator.includes('transportPrewarmScheduleTokenRef') &&
    transportOrchestrator.includes('transportPrewarmTimerRef') &&
    sessionHook.includes('beginTransportPrewarmSchedule') &&
    sessionHook.includes('isCurrentTransportPrewarmSchedule') &&
    sessionHook.includes('setTransportPrewarmTimer') &&
    sessionHook.includes('clearTransportPrewarmTimer'),
  'useSpectralForgePreviewSession must delegate transport prewarm schedule token and timer helpers to the transport orchestrator.',
);

console.log('[xensonar][transport-session-scheduled-timer-ownership] ok');
