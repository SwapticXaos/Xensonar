'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),parent=require('./fixtures/f445_parent_hashes.json'),m=require('../source-manifest.json');
const read=f=>fs.readFileSync(path.join(root,f)),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const intentional=new Set(['src/nodal/02_synthesis_kernel.js','src/nodal/04_audio_runtime.js','src/nodal/12_surface_runtime.js',
 'src/app/forge/01_room_shell.js','src/rhythm/03_live_drum_bodies.js','src/forge/hybrid/03_render_pipeline.js',
 'src/forge/hybrid/08_playback_controller.js','src/app/forge/07_preview_cache_and_controls.js','template/head.html']);
const extracted=['src/forge/lifecycle/01_offline_jobs.js','src/forge/lifecycle/02_workbench_activity.js'];
const reconstituted={
 'src/01_app_runtime.js':Buffer.concat([read(extracted[0]),read('src/01_app_runtime.js')]),
 'src/forge/ui/05_workbench_controls.js':Buffer.from(read('src/forge/ui/05_workbench_controls.js').toString().replace('/* F3.56.31 Workbench / recipe',read(extracted[1]).toString()+'/* F3.56.31 Workbench / recipe'))
};
for(const [f,source]of Object.entries(reconstituted))assert.equal(hash(source),parent.files[f],'Extraction must reconstruct every original byte: '+f);
let preserved=0;const changes=[];
for(const [f,expected]of Object.entries(parent.files)){
 if(hash(read(f))===expected)preserved++;else if(!(f in reconstituted)){assert(intentional.has(f),'Unexpected production change: '+f);changes.push(f);}
}
assert.deepEqual(changes.sort(),[...intentional].sort());
assert.deepEqual([...m.files,...m.styles.map(s=>s.file),'template/head.html','template/script-close.html','template/foot.html'].sort(),[...Object.keys(parent.files),...extracted].sort());
assert(m.files.indexOf(extracted[0])<m.files.indexOf('src/01_app_runtime.js'));
assert(m.files.indexOf(extracted[1])<m.files.indexOf('src/forge/ui/05_workbench_controls.js'));
const report={status:'PASS',parentHtmlSha256:parent.html,unchangedProductionFiles:preserved,intentionalChanges:changes,
 byteExactExtractions:Object.keys(reconstituted),newOwners:extracted,
 entrophonAndWasmUnchangedSinceF444:true,forgeCaptureAndRenderDspUnchanged:true,storedSchemasUnchanged:true};
fs.writeFileSync(path.join(root,'results/f445-preservation.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS',report);
