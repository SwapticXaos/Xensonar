#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
function assert(cond, msg) {
  if (!cond) {
    console.error(`[labor-import-fragment-sanity-6909] FAIL: ${msg}`);
    process.exit(1);
  }
}

const panel = read('src/features/l3lab/canonicalForge/melodicLoopPanel.tsx');
const actions = read('src/features/l3lab/canonicalForge/materialBaseActions.ts');
const workflow = read('src/features/l3lab/canonicalForge/materialBaseWorkflow.ts');
const channel = read('src/features/l3lab/canonicalForge/materialImportChannel.ts');
const controller = read('src/features/l3lab/canonicalForge/melodicSampleWorkspaceController.ts');
const bridge = read('src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts');

// 8.79 regression guard: Labor/SpectralForge exports must land in the Material-Import rack
// instead of bypassing the rack through a direct apply path. The rack confirm path is the one
// that makes selection, material-body identity and the two-click fragmentation workflow stable.
assert(panel.includes('isPendingCarrierIntegralMaterialSelection'), 'melodic import rack must preserve pending carrier/material selection while the library entry is hydrating');
assert(panel.includes("lower.startsWith('carrier-integral-')"), 'pending carrier-integral ids must not be overwritten by pickPreferredMaterialImportEntry');
assert(panel.includes("lower.includes('spectralforge-raw-oscillator-material')"), 'pending raw oscillator material ids must be preserved until their material entry arrives');
assert(panel.includes('queueCarrierPinkExportForImportDialog'), 'Labor pink export must queue into the import dialog, not bypass it');
assert(panel.includes('queueRawCarrierMaterial'), 'raw carrier material export must queue into the import dialog');
assert(panel.includes("listenXensonarEvent('carrierIntegralMelodicPinkExport'") || panel.includes("window.addEventListener('xensonar:carrier-integral-melodic-pink-export'"), 'pink Labor export event must be received by the Melodic import rack via event channel');
assert(panel.includes("listenXensonarEvent('carrierIntegralRawMaterialMelodicExport'") || panel.includes("window.addEventListener('xensonar:carrier-integral-raw-material-melodic-export'"), 'raw carrier material export event must be received by the Melodic import rack via event channel');
assert(!panel.includes('applyCarrierPinkExportDirectly'), 'direct Labor pink apply path must not return; it bypasses the 8.79 stable import/fragment dialog');
assert(panel.includes("window.sessionStorage.removeItem('xensonar:pending-carrier-integral-pink-export')"), 'successful audio-paint import must clear pending Labor pink export');
assert(panel.includes("window.sessionStorage.removeItem('xensonar:pending-carrier-integral-raw-material-melodic-export')"), 'successful raw material import must clear pending raw carrier export');

// Raw material import path: confirm in the rack must create a material-base body and select it.
assert(controller.includes('importMaterialEntryIntoMelodicLoopAction'), 'workspace controller must expose the material-entry import action');
assert(actions.includes('applyMaterialBaseImportToDraft'), 'material import action must write through the Materialbasis workflow');
assert(workflow.includes("note.noteClass = 'material-base'"), 'raw/raster material import must create a material-base note');
assert(workflow.includes('draft.selectedNoteId = note.id'), 'imported material-base note must become selected so So schneiden? is immediately available');
assert(workflow.includes('draft.selectedTrackId = MATERIAL_BASE_TRACK_ID'), 'imported material-base track must become selected');
assert(actions.includes("materialPitchMode: rawCarrierMaterial ? 'source-granular' : 'grid-elastic'"), 'raw carrier material must retain source-granular pitch mode');
assert(channel.includes('isRawCarrierMaterialEntry'), 'raw carrier material must be recognized as a distinct import lane');

// Two-click So schneiden? path: first click prepares guide edit, second click commits durable fragments.
assert(actions.includes('resolveFragmentableLoopImportBody(args.loopComposer)'), 'So schneiden? must resolve the live import body, not only trust stale UI selection');
assert(actions.includes('beginLoopImportFragmentGuideEdit(draft, selected)'), 'first click must begin the 8.79 guide-edit contract');
assert(actions.includes('commitLoopImportFragmentationInDraft(draft, selected.id, snapshot)'), 'second click must commit the 8.79 durable fragmentation contract');
assert(workflow.includes('replaceSelectedMaterialWithFragments'), 'fragmentation must replace the body with durable note fragments');
assert(workflow.includes('draft.notes.push(...clones)'), 'fragments must be persisted into the loop draft');
assert(workflow.includes('draft.timeGuideMarkers = guideSnapshot.map'), 'fragment commit must restore periodic guide markers after commit/restore');
assert(workflow.includes('sliceCarrierIntegralFieldClip'), 'carrier-field fragments must slice their internal fretless field, not duplicate the full body');
assert(bridge.includes("note.noteClass = 'carrier-field'"), 'last-hearing carrier import must be fragmentable as carrier-field');

console.log('[labor-import-fragment-sanity-6909] OK');
