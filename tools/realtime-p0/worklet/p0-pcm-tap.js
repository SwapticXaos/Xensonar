import {P0_TAP_PROTOCOL as PROTOCOL,P0_TAP_POOL_BUFFERS as CAPACITY,P0_TAP_FRAMES_PER_BUFFER as BLOCK,P0_TAP_BYTES as BYTES,P0_TAP_MAX_SECONDS,safeInteger,validRate} from '../web/p0-pcm-contract.js';
// Slots are unavailable, available, current, or in flight. Only a matching loan
// can return an in-flight slot. No allocation of PCM/views occurs in process().
const AVAILABLE=1,CURRENT=2,IN_FLIGHT=3;
class XensonarP0PcmTapProcessor extends AudioWorkletProcessor {
  constructor(options){
    super();const o=options?.processorOptions??{};
    if(typeof o.sessionId!=='string'||typeof o.engineEpoch!=='string'||!safeInteger(o.ownerEpoch,1,0xffffffff)||!validRate(sampleRate))throw new Error('PCM tap scope/rate unsupported');
    this.scope={sessionId:o.sessionId,engineEpoch:o.engineEpoch,ownerEpoch:o.ownerEpoch};
    this.monitorOnly=o.monitorOnly===true;
    this.slots=Array(CAPACITY).fill(null);this.initialized=false;this.poolSize=0;this.current=-1;this.capture=null;this.lastCaptureId=0;
    this.port.onmessage=ev=>this.onMessage(ev.data);
    this.post({kind:'tap-ready',frame:currentFrame,sampleRate,poolBuffers:CAPACITY,framesPerBuffer:BLOCK});
  }
  packet(m){return {...m,...this.scope,protocol:PROTOCOL};}
  post(m){this.port.postMessage(this.packet(m));}
  matches(m){return m?.protocol===PROTOCOL&&m.sessionId===this.scope.sessionId&&m.engineEpoch===this.scope.engineEpoch&&m.ownerEpoch===this.scope.ownerEpoch;}
  available(){let n=0;for(let i=0;i<this.poolSize;i++)if(this.slots[i].state===AVAILABLE)n++;return n;}
  onMessage(m){
    if(!this.matches(m))return;
    if(m.kind==='pool-init'){
      if(this.initialized||!Array.isArray(m.buffers)||m.buffers.length<1||m.buffers.length>CAPACITY)return;
      for(let i=0;i<m.buffers.length;i++){
        const x=m.buffers[i];if(x?.bufferId!==i||!(x.buffer instanceof ArrayBuffer)||x.buffer.byteLength!==BYTES)return;
        for(let j=0;j<i;j++)if(m.buffers[j].buffer===x.buffer)return;
      }
      this.poolSize=m.buffers.length;
      for(let i=0;i<this.poolSize;i++){
        const b=m.buffers[i].buffer;
        this.slots[i]={state:AVAILABLE,generation:0,view:new Float32Array(b),writeFrames:0,firstFrame:0,transfer:[b],message:this.packet({kind:'pcm-chunk',bufferId:i,bufferGeneration:0,captureId:0,sequence:0,firstFrame:0,frames:0,sampleRate,channels:2,buffer:b})};
      }
      this.initialized=true;this.post({kind:'pool-status',initialized:true,poolSize:this.poolSize,available:this.available(),frame:currentFrame});return;
    }
    if(m.kind==='buffer-return'){
      if(!safeInteger(m.bufferId,0,this.poolSize-1)||!safeInteger(m.bufferGeneration,1))return;
      const s=this.slots[m.bufferId];
      if(s.state!==IN_FLIGHT||s.generation!==m.bufferGeneration||!(m.buffer instanceof ArrayBuffer)||m.buffer.byteLength!==BYTES)return;
      s.view=new Float32Array(m.buffer);s.transfer[0]=m.buffer;s.message.buffer=m.buffer;s.state=AVAILABLE;return;
    }
    if(m.kind==='capture-start'){
      let reason=null;
      if(!this.initialized)reason='pool-not-ready';else if(this.capture)reason='capture-busy';
      else if(!safeInteger(m.captureId,1)||m.captureId<=this.lastCaptureId)reason='capture-id';
      else if(!safeInteger(m.startFrame,currentFrame,currentFrame+sampleRate*2)||!safeInteger(m.frameCount,1,sampleRate*P0_TAP_MAX_SECONDS)||!safeInteger(m.startFrame+m.frameCount))reason='capture-range';
      if(reason){this.post({kind:'capture-rejected',captureId:m.captureId,reason,frame:currentFrame});return;}
      this.lastCaptureId=m.captureId;
      this.capture={captureId:m.captureId,startFrame:m.startFrame,endFrame:m.startFrame+m.frameCount,expectedFrames:m.frameCount,nextFrame:m.startFrame,
        capturedFrames:0,poolDroppedFrames:0,timelineGapFrames:0,timelineOverlapFrames:0,formatErrorFrames:0,nonfiniteFrames:0,chunks:0,aborted:false,
        endMessage:this.packet({kind:'capture-end',captureId:m.captureId,startFrame:m.startFrame,endFrame:m.startFrame+m.frameCount,expectedFrames:m.frameCount,sampleRate,channels:2})};
      this.current=-1;this.post({kind:'capture-armed',captureId:m.captureId,startFrame:m.startFrame,endFrame:m.startFrame+m.frameCount,expectedFrames:m.frameCount,sampleRate,channels:2,poolSize:this.poolSize,available:this.available(),frame:currentFrame});return;
    }
    if(m.kind==='capture-stop'&&this.capture?.captureId===m.captureId){this.capture.aborted=true;this.finishCapture();}
  }
  acquire(frame){
    if(this.current>=0)return true;
    for(let i=0;i<this.poolSize;i++)if(this.slots[i].state===AVAILABLE){const s=this.slots[i];s.state=CURRENT;s.writeFrames=0;s.firstFrame=frame;this.current=i;return true;}
    return false;
  }
  flushChunk(){
    if(this.current<0||!this.capture)return;
    const s=this.slots[this.current],c=this.capture;this.current=-1;
    if(!s.writeFrames){s.state=AVAILABLE;return;}
    c.chunks++;c.capturedFrames+=s.writeFrames;s.generation++;s.state=IN_FLIGHT;
    const m=s.message;m.bufferGeneration=s.generation;m.captureId=c.captureId;m.sequence=c.chunks;m.firstFrame=s.firstFrame;m.frames=s.writeFrames;
    this.port.postMessage(m,s.transfer);s.view=null;
  }
  finishCapture(){
    const c=this.capture;if(!c)return;this.flushChunk();this.capture=null;
    const m=c.endMessage;m.capturedFrames=c.capturedFrames;m.poolDroppedFrames=c.poolDroppedFrames;m.timelineGapFrames=c.timelineGapFrames;
    m.droppedFrames=c.poolDroppedFrames+c.timelineGapFrames;m.timelineOverlapFrames=c.timelineOverlapFrames;m.formatErrorFrames=c.formatErrorFrames;m.nonfiniteFrames=c.nonfiniteFrames;
    m.chunks=c.chunks;m.aborted=c.aborted;m.frame=currentFrame;this.port.postMessage(m);
  }
  process(inputs,outputs){
    const input=inputs[0],output=outputs[0];const frames=output?.[0]?.length??input?.[0]?.length??0;
    if(output)for(let c=0;c<output.length;c++){const source=input?.[Math.min(c,(input?.length??1)-1)];if(!this.monitorOnly&&source?.length===frames)output[c].set(source);else output[c].fill(0);}
    const cap=this.capture;if(!cap||!frames)return true;
    const blockEnd=currentFrame+frames;
    if(blockEnd<=cap.startFrame)return true;
    if(currentFrame>cap.nextFrame){this.flushChunk();const gap=Math.max(0,Math.min(currentFrame,cap.endFrame)-cap.nextFrame);cap.timelineGapFrames+=gap;cap.nextFrame+=gap;}
    if(currentFrame<cap.nextFrame&&currentFrame>=cap.startFrame)cap.timelineOverlapFrames+=Math.max(0,Math.min(blockEnd,cap.nextFrame)-currentFrame);
    const first=Math.max(currentFrame,cap.nextFrame,cap.startFrame),last=Math.min(blockEnd,cap.endFrame);
    const formatOk=input?.length===2&&input[0].length===frames&&input[1].length===frames;
    for(let frame=first;frame<last;frame++){
      const i=frame-currentFrame,l=input?.[0]?.[i]??0,r=input?.[1]?.[i]??l;
      if(!formatOk)cap.formatErrorFrames++;
      if(!Number.isFinite(l)||!Number.isFinite(r))cap.nonfiniteFrames++;
      if(!this.acquire(frame)){cap.poolDroppedFrames++;continue;}
      const s=this.slots[this.current],j=s.writeFrames*2;s.view[j]=l;s.view[j+1]=r;s.writeFrames++;
      if(s.writeFrames===BLOCK)this.flushChunk();
    }
    cap.nextFrame=Math.max(cap.nextFrame,last);
    if(blockEnd>=cap.endFrame)this.finishCapture();return true;
  }
}
registerProcessor('xensonar-p0-pcm-tap',XensonarP0PcmTapProcessor);
