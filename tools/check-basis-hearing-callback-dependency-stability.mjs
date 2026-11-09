#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const hook = readFileSync('src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts', 'utf8');
const fail = (message) => {
  console.error(`[xensonar][basis-hearing-callback-dependency-stability] ${message}`);
  process.exit(1);
};

const required = [
  'const {\n    beginGeneration,\n    getOrStartInflight,\n    getPreparedEntry,\n    isCurrentGeneration,\n    previewSessionDriver,\n    rememberPreparedEntry,\n  } = previewSession;',
  'const generation = beginGeneration();',
  'const isCurrentAudition = () => isCurrentGeneration(generation) && previewSessionDriver.isCurrentRequest(previewRequest);',
  'const preparedEntry = getPreparedEntry(stableRequestKey);',
  'getOrStartInflight(',
  'rememberPreparedEntry(stableRequestKey, createBasisHearingPreparedEntry(prewarmResult))',
  'previewSessionDriver.schedule(previewRequest)',
  'previewSessionDriver.canPlay(previewRequest)',
];

for (const needle of required) {
  if (!hook.includes(needle)) fail(`missing stable preview-session usage: ${needle}`);
}

const callbackStart = hook.indexOf('const selectAndPreviewHearingOption = useCallback');
const resolveStart = hook.indexOf('const resolveOptionUi = useCallback', callbackStart);
if (callbackStart === -1 || resolveStart === -1) {
  fail('could not locate selectAndPreviewHearingOption callback region');
}
const callbackRegion = hook.slice(callbackStart, resolveStart);
const dependencyStart = callbackRegion.lastIndexOf('  }, [');
if (dependencyStart === -1) fail('could not locate selectAndPreviewHearingOption dependency array');
const dependencyBlock = callbackRegion.slice(dependencyStart);
if (dependencyBlock.includes('previewSession,')) {
  fail('selectAndPreviewHearingOption still depends on the whole previewSession object');
}
for (const stableDependency of [
  'beginGeneration',
  'getOrStartInflight',
  'getPreparedEntry',
  'isCurrentGeneration',
  'previewSessionDriver',
  'rememberPreparedEntry',
]) {
  if (!dependencyBlock.includes(stableDependency)) {
    fail(`dependency block missing stable session function: ${stableDependency}`);
  }
}

console.log('[xensonar] basis hearing callback dependency stability green');
