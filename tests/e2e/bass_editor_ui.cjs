'use strict';
// BASS-UI-01 (real app, Bass Workshop, the editable body of "Walking Line"):
//  1. pitch axis: labels are fractions (Root, 3/2 ...), never two labels closer than 14 px; the view does not start at 1/4 when no
//     note is that low (the space is used for the notes)
//  2. note blocks show their real length (block width ratio = duration ratio)
//  3. velocity lane: dragging a bar sets the event's velocity (the Velocity field follows); Undo takes it back
//  4. a double-click in the velocity lane creates no note; a double-click in the pitch area creates one
// Usage: node tests/e2e/bass_editor_ui.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/room-guard|ReferenceError|TypeError/.test(m.text()))errors.push(m.text().slice(0,160))});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 await p.evaluate(()=>window.dispatchEvent(new Event('xensonar:open-bass-pattern-manager')));await p.waitForTimeout(2000);
 await p.locator('button',{hasText:'Walking Line'}).first().click();await p.waitForTimeout(800);
 const fe=p.locator('button',{hasText:'Freeze and Edit'}).first();if(await fe.count()){await fe.click();await p.waitForTimeout(1200)}// presets open as an editable body
 const canvas=p.locator('[data-bass-body-canvas]').first();await canvas.scrollIntoViewIfNeeded();
 // 1. labels
 const labels=await p.evaluate(()=>[...document.querySelectorAll('[data-bass-ratio-label]')].map(x=>({t:x.dataset.bassRatioLabel,y:x.getBoundingClientRect().top})).sort((a,b)=>a.y-b.y));
 console.log('labels',labels.map(l=>l.t).join(' '));
 assert.ok(labels.some(l=>l.t==='Root')&&labels.some(l=>l.t==='3/2'),'fraction labels incl. Root and 3/2');
 for(let i=1;i<labels.length;i++)assert.ok(labels[i].y-labels[i-1].y>=14,'labels do not overlap: '+labels[i-1].t+' / '+labels[i].t+' '+(labels[i].y-labels[i-1].y).toFixed(1)+' px');
 assert.ok(!labels.some(l=>l.t==='1/4'),'the view does not reach down to 1/4 without a note there');
 // 2. real lengths
 const lengthField=p.locator('label',{hasText:/^Length/}).locator('input').first(),velField=p.locator('label',{hasText:/^Velocity/}).locator('input').first();
 await p.locator('[data-bass-event-block]').nth(0).click();for(let k=0;k<3;k++){await p.locator('button',{hasText:/^Longer$/}).first().click();await p.waitForTimeout(150)}// lengths differ now
 const blocks=await p.evaluate(()=>[...document.querySelectorAll('[data-bass-event-block]')].map(x=>x.getBoundingClientRect().width));
 const durs=[];for(let i=0;i<blocks.length;i++){await p.locator('[data-bass-event-block]').nth(i).click();await p.waitForTimeout(120);durs.push(Number(await lengthField.inputValue()))}
 console.log('block widths',blocks.map(w=>w.toFixed(1)).join(' '),'durations',durs.join(' '));
 assert.ok(durs[0]>durs[1],'the first note is longer now: '+durs[0]+' vs '+durs[1]);const ratio=blocks[0]/durs[0];for(let i=1;i<blocks.length;i++)assert.ok(Math.abs(blocks[i]/durs[i]-ratio)/ratio<.03,'block '+i+' shows its real length');
 // 3. velocity lane drag + undo
 await p.locator('[data-bass-event-block]').nth(1).click();await p.waitForTimeout(150);const v0=Number(await velField.inputValue());
 const bar=await p.locator('[data-bass-velocity-bar]').nth(1).boundingBox(),lane=await p.locator('[data-bass-velocity-lane]').first().boundingBox();
 await p.mouse.move(bar.x+bar.width/2,bar.y+3);await p.mouse.down();await p.mouse.move(bar.x+bar.width/2,lane.y+lane.height*.62,{steps:5});await p.mouse.up();await p.waitForTimeout(300);
 const v1=Number(await velField.inputValue());console.log('velocity',v0,'->',v1);
 assert.ok(v1<v0-.2&&v1>.05,'dragging the bar down lowers the velocity: '+v0+' -> '+v1);
 await p.getByRole('button',{name:'Undo',exact:true}).last().click();await p.waitForTimeout(300);
 await p.locator('[data-bass-event-block]').nth(1).click();await p.waitForTimeout(150);
 assert.equal(Number(await velField.inputValue()),v0,'Undo restores the velocity');
 // 4. double-clicks
 const n0=await p.locator('[data-bass-event-block]').count();
 await p.mouse.dblclick(lane.x+lane.width*.7,lane.y+lane.height*.5);await p.waitForTimeout(300);
 assert.equal(await p.locator('[data-bass-event-block]').count(),n0,'a double-click in the velocity lane creates no note');
 const cb=await canvas.boundingBox();await p.mouse.dblclick(cb.x+cb.width*.66,cb.y+cb.height*.55);await p.waitForTimeout(300);
 assert.equal(await p.locator('[data-bass-event-block]').count(),n0+1,'a double-click in the pitch area creates a note');
 assert.deepEqual(errors,[]);console.log('PASS BASS-UI-01: fraction labels without overlap, real lengths, velocity lane with undo, double-click rules');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
