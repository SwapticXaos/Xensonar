import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => {
  console.error(`[bert-painted-polytrace] ${message}`);
  process.exit(1);
};
const ok = (message) => console.log(`[bert-painted-polytrace] OK ${message}`);
const includes = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing: ${needle}`);
};
const notIncludes = (text, needle, label) => {
  if (text.includes(needle)) fail(`${label} must not include: ${needle}`);
};

const types = read('src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts');
const builder = read('src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchB573.ts');
const b573Plan = read('src/features/l3lab/spectralForge/rootFollow/buildBranchB573SynthWindowBodyPlan.ts');
const preview = read('src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewBuffer.ts');
const notes = read('docs/PATCH_NOTES_3.2.91-7.7.23_bert_painted_polytrace.md');

[
  'CarrierLoopBodyBertPrismLane',
  'bl?: CarrierLoopBodyBertPrismLane[]',
].forEach((needle) => includes(types, needle, 'Bert prism lane type'));
ok('CarrierLoopBodyCurveSet can carry Bert pitch/rhythm lanes');

[
  'buildBertPrismLanes',
  'eg: args.lane.energyGraph',
  'dg: args.window.densityGraph',
  'cg: args.window.centroidGraph',
  'sg: args.window.spreadGraph',
  'const bl = buildBertPrismLanes(args)',
].forEach((needle) => includes(builder, needle, 'Bert lane builder'));
ok('Bert lane builder preserves B_5.73 voice/window pitch and graph data');

[
  'const lanes = body.bl ?? []',
  'if (!lanes.length) return channelData',
  'if (activeEnergy <= 0.00001)',
  'channelData[index] = 0',
  'sampleNumberArrayLinear(lane.pg',
  'sampleNumberArrayLinear(lane.eg',
  'sampleNumberArrayLinear(lane.cg',
  'sampleNumberArrayLinear(lane.sg',
].forEach((needle) => includes(preview, needle, 'Bert painted polytrace renderer'));
ok('Bert renderer is lane-polyphonic and silent in visual silence');

notIncludes(preview, "referenceKind === 'bert-window-prism-candidate' && body.sourceKind === 'branch-c-interval-window-body-plan'", 'Bert must not use Cecilia source kind');

includes(b573Plan, 'pitchLanes', 'B573 pitch lane source');
includes(b573Plan, 'tracePitchLanesFromProfiles', 'B573 pitch lane tracer');
includes(b573Plan, 'pitchGraphCents', 'B573 per-lane pitch graph');
includes(builder, 'window.pitchLanes', 'Bert adapter consumes B573 pitch lanes');
includes(preview, 'lane.pg', 'Bert renderer per-lane pitch graph');

if (/Math\.random\s*\(/.test(preview) || /Math\.random\s*\(/.test(builder) || /Math\.random\s*\(/.test(b573Plan)) fail('Bert painted polytrace must not use Math.random');
[
  'MoQ',
  'Quality Slip',
  'Latch',
  'GRIT',
  'TOUGH',
  'JUNK',
].forEach((forbidden) => {
  notIncludes(types + builder + preview + b573Plan, forbidden, 'Xensonar live code');
});
ok('Bert trace stays deterministic and free of toolkit-only terminology');

includes(notes, 'Bert Painted Polytrace', 'patch notes');
console.log('[bert-painted-polytrace] PASS');
