/* P3.15 – Package Station cold-path JSON and bounded diagnostic events.
 * Do not build a single giant JSON string. Emit JSON tokens as Blob parts;
 * preserve JSON.stringify replacer/toJSON/undefined semantics. No live-audio work. */
const __XenPackageExportStreamP315 = (() => {
  const CHUNK=32768;
  function write(parts,input,replacer) {
    const active=new WeakSet();
    const visit=(holder,key,inArray)=>{
      let value=holder[key];
      if(value && typeof value==='object' && typeof value.toJSON==='function')value=value.toJSON(key);
      if(replacer)value=replacer.call(holder,key,value);
      if(value===null){parts.push('null');return true;}
      if(typeof value==='string'){
        parts.push('"');
        for(let i=0;i<value.length;i+=CHUNK){
          const encoded=JSON.stringify(value.slice(i,i+CHUNK));
          parts.push(encoded.slice(1,-1));
        }
        parts.push('"');return true;
      }
      if(typeof value==='number'){
        parts.push(Number.isFinite(value)?String(value):'null');return true;
      }
      if(typeof value==='boolean'){parts.push(value?'true':'false');return true;}
      if(value===undefined||typeof value==='function'||typeof value==='symbol'){
        if(inArray){parts.push('null');return true;}return false;
      }
      if(typeof value==='bigint')throw new TypeError('Do not know how to serialize a BigInt');
      if(typeof value!=='object')throw new TypeError('Unsupported workspace value');
      if(active.has(value))throw new TypeError('Converting circular structure to JSON');
      active.add(value);
      try {
        if(Array.isArray(value)){
          parts.push('[');
          for(let i=0;i<value.length;i++){
            if(i)parts.push(',');
            visit(value,String(i),true);
          }
          parts.push(']');return true;
        }
        parts.push('{');let first=true;
        for(const prop of Object.keys(value)){
          // JSON.stringify omits unsupported object fields, but the replacer
          // decides after toJSON. Evaluate exactly once per property.
          const before=parts.length;
          if(!first)parts.push(',');
          parts.push(JSON.stringify(prop),':');
          if(!visit(value,prop,false)){
            parts.length=before;continue;
          }
          first=false;
        }
        parts.push('}');return true;
      } finally {active.delete(value);}
    };
    visit({'':input},'',false);
    return parts;
  }
  function hash(value){
    // FNV-1a over the exact JSON UTF-16 characters, without one giant JSON string.
    // Keep the historic `al(JSON.stringify(value))` checksum byte-for-byte stable.
    const chunks=[];write(chunks,value);
    let h=2166136261;
    for(const chunk of chunks)for(let i=0;i<chunk.length;i++){
      h^=chunk.charCodeAt(i);h=Math.imul(h,16777619);
    }
    return 'h'+(h>>>0).toString(16);
  }
  return Object.freeze({write,hash});
})();

const __XenPackageExportTraceP315=(()=>{
  const runs=[];let current=null,next=0;
  // P3.16: Bounded, metadata-only export checkpoints survive a crashed tab.
  // No audio, names, IDs, or project payload is ever persisted here.
  const KEY='xensonar:package-station:crash-trace:p316';
  const storage=()=>{try{return typeof localStorage!=='undefined'?localStorage:null;}catch{return null;}};
  const checkpoint=()=>{try{
    const v={schemaVersion:1,runs:runs.slice(-2).map(r=>({
      run:r.run,startedIso:r.startedIso,status:r.status,
      events:r.events.slice(-32).map(e=>({...e})),error:r.error??null
    }))};
    storage()?.setItem(KEY,JSON.stringify(v));
  }catch{/* A failed diagnostics write must never stop the export. */}};
  try{
    const previous=JSON.parse(storage()?.getItem(KEY)??'null');
    if(previous?.schemaVersion===1&&Array.isArray(previous.runs))for(const r of previous.runs.slice(-2)){
      if(!r||!Array.isArray(r.events)||typeof r.startedIso!=='string'||
         !Number.isSafeInteger(r.run))continue;
      runs.push({run:r.run,startedIso:r.startedIso,startedPerf:0,
        status:r.status==='running'?'interrupted':String(r.status??'interrupted'),
        events:r.events.slice(-32).filter(e=>e&&typeof e.stage==='string').map(e=>({
          stage:e.stage.slice(0,100),elapsedMs:Number(e.elapsedMs)||0,
          ...safeRecovered(e)
        })),error:r.error??null});
      next=Math.max(next,r.run);
    }
  }catch{/* Ignore corrupt/blocked storage without changing export behavior. */}
  function safeRecovered(event){
    const out={};for(const key of ['count','bytes','chunks','samples','projects','assets','donors','workspaces','records','durationMs','estimatedBytes'])
      if(typeof event[key]==='number'&&Number.isFinite(event[key]))out[key]=event[key];
    return out;
  }
  const now=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
  const safe=(v)=>{
    const result={};
    if(v&&typeof v==='object')for(const k of ['count','bytes','chunks','samples','projects','assets','donors','workspaces','records','durationMs','estimatedBytes']){
      const n=v[k];if(typeof n==='number'&&Number.isFinite(n))result[k]=Math.round(n*1000)/1000;
    }
    return result;
  };
  function record(stage,detail={}){
    if(!current)return;
    const elapsed=Math.round((now()-current.startedPerf)*1000)/1000;
    const event={stage,elapsedMs:elapsed,...safe(detail)};
    current.events.push(event);
    if(current.events.length>120)current.events.shift();
    checkpoint();
    // Existing Runtime-Diagnose ZIP events.log receives the same stage events.
    if(typeof bn==='function')try{bn('package-station',stage,{run:current.run,elapsedMs:elapsed,...safe(detail)});}catch{}
  }
  function begin(){
    current={run:++next,startedIso:new Date().toISOString(),startedPerf:now(),status:'running',events:[]};
    runs.push(current);if(runs.length>5)runs.shift();record('begin');return current.run;
  }
  function step(stage,detail){record(stage,detail);}
  function fail(error){
    if(!current)return;
    const reason=error?.name==='RangeError'?'range-limit':error?.name==='QuotaExceededError'?'quota':error?.name==='TypeError'?'invalid-data':'export-error';
    record('failed');
    current.error={type:reason,name:typeof error?.name==='string'?error.name.slice(0,60):'Error',
      invalidStringLength: /invalid string length/i.test(String(error?.message??''))};
    current.status='error';checkpoint();
  }
  function finish(detail){record('download-created',detail);if(current){current.status='download-ready';checkpoint();}}
  function read(){return{schemaVersion:1,binaryArchive:typeof __xenPackageStation4==='function'?__xenPackageStation4().diagnostics():null,recording:'bounded metadata-only export stages',runs:runs.map(r=>({
    run:r.run,startedIso:r.startedIso,status:r.status,events:r.events.map(e=>({...e})),error:r.error??null
  }))};}
  return Object.freeze({begin,step,fail,finish,read});
})();
