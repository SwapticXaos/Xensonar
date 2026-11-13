/* XenSonar LM01 — isolated, lossless, disk-backed master-session take storage.
 * Dedicated only to opt-in Master Recording, never used by Loop-Rec.
 * PCM is Float32 stereo and written in 4 MiB batches to IndexedDB.
 * MRU01 P1–P3: atomic PCM checkpoints, sample-exact range access, continuous WAV.
 * Legacy part export retained only as recovery helper; no forced musical split.
 */
/* STORAGE-PERSIST-01 (KALT): without this request the browser may delete localStorage/IndexedDB of this origin when disk space runs low
 * (sessions, samples, takes). ask() is only called from a user action (opening the Package Station inventory, starting a long recording);
 * it never writes to storage, never throws, and asks the browser at most once per page load. */
const __xenStoragePersistence=(()=>{
  let asking=null;
  async function status(){
    const out={supported:false,persisted:null,usage:null,quota:null};
    try{const s=navigator.storage;if(!s)return out;out.supported=typeof s.persist==='function';
      if(typeof s.persisted==='function')out.persisted=await s.persisted();
      if(typeof s.estimate==='function'){const e=await s.estimate();out.usage=Number.isFinite(e?.usage)?e.usage:null;out.quota=Number.isFinite(e?.quota)?e.quota:null}}catch{}
    return out;
  }
  function ask(force=false){
    if(asking&&!force)return asking;
    asking=(async()=>{
      try{const s=navigator.storage;if(s&&typeof s.persist==='function'&&!(typeof s.persisted==='function'&&await s.persisted()))await s.persist()}catch{}
      return status();
    })();
    return asking;
  }
  return {status,ask};
})();
const __xenLongMasterPCM=(()=>{
  const DB='xensonar-master-long-sessions-v1', STORE='pcm', TAKES='takes';
  const BATCH_BYTES=4194304, MAX_QUEUED_BYTES=33554432, SEGMENT_SECONDS=600;
  let connection=null;
  function database(){
    if(connection)return connection;
    connection=new Promise((resolve,reject)=>{
      if(typeof indexedDB==='undefined'){reject(Error('IndexedDB unavailable: long-session recording requires browser storage.'));return;}
      const req=indexedDB.open(DB,1);
      req.onupgradeneeded=()=>{const db=req.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
        if(!db.objectStoreNames.contains(TAKES))db.createObjectStore(TAKES,{keyPath:'id'});
      };
      req.onerror=()=>reject(req.error||Error('Cannot open long-session storage.'));
      req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>db.close();resolve(db);};
    }).catch(error=>{connection=null;throw error;});
    return connection;
  }
  async function requestValue(store,method,...args){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,method==='get'?'readonly':'readwrite');
      let result;
      tx.oncomplete=()=>resolve(result);
      tx.onerror=()=>reject(tx.error||Error('Recording storage transaction failed.'));
      tx.onabort=()=>reject(tx.error||Error('Recording storage transaction aborted.'));
      const req=tx.objectStore(store)[method](...args);
      req.onsuccess=()=>{result=req.result;};
    });
  }
  // MRU01: PCM + its manifest checkpoint are a single atomic IDB transaction.
  // A crash can leave the previous checkpoint, but cannot publish frames without
  // the corresponding PCM object or vice versa.
  async function writeCheckpoint(id,part,data,meta){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction([STORE,TAKES],'readwrite');
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error||Error('PCM checkpoint transaction failed.'));
      tx.onabort=()=>reject(tx.error||Error('PCM checkpoint aborted.'));
      tx.objectStore(STORE).put(data,id+'-'+String(part).padStart(7,'0'));
      tx.objectStore(TAKES).put(meta);
    });
  }
  function header(frames,rate){
    const bytes=frames*8;
    if(!Number.isSafeInteger(frames)||frames<1||bytes>0xffffffff-36)
      throw Error('WAV segment exceeds RIFF 4 GiB limit.');
    const h=new ArrayBuffer(44),v=new DataView(h);
    for(const [offset,str] of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']])
      for(let i=0;i<str.length;i++)v.setUint8(offset+i,str.charCodeAt(i));
    v.setUint32(4,bytes+36,true);v.setUint32(16,16,true);v.setUint16(20,3,true);
    v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*8,true);
    v.setUint16(32,8,true);v.setUint16(34,32,true);v.setUint32(40,bytes,true);
    return h;
  }
  function validateMeta(meta){
    if(!meta||!Number.isSafeInteger(meta.frames)||!Number.isSafeInteger(meta.parts)||
        !Number.isInteger(meta.sampleRate)||meta.sampleRate<=0||meta.frames<=0||meta.parts<=0)
      throw Error('Long-session recording is incomplete or corrupt.');
    return meta;
  }
  /* extra: marks a different kind of archive (STEMS-01: {kind:'stem',stem}); such archives never appear in the master archive list (list()) */
  async function create(sampleRate,extra=null){
    const db=await database();
    if(!Number.isInteger(sampleRate)||sampleRate<=0)throw Error('Invalid session sample rate.');
    void __xenStoragePersistence.ask();
    // Conservative check for two PCM batches, not an arbitrary 10-minute recording.
    if(navigator.storage?.estimate){
      try{
        const {quota,usage}=await navigator.storage.estimate();
        if(Number.isFinite(quota)&&Number.isFinite(usage)&&quota-usage<BATCH_BYTES*2)
          throw Error('Not enough browser storage to safely start disk-backed PCM capture.');
      }catch(error){if(/Not enough browser storage/.test(error?.message||''))throw error;/* Quota estimate can be blocked even when IDB works. */}
    }
    const id='lm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
    let pending=[],pendingBytes=0,queuedBytes=0,parts=0,frames=0,committedFrames=0,writeError=null;
    let writing=Promise.resolve(),closed=false;
    const base={id,schemaVersion:2,format:'float32-le-interleaved',channels:2,sampleRate,createdAt:Date.now(),status:'recording',frames:0,committedFrames:0,parts:0,chunkBytes:BATCH_BYTES,updatedAt:Date.now(),...(extra&&typeof extra==='object'?extra:{})};
    await requestValue(TAKES,'put',base);
    function flush(){
      if(!pendingBytes)return;
      if(writeError)throw writeError;
      const data=new Blob(pending,{type:'application/octet-stream'});
      if(queuedBytes+data.size>MAX_QUEUED_BYTES){
        writeError=Error('Disk writer is too slow (>32 MiB queued); capture halted to prevent silent loss.');
        throw writeError;
      }
      const part=parts++;
      queuedBytes+=data.size;
      pending=[];pendingBytes=0;
      writing=writing.then(async()=>{
        const nextFrames=committedFrames+data.size/8;
        const checkpoint={...base,...(handle.metadata?.()||{}),frames:nextFrames,committedFrames:nextFrames,
          parts:part+1,status:'partial',updatedAt:Date.now()};
        await writeCheckpoint(id,part,data,checkpoint);
        committedFrames=nextFrames;
      }).catch(err=>{writeError=err;throw err;})
        .finally(()=>{queuedBytes-=data.size;});
      writing.catch(()=>{});
    }
    const handle={id,sampleRate,meta:null,
      append(buffer,chunkFrames){
        if(closed||writeError)throw writeError||Error('Session writer is closed.');
        if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==chunkFrames*8||!chunkFrames)
          throw Error('Invalid long-session PCM block.');
        // Split on exact byte boundaries. Handles legacy 8,192-frame worklet
        // blocks and atypical frame sizes without shifting block offsets.
        let pos=0;
        while(pos<buffer.byteLength){
          const size=Math.min(BATCH_BYTES-pendingBytes,buffer.byteLength-pos);
          pending.push(pos===0&&size===buffer.byteLength?buffer:buffer.slice(pos,pos+size));
          pendingBytes+=size;pos+=size;
          if(pendingBytes===BATCH_BYTES)flush();
        }
        frames+=chunkFrames;
      },
      async finish(partial=false){
        if(this.meta)return this.meta;
        closed=true;
        // Even partial sessions retain already captured samples for recovery.
        if(!writeError)flush();
        await writing;
        if(writeError)throw writeError;
        const meta={...base,...(this.metadata?.()||{}),frames:partial?committedFrames:frames,committedFrames,parts,updatedAt:Date.now(),status:partial?'partial':'ready'};
        if(frames>0){await requestValue(TAKES,'put',meta);this.meta=meta;}
        else await requestValue(TAKES,'delete',id);
        return meta;
      },
      async discard(){closed=true;pending=[];pendingBytes=0;
        try{await writing;}catch{};
        await remove(id,parts);
      }
    };
    return handle;
  }
  async function remove(id,parts){
    const meta=await requestValue(TAKES,'get',id);
    const count=Math.max(parts||0,meta?.parts||0);
    // Removing in bounded transactions prevents long browser UI locks.
    for(let offset=0;offset<count;offset+=64){
      const db=await database();
      await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite'),st=tx.objectStore(STORE);
        for(let i=offset;i<Math.min(count,offset+64);i++)st.delete(id+'-'+String(i).padStart(7,'0'));
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error);
      });
    }
    await requestValue(TAKES,'delete',id);
  }
  async function list(){
    const records=await requestValue(TAKES,'getAll');
    return records.filter(x=>x.kind!=='stem'&&x.frames>0&&(x.status==='ready'||x.status==='partial'))
      .sort((a,b)=>b.createdAt-a.createdAt);
  }
  async function latest(){return (await list())[0]||null;}
  /* STEMS-01: remove stem archives (left over from a crash or a failed hand-over) older than maxAgeMs */
  async function purgeStems(maxAgeMs=0){
    const records=await requestValue(TAKES,'getAll'),now=Date.now();let removed=0;
    for(const r of records)if(r.kind==='stem'&&now-(r.createdAt||0)>=maxAgeMs){await remove(r.id,r.parts);removed++}
    return removed;
  }
  function numberOfSegments(meta){return Math.ceil(validateMeta(meta).frames/(meta.sampleRate*SEGMENT_SECONDS));}
  async function exportPart(meta,index){
    validateMeta(meta);
    const total=numberOfSegments(meta);
    if(!Number.isInteger(index)||index<0||index>=total)throw Error('Invalid WAV part number.');
    const firstFrame=index*meta.sampleRate*SEGMENT_SECONDS;
    const frames=Math.min(meta.frames-firstFrame,meta.sampleRate*SEGMENT_SECONDS);
    const firstByte=firstFrame*8, lastByte=(firstFrame+frames)*8;
    const firstPart=Math.floor(firstByte/BATCH_BYTES),lastPart=Math.floor((lastByte-1)/BATCH_BYTES);
    const wavParts=[header(frames,meta.sampleRate)];let bytes=0;
    for(let p=firstPart;p<=lastPart;p++){
      const data=await requestValue(STORE,'get',meta.id+'-'+String(p).padStart(7,'0'));
      if(!(data instanceof Blob))throw Error('Missing WAV PCM segment in browser storage.');
      const start=Math.max(0,firstByte-p*BATCH_BYTES);
      const end=Math.min(data.size,lastByte-p*BATCH_BYTES);
      if(end<=start)throw Error('Invalid PCM segment boundaries.');
      wavParts.push(data.slice(start,end));bytes+=end-start;
    }
    if(bytes!==frames*8)throw Error('WAV PCM size mismatch: export aborted.');
    return new Blob(wavParts,{type:'audio/wav'});
  }
  // Canonical sample-based access for both short excerpts and arbitrarily long
  // sessions. Never constructs a complete AudioBuffer.
  function validRange(meta,first,last){
    validateMeta(meta);
    if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first<0||last>meta.frames||last<=first)
      throw Error('Invalid PCM frame range.');
  }
  async function* streamFrames(meta,first=0,last=meta.frames){
    validRange(meta,first,last);
    const beginByte=first*8,endByte=last*8;
    const chunkBytes=meta.chunkBytes||BATCH_BYTES;
    for(let part=Math.floor(beginByte/chunkBytes);part<=Math.floor((endByte-1)/chunkBytes);part++){
      const data=await requestValue(STORE,'get',meta.id+'-'+String(part).padStart(7,'0'));
      if(!(data instanceof Blob))throw Error('Missing PCM block '+part+' in stored recording.');
      const expected=Math.min(chunkBytes,meta.frames*8-part*chunkBytes);
      if(data.size!==expected)throw Error('PCM block '+part+' has wrong byte length.');
      const start=Math.max(0,beginByte-part*chunkBytes),end=Math.min(data.size,endByte-part*chunkBytes);
      if(end<=start||(end-start)%8!==0)throw Error('PCM block range is corrupt.');
      yield data.slice(start,end);
    }
  }
  async function readFrames(meta,first,last){
    validRange(meta,first,last);
    const frames=last-first;
    if(frames>meta.sampleRate*120)throw Error('Range exceeds 120 seconds; stream or choose a shorter excerpt.');
    const interleaved=new Float32Array(frames*2);
    let at=0;
    for await(const blob of streamFrames(meta,first,last)){
      const raw=await blob.arrayBuffer(),samples=new Float32Array(raw);
      interleaved.set(samples,at);at+=samples.length;
    }
    if(at!==interleaved.length)throw Error('PCM range contains missing frames.');
    return interleaved;
  }
  async function exportWhole(meta,{writer=null,onProgress=null,signal=null}={}){
    validateMeta(meta);
    const startHeader=header(meta.frames,meta.sampleRate);
    const parts=writer?null:[startHeader];
    if(writer)await writer.write(startHeader);
    let bytes=0;
    for await(const block of streamFrames(meta)){
      if(signal?.aborted)throw Error('WAV export cancelled; source recording retained.');
      if(writer)await writer.write(block);else parts.push(block);
      bytes+=block.size;
      onProgress?.(bytes/(meta.frames*8));
    }
    if(bytes!==meta.frames*8)throw Error('Whole-session WAV size mismatch.');
    if(writer)return {frames:meta.frames,bytes:bytes+startHeader.byteLength};
    return new Blob(parts,{type:'audio/wav'});
  }
  // A selected range remains one WAV file even when crossing PCM block edges.
  async function exportRange(meta,first,last){
    validRange(meta,first,last);
    const pieces=[header(last-first,meta.sampleRate)];let copied=0;
    for await(const blob of streamFrames(meta,first,last)){pieces.push(blob);copied+=blob.size;}
    if(copied!==(last-first)*8)throw Error('WAV crop is missing PCM frames.');
    return new Blob(pieces,{type:'audio/wav'});
  }
  // Initial level-of-detail view: bounded pixel count, not bounded source length.
  // A cache is attached to the existing manifest; no new raw-PCM owner.
  async function getPeaks(meta,bins=1024){
    validateMeta(meta);
    if(!Number.isInteger(bins)||bins<16||bins>8192)throw Error('Invalid waveform resolution.');
    if(meta.peakCache?.width===bins&&meta.peakCache.values?.length===bins)return meta.peakCache.values;
    const peaks=new Float32Array(bins);let atFrame=0;
    for await(const block of streamFrames(meta)){
      const src=new Float32Array(await block.arrayBuffer());
      for(let i=0;i<src.length;i+=2){
        const cell=Math.min(bins-1,Math.floor(atFrame/meta.frames*bins));
        const peak=Math.max(Math.abs(src[i]),Math.abs(src[i+1]));
        if(Number.isFinite(peak)&&peak>peaks[cell])peaks[cell]=peak;
        atFrame++;
      }
      // yield for button feedback even for 2h source files
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(atFrame!==meta.frames)throw Error('Waveform build detected missing PCM frames.');
    const values=Array.from(peaks);
    const current=await requestValue(TAKES,'get',meta.id);
    if(current?.frames===meta.frames){
      const next={...current,peakCache:{width:bins,values}};
      await requestValue(TAKES,'put',next);
      meta.peakCache=next.peakCache;
    }
    return values;
  }
  return {create,latest,list,remove,purgeStems,streamFrames,readFrames,exportWhole,exportRange,getPeaks,exportPart,numberOfSegments,BATCH_BYTES,SEGMENT_SECONDS};
})();

