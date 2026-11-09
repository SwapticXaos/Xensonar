import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const session = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8');
const transportOrchestrator = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useTransportPrewarmOrchestrator.ts', 'utf8');

const failures = [];
if (transport.includes('preparedBasisHearingSnapshotRef')) {
  failures.push('TransportBar still owns preparedBasisHearingSnapshotRef');
}
for (const marker of [
  'getTransportPreparedPayload',
  'rememberTransportPreparedPayload',
  'clearTransportPreparedPayload',
]) {
  if (!transport.includes(marker)) failures.push(`TransportBar does not delegate ${marker}`);
  if (!session.includes(marker)) failures.push(`session hook does not expose ${marker}`);
}
if (!transportOrchestrator.includes('transportPreparedPayloadRef')) {
  failures.push('transport prewarm orchestrator does not own transportPreparedPayloadRef');
}
if (!session.includes('useTransportPrewarmOrchestrator')) {
  failures.push('session hook does not delegate transport prepared payload ownership to transport orchestrator');
}
if (!transport.includes('getTransportPreparedPayload<ForgeProjectSnapshot>(currentPreviewPreparedToken)')) {
  failures.push('TransportBar does not read basis-hearing prepared snapshot from session payload');
}

if (failures.length) {
  console.error('[xensonar][check] transport prepared payload session ownership failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar][check] transport prepared payload session ownership ok');
