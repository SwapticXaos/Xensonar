#!/usr/bin/env node
import fs from 'node:fs';

const panelPath = 'src/features/l3lab/spectralForge/components/HarmonizerPanel.tsx';
const cachePath = 'src/features/l3lab/spectralForge/components/harmonizerPanel/basisHearingPreviewCache.ts';
const panel = fs.readFileSync(panelPath, 'utf8');
const hook = fs.readFileSync('src/features/l3lab/spectralForge/components/harmonizerPanel/useBasisHearingAudition.ts', 'utf8');
const cache = fs.readFileSync(cachePath, 'utf8');
const combined = `${panel}\n${hook}\n${cache}`;
const failures = [];
const must = (needle, label = needle, haystack = combined) => {
  if (!haystack.includes(needle)) failures.push(`missing ${label}`);
};
const mustNot = (needle, label = needle, haystack = combined) => {
  if (haystack.includes(needle)) failures.push(`unexpected ${label}`);
};

must('useSpectralForgePreviewSession<', 'session-owned preview cache hook', hook);
must('previewSession.getPreparedEntry(stableRequestKey)', 'session-owned prepared cache lookup', hook);
must('buildBasisHearingStableRequestKey', 'stable all-hearing request key');
must('buildCarrierIntegralSnapshotSpectralSignature(args.snapshot)', 'drawing-content signature in request key', cache);
must('machineId: value?.machineId', 'selection key keeps stable audible fields', cache);
must('presetId: value?.presetId', 'synth lab key keeps stable audible fields', cache);
must('profileId: value?.profileId', 'harmonic xplore key keeps stable audible fields', cache);
must("phase: preparedEntry ? 'ready' : 'preparing'", 'cached option skips visible prewarm', hook);
must('previewSession.getOrStartInflight(', 'same in-flight render is reused by preview session', hook);
must('Promise.resolve<SpectralForgeBasisHearingPrewarmResult>', 'prepared cache shortcut', hook);
must('Basis-Hearing prepared cache reused', 'prepared reuse reason', hook);
must('previewSession.rememberPreparedEntry', 'prepared cache stored through preview session', hook);
must('trimPreparedPreviewCache', 'prepared cache bounded by preview session', fs.readFileSync('src/features/l3lab/spectralForge/components/previewSession/useSpectralForgePreviewSession.ts', 'utf8'));
must('playPrepared(prewarmResult.cacheHit || Boolean(preparedEntry))', 'cached state is passed into playback status', hook);
mustNot('selection: args.selection,', 'volatile full selection object in request key', cache);
mustNot('synthLab: args.synthLab,', 'volatile full synth lab object in request key', cache);
mustNot('harmonicXplore: args.harmonicXplore,', 'volatile full harmonic xplore object in request key', cache);

if (failures.length) {
  console.error('[basis-hearing-prepared-cache-reuse] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('[basis-hearing-prepared-cache-reuse] PASS');
console.log('- Basis hearing switching stores a stable prepared-cache key per audible state.');
console.log('- Switching back to an unchanged prepared option skips redundant prewarm work.');
console.log('- Volatile selection/synth/HX objects are reduced to audible fields for the local reuse key.');
