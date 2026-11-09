'use strict';
/* Real-browser P1 regression. Build first. Uses a disposable instrumented copy
 * of the real file:// standalone, real localStorage/IDB, and native owners.
 * Run: node tests/song_performance_p1_browser.cjs [dist/XenSonar_Standalone.html]
 * XEN_CHROMIUM may identify an installed Chromium; otherwise Playwright's is used.
 * No product debug globals, replacement storage, route mocks, or setContent(). */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?
 path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const root=path.resolve(__dirname,'..');
const input=path.resolve(process.argv[2]||path.join(root,'dist/XenSonar_Standalone.html'));
const output=path.join(path.dirname(input),'Song_Performance_P1_Temporary.html');
const anchor='const __XenMetaSessions=__createXenMetaSessionStore(localStorage,__XenQuick);';
const hook=`
window.__songP1=()=>({session:__XenMetaSessions,quick:__XenQuick,
 bridge:__XenMainRoomSessionBridge,mix:__XenMaterialVoiceMix,pan:__XenPan,eq:__XenEQ,
 bassPitch:__XenBassPitch,rootPitch:__XenRootFollowPitch,attack:__XenAttackLanes,
 layers:__XenMaterialLayers,primary:__XenMaterialPrimarySwitch,
 seed:()=>__XenStarterMaterial.ensure('material'),materials:()=>bs().entries,
 capture:()=>__xenSongPerformanceCapture(__XenQuick.getItems())});
`;
const projected=x=>({entries:x.entries,materialPlacement:x.materialPlacement,mixer:x.mixer});
async function run(){
 const html=fs.readFileSync(input,'utf8');
 assert.equal(html.split(anchor).length-1,1,'unique session instrumentation anchor');
 fs.writeFileSync(output,html.replace(anchor,anchor+hook));
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'xen-song-p1-'));
 let context;
 const report={input,origin:'file:',storage:'native localStorage and IndexedDB',errors:[]};
 try{
  try{context=await chromium.launchPersistentContext(profile,{headless:true,
   ...(process.env.XEN_CHROMIUM?{executablePath:process.env.XEN_CHROMIUM}:{}),
   viewport:{width:1500,height:1100},args:['--no-sandbox','--disable-dev-shm-usage']});}
  catch(error){throw Error('Local Chromium unavailable. Install Playwright Chromium or set XEN_CHROMIUM. Browser validation did not run. '+error.message);}
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(String(error)));
  page.on('dialog',dialog=>dialog.accept());
  await page.addInitScript(()=>{
   // Observe native contexts and existing native analysers; do not add graph
   // nodes, replace rendering, resume audio, or relax browser autoplay policy.
   const contexts=[],analysers=[];window.__songP1Audio={contexts,analysers};
   const Native=window.AudioContext||window.webkitAudioContext;if(!Native)return;
   const create=Native.prototype.createAnalyser;
   Native.prototype.createAnalyser=function(...args){const node=create.apply(this,args);analysers.push(node);return node;};
   const Observed=new Proxy(Native,{construct(target,args,newTarget){const ctx=Reflect.construct(target,args,newTarget);contexts.push(ctx);return ctx;}});
   if(window.AudioContext)window.AudioContext=Observed;
   if(window.webkitAudioContext)window.webkitAudioContext=Observed;
  });
  const ready=async()=>{
   await page.waitForFunction(()=>window.__songP1&&window.__songP1().bridge.available()&&
    window.__songP1().quick.adapters.has('material')&&document.querySelector('.xen-lane-controls'),null,{timeout:90000});
  };
  // Wait for conditions, then another two React/browser frames, then recheck.
  // A momentary pre-effect value cannot satisfy the restore assertion.
  const restored=async expected=>{
   await page.waitForFunction(async expected=>{
    const read=()=>{const x=window.__songP1().capture();return JSON.stringify({entries:x.entries,materialPlacement:x.materialPlacement,mixer:x.mixer});};
    if(read()!==expected)return false;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return read()===expected;
   },JSON.stringify(expected),{timeout:30000});
  };
  const read=()=>page.evaluate(()=>window.__songP1().capture());
  const slider=async(locator,target)=>{
   await locator.waitFor({state:'visible'});await locator.scrollIntoViewIfNeeded();
   const bounds=await locator.evaluate(el=>({min:Number(el.min),max:Number(el.max)}));
   const box=await locator.boundingBox();assert(box&&box.width>12,'visible native slider geometry');
   const ratio=Math.max(0,Math.min(1,(target-bounds.min)/(bounds.max-bounds.min)));
   // Real pointer events exercise React's actual slider handler and owner setter.
   await page.mouse.click(box.x+5+ratio*(box.width-10),box.y+box.height/2);
   return Number(await locator.inputValue());
  };
  const materialRow=id=>page.locator(`[data-xen-lane-id="${id}"]`);
  const selectTab=async key=>{await page.locator('#xen-lane-tab-'+key).click();};
  const materialSliders=async(ids,sign)=>{
   await selectTab('material');
   for(let i=0;i<ids.length;i++){
    const lane=materialRow(ids[i]);await lane.waitFor({state:'visible'});
    await slider(lane.getByRole('slider',{name:/ Volume$/,exact:false}),.35+i*.12+(sign<0?.05:0));
    await slider(lane.getByRole('slider',{name:/ Pan$/,exact:false}),sign*(.2+i*.18));
    await slider(lane.getByRole('slider',{name:/ Pitch$/,exact:false}),sign*(20+i*17));
    await slider(lane.getByRole('slider',{name:/ Nudge$/,exact:false}),sign*(.08+i*.05));
    await lane.getByRole('button',{name:/ Nudge range window$/}).click();
    const mode=page.getByRole('button',{name:/ Nudge mode$/}),feel=page.getByRole('button',{name:/ Nudge feel$/});
    if((await mode.textContent())!==(sign>0?'Vinyl':'Granular'))await mode.click();
    if((await feel.textContent())!==(sign>0?'Hard':'Soft'))await feel.click();
    await lane.getByRole('button',{name:/ Nudge range window$/}).click();
   }
  };
  const laneSliders=async sign=>{
   for(const [key,label] of [['bass','Bass'],['rootFollow','Root Follow'],['drum','Drums']]){
    await selectTab(key);
    await slider(page.getByRole('slider',{name:label+' Volume',exact:true}),key==='bass'?.27:key==='rootFollow'?.48:.38);
    await slider(page.getByRole('slider',{name:label+' Pan',exact:true}),sign*(key==='bass'?.31:key==='rootFollow'?.43:.16));
    if(key!=='drum'){
     await slider(page.getByRole('slider',{name:label+' Pitch',exact:true}),sign*(key==='bass'?44:66));
     await slider(page.getByRole('slider',{name:label+' Attack',exact:true}),sign*.12);
    }
   }
   await selectTab('material');
  };
  const editEq=async(id,sign)=>{
   // Seed nonneutral A/B through the real EQ owner, then edit its native morph
   // slider. Curve drawing itself has separate EQ browser coverage.
   await page.evaluate(({id,sign})=>window.__songP1().eq.set('material:'+id,
    {a:[.15*sign,.4*sign,-.2*sign],b:[-.3*sign,.1*sign],morph:0,mode:'raster',bands:9}),{id,sign});
   await materialRow(id).getByRole('button',{name:/ EQ$/,exact:false}).click();
   await slider(page.getByRole('slider',{name:'EQ A B Morph',exact:true}),sign>0?.37:.73);
   await page.getByRole('button',{name:'Close Equalizer',exact:true}).click();
  };
  const saveUI=async(name,includeRoom)=>{
   await page.getByRole('button',{name:'Save Quickrack Session in Meta Menu',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:'Save in Sessions (Meta-Menu)',exact:true});
   await dialog.getByRole('textbox',{name:'Session name',exact:true}).fill(name);
   await dialog.getByRole('checkbox',{name:'Include Main Room Settings',exact:true}).setChecked(includeRoom);
   await dialog.getByRole('button',{name:'Save as New Session',exact:true}).click();
   await dialog.waitFor({state:'detached'});
   return page.evaluate(name=>window.__songP1().session.snapshot().saved.find(e=>e.name===name),name);
  };
  const activate=async saved=>{
   await page.evaluate(id=>{const t=window.__songP1();if(!t.session.activateSaved(id))throw Error(t.session.snapshot().error);},saved.id);
   await restored(projected(saved.songPerformance));
  };
  const renderedAudio=async()=>{
   await page.waitForFunction(()=>window.__songP1Audio?.contexts.some(ctx=>ctx.state==='running')&&
    window.__songP1Audio.analysers.some(node=>{
     if(node.context.state!=='running')return false;
     const pcm=new Float32Array(node.fftSize);node.getFloatTimeDomainData(pcm);
     return pcm.every(Number.isFinite)&&pcm.some(x=>Math.abs(x)>1e-7);
    }),null,{timeout:30000});
   const clock=await page.evaluate(()=>window.__songP1Audio.contexts.find(ctx=>ctx.state==='running').currentTime);
   await page.waitForFunction(clock=>window.__songP1Audio.contexts.some(ctx=>ctx.state==='running'&&ctx.currentTime>clock+.02),clock);
  };
  await page.goto(pathToFileURL(output).href,{waitUntil:'domcontentloaded',timeout:90000});
  await ready();
  assert.equal(await page.evaluate(()=>location.protocol),'file:');
  assert.equal(await page.evaluate(()=>localStorage instanceof Storage),true);
  await page.evaluate(async()=>{if(!await window.__songP1().seed())throw Error('Real starter PCM preparation did not complete');});
  const materials=await page.evaluate(()=>window.__songP1().materials().filter(e=>e.id.startsWith('xensonar-starter-random-demo-')&&e.blob instanceof Blob&&e.blob.size>44).map(e=>({kind:'material',id:e.id,name:e.name})));
  assert.equal(materials.length,3,'three real durable starter PCM assets');
  await page.waitForFunction(ids=>ids.every(id=>window.__songP1().quick.adapters.get('material').entries.some(e=>e.id===id)),materials.map(e=>e.id));
  await page.evaluate(materials=>{
   const t=window.__songP1();t.quick.replaceItems([...t.quick.getItems().filter(e=>e.kind!=='material'),...materials]);
   if(!t.quick.activate(materials[2]))throw Error('Actual material adapter could not select primary');
   t.layers.clear();for(const e of materials.slice(0,2))t.layers.toggle(e.id,materials.map(e=>e.id),materials[2].id);
   t.primary.setMuted(false);t.bridge.patch({materialLoopActive:true});
  },materials);
  await page.waitForFunction(id=>window.__songP1().bridge.captureSongMix(window.__songP1().quick.getItems()).materialPlacement.primaryId===id,materials[2].id);
  const orderA=[materials[2].id,materials[0].id,materials[1].id];
  await materialSliders(orderA,1);await laneSliders(1);
  for(const id of orderA)await editEq(id,1);
  const beforeA=await read(),songA=await saveUI('P1 Browser A',false);
  assert.equal(songA.songPerformance.version,2);assert.equal(songA.roomSettings,null);
  assert.equal(songA.songPerformance.materialPlacement.primaryId,materials[2].id,'primary is not first rack material');
  assert.deepEqual(projected(songA.songPerformance),projected(beforeA));
  assert.equal(songA.songPerformance.materialPlacement.secondaryIds.length,2);
  assert.notEqual(songA.songPerformance.entries.find(e=>e.id===materials[2].id).mix.volume,1,'actual primary UI volume captured');
  await page.evaluate(materials=>{const t=window.__songP1();t.quick.activate(materials[0]);t.layers.clear();for(const e of materials.slice(1))t.layers.toggle(e.id,materials.map(e=>e.id),materials[0].id);},materials);
  await page.waitForFunction(id=>window.__songP1().quick.adapters.get('material').selected===id,materials[0].id);
  const orderB=[materials[0].id,materials[1].id,materials[2].id];
  await materialSliders(orderB,-1);await laneSliders(-1);
  for(const id of orderB)await editEq(id,-1);
  await page.evaluate(()=>window.__songP1().primary.setMuted(true));
  const songB=await saveUI('P1 Browser B',true);assert(songB.roomSettings);
  assert.notDeepEqual(projected(songA.songPerformance),projected(songB.songPerformance));
  await activate(songA);await activate(songB);await activate(songA);
  // Actual Power button pause/resume must preserve the restored configuration.
  const power=page.getByRole('button',{name:/^(Power|Have you tried turning it off and on again\?)$/});
  assert.equal(await power.count(),1,'native Power control');
  await power.click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/^(Power|Have you tried turning it off and on again\?)$/.test(b.textContent.trim())&&b.classList.contains('border-violet-400')));
  await renderedAudio();
  await restored(projected(songA.songPerformance));
  await power.click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Power'&&b.classList.contains('border-neutral-500')));
  await restored(projected(songA.songPerformance));
  await power.click();await renderedAudio();await restored(projected(songA.songPerformance));
  await power.click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Power'&&b.classList.contains('border-neutral-500')));
  await page.reload({waitUntil:'domcontentloaded'});await ready();
  await activate(songA);await activate(songB);
  const archive=await page.evaluate(()=>JSON.parse(localStorage.getItem('xensonar.meta-sessions.v2')));
  for(const saved of [songA,songB])assert.deepEqual(archive.saved.find(e=>e.id===saved.id).songPerformance,saved.songPerformance,'persisted native archive');
  assert.equal(report.errors.length,0,report.errors.join('\n'));
  Object.assign(report,{status:'PASS',materialAssets:materials.map(e=>e.id),
   checks:['native UI primary/extras volume pan pitch nudge/mode/feel','native UI bass root-follow drum mixer','real EQ owner curves and native morph slider','Save dialog with and without Main Room Settings','same assets in different roles across two songs','activation after React commit','Power on/off/on with running native AudioContext clock and finite nonzero PCM from existing analysers','same file URL reload with native persisted archive/IDB']});
  console.log(JSON.stringify(report,null,2));
 }finally{await context?.close();fs.rmSync(output,{force:true});fs.rmSync(profile,{recursive:true,force:true});}
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
