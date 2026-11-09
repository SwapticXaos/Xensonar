import fs from 'node:fs';

const transport = fs.readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const derivation = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgeTransportPreviewDerivation.ts', 'utf8');
const keyBoundary = fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/spectralForgePreviewRequestKey.ts', 'utf8');

const requiredDerivation = [
  'buildSpectralForgeTransportPreviewRequestKey',
  'routeKind: previewRenderRouteKind',
  'renderVersion: input.renderVersion',
  'harmonicXplore: input.carrierIntegralHarmonicXplore',
  'const currentPreviewRequest = createSpectralForgePreviewRequestIdentity({',
];
const requiredBoundary = [
  'stableCarrierIntegralJson',
  'spectral-forge-transport-preview-request-v2',
  'stableCarrierIntegralForTransportPreview',
  'stableHarmonicXploreForTransportPreview',
  "input.routeKind !== 'basis-hearing'",
];

const failures = [];
for (const marker of requiredDerivation) {
  if (!derivation.includes(marker)) failures.push(`preview derivation missing ${marker}`);
}
if (!transport.includes('const previewDerivation = React.useMemo')) failures.push('TransportBar no longer memoizes preview derivation');
for (const marker of requiredBoundary) {
  if (!keyBoundary.includes(marker)) failures.push(`request-key boundary missing ${marker}`);
}
if (transport.includes('buildSpectralForgeTransportPreviewRequestKey')) {
  failures.push('TransportBar bypasses preview derivation and builds request key directly');
}

if (failures.length) {
  console.error('[xensonar][check] spectral forge preview request key boundary failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar][check] spectral forge preview request key boundary ok');
