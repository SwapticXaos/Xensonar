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
  let timerId=0;
  let bassPitch=0,rootPitch=0,wavePreset='tape_halo',waveEnabled=false,waveVolume=.22;
  const context = {storage, console, queueMicrotask:()=>{}, setTimeout:()=>++timerId, clearTimeout:()=>{},
    localStorage:storage,
    requestAnimationFrame:()=>0,
    window:{addEventListener:()=>{},removeEventListener:()=>{}},
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
  const owner={getSongParams:()=>context.__roomParams,updateNParams:v=>{roomUpdates.push(copy(v));Object.assign(context.__roomParams,v)},
    get waveSoundPreset(){return wavePreset},get waveSoundEnabled(){return waveEnabled},get waveSoundVolume(){return waveVolume},
    setWaveSoundPreset:v=>{wavePreset=v},setWaveSoundEnabled:v=>{waveEnabled=v},setWaveSoundVolume:v=>{waveVolume=v}};
  const attach=()=>context.__bridge.attach(owner);
  if(!deferAttach)attach();
  vm.runInContext(read('sessions/v2-session-store.js')+'\nglobalThis.__store=__createXenMetaSessionStore(storage,__XenQuick);',context);
  context.__XenMetaSessions=context.__store;
  return {context,s:context.__store,quick,storage,mixes,applied,roomUpdates,disk,items,panValues,attackValues,selectedByKind,attach,
    getWave:()=>({preset:wavePreset,enabled:waveEnabled,volume:waveVolume}),
    setEq:(key,value)=>context.__XenEQ.restore({[key]:value}),getEq:key=>context.__XenEQ.get(key)};
}

function mustHaveP1(f) {
  assert.equal(typeof f.context.__bridge.captureSongMix,'function','real MainRoomBridge exposes captureSongMix(items)');
  assert.equal(typeof f.context.__bridge.applySongMix,'function','real MainRoomBridge exposes applySongMix(cfg,items)');
}
function replayRealP2eStrictMode(f){
  const source=read('rhythm/03_live_drum_bodies.js'),start=source.indexOf('function p2e('),end=source.indexOf('const h2e=',start);
  assert.ok(start>=0&&end>start,'actual p2e initializer is present');
  // React StrictMode replays the effect with the same hook ref. Run the actual
  // initializer body in this fixture while stubbing only its unrelated defaults.
  f.context.P={useRef:initial=>{f.context.__p2eRef??={current:initial};return f.context.__p2eRef},useEffect:effect=>effect()};
  f.context.__XenDroneStart={dronePreset:'default-drone'};
  f.context.__xenDronePersist={load:()=>({}),loadVolume:()=>.2};
  f.context.__f350IsRhythmKey=()=>false;
  f.context.m2e=()=>({drumActive:true,particlePreset:'default-particle'});
  vm.runInContext(source.slice(start,end)+';globalThis.__p2e=p2e;',f.context);
  const calls={drone:0,volume:0};
  const props={setDronePreset:()=>calls.drone++,setDroneVolume:()=>calls.volume++,updateNParams:value=>{
    f.roomUpdates.push(copy(value));Object.assign(f.context.__roomParams,value);
  },setWaveSoundVolume:f.context.__bridgeOwner?.setWaveSoundVolume,setWaveSoundPreset:f.context.__bridgeOwner?.setWaveSoundPreset};
  // Preserve the fixture's real owner setters while counting the initializer's
  // assignments separately from the subsequent session restore.
  props.setWaveSoundVolume=()=>calls.volume++;
  props.setWaveSoundPreset=()=>calls.wavePreset=(calls.wavePreset||0)+1;
  f.context.__p2e(props);f.context.__p2e(props);
  return calls;
}
const songMix=(placement,mixer,primaryMix)=>({version:2,entries:placement.primaryId?[{kind:'material',id:placement.primaryId,
  mix:{...primaryMix,pitch:0,att:0,nudgeMode:'granular',nudgeFeel:'soft'}}]:[],materialPlacement:placement,mixer});
const laneMix=(volume,pan,pitch,att)=>({volume,pan,pitch,att});
const materialItem=id=>({kind:'material',id,name:id});
const eqValue=(morph,base)=>({a:Array.from({length:360},(_,i)=>base+(i%5)*.01),b:Array(360).fill(-base),morph,bands:15,mode:'adaptive',low:-38,high:8,enabled:true});

test('P1 song-performance codec accepts v1 and writes v2 with bounded, item-owned placement',()=>{
  const f=fixture();
  const allowed={kind:'material',id:'m-primary',name:'Primary'};
  const legacy={version:1,entries:[{kind:'material',id:'m-primary',mix:{volume:.6,pan:-.25,pitch:12,att:.3},eq:null}],sources:null};
  const raw={version:2,entries:[...legacy.entries,{kind:'material',id:'m-secondary-1',mix:{volume:.3,pan:.2,pitch:-9,att:.1},eq:null}],
    materialPlacement:{primaryId:'m-primary',secondaryIds:['m-secondary-1'],primaryMuted:true,enabled:true},
    mixer:{bass:{volume:.4,pan:-.2,pitch:37.125,att:.4},rootFollow:{volume:.5,pan:.25,pitch:37.125,att:-.6},drum:{volume:.7,pan:-.1}},sources:null};
  // Codec is lexically scoped in the store source, so exercise through archive hydration.
  const archive={version:2,name:'Codec',items:[allowed,...f.items.slice(1)],saved:[{id:'song-v1',name:'v1',items:[allowed],colors:{},roomSettings:null,songPerformance:legacy},
    {id:'song-v2',name:'v2',items:f.items,colors:{},roomSettings:null,songPerformance:raw}]};
  const loaded=fixture([['xensonar.meta-sessions.v2',JSON.stringify(archive)]]);
  const songs=loaded.s.snapshot().saved;
  assert.equal(songs[0].songPerformance.version,1,'legacy v1 remains readable as its original envelope');
  assert.equal(songs[1].songPerformance.version,2);
  assert.deepEqual(JSON.parse(JSON.stringify(songs[1].songPerformance.materialPlacement)),raw.materialPlacement);
  assert.equal(songs[1].songPerformance.mixer.bass.pitch,37.125);
  assert.equal(songs[1].songPerformance.mixer.rootFollow.att,-.6);
  const neutral={...raw,entries:[],materialPlacement:{primaryId:null,secondaryIds:[],primaryMuted:false,enabled:false}};
  const neutralArchive={...archive,saved:[{id:'neutral',name:'Neutral',items:f.items,colors:{},roomSettings:null,songPerformance:neutral}]};
  const neutralLoaded=fixture([['xensonar.meta-sessions.v2',JSON.stringify(neutralArchive)]]);
  assert.equal(neutralLoaded.s.snapshot().error,'','explicit neutral placement is valid');
  assert.deepEqual(JSON.parse(JSON.stringify(neutralLoaded.s.snapshot().saved[0].songPerformance.materialPlacement)),neutral.materialPlacement);
  assert.ok(allowed);
});

const bootSources={particle:{particlePreset:'glass_harmonica',particleVolume:.41},
  waveStarter:{waveTimbreGradientX:'psy_wire',preset:'cloud_chime',enabled:true,volume:.63},
  keyboard:{keyboardHoldSoundPreset:'brass_glass'},pan:{particle:-.2,wave:.3,keyboard:.4},octaves:{particle:1,wave:2,keyboard:3}};
const bootItems=[{kind:'material',id:'m-primary',name:'Primary'}];
const bootPerformance={version:1,entries:[],sources:bootSources};
function bootArchive({roomSettings=null,performance=bootPerformance}={}){
  const row={id:'boot-song',name:'Boot Song',items:bootItems,colors:{},roomSettings,songPerformance:performance};
  return {version:2,name:row.name,items:bootItems,colors:{},roomSettings:null,saved:[row],loadedId:null,activePalette:{id:row.id,name:row.name,items:bootItems,colors:{}},dirty:false};
}
const bootSeed=(songSources,activePalette={id:'boot-song',name:'Boot Song',items:bootItems,colors:{}})=>({version:1,archiveRows:12,count:1,activePalette,...(songSources===undefined?{}:{songSources})});

test('M13 boot source restore waits for defaults and bridge attach in either order, then stays one-shot',()=>{
  for(const order of ['defaults-first','attach-first']){
    const seed=bootSeed(bootSources),raw=JSON.stringify(bootArchive());
    const f=fixture([['xensonar.meta-sessions.v2',raw],['xensonar.meta-sessions.m13.boot.v1',JSON.stringify(seed)]],bootItems,{deferAttach:true});
    if(order==='defaults-first')f.context.__bridge.defaultsReady();
    f.attach();
    if(order==='attach-first')f.context.__bridge.defaultsReady();
    assert.equal(f.context.__roomParams.particlePreset,bootSources.particle.particlePreset,order);
    assert.equal(f.context.__roomParams.keyboardHoldSoundPreset,bootSources.keyboard.keyboardHoldSoundPreset,order);
    assert.deepEqual(f.getWave(),{preset:'cloud_chime',enabled:true,volume:.63},order);
    assert.deepEqual(f.panValues,{material:0,bass:0,rootFollow:0,particle:-.2,wave:.3,keyboard:.4},order);
    assert.equal(f.s.isDormant(),true,'new seed restores without hydrating the archive');
    f.context.__bridge.patch({particlePreset:'manual-edit'});
    f.attach();
    assert.equal(f.context.__roomParams.particlePreset,'manual-edit','reattach must not replay boot state over later edits');
  }
});

test('older M13 seed resolves saved song sources from V2 once; invalid archive is left intact',()=>{
  const legacySeed=bootSeed();delete legacySeed.songSources;
  const raw=JSON.stringify(bootArchive());
  const f=fixture([['xensonar.meta-sessions.v2',raw],['xensonar.meta-sessions.m13.boot.v1',JSON.stringify(legacySeed)]],bootItems,{deferAttach:true});
  f.attach();f.context.__bridge.defaultsReady();
  assert.equal(f.context.__roomParams.particlePreset,bootSources.particle.particlePreset);
  assert.equal(f.s.isDormant(),false,'older seeds hydrate canonical V2 to find sources');
  assert.equal(f.disk.get('xensonar.meta-sessions.v2'),raw,'restore is read-only');

  const corrupt='{not-json';
  const bad=fixture([['xensonar.meta-sessions.v2',corrupt],['xensonar.meta-sessions.m13.boot.v1',JSON.stringify(legacySeed)]],bootItems,{deferAttach:true});
  bad.attach();bad.context.__bridge.defaultsReady();
  assert.equal(bad.disk.get('xensonar.meta-sessions.v2'),corrupt,'corrupt canonical archive remains untouched');
  assert.equal(bad.context.__roomParams.particlePreset,undefined,'failed hydration applies no partial defaults');
});

test('boot restoration falls back to old room settings when saved song sources are absent',()=>{
  const room={version:1,nParamsUI:{particlePreset:'room_particle',particleVolume:.27,waveTimbreGradientX:'room_wave',keyboardHoldSoundPreset:'room_keyboard'},
    wave:{preset:'room_wave_preset',enabled:true,volume:.37},pan:{particle:.1,wave:-.3,keyboard:.2},octaves:{particle:0,wave:1,keyboard:2}};
  const legacySeed=bootSeed();delete legacySeed.songSources;
  const f=fixture([['xensonar.meta-sessions.v2',JSON.stringify(bootArchive({roomSettings:room,performance:{version:1,entries:[],sources:null}}))],
    ['xensonar.meta-sessions.m13.boot.v1',JSON.stringify(legacySeed)]],bootItems,{deferAttach:true});
  f.attach();f.context.__bridge.defaultsReady();
  assert.equal(f.context.__roomParams.particlePreset,'room_particle');
  assert.equal(f.context.__roomParams.keyboardHoldSoundPreset,'room_keyboard');
  assert.deepEqual(f.getWave(),{preset:'room_wave_preset',enabled:true,volume:.37});
});

test('actual p2e StrictMode replay restores generated Fast Boot and plain archive sources once',()=>{
  const makeSavedDisk=fastBoot=>{
    const live=fixture();
    live.context.__bridge.applySongSources(bootSources);
    assert.equal(live.s.saveFromQuickAsNew('Reloadable Sources'),true);
    if(fastBoot)assert.equal(live.s.enableFastBoot(),true);
    const disk=[...live.disk.entries()];
    if(fastBoot)assert.ok(JSON.parse(live.disk.get('xensonar.meta-sessions.m13.boot.v1')).songSources,
      'enableFastBoot generated the compact source snapshot');
    else assert.equal(live.disk.has('xensonar.meta-sessions.m13.boot.v1'),false);
    return disk;
  };
  for(const fastBoot of [true,false]){
    const reloaded=fixture(makeSavedDisk(fastBoot));
    const calls=replayRealP2eStrictMode(reloaded);
    assert.equal(calls.drone,1,'initializer side effects run once under StrictMode replay');
    assert.equal(calls.wavePreset??0,0,'startup never forces a Wave Starter preset over the factory/work copy');
    assert.equal(reloaded.context.__roomParams.particlePreset,bootSources.particle.particlePreset,
      fastBoot?'generated boot seed restores after defaults':'archive restores after defaults');
    assert.equal(reloaded.context.__roomParams.keyboardHoldSoundPreset,bootSources.keyboard.keyboardHoldSoundPreset);
    assert.equal(reloaded.getWave().preset,'cloud_chime');
    assert.equal(reloaded.getWave().enabled,true);
    assert.equal(reloaded.getWave().volume,.63);
    assert.equal(reloaded.panValues.wave,.3);
    assert.equal(reloaded.s.isDormant(),fastBoot,'Fast Boot remains dormant; normal boot reads archive eagerly');
    reloaded.context.__bridge.patch({particlePreset:'post-restore-user-value'});
    reloaded.attach();
    assert.equal(reloaded.context.__roomParams.particlePreset,'post-restore-user-value',
      'later bridge attach does not replay startup sources over user changes');
  }
});

test('Main Room Song Mix capture and apply preserve primary plus two independent secondary slots',()=>{
  const f=fixture();mustHaveP1(f);
  const placement={primaryId:'m-primary',secondaryIds:['m-secondary-1','m-secondary-2'],primaryMuted:true,enabled:true};
  // Main Room track settings are represented by the bridge owner; exact values
  // are captured by the real bridge and later reapplied through its real owner.
  const configured=songMix(placement,{bass:{volume:.31,pan:-.21,pitch:37.125,att:.41},
    rootFollow:{volume:.62,pan:.24,pitch:37.125,att:-.37},drum:{volume:.77,pan:.18}},{volume:.53,pan:-.44});
  f.context.__bridge.applySongMix(configured,f.items);
  const captured=f.context.__bridge.captureSongMix(f.items);
  assert.deepEqual(JSON.parse(JSON.stringify(captured.materialPlacement)),placement);
  assert.deepEqual(JSON.parse(JSON.stringify(captured.mixer)),configured.mixer);
  assert.deepEqual(JSON.parse(JSON.stringify(captured.primaryMix)),{volume:.53,pan:-.44});
  f.context.__XenMaterialPrimarySwitch.selectionChanged('m-primary');
  assert.equal(f.context.__XenMaterialPrimarySwitch.snapshot(),true,'restored primary mute survives the same selection commit');
  // Deliberately make the material VoiceMix primary's per-ID display values
  // disagree with the Main Room primary owner. The archive must serialize the
  // bridge's active primary level/pan while retaining the ID mix's pitch/attack.
  f.context.__voice.restoreSession(f.items,{'m-primary':{volume:.91,pan:.74,pitch:22.5,att:.33,nudgeMode:'vinyl',nudgeFeel:'hard'}});
  assert.equal(f.s.saveFromQuickAsNew('Primary Capture'),true);
  const primary=f.s.snapshot().saved[0].songPerformance.entries.find(e=>e.id==='m-primary').mix;
  assert.equal(primary.volume,.53,'primary volume comes from the live Main Room owner');
  assert.equal(primary.pan,-.44,'primary pan comes from the live Main Room owner');
  assert.equal(primary.pitch,22.5,'per-ID pitch remains attached to the material');
  assert.equal(primary.att,.33,'per-ID attack remains attached to the material');
});

test('real material voice mixer restores precise pitch and attack; archive reload retains mix and placement',()=>{
  const f=fixture();mustHaveP1(f);
  f.context.__bridge.applySongMix(songMix({primaryId:'m-primary',secondaryIds:['m-secondary-1','m-secondary-2'],primaryMuted:false,enabled:true},
    {bass:{volume:.31,pan:-.21,pitch:37.125,att:.41},rootFollow:{volume:.62,pan:.24,pitch:37.125,att:-.37},drum:{volume:.77,pan:.18}},{volume:.53,pan:-.44}),f.items);
  f.context.__voice.restoreSession(f.items,[
    {id:'m-primary',volume:.82,pan:.16,pitch:21.5,att:.73,nudgeMode:'vinyl',nudgeFeel:'hard'},
  ].reduce((o,x)=>(o[x.id]=x,o),{}));
  assert.equal(f.context.__voice.get('m-primary').pitch,21.5);
  assert.equal(f.context.__voice.get('m-primary').att,.73);
  assert.equal(f.s.saveFromQuickAsNew('Archive'),true);
  const id=f.s.snapshot().saved[0].id;
  const reloaded=fixture([['xensonar.meta-sessions.v2',f.storage.getItem('xensonar.meta-sessions.v2')]]);
  assert.equal(reloaded.s.snapshot().saved[0].songPerformance.mixer.bass.pitch,37.125);
  assert.equal(reloaded.s.snapshot().saved[0].songPerformance.mixer.rootFollow.pitch,37.125);
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.s.snapshot().saved[0].songPerformance.materialPlacement.secondaryIds)),['m-secondary-1','m-secondary-2']);
  assert.equal(reloaded.s.activateSaved(id),true,JSON.stringify(reloaded.s.snapshot().error));
  assert.equal(reloaded.context.__voice.get('m-primary').pitch,21.5);
});

test('EQ canonical curve survives no-edit capture and restore',()=>{
  const f=fixture();
  const canonical={a:Array.from({length:360},(_,i)=>i%4===0?-.7:i%4===1?-.1:i%4===2?.25:.8),
    b:Array.from({length:360},(_,i)=>i%3===0?.2:i%3===1?.4:-.3),morph:.37,bands:17,mode:'raster',low:-42,high:9,enabled:true};
  f.setEq('material:m-primary',canonical);
  assert.equal(f.s.saveFromQuickAsNew('EQ'),true);
  const row=f.s.snapshot().saved[0];
  assert.deepEqual(JSON.parse(JSON.stringify(row.songPerformance.entries.find(e=>e.id==='m-primary').eq)),{...canonical,manualCenters:[]});
  f.setEq('material:m-primary',{...canonical,morph:.9});
  assert.equal(f.s.activateSaved(row.id),true,JSON.stringify(f.s.snapshot().error));
  assert.deepEqual(JSON.parse(JSON.stringify(f.getEq('material:m-primary'))),{...canonical,manualCenters:[]});
});

test('legacy null performance clears editor state without carrying prior song mix forward',()=>{
  const items=[{kind:'material',id:'m-primary',name:'Primary'},...[
    {kind:'bass',id:'bass-1',name:'Bass'},{kind:'rootFollow',id:'rfl-1',name:'Root Follow'},{kind:'drum',id:'drum-1',name:'Drums'}]];
  const archive={version:2,name:'Legacy Empty',items,colors:{},roomSettings:null,songPerformance:null,loadedId:'legacy-empty',dirty:false,
    saved:[{id:'legacy-empty',name:'Legacy Empty',items,colors:{},roomSettings:null,songPerformance:null}]};
  const f=fixture([['xensonar.meta-sessions.v2',JSON.stringify(archive)]],items);
  f.context.__voice.restoreSession(items,{'m-primary':{volume:.88,pan:.6,pitch:88,att:.8,nudgeMode:'vinyl',nudgeFeel:'hard'}});
  f.setEq('material:m-primary',{a:Array(360).fill(.7),b:Array(360).fill(.3),morph:.75,bands:20,mode:'raster',low:-48,high:6,enabled:true});
  assert.equal(f.s.activateSaved('legacy-empty'),true,JSON.stringify(f.s.snapshot().error));
  assert.equal(f.s.snapshot().songPerformance,null);
  assert.equal(f.context.__voice.get('m-primary').pitch,0,'missing legacy performance restores neutral per-material pitch');
  assert.equal(f.context.__voice.get('m-primary').att,0,'missing legacy performance restores neutral per-material attack');
  assert.equal(f.getEq('material:m-primary').morph,0,'missing legacy performance restores neutral per-material EQ');
  assert.equal(f.context.__roomParams.bassVolume,.1,'legacy null restores the current Bass default');
  assert.equal(f.context.__roomParams.drumVolume,.52,'legacy null restores the current Drum default');
});

test('malformed placement, duplicate slots, and foreign material IDs are rejected',()=>{
  const f=fixture();
  const base={version:2,entries:[{kind:'material',id:'m-primary',mix:{volume:1,pan:0,pitch:0,att:0},eq:null}],
    materialPlacement:{primaryId:'m-primary',secondaryIds:[],primaryMuted:false,enabled:true},
    mixer:{bass:{volume:1,pan:0,pitch:0,att:0},rootFollow:{volume:1,pan:0,pitch:0,att:0},drum:{volume:1,pan:0}},primaryMix:{volume:1,pan:0}};
  const archiveFor=performance=>({version:2,name:'Bad',items:f.items,saved:[{id:'bad',name:'Bad',items:f.items,colors:{},roomSettings:null,songPerformance:performance}]});
  const cases=[
    {...base,materialPlacement:{...base.materialPlacement,secondaryIds:['m-secondary-1','m-secondary-2','m-secondary-1']}},
    {...base,materialPlacement:{...base.materialPlacement,secondaryIds:['not-in-song']}},
    {...base,materialPlacement:{...base.materialPlacement,primaryId:'not-in-song'}},
    {...base,materialPlacement:{...base.materialPlacement,secondaryIds:'m-secondary-1'}},
    {...base,entries:[]},
    {...base,materialPlacement:{primaryId:null,secondaryIds:[],primaryMuted:false,enabled:true}},
  ];
  for(const value of cases){
    const encoded=JSON.stringify(archiveFor(value));
    const bad=fixture([['xensonar.meta-sessions.v2',encoded]],f.items);
    assert.match(bad.s.snapshot().error,/song performance|placement|Invalid|Missing placed/i);
    assert.equal(bad.s.saveFromQuickAsNew('Should Refuse'),false,'malformed archive must not be overwritten');
    assert.equal(bad.storage.getItem('xensonar.meta-sessions.v2'),encoded);
  }
});

test('deleting a material entry prunes it from saved secondary placement',()=>{
  const f=fixture();
  f.context.__bridge.applySongMix(songMix({primaryId:'m-primary',secondaryIds:['m-secondary-1','m-secondary-2'],primaryMuted:false,enabled:true},
    {bass:{volume:.1,pan:0,pitch:0,att:0},rootFollow:{volume:.65,pan:0,pitch:0,att:0},drum:{volume:.52,pan:0}},{volume:.65,pan:0}),f.items);
  assert.equal(f.s.saveFromQuickAsNew('Placement'),true);
  const id=f.s.snapshot().saved[0].id;
  assert.equal(f.s.load(id),true);
  assert.equal(f.s.removeItem({kind:'material',id:'m-secondary-1'}),true);
  assert.deepEqual(JSON.parse(JSON.stringify(f.s.snapshot().songPerformance.materialPlacement.secondaryIds)),['m-secondary-2']);
});

test('failed Engage restores A live mixer, selected IDs, layers, and dormant B per-ID EQ/mix',async()=>{
  const f=fixture();
  const aItems=[materialItem('m-primary'),materialItem('m-secondary-1'),f.items[3],f.items[4],f.items[5]];
  const bItems=[materialItem('m-secondary-2'),materialItem('m-secondary-1'),f.items[3],f.items[4],f.items[5]];
  const mixerA={bass:laneMix(.24,-.22,37.125,.41),rootFollow:laneMix(.61,.31,37.125,-.27),drum:{volume:.73,pan:-.14}};
  const mixerB={bass:laneMix(.42,.18,-20.5,-.3),rootFollow:laneMix(.55,-.4,91.25,.66),drum:{volume:.31,pan:.46}};
  const placementA={primaryId:'m-primary',secondaryIds:['m-secondary-1'],primaryMuted:true,enabled:true};
  const placementB={primaryId:'m-secondary-2',secondaryIds:['m-secondary-1'],primaryMuted:false,enabled:true};
  const setVoice=(id,values)=>f.context.__voice.restoreSession([materialItem(id)],{[id]:values});
  const setSelection=id=>{f.quick.setSelected('material',id);f.quick.setSelected('bass','bass-1');f.quick.setSelected('rootFollow','rfl-1');f.quick.setSelected('drum','drum-1')};
  f.quick.replaceItems(aItems);
  f.context.__bridge.applySongMix(songMix(placementA,mixerA,{volume:.49,pan:-.32}),aItems);
  setVoice('m-primary',{volume:.49,pan:-.32,pitch:16.25,att:.43,nudgeMode:'vinyl',nudgeFeel:'hard'});
  setVoice('m-secondary-1',{volume:.72,pan:.21,pitch:-31.5,att:-.54,nudgeMode:'granular',nudgeFeel:'soft'});
  f.setEq('material:m-primary',eqValue(.21,.2));f.setEq('material:m-secondary-1',eqValue(.42,-.1));
  setSelection('m-primary');
  assert.equal(f.s.saveFromQuickAsNew('Live A'),true);const aId=f.s.snapshot().saved.find(x=>x.name==='Live A').id;

  f.quick.replaceItems(bItems);
  f.context.__bridge.applySongMix(songMix(placementB,mixerB,{volume:.84,pan:.57}),bItems);
  setVoice('m-secondary-2',{volume:.84,pan:.57,pitch:333.125,att:.81,nudgeMode:'vinyl',nudgeFeel:'hard'});
  setVoice('m-secondary-1',{volume:.38,pan:-.47,pitch:51.75,att:.29,nudgeMode:'granular',nudgeFeel:'soft'});
  f.setEq('material:m-secondary-2',eqValue(.86,.55));f.setEq('material:m-secondary-1',eqValue(.67,.35));
  setSelection('m-secondary-2');
  assert.equal(f.s.saveFromQuickAsNew('Draft B'),true);const bId=f.s.snapshot().saved.find(x=>x.name==='Draft B').id;

  // Put A back live while B's own per-ID state remains dormant and distinct
  // from the copy saved in B. Failure must restore this dormant state too.
  f.quick.replaceItems(aItems);
  f.context.__bridge.applySongMix(songMix(placementA,mixerA,{volume:.49,pan:-.32}),aItems);
  setVoice('m-primary',{volume:.49,pan:-.32,pitch:16.25,att:.43,nudgeMode:'vinyl',nudgeFeel:'hard'});
  setVoice('m-secondary-1',{volume:.72,pan:.21,pitch:-31.5,att:-.54,nudgeMode:'granular',nudgeFeel:'soft'});
  setVoice('m-secondary-2',{volume:.13,pan:-.62,pitch:-222.75,att:-.19,nudgeMode:'granular',nudgeFeel:'soft'});
  f.setEq('material:m-primary',eqValue(.21,.2));f.setEq('material:m-secondary-1',eqValue(.42,-.1));
  f.setEq('material:m-secondary-2',eqValue(.11,-.6));setSelection('m-primary');
  const union=[...new Map([...aItems,...bItems].map(item=>[item.kind+'\0'+item.id,item])).values()];
  const observe=()=>({quick:f.quick.getItems(),selection:f.quick.snapshot().selectedByKind,room:f.context.__bridge.capture(),
    songMix:f.context.__bridge.captureSongMix(f.quick.getItems()),layers:[...f.context.__XenMaterialLayers.snapshot()],
    primaryMuted:f.context.__XenMaterialPrimarySwitch.snapshot(),voice:copy(f.context.__voice.snapshot()),
    eq:JSON.parse(JSON.stringify(f.context.__XenEQ.capture(union)))});
  const before=observe();
  const originalSet=f.storage.setItem.bind(f.storage);
  f.storage.setItem=(key,value)=>{if(key==='xensonar.meta-sessions.v2')throw Error('QuotaExceeded');return originalSet(key,value)};
  assert.equal(f.s.activateSaved(bId),false);
  assert.match(f.s.snapshot().error,/QuotaExceeded/);
  assert.deepEqual(observe(),before,'failed target activation restores every live owner and selection');
  assert.notEqual(f.context.__voice.get('m-secondary-2').pitch,333.125,'dormant live B was not replaced by saved B');
  assert.equal(f.s.snapshot().saved.find(x=>x.id===aId).name,'Live A');
});

test('deleting a material reference prunes placement in saved songs and the current draft',async()=>{
  const a=materialItem('m-primary'),removed=materialItem('m-secondary-1'),b=materialItem('m-secondary-2');
  const makePerf=(ownerItems,primaryId,secondaryIds,enabled=true)=>({version:2,
    entries:ownerItems.map(item=>({kind:'material',id:item.id,mix:{volume:.5,pan:0,pitch:0,att:0,nudgeMode:'granular',nudgeFeel:'soft'},eq:null})),
    materialPlacement:{primaryId,secondaryIds,primaryMuted:false,enabled},
    mixer:{bass:laneMix(.1,0,0,0),rootFollow:laneMix(.65,0,0,0),drum:{volume:.52,pan:0}},sources:null});
  const items=[a,removed,b];
  const archive={version:2,name:'Draft',items,colors:{},roomSettings:null,songPerformance:makePerf(items,'m-secondary-1',['m-primary']),loadedId:'saved-a',dirty:true,
    saved:[{id:'saved-a',name:'Saved A',items,colors:{},roomSettings:null,songPerformance:makePerf(items,'m-secondary-1',['m-primary'])},
      {id:'saved-b',name:'Saved B',items:[a,removed],colors:{},roomSettings:null,songPerformance:makePerf([a,removed],'m-primary',['m-secondary-1'])}],
    activePalette:{id:'saved-a',name:'Saved A',items,colors:{}}};
  const f=fixture([['xensonar.meta-sessions.v2',JSON.stringify(archive)]],items);
  const result=await f.s.deleteReferencedLibraryEntry({kind:'material',id:'m-secondary-1',name:'Layer'},async()=>true,async()=>true);
  assert.equal(result.status,'deleted');
  const state=f.s.snapshot();
  for(const [i,owner] of [...state.saved,state].entries()){
    assert.equal(owner.items.some(item=>item.id==='m-secondary-1'),false);
    assert.equal(owner.songPerformance.entries.some(entry=>entry.id==='m-secondary-1'),false);
    if(i===0||i===2){assert.equal(owner.songPerformance.materialPlacement.primaryId,null);assert.equal(owner.songPerformance.materialPlacement.enabled,false)}
    else{assert.equal(owner.songPerformance.materialPlacement.primaryId,'m-primary');assert.equal(owner.songPerformance.materialPlacement.enabled,true)}
    assert.deepEqual(JSON.parse(JSON.stringify(owner.songPerformance.materialPlacement.secondaryIds)),i===1?[]:['m-primary']);
  }
});

test('two disjoint 240-material songs engage; a quota failure rolls the full 480-ID union back',()=>{
  const rack=prefix=>Array.from({length:240},(_,i)=>materialItem(`${prefix}-${String(i).padStart(3,'0')}`));
  const rackA=rack('rack-a'),rackB=rack('rack-b'),f=fixture(undefined,rackA);
  const placement=(primaryId)=>({primaryId,secondaryIds:[],primaryMuted:false,enabled:true});
  const mixer={bass:laneMix(.1,0,0,0),rootFollow:laneMix(.65,0,0,0),drum:{volume:.52,pan:0}};
  const applyRack=(items,volume,pan)=>f.context.__bridge.applySongMix(songMix(placement(items[0].id),mixer,{volume,pan}),items);
  f.quick.replaceItems(rackA);applyRack(rackA,.42,-.23);f.quick.setSelected('material',rackA[0].id);
  assert.equal(f.s.saveFromQuickAsNew('240 A'),true);
  const idA=f.s.snapshot().saved.find(row=>row.name==='240 A').id;
  f.quick.replaceItems(rackB);applyRack(rackB,.81,.36);f.quick.setSelected('material',rackB[0].id);
  assert.equal(f.s.saveFromQuickAsNew('240 B'),true);
  const idB=f.s.snapshot().saved.find(row=>row.name==='240 B').id;
  assert.equal(f.s.snapshot().saved.find(row=>row.id===idA).songPerformance.entries.length,240);
  assert.equal(f.s.snapshot().saved.find(row=>row.id===idB).songPerformance.entries.length,240);

  f.quick.replaceItems(rackA);applyRack(rackA,.42,-.23);f.quick.setSelected('material',rackA[0].id);
  assert.equal(f.s.activateSaved(idB),true,'valid disjoint racks switch successfully');
  assert.equal(f.quick.getItems()[0].id,rackB[0].id);
  assert.equal(f.context.__roomParams.materialLoopId,rackB[0].id);
  assert.equal(f.s.activateSaved(idA),true);
  assert.equal(f.quick.getItems()[0].id,rackA[0].id);

  // Keep distinct dormant per-ID values in both disjoint racks. The failed
  // transition reaches the session commit only after replacing Quick rows and
  // applying B; rollback must admit all 480 refs without relaxing archive cap.
  f.context.__voice.restoreSession([rackA[1]],{[rackA[1].id]:{volume:.17,pan:.23,pitch:-88.125,att:.38,nudgeMode:'vinyl',nudgeFeel:'hard'}});
  f.context.__voice.restoreSession([rackB[1]],{[rackB[1].id]:{volume:.29,pan:-.31,pitch:111.75,att:-.42,nudgeMode:'granular',nudgeFeel:'soft'}});
  f.setEq('material:'+rackA[1].id,eqValue(.27,.14));f.setEq('material:'+rackB[1].id,eqValue(.78,-.36));
  const union=[...rackA,...rackB];
  const observe=()=>({quick:f.quick.getItems(),selection:f.quick.snapshot().selectedByKind,room:f.context.__bridge.capture(),
    songMix:f.context.__bridge.captureSongMix(f.quick.getItems()),voice:JSON.parse(JSON.stringify(f.context.__voice.snapshot())),
    eq:JSON.parse(JSON.stringify(f.context.__XenEQ.capture(union)))});
  const before=observe(),raw=f.storage.getItem('xensonar.meta-sessions.v2');
  const originalSet=f.storage.setItem.bind(f.storage);
  f.storage.setItem=(key,value)=>{if(key==='xensonar.meta-sessions.v2')throw Error('QuotaExceeded');return originalSet(key,value)};
  assert.equal(f.s.activateSaved(idB),false);
  assert.match(f.s.snapshot().error,/QuotaExceeded/);
  assert.deepEqual(observe(),before,'quota failure restores the complete A/B owner state');
  assert.equal(f.storage.getItem('xensonar.meta-sessions.v2'),raw,'failed Engage leaves the archive untouched');
});

test('archived song performance above 240 entries is rejected by the default codec',()=>{
  const items=Array.from({length:241},(_,i)=>materialItem('too-many-'+i));
  const entries=items.map(item=>({kind:'material',id:item.id,mix:{volume:.5,pan:0,pitch:0,att:0,nudgeMode:'granular',nudgeFeel:'soft'},eq:null}));
  const performance={version:1,entries,sources:null};
  const archive={version:2,name:'Too Many',items,colors:{},roomSettings:null,songPerformance:null,
    saved:[{id:'too-many',name:'Too Many',items,colors:{},roomSettings:null,songPerformance:performance}]};
  const encoded=JSON.stringify(archive),f=fixture([['xensonar.meta-sessions.v2',encoded]],items);
  assert.match(f.s.snapshot().error,/Invalid song performance snapshot/);
  assert.equal(f.s.saveFromQuickAsNew('Must not overwrite'),false);
  assert.equal(f.storage.getItem('xensonar.meta-sessions.v2'),encoded);
});

test('editor B activation leaves independently captured live A mix intact',()=>{
  const f=fixture();
  f.context.__bridge.applySongMix(songMix({primaryId:'m-primary',secondaryIds:[],primaryMuted:false,enabled:true},
    {bass:{volume:.3,pan:0,pitch:0,att:0},rootFollow:{volume:.4,pan:0,pitch:0,att:0},drum:{volume:.5,pan:0}},{volume:.6,pan:0}),f.items);
  f.context.__voice.restoreSession(f.items,{'m-primary':{volume:.63,pan:-.2,pitch:9,att:.4}});
  assert.equal(f.s.saveFromQuickAsNew('A'),true);const a=f.s.snapshot().saved[0];
  f.context.__voice.restoreSession(f.items,{'m-primary':{volume:.82,pan:.3,pitch:27,att:-.4}});
  assert.equal(f.s.saveFromQuickAsNew('B'),true);const [savedA,savedB]=f.s.snapshot().saved;
  assert.equal(savedA.songPerformance.entries.find(e=>e.id==='m-primary').mix.pitch,9);
  assert.equal(savedB.songPerformance.entries.find(e=>e.id==='m-primary').mix.pitch,27);
  assert.equal(f.s.activateSaved(a.id),true,JSON.stringify(f.s.snapshot().error));
  const livePitch=f.context.__voice.get('m-primary').pitch;
  assert.equal(f.s.load(savedB.id),true,'loading B into the editor does not engage it');
  assert.equal(f.context.__voice.get('m-primary').pitch,livePitch,'B stays editor-only while A remains live');
  f.context.__voice.restoreSession(f.items,{'m-primary':{volume:.22,pan:.1,pitch:44,att:.1}});
  assert.equal(f.s.save(savedB.id),true);
  assert.equal(f.s.snapshot().saved.find(x=>x.id===savedB.id).songPerformance.entries.find(e=>e.id==='m-primary').mix.pitch,27,
    'saving editor B preserves B instead of capturing changed live A');
});

test('save refuses an unsettled live downbeat without changing the archive, then stores the reached value',async()=>{
 const f=fixture();
 assert.equal(f.s.saveFromQuickAsNew('Before'),true);
 const before=f.storage.getItem('xensonar.meta-sessions.v2');
 const mix=f.context.__voice;
 mix.setMode('m-primary','vinyl');mix.setFeel('m-primary','hard');
 let resolve;
 const detach=mix.registerTransport('m-primary',{target(){},mode(){},feel(){},beginGesture(){},endGesture(){return new Promise(done=>{resolve=done})}});
 mix.beginGesture('m-primary','drag');mix.set('m-primary','att',1,'drag');
 assert.equal(f.s.saveFromQuickAsNew('During'),false);
 assert.match(f.s.snapshot().error,/Nudge position is still settling/);
 mix.endGesture('m-primary','drag');
 assert.equal(f.s.saveFromQuickAsNew('Pending'),false);
 assert.equal(f.storage.getItem('xensonar.meta-sessions.v2'),before);
 resolve(2.001);for(let i=0;i<5;i++)await Promise.resolve();
 assert.equal(f.s.saveFromQuickAsNew('Reached'),true);
 const saved=f.s.snapshot().saved.find(row=>row.name==='Reached');
 assert.equal(saved.songPerformance.entries.find(row=>row.id==='m-primary').mix.att,2.001);
 const reload=fixture([...f.disk]);
 assert.equal(reload.s.activateSaved(saved.id),true);
 assert.equal(reload.context.__voice.get('m-primary').att,2.001);
 detach();
});

test('discovery Return restores three actual live voices even when primary is outside Quickrack',async()=>{
 const f=fixture();
 f.context.requestAnimationFrame=callback=>{callback(0);return 1};
 f.context.__f351BeginPreview=()=>({restore(){},finish(){}});
 f.quick.cancelActivation=()=>{};f.quick.restoreSelection=value=>Object.assign(f.selectedByKind,value);
 const out={kind:'material',id:'outside-rack',name:'Outside'},all=[...f.items,out];
 f.context.__bridge.applySongMix(songMix({primaryId:out.id,secondaryIds:['m-secondary-1','m-secondary-2'],primaryMuted:true,enabled:true},
  {bass:laneMix(.27,.1,20,.2),rootFollow:laneMix(.33,-.2,-30,-.4),drum:{volume:.5,pan:.3}},{volume:.61,pan:-.34}),all);
 f.context.__voice.restoreSession(all,{[out.id]:{volume:.2,pan:.3,pitch:33.125,att:.13},'m-secondary-1':{volume:.7,pan:.8,pitch:20,att:-.15}});
 f.setEq('material:'+out.id,eqValue(.31,.2));f.selectedByKind.material=out.id;
 const observe=()=>({room:f.context.__bridge.capture(),mix:f.context.__bridge.captureSongMix(all),
  primary:{...copy(f.context.__voice.get(out.id)),...f.context.__bridge.captureSongMix(all).primaryMix},extra:copy(f.context.__voice.get('m-secondary-1')),eq:copy(f.getEq('material:'+out.id)),quick:f.quick.getItems()});
 const before=observe(),preview=f.s.beginSuggestion();
 f.context.__roomParams.materialLoopId='m-primary';f.context.__roomParams.materialLoopActive=false;
 f.context.__XenMaterialLayers.clear();f.context.__XenMaterialPrimarySwitch.reset();
 f.context.__voice.set(out.id,'pitch',-99);f.setEq('material:'+out.id,eqValue(.9,-.3));
 await preview.restore();
 assert.deepEqual(observe(),before,'Return uses complete performance contract and restores exact live primary and extras');
});

test('AUDIT: manually moved EQ filter center must survive named session save/restore',()=>{
 const f=fixture();const key='material:m-primary';const raw={...eqValue(.4,.2),manualCenters:[311,642,1210]};
 f.setEq(key,raw);assert.deepEqual(Array.from(f.getEq(key).manualCenters),raw.manualCenters);
 assert.equal(f.s.saveFromQuickAsNew('P10 Manual Centers'),true);
 const saved=f.s.snapshot().saved.at(-1),stored=saved.songPerformance.entries.find(e=>e.id==='m-primary').eq;
 assert.deepEqual(Array.from(stored.manualCenters||[]),[311,642,1210]);
 f.setEq(key,{...raw,manualCenters:[450,850,1650]});assert.equal(f.s.activateSaved(saved.id),true);
 assert.deepEqual(Array.from(f.getEq(key).manualCenters),[311,642,1210]);
});

test('P10 manual EQ positions use bounded numeric slots and preserve null gaps',()=>{
 const f=fixture(),key='material:m-primary';
 const source={...eqValue(.27,.18),manualCenters:[NaN,-45,345,null,Infinity,33000,...Array(29).fill(816)]};
 f.setEq(key,source);
 assert.equal(f.s.saveFromQuickAsNew('Safe manual centers'),true);
 const stored=f.s.snapshot().saved.at(-1).songPerformance.entries.find(row=>row.id==='m-primary').eq.manualCenters;
 assert.equal(stored.length,24,'DSP accepts at most 24 draggable centers');
 assert.deepEqual(stored.slice(0,7),[null,20,345,null,null,20000,816],
  'invalids become null and out-of-range numeric positions are bounded');
});
