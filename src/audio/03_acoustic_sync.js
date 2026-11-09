/* Ω1-G Acoustic diagnostic sync (control/export plane only).
 * Marker code is stamped into TRANSIENT FLAC encoder PCM copies; no audio graph,
 * worklet, render callback, source AudioBuffer, or instrument export is changed.
 * Correlation identifies the exact position IN THE FLAC, not an exact original
 * user-input-to-MediaRecorder clock correspondence (codec latency is unknown). */
const f319AcousticVersion='xensonar-acoustic-sync-v1';
const f319AcousticFrames=1536; // three 320-frame chirr blocks, at frames 0,512,1024
function f319AcousticCode(frame) {
  const block=Math.floor(frame/512),position=frame%512;
  if(block>2||position>=320||frame<0)return 0;
  let code=(Math.floor(position/4)+1)*0x9e3779b9 ^ 0x6a09e667;
  code^=code>>>16;code=Math.imul(code,0x7feb352d);code^=code>>>15;
  code=Math.imul(code,0x846ca68b);code^=code>>>16;
  const taper=Math.sin(Math.PI*(position+.5)/320)**2;
  return (block===1?-1:1)*(code&1?1:-1)*taper*.075;
}
function f319AcousticPlan(buffer,range,markers=[]) {
  const sampleRate=buffer.sampleRate,fullFrames=buffer.length;
  const start=range?Math.max(0,Math.min(fullFrames,Math.floor(range.startMs*sampleRate/1e3))):0;
  const end=range?Math.max(start,Math.min(fullFrames,Math.ceil(range.endMs*sampleRate/1e3))):fullFrames;
  const stamps=[],skipped=[];
  const items=Array.isArray(markers)?markers.slice(0,128):[];
  for(const marker of items){
    const fullIndex=Math.round(Number(marker.timeMs)*sampleRate/1000),sampleIndex=fullIndex-start;
    const id=String(marker.id||'unknown');
    let reason=null;
    if(!Number.isFinite(fullIndex)||!Number.isInteger(fullIndex))reason='invalid-offset';
    else if(sampleIndex<0||sampleIndex>=end-start)reason='outside-crop';
    else if(sampleIndex+f319AcousticFrames>end-start)reason='not-enough-frames';
    else if(stamps.some(p=>Math.abs(p.sampleIndex-sampleIndex)<f319AcousticFrames+384))reason='markers-too-close';
    if(reason){skipped.push({id,timeMs:marker.timeMs,reason});continue;}
    stamps.push({id,timeMs:marker.timeMs,sampleIndex,originalSampleIndex:fullIndex});
  }
  return {schema:f319AcousticVersion,sampleRate,frames:end-start,fullFrames,cropStartSample:start,
    patternFrames:f319AcousticFrames,channelEncoding:'opposite-polarity-stereo',maxPeak:.075,
    stampMethod:'offline-flac-pcm-only',stamps,skipped,
    originalInputTiming:'approximate relative to MediaRecorder startup; encoded PCM offset is exact'};
}
function f319AcousticStampBlock(left,right,offset,stamps) {
  // This function runs only on temporary FLAC encoder copies, never during live playback.
  for(const marker of stamps){
    const lo=Math.max(offset,marker.sampleIndex),hi=Math.min(offset+left.length,marker.sampleIndex+f319AcousticFrames);
    for(let pos=lo;pos<hi;pos++){
      const value=f319AcousticCode(pos-marker.sampleIndex),i=pos-offset;
      left[i]=Math.max(-1,Math.min(1,left[i]+value));
      right[i]=Math.max(-1,Math.min(1,right[i]-value));
    }
  }
}
const __XenAcousticSync=(()=>{
  const maxMarkers=64,maxAnchors=64,maxSnapshots=16,maxExports=8;
  let take=null,sequence=0;const markers=[],anchors=[],snapshots=[],exports=[];
  const clock=()=>typeof performance!=='undefined'?performance.now():Date.now();
  const cap=(arr,n)=>{while(arr.length>n)arr.shift()};
  const schedule=entry=>{
    const takeId=take?.id;
    // Delay heavy trace reading until AFTER the 5-second post-marker window.
    const timer=()=>{
      const run=()=>{
        if(takeId!==take?.id)return;
        try{
          const from=entry.perfMs-15000,to=entry.perfMs+5000;
          const pressure=typeof Gz==='function'?Gz(28000):null;
          const sounds=typeof __XenSoundTrace!=='undefined'?__XenSoundTrace.read():null;
          const admission=typeof __XenAudioProbe!=='undefined'?__XenAudioProbe.read():null;
          const runtime=typeof ki!=='undefined'?ki.events:null;
          snapshots.push({id:entry.id,recordingId:entry.recordingId??null,source:entry.source,
            eventPerfMs:entry.perfMs,windowStartPerfMs:from,windowEndPerfMs:to,
            capturedPerfMs:clock(),windowComplete:clock()>=to,
            pressure:pressure?{bucketMs:pressure.bucketMs,points:pressure.points.filter(p=>p.startMs>=from&&p.startMs<=to).slice(-100)}:null,
            sourceEvents:sounds?.events?.filter(e=>e.perfMs>=from&&e.perfMs<=to).slice(-250)??[],
            admissionEvents:admission?.records?.filter(e=>e.atMs>=from&&e.atMs<=to).slice(-250)??[],
            runtimeEvents:runtime?.filter(e=>e.perfMs>=from&&e.perfMs<=to).slice(-180)??[]});
          cap(snapshots,maxSnapshots);
        }catch(error){snapshots.push({id:entry.id,error:String(error)});cap(snapshots,maxSnapshots);}
      };
      if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1000});
      else setTimeout(run,0);
    };
    setTimeout(timer,5200);
  };
  const api={
    get activeRecordingId(){return take?.id??null;},
    begin({startedPerfMs,sourceMode}){
      take={id:`xen-take-${Date.now()}-${++sequence}`,startedPerfMs:Number(startedPerfMs),
        startedEpochMs:Date.now(),sourceMode,clockBasis:'performance.now',recorderKind:'MediaRecorder'};
      markers.length=0;anchors.length=0;snapshots.length=0;exports.length=0;
      return take.id;
    },
    discard(){take=null;markers.length=0;anchors.length=0;snapshots.length=0;exports.length=0;},
    record(marker,source){
      if(!take||!marker)return null;
      const entry={recordingId:take.id,id:String(marker.id),source:source??'recorder',timeMs:marker.timeMs,
        perfMs:Number.isFinite(marker.perfMs)?marker.perfMs:clock(),epochMs:marker.epochMs??Date.now(),
        diagnosticClass:'user-supplied-marker-not-automatic-dropout'};
      markers.push(entry);cap(markers,maxMarkers);schedule(entry);return entry;
    },
    runtimeAnchor(detail={},recorded=null){
      const entry=recorded??{id:`runtime-only-${++sequence}`,source:detail.source??'f8',perfMs:detail.perfNowMs??clock(),
        epochMs:Date.now(),recordingId:null,timeMs:null};
      anchors.push({id:entry.id,recordingId:entry.recordingId??null,source:detail.source??'f8',
        perfMs:detail.perfNowMs??entry.perfMs,audioNowSec:detail.audioNowSec??null,
        room:detail.room??null,recordingTimeMs:entry.timeMs??null});
      cap(anchors,maxAnchors);
      if(!recorded)schedule(entry);
      return entry;
    },
    resolved(buffer,recordedMarkers){
      if(!take||!buffer)return;
      take.decodedSampleRate=buffer.sampleRate;take.decodedFrames=buffer.length;
      const plan=f319AcousticPlan(buffer,null,recordedMarkers);
      for(const entry of markers){const matched=plan.stamps.find(v=>v.id===entry.id);
        entry.previewSampleIndex=matched?.sampleIndex??null;
        entry.previewSampleOffsetMethod='derived from user input relative to recorder startup; approximate';}
    },
    exported({filename,plan,format='flac'}){
      exports.push({recordingId:take?.id??null,filename,format,createdIso:new Date().toISOString(),
        stamped:plan.stamped===true,bitDepth:16,stamps:plan.stamps.map(m=>({...m})),skipped:plan.skipped.map(m=>({...m})),
        sampleRate:plan.sampleRate,cropStartSample:plan.cropStartSample,frames:plan.frames,
        patternFrames:plan.patternFrames,patternVersion:plan.schema});cap(exports,maxExports);
    },
    read(){return{schema:f319AcousticVersion,take:take?{...take}:null,
      markers:markers.map(v=>({...v})),runtimeAnchors:anchors.map(v=>({...v})),
      exports:exports.map(v=>({...v,stamps:v.stamps.map(x=>({...x})),skipped:v.skipped.map(x=>({...x}))})),
      snapshots:snapshots.slice(),limits:{markers:maxMarkers,snapshots:maxSnapshots,exports:maxExports},
      notice:'Exact fingerprint position in exported FLAC; user click/audio origin has uncalibrated MediaRecorder latency. PCM is never part of Runtime ZIP.'};}
  };
  return Object.freeze(api);
})();
if(typeof globalThis!=='undefined')globalThis.XenSonarAcousticSync=__XenAcousticSync;
