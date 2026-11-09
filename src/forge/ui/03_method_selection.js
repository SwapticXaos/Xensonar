

/* F3.56.45: display-only grouping. Internal preset ids, recipe values and DSP stay unchanged. */
const __f35645PairedMethods=Object.freeze(['gestalt-articulation','gestalt-imprint','gestalt-motion','gestalt-weave','material-flow','signature-pilot','film','air','freeze','wander']);

/* xen-lazy:lab */

/* UI summary uses effective connection modes, never the new-link default mode. */

/* xen-lazy:lab */



/* xen-lazy:lab */

function __f3562EnsureDonor(){
 // The currently committed purple mask (or the last library donor) owns Donor preparation.
 // Deduplicate competing Play requests and allow cached exact-mask reuse in its resolver.
 if(__f3562EnsureDonor.inFlight)return __f3562EnsureDonor.inFlight;
 const pending=new Promise((resolve,reject)=>{
  const req={handled:false,resolve,reject};
  window.dispatchEvent(new CustomEvent('xensonar:forge:resolve-last-donor',{detail:req}));
  if(!req.handled){if(Vt.selectDonor())resolve({source:'prepared-runtime'});
   else reject(Error("Select a purple donor mask in Sound Material or load a donor from the library."));}
 });
 __f3562EnsureDonor.inFlight=pending;
 const release=()=>{if(__f3562EnsureDonor.inFlight===pending)__f3562EnsureDonor.inFlight=null;};
 pending.then(release,release);
 return pending;
}

/* xen-lazy:lab */

function eVe({compact=false}={}){
 const createSnapshot=pe(st=>st.createProjectSnapshot),projectName=pe(st=>st.materialExport.name);
 const [name,setName]=P.useState(projectName||"spectral-forge-project"),[saving,setSaving]=P.useState(false),[success,setSuccess]=P.useState(null),[error,setError]=P.useState(null);
 P.useEffect(()=>{projectName&&setName(projectName)},[projectName]);
 const save=async()=>{setSaving(true);setSuccess(null);setError(null);try{const entry=await X7({name,snapshot:createSnapshot()});setName(entry.name);setSuccess("Gesichert · "+entry.name)}catch(e){setError(e instanceof Error?e.message:"Project could not be saved")}finally{setSaving(false)}};
 return u.jsxs("section",{
  className:compact?"f33-project-save":"space-y-2 rounded border border-neutral-800 bg-black/20 p-2",
  "data-xensonar-project-library-save-only":"true","data-forge-project-save-in-rack":compact?"true":undefined,
  children:[u.jsxs("label",{className:compact?"f33-project-name-label":"block space-y-1 text-[11px] text-neutral-400",
   children:[u.jsx("span",{className:compact?"f33-project-name-text":"uppercase tracking-[0.2em] text-neutral-500",children:compact?"Project Name:":"Project Name"}),
    u.jsx("input",{value:name,onChange:e=>setName(e.currentTarget.value),"aria-label":"Project Name",className:compact?"f33-project-name-input":"w-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-neutral-100"})]}),
   u.jsx("button",{type:"button",disabled:saving,onClick:()=>void save(),"aria-label":"Save as New Project",className:compact?"f33-project-save-button":"w-full rounded border border-cyan-700/60 bg-cyan-950/30 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-900/30 disabled:opacity-50",children:compact?"Save":"Save as New Project"}),
   compact?u.jsx("div",{className:"f33-project-save-feedback",role:"status","aria-live":"polite",title:error||success||"",children:error?u.jsx("span",{className:"text-red-300",children:error}):success?u.jsx("span",{className:"text-emerald-200",children:success}):" "}):u.jsxs(P.Fragment,{children:[success?u.jsx("div",{className:"text-[10px] text-emerald-200",children:success}):null,error?u.jsx("div",{className:"text-[10px] text-red-200",children:error}):null]})]
 });
}

/* xen-lazy:lab */

function nVe(e){return e.trim().toLowerCase().replace(/[^a-z0-9-_]+/g,"-").replace(/^-+|-+$/g,"")||"source"}const rVe={id:"local-file",label:"Local File",canImportFile:!0,async loadFromFile(e){const t=await Cg(e);return{id:`local-${nVe(e.name)}-${Math.random().toString(36).slice(2,8)}`,label:e.name,kind:"audio",durationSec:t.originalDuration,waveformPreview:t.waveformPreview,sourceAsset:t,nativeAsset:e}}},aVe={id:"external-device-slot",label:"External Device Slot",unavailableReason:"The adapter slot is prepared, but this build is not yet connected to an external device."},oVe={id:"forge3-workbench",label:"Spectral Workbench",acceptsRawLoop:!1,acceptsAnalysisMeta:!0,acceptsSpectralProjection:!0,async commitLoop(e){const t=pe.getState();t.isPlaying&&(xt.stop(),t.setIsPlaying(!1),t.setPlayheadPosition(0),t.setShowPlayheadMarker(!1)),t.pushUndo();const n=sg(e.source.sourceAsset,e.selection.fineLoopRange),r=await PB(n,t.spectralData,{readMode:e.readMode}),a=await av({...n,projectionReadMode:e.readMode});t.setSourceAsset(a),t.setSourcePreviewMode("forge"),t.setAudioBufferDirty(!0),t.triggerRender(),t.updateMaterialExport({bpm:t.materialExport.bpm,bars:t.materialExport.bars}),window.dispatchEvent(new CustomEvent("xensonar:forge3-commit",{detail:{startSec:r.importStartSec,durationSec:r.importedDuration,readMode:e.readMode}}))}};function m$(e){const t=pe.getState(),n=e.selection.fineLoopRange,r=e.source.sourceAsset,a=Math.max(0,Math.floor(n.startSec*r.sampleRate)),o=Math.max(1,Math.min(r.monoSamples.length-a,Math.floor(Math.max(.05,n.durationSec)*r.sampleRate))),i=__XenForgeRawGain.apply(Float32Array.from(r.monoSamples.subarray(a,a+o)),e.source),s=(()=>{let peak=0;for(const sample of i)peak=Math.max(peak,Math.abs(sample));
 return peak>1&&globalThis.__XenWaveCoreW01?.exportWav?
  globalThis.__XenWaveCoreW01.exportWav({channels:[i],frames:i.length,sampleRate:r.sampleRate,selection:{start:0,end:i.length}},{format:'float32'}):
  xt.encodeSamplesToWAV(i,r.sampleRate)})(),l=t.materialExport,c=e.exportTitle?.trim()||l.name,d=o/Math.max(1,r.sampleRate),p=Yd({name:c,role:"loop",bpm:Number.isFinite(l.bars*(l.beatsPerBar||4)*60/Math.max(.001,d))?Math.max(1,Math.min(999,l.bars*(l.beatsPerBar||4)*60/Math.max(.001,d))):l.bpm,bars:l.bars,beatsPerBar:l.beatsPerBar,guideSegments:l.guideSegments,guideMarkers:l.guideMarkers,loopStartSec:0,loopEndSec:d,rootHz:__forgeMaterialRootHz(l.rootHz),sourceVersion:"xensonar-material-intake-v1",renderMode:"raw-loop-selection",durationSec:d,intendedLoopDurationSec:d},s);return bu(p)}const iVe={id:"raw-xensonar-send",label:"Raw to Xensonar",acceptsRawLoop:!0,acceptsAnalysisMeta:!0,acceptsSpectralProjection:!1,async commitLoop(e){m$(e)}},sVe={id:"raw-root-follow-send",label:"Use as Root Follow Loop",acceptsRawLoop:!0,acceptsAnalysisMeta:!0,acceptsSpectralProjection:!1,async commitLoop(e){const t=pe.getState(),n=e.selection.fineLoopRange,r=e.source.sourceAsset,a=Math.max(0,Math.floor(n.startSec*r.sampleRate)),o=Math.max(1,Math.min(r.monoSamples.length-a,Math.floor(Math.max(.05,n.durationSec)*r.sampleRate))),i=r.channelCount>1?[r.leftSamples,r.rightSamples]:[r.monoSamples],s=gU(i.map(b=>b.subarray(a,a+o)),r.sampleRate),l=t.materialExport,c=e.exportTitle?.trim()||l.name,d=o/Math.max(1,r.sampleRate),p=Yd({name:c,role:"loop",bpm:Number.isFinite(l.bars*(l.beatsPerBar||4)*60/Math.max(.001,d))?Math.max(1,Math.min(999,l.bars*(l.beatsPerBar||4)*60/Math.max(.001,d))):l.bpm,bars:l.bars,beatsPerBar:l.beatsPerBar,guideSegments:l.guideSegments,guideMarkers:l.guideMarkers,loopStartSec:0,loopEndSec:d,rootHz:__forgeMaterialRootHz(l.rootHz),sourceVersion:"xensonar-material-intake-v1",renderMode:"raw-root-follow-loop-selection",durationSec:d,intendedLoopDurationSec:d,rootFollowPreferred:!0,workspaceOrigin:"spectral-forge-cut-root-follow",routeSummary:"Cut in SpectralForge and marked directly as a Root Follow Loop.",stabilizeBy:"The fine selection from Audio Import is stored as the loop body; pitch then follows the grid live in the Main Room."},s),f=bu(p);ri("rootFollowBankMembership",{entryId:f.id,enabled:!0,activate:!0,config:{sourceKind:"material",renderMode:"flowing"}})}},yx="xensonar:pending-material-intake-raw-melodic-import-v1",lVe={id:"raw-melodic-pink-lane-send",label:"Send as Pink Track to Melodic Loop",acceptsRawLoop:!0,acceptsAnalysisMeta:!0,acceptsSpectralProjection:!1,async commitLoop(e){const t=m$(e),n={entryId:t.id,anchorHz:55,source:"spectral-forge-raw-audio"};try{window.sessionStorage.setItem(yx,JSON.stringify(n))}catch{}ri("materialIntakeRawMelodicImport",n),ri("openCanonicalMelodicLoop",{reason:"material-intake-raw-audio-direct",entryId:t.id})}};
/* xen-lazy:lab */
const uVe={maxAnchorsPerFrame:5,minPeakAmplitude:.09,verticalSmoothingRadius:2,minPeakDistanceBins:5};
/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */
const nP=12;
/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */
const KE=16,fy=3;
/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */
const hWe={envelopeRadiusBins:18,formantSmoothingRadius:2,residualBandCount:12,minAtomQuality:.08};
/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */


/* xen-lazy:lab */

let aP=null;
/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */
