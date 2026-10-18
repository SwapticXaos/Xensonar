'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8'),backend=read('src/audio/entrophon/02_worklet_and_voice_backend.js'),code=JSON.parse(backend.match(/const T8=("(?:[^"\\]|\\.)*")/)[1]);
const currentBytes=new Function(read('src/audio/entrophon/01_wasm_asset.js')+';return GMe();')(),baselineBytes=fs.readFileSync('tests/fixtures/p4c2-n21/c11-n20.wasm');
const fixture=read('tests/f444-entrophon.cjs'),ent=new Function(fixture.slice(fixture.indexOf('function record('),fixture.indexOf('(async()=>{'))+';return record;')();
const app=read('src/01_app_runtime.js'),Encoder=new Function(app.slice(app.indexOf('class __wave39Encoder'),app.indexOf('function __wave39Submit'))+';return __wave39Encoder;')();
const bankSource=read('src/runtime/instrument/05_timing_and_admission.js').match(/ire=`([\s\S]*?)`,sre=/)[1];
let bank;const worker={postMessage:m=>{if(m.type==='prepared')bank=m.bank},close(){}};new Function('self',bankSource)(worker);worker.onmessage({data:{type:'prepare',session:1}});assert.equal(bank.length,782718);
const tanh=Float64Array.from({length:65537},(_,i)=>Math.tanh(i*8/65536));
function wave(token,epoch,frame,rate,held){return new Encoder().begin({token,epoch,frame},0,0,held,rate,128).set(8,220+token*20).set(9,2400).set(11,.7).set(12,.1).set(14,rate*.6).set(15,rate*.005).set(42,rate*.6).set(43,rate*.14).u32;}
function plain(token,epoch,frame,rate){const u=new Uint32Array(64),f=new Float32Array(u.buffer);u[0]=257|65536;u[1]=token;u[2]=epoch;u[3]=frame;u[5]=1;f[8]=220;f[9]=.1;f[10]=2800;f[11]=.7;u[13]=rate;return u;}
async function make(module,rate,profile){const clock={frame:0};class Base{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(structuredClone(m)),start(){}}}}const C=new Function('clock','AudioWorkletProcessor','sampleRate','registerProcessor',code.replace(/\bcurrentFrame\b/g,'clock.frame')+';return U;')(clock,Base,rate,()=>{}),p=new C({});await p.onMessage({type:'INIT',compiledModule:module,profile,waveBank:bank,waveTanh:tanh});await p.onMessage({type:'SET_MUTED',muted:false});assert(p.ready);const out=Array.from({length:9},()=>[new Float32Array(128),new Float32Array(128)]);return {p,clock,out,tick(){p.process([],out);clock.frame+=128;return out;},submit:r=>p.onMessage({type:'HOT_TONE_PLAN',buffer:r.buffer}),control:(token,op=2)=>p.onMessage({type:'ENTROPHON_CONTROL',token,epoch:p.bridge.epoch,op,pitch:1,gain:1,ramp:64,releaseFrames:Math.round(rate*.003)})};}
const energy=out=>out.reduce((sum,channels)=>sum+channels.reduce((s,c)=>s+c.reduce((n,x)=>n+Math.abs(x),0),0),0);
(async()=>{const modules=await Promise.all([baselineBytes,currentBytes].map(b=>WebAssembly.compile(b)));const rows=[];
 for(const rate of [44100,48000,96000])for(const kind of ['ent','wave','plain']){
  const pair=await Promise.all(modules.map(m=>make(m,rate,kind==='plain'?0:1))),record=kind==='plain'?plain:kind==='wave'?wave:ent;
  for(const a of pair)for(const t of [1,2])await a.submit(record(t,a.p.bridge.epoch,t===2?1024:0,rate,false));
  let peak=0;
  for(let b=0;b<190;b++){for(const a of pair)a.tick();for(let o=0;o<9;o++)for(let c=0;c<2;c++)assert.deepEqual(pair[1].out[o][c],pair[0].out[o][c],`unchanged PCM ${rate}/${kind}/${b}/${o}/${c}`);peak=Math.max(peak,energy(pair[1].out));}
  assert(peak>.001,kind+' fixture must sound');rows.push({rate,kind,unchangedBlocks:190,channels:18});
 }
 console.log('PASS N21 native baseline vs new binary: exact unchanged PCM, all 18 outputs, Entrophon/Wave/Core at 44.1/48/96 kHz');
 for(const rate of [44100,48000,96000])for(const record of [ent,wave])for(const held of [false,true]){
  const a=await make(modules[1],rate,1);await a.submit(record(1,a.p.bridge.epoch,0,rate,held));for(let b=0;b<10;b++)a.tick();assert(energy(a.out)>.001);const epoch=a.p.bridge.epoch;await a.control(1);let late=0;for(let b=0;b<60;b++){a.tick();if(b>50)late+=energy(a.out);}assert(late<1e-5,'finite/held cut must become silent');assert.equal(a.p.bridge.epoch,epoch,'cut must not panic shared host');assert.equal(a.p.reservations.count,0);
  // A release queued before the note is consumed must never produce a phantom onset.
  const q=await make(modules[1],rate,1);await q.submit(record(1,q.p.bridge.epoch,4096,rate,held));await q.control(1);let sound=0;for(let b=0;b<65;b++){q.tick();sound+=energy(q.out);}assert.equal(sound,0);assert.equal(q.p.reservations.count,0);
 }
 console.log('PASS N21 real C11 finite/held early release and pre-onset cancellation for Entrophon and Wave at three rates');
 for(const record of [ent,wave]){
  const a=await make(modules[1],48000,1);await a.submit(record(1,a.p.bridge.epoch,0,48000,false));await a.submit(record(2,a.p.bridge.epoch,0,48000,false));for(let b=0;b<10;b++)a.tick();const epoch=a.p.bridge.epoch;await a.control(1);for(let b=0;b<22;b++)a.tick();assert(energy(a.out)>.001,'unselected concurrent voice must keep sounding');assert.equal(a.p.bridge.epoch,epoch);assert(a.p.reservations.find(2)>=0);
  // Finished native token still has a conservative host tail: benign no-op, no panic.
  const slot=a.p.reservations.reserve(999,2,1,0,1e9);assert(slot>=0);a.p.heldReleases[slot]=0;await a.control(999);a.tick();assert.equal(a.p.bridge.epoch,epoch);assert.equal(a.p.reservations.find(999),-1);
 }
 console.log('PASS N21 C11 cut isolation and completed-token no-op: concurrent shared voices survive');
 const a=await make(modules[1],48000,0);await a.submit(plain(1,a.p.bridge.epoch,0,48000));for(let b=0;b<10;b++)a.tick();const last=a.out[0][0][127],oldEpoch=a.p.bridge.epoch;assert(energy(a.out)>.001);await a.p.onMessage({type:'LIVE_LENGTH_CUT',epoch:oldEpoch});a.tick();assert.equal(a.out[0][0][0],last,'manual core must start declick from previous output sample');assert.notEqual(a.p.bridge.epoch,oldEpoch);for(let b=0;b<5;b++)a.tick();assert.equal(energy(a.out),0);assert.equal(a.p.reservations.count,0);await a.submit(plain(2,a.p.bridge.epoch,a.clock.frame,48000));for(let b=0;b<8;b++)a.tick();assert(energy(a.out)>.001,'new manual note must remain playable after cut');
 const shared=await make(modules[1],48000,1),epoch=shared.p.bridge.epoch;await shared.p.onMessage({type:'LIVE_LENGTH_CUT',epoch});assert.equal(shared.p.bridge.epoch,epoch,'manual-core command must never fence Entrophon shared host');
 console.log('PASS N21 manual Core cut: 3ms declick, epoch/lease fence, immediate subsequent playback; shared host rejects command');
 fs.mkdirSync('results/n21',{recursive:true});fs.writeFileSync('results/n21/c11-release.json',JSON.stringify({pcm:rows,releaseRates:[44100,48000,96000],releaseKinds:['Entrophon finite/held','Wave finite/held'],protectedConcurrentVoice:true,manualCoreDeclick:true},null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
