'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-core.js'),'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function node(){return {gain:{value:1,setTargetAtTime(v){this.value=v},cancelScheduledValues(){},setValueAtTime(){},cancelAndHoldAtTime(){}},frequency:{value:0,setTargetAtTime(){},cancelAndHoldAtTime(){}},Q:{value:1,setTargetAtTime(){},cancelAndHoldAtTime(){}},connect(){},disconnect(){},port:{postMessage(){},close(){}}}}
async function scenario(action){
 let ready,created=0,disposed=0,candidate=null;
 const s={console,localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},requestAnimationFrame:()=>1,setTimeout,clearTimeout,
  __XenEqLive:{prepare:()=>new Promise(r=>ready=r),create:()=>{created++;return {node:(candidate=node()),status:{},apply(){},dispose(){disposed++}}}}};
 vm.runInNewContext(source+'\nglobalThis.eq=__XenEQ;',s);
 const ctx={state:'running',sampleRate:48000,currentTime:0,createGain:node,createBiquadFilter:node,audioWorklet:{},addEventListener(){},removeEventListener(){}};
 s.eq.set('material:x',{mode:'raster',a:Array.from({length:360},(_,i)=>i<180?.5:-.5)});
 const d=s.eq.create(ctx,'material:x');
 if(action==='early-dispose'){d.dispose();ready();await wait(5);assert.equal(created,0);assert.equal(s.eq.diagnostics().devices,0);return}
 ready();await wait(5);assert.equal(created,1);
 if(action==='processor-error'){candidate.onprocessorerror();assert.equal(d.backend,'native-fallback');assert(d.filterCount>0)}
 d.dispose();await wait(250);assert.equal(disposed,1);assert.equal(s.eq.diagnostics().devices,0);
}
(async()=>{await scenario('early-dispose');await scenario('dispose-during-warmup');await scenario('processor-error');console.log('PASS EQ disposal fences asynchronous preparation and pending bridge timers')})().catch(e=>{console.error(e);process.exitCode=1});
