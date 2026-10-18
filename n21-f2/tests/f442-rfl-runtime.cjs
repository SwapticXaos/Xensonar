'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const {load}=require('./offline_runtime.cjs'),root=path.resolve(__dirname,'..'),runtime=load(root),report={checks:[],settings:[],pcm:[],benchmarks:[],limitations:['VM CPU timings compare these implementations, not audible stability on the user laptop.']};
const pass=s=>{report.checks.push(s);console.log('PASS',s)};
// Compare cached settings to the unchanged normalization/tuning functions.
for(const mode of ['flowing','grainy'])for(const pressure of [0,.55,.85,1]){
 const result=runtime.run(`(()=>{const refs={},raw={preset:'custom',qualityMode:'${mode==='grainy'?'fragment':'base'}',windowMs:83,stepMs:26,leadMs:99,jitter:.08,microDensity:1.2};const envelope=tW({pressureBias:${pressure},policy:{densityReductionUnderLoad:.5}});const expected=nW({settings:Fw(raw,'${mode}'),envelope}),a=__f442RFLMaterialSettings(refs,raw,'${mode}',envelope),b=__f442RFLMaterialSettings(refs,raw,'${mode}',envelope);raw.stepMs=47;const changed=__f442RFLMaterialSettings(refs,raw,'${mode}',envelope);return{equal:JSON.stringify(expected)===JSON.stringify(a.settings)&&JSON.stringify(vG(expected))===JSON.stringify(a.tuning),same:a===b,changed:a!==changed,mutation:JSON.stringify(nW({settings:Fw(raw,'${mode}'),envelope}))===JSON.stringify(changed.settings)};})()`);
 assert(result.equal&&result.same&&result.changed&&result.mutation);report.settings.push({mode,pressure,...result});
}pass('all material settings equal uncached output across modes/pressure; in-place edits invalidate cache');
const settingCost=runtime.run(`(()=>{const refs={},raw=Fw(null,'flowing'),env=tW({pressureBias:0,policy:{}}),original=Fw;let calls=0;Fw=(...args)=>{calls++;return original(...args)};for(let i=0;i<10000;i++)__f442RFLMaterialSettings(refs,raw,'flowing',env);Fw=original;return{ticks:10000,normalizations:calls};})()`);assert.equal(settingCost.normalizations,1);report.settings.push(settingCost);pass('10,000 unchanged material ticks perform one settings normalization');
function sourceFromFile(file){const s=fs.readFileSync(file,'utf8'),a=s.indexOf('Ybe=`');assert(a>=0);const b=s.indexOf('`,Jbe=',a);assert(b>a);return vm.runInNewContext(s.slice(a+4,b+1),{iL:'xensonar-root-follow-worklet-shadow-bridge'});}
const oldSource=fs.readFileSync(path.join(__dirname,'fixtures/f441_rfl_processor.js'),'utf8'),newSource=sourceFromFile(path.join(root,'src/audio/02_rfl_worklet.js'));
function make(source,sr){let Processor;const context=vm.createContext({Float32Array,Map,Math,Number,Boolean,String,Array,Infinity,sampleRate:sr,currentTime:0,registerProcessor:(_,p)=>Processor=p,AudioWorkletProcessor:class{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)}}}});vm.runInContext(source,context);const p=new Processor();return{p,context,send:data=>p.port.onmessage({data})};}
function bank(h,channels,sr,id='bank',generation=1){const frames=4096,pcm=Array.from({length:channels},(_,c)=>Float32Array.from({length:frames},(_,i)=>.21*Math.sin(i*.043+(c?1.7:0))+.07*Math.cos(i*.072)));h.send({type:'root-follow-worklet-stable-lane-buffer-transfer',bridgeSessionId:1,processorGeneration:1,bufferGeneration:generation,transfer:{entryId:id,sampleRate:sr,transferStartFrame:0,transferFrameCount:frames,channels:pcm.map(data=>({data,frameCount:frames}))}});}
function plan(h,sr,sequence=1,rate=1,id='bank',generation=1){h.send({type:'root-follow-worklet-stable-lane-plan',active:true,bridgeSessionId:1,processorGeneration:1,plan:{entryId:id,bufferGeneration:generation,planSequence:sequence,loopStartSec:0,loopEndSec:4095/sr,sourceOffsetSec:.008,playbackRate:rate,targetGain:.6,gain:.6,audioNowSec:h.context.currentTime,anchorTimeSec:h.context.currentTime}});}
function setup(source,sr,channels){const h=make(source,sr);bank(h,channels,sr);plan(h,sr);return h;}
for(const sr of [32000,44100,48000])for(const channels of [1,2])for(const outputs of [1,2]){
 const old=setup(oldSource,sr,channels),next=setup(newSource,sr,channels);let peak=0,stereoDelta=0;
 for(let block=0;block<480;block++){
  for(const h of [old,next]){h.context.currentTime=block*128/sr;if(block===80)plan(h,sr,2,1.6);if(block===170){bank(h,channels,sr,'replacement',2);plan(h,sr,3,.73,'replacement',2);}if(block===280)plan(h,sr,4,1.2,'replacement',2);}
  const a=Array.from({length:outputs},()=>new Float32Array(128)),b=Array.from({length:outputs},()=>new Float32Array(128));old.p.process([],[a]);next.p.process([],[b]);
  for(let c=0;c<outputs;c++){assert(Buffer.from(a[c].buffer).equals(Buffer.from(b[c].buffer)),`PCM changed ${sr}/${channels}/${outputs}/${block}`);for(let i=0;i<128;i++){assert(Number.isFinite(b[c][i]));peak=Math.max(peak,Math.abs(b[c][i]));if(outputs===2)stereoDelta=Math.max(stereoDelta,Math.abs(b[0][i]-b[1][i]));}}
 }
 assert(peak>.01);if(outputs===2&&channels===1)assert.equal(stereoDelta,0);if(outputs===2&&channels===2)assert(stereoDelta>.01);
 assert.deepEqual(JSON.parse(JSON.stringify(next.p.messages)),JSON.parse(JSON.stringify(old.p.messages)));report.pcm.push({sampleRate:sr,sourceChannels:channels,outputChannels:outputs,peak,stereoDelta,byteIdentical:true});
}pass('12 mono/stereo/rate matrices preserve every PCM byte and health message, including retune and bank crossfade');
// Exercise both event queues with real accepted messages, including tail retirement.
for(const kind of ['direct','granular','mixed'])for(const channels of [1,2]){
 const old=make(oldSource,48000),next=make(newSource,48000);
 for(const h of [old,next]){
  bank(h,channels,48000);
  if(kind!=='granular')h.send({type:'root-follow-worklet-direct-pilot-events',active:true,events:[{id:'v',startSec:.005,endSec:.095,frequencyHz:220,gain:.2}]});
  if(kind!=='direct')h.send({type:'root-follow-worklet-granular-pilot-plan',active:true,plan:{entryId:'bank',windows:[{id:'g',windowStartSec:.01,windowDurationSec:.07,sourceOffsetSec:.001,playbackRate:.73,densityScale:1}]}});
 }
 let peak=0;
 for(let block=0;block<100;block++){
  old.context.currentTime=next.context.currentTime=block*128/48000;
  const a=[new Float32Array(128),new Float32Array(128)],b=[new Float32Array(128),new Float32Array(128)];old.p.process([],[a]);next.p.process([],[b]);
  for(let c=0;c<2;c++){assert(Buffer.from(a[c].buffer).equals(Buffer.from(b[c].buffer)));for(const v of b[c]){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}}
 }
 assert(peak>.001);assert.equal(next.p.events.length,0);assert.equal(next.p.granularEvents.length,0);assert.deepEqual(JSON.parse(JSON.stringify(old.p.messages)),JSON.parse(JSON.stringify(next.p.messages)));
 report.pcm.push({kind,sourceChannels:channels,peak,byteIdentical:true,retired:true});
}
pass('direct, granular and mixed event paths preserve PCM and retire tails in mono and stereo');
// Median of alternating old/new warm runs; informational, not a gate.
function bench(source,channels){const h=setup(source,48000,channels),out=[new Float32Array(128),new Float32Array(128)];for(let i=0;i<500;i++){h.context.currentTime=i*128/48000;h.p.process([],[out]);}const start=performance.now();for(let i=0;i<4000;i++){h.context.currentTime=(i+500)*128/48000;h.p.process([],[out]);}return performance.now()-start;}
for(const channels of [1,2]){const old=[],next=[];for(let i=0;i<5;i++){if(i%2){next.push(bench(newSource,channels));old.push(bench(oldSource,channels))}else{old.push(bench(oldSource,channels));next.push(bench(newSource,channels))}}old.sort((a,b)=>a-b);next.sort((a,b)=>a-b);report.benchmarks.push({sourceChannels:channels,renderedSec:4000*128/48000,oldMedianMs:old[2],newMedianMs:next[2],speedup:old[2]/next[2]});}
fs.writeFileSync(path.join(root,'results/f442-rfl-runtime.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.benchmarks));
