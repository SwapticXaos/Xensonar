'use strict';
// STEMS-01 (real app): record the Live Room as stems. (1) Null test: the four role stems add up EXACTLY to the premaster sum (diagnostic 5th tap), all stems have the same length,
// the master archive list stays clean. (2) The real flow: press "Record stems → Multitrack", play, stop → audible stems arrive in the Multitrack as new tracks with equal clip
// lengths, silent stems are not sent, the stem archives are deleted. Usage: node tests/e2e/stems_record.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  // not running: no worklet, nothing connected, clear refusal before Power
  const refused=await p.evaluate(async()=>{try{await __XenStemRecorder.start();return'started'}catch(e){return String(e.message)}});assert.match(refused,/Power|Live Room audio/,'refused before the audio engine runs: '+refused);
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  // ---- (1) null test ----
  await p.evaluate(()=>{window.__stemTest={}});
  await p.keyboard.down('KeyA');await p.waitForTimeout(500);
  await p.evaluate(()=>{__XenStemRecorder.start({keep:true,extra:['premaster']}).then(()=>{window.__stemTest.started=true}).catch(e=>{window.__stemTest.err=String(e.message)})});
  await p.waitForFunction(()=>window.__stemTest.started||window.__stemTest.err,null,{timeout:20000});assert.equal(await p.evaluate(()=>window.__stemTest.err||null),null);
  await p.keyboard.down('KeyD');await p.waitForTimeout(3500);await p.keyboard.up('KeyD');await p.keyboard.up('KeyA');await p.waitForTimeout(300);
  const res=await E(`(async()=>{
    const r=await __XenStemRecorder.stop();if(!r)throw Error('no result: '+JSON.stringify(__XenStemRecorder.snapshot()));
    const metas=r.stems.map(s=>({id:s.id,peak:s.peak,frames:s.meta.frames,meta:s.meta}));
    const data={};for(const m of metas)data[m.id]=await __xenLongMasterPCM.readFrames(m.meta,0,m.frames);
    const n=data.main.length;let maxDiff=0,maxPre=0;
    for(let i=0;i<n;i++){const sum=data.main[i]+data.drone[i]+data.rhythm[i]+data.space[i],d=Math.abs(sum-data.premaster[i]);if(d>maxDiff)maxDiff=d;const a=Math.abs(data.premaster[i]);if(a>maxPre)maxPre=a}
    const listed=(await __xenLongMasterPCM.list()).length;
    for(const m of metas)await __xenLongMasterPCM.remove(m.meta.id,m.meta.parts);
    return{seconds:r.seconds,metas:metas.map(m=>({id:m.id,peak:m.peak,frames:m.frames})),maxDiff,maxPre,listed};
  })()`);
  assert(res.seconds>3.3&&res.seconds<4.6,'about 4 s recorded: '+res.seconds);
  assert(new Set(res.metas.map(m=>m.frames)).size===1,'every stem has exactly the same length: '+JSON.stringify(res.metas));
  assert(res.maxPre>.001,'the premaster carries sound (peak '+res.maxPre+')');
  const mainPeak=res.metas.find(m=>m.id==='main').peak;assert(mainPeak>.001,'the Instruments stem carries the played note: '+mainPeak);
  assert(res.maxDiff<2e-6,'NULL TEST: Σ(four stems) = premaster, max difference '+res.maxDiff+' (peak '+res.maxPre+')');
  assert.equal(res.listed,0,'stem archives never appear in the master archive list');
  // ---- (2) the real flow through the UI ----
  const header=t=>p.evaluate(t=>{[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim())).click()},t);
  const btn=p.locator('[data-xen-stems-rec]');await btn.scrollIntoViewIfNeeded();assert.match(await btn.innerText(),/Record stems → Multitrack/);
  await btn.click();await p.waitForFunction(()=>__XenStemRecorder.snapshot().phase==='recording',null,{timeout:20000});
  await p.waitForTimeout(500);assert.match(await btn.innerText(),/■ Stop stems · 0:0\d \/ 5:00/);
  await p.keyboard.down('KeyG');await p.waitForTimeout(3000);await p.keyboard.up('KeyG');await p.waitForTimeout(300);
  await btn.click();
  await p.waitForFunction(()=>['done','error'].includes(__XenStemRecorder.snapshot().phase),null,{timeout:90000});
  const snap=await p.evaluate(()=>__XenStemRecorder.snapshot());assert.equal(snap.phase,'done','sent: '+snap.message);assert.match(snap.message,/stems \(0:0\d\) sent to the Multitrack as new tracks/);
  assert.match(snap.message,/silent, not sent/,'silent stems are reported and not sent: '+snap.message);
  // Room IV took the inbox: tracks with clips of equal length
  let proj=null;for(let k=0;k<120&&!proj;k++){proj=await p.evaluate(async()=>{try{const db=await __XenMultitrackInbox.db();return await new Promise(ok=>{const q=db.transaction('projects').objectStore('projects').get('current');q.onsuccess=()=>{const pr=q.result;if(!pr||!Array.isArray(pr.tracks))return ok(null);const clips=pr.tracks.flatMap(t=>t.clips||[]);ok(clips.length?JSON.stringify(clips.map(c=>({len:c.lenBeats??null,start:c.startBeat??c.start??0,mat:c.materialId,keys:Object.keys(c).join()}))):null)};q.onerror=()=>ok(null)})}catch{return null}});if(!proj)await p.waitForTimeout(500)}
const clips=JSON.parse(proj);assert(clips.length>=1&&clips.length<=4,'stems arrived as clips: '+proj);assert(new Set(clips.map(c=>c.start)).size===1,'all stems start together');
  if(clips.every(c=>c.len!==null))assert(new Set(clips.map(c=>Math.round(c.len*1000))).size===1,'equal clip lengths: '+proj);
  const leftovers=await E('__xenLongMasterPCM.purgeStems(0)');assert.equal(leftovers,0,'the stem archives were deleted after the hand-over');
  // ---- (3) Power off while recording stems: the recorder never hangs; it keeps what was captured ----
  await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>/LIVE ROOM/.test(b.innerText)&&b.offsetParent).click()});await p.waitForTimeout(2000);
  // leaving the Live Room switches the engine off: recording stems then is refused with a clear message (never a silent recording)
  assert.equal(await p.evaluate(()=>document.body.innerText.includes('OFFLINE - ENABLE')),true,'the Live Room is offline after the room change');
  await btn.scrollIntoViewIfNeeded();await btn.click();await p.waitForTimeout(800);
  const refusedOffline=await p.evaluate(()=>__XenStemRecorder.snapshot());assert.equal(refusedOffline.phase,'error');assert.match(refusedOffline.message,/Power|Live Room audio/,'refused while offline: '+refusedOffline.message);
  await p.getByRole('button',{name:/^(Power|Have you tried turning it off and on again\?)$/}).first().click();await p.waitForTimeout(2500);
  await btn.scrollIntoViewIfNeeded();await btn.click();await p.waitForFunction(()=>__XenStemRecorder.snapshot().phase==='recording',null,{timeout:20000});
  await p.keyboard.down('KeyG');await p.waitForTimeout(2500);await p.keyboard.up('KeyG');
  await p.getByRole('button',{name:/^(Power|Have you tried turning it off and on again\?)$/}).first().click();
  await p.waitForFunction(()=>!['recording','starting','finalizing','sending'].includes(__XenStemRecorder.snapshot().phase),null,{timeout:60000});
  const after=await p.evaluate(()=>__XenStemRecorder.snapshot());assert(['done','error','idle'].includes(after.phase),'the recorder left the recording state after Power off: '+JSON.stringify(after));
  assert.equal(await E('__xenLongMasterPCM.purgeStems(0)'),after.phase==='done'?0:await E('0'),'no stem archive is left behind after a completed hand-over');
  assert.deepEqual(errors,[]);console.log('PASS STEMS-01 null test (Σ stems = premaster, max diff '+res.maxDiff.toExponential(2)+') and Record stems → Multitrack',JSON.stringify(res.metas));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
