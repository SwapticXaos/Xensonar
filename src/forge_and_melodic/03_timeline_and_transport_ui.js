const _We=P.lazy(async()=>({default:(await yy(()=>Promise.resolve().then(()=>tKe),void 0,import.meta.url)).CanonicalForgeRoom}));class zWe extends P.Component{constructor(t){super(t),this.state={hasError:!1,message:""}}static getDerivedStateFromError(t){return{hasError:!0,message:t instanceof Error?t.message:"Unknown SyntheticForge error"}}componentDidCatch(t){console.error("[xensonar][synthetic-forge][boundary]",t)}render(){return this.state.hasError?u.jsxs("div",{className:"space-y-3 border border-red-900/70 bg-red-950/20 p-4 text-sm text-red-100",children:[u.jsx("div",{className:"text-xs uppercase tracking-[0.25em] text-red-300",children:"SyntheticForge isolated"}),u.jsx("div",{className:"font-medium",children:"SyntheticForge encountered an error and was isolated."}),u.jsx("div",{className:"text-red-200/80",children:this.state.message||"SyntheticForge could not be fully initialized."}),u.jsx("div",{className:"flex flex-wrap gap-2",children:u.jsx("button",{type:"button",onClick:()=>{this.setState({hasError:!1,message:""}),this.props.onReset()},className:"border border-red-700 px-3 py-1.5 text-red-100 hover:bg-red-900/40",children:"Back to SpectralForge"})})]}):this.props.children}}
/* xen-lazy:lab */

/* xen-lazy:lab */
const y$="xensonar-level3lab-canonical-view",S$="xensonar-level3lab-canonical-view-session";
/* xen-lazy:lab */

/* xen-lazy:lab */

/* xen-lazy:lab */
const qWe=Object.freeze(Object.defineProperty({__proto__:null,get Level3LabRoom(){return __xenLoadDeferred("lab").WWe}},Symbol.toStringTag,{value:"Module"})),$E="spectralforge-legacy-bridge",QWe={producerId:"spectralforge-legacy",producerName:"Spectral Forge Legacy",version:"v2",family:"legacy",notes:Fj("legacy","Spectral Forge Legacy")};function sz(e){switch(e){case"legacy":return c2("forgeLegacy");case"canonical":return c2("forgeCanonical");case"external":return c2("externalSlot")}}function lz(...e){return e.map(t=>t?.trim()).filter(Boolean).join(" · ")}const cz=new Set;let dS=new Map,v$=[];function UWe(){v$=Array.from(dS.values())}function uz(e){dS.set(e.adapterId,e),UWe()}function ov(){dS.size||(uz({adapterId:$E,adapterName:"Legacy-Bridge",description:"Direct adapter bridge from the previous Spectral Forge into the official Xensonar material package.",supportedRoles:["loop","waveMaterial","particleExciter","droneTexture"],buildPackage(e){const t=Yd(e.meta,e.blob),n=sz(e.producer.family),r=Nx({role:e.meta.role,workspaceOrigin:e.meta.workspaceOrigin??(e.producer.family==="legacy"?"legacy-forge":e.producer.family==="external"?"external":void 0)});return{...t,renderInfo:{...t.renderInfo,sourceDevice:e.producer.producerName,sourceVersion:e.producer.version,renderMode:e.meta.renderMode,machineRoomId:n.id,machineRoomRole:n.shortLabel,handoffTarget:"xensonarPerformance",transitionIntent:U5(),preferredMyzelGroup:e.meta.preferredMyzelGroup??r.preferredMyzelGroup,workspaceOrigin:e.meta.workspaceOrigin,transitionGuard:e.meta.transitionGuard??r.transitionGuard,balanceCarrier:e.meta.balanceCarrier??r.balanceCarrier,routeSummary:e.meta.routeSummary??r.routeSummary,stabilizeBy:e.meta.stabilizeBy??r.stabilizeBy,notes:lz(e.producer.notes,Q5(e.meta.role),n.summary)}}}}),uz({adapterId:"canonical-forge-bridge",adapterName:"Canonical-Bridge",description:"More neutral bridge for future data-rich Forge variants; same external shape, different internal architecture allowed.",supportedRoles:["loop","waveMaterial","particleExciter","droneTexture"],buildPackage(e){const t=Yd(e.meta,e.blob),n=sz(e.producer.family),r=Nx({role:e.meta.role,workspaceOrigin:e.meta.workspaceOrigin??(e.producer.family==="legacy"?"legacy-forge":e.producer.family==="external"?"external":void 0)});return{...t,renderInfo:{...t.renderInfo,sourceDevice:e.producer.producerName,sourceVersion:e.producer.version,renderMode:e.meta.renderMode,machineRoomId:n.id,machineRoomRole:n.shortLabel,handoffTarget:"xensonarPerformance",transitionIntent:U5(),preferredMyzelGroup:e.meta.preferredMyzelGroup??r.preferredMyzelGroup,workspaceOrigin:e.meta.workspaceOrigin,transitionGuard:e.meta.transitionGuard??r.transitionGuard,balanceCarrier:e.meta.balanceCarrier??r.balanceCarrier,routeSummary:e.meta.routeSummary??r.routeSummary,stabilizeBy:e.meta.stabilizeBy??r.stabilizeBy,notes:lz(e.producer.notes??"Canonical forge bridge",Q5(e.meta.role),n.summary)},provenance:{...t.provenance,parentId:e.producer.producerId}}}}))}ov();
/* xen-lazy:canonical */
function A$(e){ov();const t=dS.get(e)??dS.get($E);if(!t)throw new Error(`Forge material adapter registry is missing default adapter "${$E}".`);return t}
/* xen-lazy:canonical */

/* xen-lazy:canonical */
function Ly(e,t,n=QWe){return{meta:e,blob:t,producer:n}}function $M(e,t){return A$(e).buildPackage(t)}
/* xen-lazy:canonical */

/* xen-lazy:canonical */
const YWe="SyntheticForge: Drum Machine and Melodic Loop on the main interface; older Wave Editor paths remain archived.",JWe="sourceTrace",ZWe="sourceWindow",eqe="microtonal-logic",mz="drums",XE=[{id:"synesthetic",label:"Synesthetic",hint:"Broad composite view of spectrum, contour, harmonics, pulses, and width"},{id:"energy",label:"Energy",hint:"Full Spectrum as Base Mass"},{id:"harmonic",label:"Harmonics",hint:"More stable tonal lines and partial trajectories"},{id:"transient",label:"Transient",hint:"Attacks, grooves, edges, impulses"},{id:"lowBand",label:"Low Band",hint:"Deep supporting mass and body zones"},{id:"air",label:"Air",hint:"Upper Air, Shimmer, Fraying"},{id:"stereo",label:"Stereo",hint:"Width energy and side components of the source"},{id:"pulse",label:"Pulse",hint:"Wave body, pulse, and impulse density"},{id:"noise",label:"Noise",hint:"Grainy, frayed, residual components"},{id:"contour",label:"Contour",hint:"Graphic edges and form lines"}],tqe=[{id:"brush",icon:"🖌️",label:"Brush",hint:"Direct painting into the canonical canvas"},{id:"smudge",icon:"🫟",label:"Smudge",hint:"Smudge material in the drag direction"},{id:"morph",icon:"🌀",label:"Morph",hint:"Push, Bloat, Pinch, and Twirl with the established spectral tools"},{id:"sourceTrace",icon:"🧬",label:"Source Trace",hint:"Drag directly in from the selected analysis view"},{id:"harmonicLift",icon:"🎼",label:"Harmonic Lift",hint:"Bring Harmonic Lines Forward Locally"},{id:"transientLift",icon:"⚡",label:"Transient Lift",hint:"Trace Impulse-Rich Zones"},{id:"noiseGate",icon:"🚪",label:"Noise Gate",hint:"Locally cut or reveal quiet residuals"},{id:"dodgeBurn",icon:"☀️",label:"Dodge/Burn",hint:"Dodge or locally darken as in a photo lab"},{id:"blurSharpen",icon:"≋",label:"Blur/Sharpen",hint:"Blur or locally sharpen details"},{id:"delaySmear",icon:"⟿",label:"Delay Smear",hint:"Pull Echo-Like Repetitions Along the Time Axis"},{id:"threshold",icon:"⛶",label:"Threshold",hint:"Thin lower material or raise quiet zones"},{id:"stamp",icon:"📋",label:"Stamp",hint:"Reuse stamps from the spectral workbench with scale/rotation/flip"}];new Set(XE.map(e=>e.id));const nqe=new Set(tqe.map(e=>e.id)),rqe=["drums","melodic"],aqe=["forge","sourceWindow","sourceFull"];function oqe(e){return typeof e=="string"&&nqe.has(e)}function pz(e){return typeof e=="string"&&rqe.includes(e)}function iqe(e){return typeof e=="string"&&aqe.includes(e)}
/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */
const iP={producerId:"spectralforge-canonical",producerName:"Spectral Forge Canonical",version:"forge2-a",family:"canonical",notes:Fj("canonical","Spectral Forge Canonical")},x$=108,Sx={name:"SyntheticForge Loop",role:"loop",adapterId:"canonical-forge-bridge",bpm:108,bars:4,guideSegments:4,guideMarkers:yu(4),beatGuideAudible:!1,beatGuideVolume:.35,loopPreview:!0,transferMode:"source-direct",rootFollowPreferred:!1},dqe={sine:.7,sawtooth:.2,square:.1,triangle:.2},bz=[...jSe,{value:"minimal_techno",label:"Minimal Techno"},{value:"duststep",label:"Duststep"},{value:"broken_lilt",label:"Broken Lilt"}],yz=[...GSe,{value:"forge_rooted",label:"Forge Rooted"},{value:"forge_braided",label:"Forge Braided"},{value:"forge_fractured",label:"Forge Fractured"}];
/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */
function M$(e){return{variants:rB(e),links:tB(e.tracks.map(t=>t.id))}}
/* xen-lazy:canonical */

/* xen-lazy:canonical */
function vu(e){return Math.max(0,Math.min(1,e))}
/* xen-lazy:canonical */

/* xen-lazy:canonical */
function vx(e,t,n){const r=Xa(e),a=Math.min(r,8),o=Math.max(a,Math.min(r,n)),i=Math.max(0,r-o),s=Math.max(0,Math.min(i,t));e.zoom=Math.min(12,Math.max(1,r/Math.max(a||1,o))),e.scrollX=i>0?vu(s/i):0}
/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */
function HR(e){return Math.max(.035,Math.min(1,10/Math.max(1,e)))}function ii(e,t){const n=HR(t),r={startRatio:0,endRatio:1};if(!e)return r;let a=vu(Number.isFinite(e.startRatio)?e.startRatio:0),o=vu(Number.isFinite(e.endRatio)?e.endRatio:1);if(o-a<n){const i=(a+o)*.5;a=i-n*.5,o=i+n*.5}return a<0&&(o=Math.min(1,o-a),a=0),o>1&&(a=Math.max(0,a-(o-1)),o=1),o-a<n&&(o=Math.min(1,a+n),a=Math.max(0,o-n)),{startRatio:a,endRatio:o}}
/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */
function vqe(e){return e?.materialExport?{...Sx,...e.materialExport,transferMode:e.materialExport.transferMode??Sx.transferMode,guideMarkers:[...e.materialExport.guideMarkers]}:Sx}function Aqe(e){const t=ZTe();return e?.spectralSnapshot&&t.restoreData(e.spectralSnapshot),t}function xqe(e){return e?.waveformMix?{...e.waveformMix}:dqe}function Mqe(e){return e?.stampData?yR(e.stampData):null}function wqe(e){return jL(e?.grooveMachine??il)}function Rqe(e){const t=e?.drumComputer,n=e?.grooveMachine?.barsInterpretation??il.barsInterpretation;return t?im(wg(t,n,t.segmentsPerBar,t.segmentMarkers)):zL(n)}function Cqe(e){return ii(e?.drumViewport,e?.drumComputer?.stepCount??16)}function kqe(e){return e?.loopComposer?$n(e.loopComposer):oB(4)}function Pqe(e){return e?.loopComposer?"":JL}function Iqe(e){return e?.stampData?"stamping":"idle"}function Eqe(e){return e?.sourceAsset&&e.bundle?iS(e.bundle,e.sourceView??"synesthetic",e.secondaryView??"harmonic",e.viewBlend??.26).cloneData():null}function Fqe(e){return e?.toolSettings?.eraseMode??Cp.eraseMode?"erase":"positive"}function Tqe(e){return oqe(e?.activeTool)?e.activeTool:JWe}function Lqe(e){return iqe(e?.sourcePreviewMode)?e.sourcePreviewMode:ZWe}function Bqe(){return eqe}function Dqe(e){const{initialSession:t,externalLogicView:n}=e;return pz(n)?n:pz(t?.logicView)?t.logicView??mz:mz}function Nqe(e){return typeof e?.status=="string"&&e.status.trim().length>0?e.status:YWe}function Oqe(e){const{initialSession:t,externalLogicView:n}=e,r=kqe(t),a=t?.loopPatternVariants&&t?.loopPatternLinks?{variants:Bi(t.loopPatternVariants),links:Di(t.loopPatternLinks)}:M$(r);return{materialExport:vqe(t),rawSourceAsset:t?.rawSourceAsset??null,sourceAsset:t?.sourceAsset??null,bundle:t?.bundle??null,spectralData:Aqe(t),sourceView:t?.sourceView??"synesthetic",secondaryView:t?.secondaryView??"harmonic",viewBlend:t?.viewBlend??.26,activeTool:Tqe(t),sourcePreviewMode:Lqe(t),activeWorkspace:Bqe(),logicView:Dqe({initialSession:t,externalLogicView:n}),status:Nqe(t),brushSize:t?.toolSettings?.brushSize??Cp.brushSize,intensity:t?.toolSettings?.intensity??Cp.intensity,hardness:t?.toolSettings?.hardness??Cp.hardness,eraseMode:t?.toolSettings?.eraseMode??Cp.eraseMode,morphMode:t?.toolSettings?.morphMode??Cp.morphMode,synthMode:t?.synthMode??"glyph",waveformMix:xqe(t),stampPresetId:t?.stampPresetId??"",stampData:Mqe(t),stampScaleX:t?.stampScaleX??1,stampScaleY:t?.stampScaleY??1,stampRotation:t?.stampRotation??0,stampFlipX:t?.stampFlipX??!1,stampFlipY:t?.stampFlipY??!1,selectionStartSec:t?.selectionStartSec??0,selectionDurationSec:t?.selectionDurationSec??10,selectionDirty:t?.selectionDirty??!1,detailSelectionStartSec:t?.detailSelectionStartSec??t?.selectionStartSec??0,detailSelectionDurationSec:t?.detailSelectionDurationSec??t?.selectionDurationSec??10,detailSelectionDirty:t?.detailSelectionDirty??!1,detailViewportStartSec:t?.detailViewportStartSec??t?.selectionStartSec??0,detailViewportDurationSec:t?.detailViewportDurationSec??Math.max(t?.selectionDurationSec??10,.5),detailZoom:t?.detailZoom??1,detailOffset:t?.detailOffset??0,auditionView:t?.auditionView??"none",auditionBlendAmount:t?.auditionBlendAmount??0,selectedProjectId:t?.selectedProjectId??null,grooveMachine:wqe(t),drumComputer:Rqe(t),drumViewport:Cqe(t),loopComposer:$n(r),loopPatternVariants:a.variants,loopPatternLinks:a.links,selectedMelodicProjectId:Pqe(t),selectedLoopNoteIds:t?.selectedLoopNoteIds??[],autoZoomOnDenseOverlap:t?.autoZoomOnDenseOverlap??!1,lockTrackEditing:t?.lockTrackEditing??!1,chordVoicing:t?.chordVoicing??"triad",chordStrumSteps:t?.chordStrumSteps??0,chordVelocitySlope:t?.chordVelocitySlope??.08,stampPhase:Iqe(t),proxyBaselineSnapshot:Eqe(t),stampLoadedMode:Fqe(t),projectName:t?.materialExport?.name??Sx.name}}
/* xen-lazy:canonical */
const oD="#ec4899",zqe="#f472b6",sP="drag or click to anchor at the grid step.",jqe="material-base",Gqe="carrier-integral-pink";
/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */
const lP=["#22d3ee","#a3e635","#f59e0b","#8b5cf6","#14b8a6","#ef4444"];
/* xen-lazy:canonical */
// F4.3.7: Explicit Melodic bar edits are transactional, across all variant banks.
// Never use the RESIZED composer to infer old note starts: cn() clamps at the new endpoint.

/* xen-lazy:canonical */


/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */

/* xen-lazy:canonical */
function iD(e){return Math.max(1,e.stepsPerBar*Math.max(1,e.bars))}function I$(e){return Math.max(.25,Math.max(1,e.stepsPerBar)/Math.max(1,e.beatsPerBar||4))}function l9e(e){return e==="tritave"?3:2}function sD(e){return Math.max(1,e.composer.beatsPerBar||4)*60/Math.max(40,e.bpm)}function lD(e){return Math.max(.25,Math.max(1,e.composer.bars||1)*sD(e))}function c9e(e){return!!(e.customDrumPattern?.useCustom||e.drumPattern&&e.drumKit)}function u9e(e){return e.customDrumPattern?.bars?Math.max(1,e.customDrumPattern.bars):Math.max(1,e.drumCycleBars||e.bars||e.composer.bars||1)}function cD(e){return c9e(e)?Math.max(.25,u9e(e)*sD(e)):0}function E$(e){const t=e.noteId||e.trackIds.length?lD(e):0,n=cD(e),r=Math.max(.25,Math.max(1,e.bars||e.composer.bars||1)*sD(e));return Math.max(t,n,r)}function uD(e,t){const n=t.lineId,r=typeof n=="string"?/line-(\d+)/.exec(n):null;if(r)return Math.max(0,Math.min((e.pitchLines?.length||e.pitchSteps.length)-1,Number(r[1])));if(Number.isFinite(t.channelIndex))return Math.max(0,Math.min((e.pitchLines?.length||e.pitchSteps.length)-1,t.channelIndex));const a=t.stepId,o=typeof a=="string"?/step-(\d+)/.exec(a):null,i=o?Number(o[1]):0;return Math.max(0,Math.min((e.pitchLines?.length||e.pitchSteps.length)-1,i))}function Ax(e,t){const n=t.startBeat;return(Number.isFinite(n)?Math.max(0,Number(n))*I$(e):null)??(Number.isFinite(t.startUnit)?Math.max(0,t.startUnit):Math.max(0,t.startStep??0))}function F$(e,t){const n=t.startBeat,r=t.endBeat,floor=Number.isFinite(t.carrierRelativeSemitones)?1e-9:.125;return(Number.isFinite(n)&&Number.isFinite(r)?Math.max(floor,(Number(r)-Number(n))*I$(e)):null)??(Number.isFinite(t.durationUnits)?Math.max(floor,t.durationUnits):Math.max(floor,t.lengthSteps??1))}function d9e(e){return Number.isFinite(e.fadeInUnits)?Math.max(0,e.fadeInUnits):Math.max(0,e.fadeInSteps??0)}function T$(e){return Number.isFinite(e.fadeOutUnits)?Math.max(0,e.fadeOutUnits):Math.max(0,e.fadeOutSteps??0)}function m9e(e,t,n){const r=uD(e,t),a=e.pitchLines?.[r],o=e.pitchSteps[r]??e.pitchSteps[0],i=Math.max(30,Math.min(1200,Number.isFinite(e.baseHz)?e.baseHz:220)),s=a?.hz??i*(o?.ratio??1),l=(a?.offsetCents??o?.offsetCents??0)/1200,c=n.kind==="synth"?n.voice.octaveBias??0:0,d=om()+c;return s*Math.pow(l9e(e.repetitionModel),d)*Math.pow(2,l+(Number.isFinite(t.carrierRelativeSemitones)?t.carrierRelativeSemitones/12:0))}
// F3.24 Melodic Loop: transport is not an audio modification. Persistent within this browser session.
let __mlSampleEpoch=0,__mlPrepared=null,__mlCacheEntries=[],__mlInFlight=null;