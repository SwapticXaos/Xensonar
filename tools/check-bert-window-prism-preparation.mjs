import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => {
  console.error(`[bert-window-prism-preparation] ${message}`);
  process.exit(1);
};
const ok = (message) => console.log(`[bert-window-prism-preparation] OK ${message}`);
const assertIncludes = (text, needle, label) => {
  if (!text.includes(needle)) fail(`${label} missing: ${needle}`);
};
const assertNotIncludes = (text, needle, label) => {
  if (text.includes(needle)) fail(`${label} must not include: ${needle}`);
};

const plan = read('src/features/l3lab/spectralForge/rootFollow/buildBranchB573SynthWindowBodyPlan.ts');
const preview = read('src/features/l3lab/spectralForge/integral/carrierLoopBodyPreviewBuffer.ts');
const modes = read('src/features/l3lab/spectralForge/components/harmonizerPanel/spectralForgeBasisHearingModes.ts');
const ui = read('src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralMachineUi.ts');
const ledger = read('docs/BERT_WINDOW_PRISM_GENE_LEDGER_3.2.91-7.7.20.md');
const notes = read('docs/PATCH_NOTES_3.2.91-7.7.20_bert_window_prism_preparation.md');

[
  'energyGraph: number[]',
  'densityGraph: number[]',
  'centroidGraph: number[]',
  'spreadGraph: number[]',
  'roughness: number',
  'transientness: number',
  'leakRisk: number',
  'localField: LocalFieldModuleState | null',
  'buildLocalFieldFromWindow',
  'buildWindowFromProfiles',
  'buildBranchB573SynthWindowBodyPlan',
].forEach((needle) => assertIncludes(plan, needle, 'B_5.73 plan contract'));
ok('B_5.73 window plan still exposes window graphs, roughness/transientness/leakRisk and localField');

assertIncludes(preview, "'bert-window-prism-candidate'", 'preview reference reservation');
assertIncludes(preview, "| 'cecilia-spectral-weave'", 'Cecilia legacy reference kind remains typed for compatibility');
assertNotIncludes(preview, "'cecilia-spectral-weave' && body.sourceKind === 'branch-b573-synth-window-body-plan'", 'Bert must not use Cecilia renderer');
ok('Bert preview reference is reserved and Cecilia renderer remains branch-C guarded');

assertIncludes(modes, "id: 'bert'", 'basis hearing Bert option');
assertIncludes(modes, 'Fensterprisma', 'basis hearing Bert summary');
assertIncludes(ui, 'Fenster / Prisma', 'carrier integral Bert UI label');
ok('Bert UI copy is marked as window/prism without introducing theory language');

assertIncludes(ledger, 'Bert · Fensterprisma', 'ledger');
assertIncludes(ledger, 'Keine Branch-C-CurveSet-Zwangsroute', 'ledger next step');
assertIncludes(notes, 'Bert Window Prism Preparation', 'patch notes');
ok('Bert gene ledger and patch notes are present');

const liveCodeBundle = [preview, modes, ui].join('\n');
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

if (/Math\.random\s*\(/.test(preview)) fail('Preview buffer must not introduce Math.random while preparing Bert');
ok('No Math.random introduced in carrierLoopBodyPreviewBuffer');

console.log('[bert-window-prism-preparation] PASS');
