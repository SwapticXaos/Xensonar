'use strict';
const fs=require('node:fs'),path=require('node:path');
const {harness,rms,distance}=require('./emilia3_harness.cjs');
const {api}=harness();const base=api.snapshot();
const edit=(m,nodes,coupling=m.coupling)=>api.normalized({...m,nodes,coupling});
const recipes=[
  base,
  edit(base.model,base.model.nodes.map((n,i)=>({...n,x:[.93,.15,.74][i],y:[.88,.17,.67][i],ratio:[1,1.5,2.3][i]})),.08),
  edit(base.model,base.model.nodes.map((n,i)=>({...n,x:[.39,.45,.52][i],y:[.6,.57,.63][i],ratio:[1,2.25,.67][i],strength:1.2,radius:.55})),.28),
  edit(base.model,[...base.model.nodes.map((n,i)=>({...n,x:[.24,.66,.78][i],y:[.32,.76,.23][i],ratio:[1,2.6,.64][i]})),{
    ...base.model.nodes[0],id:'fold-demo',role:'fold',x:.62,y:.59,ratio:1.4,strength:1.05,radius:.43
  }],.19),
];
const carrier={at(t){if(t<.9)return{hz:220,gain:.60};if(t<1.07)return{hz:220,gain:0};if(t<2.1)return{hz:165+(t-1.07)*120,gain:.55};if(t<2.25)return{hz:285,gain:0};if(t<3.3)return{hz:330,gain:.30};if(t<3.52)return{hz:330,gain:0};if(t<4.63)return{hz:247,gain:.74};if(t<4.84)return{hz:247,gain:0};if(t<5.64)return{hz:220,gain:.45};return{hz:220,gain:0}}};
(async()=>{
 const sr=24000,sec=6,arrays=[];for(let i=0;i<recipes.length;i++){const r=await api.renderPCM({instrument:recipes[i],tracks:[carrier],durationSec:sec,sampleRate:sr});arrays.push(r.left);console.log(`layout ${i+1}: rms=${rms(r.left).toFixed(4)} peak=${r.left.reduce((m,v)=>Math.max(m,Math.abs(v)),0).toFixed(4)} difference=${i?distance(arrays[0],r.left).toFixed(4):0}`)}
 const len=arrays.length*sr*sec,buf=Buffer.alloc(44+len*2);buf.write('RIFF',0);buf.writeUInt32LE(buf.length-8,4);buf.write('WAVE',8);buf.write('fmt ',12);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(len*2,40);let k=44;for(const arr of arrays)for(const x of arr){buf.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(Math.max(-1,Math.min(1,x))*32767))),k);k+=2;}
 fs.writeFileSync(path.join(__dirname,'../EMILIA_HYBRID12_KLANGVERGLEICH.wav'),buf);
 // Level-matched comparison is a listening aid only, not a change to the product's Carrier dynamics.
 const even=Buffer.from(buf);let pos=44;for(const arr of arrays){const scale=Math.min(2,.09/Math.max(.001,rms(arr)));for(const v of arr){even.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(Math.max(-1,Math.min(1,v*scale))*32767))),pos);pos+=2;}}
 fs.writeFileSync(path.join(__dirname,'../EMILIA_HYBRID12_KLANGVERGLEICH_PEGELGERECHT.wav'),even);
})().catch(e=>{console.error(e);process.exitCode=1})
