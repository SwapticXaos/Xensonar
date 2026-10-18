'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),{load}=require('./offline_runtime.cjs');
const h=load(path.resolve(__dirname,'..')),rows=[];
vm.runInContext(fs.readFileSync('tests/fixtures/forge-progress/polytrace-baseline.js','utf8').replace('function tK(', 'function __baselinePolytrace('),h.context);
h.run(`globalThis.__polyArgs=(timbre,rate,kind)=>{const grid=new ph(48,48);if(kind!=='silent')for(let x=0;x<48;x++)for(const y of [20,28,34])grid.set(x,y,.3+(x%5)*.06);if(kind==='melodic'){const doc={version:'melodic-carrier-v1',durationBeats:4,notes:[{id:'note',startBeat:.5,durationBeats:2.5,pitchHz:[220,330],gainCurve:[.2,.7],fadeInBeats:.2,fadeOutBeats:.2}]};doc.rasterSignature=__f333Signature(grid);grid.melodicCarrier=doc;}return {spectralData:grid,durationSec:.18,sampleRate:rate,baseHz:220,gain:.46,maxVoices:12,timbre}};`);
(async()=>{
 for(const timbre of ['fm','acid','vocal'])for(const rate of [16000,48000])for(const kind of ['painted','melodic','silent']){
  const args=h.context.__polyArgs(timbre,rate,kind);h.context.__args=args;
  const expected=h.run('__baselinePolytrace(__args)'),sync=h.run('tK(__args)'),progress=[];
  h.context.__progress=p=>progress.push(p);const actual=await h.run('__forgePolytraceCooperative({...__args,descriptor:LB(__args.spectralData)},{onProgress:__progress})');
  assert.deepEqual(actual.buffer.getChannelData(0),expected.buffer.getChannelData(0));assert.deepEqual(sync.buffer.getChannelData(0),expected.buffer.getChannelData(0));
  for(const key of ['audioIdentityKey','activeColumnRatio','maxSimultaneousPeaks','peak'])assert.equal(actual[key],expected[key],key);
  assert.equal(progress.at(-1),1);rows.push({timbre,rate,kind,frames:actual.buffer.length,exactPCM:true,callbacks:progress.length});
 }
 let checks=0;h.context.__cancel=()=>{if(++checks===3)throw new DOMException('Cancelled','AbortError')};await assert.rejects(h.run('__forgePolytraceCooperative(__polyArgs("fm",48000,"painted"),{check:__cancel})'),{name:'AbortError'});
 // Exercise real MessagePorts as well as the older-host timer fallback above.
 const {MessageChannel}=require('worker_threads');let open=0,created=0;
 h.context.MessageChannel=class extends MessageChannel{constructor(){super();created++;for(const port of [this.port1,this.port2]){open++;const close=port.close.bind(port);let closed=false;port.close=()=>{if(!closed){closed=true;open--;}close();};}}};
 await h.run('__forgePolytraceCooperative({...__polyArgs("fm",48000,"painted"),durationSec:.4})');assert(created>0,'real message tasks must be exercised');assert.equal(open,0,'success closes both ports');
 let aborted=false;h.context.__cancelMessage=()=>{if(aborted)throw new DOMException('Cancelled','AbortError')};const timer=setTimeout(()=>{aborted=true},0);
 await assert.rejects(h.run('__forgePolytraceCooperative({...__polyArgs("fm",48000,"painted"),durationSec:1},{check:__cancelMessage})'),{name:'AbortError'});clearTimeout(timer);assert.equal(open,0,'cancellation closes both ports');
 // Same Emilia engine/recipe/tracks, frozen pre-patch wrapper: no quality reduction.
 const {harness,grid}=require('./emilia3_harness.cjs');const current=harness(),before=harness(undefined,{'src/forge/emilia/01_nodal_carrier.js':fs.readFileSync('tests/fixtures/forge-progress/emilia-baseline.js','utf8')});
 for(const x of [current,before])vm.runInContext(fs.readFileSync('src/forge/analysis/04_painted_voices.js','utf8'),x.context);
 for(const rate of [16000,48000]){const results=[];for(const x of [before,current])results.push(await x.api.renderPCM({tracks:x.api.carrierTracks(grid(),.12),durationSec:.12,sampleRate:rate}));assert.deepEqual(results[1].left,results[0].left);assert.deepEqual(results[1].right,results[0].right);rows.push({engine:'emilia',rate,exactPCM:true});}
 fs.mkdirSync('results/forge-progress',{recursive:true});fs.writeFileSync('results/forge-progress/pcm.json',JSON.stringify({rows,cancellation:true},null,2)+'\n');console.log('PASS 18 Polytrace sync/cooperative PCM + metadata comparisons, Emilia exact stereo, cooperative cancellation');
})().catch(e=>{console.error(e);process.exitCode=1});
