'use strict';
const assert=require('assert/strict'),{load,PCMBuffer}=require('./offline_runtime.cjs');const h=load(process.cwd());
const b=new PCMBuffer({numberOfChannels:1,length:64,sampleRate:48000});b.getChannelData(0)[1]=.5;h.context.impulse=b;
assert.equal(h.run('__f333AudiblePCM(impulse)'),true,'valid impulses between former 16-sample probe points must be playable');
const stereo=new PCMBuffer({numberOfChannels:2,length:3,sampleRate:48000});stereo.getChannelData(0)[1]=.5;stereo.getChannelData(1)[1]=-.5;h.context.stereo=stereo;assert(h.run('__f333AudiblePCM(stereo)'));
assert.equal(h.run('__f333AudibleSource({monoSamples:new Float32Array(3),leftSamples:stereo.getChannelData(0),rightSamples:stereo.getChannelData(1)})'),false,'legacy mono source readiness follows the actual mono renderer');
console.log('PASS impulse, stereo-buffer audibility and matching legacy mono source readiness');
(async()=>{
 const full=new PCMBuffer({numberOfChannels:2,length:24000,sampleRate:24000});full.getChannelData(0).fill(.25);full.getChannelData(1).fill(-.5);h.context.sampleBuffer=full;
 const result=await h.run(`(async()=>{
  const render=__f333RenderCurrent,save=xS;let writes=0,blob;
  __f333RenderCurrent=async()=>({buffer:sampleBuffer});xS=async(name,value)=>{writes++;blob=value;return {name}};
  try{
   __ForgeNavigatorSample.select(.1,.5);const saved=await __f333SaveNavigatorSample();
   const bytes=await blob.arrayBuffer(),view=new DataView(bytes),valid={saved:!!saved,writes,channels:view.getUint16(22,true),rate:view.getUint32(24,true),frames:(bytes.byteLength-44)/4,busy:__ForgeNavigatorSample.snapshot().busy};
   __f333RenderCurrent=async()=>{__F3564Master.set('volume',75);return {buffer:sampleBuffer}};__ForgeNavigatorSample.select(.1,.5);const stale=await __f333SaveNavigatorSample();
   __F3564Master.set('volume',100);sampleBuffer.getChannelData(1)[4000]=Infinity;__f333RenderCurrent=async()=>({buffer:sampleBuffer});__ForgeNavigatorSample.select(.1,.5);const invalid=await __f333SaveNavigatorSample();
   sampleBuffer.getChannelData(0).fill(0);sampleBuffer.getChannelData(1).fill(0);__ForgeNavigatorSample.select(.1,.5);const silent=await __f333SaveNavigatorSample();
   return {valid,stale:stale===false,invalid:invalid===false,silent:silent===false,writes,busy:__ForgeNavigatorSample.snapshot().busy};
  }finally{__f333RenderCurrent=render;xS=save;}
 })()`);
 assert(result.valid.saved&&result.valid.writes===1&&result.valid.channels===2&&result.valid.rate===24000&&result.valid.frames===9600&&!result.valid.busy);assert(result.stale&&result.invalid&&result.silent&&result.writes===1&&!result.busy);
 console.log('PASS Navigator stereo PCM/WAV duration, master-change invalidation, silent/non-finite sample rejection and busy cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
