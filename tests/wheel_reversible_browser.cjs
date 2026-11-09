/* Real-browser acceptance: native owners, no replacement stores/audio engines.
   Instrumentation is injected into a disposable test HTML, never the release. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'dist/Wheel_Acceptance_Temporary.html');
const hook=`window.__wheelTest=()=>({wheel:__XenWheel,quick:__XenQuick,sessions:__XenMetaSessions,main:__XenMainRoomSessionBridge,seed:()=>__XenStarterMaterial.ensure('material'),
 ent:__XenEntrophonLibrary,nodalLib:__XenNodalLibrary,ml:()=>j7(),model:__XenNodalModel,
 scratch(){const materials=__XenQuick.getItems().filter(e=>e.kind==='material');if(materials[1])__XenMaterialLayers.toggle(materials[1].id,materials.map(e=>e.id),materials[0]?.id);__XenMaterialPrimarySwitch.setMuted(true);const params=__XenMainRoomSessionBridge.capture().nParamsUI;__f351CommitBass(Gle({pattern:params.bassPattern,rootHz:49,swing:.06,bassGrit:.18}),params,p=>__XenMainRoomSessionBridge.patch(p));const grid=__mlGridFromSelection(__mlSharedDrumMachine.snapshot);grid.laneSteps.kick[0]=.61;__mlSharedDrumMachine.setLiveEdit({grid,kit:"standard",laneKitOverrides:{},laneSettings:{}})},renderEnt:renderEntrophonSound,renderML:z$,validateML:$n,
 align:{bass:__XenBassPitch,rootFollow:__XenRootFollowPitch,attack:__XenAttackLanes,mix:__XenMaterialVoiceMix,pan:__XenPan,eq:__XenEQ},
 read:()=>({room:__XenMainRoomSessionBridge.capture(),items:__XenQuick.getItems(),selected:__XenQuick.snapshot().selectedByKind,layers:__XenMaterialLayers.snapshot(),primary:__XenMaterialPrimarySwitch.snapshot(),mix:Object.fromEntries(__XenQuick.getItems().filter(e=>e.kind==='material').map(e=>{const {attApplied,...value}=__XenMaterialVoiceMix.get(e.id);return [e.id,value]})),bass:__XenBassPitch.snapshot(),root:__XenRootFollowPitch.snapshot(),attack:__XenAttackLanes.snapshot(),rhythm:{bass:__f351BassDraft,drum:__mlSharedDrumMachine.liveEdit,past:__mlSharedDrumMachine.historyPast,future:__mlSharedDrumMachine.historyFuture},saved:__XenMetaSessions.snapshot().saved})});`;
fs.writeFileSync(output,fs.readFileSync(path.join(root,'dist/XenSonar_Standalone.html'),'utf8').replace('function hse(){',hook+'function hse(){'));
(async()=>{let browser;const errors=[],report={};try{
 browser=await chromium.launch({headless:true,...(process.env.XEN_CHROMIUM?{executablePath:process.env.XEN_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1500,height:1000}});page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('file://'+output);await page.waitForFunction(()=>!!window.__wheelTest);await page.waitForTimeout(600);
 const read=()=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__wheelTest().read())));
 const act=async name=>{await page.evaluate(async name=>{await window.__wheelTest().wheel[name]()},name);const s=await page.evaluate(()=>window.__wheelTest().wheel.snapshot());assert.equal(s.busy,false);assert(!s.message||!/unavailable|failed|Invalid|not defined|Cannot|could not/i.test(s.message),s.message);return s};
 // Actual seed owner creates its normal durable material records before the experiment.
 await page.evaluate(async()=>{await window.__wheelTest().seed()});await page.waitForTimeout(250);
 await page.evaluate(()=>{const t=window.__wheelTest();for(const kind of ['material','rootFollow']){const e=t.quick.adapters.get(kind)?.entries[0];if(e)t.quick.activate({kind,id:e.id,name:e.name})}});await page.waitForTimeout(150);
 await page.evaluate(()=>{const t=window.__wheelTest();t.main.patch({materialLoopActive:false,rootFollowLoopActive:false,drumVolume:.37,bassVolume:.28});t.align.bass.set(17);t.align.rootFollow.set(-23);t.align.attack.set('bass',.18);t.align.pan.set('bass',.27);for(const entry of t.quick.getItems().filter(e=>e.kind!=='grid'))t.align.eq.set(entry.kind+':'+entry.id,{a:[-.2,.4,-.1],b:[.3,-.1,.2],morph:.37});for(const entry of t.quick.getItems().filter(e=>e.kind==='material')){t.align.mix.set(entry.id,'volume',.72);t.align.mix.set(entry.id,'pan',-.17);t.align.mix.set(entry.id,'pitch',13);t.align.mix.set(entry.id,'att',.08)}});await page.waitForTimeout(100);
 await page.evaluate(()=>window.__wheelTest().scratch());await page.waitForTimeout(150);
 const before=await read();assert(before.items.some(e=>e.kind==='material'));assert(before.items.some(e=>e.kind==='rootFollow'));
 const originalRows=before.saved,scratchRaw=await page.evaluate(()=>localStorage.getItem('xensonar:main:rhythm-scratchpad:v1'));
 // Spin B -> Preview B -> Spin C -> Preview C -> explicit native Save -> Return A.
 const b=await act('roll');assert.equal(b.candidate.length,5);assert.equal(new Set(b.candidate.map(e=>e.kind)).size,5);
 const dry=await read();assert.deepEqual(dry.room,before.room);assert.deepEqual(dry.saved,originalRows);
 await act('preview');assert.equal(await page.evaluate(()=>localStorage.getItem('xensonar:main:rhythm-scratchpad:v1')),scratchRaw,'scratch autosave is held');const c=await act('roll');assert.equal(c.candidate.length,5);await act('preview');
 await page.evaluate(()=>{const t=window.__wheelTest();t.align.pan.set('bass',-.5);t.align.bass.set(111);t.align.rootFollow.set(222);t.align.attack.set('bass',-.7);t.main.patch({drumVolume:.14});if(!t.sessions.saveAsNew('Wheel session result'))throw Error(t.sessions.snapshot().error)});
 const savedId=await page.evaluate(()=>window.__wheelTest().sessions.snapshot().saved.find(e=>e.name==='Wheel session result').id);
 await act('back');await page.waitForTimeout(150);const after=await read();
 for(const key of Object.keys(before).filter(k=>k!=='saved'))assert.deepEqual(after[key],before[key],'Return '+key);
 for(const row of originalRows)assert.deepEqual(after.saved.find(e=>e.id===row.id),row,'original saved row');assert(after.saved.some(e=>e.id===savedId));report.session='5 columns; repeated spins; room/EQ/pan/pitch/attack/selection/mix/layers and unsaved Drum/Bass edits restored; autosave held; explicit save retained';
 // Native Engage bypasses Wheel.preview: Return must still restore A.
 await act('roll');
 await page.evaluate(()=>{const t=window.__wheelTest();if(!t.sessions.use())throw Error(t.sessions.snapshot().error)});await act('back');await page.waitForTimeout(100);
 const direct=await read();for(const key of ['room','items','selected'])assert.deepEqual(direct[key],before[key],'native Engage Return '+key);report.nativeEngage='PASS';
 await act('roll');await page.evaluate(async()=>{const t=window.__wheelTest(),adapter=t.quick.adapters.get('bass'),choose=adapter.choose;let once=true;adapter.choose=id=>{if(once){once=false;throw Error('Injected activation failure')}return choose(id)};try{await t.wheel.preview()}finally{adapter.choose=choose}});assert.match(await page.evaluate(()=>window.__wheelTest().wheel.snapshot().message),/Injected activation failure/);await act('back');const failed=await read();for(const key of ['room','items','selected','mix'])assert.deepEqual(failed[key],before[key],'failed activation '+key);report.rollback='Injected partial activation failure restored A';
 // Each isolated domain produces real, finite audible PCM, saves through its owner,
 // and leaves the Main Room and working composer untouched.
 const savedNames=[];
 for(const mode of ['Entrophon','Nodal','Melodic Loop']){
  await page.evaluate(mode=>window.__wheelTest().wheel.setMode(mode),mode);await act('roll');
  const pcm=await page.evaluate(async mode=>{const t=window.__wheelTest(),c=t.wheel.snapshot().candidate;
   if(mode==='Nodal'){const p=t.model.compile(c);return {silent:p.silent,cost:p.cost,nodes:c.nodes.length}}
   let values;if(mode==='Entrophon'){const pcm=await t.renderEnt(c,{frequency:220,durationSec:.25},22050);values=pcm.left}
   else {const composer=t.validateML(c.composer),buffer=await t.renderML({composer,bpm:108,bars:composer.bars,trackIds:composer.activeTrackIds},{sampleRate:22050,excludeDrums:true});values=buffer.getChannelData(0)}
   let peak=0;for(const x of values){if(!Number.isFinite(x))throw Error('Nonfinite PCM');peak=Math.max(peak,Math.abs(x))}return {peak,frames:values.length};
  },mode);if(mode==='Nodal'){assert(!pcm.silent);assert(pcm.cost<=8)}else assert(pcm.peak>1e-5,JSON.stringify(pcm));
  await act('preview');await page.getByRole('textbox',{name:'Discovery name'}).fill('Wheel acceptance '+mode);await act('save');await act('back');savedNames.push('Wheel acceptance '+mode);report[mode]=pcm;
  const current=await read();for(const key of ['room','items','selected'])assert.deepEqual(current[key],before[key],'isolated '+mode+' '+key);
 }
 // A refresh reloads the same native archives. No wheel persistence is present.
 await page.reload();await page.waitForTimeout(800);
 const reload=await page.evaluate(()=>{const t=window.__wheelTest();return{ent:t.ent.list().map(e=>e.instrument.name),nodal:t.nodalLib.list().map(e=>e.instrument.name),ml:t.ml().map(e=>e.name),sessions:t.sessions.snapshot().saved.map(e=>e.name),wheel:t.wheel.snapshot().candidate}});
 assert(reload.ent.includes(savedNames[0]));assert(reload.nodal.includes(savedNames[1]));assert(reload.ml.includes(savedNames[2]));assert(reload.sessions.includes('Wheel session result'));assert.equal(reload.wheel,null);
 await act('roll');await act('keep');await page.waitForTimeout(120);const kept=await read();await act('roll');await act('preview');await act('back');await page.waitForTimeout(120);const returnedToKept=await read();for(const key of ['room','items','selected','rhythm'])assert.deepEqual(returnedToKept[key],kept[key],'Keep creates new baseline '+key);report.keep='Next experiment returns to the accepted baseline';
 assert.equal(errors.length,0,errors.join('\n'));report.restart='All four native saves survive reload';report.errors=errors;
 fs.writeFileSync(path.join(root,'tests/WHEEL_BROWSER_RESULT.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser?.close();fs.rmSync(output,{force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
