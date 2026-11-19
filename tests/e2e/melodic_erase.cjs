'use strict';
// ML-ERASE-01 (Chromium): Erase shares the Copy rectangle. Dragging over notes deletes them in one undo step; right-click on the grid cancels Copy and Erase.
// Usage: node tests/e2e/melodic_erase.cjs [html]
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'index.html');
(async()=>{const b=await chromium.launch();const p=await(await b.newContext({viewport:{width:1500,height:950}})).newPage();
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('file://'+html);await p.waitForTimeout(3500);
await p.locator('button',{hasText:'MATERIAL FORGE'}).first().click();await p.waitForTimeout(2500);
await p.locator('button',{hasText:'MELODIC LOOP'}).first().click();await p.waitForTimeout(4000);
const cv=p.locator('canvas').last();await cv.scrollIntoViewIfNeeded();await p.waitForTimeout(300);const r=await cv.boundingBox();
const copy=p.locator('[data-ml-noteclip=copy]').first(),erase=p.locator('[data-ml-noteclip=erase]').first(),paste=p.locator('[data-ml-noteclip=paste]').first();
const undo=p.getByRole('button',{name:'Undo',exact:true}).first();
assert.match(await copy.getAttribute('title'),/right-click/i,'the Copy hint names the right-click, not Esc');assert.doesNotMatch(await copy.getAttribute('title'),/Esc/);
const box=async()=>{await p.mouse.move(r.x+300,r.y+190);await p.mouse.down();await p.mouse.move(r.x+520,r.y+320,{steps:6});await p.mouse.up();await p.waitForTimeout(300)};
// how many notes does the rectangle hold?
await copy.click();await box();const n=+(await paste.innerText()).match(/\d+/)[0];assert.ok(n>=1,'rectangle holds notes');
await p.mouse.click(r.x+800,r.y+520,{button:'right'});await p.waitForTimeout(200);assert.equal(await paste.isDisabled(),true,'clipboard emptied (right-click in Paste)');
await copy.click();assert.equal(await copy.getAttribute('aria-pressed'),'false');
// right-click cancels Copy
await copy.click();assert.equal(await copy.getAttribute('aria-pressed'),'true');await p.mouse.click(r.x+400,r.y+250,{button:'right'});await p.waitForTimeout(200);
assert.equal(await copy.getAttribute('aria-pressed'),'false','right-click ends Copy');
// Erase: same rectangle deletes, one undo step
const undoBefore=await undo.isDisabled();
await erase.click();assert.equal(await erase.getAttribute('aria-pressed'),'true');assert.equal(await copy.getAttribute('aria-pressed'),'false');
await box();await p.waitForTimeout(300);
assert.equal(await undo.isDisabled(),false,'erase is an undo step');
assert.equal(await erase.getAttribute('aria-pressed'),'true','Erase stays armed for the next rectangle');
// the rectangle is empty now: Copy over it loads nothing new (clipboard was cleared first)
await p.mouse.click(r.x+400,r.y+250,{button:'right'});await p.waitForTimeout(200);
assert.equal(await erase.getAttribute('aria-pressed'),'false','right-click ends Erase');
await copy.click();await box();assert.equal(await paste.isDisabled(),true,'nothing left in the rectangle after Erase');await p.mouse.click(r.x+400,r.y+250,{button:'right'});await p.waitForTimeout(200);
await undo.click();await p.waitForTimeout(400);
await copy.click();await box();const again=+(await paste.innerText()).match(/\d+/)[0];assert.equal(again,n,'one undo brings every erased note back');

// ---- Mark is the umbrella: mark a rectangle, then Copy / mirror / Erase act on the marked notes ----
const mark=p.locator('[data-ml-noteclip=mark]').first(),fh=p.locator('[data-ml-noteclip=flip-h]').first(),fv=p.locator('[data-ml-noteclip=flip-v]').first();
await p.mouse.click(r.x+800,r.y+520,{button:'right'});await p.waitForTimeout(200);await copy.click();await p.waitForTimeout(100); // stamp emptied, Copy off
assert.equal(await fh.isDisabled(),true,'mirrors greyed out with nothing marked and nothing loaded');
const geo=()=>p.evaluate(()=>[...document.querySelectorAll('[data-ml-noteclip]')].map(x=>{const q=x.getBoundingClientRect();return [Math.round(q.left),Math.round(q.width)]}));
const geoBefore=await geo();
await mark.click();assert.equal(await mark.getAttribute('aria-pressed'),'true');await box();
assert.deepEqual(await geo(),geoBefore,'marking does not move or resize any toolbar button (no wobble)');
// the page must not change height while the rectangle is dragged (the first hit note changes on the way: it used to rewrite the composer's selected note/track on every move and the whole page jumped)
await p.evaluate(()=>{window.__h=new Set();window.__hi=setInterval(()=>window.__h.add(document.scrollingElement.scrollHeight+'/'+Math.round(document.scrollingElement.scrollTop)),5)});
await p.mouse.move(r.x+520,r.y+320);await p.mouse.down();
for(let i=1;i<=24;i++){await p.mouse.move(r.x+520-i*9,r.y+320-i*5);await p.waitForTimeout(40)}
for(let i=1;i<=24;i++){await p.mouse.move(r.x+304+i*9,r.y+200+i*5);await p.waitForTimeout(40)}
await p.mouse.up();await p.waitForTimeout(300);
const seen=await p.evaluate(()=>{clearInterval(window.__hi);return [...window.__h]});
assert.equal(seen.length,1,'page height and scroll stay constant while marking: '+JSON.stringify(seen));
await box();
assert.match(await mark.innerText(),new RegExp('Mark\\s*'+n),'the rectangle marked every note inside');
assert.equal(await fh.isDisabled(),false,'mirrors work on the marked notes');
const undoDisabledBeforeFlip=await undo.isDisabled();
await fh.click();await p.waitForTimeout(250);await fv.click();await p.waitForTimeout(250);
assert.equal(await undo.isDisabled(),false,'mirroring in place is an undo step');
assert.match(await mark.innerText(),new RegExp('Mark\\s*'+n),'marking survives the mirror');
// Copy acts on the marked notes without a second rectangle
await copy.click();await p.waitForTimeout(250);
assert.match(await paste.innerText(),new RegExp('Paste\\s*'+n),'Copy loaded the marked notes');
await p.mouse.click(r.x+800,r.y+520,{button:'right'});await p.waitForTimeout(200); // empties the stamp, back to Copy
await copy.click();await p.waitForTimeout(100);
// mark again and Erase them without a second rectangle
await mark.click();await box();assert.match(await mark.innerText(),new RegExp('Mark\\s*'+n));
await erase.click();await p.waitForTimeout(300);
await copy.click();await box();assert.equal(await paste.isDisabled(),true,'Erase on the marking removed the notes');
await p.mouse.click(r.x+400,r.y+250,{button:'right'});await p.waitForTimeout(200);
assert.deepEqual(errors,[]);console.log('PASS melodic_erase, erased and restored',n,'notes; undo was disabled before:',undoBefore);await b.close()})().catch(e=>{console.error(e);process.exit(1)});
