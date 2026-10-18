// Reuse the established scheduler/lifecycle checks with the current stage contract.
const fs=require('fs'),path=require('path'),Module=require('module');
let s=fs.readFileSync(path.join(__dirname,'audio_contract46.cjs'),'utf8');
const start=s.indexOf('async function sustain(){'),end=s.indexOf('\n(async()=>',start);
if(start<0||end<0)throw Error('Missing audio test seam');
s=s.slice(0,start)+`async function sustain(){const env=workerEnv();vm.runInContext("const __F352WorkerScript='self.onmessage=()=>{}';"+code('__F352Worker')+';globalThis.bridge=__F352Worker;',env.context);
 const model={atlas:{nodes:[{centroidHz:1300,formantEnvelope:[1,2,3],spectralPeaks:[{hz:440}]}]}};Object.defineProperty(model,'samples',{get(){throw Error('Original PCM must not be read for Cecilia payload');}});
 const job={model,sampleRate:48000,durationSec:1,support:{plan:{bands:[]},length:48000},recipe:{mode:'parallel'},cecilia:{vowel:1}},p=env.context.bridge.run('synthetic',job,{material:{runs:[]}},{}),w=env.instances[0];w.emit({ready:true});assert.equal(w.sent.m.job.model.atlas.nodes[0].centroidHz,1300);assert.equal('samples' in w.sent.m.job.model,false);assert.equal('formantEnvelope' in w.sent.m.job.model.atlas.nodes[0],false);assert.equal(w.sent.m.job.cecilia,job.cecilia);w.emit({id:w.sent.m.id,value:{ok:true}});assert((await p).ok);assert.equal(env.context.bridge.status().active,0);
 assert.throws(()=>env.context.bridge.run('sustain',job,null,{}),/Unknown offline stage/);assert.throws(()=>env.context.bridge.run('donor',job,null,{}),/Unknown offline stage/);
 const p1=env.context.bridge.run('synthetic',job,{material:{runs:[]}},{}),p2=env.context.bridge.run('combine',job,{donor:{},synthetic:{}},{});env.context.bridge.cancel();await assert.rejects(p1,e=>e.name==='AbortError');await assert.rejects(p2,e=>e.name==='AbortError');assert(env.instances.every(w=>w.dead));console.log('PASS Current Cecilia payload: no donor PCM, only centroid observations, retired stages rejected, all-job cancellation');}
`+s.slice(end);
const m=new Module(__filename,module);m.filename=__filename;m.paths=module.paths;m._compile(s,__filename);
