

/* MRU01 P4: bounded, single-file, stream-encoded FLAC for disk-backed PCM.
 * The original Float32 source is never changed; new FLAC is 16/24-bit integer.
 * OPFS is a temporary seekable output file, NOT a second master-record owner.
 * Temporary FLAC output is deliberately retained until a later cleanup step,
 * because deleting a File's OPFS backing during a browser download is unsafe.
 */
/* MRU01-FF01: file-system-independent temporary output for single-file FLAC.
 * OPFS is preferred; browsers/origins that deny OPFS use a separate temporary
 * IndexedDB store. This DB is NOT the canonical master archive.
 * IDB writes are bounded to 1 MiB; Blob composition does not concatenate PCM.
 */
async function __xenMRUFlacOutput(key,prefixBytes,{forceIdb=false}={}){
  const fail=(message)=>{throw Error(message)};
  const retryable=(e)=>['SecurityError','NotAllowedError','NotSupportedError','InvalidStateError'].includes(e?.name);
  if(!forceIdb && navigator.storage?.getDirectory){
    let root=null,handle=null,writable=null;
    try{
      root=await navigator.storage.getDirectory();
      handle=await root.getFileHandle(key,{create:true});
      writable=await handle.createWritable();
      return {kind:'opfs',writable,getFile:()=>handle.getFile(),release:()=>root.removeEntry(key)};
    }catch(error){
      if(writable)try{await writable.abort()}catch{};
      if(root&&handle)try{await root.removeEntry(key)}catch{};
      if(!retryable(error))throw error;
      console.warn('[XenSonar] MRU01 OPFS unavailable; using bounded IndexedDB FLAC spool:',error?.name);
    }
  }
  if(typeof indexedDB==='undefined')fail('OPFS denied and IndexedDB unavailable. No recording data was changed.');
  const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('xensonar-mru01-flac-temp-v1',1);
    req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains('chunks'))d.createObjectStore('chunks',{keyPath:['key','seq']});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||Error('Cannot open FLAC temporary storage.'));
    req.onblocked=()=>reject(Error('FLAC temporary storage is blocked by another tab.'));
  });
  const MAX=1048576;
  let index=0,buffer=new Uint8Array(MAX),used=0,header=null,expectPlaceholder=true,headerMode=false,closed=false,removed=false;
  const transaction=(mode,action)=>new Promise((resolve,reject)=>{
    let tx,req;try{tx=db.transaction('chunks',mode);req=action(tx.objectStore('chunks'));}
    catch(e){reject(e);return;}
    let value;
    if(req){req.onsuccess=()=>{value=req.result};req.onerror=()=>reject(req.error||Error('FLAC temp transaction failed.'));}
    tx.oncomplete=()=>resolve(value);
    tx.onabort=()=>reject(tx.error||Error('FLAC temp transaction aborted.'));
    tx.onerror=()=>reject(tx.error||Error('FLAC temp transaction error.'));
  });
  async function flush(){
    if(!used)return;
    const blob=new Blob([buffer.subarray(0,used)],{type:'application/octet-stream'});
    await transaction('readwrite',store=>store.put({key,seq:index++,blob}));
    buffer=new Uint8Array(MAX);used=0;
  }
  const writable={
    async write(data){
      if(closed)fail('FLAC spool is closed.');
      const bytes=data instanceof Blob?new Uint8Array(await data.arrayBuffer()):data instanceof ArrayBuffer?new Uint8Array(data):new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
      if(expectPlaceholder){if(bytes.byteLength!==prefixBytes)fail('Invalid reserved FLAC header.');expectPlaceholder=false;return;}
      if(headerMode){if(bytes.byteLength!==prefixBytes)fail('Invalid final FLAC header.');header=new Blob([bytes]);headerMode=false;return;}
      for(let at=0;at<bytes.byteLength;){
        const n=Math.min(MAX-used,bytes.byteLength-at);
        buffer.set(bytes.subarray(at,at+n),used);used+=n;at+=n;
        if(used===MAX)await flush();
      }
    },
    async seek(offset){if(offset!==0||expectPlaceholder||headerMode)fail('Unsupported FLAC spool seek.');await flush();headerMode=true;},
    async close(){if(expectPlaceholder||headerMode||!header)fail('Incomplete FLAC temporary output.');await flush();closed=true;},
    async abort(){closed=true;await release();}
  };
  async function getFile(){
    if(!closed||!header)fail('FLAC output not finalized.');
    const blobs=[header];
    await new Promise((resolve,reject)=>{
      let tx;try{tx=db.transaction('chunks','readonly');}catch(e){reject(e);return;}
      const store=tx.objectStore('chunks');
      const req=store.openCursor(IDBKeyRange.bound([key,0],[key,Number.MAX_SAFE_INTEGER]));
      req.onsuccess=()=>{const cursor=req.result;if(cursor){blobs.push(cursor.value.blob);cursor.continue();}};
      req.onerror=()=>reject(req.error||Error('Cannot read FLAC spool.'));
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('FLAC spool read aborted.'));
    });
    if(blobs.length!==index+1)fail('FLAC spool has missing blocks.');
    return new Blob(blobs,{type:'audio/flac'});
  }
  async function release(){
    if(removed)return;removed=true;
    try{await transaction('readwrite',store=>store.delete(IDBKeyRange.bound([key,0],[key,Number.MAX_SAFE_INTEGER])))}finally{db.close()}
  }
  return {kind:'idb',writable,getFile,release};
}

async function __xenLongSessionEncodeFlac(meta,bitsPerSample=24,onProgress=()=>{},rangeFrames=null,forceIdb=false){
  if(bitsPerSample!==16&&bitsPerSample!==24)throw Error('FLAC supports 16 or 24 bits here.');
  if(!Number.isSafeInteger(meta?.frames)||meta.frames<16||!Number.isInteger(meta.sampleRate))
    throw Error('Invalid archived FLAC source.');
  const startFrame=rangeFrames?.first??0,endFrame=rangeFrames?.last??meta.frames;
  if(!Number.isSafeInteger(startFrame)||!Number.isSafeInteger(endFrame)||startFrame<0||endFrame>meta.frames||endFrame-startFrame<16)
    throw Error('Invalid FLAC crop boundaries.');
  const totalFrames=endFrame-startFrame;
  const key='xen-mru01-flac-'+meta.id+'-'+Date.now()+'-'+bitsPerSample+'.flac';
  let worker=null,workerUrl=null,closed=false,saved=false;
  const vendorLength=new TextEncoder().encode('XenSonar Recorder F3.19.1').length;
  const seekStep=Math.ceil(meta.sampleRate*10/4096)*4096;
  const expectedSeekPoints=Math.ceil(totalFrames/seekStep);
  const prefixBytes=42+4+expectedSeekPoints*18+4+8+vendorLength;
  let written=0,writeChain=Promise.resolve(),sink=null,writable=null,retryIdb=false;
  try{
    sink=await __xenMRUFlacOutput(key,prefixBytes,{forceIdb});
    writable=sink.writable;
    await writable.write(new Uint8Array(prefixBytes));
    workerUrl=URL.createObjectURL(new Blob(['('+f319FlacWorkerEntry.toString()+')()'],{type:'text/javascript'}));
    worker=new Worker(workerUrl);
    const result=await new Promise((resolve,reject)=>{
      let terminal=false;
      async function abort(error){
        if(terminal)return;terminal=true;
        reject(error instanceof Error?error:Error(String(error)));
      }
      worker.onerror=event=>void abort(Error(event?.message||'FLAC encoder worker crashed.'));
      worker.onmessage=event=>{
        if(terminal)return;
        const m=event.data;
        if(m.type==='encoded'){
          if(!(m.data instanceof ArrayBuffer)||!m.data.byteLength){void abort(Error('FLAC worker produced an invalid block.'));return;}
          writeChain=writeChain.then(()=>writable.write(m.data));
          written+=m.data.byteLength;
          writeChain.catch(abort);
          return;
        }
        if(m.type==='need'){
          (async()=>{
            await writeChain;
            const interleaved=await __xenLongMasterPCM.readFrames(meta,startFrame+m.offset,startFrame+m.offset+m.frames);
            if(interleaved.length!==m.frames*2)throw Error('PCM read did not return the requested frames.');
            const left=new Float32Array(m.frames),right=new Float32Array(m.frames);
            for(let i=0;i<m.frames;i++){left[i]=interleaved[i*2];right[i]=interleaved[i*2+1];}
            if(!terminal){worker.postMessage({type:'pcm',offset:m.offset,left,right},[left.buffer,right.buffer]);
              onProgress((m.offset+m.frames)/totalFrames);}
          })().catch(abort);return;
        }
        if(m.type==='done'){
          (async()=>{
            await writeChain;
            if(m.frames!==totalFrames||m.bytes!==written||!(m.header instanceof ArrayBuffer)||m.header.byteLength!==prefixBytes)
              throw Error('FLAC STREAMINFO/seek table does not match encoded PCM.');
            await writable.seek(0);await writable.write(m.header);await writable.close();closed=true;
            const file=await sink.getFile();
            if(file.size!==prefixBytes+written)throw Error('FLAC temporary file size mismatch.');
            saved=true;terminal=true;resolve(file);
          })().catch(abort);return;
        }
        if(m.type==='error')void abort(Error(m.message||'FLAC encoder failed.'));
      };
      worker.postMessage({type:'init',sampleRate:meta.sampleRate,frames:totalFrames,bitsPerSample,strictLevels:true});
    });
    return {file:result,release:sink.release,storage:sink.kind};
  }catch(error){
    // If OPFS is rejected after opening (write/seek/getFile), re-encode once
    // from the immutable master into the isolated IDB spool.
    retryIdb=!forceIdb&&sink?.kind==='opfs'&&['SecurityError','NotAllowedError','InvalidStateError'].includes(error?.name);
    if(!retryIdb)throw error;
    console.warn('[XenSonar] OPFS FLAC export denied during encoding; retrying in IndexedDB.',error?.name);
  }finally{
    if(!closed&&writable)try{await writable.abort()}catch{};
    try{worker?.terminate()}catch{};
    if(workerUrl)URL.revokeObjectURL(workerUrl);
    if(!saved&&sink)try{await sink.release()}catch{};
  }
  if(retryIdb)return __xenLongSessionEncodeFlac(meta,bitsPerSample,onProgress,rangeFrames,true);
}

