'use strict';
// STEMS-02 (real app): the stems to record can be chosen (chips next to the record button), and the tap point can be moved "Before EQ" (raw role signal, independent of the role level).
// Usage: node tests/e2e/stems_setup.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:900}})).newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const rec=p.locator('[data-xen-stems-rec]');await rec.scrollIntoViewIfNeeded();
  const chip=id=>p.locator(`[data-xen-stem-role="${id}"]`),tap=p.locator('[data-xen-stem-tap]');
  // ---- chips: all four on by default; toggling is reflected in the shared state ----
  for(const id of['main','drone','rhythm','space'])assert.equal(await chip(id).getAttribute('aria-pressed'),'true',id+' is recorded by default');
  assert.equal(await tap.getAttribute('data-xen-stem-tap'),'after-eq');
  await chip('rhythm').click();await chip('space').click();
  {const st=await p.evaluate(()=>__XenStemRecorder.snapshot().setup);assert.deepEqual([st.roles,st.tap],[['main','drone'],'after-eq'])}
  assert.equal(await chip('rhythm').getAttribute('aria-pressed'),'false');
  await tap.click();assert.equal(await tap.getAttribute('data-xen-stem-tap'),'before-eq');assert.match(await tap.innerText(),/Before EQ/);
  // ---- a recording with the chosen setup contains exactly the chosen stems, tapped before the role level ----
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const run=(ms,g)=>E(`(async()=>{
    const src=__XenLiveStemSource.get();const old=src.roleGains.main.gain.value;
    src.roleGains.main.gain.cancelScheduledValues(0);src.roleGains.main.gain.value=${g};
    await __XenStemRecorder.start({keep:true});await new Promise(r=>setTimeout(r,${ms}));
    const r=await __XenStemRecorder.stop();src.roleGains.main.gain.value=old;
    const out={names:r.stems.map(s=>s.name),ids:r.stems.map(s=>s.id),peaks:r.stems.map(s=>s.peak)};
    for(const s of r.stems)await __xenLongMasterPCM.remove(s.meta.id,s.meta.parts);__XenStemRecorder.reset();return out;
  })()`);
  await p.keyboard.down('KeyA');await p.waitForTimeout(400);
  const pre=await run(2500,0);
  assert.deepEqual(pre.ids,['main','drone'],'only the chosen stems are recorded');assert.match(pre.names[0],/Instruments \(pre-EQ\)/,'the track name tells the tap point: '+pre.names);
  assert(pre.peaks[0]>.001,'Before EQ: the Instruments stem still carries the note while the role level is 0: '+pre.peaks[0]);
  await tap.click();assert.equal(await tap.getAttribute('data-xen-stem-tap'),'after-eq');
  const post=await run(2500,0);
  assert.match(post.names[0],/^Instruments$/);assert(post.peaks[0]<1e-5,'After EQ: the same muted role level silences the stem: '+post.peaks[0]);
  await p.keyboard.up('KeyA');
  // ---- nothing selected is refused with a message; the setup cannot be changed while recording ----
  await chip('main').click();await chip('drone').click();
  const none=await p.evaluate(async()=>{try{await __XenStemRecorder.start({keep:true});return'started'}catch(e){return String(e.message)}});assert.match(none,/at least one stem/,none);
  await chip('main').click();await p.waitForTimeout(100);
  await p.evaluate(()=>{__XenStemRecorder.start({keep:true}).catch(()=>{})});await p.waitForFunction(()=>__XenStemRecorder.snapshot().phase==='recording',null,{timeout:20000});
  assert.equal(await chip('drone').isDisabled(),true,'chips are locked while recording');
  await p.evaluate(()=>__XenStemRecorder.configure({roles:['space'],tap:'before-eq'}));
  assert.deepEqual(await p.evaluate(()=>__XenStemRecorder.snapshot().setup.roles),['main'],'configure() is ignored while recording');
  await p.waitForTimeout(1500);const fin=await E(`(async()=>{const r=await __XenStemRecorder.stop();if(!r)throw Error(JSON.stringify(__XenStemRecorder.snapshot()));for(const s of r.stems)await __xenLongMasterPCM.remove(s.meta.id,s.meta.parts);__XenStemRecorder.reset();return r.stems.map(s=>s.id)})()`);assert.deepEqual(fin,['main']);
  assert.equal(await E('__xenLongMasterPCM.purgeStems(0)'),0,'no archive leftovers');
  assert.deepEqual(errors,[]);console.log('PASS STEMS-02 stem selection and Before-EQ tap');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
