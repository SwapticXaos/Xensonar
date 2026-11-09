import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => {
  console.error(`[bert-harmonic-trace-prism] ${message}`);
  process.exit(1);
};
const ok = (message) => console.log(`[bert-harmonic-trace-prism] OK ${message}`);
const includes = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing: ${needle}`);
};
const notIncludes = (text, needle, label) => {
  if (text.includes(needle)) fail(`${label} must not include: ${needle}`);
};

const types = read('src/features/l3lab/spectralForge/integral/carrierLoopBodyCurveTypes.ts');
const builder = read('src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchB573.ts');
const preview = read('src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewBuffer.ts');
const notes = read('docs/PATCH_NOTES_3.2.91-7.7.22_bert_harmonic_trace_prism.md');

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
].forEach((needle) => includes(preview, needle, 'Bert harmonic trace renderer'));
ok('Bert renderer is lane-polyphonic and silent in visual silence');

notIncludes(preview, "referenceKind === 'bert-window-prism-candidate' && body.sourceKind === 'branch-c-interval-window-body-plan'", 'Bert must not use Cecilia source kind');
if (/Math\.random\s*\(/.test(preview) || /Math\.random\s*\(/.test(builder)) fail('Bert harmonic trace must not use Math.random');
[
  'MoQ',
  'Quality Slip',
  'Latch',
  'GRIT',
  'TOUGH',
  'JUNK',
].forEach((forbidden) => {
  notIncludes(types + builder + preview, forbidden, 'Xensonar live code');
});
ok('Bert trace stays deterministic and free of toolkit-only terminology');

includes(notes, 'Bert Harmonic Trace Prism', 'patch notes');
console.log('[bert-harmonic-trace-prism] PASS');
