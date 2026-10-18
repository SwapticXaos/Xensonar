'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const common=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const current=read('src/nodal/02_synthesis_kernel.js'),baseline=read('tests/fixtures/f444_baseline/02_synthesis_kernel.js');
const control=new Function(common+'\n'+current+';return {model:__XenNodalModel,starter:nodalOpenStarter,dsp:__XenNodalDSP};')();
const old=new Function(common+'\n'+baseline+';return __XenNodalDSP;')();
let expensive=0;const measured=Object.create(Math);for(const key of ['sin','cos','exp','log','pow'])measured[key]=(...args)=>{expensive++;return Math[key](...args);};
const audio=new Function('Math',current+';return __XenNodalDSP;')(measured);
let cases=0,samples=0;
for(const engine of [1,2])for(const nodes of [1,3,7])for(const rate of [44100,48000,96000]){
 const base=control.starter('hollow'),plan=control.model.compile(control.model.normalize({...base,schemaVersion:engine,kernelVersion:'coupled-modal-v'+engine,nodes:Array.from({length:nodes},(_,k)=>({...base.nodes[k%3],id:'node'+k,ratio:1+k*.137}))}));
 const hzs=[plan.referenceHz??220,97.321,330.123,11000],packet=structuredClone(control.dsp.preparePacket(plan,hzs,rate,true));
 const before=expensive;audio.installPrepared(plan,packet,rate);
 const voice=audio.voice(plan,{},rate);assert.equal(expensive,before,'prepared audio-side construction must perform no sin/cos/exp/log/pow');
 for(const frequency of hzs){
  const options={frequency,durationSec:.061,gain:.37,velocity:.71},before=expensive;voice.reset(options);assert.equal(expensive,before,'prepared onset only copies fixed coefficients and state');
  const expected=old.voice(plan,options,rate),a=new Float32Array(16000),b=new Float32Array(16000),x=new Float32Array(16000),y=new Float32Array(16000);
  voice.process(a,b);expected.process(x,y);assert.deepEqual(a,x);assert.deepEqual(b,y);cases++;samples+=a.length*2;
 }
}
const report={status:'PASS',cases,comparedSampleValues:samples,preparedAudioThreadTranscendentalCalls:0,scope:'V1/V2 immutable timbre and known-pitch preparation; actual time-varying audio DSP remains live'};
fs.writeFileSync(path.join(root,'results/f446-prepared-control.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
