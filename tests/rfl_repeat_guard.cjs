// RFL-GUARD: the Root-Follow repeat guard (src/audio/rfl/03_repeat_guard_worklet.js), run with the real worklet code in Node.
// A browser that delivers a node's previous 128-frame quantum again (measured in Chromium under graph churn, see
// docs/RFL_WIEDERHOLTE_QUANTEN_2026-11-13.md) produces a step at the start and the end of the copy. The guard must
// (1) pass normal audio through bit-identically, (2) never pass a repeated block on, (3) leave no step/kink that the
// click detector of the RFL probes flags, for a lost block (XenSonar case: stream continues at the right time) and a
// delayed block (minimal repro case: stream continues one block late), single and double repeats, stereo, (4) not treat
// silence / constant blocks as repeats, (5) fade invented audio out if the source stays frozen.
'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src','audio','rfl','03_repeat_guard_worklet.js'),'utf8');
const code=src.slice(src.indexOf('String.raw`')+11,src.indexOf('`;',src.indexOf('String.raw`')));
let Proc=null;
class AWP{constructor(){this.port={postMessage:m=>{this.port.last=m},onmessage:null}}}
new Function('AudioWorkletProcessor','registerProcessor','sampleRate',code)(AWP,(n,c)=>{assert.strictEqual(n,'xensonar-rfl-repeat-guard-v1');Proc=c},44100);
assert.ok(Proc,'processor registered');

const SR=44100,Q=128;
let TONE=0;
const sig=(f,ch)=>TONE?.5*Math.sin(2*Math.PI*TONE*f/SR+ch*.3):.3*Math.sin(2*Math.PI*331.7*f/SR+ch*.7)+.2*Math.sin(2*Math.PI*97.3*f/SR)+.12*Math.sin(2*Math.PI*1234.5*f/SR+ch);
function block(start){const b=[new Float32Array(Q),new Float32Array(Q)];for(let c=0;c<2;c++)for(let k=0;k<Q;k++)b[c][k]=Math.fround(sig(start+k,c));return b}
// sequence of input blocks: ids of the true block index delivered at each quantum
function run(seq,{constant=null}={}){
  const g=new Proc();const outL=[],outR=[];
  for(const id of seq){
    const inp=id===null?[new Float32Array(Q).fill(constant??0),new Float32Array(Q).fill(constant??0)]:block(id*Q);
    const out=[new Float32Array(Q),new Float32Array(Q)];
    g.process([inp],[out]);outL.push(out[0]);outR.push(out[1]);
  }
  const cat=a=>{const m=new Float32Array(a.length*Q);a.forEach((b,i)=>m.set(b,i*Q));return m};
  g.port.onmessage({data:{type:'report'}});
  return{L:cat(outL),R:cat(outR),report:g.port.last};
}
// same detector as tools/probes/rfl_click_scenarios.js
function detect(f32){const n=f32.length,out=[];const d=new Float32Array(n);for(let i=2;i<n;i++)d[i]=Math.abs(f32[i]-2*f32[i-1]+f32[i-2]);const W=384,G=6;let i=W+2;
  while(i<n-W){if(d[i]>0.012){let mx=0,sb=0,cb=0;for(let k=i-W;k<i-G;k++){sb+=d[k];cb++;if(d[k]>mx)mx=d[k]}let s2=sb,c2=cb;for(let k=i+G+1;k<=i+W;k++){s2+=d[k];c2++}const ratio=d[i]/(s2/c2+1e-7);if(ratio>25&&d[i]>8*mx){out.push(i);i+=W;continue}}i++}return out}
function repeats(m){let c=0;for(let q=Q;q+Q<=m.length;q+=Q){let same=true;for(let k=0;k<Q;k++)if(m[q+k]!==m[q+k-Q]){same=false;break}if(same)c++}return c}
const range=(a,b)=>Array.from({length:b-a},(_,i)=>a+i);

// (1) pass-through is bit-identical
{const ids=range(0,60);const r=run(ids);const ref=run(ids);for(let i=0;i<60;i++){const b=block(i*Q);for(let k=0;k<Q;k++){assert.strictEqual(r.L[i*Q+k],b[0][k]);assert.strictEqual(r.R[i*Q+k],b[1][k])}}assert.strictEqual(r.report.repeats,0)}

const cases={
  'lost single (XenSonar)':[...range(0,30),29,...range(31,60)],
  'delayed single (minimal repro)':[...range(0,30),29,...range(30,60)],
  'lost double':[...range(0,30),29,29,...range(32,60)],
  'delayed double':[...range(0,30),29,29,...range(30,60)],
  'two events':[...range(0,20),19,...range(21,40),39,...range(40,60)],
};
for(const [name,seq] of Object.entries(cases)){
  // the unguarded stream clicks (sanity: the scenario is a real defect)
  const raw=seq.map(id=>block(id*Q));const rawL=new Float32Array(seq.length*Q);raw.forEach((b,i)=>rawL.set(b[0],i*Q));
  assert.ok(detect(rawL).length>=1,name+': unguarded input must click');
  const r=run(seq);
  assert.strictEqual(repeats(r.L)+repeats(r.R),0,name+': no repeated block passes');
  assert.deepStrictEqual(detect(r.L),[],name+': left clean');
  assert.deepStrictEqual(detect(r.R),[],name+': right clean');
  assert.ok(r.report.repeats>=1,name+': guard counted the repeat');
}
// periods shorter than a block (high tone) and longer concealment: every period boundary of the continuation must stay continuous
for(const tone of [1000,2750.3,523.25]){TONE=tone;for(const [name,seq] of Object.entries({'lost double':cases['lost double'],'delayed double':cases['delayed double'],'triple':[...range(0,30),29,29,29,...range(33,60)]})){
  const r=run(seq);assert.deepStrictEqual(detect(r.L),[],tone+' Hz '+name+': left clean');assert.deepStrictEqual(detect(r.R),[],tone+' Hz '+name+': right clean')}}
TONE=0;
// (4) silence and constant blocks are not repeats
{const r=run([...range(0,10),null,null,null,...range(13,30)]);assert.strictEqual(r.report.repeats,0,'silence is not a repeat');
 const c=run([...range(0,10),null,null,...range(12,30)],{constant:.25});assert.strictEqual(c.report.repeats,0,'DC is not a repeat')}
// (5) frozen source: invented audio fades to zero
{const r=run([...range(0,20),...Array(14).fill(19)]);const tail=r.L.subarray(r.L.length-2*Q);assert.ok(Math.max(...tail.map(Math.abs))===0,'frozen source fades to silence');}
// (6) a single quantum without input mid-play is bridged like a repeat (no silence, no click, processor stays);
//     only a sustained absence (~1 s) ends the processor (no leftover node per resident job); it waits while it never had input
{const g=new Proc();const o=[new Float32Array(Q),new Float32Array(Q)];assert.strictEqual(g.process([[]],[o]),true,'waits before first input');
 const L=[];let alive=true;
 for(let i=0;i<60;i++){const o2=[new Float32Array(Q),new Float32Array(Q)];alive=g.process([i===30||i===41||i===42?[]:block(i*Q)],[o2])&&alive;L.push(...o2[0])}
 assert.ok(alive,'stays alive through short gaps');const m=Float32Array.from(L);
 assert.deepStrictEqual(detect(m),[],'gaps bridged without click');assert.ok(Math.max(...m.subarray(30*Q,31*Q).map(Math.abs))>.05,'gap is not silence');
 g.port.onmessage({data:{type:'report'}});assert.strictEqual(g.port.last.gaps,3);
 let n=0,r=true;while(r&&n<2000){const o3=[new Float32Array(Q),new Float32Array(Q)];r=g.process([[]],[o3]);n++}
 assert.strictEqual(r,false,'ends after sustained absence');assert.ok(n>300&&n<400,'after about 1 s ('+n+' quanta)')}
// (7) wiring: the resident job connects source -> guard -> destination and disconnects the guard on dispose
{const t=fs.readFileSync(path.join(__dirname,'..','src','runtime','instrument','05_timing_and_admission.js'),'utf8');
 assert.ok(t.includes('await __XenRflRepeatGuard.ensure(this.ctx)'),'guard module loaded with the resident module');
 assert.ok(t.includes('this.guard=__XenRflRepeatGuard.create(this.ctx),this.guard&&t.connect(this.guard)'),'resident output feeds the guard');
 assert.ok(t.includes('(this.guard||this.node).connect(r)'),'guard (or resident if no guard) feeds the RFL destination');
 assert.ok(t.includes('if(this.guard){try{this.guard.disconnect()}catch{}this.guard=null}'),'guard disconnected on dispose');
 const m=JSON.parse(fs.readFileSync(path.join(__dirname,'..','source-manifest.json'),'utf8'));const files=JSON.stringify(m);
 assert.ok(files.indexOf('src/audio/rfl/03_repeat_guard_worklet.js')>=0,'guard source is in the build manifest');}
console.log('rfl_repeat_guard: ok');
