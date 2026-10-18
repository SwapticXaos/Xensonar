'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'src/instruments/00_diagnostics.js'),'utf8');
let now=100.5;const ctx={Date,performance:{now:()=>now},console,ArrayBuffer};ctx.globalThis=ctx;
vm.createContext(ctx);vm.runInContext(source,ctx);
const trace=ctx.XenSonarSoundTrace,admission=ctx.XenSonarAudioTrace;
assert(trace&&admission,'Both instrumentations are available without browser AudioContext');
const audio={currentTime:3.5,state:'running'};
const snap=(wave,keyboard,particle,cost=0,settings={waveVolume:.2},phase='ready')=>({
 audioContext:audio,room:'L3LAB',audio:{state:'running',sampleRate:48000},sources:{
  wave:{id:wave,enabled:true},keyboard:{id:keyboard},particle:{id:particle}},
 nodal:{wave:{desired:wave,active:wave,phase,contextReady:true},keyboard:{desired:keyboard,active:keyboard,phase,contextReady:true},particle:{desired:particle,active:particle,phase,contextReady:true}},
 load:{activeVoices:cost/2,activeCost:cost,maxCost:16,maxVoices:32,readyPlans:3},settings});
trace.observe(snap('tape_halo','clean_pluck','dust_pulse'));
assert.equal(trace.read().events.filter(x=>x.kind==='source-committed').length,3);
trace.observe(snap('tape_halo','clean_pluck','dust_pulse'));
assert.equal(trace.read().events.filter(x=>x.kind==='source-committed').length,3,'No duplicate unchanged source events');
trace.request('keyboard','nodal:keyboard@2',{via:'Keyboard Sound menu'});
now+=500;trace.observe(snap('entrophon','nodal:keyboard@2','nodal:particle@1',8));
const events=trace.read().events;
assert.equal(events.find(x=>x.kind==='source-request').data.requested,'nodal:keyboard@2');
assert.equal(events.filter(x=>x.kind==='source-committed').length,6);
assert(events.some(x=>x.kind==='source-committed'&&x.slot==='wave'&&x.data.current==='entrophon'&&x.data.previous==='tape_halo'));
assert(events.some(x=>x.kind==='nodal-capacity-sample'&&x.data.activeCost===8));
assert(events.every(x=>x.iso&&Number.isFinite(x.perfMs)));
trace.observe(snap('entrophon','nodal:keyboard@2','nodal:particle@1',8,{waveVolume:.8}));
assert(trace.read().events.some(x=>x.kind==='instrument-settings'&&x.data.changedKeys.includes('waveVolume')));
trace.stop();const before=trace.read().events.length;trace.request('wave','clean_pluck');assert.equal(trace.read().events.length,before,'Stop stops recording');
trace.start();assert.equal(trace.read().events.filter(x=>x.kind==='capture-baseline').length,3);
admission.start();const id=admission.begin('keyboard',3.5);admission.record('renderer','keyboard','started',3.5,id);assert.equal(admission.read().records[1].eventId,id);
assert.equal(admission.stats().events,2);
const hud=fs.readFileSync(path.join(root,'src/audio/entrophon/03_native_bridge.js'),'utf8');
assert(hud.includes("get('c11Diagnosis')!=='0'"),'Hud enabled by default');
assert(hud.includes('Runtime-Diagnose ZIP herunterladen'));
const zipSource=fs.readFileSync(path.join(root,'src/runtime/instrument/05_timing_and_admission.js'),'utf8');
for(const file of ['sound_source_timeline.json','sound_source_timeline.tsv','audio_admission_trace.json'])assert(zipSource.includes(file),file+' included in existing ZIP');
const wiring=fs.readFileSync(path.join(root,'src/runtime/instrument/10_entrophon_and_voice_control.js'),'utf8');
for(const lane of ['wave','keyboard','particle'])assert(wiring.includes('__XenSoundTrace.request("'+lane+'"'),'Menu change must record '+lane);
const shell=fs.readFileSync(path.join(root,'src/app/forge/01_room_shell.js'),'utf8');
assert(shell.includes('__XenSoundTrace.observe({sources,nodal:slots,load:__XenNodalSurfaces.snapshot()'));
console.log('PASS P3C D1: source changes, request vs commit, config changes, Nodal load, timestamps, ZIP, HUD and menus');
