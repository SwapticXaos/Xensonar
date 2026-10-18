'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,'src/nodal',n),'utf8');
// Host-realm DSP (no VM bridge on each Math call) for realistic kernel timing.
const source=['01_instrument_model.js','02_synthesis_kernel.js','07_sound_designer.js'].map(read).join('\n');
const api=new Function(source+';return {model:__XenNodalModel,dsp:__XenNodalDSP,starter:nodalOpenStarter,kernel:createNodalSynthesisKernel};')();
const {model,dsp,starter}=api,report={checks:[],metrics:[],limits:['CPU timings describe this execution host, not the user laptop.','Numerical separation is not musical preference.']};
const pass=s=>{report.checks.push(s);console.log('PASS',s)};
const render=(i,o={},sr=48000)=>dsp.render(model.compile(model.normalize(i)),{durationSec:.35,...o},sr);
function peak(a){let p=0;for(const v of a){assert(Number.isFinite(v));p=Math.max(p,Math.abs(v));}return p;}
function rms(a){return Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);}
function relativeDifference(a,b){assert.equal(a.length,b.length);return Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)/(a.reduce((s,v)=>s+v*v,0)||1));}
const installation=model.fromInstallation({nodes:[{residentId:'a',x:100,y:100,freq:220,myzelEffectModuleType:'comb'},{residentId:'b',x:180,y:140,freq:330,myzelEffectModuleType:'fold'}],width:400,height:300});
assert.equal(installation.instrument.schemaVersion,1);assert.equal(installation.diagnostics.length,1);assert.equal(installation.diagnostics[0].legacyModule,'comb');assert(peak(render(installation.instrument).pcm)>.001);pass('installation import remains V1, reports unsupported organ and produces sound');
const base=starter('hollow'),bank=[];
for(const wave of ['sine','triangle','saw','hollow','pulse'])bank.push({wave,pcm:render({...base,material:{...base.material,body:1,wave}}).pcm});
for(let i=0;i<bank.length;i++)for(let j=0;j<i;j++){const d=relativeDifference(bank[i].pcm,bank[j].pcm);assert(d>.01,bank[i].wave+' / '+bank[j].wave+' collapsed in the fully resonant path');report.metrics.push({bodyOnlyWaves:[bank[i].wave,bank[j].wave],relativeDifference:d});}
pass('all five wave families remain distinct with 100% resonant body, without a dry bypass');
const meta=model.normalize({...base,previewRatios:['17/13','19/17','23/19','29/23'],nodes:base.nodes.map(n=>({...n,ratioText:'1.000000'}))});assert.equal(model.semanticKey(base),model.semanticKey(meta));pass('audition ratios / ratio labels do not invalidate the DSP identity');
const plan=model.compile(base),clone=structuredClone(plan);assert.deepEqual(render(base,{durationSec:.1}).pcm,dsp.render(clone,{durationSec:.1}).pcm);pass('structured-cloned plan matches the local kernel exactly');
for(const count of [1,3,7])for(const sr of [8000,44100,48000,96000])for(const hz of [35,220,11000]){
 const i=model.normalize({...starter('obsidian'),nodes:Array.from({length:count},(_,k)=>({...base.nodes[k%3],id:'r'+k,excitation:1,pickup:1,strength:2,ratio:1+k*.07})),material:{...base.material,stretch:1,balance:1,natural:.15,width:1,register:1},coupling:.2});const result=render(i,{frequency:hz,velocity:1,gain:1,durationSec:.05},sr);assert(peak(result.left)<1.1);assert(peak(result.right)<1.1);assert.equal(result.snapshot.faults,0);assert(result.snapshot.ended);
}pass('36 dense/register/rate cases: finite stereo, bounded output, bounded lifetime');
const strength=[.3,1,1.8].map(strength=>render({...base,nodes:base.nodes.map(n=>({...n,x:.45,y:.6,radius:.5,strength}))}).pcm);
assert(relativeDifference(strength[0],strength[1])>.001&&relativeDifference(strength[1],strength[2])>.001);pass('Strength retains a signal effect throughout a dense network sweep');
const mono=render({...base,material:{...base.material,width:0}});assert.deepEqual(mono.left,mono.right);
const wide=render({...base,material:{...base.material,width:1}});assert(rms(wide.pcm)>rms(mono.pcm)*.7);assert(rms(wide.pcm)<rms(mono.pcm)*1.3);pass('zero-width channels match; mono fold-down of wide pickup retains level');
const dryInstrument={...base,nodes:[{...base.nodes[0],role:'resonator',ratio:1}],material:{...base.material,wave:'sine',body:0,natural:0,width:0}};
const v=dsp.voice(model.compile(model.normalize(dryInstrument)),{held:true,frequency:220.123,velocity:.8}),block=new Float32Array(128);for(let i=0;i<30;i++)v.process(block);const age=v.snapshot().ageFrames;assert(v.setFrequency(432.123));for(let i=0;i<50;i++)v.process(block);assert(Math.abs(v.snapshot().frequency-432.123)<.001);assert(v.snapshot().ageFrames>age);v.noteOff();for(let i=0;i<100;i++)v.process(block);assert(v.ended);pass('continuous non-EDO glissando preserves age and releases to silence');
// Absolute body resonance stays put while the root moves; register shifts only the body.
const fixed=model.normalize({...base,nodes:[{...base.nodes[0],role:'formant',ratio:1}],material:{...base.material,body:1,balance:.75,stretch:0,follow:0,natural:0,register:0,width:0}});
function bodyPower(pcm,f){const count=8192,offset=9600;let re=0,im=0;for(let i=0;i<count;i++){const x=pcm[offset+i]*(.5-.5*Math.cos(2*Math.PI*i/(count-1))),a=2*Math.PI*f*i/48000;re+=x*Math.cos(a);im+=x*Math.sin(a);}return re*re+im*im;}
const low=render(fixed,{frequency:220,durationSec:.4}),highRoot=render(fixed,{frequency:440,durationSec:.4}),shifted=render({...fixed,material:{...fixed.material,register:1}},{frequency:440,durationSec:.4});
assert(Math.abs(bodyPower(low.pcm,616)/bodyPower(highRoot.pcm,616)-1)<.02);
assert(bodyPower(highRoot.pcm,440)>bodyPower(highRoot.pcm,220)*100);
assert(bodyPower(shifted.pcm,1232)>bodyPower(shifted.pcm,616)*100);
pass('body-stable resonance retains 616 Hz across a root octave; Body register moves it to 1232 Hz');

const struck=model.normalize({...fixed,excitation:{kind:'impulse',level:.7},material:{...fixed.material,follow:1,natural:1,balance:.8},nodes:fixed.nodes.map(n=>({...n,role:'resonator',y:.75}))});
const glassTail=render({...struck,material:{...struck.material,damping:0}},{frequency:220,durationSec:.08}),softTail=render({...struck,material:{...struck.material,damping:1}},{frequency:220,durationSec:.08});
function latePower(pcm,f){const count=8192,offset=48000;let re=0,im=0;for(let i=0;i<count;i++){const x=pcm[offset+i]*(.5-.5*Math.cos(2*Math.PI*i/(count-1))),a=2*Math.PI*f*i/48000;re+=x*Math.cos(a);im+=x*Math.sin(a);}return re*re+im*im;}
const decayContrast=latePower(glassTail.pcm,880)/Math.max(1e-15,latePower(softTail.pcm,880));assert(decayContrast>3);report.metrics.push({upperModeLateDecayContrast:decayContrast});pass('spectral damping independently changes the upper-mode tail after the note ends');

// A coherent high-register fixture: only the fundamental fits the selected mip.
// DFT measures expected alias bins without comparing raw phase correlations.
const high=render({...dryInstrument,material:{...dryInstrument.material,wave:'saw'}},{frequency:11718.75,gain:.5,durationSec:.5}).pcm,n=8192,offset=12000;
function powerAt(bin){let re=0,im=0;for(let k=0;k<n;k++){const x=high[offset+k]*(.5-.5*Math.cos(2*Math.PI*k/(n-1))),a=2*Math.PI*bin*k/n;re+=x*Math.cos(a);im-=x*Math.sin(a);}return re*re+im*im;}
const fundamental=powerAt(2000),thirdAlias=powerAt(2192),second=powerAt(4000);const aliasDb=10*Math.log10(Math.max(1e-30,(thirdAlias+second)/fundamental));assert(aliasDb < -45);report.metrics.push({highRegisterAliasDb:aliasDb,frequency:11718.75});pass('high-register Saw mip suppresses folded second/third partials below -45 dB');
for(const nodes of [1,3,5,7]){
 const instrument=model.normalize({...base,nodes:Array.from({length:nodes},(_,k)=>({...base.nodes[k%3],id:'perf'+k,x:.2+(k%3)*.2,y:.5}))}),p=model.compile(instrument),count=Math.floor(8/p.cost),l=new Float32Array(128),r=new Float32Array(128);
 let elapsed=0;for(let take=0;take<2;take++){const voices=Array.from({length:count},()=>dsp.voice(p,{durationSec:1})),start=performance.now();for(let b=0;b<375;b++)for(const voice of voices)voice.process(l,r);elapsed=performance.now()-start;}
 report.metrics.push({nodes,voices:count,cost:p.cost,renderedSeconds:1,hostMs:elapsed});assert(elapsed<900,'host admitted-polyphony envelope exceeded one realtime second');
}pass('host-realm admitted-polyphony matrix stays below one realtime second');
async function admission(){
 let frame=0,actualNode,tickets=0,maxTickets=0;const ctx={state:'running',sampleRate:48000,get currentTime(){return frame/48000;},audioWorklet:{},addEventListener(){},removeEventListener(){}};
 class Node{constructor(){actualNode=this;let Processor;const self=this;const Base=class{constructor(){this.port={postMessage:data=>self.port.onmessage?.({data})};}};this.port={onmessage:null,postMessage:data=>this.processor.port.onmessage({data}),close(){}};const factory=new Function('__XenNodalModel','createNodalSynthesisKernel',read('04_audio_runtime.js')+';return nodalWorkletProcessorFactory;')(api.model,api.kernel);factory(api.kernel,(name,C)=>Processor=C,Base,48000,()=>frame);this.processor=new Processor();}connect(){}disconnect(){}}
 const {runtime,localModel,localStarter}=new Function('jF','AudioWorkletNode',source+'\n'+read('04_audio_runtime.js')+';return {runtime:__XenNodalLive,localModel:__XenNodalModel,localStarter:nodalOpenStarter};')(()=>Promise.resolve(),Node);
 const i=localStarter('prism'),player=await runtime.createPlayer(ctx,{}, {acquire:()=>{tickets++;maxTickets=Math.max(tickets,maxTickets);let owned=true;return{release(){if(owned){tickets--;owned=false;}}};}});await player.prepare(i);
 function pump(count){const l=new Float32Array(128),r=new Float32Array(128);for(let n=0;n<count;n++){actualNode.processor.process([],[[l,r]]);frame+=128;}return {l,r};}
 for(let k=0;k<8;k++)assert(player.noteOn(i,{frequency:220,durationSec:.04}));assert.equal(player.noteOn(i,{frequency:220,durationSec:.04}),null);pump(24);
 const before=player.snapshot().activeVoices;assert.equal(player.noteOn(i,{frequency:NaN}),null);assert.equal(player.snapshot().activeVoices,before,'invalid note must not retire tails');
 assert(player.noteOn(i,{frequency:330,durationSec:.04}));assert.equal(tickets,8);pump(24);
 for(let k=0;k<16;k++){assert(player.noteOn(i,{frequency:220+k,durationSec:.04}));pump(20);}assert.equal(actualNode.processor.cost,player.snapshot().activeCost);
 player.stop();pump(2);assert.equal(tickets,0);assert.equal(player.snapshot().activeVoices,0);assert.equal(actualNode.processor.slots.filter(Boolean).length,0);
 const silence=pump(1);assert.equal(peak(silence.l),0);player.dispose();assert(maxTickets<=8);pass('main admission + Worklet: 24 retriggers retire spent tails; invalid notes preserve state; no ticket leak or post-stop audio');
}
admission().then(()=>{fs.writeFileSync(path.join(root,'results/nodal_open_completion.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}).catch(e=>{console.error(e);process.exitCode=1});
