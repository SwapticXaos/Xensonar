'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const kernel=read('src/nodal/02_synthesis_kernel.js'),common=read('src/nodal/01_instrument_model.js')+'\n'+read('src/nodal/07_sound_designer.js');
const control=new Function(common+'\n'+kernel+';return {dsp:__XenNodalDSP,starter:nodalOpenStarter,model:__XenNodalModel};')();
let calls=0;const math=Object.create(Math);for(const k of ['sin','cos','exp','log','pow'])math[k]=(...args)=>{calls++;return Math[k](...args);};
function load(k,r){return new Function('Math',common+'\n'+k+'\n'+r+';return {kernel:createNodalSynthesisKernel,factory:nodalWorkletProcessorFactory};')(math);}
const before=load(read('tests/fixtures/f446_f445_kernel.js'),read('tests/fixtures/f446_f445_runtime.js')),after=load(kernel,read('src/nodal/04_audio_runtime.js'));
function processor(api){let P;class Base{constructor(){this.port={postMessage(){}};}}api.factory(api.kernel,(_,C)=>P=C,Base,48000,()=>0);return new P({processorOptions:{maxCost:16,maxVoices:32,tailCostScale:.5}});}
const results=[];
for(const nodes of [3,7,12]){
 const base=control.starter('hollow'),plan=control.model.compile(control.model.normalize({...base,nodes:Array.from({length:nodes},(_,k)=>({...base.nodes[k%3],id:'n'+k,ratio:1+k*.137}))}));
 const prepared=structuredClone(control.dsp.preparePacket(plan,[plan.referenceHz],48000,true)),p=processor(before),q=processor(after);
 calls=0;let start=performance.now();p.port.onmessage({data:{type:'plan',id:'p',plan}});const beforeMs=performance.now()-start,beforeCalls=calls;
 calls=0;start=performance.now();q.port.onmessage({data:{type:'plan',id:'p',plan,prepared}});const afterMs=performance.now()-start,afterCalls=calls;
 let oldPitches=0,newPitches=0;
 for(let k=0;k<40;k++){
  const frequencies=[220+k*1.127,330+k*1.187,440+k*1.217,660+k*1.327],prepared=structuredClone(control.dsp.preparePacket(plan,frequencies,48000));
  calls=0;p.port.onmessage({data:{type:'pitches',id:'p',frequencies}});oldPitches+=calls;
  calls=0;q.port.onmessage({data:{type:'pitches',id:'p',prepared}});newPitches+=calls;
 }
 results.push({nodes,beforeAudioSetupMs:beforeMs,preparedAudioSetupMs:afterMs,beforeAudioSetupMathCalls:beforeCalls,preparedAudioSetupMathCalls:afterCalls,beforeAudioPitchMathCalls:oldPitches,preparedAudioPitchMathCalls:newPitches});
}
const report={scope:'actual F445 reference; one cold setup sample per graph on this host; timings descriptive, no reliable speedup ratio; exact math counts across 40 changed pitch packets; preparation moves to control side and is not eliminated',results};
fs.writeFileSync(path.join(root,'results/f446-control-placement.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
