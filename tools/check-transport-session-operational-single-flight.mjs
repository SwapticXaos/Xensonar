#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const transportBar = readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const sessionHook = readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`[xensonar][transport-session-operational-single-flight] ${message}`);
    process.exit(1);
  }
}

assert(
  sessionHook.includes('beginTransportSerialPrewarmRun') &&
    sessionHook.includes('finishTransportSerialPrewarmRun') &&
    sessionHook.includes('requestTransportSerialPrewarmRerunIfInFlight'),
  'useSpectralForgePreviewSession must own begin/finish/rerun helpers for transport serial prewarm.',
);
assert(
  transportBar.includes('if (!beginTransportSerialPrewarmRun()) return;'),
  'TransportBar must enter serial prewarm through beginTransportSerialPrewarmRun().',
);
assert(
  transportBar.includes('if (finishTransportSerialPrewarmRun())'),
  'TransportBar must release/restart serial prewarm through finishTransportSerialPrewarmRun().',
);
assert(
  transportBar.includes('requestTransportSerialPrewarmRerunIfInFlight();'),
  'TransportBar scheduling should request rerun through the session helper instead of open-coding inFlight checks.',
);
assert(
  !transportBar.includes('markSerialPrewarmInFlight') &&
    !transportBar.includes('requestSerialPrewarmRerun'),
  'TransportBar must not call low-level serial prewarm mutation helpers directly.',
);
assert(
  !sessionHook.includes('markSerialPrewarmInFlight:') &&
    !sessionHook.includes('requestSerialPrewarmRerun:'),
  'The public session hook API should expose operational transport helpers, not raw mark/request mutation pairs.',
);

console.log('[xensonar][transport-session-operational-single-flight] ok');
