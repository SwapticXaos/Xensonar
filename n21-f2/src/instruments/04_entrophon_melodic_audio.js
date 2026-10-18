/* Saved Entrophon recipes use the production C11 kernel in a disposable worker.
   This prepares material for the existing Melodic clock; it owns no transport. */
function entrophonMelodicNoteOptions(composer,note,track,source,stepSec) {
  const durationSec=Math.max(.04,Math.min(30,F$(composer,note)*stepSec));
  const fields=resolveNodalArticulationFields({},note.localField??null);
  return {frequency:m9e(composer,note,source),velocity:Math.max(0,Math.min(1,note.velocity??.8)),durationSec,
    attackSec:Number.isFinite(note.edgeFadeInMs)?Math.max(.001,Math.min(2,note.edgeFadeInMs/1000)):Math.max(source.instrument.config.attack,d9e(note)*stepSec),
    releaseSec:Number.isFinite(note.edgeFadeOutMs)?Math.max(.001,Math.min(3,note.edgeFadeOutMs/1000)):Math.max(source.instrument.config.release,T$(note)*stepSec),...fields};
}
function __entrophonMelodicRecord(instrument,options,sampleRate) {
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)), frames=s=>Math.max(1,Math.round(s*sampleRate));
  const frequency=options.frequency??220,velocity=clamp(options.velocity??.8,0,1),duration=clamp(options.durationSec??.8,.04,30);
  if(!Number.isFinite(frequency)||frequency<10||frequency>24000||!Number.isFinite(velocity)||!Number.isFinite(duration))throw Error('Invalid Entrophon note');
  const k=resolveEntrophonInstrument(instrument,{freq:frequency,velocity});
  const attack=Math.min(clamp(options.attackSec??k.attack,.0008,2),Math.max(.004,duration*.42)),release=clamp(options.releaseSec??k.release,.008,2.5);
  if(!Number.isFinite(attack)||!Number.isFinite(release))throw Error('Invalid Entrophon fades');
  const releaseStart=Math.max(attack+.006,duration-Math.min(duration*.42,release*.35)),delay=k.delayAmount;
  const stop=releaseStart+release+.08+delay*.4;
  const colors=k.colorFreqs.map((freq,i)=>({freq,gain:k.colorGains[i]??.12})).filter(c=>c.gain!==0);
  const peak=Math.max(.0002,velocity*.7*k.gainScale),filterAttack=Math.max(.003,attack);
  const record=new xMe().encode({token:1,epoch:1,frame:0,eventId:1,auxRouteMask:0,held:!!(options.volumeCurve||options.pitchCurve),
    waveform:{sine:0,triangle:1,sawtooth:2,square:3}[k.waveform],filterType:{lowpass:0,highpass:1,bandpass:2,notch:3}[k.filterType],
    baseFreqs:k.oscillatorFreqs,colorFreqs:colors.map(c=>c.freq),colorGains:colors.map(c=>c.gain),peakGain:peak,sustainGain:peak*k.sustain,
    attackFrames:frames(attack),decayFrames:frames(Math.max(.005,k.decay)),releaseStartFrames:frames(releaseStart),releaseFrames:frames(release),stopAfterFrames:frames(stop),
    pitchBendMul:Math.pow(2,k.pitchBend/12),pitchBendFrames:Math.abs(k.pitchBend)>1e-4?frames(Math.max(.002,k.pitchBendTime)):0,
    filterStartHz:k.filterFreq,filterPeakHz:clamp(k.filterFreq*(1+k.filterEnvAmount*1.45),80,19000),filterEndHz:Math.max(70,k.filterFreq*.62),filterQ:k.filterQ,
    filterAttackFrames:frames(filterAttack),filterDecayFrames:frames(Math.max(filterAttack+1/sampleRate,.012,k.filterDecay)),
    preDriveGain:.62+k.distortion*.28,driveAmount:k.drive,bodyFreqHz:Math.max(80,k.tunedFreq*1.5),bodyQ:3.2,bodyGain:.08+k.reverbAmount*.14+k.colorAmount*.04,
    delayFrames:delay>.002?Math.min(16383,frames(.08+k.reverbAmount*.08)):0,delayWetGain:delay>.002?delay*.16:0,delayFeedback:delay>.002?Math.min(.42,delay*.38):0,
    normalizationGain:1/Math.max(1,(k.oscillatorFreqs.length+k.colorFreqs.length)*.7)});
  return {record:new Uint32Array(record),frameCount:frames(stop),durationSec:stop,gateFrames:frames(duration),releaseStartFrames:frames(releaseStart),releaseFrames:frames(release),silent:velocity===0};
}
function __entrophonRenderWorkerMain() {
  let module=null;
  onmessage=async({data})=>{let processor=null,result=null;try {
    if(data.type==='init'){module=await WebAssembly.compile(data.wasm);postMessage({ready:true});return;}
    const {record,frameCount,sampleRate:rate,gateFrames,volumeCurve,pitchCurve,silent,releaseStartFrames,releaseFrames}=data;
    if(!module||!Number.isInteger(frameCount)||frameCount<1||frameCount>rate*34)throw Error('Invalid Entrophon render size');
    // The worklet reads sampleRate at construction/initialization, never on the UI thread.
    globalThis.sampleRate=rate;globalThis.__entFrame=0;
    processor=new globalThis.__entProcessor({});
    await processor.onMessage({type:'INIT',compiledModule:module,profile:1,completionBatchVersion:1});
    if(!processor.ready)throw Error('Entrophon C11 kernel failed to initialize');
    await processor.onMessage({type:'SET_MUTED',muted:false});
    record[2]=processor.bridge.epoch;
    await processor.onMessage({type:'HOT_TONE_PLAN',buffer:record.buffer});
    const left=new Float32Array(frameCount),right=new Float32Array(frameCount);
    const output=Array.from({length:9},()=>[new Float32Array(128),new Float32Array(128)]);
    const curve=(values,t,fallback)=>{if(!values?.length)return fallback;const at=Math.min(1,t)*(values.length-1),i=Math.floor(at);return values[i]+((values[i+1]??values[i])-values[i])*(at-i);};
    let nextControl=0,released=false;
    for(let offset=0;offset<frameCount;offset+=128){
      if(!released&&(offset>=nextControl||offset>=releaseStartFrames)&&(volumeCurve||pitchCurve)){
        const t=Math.min(1,offset/gateFrames);
        await processor.onMessage({type:'ENTROPHON_CONTROL',epoch:processor.bridge.epoch,token:1,op:offset>=releaseStartFrames?2:1,
          pitch:Math.pow(2,Math.max(-36,Math.min(36,curve(pitchCurve,t,0)))/12),gain:Math.max(0,Math.min(4,curve(volumeCurve,t,1))),ramp:128,releaseFrames});
        released=offset>=releaseStartFrames;nextControl=offset+Math.max(128,Math.round(rate/200));
      }
      processor.process([],output);
      const count=Math.min(128,frameCount-offset);
      if(!silent){left.set(output[0][0].subarray(0,count),offset);right.set(output[0][1].subarray(0,count),offset);}
      globalThis.__entFrame+=128;
    }
    if(processor.kernelAccepted!==1)throw Error('Entrophon C11 rejected saved sound');
    for(let i=0;i<frameCount;i++)if(!Number.isFinite(left[i])||!Number.isFinite(right[i]))throw Error('Nonfinite Entrophon output');
    result={left,right};
  }catch(error){result={error:error?.message??String(error)};}finally{if(processor?.bridge){try{processor.bridge.destroy();}catch(error){result={error:error?.message??String(error)};}processor.bridge=null;processor.ready=false;}}
    if(result)postMessage(result,result.left?[result.left.buffer,result.right.buffer]:[]);};
}
function __entrophonCreateRenderWorker(signal) {
  if(typeof Worker==='undefined')throw Error('Entrophon rendering requires Worker support');
  const prelude='globalThis.__entFrame=0;globalThis.sampleRate=48000;globalThis.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){},start(){}}}};globalThis.registerProcessor=(name,processor)=>{globalThis.__entProcessor=processor};\n';
  const url=URL.createObjectURL(new Blob([prelude,T8.replace(/\bcurrentFrame\b/g,'globalThis.__entFrame'),'\n(',__entrophonRenderWorkerMain.toString(),')();'],{type:'text/javascript'}));
  let worker,revoked=false;const revoke=()=>{if(!revoked){revoked=true;URL.revokeObjectURL(url);}};
  try{worker=new Worker(url);}catch(error){revoke();throw error;}
  let pending=null,closed=false;
  const fail=error=>{if(pending){const p=pending;pending=null;clearTimeout(p.timer);p.reject(error);}};
  const dispose=()=>{if(closed)return;closed=true;signal?.removeEventListener('abort',abort);worker.terminate();revoke();fail(Object.assign(Error('Entrophon rendering cancelled'),{name:'AbortError'}));};
  const abort=()=>dispose();signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>{if(data.ready)revoke();if(!pending)return;const p=pending;pending=null;clearTimeout(p.timer);data.error?p.reject(Error(data.error)):p.resolve(data);};
  worker.onerror=event=>{fail(Error(event.message||'Entrophon worker failed'));dispose();};
  function send(data){if(closed||signal?.aborted)return Promise.reject(Object.assign(Error('Entrophon rendering cancelled'),{name:'AbortError'}));if(pending)return Promise.reject(Error('Entrophon renderer busy'));return new Promise((resolve,reject)=>{pending={resolve,reject,timer:setTimeout(()=>{fail(Error('Entrophon render timed out'));dispose();},30000)};try{worker.postMessage(data);}catch(error){fail(error);}});}
  return {send,dispose};
}
function __entrophonValidateCurves(options) {
  for(const curve of [options.volumeCurve,options.pitchCurve])if(curve&&(!Array.isArray(curve)||curve.length>512||!curve.every(Number.isFinite)))throw Error('Invalid Entrophon contour');
}
async function renderEntrophonSound(instrument,options={},sampleRate=48000) {
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid Entrophon sample rate');
  __entrophonValidateCurves(options);
  const plan=__entrophonMelodicRecord(instrument,options,sampleRate),worker=__entrophonCreateRenderWorker(options.signal);
  try {await worker.send({type:'init',wasm:GMe()});const pcm=await worker.send({...plan,sampleRate,volumeCurve:options.volumeCurve,pitchCurve:options.pitchCurve});return {...pcm,durationSec:plan.durationSec,sampleRate};}
  finally {worker.dispose();}
}
async function prepareEntrophonMelodicSources(request,sources,ctx) {
  if(request.drumPreviewOnly)return sources;
  if(request.signal?.aborted)throw Object.assign(Error('Entrophon rendering cancelled'),{name:'AbortError'});
  const composer=request.composer,stepSec=lD(request)/iD(composer),notes=[];
  for(const note of composer.notes){
    const track=composer.tracks.find(t=>t.id===note.trackId);
    if(!track||track.enabled===false||(request.noteId?note.id!==request.noteId:!request.trackIds.includes(track.id))||composer.pitchSteps[uD(composer,note)]?.muted)continue;
    const preset=yW(track,note);if(!preset?.startsWith('entrophon:'))continue;
    let source=sources.get(preset);
    if(!source||source.kind!=='entrophon'){const instrument=entrophonFindInstrument(preset,composer);if(!instrument)throw Error('Entrophon instrument missing: '+preset);source={kind:'entrophon',instrument,noteBuffers:new Map()};sources.set(preset,source);}
    notes.push({note,track,source});
  }
  if(!notes.length)return sources;
  if(notes.length>2048)throw Error('Too many Entrophon notes');
  // Preflight the complete request BEFORE allocating a Worker or any PCM.
  // A bad final note must not waste hundreds of seconds rendering earlier notes.
  // Definitions remain immutable; track mixer settings never enter this key.
  const rendered=new Map(),jobs=[],assignments=[];let totalFrames=0;
  for(const {note,track,source} of notes){
      const options=entrophonMelodicNoteOptions(composer,note,track,source,stepSec);__entrophonValidateCurves(options);
      if(request.signal?.aborted)throw Object.assign(Error('Entrophon rendering cancelled'),{name:'AbortError'});
      let definitionCache=rendered.get(source.instrument);
      if(!definitionCache){definitionCache=new Map();rendered.set(source.instrument,definitionCache);}
      const key=JSON.stringify([ctx.sampleRate,options.frequency,options.velocity,options.durationSec,options.attackSec,options.releaseSec,options.volumeCurve,options.pitchCurve]);
      let job=definitionCache.get(key);
      if(!job){
        const plan=__entrophonMelodicRecord(source.instrument,options,ctx.sampleRate);totalFrames+=plan.frameCount;
        if(jobs.length>=2048||totalFrames>ctx.sampleRate*600)throw Error('Entrophon material exceeds preparation limit');
        job={plan,options,material:null};definitionCache.set(key,job);jobs.push(job);
      }
      assignments.push({note,source,options,job});
  }
  const worker=__entrophonCreateRenderWorker(request.signal);
  try {await worker.send({type:'init',wasm:GMe()});
    for(const job of jobs){
      const {plan,options}=job;
      const pcm=await worker.send({...plan,sampleRate:ctx.sampleRate,volumeCurve:options.volumeCurve,pitchCurve:options.pitchCurve});
      if(request.signal?.aborted)throw Object.assign(Error('Entrophon rendering cancelled'),{name:'AbortError'});
      if(pcm.left?.length!==plan.frameCount||pcm.right?.length!==plan.frameCount)throw Error('Invalid Entrophon prepared material');
      const buffer=ctx.createBuffer(2,pcm.left.length,ctx.sampleRate);buffer.copyToChannel(pcm.left,0);buffer.copyToChannel(pcm.right,1);
      job.material={buffer,durationSec:plan.durationSec};
    }
    // Publish all note materials together only after the whole worker pass succeeds.
    for(const {note,source,options,job} of assignments)source.noteBuffers.set(note.id,{...job.material,options});
    return sources;
  }finally {worker.dispose();}
}
function entrophonRenderTailSeconds(request) {
  if(request.drumPreviewOnly)return 0;
  const composer=request.composer,stepSec=lD(request)/iD(composer),nominal=E$(request);let end=nominal;
  for(const note of composer.notes){
    const track=composer.tracks.find(t=>t.id===note.trackId);
    if(!track||track.enabled===false||(request.noteId?note.id!==request.noteId:!request.trackIds.includes(track.id))||composer.pitchSteps[uD(composer,note)]?.muted)continue;
    const preset=yW(track,note);if(!preset?.startsWith('entrophon:'))continue;
    const instrument=entrophonFindInstrument(preset,composer);if(!instrument)continue;
    const options=entrophonMelodicNoteOptions(composer,note,track,{kind:'entrophon',instrument},stepSec);
    const plan=__entrophonMelodicRecord(instrument,options,48000);
    end=Math.max(end,Ax(composer,note)*stepSec+plan.durationSec+.01);
  }
  return Math.max(0,end-nominal);
}
async function previewEntrophonSavedSound(entry,options={}) {
  const runtime=__XenNodalInstallation.current,signal=options.signal;
  const assertActive=()=>{if(signal?.aborted)throw Object.assign(Error('Entrophon preview cancelled'),{name:'AbortError'});};
  assertActive();
  if(!runtime?.ensureAudio)throw Error('Audio runtime unavailable');
  const ctx=await runtime.ensureAudio();let player=null,gain=null,ended=false,stopping=false,cleanupTimer=null;
  const cleanup=()=>{if(ended)return;ended=true;if(cleanupTimer!==null)clearTimeout(cleanupTimer);cleanupTimer=null;
    signal?.removeEventListener('abort',noteOff);if(player)player.onended=null;
    try{player?.disconnect();}catch{}try{gain?.disconnect();}catch{}
  };
  const noteOff=()=>{if(ended||stopping)return;stopping=true;
    const now=ctx.currentTime,stopAt=now+.015;
    try{if(gain?.gain.cancelAndHoldAtTime)gain.gain.cancelAndHoldAtTime(now);else if(gain){gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(Math.max(0,Math.min(1,gain.gain.value)),now);}
      gain?.gain.linearRampToValueAtTime(0,now+.012);
    }catch{}
    try{player?.stop(stopAt);}catch{}
    // A suspended shared context may not deliver onended. Always release routing.
    cleanupTimer=setTimeout(cleanup,50);
  };
  try {assertActive();const pcm=await renderEntrophonSound(entry.instrument,{frequency:options.frequency??220,velocity:.8,durationSec:.8,signal},ctx.sampleRate);assertActive();
    const buffer=ctx.createBuffer(2,pcm.left.length,ctx.sampleRate);buffer.copyToChannel(pcm.left,0);buffer.copyToChannel(pcm.right,1);
    player=ctx.createBufferSource();gain=ctx.createGain();player.buffer=buffer;player.connect(gain);gain.connect(runtime.getOutput(ctx));
    const now=ctx.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.006);
    player.onended=cleanup;signal?.addEventListener('abort',noteOff,{once:true});player.start(now);
    return {started:Promise.resolve(true),noteOff};
  }catch(error){if(player&&!stopping)try{player.stop();}catch{}cleanup();throw error;}
}
