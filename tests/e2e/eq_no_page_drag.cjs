'use strict';
// EQ-NODRAG-01 (real app): painting in the Mixing Desk EQ while text of the page is selected must not start a native drag of
// that selection (the whole page as a translucent ghost); the stroke still paints (the drawn curve changes).
// Usage: node tests/e2e/eq_no_page_drag.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const path=require('path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:1000}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{try{localStorage.setItem('xensonar.djStage.expanded.v1','1')}catch{}
 window.__drags=[];window.addEventListener('dragstart',e=>{const t=e.target;window.__drags.push((t&&t.nodeType===1?t.tagName+'.'+(t.className||'').toString().slice(0,60):'#text:'+(t&&t.textContent||'').slice(0,30)))},true);});
await p.goto('file://'+path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'));await p.waitForTimeout(4000);
await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1500);
// load Quick Mix A+B
await p.evaluate(()=>{const b=[...document.querySelectorAll('.xen-dj-stage button')].find(x=>/Quick Mix A\+B/.test(x.innerText));b&&b.click()});await p.waitForTimeout(3000);
const eqBtns=await p.evaluate(()=>[...document.querySelectorAll('.xen-dj-stage button')].filter(x=>/EQ/i.test(x.innerText+x.title)).map(x=>(x.innerText+'|'+x.title).slice(0,80)));

await p.evaluate(()=>{const b=[...document.querySelectorAll('.xen-dj-stage button')].find(x=>/EQ/i.test(x.title)&&/24|mal|paint/i.test(x.title+x.innerText));(b||[...document.querySelectorAll('.xen-dj-spectrum-chip')][0])?.click()});await p.waitForTimeout(1200);
await p.evaluate(()=>{const b=[...document.querySelectorAll('.xen-dj-stage button')].find(x=>/24-band EQ/.test(x.innerText));b&&b.click()});await p.waitForTimeout(1200);const prof=await p.$('[data-eq-paint]');console.log('profile',!!prof);
assert.ok(prof,'Mixing Desk EQ open');const pic=()=>p.evaluate(()=>document.querySelector('[data-eq-paint] canvas')?.toDataURL().length+':'+document.querySelector('[data-eq-paint] canvas')?.toDataURL().slice(-200));
await prof.scrollIntoViewIfNeeded();const bb=await prof.boundingBox();
for(const mode of ['plain','selectAll']){
 await p.evaluate(()=>{window.__drags=[];getSelection().removeAllRanges()});const before=await pic();
 if(mode==='selectAll')await p.evaluate(()=>{const r=document.createRange();r.selectNodeContents(document.body);getSelection().addRange(r)});
 if(mode==='dblclickWord'){await p.evaluate(()=>{const el=[...document.querySelectorAll('.xen-dj-stage *')].find(e=>e.children.length===0&&/Mixing Desk ready|MIX SCENES|time truth/.test(e.textContent));const r=document.createRange();r.selectNodeContents(el);getSelection().addRange(r)});}
 await p.mouse.move(bb.x+bb.width*.3,bb.y+bb.height*.5);await p.mouse.down();
 for(let i=1;i<=10;i++)await p.mouse.move(bb.x+bb.width*(.3+i*.04),bb.y+bb.height*(.5-i*.03));
 await p.mouse.up();await p.waitForTimeout(300);
 const drags=await p.evaluate(()=>window.__drags);assert.deepEqual(drags,[],mode+': no native drag out of the EQ');assert.notEqual(await pic(),before,mode+': the stroke painted');
}
assert.deepEqual(errs,[]);console.log('PASS EQ-NODRAG-01 painting in the EQ never drags the page selection; the stroke paints');await b.close();})().catch(e=>{console.error(e);process.exit(1)});
