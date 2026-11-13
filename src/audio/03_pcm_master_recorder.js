/* UVO-EQ-Live2 / PCM2 | Master Recorder: codec-free sidechain capture.
 * A private AudioWorklet converts the EXISTING media-destination stream to
 * stereo 32-bit float PCM, without inserting any node into the live master path.
 * Never invoke on the main audio's scheduling path; runs only during Rec.
 * If worklets are unavailable, the original MediaRecorder path still works.
 */
function __xenMasterPcmWorkletModule() {
  class XenMasterPcmCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this.framesPerChunk = 8192;
      this.pool=Array.from({length:8},()=>new Float32Array(this.framesPerChunk*2));
      this.block=this.pool.pop();
      this.position = 0;
      this.startFrame=0;this.endFrame=Infinity;this.running = false;this.clockFrame=null;this.clockLength=0;this.firstFrame=null;this.expectedFrame=null;this.frameGaps=0;this.missingFrames=0;this.overlapFrames=0;this.firstGapFrame=null;this.gaps=[];this.timelineEvents=[];this.timelineOverflow=false;this.capturedFrames=0;
      this.port.onmessage = event => {
        if(event.data?.kind==='recycle'){if(event.data.data instanceof ArrayBuffer&&event.data.data.byteLength===this.framesPerChunk*8)this.pool.push(new Float32Array(event.data.data));return}
        if(event.data?.kind==='start'&&this.firstFrame===null){this.startFrame=Number.isFinite(event.data.startFrame)?Math.max(0,Math.round(event.data.startFrame)):0;this.running=true;return;}
        if(event.data?.kind==='stopAt'&&this.running){this.endFrame=event.data.frame;return;}
        if (event.data?.kind !== 'stop' || !this.running) return;
        this.running = false;
        this.emit();
        this.port.postMessage({kind: 'done',firstFrame:this.firstFrame,lastFrame:this.expectedFrame,frameGaps:this.frameGaps,firstGapFrame:this.firstGapFrame,gaps:this.gaps,missingFrames:this.missingFrames,overlapFrames:this.overlapFrames,timelineEvents:this.timelineEvents,timelineOverflow:this.timelineOverflow});
      };
    }
    emit() {
      if (!this.position) return;
      // Transfer the backing buffer; browser needn't clone the PCM samples.
      const data=this.block.buffer;
      this.port.postMessage({kind:'chunk', frames:this.position,firstFrame:this.firstFrame,lastFrame:this.expectedFrame,frameGaps:this.frameGaps,firstGapFrame:this.firstGapFrame,gaps:this.gaps,missingFrames:this.missingFrames,overlapFrames:this.overlapFrames, data}, [data]);
      this.block=this.pool.pop()||null;
      this.position = 0;
    }
    process(inputs, outputs) {
      if (!this.running) return true;
      const channels = inputs[0];
      // An inactive upstream graph supplies an empty input, not necessarily a
      // zero-filled channel. Capture its silent quantum so pauses and markers
      // retain their position on the same audio timeline. No buffer allocation.
      const left = channels?.[0], right = channels?.[1] ?? left;
      const frames = outputs?.[0]?.[0]?.length || left?.length || 128;
      // PCM-CLOCK: under main-thread graph changes Chromium sometimes calls process() with the previous quantum's currentFrame
      // (F, F+128, F+128, F+384) although the input is the next real quantum. Read that way it looked like an overlap and a gap,
      // and the Loop-Rec projection dropped one real block and left silence instead. The capture clock therefore never stands
      // still or runs backwards; a real jump of currentFrame (frames really missing) is still followed and reported.
      const now=this.clockFrame===null?currentFrame:Math.max(currentFrame,this.clockFrame+this.clockLength);
      this.clockFrame=now;this.clockLength=frames;
      if(now+frames<=this.startFrame)return true;
      const beginFrame=Math.max(now,this.startFrame);
      if(this.firstFrame===null)this.firstFrame=beginFrame;
      if(this.expectedFrame!==null&&this.expectedFrame!==beginFrame){
        this.frameGaps++;if(this.firstGapFrame===null)this.firstGapFrame=Math.min(this.expectedFrame,beginFrame);
        const delta=beginFrame-this.expectedFrame;
        if(this.gaps.length<16)this.gaps.push({expected:this.expectedFrame,actual:beginFrame,delta});
        if(delta>0)this.missingFrames+=delta;else this.overlapFrames-=delta;
        // sampleIndex is an absolute offset into *received* (unmodified) PCM.
        // A gap/overlap changes its mapping to the AudioContext frame clock.
        // Only exceptional clock transitions allocate a metadata record.
        if(this.timelineEvents.length<4096)this.timelineEvents.push({sampleIndex:this.capturedFrames,delta,actualFrame:beginFrame});
        else this.timelineOverflow=true;
      }
      this.expectedFrame=Math.min(now+frames,this.endFrame);
      for (let i = beginFrame-now; i < frames; i++) {
        if(now+i>=this.endFrame){this.running=false;this.emit();this.port.postMessage({kind:'done',firstFrame:this.firstFrame,lastFrame:this.expectedFrame,frameGaps:this.frameGaps,firstGapFrame:this.firstGapFrame,gaps:this.gaps,missingFrames:this.missingFrames,overlapFrames:this.overlapFrames,timelineEvents:this.timelineEvents,timelineOverflow:this.timelineOverflow});return true;}
        if(!this.block){
          // A returned transfer buffer can arrive after emit() exhausted the
          // pool but before this quantum. Reuse it without allocating or losing frames.
          this.block=this.pool.pop()||null;
          if(!this.block){this.running=false;this.port.postMessage({kind:'error',message:'PCM transfer pool exhausted; recording stopped without concealing missing frames.'});return true}
        }
        const l = left && Number.isFinite(left[i]) ? left[i] : 0;
        const r = right && Number.isFinite(right[i]) ? right[i] : 0;
        const at = this.position * 2;
        this.block[at] = l;
        this.block[at+1] = r;
        this.capturedFrames++;if (++this.position === this.framesPerChunk) this.emit();
      }
      return true;
    }
  }
  registerProcessor('xensonar-master-pcm-v2', XenMasterPcmCaptureProcessor);
}
const __xenPcmModuleByContext = new WeakMap();
const __XenPcmCaptureStatus={format:"float32",state:"idle",frames:0,firstFrame:null,lastFrame:null,frameGaps:0,missingFrames:0,overlapFrames:0};
function __xenPcmModuleReady(ctx) {
  let ready = __xenPcmModuleByContext.get(ctx);
  if (ready) return ready;
  ready = (async () => {
    const code = '(' + __xenMasterPcmWorkletModule.toString() + ')();';
    let error = null;
    for (const mode of ['blob', 'data']) {
      let url = null;
      try {
        url = mode === 'blob'
          ? URL.createObjectURL(new Blob([code], {type:'application/javascript'}))
          : 'data:application/javascript;charset=utf-8,' + encodeURIComponent(code);
        await ctx.audioWorklet.addModule(url);
        return;
      } catch (cause) { error = cause; }
      finally { if (mode === 'blob' && url) URL.revokeObjectURL(url); }
    }
    throw error ?? Error('PCM recorder worklet could not be loaded.');
  })();
  __xenPcmModuleByContext.set(ctx, ready);
  ready.catch(() => { if (__xenPcmModuleByContext.get(ctx) === ready) __xenPcmModuleByContext.delete(ctx); });
  return ready;
}
async function __xenCreateMasterPCMRecorder(ctx, captureStream, directTap=null,captureStatus=__XenPcmCaptureStatus,longSessionSink=null) {
  if (!ctx?.audioWorklet?.addModule || typeof AudioWorkletNode !== 'function'
      || (!directTap && (!ctx.createMediaStreamSource || !captureStream?.getAudioTracks?.().length)))
    throw Error('Native PCM capture is not supported by this browser.');
  await __xenPcmModuleReady(ctx);
  const ownsInput = !directTap;
  const input = directTap || ctx.createMediaStreamSource(captureStream);
  let worklet,silence;
  try {worklet = new AudioWorkletNode(ctx, 'xensonar-master-pcm-v2', {
    numberOfInputs:1, numberOfOutputs:1, outputChannelCount:[1],
    channelCount:2, channelCountMode:'explicit'
  });
  silence = ctx.createGain();
  } catch(error) {try{worklet?.disconnect();worklet?.port.close()}catch{}if(ownsInput)try{input.disconnect()}catch{}throw error}
  silence.gain.value = 0;  // keep capture alive, never add the take to live sound
  let cleanupTimer = null, finished = false;
  const recorder = {
    __xenPcmCapture:true, __xenLongSessionSink:longSessionSink, state:'inactive', mimeType:'audio/wav',
    onstop:null, onerror:null, ondataavailable:null,
    chunks:[], frames:0, firstFrame:null,frameGaps:0,timelineEvents:[],timelineOverflow:false,sampleRate:ctx.sampleRate,
    stopAtFrame(frame){if(this.state!=='recording')return;this.state='inactive';worklet.port.postMessage({kind:'stopAt',frame});cleanupTimer=setTimeout(()=>fail(Error('Loop-Rec boundary timeout.')),Math.max(2000,(frame/ctx.sampleRate-ctx.currentTime)*1000+2000));},
    start(options) {
      if (this.state !== 'inactive' || finished) throw Error('PCM recorder cannot restart.');
      // None of these connections replace/modify the live master connections.
      try {input.connect(worklet);worklet.connect(silence);silence.connect(ctx.destination);}
      catch(error){this.abort();throw error}
      worklet.port.postMessage({kind:'start',startFrame:options?.startFrame});
      this.state='recording';
      Object.assign(captureStatus,{state:'recording',directTap:!!directTap,sampleRate:ctx.sampleRate,frames:0,firstFrame:null,lastFrame:null,frameGaps:0,missingFrames:0,overlapFrames:0});
    },
    stop() {
      if (this.state !== 'recording') return;
      this.state='inactive';captureStatus.state='stopping';
      try { worklet.port.postMessage({kind:'stop'}); }
      catch (error) { fail(error); return; }
      // AudioContext can be suspended during shutdown: never leave resources alive.
      cleanupTimer = setTimeout(() => fail(Error('PCM recorder did not finish in time.')), 2000);
    },
    toWavBlob() {
      if(longSessionSink)throw Error('Long PCM sessions export disk-backed WAV parts, not a full in-memory WAV.');
      const frames=this.frames, bytes=frames*8;
      if (!frames || bytes > 0xffffffff-36) throw Error('PCM recording is empty or exceeds WAV limits.');
      const header=new ArrayBuffer(44), view=new DataView(header);
      const str=(offset,s)=>{for(let j=0;j<s.length;j++)view.setUint8(offset+j,s.charCodeAt(j));};
      str(0,'RIFF');view.setUint32(4,36+bytes,true);
      str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);
      view.setUint16(20,3,true);view.setUint16(22,2,true);
      view.setUint32(24,this.sampleRate,true);view.setUint32(28,this.sampleRate*8,true);
      view.setUint16(32,8,true);view.setUint16(34,32,true);
      str(36,'data');view.setUint32(40,bytes,true);
      return new Blob([header, ...this.chunks], {type:'audio/wav'});
    },
    async toAudioBuffer(audioContext, cancelled=()=>false) {
      if(longSessionSink)throw Error('Long PCM sessions cannot allocate a full AudioBuffer.');
      if (!this.frames) throw Error('PCM recording contains no frames.');
      const decoded=audioContext.createBuffer(2,this.frames,this.sampleRate);
      const left=decoded.getChannelData(0),right=decoded.getChannelData(1);
      let at=0, batchFrames=0;
      for (const chunk of this.chunks) {
        if (cancelled()) throw Error('PCM recording discarded.');
        const values=new Float32Array(chunk);
        for(let j=0;j<values.length;j+=2) {
          left[at]=values[j];
          right[at]=values[j+1];
          at++;
        }
        batchFrames+=values.length/2;
        if (batchFrames >= 65536) {batchFrames=0;await new Promise(resolve=>setTimeout(resolve,0));}
      }
      if(at!==this.frames) throw Error('PCM sample count mismatch.');
      return decoded;
    },
    // S1: project received PCM onto the AudioContext timeline without mutating
    // the source blocks. Missing positions are zero only in the derived playback
    // WAV; diagnostic coverage identifies them as *not recorded*, not silence.
    // First sample wins if source clock positions overlap.
    async toTimelinePCM(startFrame,endFrame,cancelled=()=>false) {
      if(!Number.isSafeInteger(startFrame)||!Number.isSafeInteger(endFrame)||endFrame<=startFrame)
        throw Error('Invalid Loop-Rec frame interval.');
      const count=endFrame-startFrame;
      if(count*8>0xffffffff-36)throw Error('Loop-Rec interval exceeds WAV limits.');
      const left=new Float32Array(count),right=new Float32Array(count);
      const coverage=new Uint8Array(count);
      let inputIndex=0,eventIndex=0,deltaSum=0,covered=0,duplicateFrames=0,batch=0;
      const events=this.timelineEvents||[];
      const first=this.firstFrame;
      if(!Number.isFinite(first))throw Error('Capture has no audio frame origin.');
      // Compensated timestamp jumps need not mean that PCM is missing.
      // When the raw samples already exactly fill the requested bar interval
      // and the net clock adjustment is zero, leave every sample in recorded
      // order instead of inventing silent gaps and dropping duplicates.
      const rawOrder=!!this.frameGaps&&!this.timelineOverflow&&this.frames===count&&
        first===startFrame&&events.reduce((sum,e)=>sum+e.delta,0)===0;
      if(rawOrder){
        for(const chunk of this.chunks){
          if(cancelled())throw Error('PCM projection cancelled.');
          const samples=new Float32Array(chunk);
          for(let j=0;j<samples.length;j+=2){left[inputIndex]=samples[j];right[inputIndex]=samples[j+1];inputIndex++;}
          batch+=samples.length/2;
          if(batch>=65536){batch=0;await new Promise(resolve=>setTimeout(resolve,0));}
        }
        if(inputIndex!==count)throw Error('Captured PCM raw frame count mismatch.');
        return {left,right,report:{recordedFrames:this.frames,expectedFrames:count,coveredFrames:count,
          reconstructedFrames:0,duplicateFrames:0,firstFrame:first,frameGaps:this.frameGaps,
          missingFrames:this.missingFrames||0,overlapFrames:this.overlapFrames||0,
          timelineOverflow:false,rawOrderUsed:true,timingAmbiguous:true,events:events.slice(0,16),
          projection:'raw-order-timing-ambiguous'}};
      }
      for(const chunk of this.chunks){
        if(cancelled())throw Error('PCM projection cancelled.');
        const samples=new Float32Array(chunk);
        for(let j=0;j<samples.length;j+=2){
          while(eventIndex<events.length&&events[eventIndex].sampleIndex===inputIndex){
            deltaSum+=events[eventIndex].delta;eventIndex++;
          }
          const dst=first+inputIndex+deltaSum-startFrame;
          if(dst>=0&&dst<count){
            if(!coverage[dst]){left[dst]=samples[j];right[dst]=samples[j+1];coverage[dst]=1;covered++;}
            else duplicateFrames++;
          }
          inputIndex++;
        }
        batch+=samples.length/2;
        if(batch>=65536){batch=0;await new Promise(resolve=>setTimeout(resolve,0));}
      }
      if(inputIndex!==this.frames)throw Error('Captured PCM chunk count mismatch.');
      const reconstructedFrames=count-covered;
      return {left,right,report:{recordedFrames:this.frames,expectedFrames:count,coveredFrames:covered,
        reconstructedFrames,duplicateFrames,firstFrame:first,frameGaps:this.frameGaps||0,
        missingFrames:this.missingFrames||0,overlapFrames:this.overlapFrames||0,
        timelineOverflow:!!this.timelineOverflow,events:events.slice(0,16),
        projection:reconstructedFrames||duplicateFrames||this.timelineOverflow||this.frameGaps?'reconstructed':'original'}};
    },
    release() {this.chunks=[];},
    abort() {if(!finished){finished=true;this.state="inactive";dispose();captureStatus.state="discarded";if(longSessionSink)void longSessionSink.discard().catch(()=>{});}this.chunks=[];}
  };
  function dispose() {
    if (cleanupTimer !== null) {clearTimeout(cleanupTimer);cleanupTimer=null;}
    try {input.disconnect(worklet);} catch {}
    if (ownsInput) try {input.disconnect();} catch {}
    try {worklet.disconnect();} catch {}
    try {silence.disconnect();} catch {}
    try {worklet.port.close();} catch {}
  }
  function finish() {
    if (finished) return;
    finished = true; dispose();
    if(longSessionSink){
      captureStatus.state='saving';
      void longSessionSink.finish().then(()=>{captureStatus.state='ready';
        if(recorder.onstop)recorder.onstop();else recorder.release();
      },error=>{captureStatus.state='error';recorder.onerror?.({error});});
      return;
    }
    captureStatus.state='ready';
    // Discarded takes have no onstop handler; release raw blocks immediately.
    if(recorder.onstop)recorder.onstop();else recorder.release();
  }
  function fail(error) {
    if (finished) return;
    finished = true; recorder.state='inactive'; dispose();captureStatus.state='error';
    recorder.chunks=[];
    if(longSessionSink)void longSessionSink.finish(true).catch(()=>{});
    recorder.onerror?.({error});
  }
  worklet.port.onmessage = event => {
    if (finished) return;
    const payload = event.data;
    if(payload?.kind === 'chunk') {
      if (!(payload.data instanceof ArrayBuffer) || payload.data.byteLength!==8192*8 || !Number.isInteger(payload.frames) || payload.frames<1 || payload.frames>8192) {
        fail(Error('Malformed PCM chunk.'));return;
      }
      // Allocate retained take storage on the main thread, return the reusable
      // transfer block. The audio process() never allocates a replacement block.
      const pcm=payload.data.slice(0,payload.frames*8);
      if(longSessionSink){try{longSessionSink.append(pcm,payload.frames);}catch(error){fail(error);return;}}
      else recorder.chunks.push(pcm);
      worklet.port.postMessage({kind:'recycle',data:payload.data},[payload.data]);
      recorder.frames+=payload.frames;recorder.firstFrame=payload.firstFrame;recorder.frameGaps=payload.frameGaps;recorder.firstGapFrame=payload.firstGapFrame;recorder.gaps=payload.gaps;recorder.missingFrames=payload.missingFrames;recorder.overlapFrames=payload.overlapFrames;
      Object.assign(captureStatus,{frames:recorder.frames,firstFrame:payload.firstFrame,lastFrame:payload.lastFrame,frameGaps:payload.frameGaps,missingFrames:payload.missingFrames,overlapFrames:payload.overlapFrames});
    } else if(payload?.kind==='error'){fail(Error(payload.message));}
    else if (payload?.kind === 'done') {recorder.timelineEvents=Array.isArray(payload.timelineEvents)?payload.timelineEvents:[];recorder.timelineOverflow=!!payload.timelineOverflow;recorder.missingFrames=payload.missingFrames;recorder.overlapFrames=payload.overlapFrames;recorder.frameGaps=payload.frameGaps;Object.assign(captureStatus,{firstFrame:payload.firstFrame,lastFrame:payload.lastFrame,frameGaps:payload.frameGaps,missingFrames:payload.missingFrames,overlapFrames:payload.overlapFrames});finish();}
  };
  worklet.onprocessorerror = () => fail(Error('AudioWorklet PCM capture stopped unexpectedly.'));
  // perf2/A1: spare transfer blocks are allocated HERE (main thread) and handed over through the existing
  // 'recycle' protocol, so the worklet constructor keeps its original 8-block pool (no render-thread allocation).
  try{for(let k=0;k<24;k++){const spare=new ArrayBuffer(8192*8);worklet.port.postMessage({kind:'recycle',data:spare},[spare]);}}catch{}
  return recorder;
}

// Shared codec-free recorder export/Forge bridge; serialize cooperatively.
// Crop is frame-indexed and does not quantize, normalize, resample or remix stereo.
async function __xenRecorderFloatWav(left,right,rate,cancelled=()=>false){
 if(left.length!==right.length||!left.length||left.length*8>0xffffffff-36)throw Error('Invalid Float32 WAV size');
 const header=new ArrayBuffer(44),v=new DataView(header),bytes=left.length*8;
 const tag=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i))};
 tag(0,'RIFF');v.setUint32(4,bytes+36,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);
 v.setUint16(20,3,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint32(28,rate*8,true);
 v.setUint16(32,8,true);v.setUint16(34,32,true);tag(36,'data');v.setUint32(40,bytes,true);
 const parts=[header];
 for(let start=0;start<left.length;start+=16384){
  if(cancelled())throw Error('Recording changed while exporting');
  const n=Math.min(16384,left.length-start),block=new ArrayBuffer(n*8),data=new DataView(block);
  for(let i=0;i<n;i++){data.setFloat32(i*8,left[start+i],true);data.setFloat32(i*8+4,right[start+i],true)}
  parts.push(block);await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(cancelled())throw Error('Recording changed while exporting');
 return new Blob(parts,{type:'audio/wav'});
}
