import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const gate = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportReadyGate.ts', 'utf8');
const truth = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPreviewTruth.ts', 'utf8');
const sessionHook = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');

function must(haystack, needle, label) {
  if (!haystack.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
}
function mustNot(haystack, needle, label) {
  if (haystack.includes(needle)) throw new Error(`Unexpected ${label}: ${needle}`);
}

must(truth, 'export function isTransportPreviewPrepared', 'prepared-token gate helper');
must(gate, "export { isTransportPreviewPrepared } from './spectralForgeTransportPreviewTruth';", 'ready gate re-exports prepared helper');
must(gate, 'export function resolveSpectralForgeTransportReadyGate', 'transport ready/fill resolver');
must(gate, 'readyForImmediatePlay', 'ready result field');
must(gate, 'renderFillActive', 'render fill result field');
must(gate, 'sessionState: SpectralForgePreviewSessionState', 'session state participates in gate');
must(truth, "state.kind === 'dirty'", 'dirty contradicts ready');
must(truth, "state.kind === 'scheduled'", 'scheduled contradicts ready');
must(truth, "state.kind === 'prewarming'", 'prewarming contradicts ready');

must(transport, 'resolveSpectralForgeTransportReadyGate({', 'TransportBar uses central ready/fill resolver');
must(transport, 'isTransportPreviewPrepared({', 'TransportBar uses central prepared predicate');
must(transport, 'getSessionState: getPreviewSessionState', 'TransportBar reads session state through hook');
must(transport, 'sessionState: getPreviewSessionState()', 'Transport ready gate receives current session state');
must(sessionHook, 'getSessionState: () => SpectralForgePreviewSessionState', 'session hook exposes state getter');

mustNot(
  transport,
  'const previewReadyForImmediatePlay =\n      previewRenderRouteKind !== "none" && preparedPreviewToken === currentPreviewPreparedToken;',
  'inline ready calculation in TransportBar',
);
mustNot(
  transport,
  'const renderFillRawActive = rendering || prewarmRendering;',
  'inline render fill gate in TransportBar',
);

console.log('[xensonar] transport session ready/play gate: ok');
