/* The score belongs to the painted carrier, not to a machine's compressed
   listening recipe. This module does no playback and mutates no workspace. */
function __xenBasicCarrierTimbre(){
 return {schemaVersion:'carrier-integral-timbre-v1',presetId:'basic-carrier',paramsHash:'basic-carrier-v1',
  oscillators:[{type:'sine',gain:.34,freqMul:1,detune:0},{type:'triangle',gain:.12,freqMul:1,detune:0}],
  filterType:'lowpass',filterFrequency:7200,filterQ:.7,attackScale:.012,releaseScale:.045,
  transientGain:0,drive:0,panSpread:0};
}
function __xenCarrierAbsoluteHz(pattern,note){
 const hz=Number.isFinite(note.lineHz)&&note.lineHz>0?note.lineHz:pattern.baseHz||110;
 return hz*Math.pow(pattern.repetitionModel==='tritave'?3:2,note.octaveOffset||0);
}
function __xenCarrierTraceField(points,centerLog){
 const count=Math.max(64,Math.min(512,points.length)),curve=[];
 for(let i=0;i<count;i++){
  const at=i/(count-1)*Math.max(0,points.length-1),left=Math.floor(at),right=Math.min(points.length-1,left+1);
  const log=points[left].log+(points[right].log-points[left].log)*(at-left);
  curve.push(Math.max(-1,Math.min(1,log-centerLog)));
 }
 const pitch=T_(curve);
 return {id:'carrier-geometry-pitch',geometryKind:'linear-strip',interpreterKind:'pitch-elastic',enabled:true,bypassed:false,
  referenceLevel:0,range:{startRatio:0,endRatio:1},edgeHandles:{...pitch.edgeHandles},baseCurve:{kind:'smooth'},
  deformation:{...pitch.deformation},targetSlots:{'pitch-elastic':pitch}};
}
function __xenCompileCarrierGeometry(grid,options={}){
 const bars=Math.max(1,Math.round(options.bars||1)),beatsPerBar=Math.max(1,Math.round(options.beatsPerBar||4));
 const totalBeats=bars*beatsPerBar,bpm=Math.max(1,Number(options.bpm)||108),durationSec=totalBeats*60/bpm;
 const empty=reason=>({config:null,summary:{version:1,sourceVoiceCount:0,noteCount:0,reason}});
 if(!grid||!(grid.width>0)||!(grid.height>1))return empty('No current carrier geometry is available.');
 // IR's default is a six-peak listening analysis. Export must not inherit it.
 const skeleton=IR(grid,durationSec,{maxAnchorsPerFrame:grid.height,minPeakAmplitude:.000001,
  verticalSmoothingRadius:0,minPeakDistanceBins:1});
 const traces=[],active=new Map();let serial=0,maxPolyphony=0,sampleCount=0;
 for(let x=0;x<grid.width;x++){
  const peaks=(skeleton.anchorsByTime[x]||[]).filter(p=>Number.isFinite(p.centerHz)&&p.centerHz>0&&p.energy>0);
  maxPolyphony=Math.max(maxPolyphony,peaks.length);sampleCount+=peaks.length;
  if(peaks.length>256||sampleCount>2000000)return empty('Carrier geometry exceeds the transfer budget; use a shorter selection or Raw Audio. No voices were silently removed.');
  const used=new Set(),assigned=new Set(),candidates=[];
  // Verified note metadata retains true unisons and identities through crossings.
  for(let i=0;i<peaks.length;i++){
   const p=peaks[i];if(!p.voiceId)continue;
   const key=String(p.trackId||'')+'\0'+p.voiceId,previous=active.get(key);
   const trace=previous&&previous.lastX===x-1?previous:{id:'carrier-voice-'+serial++,key,points:[]};
   if(!previous||trace!==previous)traces.push(trace);
   trace.points.push({x,log:Math.log2(p.centerHz),bin:p.centerBin,energy:p.energy});trace.lastX=x;active.set(key,trace);
   used.add(trace);assigned.add(i);
  }
  const previous=traces.filter(t=>t.lastX===x-1&&!t.key);
  for(let i=0;i<peaks.length;i++)if(!assigned.has(i))for(const trace of previous){
   const last=trace.points[trace.points.length-1],before=trace.points[trace.points.length-2];
   const predicted=last.bin+(before?last.bin-before.bin:0),distance=Math.abs(predicted-peaks[i].centerBin);
   if(distance<=Math.max(4,grid.height*.025))candidates.push({i,trace,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance||a.i-b.i||a.trace.id.localeCompare(b.trace.id));
  const append=(trace,p)=>{trace.points.push({x,log:Math.log2(p.centerHz),bin:p.centerBin,energy:p.energy});trace.lastX=x;used.add(trace)};
  for(const candidate of candidates)if(!assigned.has(candidate.i)&&!used.has(candidate.trace)){
   append(candidate.trace,peaks[candidate.i]);assigned.add(candidate.i);
  }
  for(let i=0;i<peaks.length;i++)if(!assigned.has(i)){
   const trace={id:'carrier-voice-'+serial++,points:[]};traces.push(trace);append(trace,peaks[i]);
  }
 }
 if(!traces.length)return empty('The current carrier has no painted voices. Raw Audio remains available.');
 const pitchRatio=Number.isFinite(options.pitchRatio)&&options.pitchRatio>0?options.pitchRatio:1,notes=[];
 for(const trace of traces){
  let chunk=[],min=Infinity,max=-Infinity;
  const flush=()=>{
   if(!chunk.length)return;
   const center=(min+max)/2,first=chunk[0],last=chunk[chunk.length-1];
   notes.push({id:trace.id+'-'+first.x,sourceVoiceId:trace.id,carrierGeometryVersion:1,trackId:'carrier-geometry',
    startBeat:first.x/grid.width*totalBeats,durationBeats:(last.x+1-first.x)/grid.width*totalBeats,
    lineHz:Math.pow(2,center)*pitchRatio,anchorHz:Math.pow(2,center)*pitchRatio,
    channelIndex:0,octaveOffset:0,velocity:Math.max(...chunk.map(p=>p.energy)),gate:1,
    noteClass:'standard',renderSourceKind:'synth-live',fadeInBeats:0,fadeOutBeats:0,
    localField:__xenCarrierTraceField(chunk,center)});
   chunk=[];min=Infinity;max=-Infinity;
  };
  for(const point of trace.points){
   // Existing LocalFields encode ±12 semitones. Split wider curves, never clamp away their melody.
   if(chunk.length&&(Math.max(max,point.log)-Math.min(min,point.log)>2||chunk.length>=512))flush();
   chunk.push(point);min=Math.min(min,point.log);max=Math.max(max,point.log);
  }
  flush();
 }
 if(notes.length>16384)return empty('Carrier geometry has too many separate events for this transfer. Raw Audio remains available.');
 const baseHz=Number.isFinite(options.baseHz)&&options.baseHz>0?options.baseHz:110,timbre=__xenBasicCarrierTimbre();
 return {config:{sourceKind:'synth',carrierGeometryVersion:1,renderMode:'direct',anchorGridStep:null,
  pitchIdentity:{version:1,reference:'free',pitchConstraint:'continuous'},
  synthPattern:{bars,beatsPerBar,stepsPerBar:16,segmentCount:4,baseHz,tuning:'floating-frequency',repetitionModel:'frequency-ratio',
   activeTrackIds:['carrier-geometry'],tracks:[{id:'carrier-geometry',label:'Carrier Geometry',color:'#f472b6',enabled:true,volume:.8,pan:0,instrumentPreset:'glassPad'}],notes},
  synthPatch:{baseHz,compositionPresetId:'carrier-geometry-basic',carrierIntegralTimbre:timbre,trackPatches:[{id:'carrier-geometry',instrumentPreset:'glassPad',enabled:true,volume:.8,pan:0}]},formantWindowPlan:null},
  summary:{version:1,sourceVoiceCount:traces.length,maxPolyphony,noteCount:notes.length,sampleCount,reason:null}};
}
