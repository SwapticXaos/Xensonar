'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const backend=fs.readFileSync(path.join(root,'src/audio/entrophon/02_worklet_and_voice_backend.js'),'utf8');
const src=JSON.parse(backend.match(/T8=("(?:\\.|[^"\\])*")/)[1]);
function method(name){const key=name+'(',start=src.indexOf(key);assert(start>=0);const body=src.indexOf('{',start);let depth=0,q=null;for(let i=body;i<src.length;i++){let c=src[i];if(q){if(c==='\\'){i++;continue}if(c===q)q=null;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c==='{')depth++;else if(c==='}'&&!--depth)return src.slice(start,i+1)}throw Error('Unclosed '+name)}
function object(names,frame=0){const box={currentFrame:frame,Float32Array,Math};vm.createContext(box);return {box,o:vm.runInContext('({'+names.map(method).join(',')+'})',box)}}
// Youngest reader would fit, oldest would underrun. No reader may be partially mixed.
{
 const {o}=object(['mixHoldStems'],128),tap={len:1000,BASE:0,ch:[{idx:0,buf:new Float32Array(1000).fill(.5)}],complete:false,preparedUntil:200};
 const output=Array.from({length:9},()=>[new Float32Array(128).fill(.25),new Float32Array(128).fill(.25)]),events=[];
 o.holdStemReaders=[{tap,start:0},{tap,start:128}];o.holdPlans=[{tap,committed:true}];o.port={postMessage:m=>events.push(m)};
 o.mixHoldStems(output,0,128);
 assert(output.flat().every(c=>c.every(v=>v===.25)),'no partial additive write before failed producer');
 assert.equal(o.holdStemReaders.length,0);assert.equal(o.holdPlans[0].committed,false);
 assert.equal(o.holdPrefixUnderruns,1);assert.equal(o.holdPrefixFailedSteps,2);assert.equal(o.holdCompleteSteps||0,0);assert.equal(events[0].type,'HOLD_PREFIX_UNDERRUN');
 o.mixHoldStems(output,0,128);assert.equal(events.length,1,'no restart or catch-up');
}
// Producer remains alive after HOLD_STOP until its already audible tail is written.
{
 const {o}=object(['advanceHoldStemPrep']),events=[];let writes=0,destroyed=0;
 const channels=Array.from({length:10},()=>new Float32Array(128));
 const pb={maxRenderFrames:128,render(n){writes++;for(let c=0;c<10;c++)channels[c].fill(c===9&&writes>6?.25:0)},outputLeft:()=>channels[0],outputRight:()=>channels[1],outputAux:i=>channels[i+2],destroy(){destroyed++}};
 const p={pb,BASE:128,total:1280,pos:0,activeMask:0,ch:Array.from({length:10},()=>new Float32Array(1280)),id:3,epoch:2,count:1};
 p.tap={len:p.total,BASE:128,ch:p.ch.map((buf,idx)=>({buf,idx})),preparedUntil:0,complete:false};
 const h={prep:p,prepared:false};o.holdPlans=[h];o.holdPreps=[p];o.bridge={epoch:2};o.port={postMessage:m=>events.push(m)};
 for(let n=0;n<5;n++)o.advanceHoldStemPrep();assert(h.prepared);assert.equal(events.length,1);assert.equal(p.pos,640);assert.equal(h.tap.ch.length,10,'late buses cannot be discarded from silent prefix');
 o.holdStemReaders=[{tap:p.tap,start:0}];o.holdPlans=[];
 while(o.holdPreps.length)o.advanceHoldStemPrep();assert(p.tap.complete);assert.equal(destroyed,1);assert.equal(events.length,1,'READY emitted once');assert(p.tap.ch.some(c=>c.idx===9&&c.buf.some(v=>v!==0)),'delayed final AUX preserved');
}
// Old epochs are destroyed even while old tails exist; never rendered into a new context.
{
 const {o}=object(['advanceHoldStemPrep']);let renders=0,destroys=0;
 const p={pb:{render(){renders++},destroy(){destroys++}},epoch:1,tap:{}};o.holdPreps=[p];o.holdPlans=[];o.holdStemReaders=[{tap:p.tap}];o.bridge={epoch:2};
 o.advanceHoldStemPrep();assert.equal(renders,0);assert.equal(destroys,1);assert.equal(o.holdPreps.length,0);
}
console.log('GREEN prefix preflight, no false completeAudio, no catch-up, STOP-tail ownership, late AUX, epoch disposal');
