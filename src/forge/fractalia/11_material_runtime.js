/* Serializable jobs; the worker receives private PCM copies, never transfers
   ownership of the donor cache. No new realtime/worklet work. */
const __FractaliaMaterialRuntime=(()=>{
 let scriptURL=null,lastReport=null;const jobs=createFractaliaCompileJobs(async({model,check,onProgress})=>run('analyze',{model},{check,onProgress}),{maxCache:2});
 function script(){if(!scriptURL){const source=__forgeMaterialToolsFactory.toString()+'\n'+createFractaliaMaterialEngine.toString()+'\n'+renderFractaliaMaterialJob.toString()+'\n'+measureFractaliaSpectrum.toString()+`
 onmessage=async e=>{const {kind,payload}=e.data;try{const options={onProgress:p=>postMessage({progress:p})};let result;if(kind==='analyze')result=await createFractaliaMaterialEngine().analyze(payload.model,options);else if(kind==='spectrum')result=await measureFractaliaSpectrum(payload,options);else result=await renderFractaliaMaterialJob({...payload,worker:true},options);postMessage({result},result.left?[result.left.buffer]:[])}catch(error){postMessage({error:String(error.message||error)})}};`;
  scriptURL=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));}return scriptURL;}
 async function run(kind,payload,{check=()=>{},onProgress=()=>{}}={}){
  check();if(typeof Worker==='undefined')return kind==='analyze'?createFractaliaMaterialEngine().analyze(payload.model,{check,onProgress}):kind==='spectrum'?measureFractaliaSpectrum(payload,{check,onProgress}):renderFractaliaMaterialJob(payload,{check,onProgress});
  return new Promise((resolve,reject)=>{
   let worker,timer,done=false;const finish=(error,value)=>{if(done)return;done=true;clearInterval(timer);worker?.terminate();error?reject(error):resolve(value)};
   try{worker=new Worker(script());worker.onmessage=e=>{try{check();if(e.data.error)throw Error(e.data.error);if(e.data.result)finish(null,e.data.result);else onProgress(e.data.progress)}catch(error){finish(error)}};
    worker.onerror=e=>finish(Error('Fractalia material worker: '+e.message));timer=setInterval(()=>{try{check()}catch(error){finish(error)}},20);worker.postMessage({kind,payload});
   }catch(error){finish(error)}
  });
 }
 function events(grid,durationSec,pitchRatio){
  const doc=__f333ReadCarrier(grid),curve=(a,u,def)=>a?.length?a[Math.min(a.length-1,Math.floor(u*(a.length-1)))]:def;
  if(doc)return doc.notes.map((n,i)=>({id:n.id??'note-'+i,startSec:n.startBeat/doc.durationBeats*durationSec,endSec:(n.startBeat+n.durationBeats)/doc.durationBeats*durationSec,
   pitch:(n.pitchHz?.length?n.pitchHz:[220]).map(hz=>hz*pitchRatio),gain:(n.gainCurve?.length?n.gainCurve:[.6]),fadeInSec:(n.fadeInBeats||0)/doc.durationBeats*durationSec,fadeOutSec:(n.fadeOutBeats||0)/doc.durationBeats*durationSec,explicit:true}));
  const tracks=__Fractalia.source(grid,durationSec,pitchRatio).tracks,out=[];
  for(const [ti,track] of tracks.entries()){
   const count=Math.max(2,Math.ceil(durationSec*750)+1),values=Array.from({length:count},(_,i)=>{const t=i/(count-1)*durationSec,a=track.at(t);return {hz:a.hz,gain:track.gainAt?track.gainAt(t):a.gain}});
   for(let i=0;i<count;){if(values[i].gain<=1e-8){i++;continue}const first=i;while(i<count&&values[i].gain>1e-8)i++;const last=i-1;if(last<=first)continue;
    out.push({id:'painted-'+ti+'-'+first,startSec:first/(count-1)*durationSec,endSec:Math.min(durationSec,(last+1)/(count-1)*durationSec),pitch:values.slice(first,last+1).map(v=>v.hz),gain:values.slice(first,last+1).map(v=>v.gain),explicit:false});
   }
  }
  return out;
 }
 async function render(args){
  const captured=fractaliaDonorSnapshot(),{atlas,check,onProgress=()=>{},grid,durationSec,previewPitchRatio=1,sampleRate}=args;
  if(!captured.ready)throw Error('Prepare the current cached donor before using Material Relations.');
  const valid=()=>{check();if(fractaliaDonorSnapshot().key!==captured.key)throw new DOMException('Cached donor changed','AbortError')};valid();
  const tools=__forgeMaterialToolsFactory(),config={params:{planning:'neutral'},regions:captured.config.regions},raw=tools.allowedModel(captured.source,config);
  const sourceModel={samples:raw.samples,sampleRate:raw.sampleRate,sourceIndex:raw.sourceIndex};let model=sourceModel;
  if(raw.sourceIndex.windows.length>1){const pieces=raw.sourceIndex.windows.map(w=>raw.samples.subarray(w.startSample,w.endSample+1));let length=pieces[0].length;const joins=[];for(let i=1;i<pieces.length;i++){const fade=Math.min(Math.round(raw.sampleRate*.008),Math.floor(pieces[i-1].length/8),Math.floor(pieces[i].length/8));joins.push(fade);length+=pieces[i].length-fade}const pcm=new Float32Array(length);pcm.set(pieces[0]);let at=pieces[0].length;for(let i=1;i<pieces.length;i++){valid();const fade=joins[i-1];for(let j=0;j<fade;j++){const f=.5-.5*Math.cos(Math.PI*(j+.5)/Math.max(1,fade));pcm[at-fade+j]=pcm[at-fade+j]*(1-f)+pieces[i][j]*f}pcm.set(pieces[i].subarray(fade),at);at+=pieces[i].length-fade}model={samples:pcm,sampleRate:raw.sampleRate,sourceIndex:{windows:[{id:0,startSample:0,endSample:pcm.length-1}],joinedRegions:raw.sourceIndex.windows}};}
  const analysis=await jobs.request(captured.key,{model},{check:valid,priority:3,onProgress:p=>onProgress(p*.2)});
  try{if(!args.diagnostics?.bypass)await __FractaliaExperiments.freeze(args,captured,sourceModel,valid)}catch(error){if(error.name==='AbortError')throw error;__FractaliaExperiments.failed(error)}
  const mapping=createFractaliaMaterialEngine().prepare(atlas.material,atlas.relations,analysis,atlas.recipe.donor),notes=events(grid,durationSec,previewPitchRatio);
  if(!notes.length)throw Error('The carrier figure is empty.');
  const result=await run('render',{model,mapping,recipe:atlas.recipe,events:notes,durationSec,sampleRate,diagnostics:args.diagnostics},{check:valid,onProgress:p=>onProgress(.2+p*.8)});
  valid();if(!args.diagnostics?.bypass)lastReport={...result.report,allowedRegions:raw.sourceIndex.windows.length,joinedRegions:model.sourceIndex.joinedRegions?.length||0,donorName:captured.name,sourceKey:captured.key,instrument:atlas.recipe.name,activeMaterial:atlas.recipe.material?'stored':'follow'};return result;
 }
 return {render,events,run,getReport:()=>lastReport,stats:jobs.stats};
})();
