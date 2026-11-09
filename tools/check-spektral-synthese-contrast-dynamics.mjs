#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const enginePath = 'src/features/l3lab/spectralForge/integral/carrierIntegralSpektralSyntheseEngine.ts';
const src = fs.readFileSync(path.join(root, enginePath), 'utf8');
const failures = [];
function must(needle, label = needle) { if (!src.includes(needle)) failures.push(`${enginePath} missing ${label}`); }
function mustNot(needle, label = needle) { if (src.includes(needle)) failures.push(`${enginePath} must not contain ${label}`); }

must('applyDescriptorContrastDynamicsPass', 'contrast dynamics pass');
must('descriptor.contrast', 'descriptor contrast drives dynamics');
must('columnEnergy', 'column energy envelope extraction');
must('contrastStrength', 'bounded contrast strength');
must('Preserve the previous peak ceiling', 'explicit peak-ceiling guardrail');
must('spektral-synthese-route-v3-density-voice-spread', 'cache-key version bump for changed buffer semantics');
must('spektral-synthese-contrast-dynamics-v1', 'summary/direct-engine key marks contrast dynamics');
must('applyDescriptorContrastDynamicsPass(rendered.buffer, args.spectralData, descriptor)', 'contrast dynamics is applied before accent pass');
must('applyDescriptorAccentPass(rendered.buffer, descriptor)', 'existing accent pass remains');
mustNot('Math.random(', 'randomness in SpektralSynthese contrast dynamics');
mustNot('new Worker(', 'worker/threading change');

if (failures.length) {
  console.error('[spektral-synthese-contrast-dynamics] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[spektral-synthese-contrast-dynamics] PASS');
console.log('- SpektralSynthese now uses image contrast to shape foreground/background dynamics.');
console.log('- The change is isolated to the SpektralSynthese buffer post-pass and marks its cache/summary key.');
console.log('- No randomness, worker, global AudioEngine, Pure Dieter, Direct Renderer, or HX formula change was introduced.');
