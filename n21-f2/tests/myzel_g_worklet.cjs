'use strict';const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.join(__dirname,'../src/audio/09_myzel_g_dsp.js'),'utf8');
const scope={Float32Array,Float64Array,Math,Number,WeakMap,console};vm.createContext(scope);
vm.runInContext(code+';globalThis.workletSource=__MyzelGSource',scope);
let processorClass;const processorScope={Float32Array,Float64Array,Math,Number,WeakMap,console,sampleRate:48000,
  AudioWorkletProcessor:class { constructor(){this.port={onmessage:null,postMessage(){}}} },registerProcessor:(name,cls)=>{assert.equal(name,'xensonar-myzel-g');processorClass=cls}};
vm.createContext(processorScope);vm.runInContext(scope.workletSource,processorScope);
assert(processorClass);let dsp=new processorClass();
dsp.port.onmessage({data:{active:1,root:146,frequency:220,level:.7,presence:.78,motion:.5,
  stages:[{type:'wavefolder',strength:.93,frequency:220},{type:'formant_filter',strength:.9,frequency:220}]}});
let sum=0, peak=0;for(let i=0;i<400;i++){
 const output=[[new Float32Array(128),new Float32Array(128)]];assert.equal(dsp.process([],output),true);
 for(const channel of output[0])for(const v of channel){assert(Number.isFinite(v));sum+=v*v;peak=Math.max(peak,Math.abs(v))}
}
assert(sum>1);assert(peak<1);
console.log('PASS actual embedded AudioWorklet source registers, receives controls, processes finite nonzero stereo PCM');
