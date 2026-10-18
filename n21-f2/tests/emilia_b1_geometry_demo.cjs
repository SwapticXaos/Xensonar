'use strict';
const fs=require('node:fs'),path=require('node:path');
const {harness,rms,distance}=require('./emilia3_harness.cjs');
const {api}=harness(),base=api.snapshot();
const positions=[
  // Same roles, ratio, strength, and gain in all four constellations.
  [[.28,.44],[.64,.55],[.46,.24]],
  [[.11,.13],[.88,.19],[.52,.92]],
  [[.43,.47],[.55,.51],[.46,.60]],
  [[.16,.72],[.50,.31],[.86,.70]],
];
const recipes=positions.map(pts=>api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({...n,x:pts[i][0],y:pts[i][1]}))}));
const carrier={at(t){if(t<1)return{hz:196,gain:.48};if(t<1.24)return{hz:196,gain:0};if(t<2.6)return{hz:196+150*(t-1.24)/1.36,gain:.65};if(t<2.87)return{hz:346,gain:0};if(t<4.2)return{hz:293.66,gain:.37};if(t<4.5)return{hz:294,gain:0};if(t<5.74)return{hz:247,gain:.72};return{hz:247,gain:0}}};
(async()=>{
const sr=24000,sec=6,raw=[];for(let i=0;i<recipes.length;i++){
 const r=await api.renderPCM({instrument:recipes[i],tracks:[carrier],durationSec:sec,sampleRate:sr});raw.push(r.left);
 const peak=r.left.reduce((m,x)=>Math.max(m,Math.abs(x)),0);
 console.log(JSON.stringify({geometry:i+1,edges:__edgeCount(recipes[i]),rms:rms(r.left),peak,relativeDifference:i?distance(raw[0],r.left):0}));
}
function write(wav,arrays,match){const samples=arrays.length*sr*sec,b=Buffer.alloc(44+samples*2);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples*2,40);let k=44;
for(const a of arrays){const scale=match?Math.min(2,.08/Math.max(.001,rms(a))):1;for(let x of a){x*=scale;b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),k);k+=2;}}
fs.writeFileSync(wav,b);}
write(path.join(__dirname,'../EMILIA_B1_NETWORK_GEOMETRY_ORIGINAL.wav'),raw,false);
write(path.join(__dirname,'../EMILIA_B1_NETWORK_GEOMETRY_LEVELMATCH.wav'),raw,true);
function __edgeCount(recipe){const nodes=recipe.model.nodes;let count=0;for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y)<nodes[i].radius+nodes[j].radius)count++;return count}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
