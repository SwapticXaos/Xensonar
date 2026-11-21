'use strict';
// BUILTIN-SEED-01 (real app, Melodic Loop): the built-in Nodal and Entrophon sounds are ordinary library entries, directly there like saved sounds.
//  - opening the Melodic Loop seeds them once: Nodal Prism, Ember, Hollow, Filament, Reed, Obsidian; Entrophon the 10 built-in sounds (troodle stays a built-in key)
//  - the managers list them with Preview, Edit, Rename, Remove (all enabled), the count includes them
//  - the instrument sound menu of a card offers them (Nodal and Entrophon groups); choosing one plays without an error
//  - Remove removes it and it does not come back (flag), an identical sound is not duplicated
//  - the Live Room list of Entrophon sounds does not show a seeded, unchanged copy a second time
// Usage: node tests/e2e/melodic_factory_sounds.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 assert.deepEqual(JSON.parse(await E('JSON.stringify([__XenNodalLibrary.list().length,__XenEntrophonLibrary.list().length])')),[0,0],'nothing is written before the Melodic Loop is opened');
 await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
 await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(4500);
 const counts=JSON.parse(await E('JSON.stringify([__XenNodalLibrary.list().map(e=>e.instrument.name),__XenEntrophonLibrary.list().map(e=>e.instrument.name)])'));
 for(const n of ['Prism','Ember','Hollow','Filament','Reed','Obsidian'])assert(counts[0].some(x=>x.startsWith(n)),'Nodal library holds '+n+': '+counts[0]);
 assert.equal(counts[0].length,6,'six Nodal sounds');assert.equal(counts[1].length,10,'ten Entrophon sounds: '+counts[1]);
 assert(counts[1].includes('Choir Cloud'),'Choir Cloud is in the Entrophon library');
 // managers: same rows as every saved sound
 const nodalM=p.locator('section[aria-label="Nodal instrument library"]'),entM=p.locator('section[aria-label="Entrophon instrument library"]');
 const open=async m=>{await m.scrollIntoViewIfNeeded();await m.getByRole('button',{name:/Manage \(\d+\)/}).click();await p.waitForTimeout(500)};
 await open(nodalM);assert(/Manage \(6\)/.test(await nodalM.innerText()),'Nodal count includes the seeded sounds');
 const nrow=nodalM.locator('.nd-library-manager-row',{hasText:'Ember'}).first();
 assert.deepEqual(await nrow.locator('button').allInnerTexts(),['Preview','Edit','Rename','Remove']);
 assert.equal(await nrow.getByRole('button',{name:'Remove'}).isDisabled(),false,'Remove works on a seeded sound');
 await open(entM);assert(/Manage \(10\)/.test(await entM.innerText()),'Entrophon count includes the seeded sounds');
 const erow=entM.locator('.nd-library-manager-row',{hasText:'Choir Cloud'}).first();
 assert.deepEqual(await erow.locator('button').allInnerTexts(),['Preview','Edit','Rename','Remove']);
 // the sound menu of a card
 const card=p.locator('[data-ml-instrument-card]').first();await card.scrollIntoViewIfNeeded();
 await card.locator('.melodic-card-sound-select button').click();await p.waitForTimeout(500);
 const menu=p.locator('.melodic-card-sound-menu').first();const text=await menu.innerText();
 for(const n of ['Prism','Ember','Hollow','Filament','Reed','Obsidian','troodle','Choir Cloud'])assert(text.includes(n),'the sound menu offers '+n);
 await p.evaluate(()=>{window.__mlErr=[];window.addEventListener('xensonar:melodic-error',e=>window.__mlErr.push(e.detail))});
 await menu.getByRole('option',{name:/Prism/}).click();await p.waitForTimeout(800);
 await card.locator('button').first().click();await p.waitForTimeout(3500);
 assert.deepEqual(await p.evaluate(()=>window.__mlErr),[],'a seeded Nodal sound plays in the Melodic Loop without an error');
 // Remove: gone and not seeded again; an identical sound is not duplicated
 p.on('dialog',d=>d.accept());
 await open(nodalM);await nodalM.locator('.nd-library-manager-row',{hasText:'Reed'}).first().getByRole('button',{name:'Remove'}).click();await p.waitForTimeout(500);
 const again=JSON.parse(await E('JSON.stringify([__xenSeedBuiltinSounds(),__XenNodalLibrary.list().length])'));
 assert.deepEqual(again,[{nodal:0,entrophon:0},5],'a removed sound does not come back: '+JSON.stringify(again));
 // Live Room list: a seeded, unchanged Entrophon copy is not listed twice
 const names=JSON.parse(await E("JSON.stringify(entrophonSoundOptions([]).map(o=>o.label))"));
 assert.equal(names.filter(n=>n==='Choir Cloud · Entrophon').length,1,'Choir Cloud is listed once in the Live Room list: '+names.filter(n=>/Choir/.test(n)));
 assert.deepEqual(errors,[]);
 console.log('melodic_factory_sounds OK',counts[0].length,counts[1].length);
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
