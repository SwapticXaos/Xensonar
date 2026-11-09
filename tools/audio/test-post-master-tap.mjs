import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const file=path.resolve(import.meta.dirname,'../../src/features/xensonar/audio/postMasterPcmWorkletSource.ts');
const module={};vm.runInNewContext(fs.readFileSync(file,'utf8').replaceAll('export const ','const ')+'\nglobalThis.source=POST_MASTER_PCM_WORKLET_SOURCE;',module);
function fixture(frames=512){
  const audioSab=new SharedArrayBuffer(8+(frames*2+1)*4),controlSab=new SharedArrayBuffer(64),messages=[];
  let Processor;
  class Base{constructor(){this.port={postMessage:m=>messages.push(m)};}}
  const env={AudioWorkletProcessor:Base,registerProcessor:(_,ctor)=>Processor=ctor,currentFrame:10000};
  vm.runInNewContext(module.source,env);
  const tap=new Processor({processorOptions:{audioSab,controlSab}}),control=new Int32Array(controlSab);
  const process=input=>{const result=tap.process(input,[ [new Float32Array(128)] ]);env.currentFrame+=128;return result;};
  return {tap,control,messages,process,wr:new Uint32Array(audioSab,0,1),rd:new Uint32Array(audioSab,4,1),samples:new Float32Array(audioSab,8)};
}
{
  const f=fixture();f.process([]);assert.equal(f.wr[0],0); // No stale capture during network bootstrap.
  f.control[9]=1;f.process([]);assert.equal(f.wr[0],256);assert.equal(f.control[2],1);assert.equal(f.control[0],10128);
  assert.ok(f.samples.slice(0,256).every(x=>x===0));
  f.tap.port.onmessage({data:{type:'FENCE'}});f.process([]);assert.equal(f.messages.length,0);f.process([]);assert.equal(f.messages[0].type,'TAP_FENCED');
}
{
  const f=fixture();f.control[9]=1;
  const l=Float32Array.from({length:128},(_,i)=>(i+1)/128),r=l.map(x=>-x);
  f.process([[l,r]]);assert.equal(f.control[8],1); // Reject ownership change over live sound.
  f.control[10]=1;f.control[8]=0;f.process([[l,r]]);assert.equal(f.control[8],0);
  for(let i=0;i<128;i++){assert.equal(f.samples[i*2],l[i]);assert.equal(f.samples[i*2+1],r[i]);}
}
{
  const f=fixture(128);f.control[9]=1;f.control[10]=1;f.process([]);f.process([]);
  assert.equal(f.control[6],1);assert.equal(f.control[3],128);assert.equal(f.wr[0],256);
  f.control[7]=1;assert.equal(f.process([]),false);
}
console.log(JSON.stringify({pass:true,proof:'actual-worklet-code-in-render-model',checks:['empty-input-silence','capture-arm','two-quantum-fence','live-handover-refusal','stereo-exact','bounded-overflow','processor-stop'],physicalAudio:false}));
