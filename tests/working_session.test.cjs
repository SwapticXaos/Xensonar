'use strict';
/* P1 source/store regression coverage. These tests exercise the real session
 * codec, Main Room bridge, and material voice mixer in a VM. They do not test
 * browser rendering or produce audio. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, 'src', p), 'utf8');
const copy = x => JSON.parse(JSON.stringify(x));

function fixture(initialData, items = [
  {kind:'material',id:'m-primary',name:'Primary'},
  {kind:'material',id:'m-secondary-1',name:'Secondary 1'},
  {kind:'material',id:'m-secondary-2',name:'Secondary 2'},
  {kind:'bass',id:'bass-1',name:'Bass'},
  {kind:'rootFollow',id:'rfl-1',name:'Root Follow'},
  {kind:'drum',id:'drum-1',name:'Drums'},
], {deferAttach=false} = {}) {
  const disk = new Map(initialData || []);
  const storage = {getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)};
  const mixes = {}, applied = [], roomUpdates = [], panValues={material:0,bass:0,rootFollow:0,particle:0,wave:0,keyboard:0}, attackValues={bass:0,rootFollow:0};
  const selectedByKind={material:'m-primary',bass:'bass-1',rootFollow:'rfl-1',drum:'drum-1'};
  let timerId=0;const timers=new Map(),events=new Map();
  let bassPitch=0,rootPitch=0,wavePreset='tape_halo',waveEnabled=false,waveVolume=.22;
  const context = {storage, console, queueMicrotask:()=>{}, setTimeout:(fn)=>{const id=++timerId;timers.set(id,fn);return id}, clearTimeout:id=>timers.delete(id),
    localStorage:storage,
    requestAnimationFrame:()=>0,
    window:{addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type)},
    crypto:{randomUUID:()=>`p1-${Math.random().toString(36).slice(2)}`}, Math, JSON,
    __xenGridKey:e=>e.kind+':'+e.id,__xenMetaColorKey:e=>e.kind+':'+e.id,
    __xenQuickGlobalRows:()=>12,
    __xenMetaValidateItems:value=>{if(!Array.isArray(value))throw Error('invalid items');return copy(value)},
    __xenMetaValidateColors:(value,colors)=>colors??{},
    __XenStarterInstalled:false,__xenRestoredWorkspace4:{},
    __XenNudgeFeedback:{endPreview:()=>{}},
    __XenPan:{snapshot:()=>({...panValues}),set:(kind,value)=>{panValues[kind]=value}},__XenOctaves:{snapshot:()=>({}),set:()=>{}},
    __XenBassPitch:{snapshot:()=>bassPitch,set:value=>{bassPitch=value}},__XenRootFollowPitch:{snapshot:()=>rootPitch,set:value=>{rootPitch=value}},
    __XenAttackLanes:{snapshot:()=>({...attackValues}),set:(lane,value)=>{attackValues[lane]=value}},
    __XenBassGrid:{snapshot:()=>({source:'main'}),setSource:()=>{},liveOverride:()=>null},
  };
  context.globalThis=context;
  const quick={items:copy(items),getItems(){return copy(this.items)},replaceItems(value){this.items=copy(value)},replaceItemsTransient(value){this.items=copy(value)},
    snapshot:()=>({selectedByKind:{...selectedByKind}}),restoreGridSelection:(value)=>{selectedByKind.grid=value??null},clearGridSelection:()=>{selectedByKind.grid=null},
    setSelected:(kind,id)=>{selectedByKind[kind]=id},restoreSelection:value=>{for(const [kind,id] of Object.entries(value??{}))selectedByKind[kind]=id},
    adapters:new Map(),subscribe:()=>()=>{}};
  context.__XenQuick=quick;
  vm.createContext(context);
  // Load the actual Bass Timbral Contract used by the production bridge.
  const bassSource=read('rhythm/02_bass_and_rack.js');
  vm.runInContext(bassSource.slice(bassSource.indexOf('const __f48BassVoices ='),bassSource.indexOf('function __f48BassClipPlayer(')),context);
  context.__xenDronePersist={normalize:v=>Object.fromEntries(Object.entries(v||{}).filter(([k])=>k.startsWith('drone')))};

  vm.runInContext(read('quickrack/equalizer/eq-core.js')+';globalThis.__XenEQ=__XenEQ;',context);
  const bridgeText=read('mix/03_meta_menu__before_v2-session-store.js');
  const bridgeStart=bridgeText.indexOf('const __XenMainRoomSessionBridge=');
  const bridgeEnd=bridgeText.indexOf('})();',bridgeStart)+5;
  if(bridgeStart<0||bridgeEnd<5)throw Error('Could not locate Main Room bridge source');
  vm.runInContext(bridgeText.slice(bridgeStart,bridgeEnd)+';globalThis.__bridge=__XenMainRoomSessionBridge;',context);
  const voiceText=read('mix/03_quick_menu__before_eq-core.js');
  for(const [token,name] of [['const __XenMaterialLayers=','__XenMaterialLayers'],['const __XenMaterialPrimarySwitch=','__XenMaterialPrimarySwitch']]){
    const start=voiceText.indexOf(token),end=voiceText.indexOf('})();',start)+5;
    if(start<0||end<5)throw Error(`Could not locate ${name} source`);
    vm.runInContext(voiceText.slice(start,end)+`;globalThis.__actual=${name};`,context);
    context[name]=context.__actual;delete context.__actual;
  }
  const voiceStart=voiceText.indexOf('const __XenMaterialVoiceMix=');
  const voiceEnd=voiceText.indexOf('})();',voiceStart)+5;
  vm.runInContext(voiceText.slice(voiceStart,voiceEnd)+';globalThis.__voice=__XenMaterialVoiceMix;',context);
  context.__XenMaterialVoiceMix=context.__voice;
  // The owner reference is mutable just like the Main Room React owner; tests
  // may update params without replacing the bridge.
  context.__roomParams={};
  const owner={getSongParams:()=>context.__roomParams,getSongWave:()=>({preset:wavePreset,enabled:waveEnabled,volume:waveVolume}),updateNParams:v=>{roomUpdates.push(copy(v));Object.assign(context.__roomParams,v)},
    get waveSoundPreset(){return wavePreset},get waveSoundEnabled(){return waveEnabled},get waveSoundVolume(){return waveVolume},
    setWaveSoundPreset:v=>{wavePreset=v},setWaveSoundEnabled:v=>{waveEnabled=v},setWaveSoundVolume:v=>{waveVolume=v}};
  const attach=(value=owner)=>context.__bridge.attach(value);
  if(!deferAttach)attach();
  vm.runInContext(read('sessions/v2-session-store.js')+'\nglobalThis.__store=__createXenMetaSessionStore(storage,__XenQuick);',context);
  context.__XenMetaSessions=context.__store;
  return {context,s:context.__store,quick,storage,mixes,applied,roomUpdates,disk,items,panValues,attackValues,selectedByKind,attach,
    getWave:()=>({preset:wavePreset,enabled:waveEnabled,volume:waveVolume}),dispatch:type=>events.get(type)?.(),runTimers:()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn())},timers,
    setEq:(key,value)=>context.__XenEQ.restore({[key]:value}),getEq:key=>context.__XenEQ.get(key)};
}
const sourceConfig=(particlePreset,wavePreset,volume)=>({particle:{particlePreset,particleVolume:.44},waveStarter:{preset:wavePreset,enabled:true,volume},keyboard:{keyboardHoldSoundPreset:'keys_'+particlePreset},pan:{particle:.12,wave:-.23,keyboard:.34},octaves:{particle:1,wave:2,keyboard:3}});
function ready(f){f.context.__bridge.defaultsReady();assert.equal(typeof f.s.flushWorkingCopy,'function')}
function working(f){return JSON.parse(f.disk.get('xensonar.working-session.v1')||'null')?.row??null}
function setLive(f,sources){f.context.__bridge.applySongSources(sources)}

test('named active working session reloads latest live source edits without changing the saved row',()=>{
 const f=fixture();ready(f);
 const original=sourceConfig('saved_particle','saved_wave',.32);setLive(f,original);
 assert.equal(f.s.saveFromQuickAsNew('Named'),true);
 const saved=f.s.snapshot().saved[0],namedSources=copy(saved.songPerformance.sources);
 const latest=sourceConfig('edited_particle','edited_wave',.81);setLive(f,latest);
 assert.equal(f.s.flushWorkingCopy(),true);
 const row=working(f);assert.equal(row.id,saved.id);assert.equal(row.name,'Named');
 const reload=fixture([...f.disk.entries()]);ready(reload);
 assert.equal(reload.context.__roomParams.particlePreset,'edited_particle');
 assert.equal(reload.getWave().preset,'edited_wave');assert.equal(reload.getWave().volume,.81);
 assert.equal(reload.context.__roomParams.keyboardHoldSoundPreset,'keys_edited_particle');
 assert.deepEqual(JSON.parse(JSON.stringify(reload.context.__XenPan.snapshot())),{material:0,bass:0,rootFollow:0,particle:.12,wave:-.23,keyboard:.34});
 assert.deepEqual(JSON.parse(JSON.stringify(reload.s.snapshot().saved[0].songPerformance.sources)),namedSources,
   'autosave belongs only to the replaceable working row, not the explicitly named archive row');
});

test('anonymous working config reloads; editor load does not replace the active live working row',()=>{
 const f=fixture([['xensonar.meta-sessions.v2',JSON.stringify({version:2,name:'Untitled',items:[],colors:{},saved:[],loadedId:null,activePalette:null,dirty:false})]]);ready(f);setLive(f,sourceConfig('anonymous','anon_wave',.67));
 assert.equal(f.s.flushWorkingCopy(),true);assert.equal(working(f).id,null);
 const reload=fixture([...f.disk.entries()]);ready(reload);
 assert.equal(reload.context.__roomParams.particlePreset,'anonymous');
 assert.equal(reload.s.saveFromQuickAsNew('Editor B'),true);const b=reload.s.snapshot().saved[0];
 assert.equal(reload.context.__roomParams.particlePreset,'anonymous');
 assert.equal(reload.s.flushWorkingCopy(),true);assert.equal(working(reload).id,b.id);
 const activeBefore=copy(working(reload));
 assert.equal(reload.s.load(b.id),true,'load edits the library/editor draft only');
 assert.equal(reload.s.flushWorkingCopy(),true);
 assert.deepEqual(working(reload),activeBefore,'editor selection cannot replace the current live session identity/config');
 assert.equal(working(reload).id,b.id,'editor load preserves the currently named active identity');
});

test('explicitly engaging Session B replaces Session A working copy and reloads B',()=>{
 const f=fixture();ready(f);
 setLive(f,sourceConfig('A','wave_A',.22));assert.equal(f.s.saveFromQuickAsNew('Session A'),true);
 const idA=f.s.snapshot().saved[0].id;
 setLive(f,sourceConfig('B','wave_B',.77));assert.equal(f.s.saveFromQuickAsNew('Session B'),true);
 const idB=f.s.snapshot().saved.find(x=>x.name==='Session B').id;
 assert.equal(f.s.activateSaved(idA),true);assert.equal(working(f).id,idA);
 assert.equal(f.s.activateSaved(idB),true);assert.equal(working(f).id,idB);
 const reload=fixture([...f.disk.entries()]);ready(reload);
 assert.equal(reload.context.__roomParams.particlePreset,'B');assert.equal(reload.getWave().preset,'wave_B');
 assert.equal(reload.s.snapshot().saved.length,2,'working copy never inserts an unnamed archive record');
});

test('working copy preserves corrupt bytes and compare-and-swap refuses to overwrite a foreign tab',()=>{
 const corrupt='{bad-working-json';const bad=fixture([['xensonar.working-session.v1',corrupt]]);ready(bad);
 assert.equal(bad.s.flushWorkingCopy(),false);assert.equal(bad.disk.get('xensonar.working-session.v1'),corrupt);
 const f=fixture();ready(f);setLive(f,sourceConfig('first','wave_first',.4));assert.equal(f.s.flushWorkingCopy(),true);
 const foreign='{"version":1,"row":{"foreign":true}}';f.disk.set('xensonar.working-session.v1',foreign);
 setLive(f,sourceConfig('second','wave_second',.6));assert.equal(f.s.flushWorkingCopy(),false);
 assert.equal(f.disk.get('xensonar.working-session.v1'),foreign,'CAS leaves another tab’s bytes intact');
 assert.match(f.s.snapshot().error,/changed in another tab/);
});

test('working-copy storage quota failure is surfaced without corrupting prior bytes',()=>{
 const f=fixture();ready(f);setLive(f,sourceConfig('before','wave_before',.2));assert.equal(f.s.flushWorkingCopy(),true);
 const previous=f.disk.get('xensonar.working-session.v1');
 // Simulate a browser quota error on the working key only.
 const set=f.storage.setItem;f.storage.setItem=(key,value)=>{if(key==='xensonar.working-session.v1')throw Error('quota exceeded');set(key,value)};
 setLive(f,sourceConfig('after','wave_after',.9));assert.equal(f.s.flushWorkingCopy(),false);
 assert.equal(f.disk.get('xensonar.working-session.v1'),previous);assert.match(f.s.snapshot().error,/quota exceeded/);
});

test('real Jce Wave Starter handler schedules a working write and bridge capture sees the pre-render value',()=>{
 const f=fixture();
 const source=read('rhythm/02_bass_and_rack.js'),start=source.indexOf('function Jce(e)'),end=source.indexOf('const eue=',start);
 assert.ok(start>=0&&end>start,'actual Jce owner projection exists');
 vm.runInContext(source.slice(start,end).replace(/\s*$/,'')+';globalThis.__Jce=Jce;',f.context);
 let wavePreset='old_wave',waveEnabled=false,waveVolume=.22;
 const seq=[],input={nParamsUI:{particleSampleProfileMode:'current_db_v2'},nexusParamsRef:{current:{}},updateNParams:()=>{},
  setWaveSoundPreset:value=>{wavePreset=value;seq.push('owner-set')},setWaveSoundEnabled:value=>{waveEnabled=value},setWaveSoundVolume:value=>{waveVolume=value},
  waveSoundPreset:wavePreset,waveSoundEnabled:waveEnabled,waveSoundVolume:waveVolume,
  dronePresets:[],particlePresets:[],waveSoundPresets:[],waveTimbreGradientPresets:[],waveVolumeGradientPresets:[],particleGradientPresets:[],
  waveOvertoneModes:[],waveOvertoneArpRates:[],waveOvertoneArpPatterns:[],droneJiOvertones:{},waveOvertoneMixPresets:[],waveDecayPresets:[],activeParticleNodes:[],agentKeys:[],
  setDronePreset:()=>{},setDroneVolume:()=>{},previewWavePresetSelection:()=>seq.push('preview')};
 const projected=f.context.__Jce(input);f.attach(projected);f.context.__bridge.defaultsReady();
 const originalSchedule=f.s.scheduleWorkingCopy.bind(f.s);f.s.scheduleWorkingCopy=()=>{seq.push('scheduled');originalSchedule()};
 projected.onWaveSoundPresetChange('fresh_wave');
 assert.deepEqual(seq,['owner-set','scheduled','preview']);
 const immediately=f.context.__bridge.captureSongSources();
 assert.equal(immediately.waveStarter.preset,'fresh_wave','capture reads the setter-owned value before React render updates props');
 assert.ok(f.timers.size>0,'handler schedules the debounced working-row write');
 f.runTimers();
 const reload=fixture([...f.disk.entries()]);reload.context.__bridge.defaultsReady();
 assert.equal(reload.getWave().preset,'fresh_wave','scheduled write restores after browser reload');
});

test('explicit Session B engage rolls back the working row when archive commit fails',()=>{
 const f=fixture();ready(f);setLive(f,sourceConfig('A','wave_A',.2));assert.equal(f.s.saveFromQuickAsNew('Session A'),true);
 const a=f.s.snapshot().saved[0],beforeWorking=f.disk.get('xensonar.working-session.v1');
 setLive(f,sourceConfig('B','wave_B',.8));assert.equal(f.s.saveFromQuickAsNew('Session B'),true);
 const b=f.s.snapshot().saved.find(row=>row.name==='Session B');
 assert.equal(f.s.activateSaved(a.id),true);const beforeEngage=f.disk.get('xensonar.working-session.v1');
 const set=f.storage.setItem;f.storage.setItem=(key,value)=>{if(key==='xensonar.meta-sessions.v2')throw Error('archive quota');set(key,value)};
 assert.equal(f.s.activateSaved(b.id),false);assert.equal(f.disk.get('xensonar.working-session.v1'),beforeEngage,'working commit is rolled back with failed archive commit');
 assert.equal(f.context.__roomParams.particlePreset,'A','live sources are rolled back too');assert.match(f.s.snapshot().error,/archive quota/);
 assert.notEqual(beforeEngage,beforeWorking,'the attempted engage had a distinct prior working row');
});

test('wheel preview suppresses working-row writes until Return or Accept',async()=>{
 const f=fixture();f.context.requestAnimationFrame=callback=>{callback(0);return 1};ready(f);setLive(f,sourceConfig('before','wave_before',.3));assert.equal(f.s.flushWorkingCopy(),true);
 const before=f.disk.get('xensonar.working-session.v1');f.context.__f351BeginPreview=()=>({restore(){},finish(){}});
 f.quick.cancelActivation=()=>{};f.quick.restoreSelection=value=>Object.assign(f.selectedByKind,value);
 const preview=f.s.beginSuggestion();setLive(f,sourceConfig('temporary','wave_temporary',.9));
 assert.equal(f.s.flushWorkingCopy(),false,'live preview never serializes its temporary settings');
 assert.equal(f.disk.get('xensonar.working-session.v1'),before);
 await preview.restore();assert.equal(f.disk.get('xensonar.working-session.v1'),before,'Return restores live state without contaminating saved working row');
});

test('an existing working row wins over compact seed and factory starter fallback',()=>{
 const f=fixture();ready(f);setLive(f,sourceConfig('working','working_wave',.73));assert.equal(f.s.flushWorkingCopy(),true);
 const saved=[...f.disk.entries()];
 const seed={version:1,archiveRows:12,count:0,activePalette:null,songSources:sourceConfig('seed','seed_wave',.11)};
 saved.push(['xensonar.meta-sessions.m13.boot.v1',JSON.stringify(seed)]);
 const reload=fixture(saved);reload.context.__xenStarterSourceSettings=()=>sourceConfig('factory','factory_wave',.05);
 reload.context.__bridge.defaultsReady();
 assert.equal(reload.context.__roomParams.particlePreset,'working','working session takes precedence over boot seed and starter');
 assert.equal(reload.getWave().preset,'working_wave');
});

test('material library hydration cannot replace an authoritative working selection with the first entry',()=>{
 const text=read('audio/01_voice_and_rfl_ownership.js'),a=text.indexOf('function Kfe('),b=text.indexOf('async function $fe(',a);
 const scope={};vm.runInNewContext(text.slice(a,b)+';globalThis.choose=Kfe;',scope);
 const missing=scope.choose({entries:[{id:'unrelated'}],currentId:'working-sample',currentActive:true,pendingRegisteredId:'',preserveCurrentId:true});
 assert.equal(missing.patch,null);
 const loading=scope.choose({entries:[],currentId:'working-sample',currentActive:true,pendingRegisteredId:'',preserveCurrentId:true});
 assert.equal(loading.patch,null,'temporary empty library must not erase the working sample');
 const blank=scope.choose({entries:[{id:'unrelated'}],currentId:'',currentActive:false,pendingRegisteredId:'',preserveCurrentId:true});
 assert.equal(blank.patch,null,'an intentionally empty working slot stays empty');
 const explicit=scope.choose({entries:[{id:'new-sample'}],currentId:'',currentActive:false,pendingRegisteredId:'new-sample',preserveCurrentId:true});
 assert.equal(explicit.patch.materialLoopId,'new-sample','explicit sample registration still wins');
});


test('pagehide keeps a just-edited unnamed source before the coalesced timer runs',()=>{
 const f=fixture();ready(f);setLive(f,sourceConfig('just_changed','just_changed_wave',.66));
 f.s.scheduleWorkingCopy();assert.ok(f.timers.size>0);
 f.dispatch('pagehide');
 assert.equal(working(f).songPerformance.sources.waveStarter.preset,'just_changed_wave');
 const reload=fixture([...f.disk]);ready(reload);
 assert.equal(reload.getWave().preset,'just_changed_wave');
});

test('background working serialization uses the browser idle seam while pagehide stays immediate',()=>{
 const f=fixture();ready(f);const idle=new Map();let seq=0;
 f.context.requestIdleCallback=fn=>{idle.set(++seq,fn);return seq};f.context.cancelIdleCallback=id=>idle.delete(id);
 setLive(f,sourceConfig('idle','idle_wave',.77));f.s.scheduleWorkingCopy();f.runTimers();
 assert.equal(working(f),null,'timer only schedules the idle job');assert.equal(idle.size,1);
 f.dispatch('pagehide');assert.equal(idle.size,0,'immediate shutdown write cancels pending idle duplication');
 assert.equal(working(f).songPerformance.sources.waveStarter.preset,'idle_wave');
});


test('package scopes keep working session and global EQ tool separate from named sessions',()=>{
 const scope={};vm.runInNewContext(read('package_station/02_export_selection.js')+';globalThis.selection=__XenPackageSelection41;',scope);
 assert.equal(scope.selection.keyCategory('xensonar.working-session.v1'),'currentMain');
 assert.equal(scope.selection.keyCategory('xensonar.meta-sessions.v2'),'sessions');
 assert.equal(scope.selection.keyCategory('xensonar.quickrack.eq.tool-preference.v1'),'settings');
});
