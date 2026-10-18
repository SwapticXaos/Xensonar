'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const slice=(s,name,next)=>s.slice(s.indexOf('function '+name+'('),s.indexOf(next,s.indexOf('function '+name+'(')));
// Execute real scheduled-tone dispatch with a globally enabled, saturated
// Entrophon and a ready Classic Worklet. A Classic event must never consult
// Entrophon admission or enter its managed envelope.
const backend=read('src/audio/entrophon/02_worklet_and_voice_backend.js');let classic=0,entGate=0;
const env={Hd:()=>true,__wave39Owned:()=>true,__wave39Scheduled:()=>{classic++;return true;},__entResult:(t,reason)=>({reason}),d9:()=>{entGate++;return -1;},$ie:()=>12};
const dispatch=new Function(...Object.keys(env),slice(backend,'ewe','function twe')+slice(backend,'twe','class ML')+';return twe;')(...Object.values(env));
for(const preset of ['clean_pluck','dust_pulse'])assert.equal(dispatch({ctx:{state:'running',currentTime:1}}, {freq:220,dur:.2,offset:0,volume:.2,type:'sine',options:{source:'wave',entrophonWaveActive:false,preset}}),true);
assert.equal(classic,2);assert.equal(entGate,0,'Classic never spends Entrophon ingress capacity');
assert.equal(dispatch({ctx:{state:'running',currentTime:1}},{freq:220,dur:.2,offset:0,volume:.2,type:'sine',options:{source:'wave'}}).reason,'ingress','unspecified Wave backend retains its original Entrophon policy');
console.log('PASS explicit Classic keyboard uses its ready Worklet even under global Entrophon pressure');
