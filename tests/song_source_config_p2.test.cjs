'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(path.resolve(__dirname,'..'),'src',name),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
function loadFactoryDependencies(context,meta){
 context.window??={};context.localStorage??={getItem:()=>null,setItem(){}};
 const demoStart=meta.indexOf('const __XenStarterDemoIds=');
 if(demoStart>=0)vm.runInContext(meta.slice(demoStart,meta.indexOf('/* One demand',demoStart)),context);
 const defaultsStart=meta.indexOf('const __XenFactoryStartSounds=');
 if(defaultsStart>=0)vm.runInContext(meta.slice(defaultsStart,meta.indexOf('});',defaultsStart)+3),context);
 const addons=read('handoff/00_chat_feature_addons.js'),bassStart=addons.indexOf('const __XenBassGrid=');
 if(bassStart>=0)vm.runInContext(addons.slice(bassStart,addons.indexOf('})();',bassStart)+5),context);
}
const holdDefaults=true;
const factoryWave=holdDefaults?'psylab:factory:Barber Spiral':'tape_halo';
const factoryKeyboard=holdDefaults?'nodal:factory:troodle':'tape_halo';

function setup(){
 const disk=new Map(),prepared=[],patches=[];let notes=0,timer=0;
 const context={console,Math,JSON,setTimeout:()=>++timer,clearTimeout(){},requestAnimationFrame:()=>0,
  localStorage:{getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)},
  __entPreparedConfig:(config,surface)=>{prepared.push({config:copy(config),surface})},
  AudioContext:class{constructor(){notes++;throw Error('Source restore must not create audio')}},
  __XenStarterInstalled:false,__xenRestoredWorkspace4:{},__XenQuick:{adapters:new Map()},
  __XenOctaves:{snapshot:()=>({particle:1,wave:2,keyboard:3}),set(){}},
  __XenMetaSessions:{restoreBootSources(){}},
 };
 context.window={localStorage:context.localStorage,addEventListener(){}};vm.createContext(context);
 const config=read('runtime/instrument/10_entrophon_and_voice_control.js');
 vm.runInContext(config.slice(0,config.indexOf('/* Admission must describe'))+';globalThis.ent=__XenEntrophonSongConfig;globalThis.change=dG;globalThis.subscribe=Kie;',context);
 const pan=read('mix/01_pan.js');vm.runInContext(pan.slice(0,pan.indexOf('})();')+5)+';globalThis.pan=__XenPan;',context);
 const bridge=read('mix/03_meta_menu__before_v2-session-store.js'),start=bridge.indexOf('const __XenMainRoomSessionBridge=');
 vm.runInContext(bridge.slice(start,bridge.indexOf('})();',start)+5)+';globalThis.bridge=__XenMainRoomSessionBridge;',context);
 let current={particlePreset:'glass',agentVolumes:{0:.23,1:.72},keyboardHoldSoundPreset:'entrophon'};
 const owner={getSongParams:()=>current,nParamsUI:{particlePreset:'stale'},waveSoundPreset:'entrophon',waveSoundEnabled:true,waveSoundVolume:.45,
  updateNParams:patch=>{patches.push(copy(patch));current={...current,...patch}},setWaveSoundPreset(v){this.waveSoundPreset=v},setWaveSoundEnabled(v){this.waveSoundEnabled=v},setWaveSoundVolume(v){this.waveSoundVolume=v}};
 context.bridge.attach(owner);
 return {context,disk,prepared,patches,notes:()=>notes,owner};
}
test('source capture includes detached Current Entrophon settings and all agent pans',()=>{
 const {context:c}=setup();c.change('wave',{waveform:'triangle',filterFreqBase:1234.5});c.change('particle',{rootFreq:74.125});c.pan.set('particle:31',-.37);
 const source=c.bridge.captureSongSources();assert.equal(source.particle.particlePreset,'glass');assert.equal(source.pan['particle:31'],-.37);assert.equal(Object.keys(source.pan).length,35);
 assert.equal(source.entrophon.version,1);assert.equal(source.entrophon.configs.wave.filterFreqBase,1234.5);assert.equal(source.entrophon.configs.particle.rootFreq,74.125);
 source.entrophon.configs.wave.filterFreqBase=888;source.particle.agentVolumes[0]=1;
 assert.equal(c.ent.capture().configs.wave.filterFreqBase,1234.5);assert.equal(c.bridge.captureSongSources().particle.agentVolumes[0],.23);
});
test('song source restore sets Current configuration in one batch without starting audio',()=>{
 const {context:c,notes,prepared,disk}=setup();c.change('wave',{waveform:'square',release:.225,enabled:false});c.change('spectral',{tuningId:'ji-nearest'});c.pan.set('particle:2',.61);
 const saved=copy(c.bridge.captureSongSources());c.change('wave',{waveform:'sine',release:1,enabled:true});c.pan.set('particle:2',-.9);
 let notifications=0;const off=c.subscribe(()=>notifications++),before=prepared.length;
 c.bridge.applySongSources(saved);off();assert.equal(notifications,1);assert.equal(prepared.length-before,3);
 assert.equal(c.ent.capture().configs.wave.waveform,'square');assert.equal(c.ent.capture().configs.wave.enabled,false);assert.equal(c.ent.capture().configs.wave.release,.225);
 assert.equal(c.ent.capture().configs.spectral.tuningId,'ji-nearest');assert.equal(c.pan.snapshot()['particle:2'],.61);assert.equal(notes(),0);
 assert.equal(JSON.parse(disk.get('xensonar.entrophonUnifiedSoundConfig.v116')).wave.release,.225);
});
test('legacy sources leave absent Current settings and agent pans alone; malformed surfaces are atomic',()=>{
 const {context:c}=setup();c.change('wave',{release:.31});c.pan.set('particle:4',.42);
 c.bridge.applySongSources({particle:{particleVolume:.5},pan:{particle:-.1}});assert.equal(c.ent.capture().configs.wave.release,.31);assert.equal(c.pan.snapshot()['particle:4'],.42);assert.equal(c.pan.snapshot().particle,-.1);
 const before=copy(c.ent.capture());assert.throws(()=>c.ent.restore({version:1,configs:{wave:{release:2},particle:null,spectral:{}}}),/surface/);assert.deepEqual(copy(c.ent.capture()),before);
});
test('song bridge captures exact source references and installs validated definitions before parameter updates',()=>{
 const {context:c,owner}=setup(),calls=[];let captured=[];
 c.__XenSongInstrumentDefinitions={capture(ids){captured=copy(ids);return {version:1,nodal:{},entrophon:{}}},normalize(value){calls.push('validate');if(value?.bad)throw Error('invalid bank');return value??{version:1,nodal:{},entrophon:{}}},restore(value){calls.push('definitions')}};
 owner.waveSoundPreset='entrophon:body@rev-7';
 const saved=c.bridge.captureSongSources();assert.ok(captured.includes('entrophon:body@rev-7'));assert.equal(saved.definitions.version,1);
 owner.updateNParams({particlePreset:'changed-after-snapshot'});
 const update=owner.updateNParams;owner.updateNParams=value=>{calls.push('params');update(value)};
 c.bridge.applySongSources(saved);assert.deepEqual(calls.slice(0,3),['validate','definitions','params']);
 calls.length=0;assert.throws(()=>c.bridge.applySongSources({...saved,definitions:{bad:true}}),/invalid bank/);assert.deepEqual(calls,['validate']);
 calls.length=0;const current=copy(c.ent.capture());assert.throws(()=>c.bridge.applySongSources({...saved,entrophon:{version:1,configs:{wave:{},particle:null,spectral:{}}}}),/surface/);assert.deepEqual(calls,['validate'],'bad Current config must not install a different definition bank or update params');assert.deepEqual(copy(c.ent.capture()),current);
});
test('invalid Current settings do not replace the installed definition bank',()=>{
 const {context:c}=setup();let bank={version:1,nodal:{old:true},entrophon:{}};
 c.__XenSongInstrumentDefinitions={normalize:value=>value,restore:value=>{bank=value}};
 assert.throws(()=>c.bridge.applySongSources({definitions:{version:1,nodal:{new:true},entrophon:{}},entrophon:{version:1,configs:{wave:{},particle:null,spectral:{}}}}),/surface/);
 assert.equal(bank.nodal.old,true);assert.equal(bank.nodal.new,undefined);
});
test('fresh factory snapshot owns its complete instrument choices; p2e never replays Wave defaults',()=>{
 const {context:c}=setup();c.__XenStarterPrimaryId='factory-1';c.__XenStarterSecondaryId='factory-2';c.__xenMetaColorKey=item=>item.kind+':'+(item.instanceId??item.id);
 const meta=read('mix/03_meta_menu__before_v2-session-store.js'),start=meta.indexOf('function __xenStarterSourceSettings(){'),end=meta.indexOf('/* Repair only the known',start);
 loadFactoryDependencies(c,meta);vm.runInContext(meta.slice(start,end)+';globalThis.factories=__xenStarterPresetRecords;globalThis.factorySources=__xenStarterSourceSettings;',c);
 const row=c.factories().primary;assert.equal(row.name,'01 · Three Minor Worlds');assert.equal(row.songPerformance.version,1);
 assert.equal(row.songPerformance.sources.particle.particlePreset,'dust_chime');assert.equal(row.songPerformance.sources.waveStarter.preset,factoryWave);assert.equal(row.songPerformance.sources.keyboard.keyboardHoldSoundPreset,factoryKeyboard);
 c.change('wave',{release:3});assert.equal(Object.hasOwn(c.factorySources(),'entrophon'),false,'early factory configuration never reads later Current owner');
 const drum=read('rhythm/03_live_drum_bodies.js'),pstart=drum.indexOf('function p2e('),pend=drum.indexOf('const h2e=',pstart);let defaultsReady=0,drone=0,updates=0;
 c.P={useRef:()=>({current:false}),useEffect:fn=>{fn();fn()}};c.__xenDronePersist={load:()=>({}),loadVolume:()=>.4,hadPreviousVolume:()=>false};c.__XenDroneStart={dronePreset:'drone'};c.m2e=()=>({particlePreset:'old-default'});c.__f350IsRhythmKey=()=>false;c.__XenMainRoomSessionBridge={defaultsReady:()=>defaultsReady++};
 const boot={P:c.P,__xenDronePersist:c.__xenDronePersist,__XenDroneStart:c.__XenDroneStart,m2e:c.m2e,__f350IsRhythmKey:c.__f350IsRhythmKey,__XenMainRoomSessionBridge:c.__XenMainRoomSessionBridge};
 vm.runInNewContext(drum.slice(pstart,pend)+';p2e({setDronePreset(){},setDroneVolume(){},updateNParams(){},setWaveSoundPreset(){throw Error("Wave default replay")},setWaveSoundVolume(){throw Error("Wave volume replay")}});',boot);
 assert.equal(defaultsReady,1);
});

test('factory records are safe before later lexical Current owner initialization',()=>{
 const meta=read('mix/03_meta_menu__before_v2-session-store.js'),start=meta.indexOf('function __xenStarterSourceSettings(){'),end=meta.indexOf('/* Repair only the known',start);
 const context={__XenStarterPrimaryId:'factory-1',__XenStarterSecondaryId:'factory-2',__xenMetaColorKey:item=>item.kind+':'+item.id};
 vm.createContext(context);loadFactoryDependencies(context,meta);vm.runInContext(meta.slice(start,end)+";globalThis.factory=__xenStarterPresetRecords();const __XenEntrophonSongConfig={defaults(){throw Error('late owner accessed')}};",context);
 assert.equal(context.factory.primary.songPerformance.sources.waveStarter.preset,factoryWave);
});

test('identical source restore installs definitions without a redundant audio parameter update',()=>{
 const {context:c,owner}=setup(),calls=[];
 c.__XenSongInstrumentDefinitions={capture:()=>({version:1,nodal:{},entrophon:{}}),normalize:value=>{calls.push('validate');return value},restore(){calls.push('definitions')}};
 const saved=c.bridge.captureSongSources();
 const update=owner.updateNParams;owner.updateNParams=value=>{calls.push('params');update(value)};
 c.bridge.applySongSources(saved);assert.deepEqual(calls,['validate','definitions']);
});
