'use strict';
// Real worklet processor DSP simulation, no fake filter graph. GPU/OS XRUN claims excluded.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const baseline=path.join(root,'tests/fixtures/eq_ui2b_prepatch_worklet.js');
const restored=path.join(root,'src/quickrack/equalizer/eq-worklet.js');
function run(file,gesture,changed){
 const scope={sampleRate:48000,currentFrame:0,console};
 scope.AudioWorkletProcessor=class {constructor(){this.port={onmessage:null,postMessage(){}}}};
 scope.registerProcessor=(n,klass)=>scope.Processor=klass;
 vm.createContext(scope);vm.runInContext(fs.readFileSync(file,'utf8')+'\n__xenEqLiveModule();',scope);
 const F64=vm.runInContext('Float64Array',scope);const coeff=new F64(120);
 for(let i=0;i<12;i++)coeff[i*5]=1;
 const proc=new scope.Processor({processorOptions:{initial:{revision:0,count:12,gain:1,coefficients:coeff}}});
 const input=[[new Float32Array(128).fill(.03),new Float32Array(128).fill(.03)]];
 const output=[[new Float32Array(128),new Float32Array(128)]];
 let previous=0;
 for(let frame=0;frame<48000;frame+=128){scope.currentFrame=frame;
  const index=Math.floor(frame/(48000*(gesture==='morph'?.048:.14)));
  if(index>previous){previous=index;proc.port.onmessage({data:{kind:'plan',revision:index,count:12,gain:changed?1+index*.001:1,coefficients:new F64(coeff),intent:gesture}})}
  proc.process(input,output);
 }
 return {dualFrames:proc.stats.dualFrames,applied:proc.stats.applied,unchanged:proc.stats.unchanged};
}
assert(fs.existsSync(baseline),'immutable UI2b source fixture missing');
for(const gesture of ['paint','morph']){
 const before=run(baseline,gesture,true),after=run(restored,gesture,true);
 if(gesture==='paint')assert(after.dualFrames<before.dualFrames*.7,`paint DSP double work was not reduced: ${JSON.stringify({before,after})}`);
 else assert.deepEqual(after,before,'morph DSP behavior must remain byte-equivalent to current slider');
 const same=run(restored,gesture,false);assert.equal(same.dualFrames,0,'identical effective plans must not run double banks');
 console.log('PASS',gesture,'varying double-bank samples UI2b='+before.dualFrames+' restored='+after.dualFrames,'unchanged suppressed='+same.unchanged);
}
