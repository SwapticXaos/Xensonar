'use strict';
const fs=require('node:fs'),path=require('node:path');
const {harness,rms}=require('./emilia3_harness.cjs');
const old=harness(path.resolve(__dirname,'../baseline-b1')),modern=harness();
const sr=24000,duration=4.8;
function layout(api,dx){const base=api.snapshot();return api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({
 ...n,x:[.15,.34,.23][i]+dx,y:[.37,.46,.27][i],ratio:1}))});}
const carrier={at(t){
  if(t<.85)return{hz:196,gain:.57};
  if(t<1.01)return{hz:196,gain:0};
  if(t<2.0)return{hz:196+98*(t-1.01)/.99,gain:.63};
  if(t<2.22)return{hz:294,gain:0};
  if(t<3.05)return{hz:246.94,gain:.42};
  if(t<3.32)return{hz:246.94,gain:0};
  if(t<4.52)return{hz:329.63,gain:.66};
  return{hz:329.63,gain:0};
}};
function wav(file,arrays,match){
 let cursor=44,frames=arrays.reduce((a,v)=>a+v.length,0),buff=Buffer.alloc(44+frames*2);
 buff.write('RIFF',0);buff.writeUInt32LE(buff.length-8,4);buff.write('WAVE',8);buff.write('fmt ',12);buff.writeUInt32LE(16,16);buff.writeUInt16LE(1,20);buff.writeUInt16LE(1,22);buff.writeUInt32LE(sr,24);buff.writeUInt32LE(sr*2,28);buff.writeUInt16LE(2,32);buff.writeUInt16LE(16,34);buff.write('data',36);buff.writeUInt32LE(frames*2,40);
 for(const a of arrays){const scalar=match?Math.min(3,.105/Math.max(.0001,rms(a))):1;
   for(const value of a){const x=Math.min(1,Math.max(-1,value*scalar));buff.writeInt16LE(Math.round(x*32767),cursor);cursor+=2;}}
 fs.writeFileSync(file,buff);
}
(async()=>{const samples=[];
 for(const [engine,api] of [['B1',old.api],['B1',old.api],['GRAPH_V2',modern.api],['GRAPH_V2',modern.api]]){
  const dx=samples.length%2===0?0:.52;
  const r=await api.renderPCM({instrument:layout(api,dx),tracks:[carrier],durationSec:duration,sampleRate:sr});
  samples.push(r.left);console.log(engine,dx,rms(r.left),Math.max(...r.left.subarray(0,500)));
 }
 const root=path.resolve(__dirname,'..');wav(path.join(root,'EMILIA_GRAPH_V2_CAUSAL_ORIGINAL.wav'),samples,false);wav(path.join(root,'EMILIA_GRAPH_V2_CAUSAL_LEVELMATCH.wav'),samples,true);
})().catch(e=>{console.error(e.stack);process.exitCode=1});
