

/* The only bridge between the pure renderer and the historical application. */
function __f352Clone(value){if(value==null||typeof value!=='object')return value;if(ArrayBuffer.isView(value))return new value.constructor(value);if(Array.isArray(value))return value.map(__f352Clone);return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,__f352Clone(v)]));}
function __f352Freeze(value){if(!value||typeof value!=='object'||ArrayBuffer.isView(value))return value;for(const v of Object.values(value))__f352Freeze(v);return Object.freeze(value);}
/* F3.56.1: non-audio metadata bridge for the optional Cecilia layer.
 * F3.56's independent PCM material renderer has no grain-state schedule.
 * Project its existing source atlas along each actual run without touching PCM. */
function __f356ProjectCeciliaStates(job,material){
 const atlas=job.model?.atlas;
 if(!atlas?.nodes?.length||!material?.runs?.length)return material;
 const hop=atlas.hop||Math.max(1,Math.round(job.model.sampleRate*.02));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 for(const run of material.runs){
  if(run.states?.length)continue;
  const length=Math.max(1,run.endSample-run.startSample),span=Math.max(1,run.sourceEnd-run.sourceStart+1);
  // Keep the UI/render cost bounded: 2..24 source-state anchors per phrase.
  const count=clamp(Math.ceil(length/(job.sampleRate*.20))+1,2,24),states=[];
  for(let i=0;i<count;i++){
   const age=Math.round(i/(count-1)*(length-1)),sample=run.startSample+age;
   let offset=(run.sourceOffset??0)+age*run.sourceSpeed;
   if(run.timeMode==='loop')offset=((offset%span)+span)%span;
   else offset=clamp(offset,0,span-1);
   const at=clamp(Math.round((run.sourceStart+offset)/hop),0,atlas.nodes.length-1),node=atlas.nodes[at];
   states.push({sample,nodeId:at,aperiodicity:clamp(node.aperiodicity??0,0,1)});
  }
  run.states=states;
 }
 return material;
}