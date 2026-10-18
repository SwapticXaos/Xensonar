'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function context(file){
 const s=fs.readFileSync(file,'utf8'),app=fs.readFileSync('src/01_app_runtime.js','utf8');
 const prep=app.slice(app.indexOf('function __entPreparedConfig('),app.indexOf('// F3_41 visual donor workbench'));
 const source=s.slice(0,s.indexOf('const Fb='));
 const ctx=vm.createContext({Math,WeakMap,Map,Set,console});
 vm.runInContext('const __entConfigCache=new WeakMap();'+prep+source+';this.api={Ew,ES,dT,Yie,zA,set:(slot,config)=>rc={...rc,[slot]:zA(slot,config)}};',ctx);
 return ctx;
}
const old=context('tests/fixtures/p3c_d5_baseline/entrophon_config.js'),now=context('src/runtime/instrument/10_entrophon_and_voice_control.js');
vm.runInContext(fs.readFileSync('src/instruments/01_entrophon_definition.js','utf8')+';this.instrument={capture:captureEntrophonInstrument,normalize:normalizeEntrophonInstrument,serialize:serializeEntrophonInstrument,deserialize:deserializeEntrophonInstrument,resolve:resolveEntrophonInstrument};',now);
const plain=v=>JSON.parse(JSON.stringify(v));let cases=0;
for(const surface of ['wave','particle','spectral'])for(const tuningId of ['ji','ji-nearest','31edo'])for(const enabled of [false,true]){
 const config={...plain(old.api.ES[surface]),enabled,tuningId,tuningStrength:.8,unison:6,unisonSpread:.6,filterKeytrack:.7,colorSet:'bell'};
 old.api.set(surface,config);now.api.set(surface,config);
 for(const forceEnabled of [false,true])for(const freq of [27.33,221.7,7631.2]){
  const event={surface,freq,forceEnabled,rootFreq:55,tuningId,tuningStrength:.8};
  assert.deepEqual(plain(now.api.dT(event)),plain(old.api.dT(event)),'legacy plan changed');cases++;
 }
 const def=now.instrument.capture('Saved '+surface,surface);
 const saved=now.instrument.deserialize(now.instrument.serialize(def));assert.deepEqual(plain(saved),plain(def));assert(Object.isFrozen(saved));assert(Object.isFrozen(saved.config));
 const first=plain(now.instrument.resolve(saved,{freq:221.731}));assert.equal(first.tunedFreq,221.731,'Melodic frequency must not be requantized');assert(first.colorGains.some(v=>v>0),'saved source is an active instrument even when its original slot was off');
 now.api.set(surface,{...config,waveform:'sine',unison:1,filterFreqBase:18000,enabled:false,engineAmount:0});
 assert.deepEqual(plain(now.instrument.resolve(saved,{freq:221.731})),first,'global slot polluted saved instrument');
 const second=now.instrument.capture('Second '+surface,surface);assert.notDeepEqual(plain(second.config),plain(saved.config));
 for(let i=0;i<4;i++){now.instrument.resolve(second,{freq:333});assert.deepEqual(plain(now.instrument.resolve(saved,{freq:221.731})),first);}
 const compat=now.instrument.resolve(saved,{freq:221.731,pitchPolicy:'instrument'});assert(Number.isFinite(compat.tunedFreq));
}
assert.throws(()=>now.instrument.deserialize('{"schema":"wrong"}'));
assert.throws(()=>now.instrument.deserialize('x'.repeat(20001)));
assert.throws(()=>now.instrument.normalize({...plain(now.instrument.capture('test')),schemaVersion:2}));
assert.throws(()=>now.instrument.normalize({...plain(now.instrument.capture('test')),config:{unison:Infinity}}));
assert.throws(()=>now.instrument.resolve(now.instrument.capture('test'),{freq:NaN}));
assert.throws(()=>now.instrument.resolve(now.instrument.capture('test'),{freq:220,unison:NaN}));
const independent=now.instrument.capture('Independent wave');
const independentPlan=plain(now.instrument.resolve(independent,{freq:319.87}));
vm.runInContext('Ew=()=>{throw new Error("Global config read")};uT=Ew;',now);
assert.deepEqual(plain(now.instrument.resolve(independent,{freq:319.87})),independentPlan,'resolver must not read any global config');
console.log('PASS P4A:',cases,'legacy plans unchanged; immutable roundtrip, two independent definitions, active saved body, exact note pitch, bounded validation');
