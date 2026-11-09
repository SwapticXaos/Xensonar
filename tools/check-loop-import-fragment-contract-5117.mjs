#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }
function assert(cond, msg) { if (!cond) { console.error(`[loop-import-fragment-5117] FAIL: ${msg}`); process.exit(1); } }

const contract = read('src/features/l3lab/canonicalForge/loopImportExportContracts.ts');
const workflow = read('src/features/l3lab/canonicalForge/materialBaseWorkflow.ts');
const actions = read('src/features/l3lab/canonicalForge/materialBaseActions.ts');
const panel = read('src/features/l3lab/canonicalForge/melodicLoopPanel.tsx');
const interactions = read('src/features/l3lab/canonicalForge/useCanonicalLoopComposerInteractions.ts');
const pinkBridge = read('src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts');

assert(contract.includes("carrierPink: 'carrier-integral-pink'"), 'shared contract must know the pink carrier import track');
assert(contract.includes('isFragmentableLoopImportBody'), 'shared contract must expose fragmentable import-body guard');
assert(contract.includes('sliceCarrierIntegralFieldClip'), 'carrier field fragments must slice internal voices, not merely duplicate full field');
assert(workflow.includes('isFragmentableLoopImportBody(selected)'), 'fragment workflow must accept shared import bodies, not only material-base');
assert(workflow.includes("note.noteClass = 'material-base'"), 'old Materialspur import must still create a material-base note');
assert(workflow.includes('draft.selectedTrackId = MATERIAL_BASE_TRACK_ID'), 'old Materialspur import must still select the material-base track after import');
assert(workflow.includes("noteClass: fragmentNoteClass"), 'fragment workflow must assign family-specific fragment noteClass');
assert(workflow.includes('sliceCarrierIntegralFieldClip(selected.carrierIntegralField'), 'carrier field fragments must be cropped per taktsegment');
assert(actions.includes('Wähle zuerst genau den Importkörper aus'), 'status must require an explicit import-body selection when multiple lanes exist');
assert(panel.includes('isLoopImportTrackId(note.trackId)'), 'panel count must count explicit import lanes rather than accidental fixed-slot bodies');
assert(interactions.includes('isFragmentableLoopImportBody(selectedMaterialSource)'), 'copy/paint interaction must not be hardwired to material-base only');
assert(pinkBridge.includes("note.noteClass = 'carrier-field'"), 'last-hearing/monotone carrier clips must be marked as carrier-field');
assert(!interactions.includes('selectedTrack.id === MATERIAL_BASE_TRACK_ID && selectedMaterialSource'), 'old material-base-only copy guard must be gone');
console.log('[loop-import-fragment-5117] OK');
