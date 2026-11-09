import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

function assertNotIncludes(text, needle, label) {
  if (text.includes(needle)) {
    throw new Error(`${label}: forbidden ${needle}`);
  }
}

const grid = read('src/features/l3lab/canonicalForge/loopGridKernel.ts');
const rendering = read('src/features/l3lab/canonicalForge/loopComposerRendering.ts');
const hit = read('src/features/l3lab/canonicalForge/loopComposerInteraction.ts');
const interactions = read('src/features/l3lab/canonicalForge/useCanonicalLoopComposerInteractions.ts');
const workflow = read('src/features/l3lab/canonicalForge/materialBaseWorkflow.ts');
const baseActions = read('src/features/l3lab/canonicalForge/materialBaseActions.ts');

assertIncludes(grid, 'isLoopInternalBarTimeGuideMarker', 'fragment marker grid helper');
assertIncludes(grid, "marker.kind !== 'bar'", 'fragment marker grid helper');
assertIncludes(grid, "marker.kind === 'guide' || isLoopInternalBarTimeGuideMarker", 'fragment marker grid helper');
assertIncludes(grid, 'marker.muted !== true', 'fragment marker active cut helper');

assertIncludes(rendering, 'materialGuideHighlightActive && isLoopEditableFragmentCutMarker(state, marker)', 'pink bar marker rendering');
assertIncludes(rendering, "'rgba(244,114,182,0.92)'", 'pink bar marker rendering');

assertIncludes(hit, 'materialFragmentPrepActive?: boolean', 'hit-test receives fragment prep mode');
assertIncludes(hit, "marker.kind === 'guide' || (materialFragmentPrepActive && isLoopEditableFragmentCutMarker(state, marker))", 'hit-test includes internal bars as editable cut handles only in prep mode');

assertIncludes(interactions, 'materialFragmentPrepActive: args.materialFragmentPrepActive', 'interactions pass fragment prep hit-test flag');
assertIncludes(interactions, 'isLoopEditableFragmentCutMarker(args.loopComposer, headerGuide)', 'interactions remove internal bars through editable cut marker contract');
assertIncludes(interactions, 'isLoopEditableFragmentCutMarker(args.loopComposer, hit.headerGuide)', 'context menu remove internal bars through editable cut marker contract');
assertIncludes(interactions, 'Schnittmarker entfernt.', 'user-facing marker status updated');

assertIncludes(workflow, 'isLoopActiveFragmentCutMarker(loopComposer, marker)', 'fragment spans ignore removed/muted non-cut markers');
assertIncludes(workflow, 'boundaries.add(unit)', 'fragment spans still use explicit active markers');

assertIncludes(baseActions, "rawCarrierMaterial ? 'source-granular' : 'grid-elastic'", 'raw material keeps shared granular pink-lane contract');
assertNotIncludes(baseActions, "rawCarrierMaterial ? 'source-fixed'", 'no 7.5.82 source-fixed regression');

console.log('[check-melodic-fragment-bar-cut-marker-editability] OK');
