'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
let runtime;
function sources(){
 runtime??=require('../offline_runtime.cjs').load(root);
 return {processor:runtime.run('fne'),preparation:runtime.run('dne'),run:code=>runtime.run(code),
  tuning:mode=>runtime.run(`vG(Fw({qualityMode:'${mode}',windowMs:76,stepMs:26,microDensity:1.15},'${mode==='base'?'flowing':'grainy'}'))`)};
}
const strip=s=>s.replace(/export\s*\{[^}]*\};?\s*$/,'');
function prepare(source,channels,sampleRate){
 let map;const worker={postMessage:m=>{if(m.type==='fault')throw Error(m.reason);map=m.map},close(){}};
 new Function('globalThis',strip(source))(worker);
 worker.onmessage({data:{type:'prepare',channels,sampleRate,sourceId:1,session:1,asset:'fixture',token:1}});
 return map;
}
function create(source,{sampleRate=48000,sourceRate=sampleRate,channels,program,map}){
 const clock={frame:0},messages=[];let Processor;
 class Base{constructor(){this.port={postMessage:m=>messages.push(m)}}}
 new Function('AudioWorkletProcessor','sampleRate','registerProcessor','clock',strip(source).replace(/\bcurrentFrame\b/g,'clock.frame'))(Base,sampleRate,(_,C)=>Processor=C,clock);
 const processor=new Processor({processorOptions:{session:1,asset:'fixture',token:1,sourceId:1}});
 const send=data=>processor.port.onmessage({data:{...data,session:1,asset:'fixture',token:1,sourceId:1}});
 send({type:'load',channels,sampleRate:sourceRate,map});
 if(!messages.some(x=>x.type==='ready'))throw Error('PCM rejected');
 send({type:'arm',program,sequence:1,firstWindowSec:.02});
 if(!messages.some(x=>x.type==='owned'))throw Error('program rejected');
 return {clock,processor,messages,send,output:[new Float32Array(128),new Float32Array(128)],
  tick(){const keep=processor.process([],[this.output]);clock.frame+=this.output[0].length;return keep}};
}
function program(mode,tuning,extra={}){return {mode,transportAnchorSec:0,desiredLoopDurationSec:1,
 loopStartSec:0,loopEndSec:.5,stepSec:.026,windowSec:.076,rawTargetHz:220,
 entryRootHz:220,sessionAnchorHz:null,smoothedRootHz:null,tuning,...extra};}
function baseline(){return fs.readFileSync(path.join(root,'tests/fixtures/live-stability/rfl-resident-baseline.js'),'utf8')}
module.exports={root,sources,prepare,create,program,baseline};
