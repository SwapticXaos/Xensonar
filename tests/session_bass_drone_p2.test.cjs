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
  let bassPitch=0,rootPitch=0,wavePreset='tape_halo',waveEnabled=false,waveVolume=.22,droneVolume=.06;
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
  const quick={items:copy(items),getItems(){return copy(this.items)},replaceItems(value){this.items=copy(value)},
    snapshot:()=>({selectedByKind:{...selectedByKind}}),restoreGridSelection:(value)=>{selectedByKind.grid=value??null},clearGridSelection:()=>{selectedByKind.grid=null},
    setSelected:(kind,id)=>{selectedByKind[kind]=id},restoreSelection:value=>{for(const [kind,id] of Object.entries(value??{}))selectedByKind[kind]=id},
    adapters:new Map(),subscribe:()=>()=>{}};
  context.__XenQuick=quick;
  vm.createContext(context);
  context.__xenDronePersist={normalize:x=>Object.fromEntries(Object.entries(x||{}).filter(([k])=>["dronePreset","droneFixedHz","droneTimbre","droneRhythm"].includes(k)))};
  const rhythm=read('rhythm/02_bass_and_rack.js');
  vm.runInContext(rhythm.slice(rhythm.indexOf('let __xenSessionBassClip='),rhythm.indexOf('const __f48BassParamsEvent=')),context);
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
  const owner={getSongParams:()=>context.__roomParams,getSongDroneVolume:()=>droneVolume,setSongDroneVolume:v=>{droneVolume=v},getSongWave:()=>({preset:wavePreset,enabled:waveEnabled,volume:waveVolume}),updateNParams:v=>{roomUpdates.push(copy(v));Object.assign(context.__roomParams,v)},
    get waveSoundPreset(){return wavePreset},get waveSoundEnabled(){return waveEnabled},get waveSoundVolume(){return waveVolume},
    setWaveSoundPreset:v=>{wavePreset=v},setWaveSoundEnabled:v=>{waveEnabled=v},setWaveSoundVolume:v=>{waveVolume=v}};
  const attach=(value=owner)=>context.__bridge.attach(value);
  if(!deferAttach)attach();
  vm.runInContext(read('sessions/v2-session-store.js')+'\nglobalThis.__store=__createXenMetaSessionStore(storage,__XenQuick);',context);
  context.__XenMetaSessions=context.__store;
  return {context,s:context.__store,quick,storage,mixes,applied,roomUpdates,disk,items,panValues,attackValues,selectedByKind,attach,
    getDroneVolume:()=>droneVolume,setDroneVolume:v=>{droneVolume=v},getWave:()=>({preset:wavePreset,enabled:waveEnabled,volume:waveVolume}),dispatch:type=>events.get(type)?.(),runTimers:()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn())},timers,
    setEq:(key,value)=>context.__XenEQ.restore({[key]:value}),getEq:key=>context.__XenEQ.get(key)};
}
const sourceConfig=(particlePreset,wavePreset,volume)=>({particle:{particlePreset,particleVolume:.44},waveStarter:{preset:wavePreset,enabled:true,volume},keyboard:{keyboardHoldSoundPreset:'keys_'+particlePreset},pan:{particle:.12,wave:-.23,keyboard:.34},octaves:{particle:1,wave:2,keyboard:3}});
function ready(f){f.context.__bridge.defaultsReady();assert.equal(typeof f.s.flushWorkingCopy,'function')}
function working(f){return JSON.parse(f.disk.get('xensonar.working-session.v1')||'null')?.row??null}
function setLive(f,sources){f.context.__bridge.applySongSources(sources)}


const {test:nodeTest}=require('node:test');
nodeTest('Quick Save stores instrument Bass Timbre and Drone regardless of the Room Settings checkbox',()=>{
 const f=fixture();ready(f);f.context.__roomParams={bassVoice:'hollow',bassTone:.3,bassGrit:.27,bassResonance:.73,bassEnvelope:1.6,bassDecay:.72,bassSub:.6,dronePreset:'dark_sub',droneRhythm:'Synkope',droneFixedHz:65,droneTimbre:.2};
 assert.equal(f.s.saveFromQuickAsNew('Bass Drone',false),true);
 const row=f.s.snapshot().saved.at(-1);assert.equal(row.roomSettings,null);
 assert.equal(row.songPerformance.sources.bass.timbre.bassVoice,'hollow');
 assert.equal(row.songPerformance.sources.bass.timbre.bassResonance,.73);
 assert.equal(row.songPerformance.sources.drone.params.droneRhythm,'Synkope');
});
nodeTest('Named sessions A/B restore distinct bass sounds and drone state without Main Room snapshots',()=>{
 const f=fixture();ready(f);f.context.__roomParams={bassVoice:'hollow',bassTone:.3,bassGrit:.2,bassResonance:.7,bassEnvelope:1,bassDecay:1,bassSub:1,dronePreset:'dark_sub',droneFixedHz:55,droneRhythm:'Synkope'};
 assert.equal(f.s.saveFromQuickAsNew('A',false),true);
 Object.assign(f.context.__roomParams,{bassVoice:'sub',bassTone:.9,droneFixedHz:110,droneRhythm:'Off'});
 assert.equal(f.s.saveFromQuickAsNew('B',false),true);
 const a=f.s.snapshot().saved.find(e=>e.name==='A'),b=f.s.snapshot().saved.find(e=>e.name==='B');
 assert.equal(a.songPerformance.sources.bass.timbre.bassVoice,'hollow');assert.equal(b.songPerformance.sources.bass.timbre.bassVoice,'sub');
 assert.equal(f.s.activateSaved(a.id),true);
 assert.equal(f.context.__roomParams.bassVoice,'hollow');assert.equal(f.context.__roomParams.droneFixedHz,55);
});

nodeTest('P2 Drone volume is session-owned and restored independently from its synth settings',()=>{
 const f=fixture();ready(f);f.context.__roomParams={bassVoice:'hollow',dronePreset:'dark_sub',droneFixedHz:65};
 f.setDroneVolume(.17);assert.equal(f.s.saveFromQuickAsNew('Quiet Drone',false),true);
 f.setDroneVolume(.69);f.context.__roomParams.droneFixedHz=130;
 assert.equal(f.s.saveFromQuickAsNew('Loud Drone',false),true);
 const rows=f.s.snapshot().saved,a=rows.find(r=>r.name==='Quiet Drone'),b=rows.find(r=>r.name==='Loud Drone');
 assert.equal(a.songPerformance.sources.drone.volume,.17);assert.equal(b.songPerformance.sources.drone.volume,.69);
 assert.equal(f.s.activateSaved(a.id),true);assert.equal(f.getDroneVolume(),.17);
 assert.equal(f.s.activateSaved(b.id),true);assert.equal(f.getDroneVolume(),.69);
 assert.equal(f.s.activateSaved(a.id),true);assert.equal(f.getDroneVolume(),.17);
});
nodeTest('P2 session Bass envelope keeps a normalized clip snapshot for the active player, not a live-library reference',()=>{
 const f=fixture();ready(f);
 const clip={id:'bass-test-clip',name:'Original',events:[{id:'n1',startStep:0,durationSteps:2}],bars:1,stepsPerBar:16,generatorMeta:{kind:'manual'}};
 f.context.Pr=v=>JSON.parse(JSON.stringify(v));
 f.context.eH=id=>id===clip.id?clip:null;
 const params=f.context.__roomParams;Object.assign(params,{bassPatternMode:'clip',bassClipId:clip.id,bassVoice:'hollow',bassTone:.41,bassGrit:.14,bassResonance:.7,bassEnvelope:.8,bassDecay:1.2,bassSub:.6,dronePreset:'dark_sub'});
 assert.equal(f.s.saveFromQuickAsNew('Stable Clip'),true);
 const row=f.s.snapshot().saved.at(-1);assert.equal(row.songPerformance.sources.bass.clip.id,clip.id);
 clip.events[0].startStep=10;params.bassVoice='sub';
 assert.equal(f.s.activateSaved(row.id),true);
 assert.equal(params.bassVoice,'hollow');
 assert.equal(f.context.__xenSessionBassClip?.events[0].startStep,undefined); // lexical state is not a global property
 assert.equal(vm.runInContext('__xenSessionBassClip.events[0].startStep',f.context),0);
});
nodeTest('P2 malformed role records reject foreign clip IDs and invalid Drone volumes',()=>{
 const f=fixture();ready(f);
 const raw={version:1,entries:[],sources:{bass:{version:1,mode:'clip',clipId:'foreign',preset:'offbeat',timbre:{bassVoice:'sub'},clip:{id:'other',events:[]}}}};
 assert.throws(()=>vm.runInContext('__xenSongPerformanceSafe('+JSON.stringify(raw)+',[])',f.context),/Invalid song Bass role/);
 raw.sources={drone:{version:1,params:{dronePreset:'dark_sub'},volume:2}};
 assert.throws(()=>vm.runInContext('__xenSongPerformanceSafe('+JSON.stringify(raw)+',[])',f.context),/Invalid song Drone role/);
});

nodeTest('LD2 explicit Bass deletion tombstone stops a stale clip role without touching the Drone',()=>{
 const f=fixture();ready(f);
 Object.assign(f.context.__roomParams,{bassPatternMode:'clip',bassClipId:'deleted-clip',bassActive:true,droneFixedHz:73});
 f.context.__bridge.applySongSources({bass:null});
 assert.equal(f.context.__roomParams.bassPatternMode,'preset');
 assert.equal(f.context.__roomParams.bassClipId,'');
 assert.equal(f.context.__roomParams.bassActive,false);
 assert.equal(f.context.__roomParams.droneFixedHz,73);
});

nodeTest('Bass root and performance pitch survive A/B/A and cold reload without Room Settings',()=>{
 const f=fixture();ready(f);
 Object.assign(f.context.__roomParams,{bassVoice:'hollow',bassRootMode:'fixed',bassRootHz:55});
 f.context.__XenBassPitch.set(700);f.s.saveFromQuickAsNew('Root A',false);
 Object.assign(f.context.__roomParams,{bassRootMode:'auto',bassRootHz:73});
 f.context.__XenBassPitch.set(-1200);f.s.saveFromQuickAsNew('Root B',false);
 const a=f.s.snapshot().saved.find(r=>r.name==='Root A'),b=f.s.snapshot().saved.find(r=>r.name==='Root B');
 for(const row of [a,b,a]){
  assert.equal(f.s.activateSaved(row.id),true);
  assert.equal(f.context.__roomParams.bassRootMode,row===a?'fixed':'auto');
  assert.equal(f.context.__roomParams.bassRootHz,row===a?55:73);
  assert.equal(f.context.__XenBassPitch.snapshot(),row===a?700:-1200);
 }
 const cold=fixture([...f.disk]);ready(cold);assert.equal(cold.s.activateSaved(a.id),true);
 assert.equal(cold.context.__roomParams.bassRootHz,55);
 assert.equal(cold.context.__roomParams.bassRootMode,'fixed');
 assert.equal(cold.context.__XenBassPitch.snapshot(),700);
});

nodeTest('Bass root role rejects malformed explicit tuning state while legacy remains valid',()=>{
 const f=fixture();ready(f);
 const bass={version:1,mode:'preset',clipId:'',preset:'offbeat',timbre:{bassVoice:'sub'},clip:null,root:{mode:'fixed',hz:-20}};
 assert.throws(()=>vm.runInContext('__xenSongSourcesSafe('+JSON.stringify({bass})+')',f.context),/Invalid song Bass root/);
 delete bass.root;
 assert.doesNotThrow(()=>vm.runInContext('__xenSongSourcesSafe('+JSON.stringify({bass})+')',f.context));
});

nodeTest('Song owns the effective Bass tuning reference independently of optional Room Settings',()=>{
 const f=fixture();ready(f);const grid=f.context.__XenBassGrid;
 let reference={version:1,source:'nested',tuningId:'19edo',config:{sourceMode:'linked',linkedTuningId:'19edo'}},applied;
 grid.captureTuning=()=>reference;grid.applyTuning=v=>{applied=copy(v)};
 f.context.__roomParams={bassVoice:'hollow',bassRootMode:'fixed',bassRootHz:55};
 f.s.saveFromQuickAsNew('Nested Bass',false);const row=f.s.snapshot().saved.at(-1);
 assert.equal(row.songPerformance.sources.bass.tuning.tuningId,'19edo');
 reference={version:1,source:'main'};f.s.activateSaved(row.id);
 assert.equal(applied.tuningId,'19edo');assert.equal(applied.source,'nested');
});

nodeTest('Bass session restores the reference grid context after another song changes it',()=>{
 const f=fixture();ready(f);
 f.context.__roomParams={bassVoice:'sub',gridTuning:'19edo',gridBase:55,gridMode:'chromatic',manualGridMutedSteps:[1],manualGridStepOffsets:[0,.5]};
 f.s.saveFromQuickAsNew('Grid context',false);const row=f.s.snapshot().saved.at(-1);
 Object.assign(f.context.__roomParams,{gridTuning:'12edo',gridBase:220,manualGridMutedSteps:[]});
 f.s.activateSaved(row.id);assert.equal(f.context.__roomParams.gridTuning,'19edo');assert.equal(f.context.__roomParams.gridBase,55);
 assert.deepEqual(copy(f.context.__roomParams.manualGridMutedSteps),[1]);
});
