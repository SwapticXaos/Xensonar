/* STEMS-01 · record the Live Room as STEMS (not as one mixed take) and hand them to the Multitrack.
 *
 * What is captured: the four role buses of the Live Room mixer (Instruments = "main", Drone, Rhythm = drums / loops / root-follow impulses, Space = echo returns),
 * taken AFTER each role's own EQ / level and BEFORE the master chain (premaster, glue, clipper, limiter, trim). The sum of the four stems is exactly what enters the master chain.
 * The taps are extra connections out of the existing role gains (fan-out); no existing connection is changed, no node is inserted into the live path.
 *
 * Architecture (HOT / WARM / COLD):
 *  - HOT   one AudioWorklet with N stereo inputs, sample-aligned, typed arrays and a buffer pool (no allocation per block); exists only while recording.
 *  - WARM  the main thread only moves 8192-frame blocks (4 stems ≈ 1.4 MB/s) into the existing disk-backed PCM sink (IndexedDB, 4 MiB batches). No React state per block.
 *  - COLD  everything else (UI, finishing, sending to the Multitrack) runs on press / stop. Nothing is loaded or running when not recording.
 * Limit: 5 minutes per stem recording (the worklet stops by itself). Silent stems are not sent. Stem archives are deleted once the Multitrack has them.
 */
function __xenStemsWorkletModule(){
  class XenStemsCapture extends AudioWorkletProcessor{
    constructor(options){
      super();
      const op=options.processorOptions||{};
      this.n=Math.max(1,op.stems|0);this.fpc=8192;this.max=op.maxFrames>0?op.maxFrames:Infinity;
      this.pools=[];this.blocks=[];
      for(let s=0;s<this.n;s++){const a=[];for(let k=0;k<8;k++)a.push(new Float32Array(this.fpc*2));this.blocks.push(a.pop());this.pools.push(a)}
      this.peaks=new Float32Array(this.n);
      this.pos=0;this.running=false;this.start=0;this.end=Infinity;this.captured=0;this.first=-1;this.expected=-1;this.gaps=0;this.missing=0;this.dead=false;
      this.port.onmessage=e=>{
        const m=e.data;if(!m)return;
        if(m.kind==='recycle'){const p=this.pools[m.stem|0];if(p&&m.data instanceof ArrayBuffer&&m.data.byteLength===this.fpc*8)p.push(new Float32Array(m.data));return}
        if(m.kind==='start'){if(this.first<0&&!this.running){this.start=Number.isFinite(m.startFrame)?Math.max(0,m.startFrame|0):0;this.running=true}return}
        if(m.kind==='stopAt'){if(this.running)this.end=m.frame;return}
        if(m.kind==='stop'){if(this.running)this.finish('stop');return}
        if(m.kind==='dispose'){this.running=false;this.dead=true}
      };
    }
    refill(){
      for(let s=0;s<this.n;s++)if(!this.blocks[s]){this.blocks[s]=this.pools[s].pop()||null;if(!this.blocks[s])return false}
      return true;
    }
    emit(){
      if(!this.pos)return true;
      for(let s=0;s<this.n;s++){const d=this.blocks[s].buffer;this.port.postMessage({kind:'chunk',stem:s,frames:this.pos,data:d},[d]);this.blocks[s]=null}
      this.pos=0;
      return this.refill();
    }
    finish(reason){
      this.running=false;this.emit();
      this.port.postMessage({kind:'done',reason,first:this.first,frames:this.captured,gaps:this.gaps,missing:this.missing,peaks:Array.from(this.peaks)});
    }
    process(inputs){
      if(this.dead)return false;
      if(!this.running)return true;
      const cf=currentFrame,frames=(inputs[0]&&inputs[0][0]&&inputs[0][0].length)||128;
      if(cf+frames<=this.start)return true;
      const begin=cf>this.start?cf:this.start,i0=begin-cf;
      if(this.first<0)this.first=begin;
      if(this.expected>=0&&this.expected!==begin){this.gaps++;if(begin>this.expected)this.missing+=begin-this.expected}
      if(!this.refill()){this.running=false;this.port.postMessage({kind:'error',message:'Stem transfer pool exhausted; recording stopped without concealing missing frames.'});return true}
      for(let i=i0;i<frames;i++){
        if(cf+i>=this.end||this.captured>=this.max){this.finish(this.captured>=this.max?'limit':'stopAt');return true}
        const at=this.pos*2;
        for(let s=0;s<this.n;s++){
          const inp=inputs[s],L=inp&&inp[0],R=inp&&(inp[1]||inp[0]);
          let l=L?L[i]:0,r=R?R[i]:0;
          if(l!==l)l=0;if(r!==r)r=0;
          const blk=this.blocks[s];blk[at]=l;blk[at+1]=r;
          const al=l<0?-l:l,ar=r<0?-r:r,pk=al>ar?al:ar;if(pk>this.peaks[s])this.peaks[s]=pk;
        }
        this.pos++;this.captured++;
        if(this.pos===this.fpc&&!this.emit()){this.running=false;this.port.postMessage({kind:'error',message:'Stem transfer pool exhausted; recording stopped without concealing missing frames.'});return true}
      }
      this.expected=cf+frames;
      return true;
    }
  }
  registerProcessor('xensonar-stems-pcm-v1',XenStemsCapture);
}

const __XenStemRecorder=(()=>{
  const ROLES=Object.freeze([
    {id:'main',name:'Instruments',hint:'Particles, waves, keyboard, Entrophon and the other instrument voices'},
    {id:'drone',name:'Drone',hint:'The drone layer'},
    {id:'rhythm',name:'Rhythm',hint:'Drums, loops and root-follow impulses'},
    {id:'space',name:'Space',hint:'Echo and space returns'}]);
  const MAX_SECONDS=300,listeners=new Set(),moduleByContext=new WeakMap();
  /* STEMS-02: which stems are recorded and where they are tapped (kept for the session; not saved with songs) */
  let setup={roles:ROLES.map(r=>r.id),tap:'after-eq'};
  let state={phase:'idle',ms:0,message:'',stems:[],maxMs:MAX_SECONDS*1000,setup};
  let session=null,timer=0,lastKept=null;
  const emit=patch=>{state={...state,...patch};for(const fn of listeners)try{fn(state)}catch{}};
  function configure(patch={}){
    if(session||state.phase==='recording'||state.phase==='starting'||state.phase==='finalizing'||state.phase==='sending')return state.setup;
    const roles=Array.isArray(patch.roles)?ROLES.map(r=>r.id).filter(id=>patch.roles.includes(id)):setup.roles;
    const tap=patch.tap==='before-eq'||patch.tap==='after-eq'?patch.tap:setup.tap;
    setup={roles,tap};emit({setup});return setup;
  }
  const source=()=>{try{return globalThis.__XenLiveStemSource?.get?.()||null}catch{return null}};
  function ready(ctx){
    let p=moduleByContext.get(ctx);if(p)return p;
    p=(async()=>{
      const code='('+__xenStemsWorkletModule.toString()+')();';let error=null;
      for(const mode of ['blob','data']){let url=null;
        try{url=mode==='blob'?URL.createObjectURL(new Blob([code],{type:'application/javascript'})):'data:application/javascript;charset=utf-8,'+encodeURIComponent(code);await ctx.audioWorklet.addModule(url);return}
        catch(cause){error=cause}finally{if(mode==='blob'&&url)URL.revokeObjectURL(url)}}
      throw error??Error('Stem recorder worklet could not be loaded.');
    })();
    moduleByContext.set(ctx,p);p.catch(()=>{if(moduleByContext.get(ctx)===p)moduleByContext.delete(ctx)});
    return p;
  }
  function teardown(s){
    if(timer){clearInterval(timer);timer=0}
    if(!s)return;
    try{s.ctx.removeEventListener('statechange',s.onState)}catch{}
    for(const k of s.connected){try{k.from.disconnect(k.node,0,k.input)}catch{}}
    try{s.node.port.postMessage({kind:'dispose'})}catch{}
    try{s.node.disconnect();s.node.port.onmessage=null}catch{}
  }
  /* options.extra: ['premaster'] adds the premaster sum as an additional stem (diagnostics / null test only; never sent to the Multitrack). */
  async function start(options={}){
    if(session||state.phase==='recording'||state.phase==='finalizing')throw Error('A stem recording is already running.');
    const refuse=message=>{emit({phase:'error',message});throw Error(message)};
    const src=source();
    if(!src?.ctx||!src.roleGains)refuse('Start the Live Room audio (Power) before recording stems.');
    const ctx=src.ctx;if(ctx.state!=='running')refuse('The audio engine is not running.');
    const extra=Array.isArray(options.extra)?options.extra:[];
    const want=Array.isArray(options.roles)?options.roles:setup.roles,chosen=ROLES.filter(r=>want.includes(r.id));
    if(!chosen.length)refuse('Select at least one stem to record.');
    const pre=(options.tap||setup.tap)==='before-eq';
    if(pre&&!src.splices)refuse('The Live Room mixer is not ready.');
    const taps=chosen.map(r=>({id:r.id,name:r.name+(pre?' (pre-EQ)':''),node:pre?src.splices[r.id]:src.roleGains[r.id],pre}));
    for(const id of extra)if(id==='premaster'&&src.premaster)taps.push({id:'premaster',name:'Premaster (diagnostic)',node:src.premaster,diagnostic:true});
    if(taps.slice(0,chosen.length).some(t=>!t.node))refuse('The Live Room mixer is not ready.');
    emit({phase:'starting',ms:0,message:'Preparing stems…',stems:[]});
    const sinks=[];let node=null;const connected=[];
    try{
      /* leftovers of a crashed stem recording (never listed as master archives) are removed first */
      try{await __xenLongMasterPCM.purgeStems(0)}catch{}
      await ready(ctx);
      for(const t of taps)sinks.push(await __xenLongMasterPCM.create(ctx.sampleRate,{kind:'stem',stem:t.id}));
      node=new AudioWorkletNode(ctx,'xensonar-stems-pcm-v1',{numberOfInputs:taps.length,numberOfOutputs:0,channelCount:2,channelCountMode:'explicit',channelInterpretation:'speakers',
        processorOptions:{stems:taps.length,maxFrames:Math.round(MAX_SECONDS*ctx.sampleRate)}});
    }catch(error){for(const s of sinks)await s.discard().catch(()=>{});try{node?.disconnect()}catch{}emit({phase:'error',message:String(error?.message||error)});throw error}
    const s=session={ctx,node,taps,sinks,connected,peaks:null,done:null,startedAt:0,bpm:null,name:String(options.name||'').trim()||'xensonar-stems',silent:[],error:null,sent:[],finishing:null,keep:!!options.keep};
    try{const live=Number(__XenMainRoomSessionBridge.liveClock().bpm);s.bpm=live>0?live:null}catch{}
    let doneResolve;s.doneP=new Promise(r=>{doneResolve=r});
    node.port.onmessage=e=>{
      const m=e.data;if(!m)return;
      if(m.kind==='chunk'){
        const sink=sinks[m.stem];
        try{sink.append(m.data.slice(0,m.frames*8),m.frames)}catch(error){s.error=s.error||error;try{node.port.postMessage({kind:'stop'})}catch{}}
        try{node.port.postMessage({kind:'recycle',stem:m.stem,data:m.data},[m.data])}catch{}
      }else if(m.kind==='done'){s.done=m;doneResolve(m);if(state.phase==='recording')finish().catch(()=>{})}
      else if(m.kind==='error'){s.error=s.error||Error(m.message);doneResolve(null);if(state.phase==='recording')finish().catch(()=>{})}
    };
    taps.forEach((t,i)=>{t.node.connect(node,0,i);connected.push({from:t.node,node,input:i})});
    /* Power off / engine suspended while recording: keep what was captured and hand it over */
    s.onState=()=>{if(session===s&&ctx.state!=='running'&&state.phase==='recording')finish().catch(()=>{})};try{ctx.addEventListener('statechange',s.onState)}catch{}
    node.port.postMessage({kind:'start',startFrame:Math.round((ctx.currentTime+.05)*ctx.sampleRate)});
    s.startedAt=performance.now();
    timer=setInterval(()=>{if(session===s&&state.phase==='recording')emit({ms:Math.min(state.maxMs,Math.round(performance.now()-s.startedAt))})},250);
    emit({phase:'recording',ms:0,message:'Recording stems…',stems:taps.filter(t=>!t.diagnostic).map(t=>({id:t.id,name:t.name,peak:null}))});
    return s;
  }
  function frameNow(s){return Math.round((s.ctx.currentTime+.02)*s.ctx.sampleRate)}
  /* stop at one sample-exact frame for every stem, write the archives, then (unless keep) send the audible stems to the Multitrack */
  async function finish(){
    const s=session;if(!s)return null;
    if(s.finishing)return s.finishing;
    s.finishing=(async()=>{
      emit({phase:'finalizing',message:'Writing stems…'});
      /* a running engine stops every stem at one sample-exact frame; a suspended / closed engine cannot advance its clock, so the worklet is told to stop where it is */
      if(!s.done){try{s.node.port.postMessage(s.ctx.state==='running'?{kind:'stopAt',frame:frameNow(s)}:{kind:'stop'})}catch{}}
      await Promise.race([s.doneP,new Promise(r=>setTimeout(()=>r(null),3000))]);
      teardown(s);
      const metas=[];
      try{for(const sink of s.sinks)metas.push(await sink.finish())}catch(error){s.error=s.error||error}
      const peaks=s.done?.peaks||[];
      s.metas=metas;s.peaks=peaks;
      if(s.error||!s.done||!(s.done.frames>0)){
        for(const sink of s.sinks)await sink.discard().catch(()=>{});
        const msg=s.error?String(s.error.message||s.error):'Nothing was recorded.';
        session=null;emit({phase:'error',message:'Stem recording failed: '+msg,stems:[]});return null;
      }
      const seconds=s.done.frames/s.ctx.sampleRate;
      const stems=s.taps.map((t,i)=>({id:t.id,name:t.name,peak:peaks[i]??0,diagnostic:!!t.diagnostic,meta:metas[i]}));
      if(s.keep){lastKept=s;session=null;emit({phase:'kept',ms:Math.round(seconds*1000),message:'Stems kept (no send).',stems:stems.map(x=>({id:x.id,name:x.name,peak:x.peak}))});return {session:s,stems,seconds};}
      emit({phase:'sending',ms:Math.round(seconds*1000),message:'Sending stems to the Multitrack…',stems:stems.filter(x=>!x.diagnostic).map(x=>({id:x.id,name:x.name,peak:x.peak}))});
      try{
        const inbox=globalThis.__XenMultitrackInbox;if(!inbox)throw Error('Multitrack is not available in this build.');
        const audible=stems.filter(x=>!x.diagnostic&&x.peak>1e-5),silent=stems.filter(x=>!x.diagnostic&&!(x.peak>1e-5));
        if(!audible.length)throw Error('All stems are silent: nothing was sent.');
        for(const x of audible){
          const blob=await __xenLongMasterPCM.exportWhole(x.meta);
          await inbox.sendBlob({blob,name:s.name+' · '+x.name,origin:'live-room-stems',bpm:s.bpm,startBeat:0});
          s.sent.push(x.id);
        }
        for(const x of stems){try{await __xenLongMasterPCM.remove(x.meta.id,x.meta.parts)}catch{}}
        window.dispatchEvent(new CustomEvent('xensonar:multitrack:roundtrip-navigate',{detail:{room:'MULTITRACK'}}));
        const mm=Math.floor(seconds/60),ss=String(Math.round(seconds%60)).padStart(2,'0');
        session=null;emit({phase:'done',message:`${audible.length} stems (${mm}:${ss}) sent to the Multitrack as new tracks`+(silent.length?` · silent, not sent: ${silent.map(x=>x.name).join(', ')}`:'')+(s.bpm?` · ${Math.round(s.bpm*100)/100} BPM`:'')+'.',stems:stems.filter(x=>!x.diagnostic).map(x=>({id:x.id,name:x.name,peak:x.peak}))});
        return {sent:audible.map(x=>x.id),silent:silent.map(x=>x.id),seconds};
      }catch(error){
        /* the stems stay safe in the browser archive; nothing is deleted when the hand-over failed */
        session=null;emit({phase:'error',message:'Sending stems failed: '+String(error?.message||error)+' The stems are kept in the browser archive.'});return null;
      }
    })();
    return s.finishing;
  }
  async function cancel(){
    const s=session;if(!s)return;
    session=null;teardown(s);
    for(const sink of s.sinks)await sink.discard().catch(()=>{});
    emit({phase:'idle',ms:0,message:'',stems:[]});
  }
  function reset(){if(!session)emit({phase:'idle',ms:0,message:'',stems:[]})}
  const api={roles:ROLES,maxSeconds:MAX_SECONDS,configure,start,stop:()=>finish(),cancel,reset,snapshot:()=>state,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},
   /* test access (read-only views of the finished session; the archives of a kept session are readable through __xenLongMasterPCM) */
   __session:()=>session,__lastKept:()=>lastKept};
  try{globalThis.__XenStemRecorder=api}catch{}
  return api;
})();
