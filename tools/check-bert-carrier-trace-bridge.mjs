import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => {
  console.error(`[bert-carrier-trace-bridge] ${message}`);
  process.exit(1);
};
const ok = (message) => console.log(`[bert-carrier-trace-bridge] OK ${message}`);
const assertIncludes = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing: ${needle}`);
};
const assertNotIncludes = (text, needle, label) => {
  if (text.includes(needle)) fail(`${label} must not include: ${needle}`);
};

const builder = read('src/features/l3lab/spectralForge/integral/buildCarrierLoopBodyCurvesFromBranchB573.ts');
const buildEvent = read('src/features/l3lab/spectralForge/rootFollow/buildV2RootFollowEvent.ts');
const request = read('src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewAuditionRequest.ts');
const routes = read('src/features/l3lab/spectralForge/integral/carrierIntegralAuditionRoutes.ts');
const preview = read('src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewBuffer.ts');
const matrix = read('src/features/l3lab/spectralForge/integral/carrierLoopBodyInterpretationMatrix.ts');
const capabilities = read('src/features/l3lab/spectralForge/integral/carrierIntegralMachineCapabilities.ts');
const notes = read('docs/PATCH_NOTES_3.2.91-7.7.21_bert_carrier_trace_bridge.md');

[
  'BRANCH_B573_WINDOW_PRISM_CURVE_ADAPTER_VERSION',
  'buildCarrierLoopBodyCurvesFromBranchB573',
  'branch-b573-synth-window-body-plan',
  'energyGraph',
  'densityGraph',
  'centroidGraph',
  'spreadGraph',
  'roughness',
  'transientness',
  'leakRisk',
  'withCarrierLoopBodyCurveSafety',
  'pitchGraphCents',
].forEach((needle) => assertIncludes(builder, needle, 'Bert curve adapter'));
ok('Bert curve adapter preserves B_5.73 window pitch/rhythm/timbre inputs');

assertIncludes(buildEvent, "import { buildCarrierLoopBodyCurvesFromBranchB573 }", 'root-follow build import');
assertIncludes(buildEvent, 'shouldBuildB573SynthWindow && b573WindowPlan', 'root-follow Bert candidate gate');
assertIncludes(buildEvent, 'buildCarrierLoopBodyCurvesFromBranchB573({', 'root-follow Bert curve builder call');
ok('Root-follow build can produce a Bert CarrierLoopBody curve candidate');

assertIncludes(request, 'BERT_CARRIER_LOOP_BODY_PREVIEW_DEFAULT_REQUEST', 'Bert default preview request');
assertIncludes(request, "referenceKind: 'bert-window-prism-candidate'", 'Bert default reference kind');
assertIncludes(request, "args.machineId === 'branch-b573-synth-window'", 'Bert request resolver');
ok('Bert default preview audition request is enabled');

assertIncludes(routes, 'request.machineId === "branch-c-interval-body" || request.machineId === "branch-b573-synth-window"', 'audition route machine support');
ok('Audition routes allow Bert candidate preview without inheriting Cecilia-only guard');

assertIncludes(preview, "referenceKind === 'bert-window-prism-candidate' && body.sourceKind === 'branch-b573-synth-window-body-plan'", 'Bert preview renderer guard');
assertIncludes(preview, 'renderBertWindowPrismSamples', 'Bert preview renderer');
assertIncludes(preview, 'seededBertPhaseFromIdentity', 'Bert deterministic phases');
assertNotIncludes(preview, "'cecilia-spectral-weave' && body.sourceKind === 'branch-b573-synth-window-body-plan'", 'Bert must not use Cecilia renderer');
if (/Math\.random\s*\(/.test(preview) || /Math\.random\s*\(/.test(builder)) {
  fail('Bert trace bridge must not use Math.random');
}
ok('Bert renderer is dedicated and deterministic');

assertIncludes(capabilities, 'implemented-branch-b573-window-prism-adapter', 'capabilities Bert adapter');
assertIncludes(capabilities, 'bert-window-prism-preview-candidate', 'capabilities Bert preview');
assertIncludes(matrix, "previewRequestFlag: machineId === 'branch-c-interval-body'", 'matrix branch flag switch');
assertIncludes(matrix, "'bert-default-window-prism-path'", 'matrix Bert preview flag');
assertIncludes(matrix, 'Bert must expose its own implemented synth-window adapter.', 'matrix Bert implemented assertion');
ok('Capability and interpretation contracts now recognize Bert as its own implemented adapter');

const liveCodeBundle = [builder, buildEvent, request, routes, preview, matrix, capabilities].join('\n');
[
  'MoQ',
  'Quality Slip',
  'Latch',
  'GRIT',
  'TOUGH',
  'JUNK',
  'Dynamic Quality',
].forEach((forbidden) => assertNotIncludes(liveCodeBundle, forbidden, 'Xensonar live code'));
ok('Xensonar live code stays free of toolkit-only terminology');

assertIncludes(notes, 'Bert Carrier Trace Bridge', 'patch notes');
console.log('[bert-carrier-trace-bridge] PASS');
