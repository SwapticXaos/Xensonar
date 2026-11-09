import fs from 'node:fs';

const sessionHookPath = 'src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts';
const transportHookPath = 'src/features/l3lab/spectralForge/components/previewSession/useTransportPrewarmOrchestrator.ts';
const sessionHook = fs.readFileSync(sessionHookPath, 'utf8');
const transportHook = fs.readFileSync(transportHookPath, 'utf8');

function fail(message) {
  console.error(`[xensonar][preview-session-transport-plumbing-split] ${message}`);
  process.exit(1);
}

if (!sessionHook.includes('useTransportPrewarmOrchestrator')) {
  fail('useSpectralForgePreviewSession must delegate transport prewarm plumbing to useTransportPrewarmOrchestrator.');
}

for (const forbidden of [
  'const serialPrewarmInFlightRef = useRef',
  'const serialPrewarmRerunRequestedRef = useRef',
  'const transportPrewarmScheduleTokenRef = useRef',
  'const transportPrewarmTimerRef = useRef',
  'const transportPreparedPayloadRef = useRef',
]) {
  if (sessionHook.includes(forbidden)) {
    fail(`useSpectralForgePreviewSession still owns transport plumbing directly: ${forbidden}`);
  }
}

for (const required of [
  'export function useTransportPrewarmOrchestrator',
  'const serialPrewarmInFlightRef = useRef(false)',
  'const serialPrewarmRerunRequestedRef = useRef(false)',
  'const transportPrewarmScheduleTokenRef = useRef(0)',
  'const transportPrewarmTimerRef = useRef<number | null>(null)',
]) {
  if (!transportHook.includes(required)) {
    fail(`useTransportPrewarmOrchestrator missing expected transport ownership marker: ${required}`);
  }
}

if (!/const\s+transportPreparedPayloadRef\s*=\s*\n?\s*useRef<SpectralForgeTransportPreparedPayload \| null>\(null\)/.test(transportHook)) {
  fail('useTransportPrewarmOrchestrator must own transportPreparedPayloadRef.');
}

const sessionLines = sessionHook.split('\n').length;
if (sessionLines > 460) {
  fail(`useSpectralForgePreviewSession grew beyond the safe post-split ceiling (${sessionLines} lines > 460).`);
}

console.log('[xensonar][preview-session-transport-plumbing-split] ok');
