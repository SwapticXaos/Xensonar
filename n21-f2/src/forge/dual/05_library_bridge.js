

/* F3.56.38: rehydrate the original Material Intake audio contract at the library boundary.
 * Previously saved F3.56.36/37 hybrid records lack waveformPreview and kind. They must
 * not be deleted, silently ignored, or rendered as if those fields existed. */
const __F35638DonorBridge=(()=>{
 const library=__DonorLibraryF36.donorLibrary;
 const originalLoad=library.load.bind(library);
 function asset(raw){
  const pcm=raw?.monoSamples?.length?raw.monoSamples:raw?.leftSamples;
  if(!(pcm?.length>0)||!(raw.sampleRate>=8000))throw Error('Saved donor is missing readable PCM.');
  const preview=raw.waveformPreview?.length?raw.waveformPreview:E4e(pcm,1024);
  const stereo=raw.stereoWidthPreview?.length?raw.stereoWidthPreview:new Float32Array(preview.length);
  return {...raw,kind:'audio',channelCount:raw.channelCount??raw.numberOfChannels??1,
   originalDuration:raw.originalDuration??pcm.length/raw.sampleRate,
   importStartSec:raw.importStartSec??0,importDurationSec:raw.importDurationSec??pcm.length/raw.sampleRate,
   waveformPreview:preview,stereoWidthPreview:stereo};
 }
 function entryFromAsset(raw,name,selection=null){
  const clean=asset(raw),duration=clean.originalDuration;
  // Legacy F3.56.36/37 hybrids saved only fineLoopRange. The normal Material Intake
  // navigator also requires detailViewport; lacking it could crash React render.
  const limit=(value,fallback)=>Number.isFinite(value)?Math.max(0,Math.min(duration,value)):fallback;
  const view=selection?.detailViewport??{startSec:0,durationSec:duration};
  const mask=selection?.fineLoopRange??{startSec:0,durationSec:duration};
  const from=limit(mask.startSec,0),to=Math.max(0.025,Math.min(duration-from,limit(mask.durationSec,duration)));
  const viewStart=limit(view.startSec,0),viewDuration=Math.max(0.025,Math.min(duration-viewStart,limit(view.durationSec,duration)));
  return {source:{id:clean.id||'dual-hybrid',kind:'audio',label:name||clean.fileName||'Hybrid donor',
   durationSec:duration,waveformPreview:clean.waveformPreview,sourceAsset:clean},
   selection:{...selection,detailViewport:{startSec:viewStart,durationSec:viewDuration},fineLoopRange:{startSec:from,durationSec:to}},
   readMode:'hybrid',sourceAdapterId:'local-file'};
 }
 library.load=async id=>{
  const entry=await originalLoad(id),prepared=entryFromAsset(entry.source?.sourceAsset,
   entry.source?.label||entry.name,entry.selection);
  return {...entry,source:{...entry.source,...prepared.source},selection:prepared.selection,
   sourceAdapterId:entry.sourceAdapterId==='dual-donor-spectral'?'local-file':entry.sourceAdapterId??'local-file'};
 };
 // The originating library functions remain responsible for persistence and validation.
 // Normalization is a read-only compatibility projection, not an automatic migration.
 return Object.freeze({asset,entryFromAsset});
})();