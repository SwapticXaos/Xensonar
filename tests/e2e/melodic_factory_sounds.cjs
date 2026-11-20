'use strict';
// NODAL-FACTORY-01 (real app, Melodic Loop): the built-in Nodal and Entrophon sounds are reachable.
//  - the instrument sound menu lists the Nodal starter sounds (Prism, Ember, Hollow, Filament, Reed, Obsidian, troodle) as built-in presets
//  - choosing one sets the track preset to nodal:factory:<id> (no revision, no song-bank entry) and the sound can be previewed
//  - the Nodal and Entrophon library managers list the built-in sounds (Preview, Save copy) instead of only "No saved ..."; Save copy puts an editable entry in the library
// Usage: node tests/e2e/melodic_factory_sounds.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
 await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(4000);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 // pure resolver: every factory key resolves, no revision needed
 const res=JSON.parse(await E(`JSON.stringify(__xenNodalFactoryList().map(f=>{const i=nodalFindInstrument(f.key,null);return [f.key,!!i,i&&i.nodes.length]}))`));
 assert.equal(res.length,7);for(const [k,ok,n] of res)assert(ok&&n>=3,k+' resolves with nodes: '+ok+' '+n);
 // sound menu of the first instrument card
 const card=p.locator('[data-ml-instrument-card]').first();await card.scrollIntoViewIfNeeded();
 await card.locator('.melodic-card-sound-select button').click();await p.waitForTimeout(500);
 const menu=p.locator('.melodic-card-sound-menu').first();const text=await menu.innerText();
 for(const n of ['Prism','Ember','Hollow','Filament','Reed','Obsidian','troodle'])assert(text.includes(n),'the sound menu offers the Nodal sound '+n);
 assert(/built-in preset/.test(text),'marked as built-in');
 await p.evaluate(()=>{window.__mlErr=[];window.addEventListener('xensonar:melodic-error',e=>window.__mlErr.push(e.detail))});
 await menu.getByRole('option',{name:/Prism/}).click();await p.waitForTimeout(800);
 await card.locator('button').first().click();await p.waitForTimeout(3500);
 assert.deepEqual(await p.evaluate(()=>window.__mlErr),[],'the built-in Nodal sound plays in the Melodic Loop without an error');
 const sel=await p.evaluate(()=>document.querySelector('[data-ml-instrument-card]').innerText);
 assert(/Prism/.test(sel),'the card shows the chosen sound: '+sel.slice(0,80));
 // library managers
 const nodalM=p.locator('section[aria-label="Nodal instrument library"]'),entM=p.locator('section[aria-label="Entrophon instrument library"]');
const open=async m=>{await m.scrollIntoViewIfNeeded();await m.getByRole('button',{name:/Manage \(\d+\)/}).click();await p.waitForTimeout(500);return m.innerText()};
 const nt=await open(nodalM),et=await open(entM);
 assert(/Prism[^\n]*built-in/.test(nt)&&/troodle[^\n]*built-in/.test(nt),'Nodal manager lists built-in sounds: '+nt.slice(0,200));
 assert(/built-in/.test(et)&&/Choir Cloud/.test(et),'Entrophon manager lists built-in sounds: '+et.slice(0,200));
 assert(!/No saved Nodal instruments\./.test(nt)&&!/No saved Entrophon sounds\. Use Save Sound/.test(et),'the dead-end texts are gone');
 // Save copy -> editable library entry
 const before=JSON.parse(await E('JSON.stringify([__XenNodalLibrary.list().length,__XenEntrophonLibrary.list().length])'));
 await entM.getByRole('button',{name:/Save a copy of Choir Cloud/}).click();await p.waitForTimeout(400);
 await open(nodalM);await nodalM.getByRole('button',{name:/Save a copy of Ember/}).click();await p.waitForTimeout(400);
 const after=JSON.parse(await E('JSON.stringify([__XenNodalLibrary.list().length,__XenEntrophonLibrary.list().length])'));
 assert.deepEqual(after,[before[0]+1,before[1]+1],'Save copy adds one library entry each');
 assert(/Manage \(1\)/.test(await nodalM.innerText()),'the Manage count follows');
 assert.deepEqual(errors,[]);
 console.log('melodic_factory_sounds OK',JSON.stringify(res.map(r=>r[0])));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
