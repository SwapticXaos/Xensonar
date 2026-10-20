'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{load}=require('./offline_runtime.cjs');
const h=load(process.cwd());
const result=h.run(`(()=>{
 // Known quiet, positive levels disappear in the old unsigned-byte meter.
 const low={getFloatTimeDomainData:a=>a.fill(.001),getByteTimeDomainData:a=>a.fill(128)};
 const high={getFloatTimeDomainData:a=>a.fill(.004),getByteTimeDomainData:a=>a.fill(128)};
 const param=()=>({setTargetAtTime(){}}),node=()=>({gain:param()});
 const bus={analyzers:{main:low,drone:high},scratch:{main:new Float32Array(512),drone:new Float32Array(512)},roleGains:{main:node(),drone:node(),rhythm:node(),space:node()},lowShelves:{},midPeaks:{},highShelves:{}};
 const measured=KY(low,new Float32Array(512)),mix=YY(bus,{strength:.5,glue:.5,air:.5},0);
 return {measured,mix};})()`);
fs.writeFileSync('results/forge-smoothness/master-meter.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));assert(Math.abs(result.measured.rms-.001)<1e-9,'master meter retains quiet floating-point signal');assert(result.mix.main>.19&&result.mix.main<.21);assert(result.mix.drone>.77&&result.mix.drone<.80);console.log('PASS master metering retains quiet role balance without byte quantization');
const finite=h.run(`KY({getFloatTimeDomainData:a=>a.set([NaN,Infinity,.25,-.25])},new Float32Array(4))`);assert(Math.abs(finite.rms-Math.sqrt(.125/4))<1e-12);assert.equal(finite.peak,.25);
const overload=h.run(`KY({getFloatTimeDomainData:a=>a.fill(2)},new Float32Array(512))`);assert.equal(overload.rms,2);assert.equal(overload.peak,2);
console.log('PASS nonfinite floating-point measurements cannot poison mastering parameters');
