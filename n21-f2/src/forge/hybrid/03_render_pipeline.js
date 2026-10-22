

/* Pure orchestration: adapters consume a frozen job; no store or engine reads inside a render. */
function __f352CreatePipeline(adapters,{maxBytes=96*1024*1024}={}){
 const cache=new Map(),artifacts=new Map(),listeners=new Set();let bytes=0,artifactBytes=0,epoch=0,active=null,result=null,disposed=false;
 let status=Object.freeze({phase:'idle',stage:'',progress:0,error:'',result:null});
 const stats={donorRenders:0,syntheticRenders:0,combinations:0,cacheHits:0};
 function publish(fields){status=Object.freeze({...status,...fields,result});for(const f of listeners)f();}
 const check=t=>{if(disposed||t!==epoch)throw new DOMException("Rendering cancelled or superseded by a newer state.",'AbortError');};
 function materialBytes(material){return (material?.runs??[]).reduce((n,r)=>n+1024+(r.states?.length??0)*512+(r.gestalt?.sourceCurve?.byteLength??0)+(r.gestalt?.widthCurve?.byteLength??0),0);}
 function size(v){return (v?.pcm?.byteLength??0)+materialBytes(v?.material);}
 function put(key,value){const count=size(value);if(count>maxBytes)return value;const old=cache.get(key);if(old)bytes-=size(old);cache.delete(key);cache.set(key,value);bytes+=count;while(bytes>maxBytes&&cache.size){const first=cache.keys().next().value;bytes-=size(cache.get(first));cache.delete(first);}return value;}
 function get(key){const value=cache.get(key);if(value){cache.delete(key);cache.set(key,value);stats.cacheHits++;}return value;}
 function remember(artifact){
  const buffers=new Set([artifact.pcm.buffer,artifact.stems.donor?.buffer,artifact.stems.synthetic?.buffer,artifact.spectrum?.values?.buffer].filter(Boolean));
  const size=[...buffers].reduce((n,b)=>n+b.byteLength,0)+materialBytes(artifact.material);
  const budget=Math.min(maxBytes,48*1024*1024);if(size>budget)return;
  const old=artifacts.get(artifact.key);if(old)artifactBytes-=old.size;
  artifacts.delete(artifact.key);artifacts.set(artifact.key,{artifact,size});artifactBytes+=size;
  while(artifactBytes>budget||artifacts.size>8){const k=artifacts.keys().next().value;artifactBytes-=artifacts.get(k).size;artifacts.delete(k);}
 }
 async function stage(key,name,run,t,start,end){check(t);const hit=get(key);if(hit){publish({stage:name,progress:end});return hit;}publish({stage:name,progress:start});
  const value=await run({isCancelled:()=>t!==epoch,onProgress:p=>{if(t===epoch)publish({stage:name,progress:start+Math.max(0,Math.min(1,p))*(end-start)});}});check(t);return put(key,value);
 }
 async function execute(job,t){try{
  publish({phase:'rendering',stage:'Preparing carrier',progress:0,error:''});
  const donor=await stage('d:'+job.donorKey,"Donor Sound Body",async o=>{stats.donorRenders++;return adapters.donor(job,o);},t,0,.44);
  let synthetic=null,combined=donor;
  if(job.recipe.amount>0){
   synthetic=await stage('s:'+job.syntheticKey,"Cecilia Sound Body",async o=>{stats.syntheticRenders++;return adapters.synthetic(job,donor,o);},t,.44,.77);
   combined=await stage('m:'+job.key,'Klangkombination',async o=>{stats.combinations++;return adapters.combine(job,donor,synthetic,o);},t,.77,.95);
  }
  check(t);const artifact={key:job.key,pcm:combined.pcm,sampleRate:job.sampleRate,durationSec:combined.pcm.length/job.sampleRate,
   material:donor.material,recipe:job.recipe,manifest:job.manifest,metrics:combined.metrics??{},stems:{donor:donor.pcm,synthetic:synthetic?.pcm??null},buffer:null,spectrum:null};
  publish({stage:'Displaying result',progress:.95});
  artifact.buffer=adapters.buffer(artifact.pcm,job.sampleRate);
  artifact.spectrum=await adapters.spectrum(artifact.pcm,job.sampleRate,()=>t!==epoch,job);check(t);
  result=Object.freeze(artifact);remember(result);publish({phase:'ready',stage:'Result ready',progress:1});return result;
 }catch(e){if(t===epoch)publish({phase:e.name==='AbortError'?'idle':'error',stage:'',progress:0,error:e.name==='AbortError'?'':String(e.message??e)});throw e;}}
 function render(job){
  if(disposed)return Promise.reject(new DOMException("Render pipeline disposed.",'AbortError'));
  const hit=artifacts.get(job.key);
  if(result?.key===job.key||hit){
   // A cached result can replace an in-flight render regardless of its key.
   // Preserve active as predecessor until it settles: no overlapping heavy renders.
   if(active?.ticket===epoch)epoch++;
   if(hit){artifacts.delete(job.key);artifacts.set(job.key,hit);result=hit.artifact;stats.cacheHits++;}
   publish({phase:'ready',stage:'Saved result ready',progress:1,error:''});
   return Promise.resolve(result);
  }
  // Same-key deduplication is only valid inside the SAME live epoch.
  // invalidate() and a cache activation retire the previous ticket.
  if(active?.key===job.key&&active.ticket===epoch)return active.promise;
  const t=++epoch;
  // Serialize replacements, even when active has already been invalidated.
  const predecessor=active?.promise;
  const promise=(async()=>{if(predecessor)try{await predecessor;}catch{}check(t);return execute(job,t);})();
  active={key:job.key,promise,ticket:t};
  promise.then(()=>{if(active?.promise===promise)active=null;},()=>{if(active?.promise===promise)active=null;});
  return promise;
 }
 function invalidate(){if(disposed)return;epoch++;publish({phase:result?'stale':'idle',stage:'',progress:0,error:''});}
 // Navigation keeps reusable artifacts; final disposal releases their memory.
 function dispose(){if(disposed)return;disposed=true;epoch++;cache.clear();artifacts.clear();bytes=artifactBytes=0;result=null;listeners.clear();status=Object.freeze({phase:'disposed',stage:'',progress:0,error:'',result:null});}
 return Object.freeze({render,invalidate,dispose,getSnapshot:()=>status,subscribe(fn){if(disposed)return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},diagnostics:()=>({...stats,cacheBytes:bytes,cacheEntries:cache.size,artifactBytes,artifactEntries:artifacts.size,maxBytes,listeners:listeners.size,disposed})});
}
