'use strict';
// Real HTTPS origin and reload: native storage and mounted Main Room owners.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const manifest=require('../source-manifest.json'),marker='const kEe=CEe("root");';
const expose=`window.__sessionsReview={meta:__XenMetaSessions,quick:__XenQuick,room:__XenMainRoomSessionBridge,bass:__XenBassGrid,legacy:__xenLegacySongParts,tuning:x2,modes:Ka,library:sj};`;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1490,height:960}}),errors=[];
  page.on('pageerror',failure=>errors.push(failure.message));
  const original=fs.readFileSync(manifest.entry,'utf8');assert.equal(original.split(marker).length,2);
  const html=original.replace(marker,expose+marker);
  await page.route('https://sessions.xensonar.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
  const ready=async()=>{await page.waitForFunction(()=>window.__sessionsReview?.room.available(),{timeout:45000});};
  await page.goto('https://sessions.xensonar.test/reload');await ready();
  const originalSongs=await page.evaluate(()=>{
   localStorage.clear();
   const items=[{kind:'grid',id:'19edo',name:'19 EDO'}],row={id:'old-session',name:'Migrated V1',items,colors:{['grid\0'+'19edo']:{border:'#123456'}},roomSettings:null};
   localStorage.setItem('xensonar.quick-menu.v1',JSON.stringify(items));
   localStorage.setItem('xensonar.meta-sessions.v1',JSON.stringify({version:1,...row,saved:[row],loadedId:row.id,activePalette:null,dirty:false}));
   const song={version:1,id:'legacy-song',name:'Saved Song',activePartId:'part-b',parts:[{id:'part-a',name:'Intro',items:[{kind:'bass',id:'clip:missing',name:'Missing retained'}]},{id:'part-b',name:'Verse',items:[]}]};
   const draft=JSON.parse(JSON.stringify(song));draft.parts[0].name='Edited Intro';
   const raw=JSON.stringify({version:1,saved:[song],drafts:[draft],selectedId:song.id});localStorage.setItem('xensonar.song-projects.v1',raw);return raw;
  });
  await page.reload();await ready();
  const initial=await page.evaluate(()=>{const a=__sessionsReview;return{state:a.meta.snapshot(),quick:a.quick.getItems(),modes:a.modes('19edo'),bassDisk:localStorage.getItem('xensonar:grid-tuning-library:derived-v1')}});
  assert.equal(initial.state.name,'Migrated V1');assert.equal(initial.state.items[0].instanceId,'legacy:19edo');
  assert.equal(initial.state.colors['grid\0'+'19edo'].border,'#123456');
  assert(initial.modes.every(mode=>!String(mode.value).includes('bp_')),'19 EDO must not offer BP modes');
  const prepared=await page.evaluate(()=>{
   const a=__sessionsReview,entry=a.meta.snapshot().items[0];
   if(!a.meta.patchGridProfile(entry,{modeId:'dorian',mainMutedDegrees:[1],bassEnabled:true,bassConfig:{mutedDegrees:[3]}}))throw Error(a.meta.snapshot().error);
   const twin=a.meta.cloneGrid(a.meta.snapshot().items[0]);
   a.meta.patchGridProfile(twin,{modeId:'chromatic',mainMutedDegrees:[2],bassEnabled:true,bassConfig:{mutedDegrees:[4]}});
   if(!a.meta.save('V2 Profiles'))throw Error(a.meta.snapshot().error);
   return a.meta.snapshot();
  });
  assert.notEqual(prepared.items[0].instanceId,prepared.items[1].instanceId);
  await page.reload();await ready();
  const reloaded=await page.evaluate(()=>__sessionsReview.meta.snapshot());assert.deepEqual(reloaded.items,prepared.items);assert.deepEqual(reloaded.colors,prepared.colors);
  const switches=[];
  for(const index of [0,1,0]){
   assert.equal(await page.evaluate(index=>__sessionsReview.quick.activate(__sessionsReview.meta.snapshot().items[index]),index),true);
   await page.waitForFunction(index=>__sessionsReview.room.capture().nParamsUI.gridMode===(index?'chromatic':'dorian'),index);
   const state=await page.evaluate(()=>{const a=__sessionsReview;return{params:a.room.capture().nParamsUI,override:a.bass.liveOverride(),selected:a.quick.snapshot().selectedByKind.grid,bassDisk:localStorage.getItem('xensonar:grid-tuning-library:derived-v1')}});
   assert.deepEqual(state.params.manualGridMutedSteps,index?[2]:[1]);assert.deepEqual(state.override.profile.bassConfig.mutedDegrees,index?[4]:[3]);assert.equal(state.selected,reloaded.items[index].instanceId);assert.equal(state.bassDisk,initial.bassDisk);switches.push(state);
  }
  const variation=await page.evaluate(()=>{
   const a=__sessionsReview,first=a.meta.snapshot().items[0],source=a.tuning(first.id);
   const draft={...source,name:'Custom original',stepCents:source.stepCents.map((value,index)=>index===1?value+2:value)};
   if(!a.meta.createTuningVariation(first,draft))throw Error(a.meta.snapshot().error);
   const custom=a.meta.snapshot().items[0],before=JSON.stringify(a.tuning(custom.id));
   const twin=a.meta.cloneGrid(custom),changed=a.tuning(custom.id);
   if(!a.meta.createTuningVariation(twin,{...changed,name:'Custom clone edited',stepCents:changed.stepCents.map((value,index)=>index===1?value+3:value)}))throw Error(a.meta.snapshot().error);
   return{originalId:custom.id,cloneId:a.meta.snapshot().items.find(item=>item.instanceId===twin.instanceId).id,before,after:JSON.stringify(a.tuning(custom.id)),liveTuning:a.room.capture().nParamsUI.gridTuning,customModes:a.modes(custom.id)};
  });
  assert.notEqual(variation.originalId,variation.cloneId);assert.equal(variation.before,variation.after,'editing a custom tuning clone cannot modify the original library tuning');assert.equal(variation.liveTuning,'19edo','editor variation cannot change the live tuning');assert(variation.customModes.every(mode=>!String(mode.value).includes('bp_')));
  const bpVariation=await page.evaluate(()=>{
   const a=__sessionsReview;a.meta.addItem({kind:'grid',id:'bp',name:'Bohlen-Pierce'});
   const entry=a.meta.snapshot().items.find(item=>item.id==='bp'),draft=a.tuning('bp');
   if(!a.meta.createTuningVariation(entry,{...draft,name:'Custom BP variation',stepCents:draft.stepCents.map((value,index)=>index===1?value+2:value)}))throw Error(a.meta.snapshot().error);
   const custom=a.meta.snapshot().items.find(item=>item.instanceId===entry.instanceId);return{id:custom.id,modes:a.modes(custom.id),nativeModes:a.modes('bp'),liveTuning:a.room.capture().nParamsUI.gridTuning};
  });
  assert(bpVariation.modes.some(mode=>mode.value==='bp_lambda'),'custom variation from BP keeps native BP mode policy');assert.deepEqual(bpVariation.modes,bpVariation.nativeModes);assert.equal(bpVariation.liveTuning,'19edo');
  // Exercise the visible chooser and native store copy, with the draft variant.
  await page.getByRole('button',{name:'P7.24 Songs',exact:true}).click();
  const choice=page.getByRole('combobox',{name:'P7.24 Song and Part'});assert.equal(await choice.locator('option').count(),4);await choice.selectOption('2');
  await page.getByRole('button',{name:'Import selected Part',exact:true}).click();
  assert.match(await page.getByRole('dialog',{name:'Import P7.24 Songs'}).getByRole('status').innerText(),/Part copied/);
  const imported=await page.evaluate(()=>__sessionsReview.meta.snapshot().saved.at(-1));assert.equal(imported.name,'Saved Song · Edited Intro');assert.equal(imported.items[0].id,'clip:missing');
  await page.reload();await ready();
  const legacy=await page.evaluate(()=>{const a=__sessionsReview,before=a.meta.snapshot().saved.length;return{count:before,duplicate:a.meta.importLegacyPart(a.legacy(localStorage).parts[2]),after:a.meta.snapshot().saved.length,error:a.meta.snapshot().error,raw:localStorage.getItem('xensonar.song-projects.v1'),v1Meta:localStorage.getItem('xensonar.meta-sessions.v1'),v1Quick:localStorage.getItem('xensonar.quick-menu.v1')}});
  assert.equal(legacy.duplicate,false);assert.equal(legacy.count,legacy.after);assert.match(legacy.error,/already imported/);assert.equal(legacy.raw,originalSongs);assert(legacy.v1Meta&&legacy.v1Quick,'v1 originals remain available');
  assert.deepEqual(errors,[]);
  fs.mkdirSync('results/sessions-reviewed/source-review',{recursive:true});fs.writeFileSync('results/sessions-reviewed/source-review/origin-reload.json',JSON.stringify({entry:manifest.entry,scope:'Native Chromium HTTPS origin localStorage reload and mounted Main Room profile owners; no audio device claim',initial,prepared,reloaded,switches,variation,bpVariation,legacy,errors},null,2)+'\n');
  console.log('PASS native origin reload: v1→v2 profiles/colors, 19 EDO A→B→A modes/mutes, isolated Bass Grid, visible saved/draft Part import and duplicate prevention');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
