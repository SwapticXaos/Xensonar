#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const transport = readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const renderedCache = readFileSync('src/features/l3lab/spectralForge/integral/carrierIntegralRenderedPreviewCache.ts', 'utf8');

const failures = [];
const mustContain = (name, haystack, needle) => {
  if (!haystack.includes(needle)) failures.push(`${name}: missing ${needle}`);
};
const mustMatch = (name, haystack, pattern, label) => {
  if (!pattern.test(haystack)) failures.push(`${name}: missing pattern ${label}`);
};

mustContain('TransportBar', transport, 'preparedBasisHearingSnapshotRef');
mustContain('TransportBar', transport, 'if (preparedPreviewToken === currentPreviewPreparedToken)');
mustContain('TransportBar', transport, 'setPrewarmRendering(false);');
mustContain('TransportBar', transport, 'setPrewarmProgress(1);');
mustContain('TransportBar', transport, 'staleCompletion');
mustContain('TransportBar', transport, 'previewPrewarmRerunRequestedRef.current = true;\n              continue;');
mustContain('TransportBar', transport, 'preparedBasisHearingSnapshotRef.current = { token: input.token, snapshot: basisHearingSnapshot };');
mustContain('TransportBar', transport, 'const preparedSnapshot = preparedBasisHearingSnapshotRef.current?.token === currentPreviewPreparedToken');
mustContain('TransportBar', transport, 'preparedBasisHearingSnapshotRef.current = { token: currentPreviewPreparedToken, snapshot: preparedSnapshot };');
mustMatch(
  'TransportBar',
  transport,
  /useEffect\(\(\) => \{[\s\S]*preparedPreviewToken === currentPreviewPreparedToken[\s\S]*return;[\s\S]*previewPrewarmTokenRef\.current \+= 1;/,
  'prepared preview must skip rescheduling instead of clearing token after playback end',
);
mustContain('renderedPreviewCache', renderedCache, 'renderedPreviewBufferInflightCache');
mustContain('renderedPreviewCache', renderedCache, 'renderedPreviewValueInflightCache');

if (failures.length) {
  console.error('[xensonar][spectralforge-preview-cache-lifecycle-repair] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar][spectralforge-preview-cache-lifecycle-repair] OK');
