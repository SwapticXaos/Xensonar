/* The workshop owns Fractalia synthesis. Live destinations receive its PCM,
   never a generic carrier pattern pretending to reproduce the hybrid sound. */
const __FractaliaLiveTransfer=(()=>{
 const machineId='fractalia-self-carrier';
 function plan({targetId}){
  const destination=eze(targetId),contract=destination&&FK({machineId,destination});if(!contract)return null;
  const root=targetId==='root-follow-export',pink=targetId==='melodic-pink-export';
  return {machineId,targetId,destination,contract:{...contract,signalKind:'raw-audio-body',defaultElasticity:root||pink?'raw-granular-elastic':'fixed-rendered-audio',allowedElasticities:root||pink?['raw-granular-elastic','raw-tape-coupled']:['fixed-rendered-audio'],defaultIsTimeElastic:root||pink,canChooseElasticity:root||pink,summary:'Fractalia is computed in the workshop and played as rendered audio.'},
   materialEntryKind:'carrier-rendered-material',renderSource:'fractalia-rendered-pcm',rootFollowConfigKind:root?'material-flowing':'none',melodicHandoffKind:pink?'raw-material':'none',usesAudioPaintImportDetail:false,clearsAudioPaintPendingHandoff:pink,clearsRawMaterialPendingHandoff:false,
   sourceVersion:'xensonar-fractalia-rendered-live-f432',renderModePrefix:'carrier-integral-rendered-material-fractalia',stableIdPrefix:'fractalia-rendered-live',workspaceOrigin:'spectralforge-carrier-integral-rendered-material',projectionMode:'grained',rootFollowMembershipConfig:root?'material-flowing':'none',requiresAudibleRenderedBody:true,
   summary:'Fractalia · prepared audio body for live playback',guardrail:'Keep the heard donor/Fractalia PCM. Never replace it with generic synthetic carrier events.'};
 }
 function prepare(request,executionPlan){
  const material=request.snapshot.materialExport,durationSec=Zp(material.bars,request.previewBpm??material.bpm,material.beatsPerBar),spectralData=TR(request.snapshot,{widthMode:'legacy-fixed-width'});
  return {executionPlan:{...executionPlan,durationSec,renderBodyCacheEnabled:false},spectralData,activeHarmonicXplore:null,
   // 55 Hz is the existing sample-playback reference, not a measured donor F0.
   // The complete phrase already contains the Carrier's pitches and timing.
   artifact:{ok:true,config:null,baseHz:55,durationSec,previewDurationSec:durationSec,reason:'Prepared Fractalia audio; no live synthesis plan.',noteCount:0,trackCount:0,branchALineTrafficCount:0,b573WindowCount:0,intervalWindowCount:0}};
 }
 async function render(request,context){
  if(request.snapshot.fractaliaInstrument?.donor)await __f3562EnsureDonor();
  const epoch=__f333Epoch,revision=pe.getState().renderVersion,donorKey=request.snapshot.fractaliaInstrument?.donor?fractaliaDonorSnapshot().key:null;
  const valid=()=>{if(epoch!==__f333Epoch||revision!==pe.getState().renderVersion||donorKey!==null&&donorKey!==fractaliaDonorSnapshot().key)throw new DOMException('Fractalia transfer changed during preparation','AbortError')};valid();
  const heard=await __f333RenderHearing(OB({projectName:request.entry.name,snapshot:request.snapshot,machineId,valueSource:request.valueSource,
   selection:request.selectionOverride??request.snapshot.carrierIntegralSelection,synthLab:context.executionPlan.activeSynthLab,harmonicXplore:request.harmonicXploreOverride??request.snapshot.carrierIntegralHarmonicXplore,
   previewBpm:request.previewBpm??request.snapshot.materialExport.bpm,previewPitchSemitones:request.previewPitchSemitones??0,previewGain:1,loopPreview:true,onRenderProgress:request.onRenderProgress}));valid();
  const gain=context.executionPlan.previewGain;let buffer=heard.buffer;
  if(gain!==1){buffer=xt.getContext().createBuffer(heard.buffer.numberOfChannels,heard.buffer.length,heard.buffer.sampleRate);for(let ch=0;ch<buffer.numberOfChannels;ch++){const src=heard.buffer.getChannelData(ch),dst=buffer.getChannelData(ch);for(let i=0;i<src.length;i++)dst[i]=src[i]*gain}}
  valid();return {buffer,audioIdentityKey:da(JSON.stringify(['fractalia-rendered-live-f432',heard.cacheKey,gain])),audioIdentitySource:'fractalia-workshop-pcm'};
 }
 return {plan,prepare,render};
})();
