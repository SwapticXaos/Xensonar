#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const docPath = 'docs/patch_3.2.91-7.6.41_transportbar_state_resolver_audit.md';
const transportPath = 'src/features/l3lab/spectralForge/components/TransportBar.tsx';
const doc = readFileSync(docPath, 'utf8');
const transport = readFileSync(transportPath, 'utf8');

const fail = (message) => {
  console.error(`[xensonar][transportbar-state-resolver-audit] ${message}`);
  process.exit(1);
};

for (const needle of [
  '# 3.2.91-7.6.41 TransportBar State Resolver Audit',
  'rendering',
  'renderProgress',
  'statusMessage',
  'transportPrewarmState',
  'Ableitbar aus Preview-Truth / Session',
  'Transport-lokal legitim',
  'Übergangsdoppelung',
  'Nicht in diesem Patch entfernen',
]) {
  if (!doc.includes(needle)) fail(`audit doc missing classification marker: ${needle}`);
}

for (const needle of [
  'const [rendering, setRendering] = useState(false)',
  'const [renderProgress, setRenderProgress] = useState(0)',
  'const [statusMessage, setStatusMessage] = useState<string>("")',
  'const transportReadyGate = resolveSpectralForgeTransportReadyGate({',
]) {
  if (!transport.includes(needle)) fail(`TransportBar state audit no longer matches current source: ${needle}`);
}

console.log('[xensonar] TransportBar state resolver audit green');
