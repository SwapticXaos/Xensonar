'use strict';
// DUAL-ALIGN-01: Dual Donor variant 3 ("aligned") against synthetic donors with known answers.
// Each property a hybrid must have is measured on the rendered PCM; variant 2 is rendered alongside where the contrast is the point.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const R=require('./helpers/dual_donor_rig.cjs'),SR=48000;
const T=o=>R.source(R.tone(o)),sp=r=>R.spectrum(r.samples,SR,.3,1.7);
const f0track=async x=>{const a=await R.aligned._internal.analyse(R.source(x),{x0:0,x1:1,y0:0,y1:1},300,()=>{});const v=[];for(let f=20;f<a.K-20;f++)v.push(a.f0[f]);
 const m=v.reduce((p,q)=>p+q,0)/v.length;return {mean:m,cents:1200*Math.sqrt(v.reduce((p,q)=>p+Math.log2(q/m)**2,0)/v.length)};};
test('a donor crossed with itself comes back unchanged (all harmonics within 0.5 dB after normalisation)',async()=>{
 const A=T({f0:220}),r=await R.render('aligned',R.plan(),A,A),a=R.spectrum(A.samples,SR,.3,1.7),b=sp(r);
 const d=[1,2,3,4,5,8,12].map(h=>R.bandEnergyDb(b,220*h-30,220*h+30)-R.bandEnergyDb(a,220*h-30,220*h+30)),mean=d.reduce((x,y)=>x+y,0)/d.length;
 for(const x of d)assert.ok(Math.abs(x-mean)<.5,'harmonic level deviates: '+d.map(v=>v.toFixed(2)));
});
test('Cross of two pitches forms one body on a shared pitch (variant 2 smears into neither)',async()=>{
 const A=T({f0:220}),B=T({f0:311.1,formants:[[300,1],[2300,.7],[3000,.4]],seed:2}),mid=Math.sqrt(220*311.1);
 const v3=sp(await R.render('aligned',R.plan(),A,B)),v2=sp(await R.render('revised',R.plan(),A,B));
 assert.ok(R.harmonicShare(v3,mid)>.9,'variant 3 shared series '+R.harmonicShare(v3,mid));
 assert.ok(R.harmonicShare(v3,311.1)<.2,'no second partial series of B');
 assert.ok(R.harmonicShare(v2,mid)<.3,'contrast: variant 2 has no shared series');
});
test('Morph path: balance 0 -> 1 glides the pitch from A to B',async()=>{
 const A=T({f0:200}),B=T({f0:300,seed:2}),r=await R.render('aligned',R.plan(),A,B,{balance:0,balanceEnd:1});
 const a=await R.aligned._internal.analyse(R.source(r.samples),{x0:0,x1:1,y0:0,y1:1},40,()=>{}),f=Array.from(a.f0);
 for(let i=1;i<f.length;i++)assert.ok(f[i]>=f[i-1]-1,'monotone glide '+f.map(Math.round));
 assert.ok(f[1]<212&&f[f.length-2]>288,'from ~200 to ~300 Hz: '+f.map(Math.round));
});
test('Imprint resonance A->B: formants of a high voice land on a low voice, which keeps its pitch',async()=>{
 const envA=f=>{let a=.02;for(const [c,g] of [[900,1],[2400,.8]])a+=g*Math.exp(-(((Math.log2(f/c))/.25)**2));return a;};
 const A=T({f0:660,formants:[[900,1],[2400,.8]]}),B=T({f0:110,formants:[[500,.3],[1500,.3],[3500,.3]],bw:1.5,seed:4});
 const p=R.plan({modeA:'resonance',mode:'imprint',direction:'A_to_B'}),v3=sp(await R.render('aligned',p,A,B)),v2=sp(await R.render('revised',p,A,B));
 assert.ok(R.envelopeCorr(v3,envA)>.6,'envelope '+R.envelopeCorr(v3,envA));assert.ok(R.harmonicShare(v3,110)>.9,'target pitch kept');assert.ok(R.harmonicShare(v3,660)<.15,'no source partials');
 assert.ok(R.envelopeCorr(v3,envA)>R.envelopeCorr(v2,envA)+.15,'contrast: variant 2 transfers the harmonic comb, not the formants');
});
test('Imprint motion A->B: the vibrato of A moves B at B\'s own pitch',async()=>{
 const A=T({f0:330,vib:.03,formants:[[500,1],[1800,.5]]}),B=T({f0:220,seed:3}),r=await R.render('aligned',R.plan({modeA:'motion',mode:'imprint',direction:'A_to_B'}),A,B);
 const o=await f0track(r.samples),a=await f0track(A.samples);
 assert.ok(Math.abs(o.mean-220)<3,'mean pitch '+o.mean);assert.ok(Math.abs(o.cents-a.cents)<8,'vibrato depth '+o.cents+' vs '+a.cents);
});
test('Event alignment: attacks at 0.2 s and 1.2 s become one attack in between; Linear keeps the old behaviour available',async()=>{
 const A=T({f0:220,onset:.2,decay:.5}),B=T({f0:220,onset:1.2,decay:.5,formants:[[400,1],[2000,.5]],seed:5});
 const r=await R.render('aligned',R.plan(),A,B),at=R.attacks(r.samples,SR);
 assert.equal(at.length,1,'attacks '+at);assert.ok(Math.abs(at[0]-.7)<.08,'attack at '+at[0]);
 assert.equal(r.manifest.analysis[0].matchedOnsets,1);
 const lin=await R.render('aligned',R.plan(),A,B,{alignment:'linear'});assert.notEqual(R.attacks(lin.samples,SR)[0]?.toFixed(2),at[0].toFixed(2));
});
test('Interlock keeps one pitch and the resonances of both donors',async()=>{
 const A=T({f0:220,formants:[[500,1]]}),B=T({f0:233,formants:[[2500,1]],seed:7}),s=sp(await R.render('aligned',R.plan({mode:'interlock'}),A,B));
 assert.ok(R.harmonicShare(s,Math.sqrt(220*233))>.9);const lo=R.bandEnergyDb(s,400,630),hi=R.bandEnergyDb(s,2000,3150),mid=R.bandEnergyDb(s,1000,1400);
 assert.ok(lo>mid+6&&hi>mid+6,'both formants above the valley: '+[lo,mid,hi].map(v=>v.toFixed(1)));
});
test('Remainder fills band edges seamlessly (no notch or bump > 1.5 dB)',async()=>{
 const y=f=>1-Math.log(f/35)/Math.log(SR*.46/35),reg={x0:0,x1:1,y0:y(2000),y1:y(500)};
 const s=sp(await R.render('aligned',R.plan({remainder:'keep_A',regA:reg,regB:reg}),R.source(R.noiseBurst({decay:50})),R.source(R.noiseBurst({decay:50,seed:9}))));
 const third=f=>R.bandEnergyDb(s,f/1.122,f*1.122)-10*Math.log10(f);
 for(const f of [500,2000])assert.ok(Math.abs(third(f)-(third(f/1.6)+third(f*1.6))/2)<1.5,'edge '+f+': '+[third(f/1.6),third(f),third(f*1.6)].map(v=>v.toFixed(2)));
});
test('44.1 kHz and 96 kHz donors, tone x noise, determinism, cancellation, manifest',async()=>{
 for(const s of [44100,96000]){const X=R.source(R.tone({sr:s,f0:220}),s),r=await R.render('aligned',R.plan(),X,X);assert.ok(R.harmonicShare(sp(r),220)>.95,'rate '+s);}
 const A=T({f0:220}),N=R.source(R.noiseBurst({decay:50})),r1=await R.render('aligned',R.plan(),A,N),r2=await R.render('aligned',R.plan(),A,N);
 assert.ok(r1.samples.every((v,i)=>v===r2.samples[i]),'deterministic');assert.ok(r1.samples.every(Number.isFinite));
 assert.equal(r1.manifest.revision,'aligned');assert.equal(r1.manifest.analysis[0].A.f0,220);assert.equal(r1.manifest.analysis[0].B.f0,null);
 assert.equal(r1.manifest.addedOscillators,0);assert.equal(r1.manifest.outputBodies,1);
 let n=0;await assert.rejects(R.aligned.render({...R.plan(),revision:'aligned'},{A:{...A,revision:'ra'},B:{...N,revision:'rb'}},{duration:2},{isCancelled:()=>++n>3}),e=>e.name==='AbortError');
 assert.throws(()=>R.aligned.validate({...R.plan(),links:[]},{A:{...A,revision:'ra'},B:{...N,revision:'rb'}},{}),/Connect at least one region/);
});
test('router: every blueprint (also old revisions) renders with variant 3, which registers from the lab room; variants 1/2 are gone from the page',()=>{
 const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
 const D=new Function(src('src/forge/dual/01_dsp_and_worker.js')+src('src/rooms/00_dual_aligned_dsp.js')+';return __F35636DualDSP;')();
 for(const revision of ['original','revised','aligned',undefined])assert.equal(D.forPlan({revision}).version,R.aligned.version,String(revision));
 const bare=new Function(src('src/forge/dual/01_dsp_and_worker.js')+';return __F35636DualDSP;')();
 assert.throws(()=>bare.forPlan({}),/not loaded/);
 assert.ok(!fs.existsSync(path.join(__dirname,'..','src/forge/original/05_dual_donor.js')),'the variant 1 renderer is removed');
 assert.ok(!/__f35636DualDSPFactoryOriginal/.test(src('src/rooms/lab.js')+src('src/forge/dual/01_dsp_and_worker.js')));
});
