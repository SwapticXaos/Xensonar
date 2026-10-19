'use strict';
const consolidation=require('./consolidation-compat.cjs');
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const controls={...JSON.parse(fs.readFileSync('docs/live-controls-source-anchors.json')),...require('../docs/ui-refinement-source-anchors.json'),...require('../docs/workflow-integrity-source-anchors.json'),...require('../docs/maintenance-source-anchors.json'),...require('../docs/microphone-source-anchors.json'),...require('../docs/audio-carrier-source-anchors.json'),...require('../docs/forge-ready-source-anchors.json'),...require('../docs/pitch-space-source-anchors.json'),...consolidation.anchors};
const base=JSON.parse(fs.readFileSync('docs/p4c2-n21-n20-baseline-hashes.json')),changed=[];
for(const [file,hash]of Object.entries(base))if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)changed.push(file);
const expected=['src/mix/03_quick_menu.js','src/nodal/04_audio_runtime.js','src/nodal/12_surface_runtime.js','src/01_app_runtime.js','src/runtime/instrument/10_entrophon_and_voice_control.js','src/audio/05_live_voice_runtime.js','src/audio/entrophon/01_wasm_asset.js','src/audio/entrophon/02_worklet_and_voice_backend.js','src/rhythm/04_workspace_and_transport.js','styles/24_quick_menu.css',
 'src/forge/editor/03_synthetic_sound_engines.js','src/forge/editor/05_machine_and_carrier_projection.js','src/forge/editor/09_workflow_controls.js',
 'src/forge/editor/07_composition_and_preview_ui.js',
 'src/forge_and_melodic/03_timeline_and_transport_ui.js',
 'src/forge_and_melodic/05_preview_and_sample_intake.js',
 'src/forge_and_melodic/06_note_editor_and_material_tools.js',
 'src/forge_and_melodic/10_audition_and_persistence.js',
 'styles/08_forge_workflow.css','src/runtime/instrument/05_timing_and_admission.js','src/app/forge/01_room_shell.js','src/audio/01_voice_and_rfl_ownership.js'];
assert.deepEqual(changed.sort(),[...new Set([...expected,...Object.keys(controls).filter(file=>base[file])])].sort());
const manifest=JSON.parse(fs.readFileSync('source-manifest.json'));assert(manifest.files.every(f=>base[f]||consolidation.additions.includes(f)||['src/audio/05_sample_granular_hold.js','src/audio/rfl/01_resident_worklet.js','src/audio/rfl/02_fragment_preparation.js','src/forge/dsp/04_polytrace_render.js','src/mix/04_melodic_spatial.js','src/mix/05_grid_runtime.js','src/mix/06_custom_instruments.js','src/audio/drone/01_colour.js','src/forge/ui/03_microphone_intake.js','src/forge/analysis/04_audio_to_carrier.js','src/forge/analysis/05_carrier_pitch_space.js','src/forge/ui/04_audio_to_carrier_controls.js'].includes(f)));
require('./n21-f2-preservation.cjs');
console.log('PASS merged N21 preservation: 10 N21 adapters plus 6 N20F2 Forge/navigation adaptations; explicit Granular Hold adapters; other audio prep, DSP, RFL, drums, bass, material, physics preserved');
