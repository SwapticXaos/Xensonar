'use strict';
// FX-CHAIN-VIS-01 (real app): the Wave Editor's offline effect chain stays VISIBLE and REACHABLE however many effects are chained – it never grows
// underneath the floating Scratchpad. Ten effects in a row at several window widths: every chain item, the add-effect row and "Bypass Chain" must
// not overlap the Scratchpad, lie inside the window horizontally, and be the topmost element at their centre (clickable).
// Usage: node tests/e2e/wave_chain_visible.cjs dist/XenSonar_PROBE.html [widths=1500,1200,1000,880]
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {meterMusic,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),widths=(process.argv[3]||'1500,1200,1000,880').split(',').map(Number),file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'xen-chain-')),'m.wav');
fs.writeFileSync(file,wav(meterMusic({bpm:120,S:4,dur:8}),SR));
const TYPES=['tuningResonator','materialResonator','wavefolder','psyLabFx','spiralFx','masterStripFx','delay','reverb','chorus','distortion'];
(async()=>{
 const b=await chromium.launch();const out=[];
 for(const w of widths){
  const p=await(await b.newContext({viewport:{width:w,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click().catch(()=>{});await p.waitForTimeout(2500);
  await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);await p.getByText('Import Audio').first().click();await p.waitForTimeout(2000);
  await p.locator('input[type=file][accept^="audio/"]').first().setInputFiles(file);const wb=p.getByRole('button',{name:'Wave Editor'}).first();await wb.waitFor({timeout:60000});await p.waitForTimeout(1500);await wb.click();await p.waitForTimeout(2500);
  for(const t of TYPES){await p.selectOption('select[aria-label="Add effect"]',t);await p.getByRole('button',{name:'+ Effect'}).click();await p.waitForTimeout(200)}
  await p.waitForTimeout(600);
  const r=await p.evaluate(()=>{const rect=e=>{const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom,w:b.width,h:b.height}};
   const scratch=document.querySelector('[data-xwe-scratchpad]'),sr=scratch&&scratch.offsetParent?rect(scratch):null,probs=[];
   const items=[...document.querySelectorAll('.xwe-fx-controls>.xwe-chain .xwe-node')].map((e,i)=>({name:'chain item '+(i+1),e}));
   const tool=document.querySelector('.xwe-fx-controls>.xwe-toolbar');if(tool)for(const e of tool.children)items.push({name:'add row: '+(e.getAttribute('aria-label')||e.innerText||e.tagName).trim().slice(0,24),e});
   for(const {name,e} of items){const q=rect(e);if(q.w<2||q.h<2){probs.push(name+' has no size');continue}
    if(sr&&q.l<sr.r-1&&q.r>sr.l+1&&q.t<sr.b-1&&q.b>sr.t+1)probs.push(name+' overlaps the Scratchpad');
    if(q.l<0||q.r>innerWidth+1)probs.push(name+' outside the window ('+Math.round(q.l)+'–'+Math.round(q.r)+')');
    const top=document.elementFromPoint(q.l+q.w/2,q.t+q.h/2);if(!(top&&(e===top||e.contains(top)||top.contains(e))))probs.push(name+' is covered by '+(top?top.tagName+'.'+String(top.className).slice(0,30):'nothing'))}
   return {n:items.length,chain:document.querySelectorAll('.xwe-fx-controls>.xwe-chain .xwe-node').length,scratch:sr&&{l:Math.round(sr.l),w:Math.round(sr.w)},probs}});
  assert.equal(r.chain,TYPES.length,'all '+TYPES.length+' effects are in the chain at '+w+' px: '+JSON.stringify(r));
  assert.deepEqual(r.probs,[],'chain visible and reachable at '+w+' px: '+r.probs.slice(0,4).join(' | '));
  assert.deepEqual(errors,[]);out.push(w+' px: '+r.chain+' effects + '+(r.n-r.chain)+' controls clear of the Scratchpad (it starts at x='+(r.scratch?r.scratch.l:'-')+')');await p.close();
 }
 console.log('PASS FX-CHAIN-VIS-01 · '+out.join(' · '));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
