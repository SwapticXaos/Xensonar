import { readFileSync } from 'node:fs';

const transportBar = readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const sessionHook = readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');
const transportOrchestrator = readFileSync('src/features/l3lab/spectralForge/components/previewSession/useTransportPrewarmOrchestrator.ts', 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`[xensonar][transport-session-prepared-progress-probe] ${message}`);
    process.exit(1);
  }
}

assert(
  !transportBar.includes('const [prewarmRendering, setPrewarmRendering]'),
  'TransportBar must not own prewarmRendering as free local state.',
);
assert(
  !transportBar.includes('const [prewarmProgress, setPrewarmProgress]'),
  'TransportBar must not own prewarmProgress as free local state.',
);
assert(
  !transportBar.includes('const [preparedPreviewToken, setPreparedPreviewToken]'),
  'TransportBar must not own preparedPreviewToken as free local state.',
);
assert(
  transportBar.includes('transportPrewarmState'),
  'TransportBar must read prepared/progress state from useSpectralForgePreviewSession().',
);
assert(
  transportBar.includes('setTransportPreparedRequestKey') &&
    transportBar.includes('setTransportPrewarmRendering') &&
    transportBar.includes('setTransportPrewarmProgress'),
  'TransportBar must update prepared/progress through session-owned setters.',
);
assert(
  (sessionHook.includes('SpectralForgeTransportPrewarmState') || transportOrchestrator.includes('SpectralForgeTransportPrewarmState')) &&
    transportOrchestrator.includes('preparedRequestKey') &&
    transportOrchestrator.includes('prewarmRendering') &&
    transportOrchestrator.includes('prewarmProgress'),
  'useSpectralForgePreviewSession/transport orchestrator must expose a transport prepared/progress state shape.',
);
assert(
  sessionHook.includes('setTransportPreparedRequestKey') &&
    sessionHook.includes('setTransportPrewarmRendering') &&
    sessionHook.includes('setTransportPrewarmProgress'),
  'useSpectralForgePreviewSession must own setters for prepared/progress state.',
);

console.log('[xensonar][transport-session-prepared-progress-probe] ok');
