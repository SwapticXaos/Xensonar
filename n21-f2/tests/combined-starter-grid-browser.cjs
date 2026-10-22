'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const option=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1]};
const entry=option('--html',require('../source-manifest.json').entry),output=option('--result','results/combined-startup/starter-grid/browser.json');
const html=fs.readFileSync(entry,'utf8'),marker='const kEe=CEe("root");';assert.equal(html.split(marker).length,2);
const start=html.indexOf('const __XenStarterPrimaryId='),end=html.indexOf('function __createXenMetaSessionStore(',start);
const records=vm.runInNewContext(html.slice(start,end)+';JSON.stringify(__xenStarterPresetRecords())',{__xenMetaColorKey:e=>e.kind+'\0'+(e.instanceId||e.id)});
const fresh=()=>JSON.parse(records),clone=x=>JSON.parse(JSON.stringify(x));
const key='xensonar.meta-sessions.v2',quickKey='xensonar.quick-menu.v2';
function legacy(variant){
 const {primary,secondary}=fresh(),saved=[primary,secondary];
 for(const row of saved)for(const e of row.items)if(e.kind==='grid'){
  e.gridProfile.mainMutedDegrees=e.id==='ji'?[3,5,8,9,10]:[];if(e.id==='ji')e.gridProfile.modeId='chromatic';
  if(variant==='renamed-tile')e.name+=' · My version';
  if(variant==='offset')e.gridProfile.mainStepOffsets=[.001];
  if(variant==='mode')e.gridProfile.modeId='ionian';
  if(variant==='mask')e.gridProfile.mainMutedDegrees=[0];
  if(variant==='custom-instance')e.instanceId+='-copy';
 }
 if(variant==='renamed-session')for(const row of saved)row.name+=' · My session';
 if(variant==='unrelated-session')for(const row of saved)row.id+='-artist-copy';
 primary.colors[Object.keys(primary.colors)[0]]={border:'#123456',background:'#654321'};
 const all=saved.flatMap(row=>row.items),state={version:2,name:primary.name,items:clone(primary.items),saved,colors:clone(primary.colors),roomSettings:null,loadedId:primary.id,activePalette:{...clone(primary)},dirty:false};
 if(variant==='dirty-draft'){state.dirty=true;state.items[0].name+=' · Unsaved';}
 return {[key]:JSON.stringify(state),[quickKey]:JSON.stringify(all),'xensonar.fixture-existing.v1':'1'};
}
const hook=`window.__starterTest={records:__xenStarterPresetRecords,meta:__XenMetaSessions,quick:__XenQuick,bridge:__XenMainRoomSessionBridge,mask:xF,cents:Kp,period:AF,grid:Fx,status:Kue,audition:__XenMetaAudition,pitches:__xenMetaGridPreviewPitches,installed:__XenStarterInstalled,cold:__XenStarterColdBrowser};`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 const report={entry,rows:[],audio:[],errors:[]};
 try{
  for(const variant of ['original','renamed-tile','offset','mode','mask','custom-instance','renamed-session','unrelated-session','dirty-draft','existing-data']){
   const context=await browser.newContext(),page=await context.newPage(),seed=variant==='existing-data'?{'xensonar.existing-anything':'yes'}:legacy(variant);
   page.on('pageerror',e=>report.errors.push({variant,message:e.message}));
   await page.addInitScript(seed=>{if(!sessionStorage.getItem('fixture-seeded')){for(const [k,v]of Object.entries(seed))localStorage.setItem(k,v);sessionStorage.setItem('fixture-seeded','yes')}},seed);
   await page.route('https://starter-grid.test/**',r=>r.fulfill({contentType:'text/html',body:html.replace(marker,hook+marker)}));
   await page.goto('https://starter-grid.test/review');await page.waitForFunction(()=>window.__starterTest?.bridge.available());
   const first=await page.evaluate(({key,quickKey})=>({meta:localStorage.getItem(key),quick:localStorage.getItem(quickKey),installed:__starterTest.installed,cold:__starterTest.cold}),{key,quickKey});
   const failures=[];
   const check=(condition,message)=>{if(!condition)failures.push(message)};
   check(!first.installed&&!first.cold,'existing storage must block first boot');
   if(variant==='existing-data')check(JSON.parse(first.meta||'{"saved":[]}').saved.length===0,'any existing XenSonar data blocks starter installation');
   else{
    const before=JSON.parse(seed[key]),after=JSON.parse(first.meta),beforeQuick=JSON.parse(seed[quickKey]),afterQuick=JSON.parse(first.quick);
    for(let i=0;i<before.saved.length;i++){
     const expected=variant==='original'||variant==='dirty-draft'?fresh()[i?'secondary':'primary'].items:before.saved[i].items;
     check(JSON.stringify(after.saved[i].items)===JSON.stringify(expected.map(e=>e.kind==='grid'?{...e,gridProfile:{...e.gridProfile,...(after.saved[i].items.find(a=>a.instanceId===e.instanceId)?.gridProfile.bassConfig?{bassConfig:after.saved[i].items.find(a=>a.instanceId===e.instanceId).gridProfile.bassConfig}:{})}}:e)),variant+' saved profiles preserved/repaired');
     check(JSON.stringify(after.saved[i].colors)===JSON.stringify(before.saved[i].colors),'custom colors retained');
    }
    if(!['original','dirty-draft'].includes(variant))check(JSON.stringify(afterQuick)===JSON.stringify(beforeQuick.map(e=>e.kind==='grid'?{...e,gridProfile:{...e.gridProfile,bassConfig:afterQuick.find(a=>a.instanceId===e.instanceId).gridProfile.bassConfig}}:e)),variant+' Quick profiles preserved');
    if(variant==='dirty-draft')check(after.items[0].name===before.items[0].name,'unsaved draft retained');
   }
   await page.reload();await page.waitForFunction(()=>window.__starterTest?.bridge.available());
   const second=await page.evaluate(({key,quickKey})=>({meta:localStorage.getItem(key),quick:localStorage.getItem(quickKey)}),{key,quickKey});
   check(second.meta===first.meta&&second.quick===first.quick,'reload migration idempotent');
   report.rows.push({variant,failures});await context.close();
  }
  const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>report.errors.push({variant:'audio',message:e.message}));
  await page.addInitScript(()=>{
   localStorage.setItem('xensonar.audio-fixture.v1','1');window.__starterPCM={osc:[],buffers:[],starts:0};
   const osc=OfflineAudioContext.prototype.createOscillator;OfflineAudioContext.prototype.createOscillator=function(...args){const node=osc.apply(this,args),set=node.frequency.setValueAtTime.bind(node.frequency);node.frequency.setValueAtTime=(hz,time)=>{__starterPCM.osc.push({hz,time});return set(hz,time)};return node};
   const render=OfflineAudioContext.prototype.startRendering;OfflineAudioContext.prototype.startRendering=async function(...args){const b=await render.apply(this,args);__starterPCM.buffers.push(b);return b};
   const begin=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){__starterPCM.starts++;return begin.apply(this,args)};
  });
  await page.route('https://starter-grid.test/**',r=>r.fulfill({contentType:'text/html',body:html.replace(marker,hook+marker)}));await page.goto('https://starter-grid.test/audio');await page.waitForFunction(()=>window.__starterTest?.bridge.available());
  const profiles=[...fresh().primary.items,...fresh().secondary.items].filter(e=>e.kind==='grid');
  const expected={'12edo':[0,2,3,5,7,8,10],'ji':[0,1,2,4,6,7,11],'bp':[0,1,3,5,6,8,9,11,12],'19edo':[0,2,5,8,11,13,16],'31edo':[0,5,8,13,18,23,26]};
  for(const profile of profiles){
   await page.waitForFunction(entry=>__starterTest.audition.available(entry),profile);
   const row=await page.evaluate(async entry=>{
    const api=__starterTest,p=entry.gridProfile;api.bridge.applyGridProfile(entry);await new Promise(requestAnimationFrame);const live=api.bridge.capture().nParamsUI;
    const mask=api.mask(p.modeId,entry.id),cents=api.cents(entry.id),period=api.period(entry.id),base=110;
    const grid=api.grid(base,entry.id,live.manualGridMutedSteps,live.manualGridStepOffsets);
    const start=__starterPCM.starts,buffers=__starterPCM.buffers.length,osc=__starterPCM.osc.length;
    await api.audition.toggle(entry);
    await new Promise((resolve,reject)=>{const deadline=performance.now()+15000;const check=()=>{if(__starterPCM.starts>start)return resolve();if(performance.now()>deadline)return reject(Error('Native preview start timed out: '+JSON.stringify(api.audition.status())));setTimeout(check,20)};check()});
    const buffer=__starterPCM.buffers[buffers],pcm=buffer?.getChannelData(0),pitches=api.pitches(Number(live.gridBase??110),entry.id,p);
    const result={id:entry.id,live:{modeId:live.gridMode,tuning:live.gridTuning,mutes:live.manualGridMutedSteps},mask,cents,period,grid,status:api.status({...live,activeParticleNodeCount:0,agentEnabled:[]}).gridModeLabel,pitches,osc:__starterPCM.osc.slice(osc),starts:__starterPCM.starts-start,peak:pcm?.reduce((m,x)=>Math.max(m,Math.abs(x)),0),frames:buffer?.length,sampleRate:buffer?.sampleRate};
    const baseStatus={...live,activeParticleNodeCount:0,agentEnabled:[]};result.statusSubset=api.status({...baseStatus,manualGridMutedSteps:[]}).gridModeLabel;result.statusExtra=api.status({...baseStatus,manualGridMutedSteps:[0]}).gridModeLabel;result.statusOffset=api.status({...baseStatus,manualGridStepOffsets:[1]}).gridModeLabel;
    api.audition.stop();return result;
   },profile);
   assert.deepEqual(row.live.mutes,profile.gridProfile.mainMutedDegrees);assert.equal(row.live.modeId,profile.gridProfile.modeId);assert.equal(row.live.tuning,profile.id);assert.deepEqual(row.mask,profile.gridProfile.mainMutedDegrees);
   assert.deepEqual(row.cents.map((_,i)=>i).filter(i=>!row.live.mutes.includes(i)),expected[row.id]);assert.notEqual(row.status,'Custom');assert.notEqual(row.statusSubset,'Custom');assert.equal(row.statusExtra,'Custom');assert.equal(row.statusOffset,'Custom');
   const projected=row.grid.map(hz=>{const c=(1200*Math.log2(hz/110)%(1200*Math.log2(row.period))+1200*Math.log2(row.period))%(1200*Math.log2(row.period));let nearest=0;row.cents.forEach((v,i)=>{if(Math.min(Math.abs(v-c),Math.abs(v-c+1200*Math.log2(row.period)))<Math.min(Math.abs(row.cents[nearest]-c),Math.abs(row.cents[nearest]-c+1200*Math.log2(row.period))))nearest=i});return nearest});assert.deepEqual([...new Set(projected)].sort((a,b)=>a-b),expected[row.id],'native playable grid degrees');
   assert.equal(row.starts,1);assert(row.peak>.001&&row.peak<1);assert.equal(row.osc.length,row.pitches.length*3);row.pitches.forEach((hz,i)=>assert(Math.abs(row.osc[i*3].hz-hz)<1e-6,'rendered fundamental follows native profile pitch'));assert(Math.abs(row.pitches.at(-1)/row.pitches[0]-row.period)<1e-6);
   report.audio.push(row);
  }
  await context.close();assert.deepEqual(report.errors,[]);const failures=report.rows.flatMap(r=>r.failures);assert.deepEqual(failures,[]);
  report.pass=true;console.log('PASS starter migration preservation/reload + five native playable and rendered profile pitch sets');
 }catch(error){report.pass=false;report.failure=error.stack;throw error}finally{fs.mkdirSync(require('node:path').dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
