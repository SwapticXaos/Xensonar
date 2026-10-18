'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{createEngine}=require('./helpers/p4c2-n3-entrophon.cjs');
const before=createEngine(true),now=createEngine(),plain=x=>JSON.parse(JSON.stringify(x));
let bodies=0,records=0,pcmSamples=0;const costs=[];
(async()=>{
 try{
  for(const surface of ['wave','particle','spectral'])for(const tuningId of ['ji','ji-nearest','31edo'])for(const colorSet of ['default','bell'])for(const unison of [1,6])for(const enabled of [false,true]){
   const config={...plain(before.api.defaults[surface]),enabled,tuningId,tuningStrength:.73,unison,detune:23.7,unisonSpread:.61,filterKeytrack:.37,colorSet};
   const a=before.api.set(surface,config),b=now.api.set(surface,config);
   for(const forceEnabled of [false,true])for(const freq of [27.137,221.731,7631.191])for(const overrides of [{},{unison:3,detuneCents:17.713,filterFreq:913.7,filterQ:0}]){
    const event={surface,freq,rootFreq:55.137,tuningId,tuningStrength:.73,forceEnabled,...overrides};
    assert.deepEqual(plain(now.api.body(event)),plain(before.api.body(event)),'N2 body changed: '+JSON.stringify(event));bodies++;
   }
   // Default Wave/Particle/Spectral shape belongs to the surface, even when
   // the exact same immutable config object is deliberately reused.
   if(colorSet==='default'&&enabled&&unison===6){
    for(const target of ['wave','particle','spectral'])assert.deepEqual(plain(now.api.body({surface:target,freq:221.73,tuningStrength:0},b)),plain(before.api.body({surface:target,freq:221.73,tuningStrength:0},a)));
   }
  }
  for(const surface of ['wave','particle','spectral']){
   for(const engine of [before,now])engine.api.set(surface,{...plain(engine.api.defaults[surface]),enabled:true,unison:6,detune:23.7,unisonSpread:.61,colorSet:'default',filterKeytrack:0});
   const event={surface,freq:221.731,tuningStrength:0};before.api.body(event);now.api.body(event);before.clear();now.clear();
   for(let i=0;i<1000;i++){before.api.body({...event,freq:221.731+i*.0137});now.api.body({...event,freq:221.731+i*.0137});}
   costs.push({surface,before:{...before.work},after:{...now.work}});assert.equal(now.work.pow,0,'static source preparation must remove per-tone default powers');assert.equal(now.work.spread,0,'prepared unison must skip detune polynomial too');
   if(surface!=='wave')assert(before.work.pow>=8000);
   const exposed=now.api.body(event);exposed.oscillatorFreqs[0]=1;exposed.colorFreqs[0]=1;exposed.colorGains[0]=99;exposed.config.unison=1;
   assert.deepEqual(plain(now.api.body(event)),plain(before.api.body(event)),'event outputs cannot mutate prepared config');
  }
  before.enableRendering();now.enableRendering();
  for(const surface of ['wave','particle','spectral'])for(const sampleRate of [44100,48000]){
   const sound=now.api.capture('N3 '+surface,surface),reference=before.api.normalize(plain(sound));
   for(const mode of ['plain','curves']){
    const options={frequency:219.731,velocity:.7,durationSec:.07,...(mode==='curves'?{pitchCurve:[0,.71,-.37],volumeCurve:[.1,1,.2]}:{})};
    const a=before.api.record(reference,options,sampleRate),b=now.api.record(sound,options,sampleRate);assert.deepEqual(b.record,a.record,'C11 record must be byte-identical');records++;
    const [oldPcm,newPcm]=await Promise.all([before.api.render(reference,options,sampleRate),now.api.render(sound,options,sampleRate)]);
    assert.deepEqual(newPcm.left,oldPcm.left);assert.deepEqual(newPcm.right,oldPcm.right);assert(newPcm.left.some(v=>v!==0));pcmSamples+=newPcm.left.length*2;
   }
  }
  assert.equal(before.workers,0);assert.equal(now.workers,0);
  const report={bodyComparisons:bodies,byteIdenticalC11Records:records,exactChannelSamples:pcmSamples,staticWorkFor1000ChangingTones:costs,wasmDsp:'unchanged; production WASM rendered in real worker_threads'};
  fs.writeFileSync('results/p4c2-n3-entrophon-static.json',JSON.stringify(report,null,2)+'\n');console.log('PASS N3 Entrophon all-surface static preparation',report);
 }finally{await before.dispose();await now.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1});
