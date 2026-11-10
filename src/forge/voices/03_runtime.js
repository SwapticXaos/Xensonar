/* Forge Voices runtime (lazy, Forge room only). Turns the current figure into a
   serializable job and renders it in a short-lived Worker: nothing here runs while
   the Live Room plays, and no Worker, timer or buffer outlives a render. */
const __ForgeVoicesRuntime=(()=>{
 let scriptURL=null,direct=null;
 function script(){
  if(!scriptURL){const source=createForgeVoicesDSP.toString()+`
const dsp=createForgeVoicesDSP();onmessage=async e=>{try{const r=await dsp.render(e.data,{onProgress:p=>postMessage({progress:p})});postMessage({result:r},[r.left.buffer,r.right.buffer])}catch(error){postMessage({error:String(error&&error.message||error)})}};`;
   scriptURL=URL.createObjectURL(new Blob([source],{type:'text/javascript'}))}
  return scriptURL;
 }
 const local=()=>direct??(direct=createForgeVoicesDSP());
 function run(job,{check=()=>{},onProgress=()=>{}}={}){
  check();if(typeof Worker==='undefined')return local().render(job,{check,onProgress,cooperative:true});
  return new Promise((resolve,reject)=>{
   let worker,timer,done=false;const finish=(error,value)=>{if(done)return;done=true;clearInterval(timer);worker?.terminate();error?reject(error):resolve(value)};
   try{worker=new Worker(script());
    worker.onmessage=e=>{try{check();if(e.data.error)throw Error(e.data.error);if(e.data.result)finish(null,e.data.result);else onProgress(e.data.progress)}catch(error){finish(error)}};
    worker.onerror=e=>finish(Error('Forge voice worker: '+e.message));timer=setInterval(()=>{try{check()}catch(error){finish(error)}},20);worker.postMessage(job);
   }catch(error){finish(error)}
  });
 }
 // The drawing as height map. Row 0 is the top of the picture (20 kHz), as everywhere in the Forge.
 function terrainOf(grid){
  const width=grid.width,height=grid.height,data=new Float32Array(width*height);
  for(let x=0;x<width;x++){const column=grid.getColumn(x);for(let y=0;y<height;y++){const v=column[y];if(v>0)data[y*width+x]=v<1?v:1}}
  return {width,height,data};
 }
 const eventsOf=(grid,durationSec,pitchRatio)=>__FractaliaMaterialRuntime.events(grid,durationSec,pitchRatio)
  .map(e=>({startSec:e.startSec,endSec:e.endSec,pitch:Array.from(e.pitch),gain:Array.from(e.gain),fadeInSec:e.fadeInSec||0,fadeOutSec:e.fadeOutSec||0}));
 async function renderCarrier({machineId,grid,durationSec,previewPitchRatio=1,instrument,onProgress,signal}){
  const spec=__ForgeVoices.spec,engine=spec.engineOf(machineId);if(!engine)throw Error('Unknown Forge voice');
  const recipe=spec.recipe(engine,instrument?.[engine]??__ForgeVoices.snapshot()[engine]),transport=__f333Epoch;
  const check=()=>{if(signal?.aborted||transport!==__f333Epoch)throw new DOMException('Forge voice render cancelled','AbortError')};check();
  const events=eventsOf(grid,durationSec,previewPitchRatio);if(!events.length)throw Error('The carrier figure is empty.');
  const context=xt.getContext(),job={engine,params:recipe.params,events,durationSec,sampleRate:context.sampleRate,pitchRatio:previewPitchRatio,terrain:engine==='gaia'?terrainOf(grid):undefined};
  const result=await run(job,{check,onProgress});check();
  const buffer=context.createBuffer(2,result.left.length,result.sampleRate);buffer.copyToChannel(result.left,0);buffer.copyToChannel(result.right,1);
  return {buffer,report:result.report};
 }
 // The panels read the figure the same way the renderer does (pitch classes, mirrored overtones).
 function figure(){
  const state=pe.getState(),grid=state.spectralData,durationSec=Zp(state.materialExport.bars,state.materialExport.bpm,state.materialExport.beatsPerBar);
  let events=[];try{events=eventsOf(grid,durationSec,1)}catch{}
  return {events,durationSec,grid};
 }
 const api={renderCarrier,figure,dsp:local,terrainOf};__ForgeVoices.register(api);return api;
})();
