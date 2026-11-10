'use strict';
// FORGE-VOICES-01: Gaia, Hildegard and Isolde. Measured on rendered PCM, not on source text:
// exact pitch (also microtonal), band limit, stereo, loop seam, tail wrap, determinism,
// mirror spectrum, self-similarity, and the negative cases.
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const spec=require(path.join(__dirname,'../src/forge/voices/00_spec.js'))(),dsp=require(path.join(__dirname,'../src/forge/voices/01_dsp.js'))();
const SR=48000,W=2048,H=512;
const note=(s,e,hz,g=.8)=>({startSec:s,endSec:e,pitch:Array.isArray(hz)?hz:[hz],gain:Array.isArray(g)?g:[g]});
// The Carrier as the Forge rasterises it: one narrow ridge per note.
function terrain(events,dur,transpose=1){const data=new Float32Array(W*H);for(let x=0;x<W;x++){const t=(x+.5)/W*dur;for(const e of events){if(t<e.startSec||t>=e.endSec)continue;const u=(t-e.startSec)/(e.endSec-e.startSec);
 const hz=e.pitch[Math.min(e.pitch.length-1,Math.round(u*(e.pitch.length-1)))]/transpose,g=e.gain[Math.min(e.gain.length-1,Math.round(u*(e.gain.length-1)))],c=(1-Math.log(hz/20)/Math.log(1000))*H-.5;
 for(let y=Math.max(0,Math.floor(c)-2);y<=Math.min(H-1,Math.ceil(c)+2);y++)data[y*W+x]=Math.max(data[y*W+x],g*Math.exp(-.5*((y-c)/.65)**2))}}return {width:W,height:H,data}}
const render=(engine,events,dur,params={},extra={})=>dsp.render({engine,params:spec.params(engine,params),events,durationSec:dur,sampleRate:SR,terrain:engine==='gaia'?terrain(events,dur,extra.pitchRatio||1):undefined,...extra});
// 4-term Blackman-Harris: side lobes below -92 dB, so off-grid energy is real and not leakage.
function spectrum(x,start,n){const re=new Float64Array(n),im=new Float64Array(n);for(let i=0;i<n;i++){const a=2*Math.PI*i/(n-1);re[i]=x[start+i]*(.35875-.48829*Math.cos(a)+.14128*Math.cos(2*a)-.01168*Math.cos(3*a))}
 dsp.fft(re,im,false);return Float64Array.from({length:n/2},(_,k)=>Math.hypot(re[k],im[k])/(n*.35875/2))}
function peak(m,n,lo,hi){let best=0,k0=0;for(let k=Math.ceil(lo*n/SR);k<hi*n/SR;k++)if(m[k]>best){best=m[k];k0=k}const a=Math.log(m[k0-1]),b=Math.log(best),c=Math.log(m[k0+1]);let e=0;for(let k=k0-6;k<=k0+6;k++)e+=m[k]*m[k];
 // mag integrates the whole main lobe, so it does not depend on where the partial falls between two bins
 return {hz:(k0+.5*(a-c)/(a-2*b+c))*SR/n,mag:Math.sqrt(e)}}
const cents=(a,b)=>1200*Math.log2(a/b),N=32768;
const dry={space:0,halo:0,shimmer:0};

test('recipes: defaults, clamping, presets and foreign data',()=>{
 for(const id of spec.ids){const r=spec.recipe(id);assert.equal(r.engine,id);assert.equal(spec.engineOf(spec.engines[id].machineId),id);
  for(const p of spec.engines[id].presets)assert.equal(spec.preset(id,p.id).preset,p.id);
  assert.deepEqual(spec.recipe(id,JSON.parse(JSON.stringify(r))),r,'round trip keeps the recipe');}
 const wild=spec.recipe('isolde',{params:{equave:99,density:2.6,spiral:'x',unknown:1}}).params;
 assert.equal(wild.equave,4);assert.equal(wild.density,3);assert.equal(wild.spiral,0);assert.equal('unknown' in wild,false);
 assert.throws(()=>spec.recipe('gaia',{schema:'xensonar.fractalia'}),/not a Forge voice/);
 assert.throws(()=>spec.recipe('gaia',{engine:'isolde'}),/another listening mode/);
 assert.throws(()=>spec.recipe('gaia',{version:2}),/Unsupported/);
 assert.equal(spec.engineOf('fractalia-self-carrier'),null);
});

test('pitch is exact, including microtonal steps',async()=>{
 for(const engine of spec.ids)for(const hz of [146.83,220*2**(7/19),987.77*2**(31/1200)]){
  const out=await render(engine,[note(.2,1.8,hz)],2,{...dry,drift:1,spiral:0}),m=spectrum(out.left,30000,N);
  // Isolde is a pitch class: measure the partial nearest to the centre of its window.
  const target=engine==='isolde'?hz*2**Math.round(Math.log2(520/hz)):hz,found=peak(m,N,target*.94,target*1.06);
  assert(Math.abs(cents(found.hz,target))<.4,`${engine} ${hz.toFixed(2)} Hz is off by ${cents(found.hz,target).toFixed(2)} ct`);
  assert(found.mag>.02,engine+' must be audible at its pitch');
 }
});

test('no aliasing: a high note has no energy between its partials',async()=>{
 for(const engine of spec.ids){const hz=3520,out=await render(engine,[note(.2,1.8,hz)],2,{...dry,width:0,drift:0}),m=spectrum(out.left,30000,N);let on=0,off=0;
  for(let k=8;k<N/2;k++){const f=k*SR/N;let grid=false;for(let o=1/64;o<=1&&!grid;o*=2){const r=f/(hz*o);grid=Math.abs(r-Math.round(r))*hz*o<14&&Math.round(r)>=1}if(grid)on+=m[k]*m[k];else off+=m[k]*m[k]}
  const rel=10*Math.log10(off/on);assert(rel<-75,`${engine}: off-grid energy ${rel.toFixed(1)} dB`);}
});

test('stereo instruments that stay mono-compatible and never clip',async()=>{
 const chord=[note(0,2,220),note(0,2,275,.6),note(.5,2,330,.7)];
 for(const engine of spec.ids){
  const out=await render(engine,chord,2,{});let differ=0,corr=0,l2=0,r2=0,pk=0;
  for(let i=0;i<out.left.length;i++){const a=out.left[i],b=out.right[i];assert(Number.isFinite(a)&&Number.isFinite(b));differ+=Math.abs(a-b);corr+=a*b;l2+=a*a;r2+=b*b;pk=Math.max(pk,Math.abs(a),Math.abs(b))}
  assert.equal(out.left.length,2*SR);assert(differ>1,engine+' must be stereo');assert(corr/Math.sqrt(l2*r2)>-.2,engine+' must not cancel in mono');
  assert(pk<=.9201,engine+' peak '+pk);assert(Math.abs(10*Math.log10(l2/r2))<3,engine+' channels must be balanced');
  assert(out.report.rms>.03,engine+' level');
  const mono=await render(engine,chord,2,{width:0,swirl:0,shimmer:0,space:0});let d=0;for(let i=0;i<mono.left.length;i++)d=Math.max(d,Math.abs(mono.left[i]-mono.right[i]));
  assert(d<1e-4,engine+' width 0 is mono, difference '+d);
  const again=await render(engine,chord,2,{});assert.deepEqual(again.left,out.left,engine+' renders deterministically');
 }
});

test('loop: no click at the seam, tails wrap into the start or are cut on request',async()=>{
 for(const engine of spec.ids){
  // a drone across the whole cycle
  const out=await render(engine,[note(0,2,196)],2,{space:.3});let step=0;for(let i=1;i<out.left.length;i++)step=Math.max(step,Math.abs(out.left[i]-out.left[i-1]));
  assert(Math.abs(out.left[0]-out.left[out.left.length-1])<=step*1.5+1e-4,engine+' seam is no larger than an ordinary sample step');
  // a note that ends with the loop: its tail belongs at the beginning
  const ending=[note(1.5,2,330)],energy=o=>{let s=0;for(let i=0;i<4800;i++)s+=o.left[i]**2+o.right[i]**2;return s};
  const wrapped=await render(engine,ending,2,{release:.5,space:0,halo:0}),cut=await render(engine,ending,2,{release:.5,space:0,halo:0,tailWrap:0});
  assert(energy(wrapped)>1e-3,engine+' tail continues at the loop start');assert(energy(cut)===0,engine+' one-shot has no tail at the start');
  assert(Math.abs(cut.left[cut.left.length-1])===0,engine+' one-shot ends in silence');
 }
});

test('Hildegard: the figure\'s intervals become the overtones',async()=>{
 const edo5=[0,1,2,3,4].map(i=>note(i*.4,i*.4+.38,220*2**(i/5)));
 // a shaky hand-drawn line is one tone, a glide is two
 const shaky=Array.from({length:40},(_,i)=>220*2**(Math.sin(i)*20/1200));
 assert.equal(dsp.scaleOf([note(0,1,shaky)]).length,1);assert.equal(dsp.scaleOf([note(0,1,[220,260,330])]).length,2);
 const tones=dsp.scaleOf(edo5);assert.equal(tones.length,5);
 const mirrored=dsp.mirrorSpectrum(tones,{partials:8,mirror:1,equave:2}).ratios,plain=dsp.mirrorSpectrum(tones,{partials:8,mirror:0,equave:2}).ratios;
 plain.forEach((r,k)=>assert(Math.abs(r-(k+1))<1e-9));
 // harmonic 3 (1902 ct) lies 18 ct below 8 steps of 5-EDO (1920 ct)
 assert(Math.abs(cents(mirrored[2],3)-18.04)<.1,'3rd overtone moves to the 5-EDO step');assert(Math.abs(cents(mirrored[1],2))<1e-6,'the equave stays');
 // and it is what sounds: sustained first tone, third partial
 const out=await render('hildegard',[note(.1,1.9,220),...edo5.slice(1).map(e=>({...e,gain:[.001]}))],2,{...dry,bow:1,mirror:1}),m=spectrum(out.left,30000,N);
 assert(Math.abs(cents(peak(m,N,640,690).hz,660)-18.04)<.5,'rendered 3rd overtone sits on the scale');
 // sympathetic halo answers on the figure's tones and adds a ringing tail
 const withHalo=await render('hildegard',edo5,2,{space:0,halo:.8,shimmer:0}),without=await render('hildegard',edo5,2,{space:0,halo:0,shimmer:0});
 assert(withHalo.report.resonators>=10);assert(withHalo.report.rms>without.report.rms);
});

test('Isolde: the same sound at every equave, and a spiral that closes',async()=>{
 const a=await render('isolde',[note(.2,1.8,220)],2,{...dry,width:0}),b=await render('isolde',[note(.2,1.8,440)],2,{...dry,width:0}),ma=spectrum(a.left,30000,N),mb=spectrum(b.left,30000,N);
 for(const f of [220,440,880,1760]){const pa=peak(ma,N,f*.97,f*1.03).mag,pb=peak(mb,N,f*.97,f*1.03).mag;assert(Math.abs(20*Math.log10(pa/pb))<.2,'partial '+f+' Hz is identical one octave apart')}
 // tritave: partials a factor 3 apart, nothing at the octave
 const t=await render('isolde',[note(.2,1.8,200)],2,{...dry,equave:3,center:600,span:5,width:0}),mt=spectrum(t.left,30000,N);
 assert(peak(mt,N,590,610).mag>.05);assert(peak(mt,N,1790,1810).mag>.01);assert(peak(mt,N,390,410).mag<1e-4,'no octave partial in a tritave tone');
 // spiral: one step per loop moves every partial up by exactly one step over the cycle
 const s=await render('isolde',[note(0,4,300)],4,{...dry,spiral:1,width:0,span:3,center:600}),early=peak(spectrum(s.left,.5*SR-N/8,N/4),N/4,560,760).hz,late=peak(spectrum(s.left,3.5*SR-N/8,N/4),N/4,560,1300).hz;
 assert(Math.abs(cents(late,early)-900)<25,'the 600 Hz partial climbs 3/4 of an octave in 3/4 of the loop, got '+cents(late,early).toFixed(1)+' ct');
 // pulse: each register pulses a whole number of times per loop
 const p=await render('isolde',[note(0,2,300)],2,{...dry,pulse:1,pulseRate:4,pulseRatio:2,sharp:1,width:0,center:600,span:1.6,attack:.002});
 let dips=0,prev=1;for(let i=0;i<40;i++){let e=0;for(let j=0;j<2400;j++)e+=p.left[i*2400+j]**2;const loud=e>.02?1:0;if(prev&&!loud)dips++;prev=loud}
 assert.equal(dips,4,'four pulses per loop at the centre register');
});

test('Gaia: timbre comes from the drawing, tuning does not change it, empty ground still sounds',async()=>{
 const alone=[note(.2,1.8,220)],crowd=[note(.2,1.8,220),note(.2,1.8,196,.9),note(.2,1.8,174.6,.9)],harmonics=out=>{const m=spectrum(out.left,30000,N);return [1,2,3,4,5,6].map(k=>peak(m,N,220*k-15,220*k+15).mag)};
 const a=harmonics(await render('gaia',alone,2,{...dry,drift:0,reachPitch:6})),muted=crowd.map((e,i)=>i?{...e,gain:[1e-9]}:e);
 const out=await dsp.render({engine:'gaia',params:spec.params('gaia',{...dry,drift:0,reachPitch:6}),events:muted,durationSec:2,sampleRate:SR,terrain:terrain(crowd,2)}),b=harmonics(out);
 assert(a.some((v,k)=>Math.abs(20*Math.log10(v/b[k]))>3),'neighbouring lines in the picture change the note\'s overtones');
 // Carrier Tuning +7 st: same picture, same overtone balance, higher pitch
 const ratio=2**(7/12),up=await render('gaia',[note(.2,1.8,220*ratio)],2,{...dry,drift:0,reachPitch:6},{pitchRatio:ratio}),mu=spectrum(up.left,30000,N);
 [1,2,3,4,5,6].forEach((k,i)=>{const v=peak(mu,N,220*ratio*k-15,220*ratio*k+15).mag;assert(Math.abs(20*Math.log10(v/a[i]))<.6,'overtone '+k+' unchanged by tuning')});
 // a note over empty ground (terrain elsewhere) is a clean tone at its pitch, not silence
 const lonely=await dsp.render({engine:'gaia',params:spec.params('gaia',{...dry,reachPitch:1}),events:[note(.2,1.8,880)],durationSec:2,sampleRate:SR,terrain:terrain([note(0,2,60)],2)});
 assert(Math.abs(cents(peak(spectrum(lonely.left,30000,N),N,800,960).hz,880))<.4);
 await assert.rejects(dsp.render({engine:'gaia',params:spec.params('gaia'),events:alone,durationSec:2,sampleRate:SR,terrain:{width:W,height:H,data:new Float32Array(W*H)}}),/empty/);
 await assert.rejects(dsp.render({engine:'gaia',params:spec.params('gaia'),events:alone,durationSec:2,sampleRate:SR}),/terrain/);
});

test('room: adds a tail, keeps the length, and bad jobs are refused',async()=>{
 const ev=[note(0,.2,440)],dryOut=await render('hildegard',ev,2,{space:0,halo:0,release:.02,tailWrap:1}),wet=await render('hildegard',ev,2,{space:.8,size:.6,halo:0,release:.02});
 const late=o=>{let s=0;for(let i=SR;i<1.5*SR;i++)s+=o.left[i]**2;return s};assert(late(wet)>late(dryOut)*10+1e-6,'reverberation after the note');assert.equal(wet.left.length,dryOut.left.length);
 assert(wet.report.roomSeconds>1);
 await assert.rejects(render('isolde',[],2),/empty/);await assert.rejects(render('isolde',[note(0,1,220,0)],2),/empty/);
 await assert.rejects(render('isolde',[note(0,1,220)],0),/bounds/);await assert.rejects(render('isolde',[note(0,1,220)],700),/bounds/);
 await assert.rejects(dsp.render({engine:'nobody',params:{},events:[note(0,1,220)],durationSec:1,sampleRate:SR}),/Unknown/);
 // a dense picture: the 512 strongest strokes are rendered and the rest is reported, never cut silently
 const dense=await render('isolde',Array.from({length:600},(_,i)=>note(i/400,i/400+.05,220+i,i<88?.01:.8)),2,{space:0});
 assert.equal(dense.report.notes,512);assert.equal(dense.report.omitted,88);assert.equal((await render('isolde',[note(0,1,220)],2)).report.omitted,0);
 // cancellation reaches the renderer
 await assert.rejects(dsp.render({engine:'hildegard',params:spec.params('hildegard'),events:[note(0,2,220)],durationSec:2,sampleRate:SR},{check(){throw new DOMException('stop','AbortError')}}),{name:'AbortError'});
 // other sample rates
 const out=await dsp.render({engine:'isolde',params:spec.params('isolde'),events:[note(0,1,220)],durationSec:1,sampleRate:44100});assert.equal(out.left.length,44100);
});
