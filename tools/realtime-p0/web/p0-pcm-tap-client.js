import {P0_TAP_PROTOCOL,P0_TAP_POOL_BUFFERS,P0_TAP_FRAMES_PER_BUFFER,P0_TAP_BYTES,P0_TAP_MAX_SECONDS,safeInteger,validRate,maxChunks} from './p0-pcm-contract.js';
export * from './p0-pcm-contract.js';
export class P0PcmTapClient {
  constructor(port,scope,onEvent=()=>{}){
    this.port=port;this.scope=Object.freeze({...scope});this.onEvent=onEvent;this.nextCaptureId=1;
    this.takes=new Map();this.ready=false;this.poolReady=false;this.sampleRate=0;this.closed=false;this.drainingId=null;
    this.seenGeneration=Array(P0_TAP_POOL_BUFFERS).fill(0);this.heldReturns=Array(P0_TAP_POOL_BUFFERS).fill(null);this.holdingReturns=false;
    port.onmessage=ev=>this.handle(ev.data);
    const buffers=Array.from({length:P0_TAP_POOL_BUFFERS},(_,bufferId)=>({bufferId,buffer:new ArrayBuffer(P0_TAP_BYTES)}));
    this.send({kind:'pool-init',buffers},buffers.map(x=>x.buffer));
  }
  send(m,transfer=[]){if(!this.closed)this.port.postMessage({...m,...this.scope,protocol:P0_TAP_PROTOCOL},transfer);}
  matches(m){return m?.protocol===P0_TAP_PROTOCOL&&m.sessionId===this.scope.sessionId&&m.engineEpoch===this.scope.engineEpoch&&m.ownerEpoch===this.scope.ownerEpoch;}
  invalid(take){if(take)take.invalidChunks++;}
  returnBuffer(m){
    const r={kind:'buffer-return',bufferId:m.bufferId,bufferGeneration:m.bufferGeneration,buffer:m.buffer};
    if(this.holdingReturns)this.heldReturns[m.bufferId]=r;else this.send(r,[r.buffer]);
  }
  holdBufferReturns(hold){
    this.holdingReturns=!!hold;
    if(!hold)for(let i=0;i<this.heldReturns.length;i++){const r=this.heldReturns[i];if(r){this.heldReturns[i]=null;this.send(r,[r.buffer]);}}
  }
  handle(m){
    if(this.closed)return;
    const active=this.takes.values().next().value;
    if(!this.matches(m)){this.invalid(active);return;}
    if(m.kind==='tap-ready'){
      if(validRate(m.sampleRate)&&m.poolBuffers===P0_TAP_POOL_BUFFERS&&m.framesPerBuffer===P0_TAP_FRAMES_PER_BUFFER){this.ready=true;this.sampleRate=m.sampleRate;}
    }else if(m.kind==='pool-status')this.poolReady=m.initialized===true&&m.poolSize===P0_TAP_POOL_BUFFERS&&m.available===P0_TAP_POOL_BUFFERS;
    else if(m.kind==='capture-armed'){
      const t=this.takes.get(m.captureId);
      if(t){t.armed=m.startFrame===t.startFrame&&m.endFrame===t.startFrame+t.frameCount&&m.expectedFrames===t.frameCount&&m.sampleRate===this.sampleRate&&m.channels===2&&m.poolSize===P0_TAP_POOL_BUFFERS;if(!t.armed)this.invalid(t);}
    }else if(m.kind==='capture-rejected'){
      const t=this.takes.get(m.captureId);if(t)this.finish(t,null,m.reason??'capture-rejected');
    }else if(m.kind==='pcm-chunk'){
      const t=this.takes.get(m.captureId);
      const validLoan=safeInteger(m.bufferId,0,P0_TAP_POOL_BUFFERS-1)&&safeInteger(m.bufferGeneration,1)
        &&m.bufferGeneration===this.seenGeneration[m.bufferId]+1&&m.buffer instanceof ArrayBuffer&&m.buffer.byteLength===P0_TAP_BYTES;
      if(!validLoan){this.invalid(t??active);return;}
      this.seenGeneration[m.bufferId]=m.bufferGeneration;
      if(t){
        const valid=t.armed&&m.sampleRate===this.sampleRate&&m.channels===2&&safeInteger(m.sequence,1)&&m.sequence===t.lastSequence+1
          &&safeInteger(m.firstFrame,t.startFrame)&&safeInteger(m.frames,1,P0_TAP_FRAMES_PER_BUFFER)
          &&m.firstFrame+m.frames<=t.startFrame+t.frameCount&&m.firstFrame>=t.cursor&&t.chunks.length<maxChunks(t.frameCount);
        if(valid){
          const values=new Float32Array(m.buffer,0,m.frames*2);for(let i=0;i<values.length;i++)if(!Number.isFinite(values[i]))t.nonfiniteSamples++;
          t.data.set(values,(m.firstFrame-t.startFrame)*2);t.gapFrames+=m.firstFrame-t.cursor;t.cursor=m.firstFrame+m.frames;
          t.receivedFrames+=m.frames;t.lastSequence=m.sequence;t.chunks.push({sequence:m.sequence,firstFrame:m.firstFrame,frames:m.frames,bufferId:m.bufferId,bufferGeneration:m.bufferGeneration});
        }else this.invalid(t);
      }
      this.returnBuffer(m);
    }else if(m.kind==='capture-end'){
      if(this.drainingId===m.captureId)this.drainingId=null;
      const t=this.takes.get(m.captureId);if(t)this.finish(t,m,null);
    }
    // Raw transferred buffers are not retained by diagnostic listeners.
    const {buffer,buffers,...metadata}=m;this.onEvent(metadata);
  }
  startCapture(startFrame,frameCount){
    if(this.closed||!this.ready||!this.poolReady)throw new Error('tap is not ready');
    if(this.takes.size||this.drainingId!==null||this.holdingReturns)throw new Error('one active capture only');
    if(!safeInteger(startFrame)||!safeInteger(frameCount,1,this.sampleRate*P0_TAP_MAX_SECONDS)||!safeInteger(startFrame+frameCount)||!safeInteger(this.nextCaptureId,1))throw new Error('invalid capture range');
    const captureId=this.nextCaptureId++;
    const t={captureId,startFrame,frameCount,data:new Float32Array(frameCount*2),chunks:[],receivedFrames:0,invalidChunks:0,nonfiniteSamples:0,armed:false,lastSequence:0,cursor:startFrame,gapFrames:0};
    t.done=new Promise(resolve=>{t.resolve=resolve;});this.takes.set(captureId,t);this.send({kind:'capture-start',captureId,startFrame,frameCount});return t;
  }
  validate(t,end=null,reason=null){
    const gapFrames=t.gapFrames+Math.max(0,t.startFrame+t.frameCount-t.cursor);
    const counters=['capturedFrames','droppedFrames','poolDroppedFrames','timelineGapFrames','timelineOverlapFrames','formatErrorFrames','nonfiniteFrames','chunks'];
    const endMatches=!!end&&end.captureId===t.captureId&&end.startFrame===t.startFrame&&end.endFrame===t.startFrame+t.frameCount
      &&end.expectedFrames===t.frameCount&&end.sampleRate===this.sampleRate&&end.channels===2&&end.aborted===false
      &&counters.every(k=>safeInteger(end[k]))&&end.capturedFrames===t.receivedFrames&&end.chunks===t.chunks.length
      &&end.capturedFrames+end.droppedFrames===t.frameCount&&end.droppedFrames===gapFrames
      &&end.droppedFrames===end.poolDroppedFrames+end.timelineGapFrames;
    const integrity=!!t.armed&&!reason&&endMatches&&t.invalidChunks===0&&t.nonfiniteSamples===0
      &&end.timelineGapFrames===0&&end.timelineOverlapFrames===0&&end.formatErrorFrames===0&&end.nonfiniteFrames===0;
    return {complete:!!end&&!reason,armed:t.armed,endMatches,reason,receivedFrames:t.receivedFrames,expectedFrames:t.frameCount,
      gapFrames,overlapFrames:end?.timelineOverlapFrames??0,invalidChunks:t.invalidChunks,nonfiniteSamples:t.nonfiniteSamples,
      droppedFrames:end?.droppedFrames??null,poolDroppedFrames:end?.poolDroppedFrames??null,capturedFrames:end?.capturedFrames??null,chunkCount:t.chunks.length,
      integrity,frameExact:integrity&&gapFrames===0&&t.receivedFrames===t.frameCount};
  }
  finish(t,end,reason){
    const validation=this.validate(t,end,reason);this.takes.delete(t.captureId);
    const result={captureId:t.captureId,startFrame:t.startFrame,frameCount:t.frameCount,sampleRate:this.sampleRate,channels:2,data:t.data,chunks:t.chunks,validation,end};
    t.resolve(result);t.resolve=null;
  }
  cancel(reason='capture-cancelled'){
    const t=this.takes.values().next().value;if(!t)return;
    this.drainingId=t.captureId;this.send({kind:'capture-stop',captureId:t.captureId});this.finish(t,null,reason);this.holdBufferReturns(false);
  }
  close(){this.cancel('context-closed');this.closed=true;this.port.onmessage=null;this.heldReturns.fill(null);}
}
