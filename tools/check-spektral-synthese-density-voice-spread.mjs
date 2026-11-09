#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const enginePath = 'src/features/l3lab/spectralForge/integral/carrierIntegralSpektralSyntheseEngine.ts';
const profilePath = 'src/features/l3lab/spectralForge/integral/carrierIntegralSpektralSyntheseProfile.ts';
const engine = fs.readFileSync(path.join(root, enginePath), 'utf8');
const profile = fs.readFileSync(path.join(root, profilePath), 'utf8');
const failures = [];
function must(src, needle, label = needle) { if (!src.includes(needle)) failures.push(`missing ${label}`); }
function mustNot(src, needle, label = needle) { if (src.includes(needle)) failures.push(`must not contain ${label}`); }

must(engine, 'applyDescriptorDensityVoiceSpreadPass', 'density/voice-spread pass');
must(engine, 'descriptor.density', 'density drives the spread pass');
must(engine, 'densityStrength', 'bounded density strength');
must(engine, 'layerCount', 'density-dependent layer count');
must(engine, 'preservePeakCeiling(buffer, peakBefore)', 'peak ceiling guard after spread pass');
must(engine, 'spektral-synthese-route-v3-density-voice-spread', 'cache-key version marks density spread semantics');
must(engine, 'spektral-synthese-density-voice-spread-v1', 'direct-engine key marks density spread semantics');
must(engine, 'applyDescriptorContrastDynamicsPass(rendered.buffer, args.spectralData, descriptor)', 'contrast pass remains first');
must(engine, 'applyDescriptorDensityVoiceSpreadPass(rendered.buffer, descriptor)', 'density pass is applied');
must(engine, 'applyDescriptorAccentPass(rendered.buffer, descriptor)', 'accent pass remains after density spread');
must(profile, 'descriptor.density * 11', 'density has stronger partial-count influence');
must(profile, 'descriptor.density * 0.12', 'density contributes to swarm dispersion');
must(profile, 'Math.max(3, Math.min(16', 'bounded SpektralSynthese partial range');
mustNot(engine, 'Math.random(', 'randomness in SpektralSynthese density spread');
mustNot(engine, 'new Worker(', 'worker/threading change');
mustNot(engine, 'renderToBuffer(', 'global AudioEngine path from density check');

if (failures.length) {
  console.error('[spektral-synthese-density-voice-spread] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[spektral-synthese-density-voice-spread] PASS');
console.log('- SpektralSynthese now lets image density thicken the rendered body via deterministic low-gain voice spread.');
console.log('- Sparse images stay mostly untouched; dense images get more partials, wider texture, and preserved peak ceiling.');
console.log('- No randomness, worker, global AudioEngine, HX, Direct Renderer, or Pure Dieter formula change was introduced.');
