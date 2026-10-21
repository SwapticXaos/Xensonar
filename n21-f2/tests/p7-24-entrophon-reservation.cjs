'use strict';
// Verify the production estimator against the production encoded-record cost.
const fs=require('node:fs'),assert=require('node:assert/strict');
const config=fs.readFileSync('src/runtime/instrument/10_entrophon_and_voice_control.js','utf8');
const live=fs.readFileSync('src/audio/05_live_voice_runtime.js','utf8');
const backend=fs.readFileSync('src/audio/entrophon/02_worklet_and_voice_backend.js','utf8');
const body=fs.readFileSync('src/instruments/01_entrophon_definition.js','utf8');
const {createEngine}=require('./helpers/p4c2-n3-entrophon.cjs');
const engine=createEngine(false,false),api=engine.api;
const estimateSource=config.slice(config.indexOf('function $ie('),config.indexOf('function Hd('));
let current={...api.defaults.wave};
const estimate=Function('uT',estimateSource+';return $ie;')(()=>current);
const recordCost=Function('const gn='+live.match(/gn=(\{[^}]+\})/)[1]+';'+live.slice(live.indexOf('function LMe('),live.indexOf('function BMe('))+';return LMe;')();
assert(backend.includes('$ie(entrophonActive,t.options?.entrophonDefinition?.config)'), 'production admission passes selected saved config');
assert(body.includes('enabled:true'),'normalized saved sounds own activation');
for(const surface of ['wave','particle','spectral'])for(const unison of [1,3,6])for(const color of [0,.5])for(const delay of [0,.3]){
 const definition=api.normalize({schema:'xensonar.entrophon-instrument',schemaVersion:1,engineVersion:'c11-v1',name:'Cost '+surface,surface,config:{...api.defaults[surface],unison,colorAmount:color,delayAmount:delay,enabled:false,engineAmount:1}});
 const plan=api.resolve(definition,{freq:220});
 const record=new Uint32Array(64);record[0]=2;record[5]=plan.oscillatorFreqs.length;record[6]=plan.colorGains.filter(value=>value!==0).length;record[40]=plan.delayAmount>.002?1:0;
 for(const other of [{unison:1,colorAmount:0,delayAmount:0,enabled:false},{unison:6,colorAmount:1,delayAmount:1,enabled:true}]){
  current={...api.defaults.wave,...other};assert.equal(estimate(true,definition.config),recordCost(record),'saved selected demand equals encoded zero-pressure record independent of Current');
 }
}
current={...api.defaults.wave};assert.equal(estimate(true),estimate(true,null),'Current remains default');assert.equal(estimate(true,undefined),estimate(true),'omitted saved config keeps Current contract');
console.log('PASS saved Wave/Keyboard admission estimates exact selected zero-pressure C11 record demand across 36 saved configurations and both relative Current costs');
