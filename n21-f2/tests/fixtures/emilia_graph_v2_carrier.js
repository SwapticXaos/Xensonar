/* Emilia 3: an immutable timbre recipe, played exclusively by the captured Carrier.
   Rendering, audition and export share the versioned Nodal kernel. No ball/live owner. */
const __Emilia = (() => {
  const MACHINE='emilia-nodal-carrier', ENGINE='emilia-graph-spectrum-v2', STORAGE='xensonar.forge.emilia-graph-spectrum.v2', MAX_NODES=7;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
  const listeners=new Set();let revision=0,serial=0,preview=null,previewEpoch=0;
  function normalized(input){
    if(input?.schema==='xensonar.emilia-instrument'&&!([1,2,3,4,5,6].includes(input.version)||input.version==null))throw Error('Unsupported Emilia recipe version');
    const raw=input?.schema==='xensonar.emilia-instrument'?input.model:input;
    const model=__XenNodalModel.normalize({...raw,nodes:Array.isArray(raw?.nodes)?raw.nodes.slice(0,MAX_NODES):raw?.nodes,name:'Emilia',excitation:{kind:'tone',level:.65},articulation:{durationSec:4,attackSec:.004,releaseSec:.08,volumeEnvelope:null,pitchEnvelope:null}});
    return Object.freeze({schema:'xensonar.emilia-instrument',version:6,engine:ENGINE,model});
  }
  function starter(){
    const base=nodalStarter('glass');return normalized({...base,coupling:.16,nodes:base.nodes.map((n,i)=>({...n,id:'emilia-'+i,role:['resonator','formant','tilt'][i],label:['Resonator','Formant','Tilt'][i],ratio:[1,1,.75][i],x:[.28,.64,.46][i],y:[.44,.55,.24][i],radius:.38,strength:.85,excitation:.7,pickup:.9}))});
  }
  let instrument=starter();
  // Recover an existing A/1, B/2 or Emilia-3 draft when the hybrid is opened the first time.
  for(const key of [STORAGE,'xensonar.forge.emilia-b-network.v1','xensonar.forge.emilia-hybrid.v1','xensonar:forge:emilia-draft:v1','xensonar.forge.emilia-b.v1','xensonar.forge.emilia3.v1']){
    try{const raw=localStorage.getItem(key);if(raw&&raw.length<250000){const saved=JSON.parse(raw);instrument=normalized(saved.instrument??saved);break;}}catch{}
  }
  const snapshot=()=>instrument;
  const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
  const semanticKey=input=>{const r=normalized(input);return JSON.stringify({engine:ENGINE,referenceHz:r.model.referenceHz,body:__XenNodalModel.semanticKey(r.model)})};
  // Preview is a sustained, explicitly stoppable modal sample. Changing the recipe
  // replaces the loop using short gain crossfades, never a click-per-mousemove queue.
  function stopPreview(){
    ++previewEpoch;
    if(!preview)return;
    clearTimeout(preview.timer);
    for(const item of preview.sources){try{item.source.stop();}catch{}try{item.source.disconnect();item.gain.disconnect();}catch{}}
    preview=null;
  }
  function set(next,{invalidate=true}={}){
    const candidate=normalized(next);if(semanticKey(candidate)===semanticKey(instrument))return instrument;
    const playing=!!preview;
    if(!playing)stopPreview();instrument=candidate;revision++;
    if(playing)schedulePreview(candidate,60);
    try{localStorage.setItem(STORAGE,JSON.stringify(instrument));}catch{}
    if(invalidate&&typeof __f333HearingCache!=='undefined')__f333HearingCache.clear();
    if(invalidate&&typeof pe!=='undefined'&&pe.getState){const state=pe.getState();if(state.carrierIntegralSelection?.machineId===MACHINE){__f333Stop();pe.setState({...__f333Idle(),renderVersion:(state.renderVersion??0)+1,audioBufferDirty:true});}}
    for(const fn of listeners)fn();return instrument;
  }
  function loadProject(next){stopPreview();try{set(next??starter(),{invalidate:false});}catch(error){console.warn('[Emilia] Invalid recipe, restoring default',error);set(starter(),{invalidate:false});}}
  const modify=(input,fn)=>{const r=normalized(input);return normalized({...r.model,...fn(r.model)})};
  const moveNode=(input,id,x,y)=>modify(input,m=>({nodes:m.nodes.map(n=>n.id===id?{...n,x:clamp(x,0,1),y:clamp(y,0,1)}:n)}));
  const editNode=(input,id,patch)=>modify(input,m=>({nodes:m.nodes.map(n=>n.id===id?{...n,...patch,label:patch.role?__NodalOrgans[patch.role]?.label:n.label}:n)}));
  function createNode(input,role='resonator'){
    const r=normalized(input);if(r.model.nodes.length>=MAX_NODES)return r;if(!__XenNodalModel.roles.includes(role))throw Error('Unknown organ');
    let id;do{id='emilia-added-'+(++serial)}while(r.model.nodes.some(n=>n.id===id));
    return modify(r,m=>({nodes:[...m.nodes,{id,label:__NodalOrgans[role].label,role,x:.35+(m.nodes.length%3)*.16,y:.3+(m.nodes.length%2)*.27,ratio:1,cents:0,radius:.32,strength:.8,excitation:.7,pickup:.8,muted:false}]}));
  }
  const removeNode=(input,id)=>modify(input,m=>m.nodes.length<=1?{}:{nodes:m.nodes.filter(n=>n.id!==id),blockedEdges:m.blockedEdges.filter(e=>!e.includes(id))});
  const changeRole=(input,id,role)=>editNode(input,id,{role});
  const curve=(values,t,fallback=0)=>{if(!values?.length)return fallback;const p=clamp(t,0,1)*(values.length-1),a=Math.floor(p);return values[a]+(values[Math.min(a+1,values.length-1)]-values[a])*(p-a)};
  function carrierTracks(grid,durationSec,pitchRatio=1){
    const doc=typeof __f333ReadCarrier==='function'?__f333ReadCarrier(grid):null;
    if(doc){
      return doc.notes.map((note,index)=>({id:note.id??'note-'+index,kind:'melodic',at(t){
        const beat=t/durationSec*doc.durationBeats,start=note.startBeat,end=start+note.durationBeats;
        if(beat<start||beat>=end)return{gain:0,hz:220*pitchRatio};
        const pos=(beat-start)/note.durationBeats;let gain=curve(note.gainCurve,pos,.6);
        if(note.fadeInBeats>0)gain*=Math.min(1,(beat-start)/note.fadeInBeats);
        if(note.fadeOutBeats>0)gain*=Math.min(1,(end-beat)/note.fadeOutBeats);
        return{gain:clamp(gain,0,1),hz:curve(note.pitchHz,pos,220)*pitchRatio};
      }}));
    }
    const plan=__ForgeF33.buildCarrierSupportPlan(grid,durationSec),field=plan.supportField;
    return plan.bands.map((band,index)=>{
      // Tracker identifies the voice; original region peak supplies linear amplitude.
      const amplitudes=Array.from({length:field.width},(_,x)=>field.regions[x]?.[band.supportRegionCurve[x]]?.peak??0);
      return{id:band.trackId??'painted-'+index,kind:'painted',at(t){const pos=t/durationSec;return{gain:clamp(curve(amplitudes,pos),0,1),hz:plan.rootReferenceHz*curve(band.centerRatioCurve,pos,1)*pitchRatio}}};
    });
  }
  // Patch-dependent calibration, not Carrier-figure peak normalization: a fixed
  // reference excitation estimates the inherent level of a constellation. The
  // musical Carrier gain curve is NEVER used in this calculation or compressed.
  const trimCache=new Map();
  function recipeTrim(plan,sr){
    const key=plan.key+'@'+sr;
    if(trimCache.has(key))return trimCache.get(key);
    const frames=Math.max(512,Math.floor(sr*.19)),left=new Float32Array(64),right=new Float32Array(64);
    const tester=__XenNodalDSP.voice(plan,{frequency:220,held:true,velocity:.84,gain:.68,attackSec:.004,offlineDurationSec:.5},sr);
    let energy=0,count=0;
    for(let pos=0;pos<frames;pos+=64){const n=Math.min(64,frames-pos);tester.process(left,right,0,n);
      if(pos>sr*.035){for(let i=0;i<n;i++){energy+=left[i]*left[i];count++;}}}
    const reference=Math.sqrt(energy/Math.max(1,count));
    const trim=Math.max(.16,Math.min(3.4,.12/Math.max(.008,reference)));
    trimCache.set(key,trim);if(trimCache.size>36)trimCache.delete(trimCache.keys().next().value);
    return trim;
  }
  async function renderPCM({tracks,durationSec,instrument:input=snapshot(),sampleRate=48000,onProgress,signal,isCancelled}){
    if(!Number.isFinite(durationSec)||durationSec<=0||durationSec>600||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)throw Error('Invalid Emilia render bounds');
    const frames=Math.ceil(durationSec*sampleRate);if(frames>24000000)throw Error('Emilia render is too large. Use a shorter figure or lower sample rate.');
    const recipe=normalized(input),plan=compileEmiliaNetworkColor(recipe.model);
    const left=new Float32Array(frames),right=new Float32Array(frames);
    if(plan.silent||!tracks.length){onProgress?.(1);return{left,right,sampleRate,voices:0,engine:ENGINE};}
    // V1 preserves the living coupled-modal resonator sound of Emilia 1/2.
    // B contributes continuity tracking; the Carrier alone supplies the final amplitude.
    const block=32,scratchL=new Float32Array(block),scratchR=new Float32Array(block),timbreTrim=recipeTrim(plan,sampleRate);
    const tail=Math.min(1.5,Math.max(.11,.12+Math.max(...plan.nodes.map(n=>n.decaySec))*.045));
    const cancelled=()=>{if(signal?.aborted||isCancelled?.())throw new DOMException('Emilia render cancelled','AbortError')};
    let lastYield=Date.now(),voices=0;
    const makeVoice=(hz)=>{voices++;return __XenNodalDSP.voice(plan,{frequency:hz,held:true,velocity:.84,gain:.68,
      offlineDurationSec:durationSec+tail+.5,attackSec:.004,releaseSec:tail},sampleRate)};
    for(let ti=0;ti<tracks.length;ti++){
      let active=null,gap=0,lastGain=0;const tails=[];
      for(let start=0;start<frames;start+=block){
        const count=Math.min(block,frames-start),at=(start+count*.5)/sampleRate,sample=tracks[ti].at(at),gain=clamp(sample?.gain??0,0,1),hz=sample?.hz;
        const sounding=gain>.000001,validHz=Number.isFinite(hz)&&hz>=5&&hz<=12000;
        if(sounding&&!validHz)throw Error('Carrier frequency outside supported 5–12000 Hz range.');
        if(sounding){
          if(!active||active.ended){active=makeVoice(hz);}active.setFrequency(hz);gap=0;lastGain=gain;
        }else if(active){gap+=count/sampleRate;if(gap>=.014){active.noteOff();tails.push({voice:active,gain:lastGain});active=null;}}
        // Track a voice while it sustains, including a brief grid-gap without
        // spurious re-attacks. During a true pause only its resonant tail remains.
        if(active&&!active.ended){
          active.process(scratchL,scratchR,0,count);
          for(let i=0;i<count;i++){
            const t=(start+i+.5)/sampleRate;
            const g=clamp(tracks[ti].at(t)?.gain??0,0,1);
            left[start+i]+=scratchL[i]*g*timbreTrim;
            right[start+i]+=scratchR[i]*g*timbreTrim;
          }
        }
        for(let j=tails.length-1;j>=0;j--){
          const item=tails[j];if(item.voice.ended){tails.splice(j,1);continue;}
          item.voice.process(scratchL,scratchR,0,count);
          for(let i=0;i<count;i++){left[start+i]+=scratchL[i]*item.gain*timbreTrim;right[start+i]+=scratchR[i]*item.gain*timbreTrim;}
          if(item.voice.ended)tails.splice(j,1);
        }
        if((start&1023)===0){cancelled();if(Date.now()-lastYield>18){onProgress?.((ti+start/frames)/tracks.length);await new Promise(r=>setTimeout(r,0));lastYield=Date.now();}}
      }
      cancelled();onProgress?.((ti+1)/tracks.length);
    }
    // Bounded master protection, not whole-figure peak normalization.
    const protect=x=>Math.abs(x)<=.76?x:Math.sign(x)*(.76+.20*Math.tanh((Math.abs(x)-.76)/.20));
    const edge=Math.min(40,Math.floor(frames/2));
    for(let i=0;i<frames;i++){if(!Number.isFinite(left[i])||!Number.isFinite(right[i]))throw Error('Invalid Emilia output');const fade=i<edge?i/edge:i>=frames-edge?(frames-1-i)/edge:1;left[i]=protect(left[i])*fade;right[i]=protect(right[i])*fade;}
    cancelled();return{left,right,sampleRate,voices,engine:ENGINE};
  }
  async function renderCarrier({grid,durationSec,previewPitchRatio=1,instrument:input=snapshot(),onProgress,signal}){
    if(!grid||!(grid.width>0&&grid.height>1)||!Number.isFinite(previewPitchRatio)||previewPitchRatio<=0)throw Error('Invalid Emilia carrier');
    const epoch=revision,transportEpoch=typeof __f333Epoch==='number'?__f333Epoch:null;
    const tracks=carrierTracks(grid,durationSec,previewPitchRatio);
    if(!tracks.length)throw Error('Draw a Carrier figure before playing Emilia.');
    if(normalized(input).model.nodes.every(n=>n.muted))throw Error('Unmute at least one Emilia node before playing.');
    const ctx=xt.getContext();
    const result=await renderPCM({tracks,durationSec,instrument:input,sampleRate:ctx.sampleRate,onProgress,signal,isCancelled:()=>revision!==epoch||(transportEpoch!==null&&__f333Epoch!==transportEpoch)});
    const buffer=ctx.createBuffer(1,result.left.length,ctx.sampleRate);buffer.copyToChannel(result.left,0);return buffer;
  }
  function schedulePreview(input=snapshot(),delay=150){
    const state=preview;if(!state)return;
    state.pendingRecipe=normalized(input);
    // Throttle, don't endlessly debounce pointer movement: the sound must
    // change WHILE the node is being moved, without rendering every pointer event.
    if(state.timer!==null)return;
    const epoch=++previewEpoch;
    state.timer=setTimeout(()=>{
      state.timer=null;
      const recipe=state.pendingRecipe;
      void refreshPreview(recipe,state,epoch);
    },delay);
  }
  async function refreshPreview(recipe,state,epoch){
    try{
      if(recipe.model.nodes.every(n=>n.muted))throw Error('Unmute at least one node to preview the sound.');
      const ctx=state.ctx;
      // Stable harmonic reference without an obligatory 1.8-second note-off.
      // The user may leave it playing while editing. Rendering is coalesced.
      const secs=1.5,track={at:t=>({hz:220,gain:t<1.48?.72:0})};
      const result=await renderPCM({durationSec:secs,instrument:recipe,sampleRate:ctx.sampleRate,tracks:[track],isCancelled:()=>epoch!==previewEpoch});
      if(epoch!==previewEpoch||preview!==state)return;
      const start=Math.floor(ctx.sampleRate*.25),end=Math.floor(ctx.sampleRate*1.25),length=end-start;
      const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
      const pcm=buffer.getChannelData(0),src=result.left;
      pcm.set(src.subarray(start,end));
      // 5 ms soft boundary on the loop prevents a hard digital click.
      const seam=Math.min(Math.floor(ctx.sampleRate*.005),length>>3);
      for(let i=0;i<seam;i++){const f=(i+.5)/seam;pcm[i]*=f;pcm[length-1-i]*=f;}
      const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;
      const now=ctx.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.75,now+.045);
      source.connect(gain);gain.connect(ctx.destination);source.start();state.sources.push({source,gain});
      for(const old of state.sources.slice(0,-1)){
        try{old.gain.gain.cancelScheduledValues(now);old.gain.gain.setValueAtTime(old.gain.gain.value,now);old.gain.gain.linearRampToValueAtTime(0,now+.05);old.source.stop(now+.065);}catch{}
        setTimeout(()=>{try{old.source.disconnect();old.gain.disconnect()}catch{}},100);
      }
      state.sources=state.sources.slice(-1);state.onState?.('playing');
    }catch(error){if(epoch===previewEpoch&&preview===state){state.onState?.('error',error);stopPreview();}}
  }
  async function startPreview(onState){
    stopPreview();
    try{
      const ctx=xt.getContext();if(ctx.state!=='running')await ctx.resume();
      const state={ctx,sources:[],timer:null,onState};preview=state;
      onState?.('loading');schedulePreview(snapshot(),0);
    }catch(error){stopPreview();onState?.('error',error);}
  }
  return Object.freeze({MACHINE,ENGINE,MAX_NODES,snapshot,subscribe,semanticKey,normalized,set,loadProject,starter,moveNode,editNode,createNode,removeNode,changeRole,renderPCM,renderCarrier,carrierTracks,startPreview,stopPreview,schedulePreview});
})();
