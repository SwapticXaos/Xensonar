'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),vm=require('vm');
const root=path.resolve(__dirname,'..'),baseline=require('./fixtures/f448_base_hashes.json'),manifest=require('../source-manifest.json');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const allowed=new Set(['src/app/forge/01_room_shell.js','src/forge/editor/01_display_and_canvas.js','src/forge/fractalia/03_instrument.js','src/forge/fractalia/12_material_experiments.js','src/forge/fractalia/13_spectral_view.js','src/forge/fractalia/15_hearing_spectrum.js','src/forge/hybrid/09_runtime.js','src/forge/module_bundle/19_donorMaterialDiagnostics.js','src/forge/module_bundle/01_entry.js','src/forge/ui/02_donor_routing_and_hearing.js','src/forge/ui/04_cecilia_controls.js','src/forge_and_melodic/10_audition_and_persistence.js','template/head.html']);
const changed=[],removed=[],unchanged=[];
for(const [file,digest]of Object.entries(baseline)){
 const full=path.join(root,file);
 if(!fs.existsSync(full)){assert.equal(file,'src/forge/fractalia/15_hearing_spectrum.js');removed.push(file);continue}
 if(hash(fs.readFileSync(full))===digest)unchanged.push(file);
 else{assert(allowed.has(file),'unexpected source change: '+file);changed.push(file)}
}
for(const file of ['src/audio/01_voice_and_rfl_ownership.js','src/nodal/02_synthesis_kernel.js','src/app/forge/07_preview_cache_and_controls.js'])assert(unchanged.includes(file),'protected physics, DSP and audio playback source: '+file);
for(const item of manifest.styles)assert(unchanged.includes(item.file),'style preservation: '+item.file);
const code=manifest.files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('');new vm.Script('(async()=>{'+code.replaceAll('import.meta.url','"file:///xensonar.html"')+'})');
const html=fs.readFileSync(path.join(root,manifest.entry));assert.equal(hash(html),manifest.sha256);assert.equal(html.length,manifest.bytes);
const report={status:'PASS',baseline:'F4.4.7',unchangedCount:unchanged.length,changed,removed,newFiles:manifest.files.filter(f=>!(f in baseline)),protectedPhysicsAndLiveAudioUnchanged:true,allStyleFilesUnchanged:true,syntaxChecked:true,htmlSha256:manifest.sha256};
fs.writeFileSync(path.join(root,'results/f448-preservation.json'),JSON.stringify(report,null,2));console.log('PASS F448 protected source hashes, complete change list, assembled syntax and HTML identity');
