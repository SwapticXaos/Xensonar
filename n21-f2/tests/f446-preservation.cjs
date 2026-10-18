'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),parent=require('./fixtures/f446_prelink_hashes.json'),m=require('../source-manifest.json');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const allowed=new Set(parent.transferredFromF445);allowed.add('src/audio/entrophon/02_worklet_and_voice_backend.js');
let unchanged=0;const changes=[];for(const [f,h]of Object.entries(parent.files))if(hash(read(f))===h)unchanged++;else{assert(allowed.has(f),'Unexpected change from genuine pre-link base: '+f);changes.push(f);}
const ent='src/audio/entrophon/02_worklet_and_voice_backend.js',s=read(ent),old=read('tests/fixtures/f446_prelink/'+ent);
assert.equal(hash(old),parent.files[ent],'fixed pre-link fixture integrity');
const match=source=>source.match(/const T8=("(?:[^"\\]|\\.)*")/)[1];assert.equal(match(s),match(old),'Entrophon renderer must remain exactly the pre-link renderer');
const restored=s.replace(/const a=r\.volume;const nodalId=t\.presetOverride\?\?e\.particlePreset;.*?const o=xwe\(/,'const a=r.volume,o=xwe(').replace('l&&(ese(l,e.activeScheduledTonesRef.current),__XenNodalSurfaces.releaseHeld())','l&&ese(l,e.activeScheduledTonesRef.current)');
assert.equal(hash(restored),parent.files[ent],'only two explicit particle/hold integration changes outside untouched Entrophon renderer');
assert.equal(hash(read('src/forge/lifecycle/01_offline_jobs.js')+read('src/01_app_runtime.js')),parent.files['src/01_app_runtime.js']);
const ui='src/forge/ui/05_workbench_controls.js';assert.equal(hash(read(ui).replace('/* F3.56.31 Workbench / recipe',read('src/forge/lifecycle/02_workbench_activity.js')+'/* F3.56.31 Workbench / recipe')),parent.files[ui]);
for(const [file,expectedHash]of Object.entries(parent.assets)){let content=read(file);if(file==='template/head.html')content=content.replace(/<title>.*?<\/title>/,parent.headTitle);assert.equal(hash(content),expectedHash,'Original UI assets unchanged except release title: '+file);}
const expected=[...Object.keys(parent.files),...parent.transferredFromF445.filter(f=>!(f in parent.files))].sort();assert.deepEqual(m.files.slice().sort(),expected);
const report={status:'PASS',baseHtmlSha256:parent.htmlSha256,base:'genuine F443 Spectral Forge BEFORE the first Nodal wave/particle connection',sourceUnits:m.files.length,unchangedSourceUnits:unchanged,intentionalChanges:changes,entrophonRendererAndWasmUnchanged:true,keyboardAndPrimaryVoiceOwnershipUnchanged:true,byteExactExtractions:2};
fs.writeFileSync(path.join(root,'results/f446-preservation.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
