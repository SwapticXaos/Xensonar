#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
function assert(cond, msg) { if (!cond) { console.error(`[material-fragmentation-boundary-6907] FAIL: ${msg}`); process.exit(1); } }

const workflow = read('src/features/l3lab/canonicalForge/materialBaseWorkflow.ts');
const actions = read('src/features/l3lab/canonicalForge/materialBaseActions.ts');
const channel = read('src/features/l3lab/canonicalForge/materialImportChannel.ts');
const preview = read('src/features/l3lab/canonicalForge/loopPreview.ts');
const rendering = read('src/features/l3lab/canonicalForge/loopComposerRendering.ts');
const pitchDisplay = read('src/features/l3lab/canonicalForge/materialBasePitchDisplay.ts');
const domain = read('src/features/l3lab/canonicalForge/loopDrumDomain.ts');
const domainTypes = read('src/features/l3lab/canonicalForge/loopDrumDomainTypes.ts');
const sessionTypes = read('src/features/l3lab/canonicalForge/sessionTypes.ts');

assert(workflow.includes('resolveFragmentableLoopImportBody'), 'workflow must expose the 8.79 fragmentable import-body resolver');
assert(workflow.includes('beginLoopImportFragmentGuideEdit'), 'workflow must expose draft guide edit begin contract');
assert(workflow.includes('commitLoopImportFragmentationInDraft'), 'workflow must expose draft commit/restore contract');
assert(workflow.includes('draft.timeGuideMarkers = guideSnapshot.map'), 'commit must restore guide markers when no durable fragmentation is possible');
assert(workflow.includes('replaceSelectedMaterialWithFragments'), 'commit must persist fragments into the loop draft instead of visual-only cuts');
assert(actions.includes('resolveFragmentableLoopImportBody(args.loopComposer)'), 'button action must use resolver, not selected-note-only lookup');
assert(actions.includes('beginLoopImportFragmentGuideEdit(draft, selected)'), 'first click must begin a draft guide edit through workflow boundary');
assert(actions.includes('commitLoopImportFragmentationInDraft(draft, selected.id, snapshot)'), 'second click must commit through workflow boundary');
assert(actions.includes('args.setSelectedLoopNoteIds(commitResult.selectedIds.length ? commitResult.selectedIds : [selected.id])'), 'selection must remain stable after commit/restore');
assert(channel.includes('isRawCarrierMaterialEntry'), 'raw carrier material route must be distinguished from normal raw audio loops');
assert(channel.includes('isCarrierIntegralGranularMaterialEntry'), 'granular carrier material route must be distinguished from audio paint');
assert(actions.includes("materialPitchMode: rawCarrierMaterial ? 'source-granular' : 'grid-elastic'"), 'raw/granular carrier material must set a source-granular pitch mode');
assert(domainTypes.includes('LoopMaterialPitchMode'), 'loop domain must persist material pitch mode');
assert(sessionTypes.includes('materialPitchMode?'), 'session type schema must serialize material pitch mode');
assert(preview.includes('materialSourceGranular'), 'preview must route source-granular material into elastic/granular-safe playback');
assert(preview.includes('materialSourceFixed ? 1'), 'preview must avoid hidden pitch-rate modulation for source-fixed material');
assert(rendering.includes('sourceFixed'), 'rendering pitch display path must understand fixed-source material');
assert(pitchDisplay.includes('sourceFixed'), 'material-base pitch display must reveal fixed-source behavior');
console.log('[material-fragmentation-boundary-6907] OK');
