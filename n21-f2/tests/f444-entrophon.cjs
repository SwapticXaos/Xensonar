'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const original=read('tests/fixtures/f444_baseline/entrophon_worklet.js');
const current=JSON.parse(read('src/audio/entrophon/02_worklet_and_voice_backend.js').match(/const T8=("(?:[^"\\]|\\.)*")/)[1]);
function load(source,rate=48000){const env={frame:0};class Base{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(structuredClone(m)),start(){}};}}
 const api=new Function('environment','AudioWorkletProcessor','sampleRate','registerProcessor',source.replace(/\bcurrentFrame\b/g,'environment.frame')+';return {Processor:U,Ledger:w,Histogram:N};')(env,Base,rate,()=>{});return {...api,env};}
const report={checks:[],realWasm:[],benchmarks:[]},pass=s=>{report.checks.push(s);console.log('PASS',s)};
const old=load(original),now=load(current),a=new old.Processor({}),b=new now.Processor({});
for(const p of [a,b]){p.reservations=new old.Ledger(512,512);p.bridge={renderedFrames:0,epoch:1};p.completionBatchVersion=1;}
// Use the current ledger on the candidate, including all invalidation points.
b.reservations=new now.Ledger(512,512);
let seed=671;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
function state(p){const r=p.reservations;return {tokens:[...r.tokens],units:[...r.units],voices:[...r.voices],frames:[...r.frames],ends:[...r.ends],states:[...r.states],activeLo:r.activeLo,activeHi:r.activeHi,count:r.count,usedUnits:r.usedUnits,usedVoices:r.usedVoices,started:p.started,endsCount:p.normalEnds,messages:p.messages};}
for(let k=0;k<12000;k++){
 const mode=Math.floor(rand()*6),token=1+Math.floor(rand()*80),offset=Math.floor(rand()*512),duration=Math.floor(rand()*4000),dt=1+Math.floor(rand()*256);
 for(const p of [a,b]){
  const r=p.reservations;
  if(mode<2)r.reserve(token,2,1,p.bridge.renderedFrames+offset,p.bridge.renderedFrames+offset+duration);
  else if(mode===2)r.release(r.find(token));
  else if(mode===3){const slot=r.find(token);if(slot>=0){r.ends[slot]=p.bridge.renderedFrames+duration;r.nextTransition=0;}}
  else if(mode===4&&k%53===0)r.clear();
  p.bridge.renderedFrames+=dt;p.accountRenderedReservations();
 }
 assert.deepEqual(state(b),state(a),'reservation lifecycle differs at operation '+k);
 // Keep comparison bounded; exact per-callback message order was compared.
 a.messages.length=b.messages.length=0;
}
pass('12,000 deterministic lifecycle mutations preserve reservations, exact start/end counters and completion ordering');
for(const values of [[128,128,128,256,256,128,64],[NaN,Infinity,-Infinity,0,0,-1,-1,128,128],Array(1000).fill(128)]){
 const x=new old.Histogram([0,64,128,256]),y=new now.Histogram([0,64,128,256]);for(const value of values){x.observe(value);y.observe(value);assert.deepEqual(y.snapshot(),x.snapshot());}
}pass('diagnostic counts and bounds remain identical, including repeated and invalid observations');
const bytes=new Function(read('src/audio/entrophon/01_wasm_asset.js')+';return GMe();')();
function record(token,epoch,frame,rate,held=false){const u=new Uint32Array(64),f=new Float32Array(u.buffer);u[0]=2|256;u[1]=token;u[2]=epoch;u[3]=frame>>>0;u[4]=Math.floor(frame/4294967296);u[5]=2;u[6]=1;u[7]=held?65536:0;
 f[8]=220+token*.123;f[9]=330+token*.123;f[14]=440;f[17]=.3;
 for(const [i,v]of [[20,.15],[21,.1],[27,1],[29,1200],[30,3500],[31,800],[34,.7],[35,1],[36,.3],[37,440],[38,1],[39,.15],[41,.1],[42,.2],[43,1]])f[i]=v;
 u[22]=Math.round(rate*.003);u[23]=Math.round(rate*.03);u[24]=Math.round(rate*.12);u[25]=Math.round(rate*.06);u[26]=held?rate*20:Math.round(rate*.24);u[28]=32;u[32]=128;u[33]=1024;u[40]=100;u[44]=63;return u;}
function plainRecord(token,epoch,frame,rate){
 const u=new Uint32Array(64),f=new Float32Array(u.buffer);u[0]=1|256;u[1]=token;u[2]=epoch;u[3]=frame>>>0;u[4]=Math.floor(frame/4294967296);u[5]=2;
 for(let k=0;k<2;k++){const i=8+k*7;f[i]=220*(1+k*.5);f[i+1]=.1;f[i+2]=2800;f[i+3]=.7;u[i+4]=k*128;u[i+5]=Math.round(rate*.14);u[i+6]=0;}return u;
}
(async()=>{
 const module=await WebAssembly.compile(bytes);
 for(const rate of [44100,48000,96000])for(const batch of [0,1])for(const profile of [0,1]){
  const x=load(original,rate),y=load(current,rate),p=new x.Processor({}),q=new y.Processor({});
  for(const n of [p,q]){await n.onMessage({type:'INIT',compiledModule:module,profile,completionBatchVersion:batch});await n.onMessage({type:'SET_MUTED',muted:false});assert(n.ready);}
  let peak=0,accepted=0;const out=()=>Array.from({length:9},()=>[new Float32Array(128),new Float32Array(128)]);
  const left=out(),right=out();
  for(let k=0;k<280;k++){
   if([0,11,60,112,153].includes(k))for(const n of [p,q]){
    const frame=(n===p?x:y).env.frame;
    for(let v=0;v<3;v++){const r=profile?record(1+k*3+v,n.bridge.epoch,frame+(v===2?4096:0),rate,k===0):plainRecord(1+k*3+v,n.bridge.epoch,frame,rate);await n.onMessage({type:'HOT_TONE_PLAN',buffer:r.buffer});}
   }
   if([4,18].includes(k))for(const n of [p,q])await n.onMessage({type:'ENTROPHON_CONTROL',epoch:n.bridge.epoch,token:1,op:k===4?1:2,pitch:1.37,gain:.8,ramp:64,releaseFrames:128});
   if(k===16){x.env.frame+=256;y.env.frame+=256;} // Rebase a pending note.
   if(k===63){x.env.frame-=128;y.env.frame-=128;} // Exact quantum repeat.
   if(k===100||k===102)for(const n of [p,q])await n.onMessage({type:'SET_MUTED',muted:k===100});
   if(k===150)for(const n of [p,q])await n.onMessage({type:'PANIC'});
   p.process([],left);q.process([],right);
   for(let o=0;o<9;o++)for(let c=0;c<2;c++){assert.deepEqual(right[o][c],left[o][c],`PCM ${rate}/${batch}/${k}/${o}/${c}`);for(const value of right[o][c]){assert(Number.isFinite(value));peak=Math.max(peak,Math.abs(value));}}
   assert.deepEqual(q.diagnosticSnapshot(),p.diagnosticSnapshot());assert.deepEqual(q.messages,p.messages,'message ordering');p.messages.length=q.messages.length=0;
   x.env.frame+=128;y.env.frame+=128;accepted=q.kernelAccepted;
  }
  assert(peak>.0001);assert(accepted>0);report.realWasm.push({rate,batch,profile,blocks:280,channels:18,peak,accepted});
 }
 pass('real embedded WASM: bit-identical core and Entrophon main + eight stereo aux outputs and diagnostics at 44.1/48/96 kHz, batch on/off, gliss/release/mute/panic/context changes');
 const median=v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)];
 for(const voices of [1,8,32]){
  const times=[[],[]];
  for(let trial=0;trial<7;trial++)for(const idx of trial%2?[1,0]:[0,1]){
   const api=idx?now:old,p=new api.Processor({});p.reservations=new api.Ledger(512,512);p.bridge={renderedFrames:0,epoch:1};
   for(let k=0;k<voices;k++)p.reservations.reserve(k+1,2,1,0,Infinity);p.bridge.renderedFrames=128;p.accountRenderedReservations();
   const start=performance.now();for(let k=0;k<100000;k++){p.bridge.renderedFrames+=128;p.accountRenderedReservations();}times[idx].push(performance.now()-start);
  }
  report.benchmarks.push({voices,callbacks:100000,beforeMs:median(times[0]),afterMs:median(times[1]),beforeRuns:times[0],afterRuns:times[1]});
 }
 fs.writeFileSync(path.join(root,'results/f444-entrophon.json'),JSON.stringify(report,null,2)+'\n');console.log('BENCH',report.benchmarks.map(v=>({voices:v.voices,before:v.beforeMs,after:v.afterMs})));
})().catch(e=>{console.error(e);process.exitCode=1});
