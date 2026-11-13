'use strict';
// STEMS-03 (real app): "By instrument" stems split the Instruments / Space buses into Particles, Waves and Keyboard (the per-kind Loop-Rec gain nodes that already exist in the live
// path) + Drone + Rhythm + Other. Null test: the sum of all stems equals the pre-EQ sum of the four buses (a diagnostic tap). A kind node that appears while recording (the first
// particle) is wired when it is created. Usage: node tests/e2e/stems_instruments.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:900}})).newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const rec=p.locator('[data-xen-stems-rec]');await rec.scrollIntoViewIfNeeded();
  // ---- UI: the mode switch shows the instrument tracks and hides the EQ tap switch ----
  const mode=p.locator('[data-xen-stem-mode]');assert.equal(await mode.getAttribute('data-xen-stem-mode'),'roles');assert.equal(await p.locator('[data-xen-stem-tap]').count(),1);
  await mode.click();assert.equal(await mode.getAttribute('data-xen-stem-mode'),'instruments');assert.match(await mode.innerText(),/By instrument/);
  const ids=await p.locator('[data-xen-stem-role]').evaluateAll(l=>l.map(x=>x.getAttribute('data-xen-stem-role')));assert.deepEqual(ids,['particle','wave','keyboard','psylab','drone','rhythm','rest']);
  assert.equal(await p.locator('[data-xen-stem-tap]').count(),0,'the EQ tap switch belongs to the role mode');
  // ---- null test + routing: keyboard + wave starter + a particle-kind source that appears mid-recording ----
  await p.keyboard.down('KeyA');await p.waitForTimeout(500);
  await p.evaluate(()=>{window.__st={}});
  await p.evaluate(()=>{__XenStemRecorder.start({keep:true,extra:['presum']}).then(()=>{window.__st.ok=true}).catch(e=>{window.__st.err=String(e.message)})});
  await p.waitForFunction(()=>window.__st.ok||window.__st.err,null,{timeout:20000});assert.equal(await p.evaluate(()=>window.__st.err||null),null);
  await p.mouse.move(700,350);await p.mouse.down();await p.waitForTimeout(1200);await p.mouse.up();
  await E(`(()=>{const s=__XenLiveStemSource.get(),ctx=s.ctx;const input=__XenLoopRec.route(ctx,'particle',s.inputs.main);const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=330;g.gain.value=.2;o.connect(g);g.connect(input);o.start();window.__osc=o;o.stop(ctx.currentTime+1.2)})()`);
  await p.waitForTimeout(1800);await p.keyboard.up('KeyA');await p.waitForTimeout(200);
  const res=await E(`(async()=>{
    const r=await __XenStemRecorder.stop();if(!r)throw Error('no result: '+JSON.stringify(__XenStemRecorder.snapshot()));
    const metas=r.stems.map(s=>({id:s.id,peak:s.peak,frames:s.meta.frames,meta:s.meta}));
    const data={};for(const m of metas)data[m.id]=await __xenLongMasterPCM.readFrames(m.meta,0,m.frames);
    const n=data.presum.length;let maxDiff=0,maxSum=0;const ids=metas.map(m=>m.id).filter(x=>x!=='presum');
    for(let i=0;i<n;i++){let sum=0;for(const id of ids)sum+=data[id][i];const d=Math.abs(sum-data.presum[i]);if(d>maxDiff)maxDiff=d;const a=Math.abs(data.presum[i]);if(a>maxSum)maxSum=a}
    for(const m of metas)await __xenLongMasterPCM.remove(m.meta.id,m.meta.parts);
    return{ids,peaks:Object.fromEntries(metas.map(m=>[m.id,m.peak])),frames:[...new Set(metas.map(m=>m.frames))],maxDiff,maxSum};
  })()`);
  assert.deepEqual(res.ids,['particle','wave','keyboard','psylab','drone','rhythm','rest']);assert.equal(res.frames.length,1,'every stem has the same length: '+res.frames);
  assert(res.maxSum>.01,'the pre-EQ sum carries sound: '+res.maxSum);
  assert(res.maxDiff<2e-6,'NULL TEST: Σ(instrument stems incl. Other) = pre-EQ sum of the four buses, max difference '+res.maxDiff+' (peak '+res.maxSum+')');
  assert(res.peaks.wave>.001,'the Wave sound stem carries the played key and click: '+JSON.stringify(res.peaks));
  assert(res.peaks.particle>.05,'a particle-kind source created while recording is wired into the Particles stem: '+JSON.stringify(res.peaks));
  // ---- a switched-off instrument stays inside "Other" (the sum is unchanged) ----
  await p.locator('[data-xen-stem-role="wave"]').click();assert.equal(await p.locator('[data-xen-stem-role="wave"]').getAttribute('aria-pressed'),'false');
  await p.keyboard.down('KeyA');await p.waitForTimeout(400);
  const res2=await E(`(async()=>{
    await __XenStemRecorder.start({keep:true,extra:['presum']});await new Promise(r=>setTimeout(r,2000));
    const r=await __XenStemRecorder.stop();const metas=r.stems.map(s=>({id:s.id,peak:s.peak,frames:s.meta.frames,meta:s.meta}));const data={};for(const m of metas)data[m.id]=await __xenLongMasterPCM.readFrames(m.meta,0,m.frames);
    let maxDiff=0;const ids=metas.map(m=>m.id).filter(x=>x!=='presum');for(let i=0;i<data.presum.length;i++){let sum=0;for(const id of ids)sum+=data[id][i];maxDiff=Math.max(maxDiff,Math.abs(sum-data.presum[i]))}
    for(const m of metas)await __xenLongMasterPCM.remove(m.meta.id,m.meta.parts);__XenStemRecorder.reset();
    return{ids,peaks:Object.fromEntries(metas.map(m=>[m.id,m.peak])),maxDiff};
  })()`);
  await p.keyboard.up('KeyA');
  assert(!res2.ids.includes('wave'),'no Wave track when switched off: '+res2.ids);assert(res2.maxDiff<2e-6,'sum unchanged without the Wave track: '+res2.maxDiff);
  assert(res2.peaks.rest>.2,'the Wave sound is part of "Other" when it has no track of its own: '+JSON.stringify(res2.peaks));
  // ---- STEMS-04: the track layout follows the synths of the Wave Starter and the Keyboard ----
  const note=()=>p.locator('[data-xen-stems-synths]').innerText();
  await p.locator('[data-xen-stem-role="wave"]').click();
  assert.match(await note(),/both use Entrophon: one track/,'default: both on Entrophon, one track: '+await note());
  // Psy Lab on the Keyboard, Entrophon on the Wave Starter: two synths, two tracks; the Psy Lab lane output is tapped exactly
  await E("__NodalBallGrid.update({keyboardHoldSoundPreset:'psylab:factory:Liquid Bell'})");await p.waitForTimeout(1500);
  assert.match(await note(),/Wave Starter: Entrophon · Keyboard: Psy Lab: separate tracks/,await note());
  await p.keyboard.down('KeyA');await p.waitForTimeout(600);
  const res3=await E(`(async()=>{
    await __XenStemRecorder.start({keep:true,extra:['presum']});await new Promise(r=>setTimeout(r,2200));
    const r=await __XenStemRecorder.stop();const metas=r.stems.map(s=>({id:s.id,peak:s.peak,frames:s.meta.frames,meta:s.meta}));const data={};for(const m of metas)data[m.id]=await __xenLongMasterPCM.readFrames(m.meta,0,m.frames);
    let maxDiff=0;const ids=metas.map(m=>m.id).filter(x=>x!=='presum');for(let i=0;i<data.presum.length;i++){let sum=0;for(const id of ids)sum+=data[id][i];maxDiff=Math.max(maxDiff,Math.abs(sum-data.presum[i]))}
    for(const m of metas)await __xenLongMasterPCM.remove(m.meta.id,m.meta.parts);__XenStemRecorder.reset();
    return{ids,peaks:Object.fromEntries(metas.map(m=>[m.id,m.peak])),maxDiff};
  })()`);
  await p.keyboard.up('KeyA');
  assert(res3.peaks.psylab>.002,'the Psy Lab keyboard note has its own track: '+JSON.stringify(res3.peaks));
  assert(res3.peaks.wave<.002,'the Entrophon track stays silent while only the Psy Lab keyboard plays: '+JSON.stringify(res3.peaks));
  assert(res3.maxDiff<2e-6,'NULL TEST with Psy Lab: Σ stems = pre-EQ sum, max difference '+res3.maxDiff);
  // both on Psy Lab: one synth, one track (the two lane outputs share the Psy Lab track)
  await E("__NodalBallGrid.update({waveStarterHoldSoundPreset:'psylab:factory:Liquid Bell'})");await p.waitForTimeout(1200);
  assert.match(await note(),/both use Psy Lab: one track/,await note());
  // same classic family on both: the keyboard lane joins the wave track (checked on the wiring: no link of a keyboard-kind node goes to its own track)
  const merged=await E(`(async()=>{const real=__XenLiveStemSource.get;const keep=globalThis.__XenLiveStemSource;
    globalThis.__XenLiveStemSource={get:()=>({...real.call(keep),sounds:{waveStarter:'bowed-glass',keyboard:'sample:piano'}})};
    try{await __XenStemRecorder.start({keep:true});const s=__XenStemRecorder.__session();const wi=s.taps.findIndex(t=>t.id==='wave'),ki=s.taps.findIndex(t=>t.id==='keyboard');
      const kinds=__XenLoopRec.kindTaps(s.ctx).filter(r=>r.kind==='keyboard').map(r=>r.node);const links=s.connected.filter(c=>kinds.includes(c.from)&&c.to===s.node).map(c=>c.input);
      const r=await __XenStemRecorder.stop().catch(()=>null);if(r)for(const x of r.stems)await __xenLongMasterPCM.remove(x.meta.id,x.meta.parts);__XenStemRecorder.reset();
      return{wi,ki,links}}finally{globalThis.__XenLiveStemSource=keep}})()`);
  assert(merged.links.length>0&&merged.links.every(i=>i===merged.wi),'classic sounds on both: the keyboard lane feeds the wave track: '+JSON.stringify(merged));
  assert.equal(await E('__xenLongMasterPCM.purgeStems(0)'),0,'no archive leftovers');
  assert.deepEqual(errors,[]);console.log('PASS STEMS-03/04 stems by instrument and synth (null test max diff '+res.maxDiff+', Psy Lab run '+JSON.stringify(res3.peaks)+', diff '+res3.maxDiff+')');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
