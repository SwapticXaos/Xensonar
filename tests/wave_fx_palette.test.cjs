'use strict';
// FX-PALETTE-01 (no browser): the Wave Editor's new effects run in the real worker engine (makeRegistry + workerEngine from the source):
// Tuning Resonator · Harmonic Memory and Material Resonator · Swarm Materials.
//  - wet 0 = neutral (bit-identical, skipped)       - finite output, no NaN / Inf, no runaway level
//  - the Tuning Resonator finds the root in the audio itself (harmonic memory) and rings on the pitch set; Memory = longer ring
//  - every pitch set (harmonics, JI 5, JI 7, EDO, Bohlen–Pierce) and every material gives a DIFFERENT colour (palette, no sameness)
//  - deterministic: the same job renders the same samples
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const extract=require('./helpers/extract_function.cjs');
const src=fs.readFileSync(path.join(__dirname,'..','src','post-oct','015c-xen-wave-dsp-w01.js'),'utf8');
const registry=new Function('return ('+extract(src,'makeRegistry')+')()')();
const engine=new Function('registry','return ('+extract(src,'workerEngine')+')(registry)')(registry);
const SR=48000;
function tone(sec,f0=110,stereo=true){const n=Math.round(sec*SR),L=new Float32Array(n),R=new Float32Array(n);
 for(let i=0;i<n;i++){let v=0;for(let h=1;h<=5;h++)v+=Math.sin(2*Math.PI*f0*h*i/SR)/h;const env=(i%(SR/2))<SR/10?1:.35;L[i]=.25*v*env;R[i]=.25*v*env*.9}return stereo?[L,R]:[L]}
function run(type,params,ch=tone(2),tailMode='extend'){const job={jobId:'t',documentId:'d',revision:1,sampleRate:SR,range:{start:0,end:ch[0].length},tailMode,
  nodes:[{id:'n1',type,enabled:true,params,automation:{}}],channels:ch.map(c=>new Float32Array(c))};return engine.execute(job,()=>{})}
const stats=r=>{let peak=0,sum=0,n=0,bad=0;for(const c of r.channels)for(const v of c){if(!Number.isFinite(v))bad++;else{peak=Math.max(peak,Math.abs(v));sum+=v*v;n++}}return {peak,rms:Math.sqrt(sum/Math.max(1,n)),bad}};
const diff=(a,b)=>{let d=0,n=0;for(let c=0;c<a.length;c++)for(let i=0;i<Math.min(a[c].length,b[c].length);i++){d+=(a[c][i]-b[c][i])**2;n++}return Math.sqrt(d/n)};
test('both effects are in the registry with category Resonance & Material',()=>{
 for(const t of ['tuningResonator','materialResonator']){assert.ok(registry[t],t);assert.equal(registry[t].category,'Resonance & Material')}
});
test('wet 0 = neutral: the input comes back bit-identical',()=>{
 const ch=tone(1);for(const t of ['tuningResonator','materialResonator']){const r=run(t,{wet:0},ch,'truncate');for(let c=0;c<2;c++)assert.deepEqual(Array.from(r.channels[c]),Array.from(ch[c]),t)}
});
test('Tuning Resonator: finds the root in the audio, finite, level-matched, rings longer with more memory',()=>{
 const r=run('tuningResonator',{wet:1,memorySec:1.5,set:0});const s=stats(r),inS=stats({channels:tone(2)});
 assert.equal(s.bad,0);assert.ok(s.peak<8,'no runaway: peak '+s.peak);assert.ok(s.rms>inS.rms*.2&&s.rms<inS.rms*4,'level matched: '+s.rms+' vs '+inS.rms);
 const det=r.metrics.effects.find(x=>x.type==='tuningResonator')?.detail;assert.ok(det&&Math.abs(det.root/110-1)<.06,'root found in the audio ≈ 110 Hz: '+JSON.stringify(det));
 const short=run('tuningResonator',{wet:1,memorySec:.1,set:0}),long=run('tuningResonator',{wet:1,memorySec:6,set:0});
 assert.ok(long.channels[0].length>short.channels[0].length,'longer memory = longer tail');
});
test('Tuning Resonator: every pitch set has its own colour (palette)',()=>{
 const outs=[0,1,2,3,4].map(set=>run('tuningResonator',{wet:1,memorySec:1.2,set,edo:31},tone(1.5),'truncate'));
 for(const o of outs)assert.equal(stats(o).bad,0);
 for(let a=0;a<outs.length;a++)for(let b=a+1;b<outs.length;b++)assert.ok(diff(outs[a].channels,outs[b].channels)>1e-3,'set '+a+' ≠ set '+b);
 const typed=run('tuningResonator',{wet:1,set:2,rootHz:220},tone(1.5),'truncate');assert.equal(typed.metrics.effects.find(x=>x.type==='tuningResonator').detail.root,220,'a typed root wins');
});
test('Material Resonator: finite for all six materials, each material sounds different, mono works',()=>{
 const outs=[0,1,2,3,4,5].map(m=>run('materialResonator',{material:m,wet:.8},tone(1.5),'truncate'));
 for(const [i,o] of outs.entries()){const s=stats(o);assert.equal(s.bad,0,'material '+i);assert.ok(s.peak<8,'material '+i+' peak '+s.peak)}
 for(let a=0;a<outs.length;a++)for(let b=a+1;b<outs.length;b++)assert.ok(diff(outs[a].channels,outs[b].channels)>1e-4,'material '+a+' ≠ '+b);
 const mono=run('materialResonator',{material:5,wet:.8},tone(1,110,false),'truncate');assert.equal(stats(mono).bad,0);assert.equal(mono.channels.length,1);
});
test('deterministic: the same job renders the same samples',()=>{
 for(const t of ['tuningResonator','materialResonator']){const a=run(t,{wet:.7}),b=run(t,{wet:.7});assert.equal(diff(a.channels,b.channels),0,t)}
});
test('Wavefolder: bounded, more drive = more overtones, wet 0 neutral, symmetry changes the colour',()=>{
 const sine=()=>{const n=SR,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=.8*Math.sin(2*Math.PI*220*i/SR);return [x]};
 const hf=r=>{const x=r.channels[0];let e=0;for(let i=1;i<x.length;i++)e+=(x[i]-x[i-1])**2;return e};/* first difference = high-frequency energy */
 const neutral=run('wavefolder',{wet:0},sine(),'truncate');assert.deepEqual(Array.from(neutral.channels[0]),Array.from(sine()[0]));
 const soft=run('wavefolder',{driveDb:3,wet:1},sine(),'truncate'),hard=run('wavefolder',{driveDb:24,wet:1},sine(),'truncate');
 for(const r of [soft,hard]){const s=stats(r);assert.equal(s.bad,0);assert.ok(s.peak<1.3,'bounded: '+s.peak)}
 assert.ok(hf(hard)>hf(soft)*2,'more drive, more overtones: '+hf(soft).toFixed(2)+' → '+hf(hard).toFixed(2));
 const asym=run('wavefolder',{driveDb:12,symmetry:.8,wet:1},sine(),'truncate'),sym=run('wavefolder',{driveDb:12,symmetry:0,wet:1},sine(),'truncate');
 assert.ok(diff(asym.channels,sym.channels)>1e-3,'symmetry changes the colour');
});
