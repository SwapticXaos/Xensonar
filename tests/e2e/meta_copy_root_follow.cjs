'use strict';
// End-to-end (real app in Chromium): Meta board drag rules.
//  1. A red (invalid) lane never shows the "+ drop here" prompt; a valid lane does.
//  2. Material Track -> Root Follow Loop COPIES the loop in the length set in the loop editor
//     (6 original bars, 2 trimmed at the end -> 4 bars); the Material entry stays.
//  3. Same for a Loop-Rec Session Take (loop-rec-* ids used to be blocked).
// Usage: node tests/e2e/meta_copy_root_follow.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const ready=p=>p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:30000});
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await ready(p);await p.waitForTimeout(1500);
  // seed two 6-bar loops (120 bpm, 4/4 = 12 s): one ordinary Material, one Loop-Rec session take
  const inb=(code)=>p.evaluate(c=>__xenProbe.draw.evalInBundle(c),code);
  const ids=await inb('('+(async()=>{
    const rate=8000,secs=12,n=rate*secs,pcm=new Int16Array(n);for(let i=0;i<n;i++)pcm[i]=Math.round(Math.sin(i/20)*8000);
    const wav=()=>{const buf=new ArrayBuffer(44+n*2),v=new DataView(buf),w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
      w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
      new Int16Array(buf,44).set(pcm);return new Blob([buf],{type:'audio/wav'})};
    const mk=async(name,stable,extra)=>{const e=await __registerDurableMaterial(Yd({name,stableId:stable,role:'loop',bpm:120,bars:6,beatsPerBar:4,durationSec:secs,loopStartSec:0,loopEndSec:secs,intendedLoopDurationSec:secs,renderMode:'e2e',sourceVersion:'e2e'},wav()),{selectOnRegister:false,...extra});return e.id};
    return {mat:await mk('E2E Material','e2e-material'),take:await mk('E2E Take','loop-rec-e2e-take',{sessionTake:true,loopRecIntent:{}})};
  }).toString()+')()');
  const added=await p.evaluate(ids=>{const S=__xenProbe.meta;return [S.addItem({kind:'material',id:ids.mat,name:'E2E Material'}),S.addItem({kind:'material',id:ids.take,name:'E2E Take'})]},ids);
  assert.deepEqual(added,[true,true],'both loops are in the Session draft');
  await inb(`__XenRackLiveBarEdits.setIntent(${JSON.stringify(ids.mat)},0,-2);__XenRackLiveBarEdits.setIntent(${JSON.stringify(ids.take)},-1,0)`);
  await p.evaluate(()=>window.dispatchEvent(new Event('xensonar:open-meta-menu')));
  await p.waitForSelector('.xen-meta-board',{timeout:10000});
  const centre=async sel=>{const r=await p.locator(sel).first().boundingBox();assert.ok(r,'visible: '+sel);return {x:r.x+r.width/2,y:r.y+r.height/2}};
  const after=lane=>p.evaluate(k=>{const el=document.querySelector('.xen-meta-lane[data-xen-meta-column="'+k+'"] .xen-meta-lane-items');return getComputedStyle(el,'::after').content},lane);
  const state=()=>inb(`({items:__XenMetaSessions.snapshot().items.map(i=>({kind:i.kind,id:i.id,name:i.name})),bank:Yp().memberIds.slice(),
    lib:bs().entries.map(e=>({id:e.id,bars:e.bars,rfl:!!e.rootFollowPreferred,take:!!e.sessionTake,size:e.blob?.size}))})`);
  const drag=async(fromSel,toSel,hold)=>{const a=await centre(fromSel),t=await centre(toSel);
    await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(a.x+10,a.y+10,{steps:4});await p.mouse.move(t.x,t.y,{steps:12});await p.waitForTimeout(150);
    const mid=await p.evaluate(()=>({lanes:[...document.querySelectorAll('.xen-meta-lane')].map(l=>({k:l.dataset.xenMetaColumn,cls:l.className})),ghost:document.querySelector('.xen-quick-pointer-ghost')?.textContent||''}));
    if(hold)await hold(mid);await p.mouse.up();await p.waitForTimeout(400);return mid};
  // --- 1. invalid hover: drum library row over the Root Follow lane -> red, no prompt
  const drumRow='.xen-meta-library-row[data-xen-quick-kind="drum"]';
  await p.locator('.xen-meta-tabs>button',{hasText:'Drums'}).first().click();await p.waitForTimeout(600);
  if(await p.locator(drumRow).count()){
    const mid=await drag(drumRow,'.xen-meta-lane[data-xen-meta-column="rootFollow"] .xen-meta-lane-items',async m=>{
      assert.ok(m.lanes.some(l=>/is-drop-invalid/.test(l.cls)),'red lane while hovering a wrong lane');
      for(const l of ['grid','material','rootFollow','drum','bass'])assert.equal(await after(l),'none','no "drop here" on '+l+' while red');
    });
    assert.ok(!/LOSLASSEN/.test(mid.ghost),'ghost does not invite a drop: '+mid.ghost);
  }else console.log('note: no drum library row visible; invalid-hover check skipped');
  // --- 2. valid hover keeps the prompt
  const matTile=`.xen-meta-tile[data-xen-quick-kind="material"][data-xen-quick-id="${ids.mat}"]`;
  await drag(matTile,'.xen-meta-lane[data-xen-meta-column="material"] .xen-meta-lane-items',async m=>{
    assert.equal(await after('material'),'"+ drop here"','valid lane keeps the prompt');
    assert.ok(!m.lanes.some(l=>/is-drop-invalid/.test(l.cls)),'no red lane on a valid drop');
  });
  // --- 3. Material -> Root Follow = copy in the edited length, original stays
  const before=await state();const preRfl=new Set(before.items.filter(i=>i.kind==='rootFollow').map(i=>i.id));
  await drag(matTile,'.xen-meta-lane[data-xen-meta-column="rootFollow"] .xen-meta-lane-items',async m=>{
    assert.ok(!m.lanes.some(l=>/is-drop-invalid/.test(l.cls)),'Material -> Root Follow is a valid drop (copy)');
    assert.match(m.ghost,/KOPIE/,'ghost announces a copy');
  });
  const pre=[...preRfl];
  await p.waitForFunction(pre=>__xenProbe.meta.snapshot().items.filter(i=>i.kind==='rootFollow'&&!pre.includes(i.id)).length>=1,pre,{timeout:15000});
  let s=await state();
  assert.ok(s.items.some(i=>i.kind==='material'&&i.id===ids.mat),'Material entry stays in the Material Track');
  const rfl=s.items.find(i=>i.kind==='rootFollow'&&!preRfl.has(i.id));assert.ok(rfl&&rfl.id!==ids.mat,'new Root Follow entry with its own id');
  const copy=s.lib.find(e=>e.id===rfl.id);assert.equal(copy.bars,4,'copy has the edited length (6 - 2 = 4 bars)');assert.ok(copy.rfl&&!copy.take);
  assert.ok(s.bank.includes(rfl.id),'copy is a Root Follow bank member');
  assert.equal(s.lib.find(e=>e.id===ids.mat).bars,6,'original keeps 6 bars');
  assert.equal(s.lib.find(e=>e.id===ids.mat).size,before.lib.find(e=>e.id===ids.mat).size,'original audio untouched');
  // --- 4. Loop-Rec session take -> Root Follow = copy as well (front edit -1 -> 5 bars)
  const takeTile=`.xen-meta-tile[data-xen-quick-kind="material"][data-xen-quick-id="${ids.take}"]`;
  await drag(takeTile,'.xen-meta-lane[data-xen-meta-column="rootFollow"] .xen-meta-lane-items',async m=>{
    assert.ok(!m.lanes.some(l=>/is-drop-invalid/.test(l.cls)),'Loop-Rec take -> Root Follow is a valid drop (copy)');
  });
  await p.waitForFunction(n=>__xenProbe.meta.snapshot().items.filter(i=>i.kind==='rootFollow').length>=n,preRfl.size+2,{timeout:15000});
  s=await state();
  assert.ok(s.items.some(i=>i.kind==='material'&&i.id===ids.take),'Loop-Rec take stays in the Material Track');
  const rfl2=s.items.filter(i=>i.kind==='rootFollow').find(i=>i.id!==rfl.id&&!preRfl.has(i.id));
  assert.equal(s.lib.find(e=>e.id===rfl2.id).bars,5,'take copy has 5 bars');assert.ok(!s.lib.find(e=>e.id===rfl2.id).take,'copy is a durable loop, not a session take');
  assert.deepEqual(errors,[],'no page errors');
  console.log('PASS E2E meta copy: red lane has no drop prompt, Material/Loop-Rec -> Root Follow copies in edited length, originals stay');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
