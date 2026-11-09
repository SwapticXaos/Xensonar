#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const transport = readFileSync('src/features/l3lab/spectralForge/components/TransportBar.tsx', 'utf8');
const failures = [];
const mustContain = (needle, label = needle) => {
  if (!transport.includes(needle)) failures.push(`missing ${label}`);
};
const mustNotContain = (needle, label = needle) => {
  if (transport.includes(needle)) failures.push(`must not contain ${label}`);
};
const mustMatch = (regex, label) => {
  if (!regex.test(transport)) failures.push(`missing pattern ${label}`);
};

mustNotContain('renderFillVisualActive', 'decoupled render-fill visual active state');
mustNotContain('renderFillVisualProgress', 'decoupled render-fill visual progress state');
mustNotContain('timeFloor', 'time-based fake progress floor');
mustNotContain('renderFillSettlingRef', 'post-render settling animation state');
mustContain('const renderFillRawActive = rendering || prewarmRendering;', 'raw render/prewarm active source');
mustContain('const renderFillRawProgress = Math.max(', 'raw render/prewarm progress source');
mustContain('const renderFillActive = renderFillRawActive && (rendering || (!previewReadyForImmediatePlay && !isPlaying));', 'prepared preview hides transient fill overlay');
mustMatch(/const renderFillPercent = renderFillActive[\s\S]*Math\.round\(renderFillRawProgress \* 100\)/, 'fill percent follows raw renderer progress');
mustContain('aria-busy={renderFillActive}', 'busy state follows real render fill activity');
mustContain('data-xensonar-spectralforge-render-fill-percent={renderFillActive ? renderFillPercent : undefined}', 'DOM exposes only active render fill percent');
mustContain('previewReadyForImmediatePlay', 'prepared preview controls full-green ready state');

if (failures.length) {
  console.error('[xensonar][spectralforge-preview-render-truth-indicator] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[xensonar][spectralforge-preview-render-truth-indicator] OK');
