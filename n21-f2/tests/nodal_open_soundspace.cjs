'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const {load}=require('./offline_runtime.cjs'),root=path.resolve(__dirname,'..'),h=load(root);
const run=s=>h.run(s),report={checks:[],metrics:[],limitations:['Host CPU timings are not the user laptop. Musical quality still requires listening.']};
function pass(s){report.checks.push(s);console.log('PASS',s)}
// Independent frozen V1 model/kernel. Do not compare against a rewritten golden.
const old=vm.createContext({Float32Array,Float64Array,Uint32Array,Math});
vm.runInContext(['01_instrument_model.js','02_synthesis_kernel.js'].map(f=>fs.readFileSync(path.join(__dirname,'fixtures/nodal_v2_baseline',f),'utf8')).join('\n'),old);
for(const name of ['glass','ember','breath'])for(const rate of [44100,48000]){
 const instrument=run(`JSON.parse(__XenNodalModel.serialize(nodalStarter('${name}')))`);
 old.fixture=instrument;const x=vm.runInContext(`__XenNodalDSP.render(__XenNodalModel.compile(fixture),{durationSec:.15},${rate}).pcm`,old);
 const y=run(`__XenNodalDSP.render(__XenNodalModel.compile(nodalStarter('${name}')),{durationSec:.15},${rate}).pcm`);
 assert(Buffer.from(x.buffer).equals(Buffer.from(y.buffer)),'legacy PCM '+name+' '+rate);
}pass('6 legacy PCM fixtures are byte-identical to F4.3.5');
const structural=run(`(()=>{const model=__XenNodalModel,a=nodalOpenStarter('hollow'),p=model.compile(a),b=model.deserialize(model.serialize(a)),r=__XenNodalDSP.render(p,{durationSec:.1});
 const renamed=model.normalize({...a,nodes:a.nodes.map((n,i)=>({...n,id:'changed-'+(8-i)})),blockedEdges:[],edgePolarities:[]});
 const alt=__XenNodalDSP.render(model.compile(renamed),{durationSec:.1});
 let error=0;for(let i=0;i<r.pcm.length;i++)error=Math.max(error,Math.abs(r.pcm[i]-alt.pcm[i]));
 const invalid=[{...a,schemaVersion:7},{...a,edgePolarities:[['missing','design-0']]},{...a,nodes:[]}].map(i=>{try{model.normalize(i);return false}catch{return true}});
 return {same:model.serialize(a)===model.serialize(b),error,invalid,stereo:r.left.some((x,i)=>Math.abs(x-r.right[i])>1e-5),positive:p.bands.every(b=>b.frequencies.every(f=>Number.isFinite(f)&&f>0))};})()`);
assert(structural.same&&structural.error===0&&structural.invalid.every(Boolean)&&structural.stereo&&structural.positive);pass('V2 roundtrip, ID-independent PCM, validation, positive modes and stereo');
// Fourier magnitude (phase-insensitive) on equal-normalized audio: numerical
// separability is a necessary gate, not a claim of musical preference.
function spectrum(pcm,start=0){const n=8192,re=new Float64Array(n),im=new Float64Array(n);for(let i=0;i<n;i++)re[i]=(pcm[start+i]||0)*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
 for(let size=2;size<=n;size<<=1){for(let a=0;a<n;a+=size)for(let j=0;j<size/2;j++){const ang=-2*Math.PI*j/size,c=Math.cos(ang),s=Math.sin(ang),k=a+j+size/2,r=re[k]*c-im[k]*s,q=re[k]*s+im[k]*c;re[k]=re[a+j]-r;im[k]=im[a+j]-q;re[a+j]+=r;im[a+j]+=q;}}
 const out=Array.from({length:96},()=>0);for(let i=1;i<n/2;i++){const bin=Math.min(95,Math.floor(Math.log2(i)*8));out[bin]+=re[i]**2+im[i]**2;}const sum=out.reduce((s,x)=>s+x,0)||1;return out.map(x=>x/sum);}
function distance(a,b){return a.reduce((s,x,i)=>s+Math.abs(x-b[i]),0)/2;}
function render(expr){return run(`(()=>{const i=${expr};return __XenNodalDSP.render(__XenNodalModel.compile(i),{frequency:220,durationSec:.4},48000);})()`);}
const families=[];for(const id of ['prism','ember','hollow','filament','reed','obsidian']){
 const r=render(`nodalOpenStarter('${id}')`);let peak=0,sum=0;for(const x of r.pcm){assert(Number.isFinite(x));peak=Math.max(peak,Math.abs(x));sum+=x*x;}
 assert(peak>.01&&peak<.85&&!r.snapshot.faults);families.push({id,pcm:r.pcm,spectrum:spectrum(r.pcm,2048)});report.metrics.push({preset:id,peak,rms:Math.sqrt(sum/r.pcm.length)});
}for(let i=0;i<families.length;i++)for(let j=0;j<i;j++){const d=distance(families[i].spectrum,families[j].spectrum);assert(d>.04,'families collapsed: '+families[i].id+' / '+families[j].id+' '+d);}
pass('6 source/body recipes produce finite, distinct magnitude spectra');
const contrast={wave:[`{...nodalOpenStarter('hollow'),material:{...nodalOpenStarter('hollow').material,wave:'sine',body:.6}}`,`{...nodalOpenStarter('hollow'),material:{...nodalOpenStarter('hollow').material,wave:'saw',body:.6}}`],stretch:[`{...nodalOpenStarter('prism'),material:{...nodalOpenStarter('prism').material,stretch:-.7}}`,`{...nodalOpenStarter('prism'),material:{...nodalOpenStarter('prism').material,stretch:.7}}`],balance:[`{...nodalOpenStarter('prism'),material:{...nodalOpenStarter('prism').material,balance:0}}`,`{...nodalOpenStarter('prism'),material:{...nodalOpenStarter('prism').material,balance:1}}`],body:[`{...nodalOpenStarter('hollow'),material:{...nodalOpenStarter('hollow').material,body:0}}`,`{...nodalOpenStarter('hollow'),material:{...nodalOpenStarter('hollow').material,body:1}}`]};
for(const [key,[a,b]]of Object.entries(contrast)){const d=distance(spectrum(render(a).pcm,2048),spectrum(render(b).pcm,2048));report.metrics.push({axis:key,spectralDistance:d});assert(d>.04,key+' ineffective');}pass('material, body, mode spacing and energy balance survive spectral discrimination');
const relationships=run(`(()=>{const model=__XenNodalModel,i=nodalOpenStarter('filament'),p=model.compile(i),a=__XenNodalDSP.render(p,{durationSec:.06}),off=model.normalize({...i,coupling:0}),b=__XenNodalDSP.render(model.compile(off),{durationSec:.06});let silent=0;for(const x of b.pcm)silent=Math.max(silent,Math.abs(x));
 const signed=model.compile(model.normalize({...i,edgePolarities:[[i.nodes[0].id,i.nodes[1].id]]}));
 const modeDifference=p.bands.reduce((s,b,k)=>s+b.frequencies.reduce((s,v,j)=>s+Math.abs(v-signed.bands[k].frequencies[j]),0),0);
 const tailEnergy=a.pcm.slice(Math.round(.25*a.sampleRate)).reduce((s,x)=>s+x*x,0);return {silent,peak:a.pcm.reduce((s,x)=>Math.max(s,Math.abs(x)),0),tailEnergy,ended:a.snapshot.ended,modeDifference,positive:signed.bands.every(b=>b.frequencies.every(x=>x>0&&Number.isFinite(x)))};})()`);
assert(relationships.silent===0&&relationships.peak>.01&&relationships.tailEnergy>1e-4&&relationships.ended&&relationships.modeDifference>1e-6&&relationships.positive);pass('Exciter → listener requires a link; signed cycle changes positive modes; natural tail ends');
// Real Melodic bridge uses the same note options and stereo kernel output.
const bridge=run(`(()=>{const i=nodalOpenStarter('hollow'),c=Oqe({initialSession:null,externalLogicView:'melodic'}).loopComposer,t=c.tracks[0],note=c.notes.find(n=>n.trackId===t.id),source={kind:'nodal',instrument:i,plan:__XenNodalModel.compile(i)},step=lD({composer:c,bpm:120})/iD(c);let buffer=null;
 const ctx={sampleRate:48000,createBuffer:(channels,length,sampleRate)=>{buffer=new AudioBuffer({numberOfChannels:channels,length,sampleRate});return buffer;},createBufferSource:()=>({connect(){},start(){}}),createStereoPanner:()=>({pan:{},connect(){}})};
 nodalScheduleOffline(ctx,{},c,note,t,0,step,source);const expected=__XenNodalDSP.render(source.plan,nodalMelodicNoteOptions(c,note,t,source,step),48000);
 let diff=0;for(let k=0;k<expected.left.length;k++)diff=Math.max(diff,Math.abs(buffer.getChannelData(0)[k]-expected.left[k]),Math.abs(buffer.getChannelData(1)[k]-expected.right[k]));
 const saved=__XenNodalLibrary.save(i,{id:'open-roundtrip'});return {diff,channels:buffer.numberOfChannels,restored:__XenNodalModel.serialize(__XenNodalLibrary.list().find(e=>e.id===saved.id).instrument)===__XenNodalModel.serialize(i)};})()`);
assert(bridge.diff===0&&bridge.channels===2&&bridge.restored);pass('actual Melodic schedule is stereo/sample-exact with saved V2 recipe');
// Run the serialized factory as a real Worklet protocol, without a second DSP.
const worklet=run(`(()=>{let Processor,frame=0,messages=[];const Base=class{constructor(){this.port={postMessage:m=>messages.push(m)};}};nodalWorkletProcessorFactory(createNodalSynthesisKernel,(name,C)=>Processor=C,Base,48000,()=>frame);const proc=new Processor(),plan=__XenNodalModel.compile(nodalOpenStarter('prism')),send=data=>proc.port.onmessage({data});send({type:'plan',id:'p',plan});for(let i=0;i<8;i++)send({type:'note',planId:'p',id:'n'+i,startSec:0,options:{frequency:220,durationSec:.04}});send({type:'note',planId:'p',id:'overflow',startSec:0,options:{frequency:220,durationSec:.04}});
 const left=new Float32Array(128),right=new Float32Array(128);for(let i=0;i<24;i++){proc.process([],[[left,right]]);frame+=128;}send({type:'retire',id:'n0'});send({type:'note',planId:'p',id:'new',startSec:frame/48000,options:{frequency:220,durationSec:.04}});proc.process([],[[left,right]]);frame+=128;
 const freshStarted=messages.some(m=>m.type==='started'&&m.id==='new');send({type:'stop'});proc.process([],[[left,right]]);frame+=128;proc.process([],[[left,right]]);
 return {freshStarted,overflow:messages.some(m=>m.type==='rejected'&&m.id==='overflow'),cost:proc.cost,slots:proc.slots.filter(Boolean).length,quiet:left.every(v=>v===0),finite:left.every(Number.isFinite)};})()`);
assert(worklet.freshStarted&&worklet.overflow&&worklet.cost===0&&worklet.slots===0&&worklet.quiet&&worklet.finite);pass('Worklet 8-slot admission, spent-tail retirement, fresh attack and stop release tickets');
for(const count of [1,3,5,7]){
 const timing=run(`(()=>{const base=nodalOpenStarter('ember'),i=__XenNodalModel.normalize({...base,nodes:Array.from({length:${count}},(_,k)=>({...base.nodes[k%3],id:'perf-'+k,x:.1+(k%3)*.3,y:.2+(k%4)*.15}))}),p=__XenNodalModel.compile(i),voices=Array.from({length:Math.floor(8/p.cost)},()=>__XenNodalDSP.voice(p,{durationSec:.4}));const l=new Float32Array(128),r=new Float32Array(128),t=performance.now();for(let b=0;b<150;b++)for(const v of voices)v.process(l,r);return {nodes:${count},voices:voices.length,cost:p.cost,secondsRendered:.4,vmWallMs:performance.now()-t,executionRealm:"VM diagnostic; use nodal_open_completion for host audio-kernel timing"};})()`);report.metrics.push(timing);
}pass('1/3/5/7-node admitted-polyphony host timings recorded');
fs.mkdirSync(path.join(root,'results'),{recursive:true});fs.writeFileSync(path.join(root,'results/nodal_open_soundspace.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
