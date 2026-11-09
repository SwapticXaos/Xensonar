'use strict';
// BASS-DRAG-01 (real app): dragging a bass block in the Bass Workshop must not hammer the live audio
// path. UI follows every move; the clip player is refreshed at most ~every 150 ms; the draft is
// persisted at most every 400 ms; the final position is shown and persisted.
// Usage: node tests/e2e/bass_drag_livepath.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const c=window.__bm={kce:0,saves:0,stops:0};addEventListener('xensonar:bass-clip-library-updated',()=>c.kce++);
    const si=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(/rhythm-scratchpad/.test(k))c.saves++;return si.call(this,k,v)};
    const co=BaseAudioContext.prototype.createOscillator;BaseAudioContext.prototype.createOscillator=function(){const o=co.call(this),st=o.stop.bind(o);o.stop=(...a)=>{c.stops++;return st(...a)};return o}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1200);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.includes('RhythmForg'));b.click()});await p.waitForTimeout(1500);
  const blk=p.locator('[data-bass-event-block]').first();assert.ok(await blk.count(),'bass workshop block visible');const bb=await blk.boundingBox();
  await p.evaluate(()=>{window.__lefts=[];new MutationObserver(l=>{for(const r of l)if(r.target.matches?.('[data-bass-event-block]'))window.__lefts.push(r.target.style.left)}).observe(document.querySelector('[data-bass-body-canvas]'),{subtree:true,attributes:true,attributeFilter:['style']})});
  const a=await p.evaluate(()=>({...__bm}));const t0=Date.now();
  await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();
  for(let i=1;i<=120;i++){await p.mouse.move(bb.x+bb.width/2+Math.min(i,60)*4,bb.y+bb.height/2);await p.waitForTimeout(16)}
  const sec=(Date.now()-t0)/1000,z=await p.evaluate(()=>({...__bm})),shown=await p.evaluate(()=>new Set(window.__lefts).size);
  await p.mouse.up();const finalLeft=await blk.evaluate(e=>e.style.left);await p.waitForTimeout(700);
  const rate=k=>(z[k]-a[k])/sec;
  assert(rate('kce')<=9,`clip player refreshes ${rate('kce').toFixed(1)}/s (max 9/s while dragging)`);
  assert(rate('saves')<=4,`draft writes ${rate('saves').toFixed(1)}/s (max 4/s while dragging)`);
  assert(rate('stops')<=35,`oscillators cancelled ${rate('stops').toFixed(1)}/s (max 35/s while dragging)`);
  assert(shown>=15,`block must follow the pointer (${shown} distinct positions shown)`);
  const draft=await p.evaluate(()=>JSON.parse(localStorage.getItem('xensonar:main:rhythm-scratchpad:v1')||'null'));
  assert.ok(draft?.bass?.clip?.events?.length,'final draft persisted');
  assert.deepEqual(errors,[],'no page errors');
  console.log(`PASS bass drag: refresh ${rate('kce').toFixed(1)}/s, draft writes ${rate('saves').toFixed(1)}/s, osc cancels ${rate('stops').toFixed(1)}/s, ${shown} positions shown, final ${finalLeft}`);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
