function dje(e,t,n,r){const a=Math.max(1,e.baseHz||220),o=new Map(e.tracks.map(c=>[c.id,Number.isFinite(c.pan??NaN)?Number(c.pan):0])),i=new Map(e.tracks.map(c=>[c.id,Number.isFinite(c.volume??NaN)?Math.max(0,Math.min(1.5,Number(c.volume))):.75])),s=new Map(e.tracks.map(c=>[c.id,c.instrumentPreset])),l=e.notes.filter(c=>c.durationBeats>0).map((c,d)=>{const p=UB(e,c);return{id:`${c.id||"note"}-${d}`,voiceId:c.id||`${c.trackId}-${d}`,trackId:c.trackId,startRatio:Math.max(0,Math.min(1,c.startBeat/Math.max(1e-4,n))),durationRatio:Math.max(.001,Math.min(1,Math.max(.03125,c.durationBeats)*Math.max(.05,Math.min(2,c.gate||1))/Math.max(1e-4,n))),relativeSemitones:Math.max(-72,Math.min(72,12*Math.log2(p/a))),velocity:Math.max(.02,Math.min(1,Number.isFinite(c.velocity??NaN)?Number(c.velocity):.75)),gate:Math.max(.05,Math.min(2,Number.isFinite(c.gate??NaN)?Number(c.gate):1)),pan:Math.max(-1,Math.min(1,o.get(c.trackId)??0)),trackVolume:Math.max(0,Math.min(1.5,i.get(c.trackId)??.75)),sourceLineHz:Number.isFinite(p)?p:null,localField:c.localField??null,spectralWindowMeta:c.spectralWindowMeta??null,instrumentPresetOverride:QB(c.instrumentPresetOverride??s.get(c.trackId)??null)}});return{schemaVersion:"carrier-integral-field-v1",variant:r,label:t.prism??"Fretless Field",sourceMachineId:t.machineId??null,sourcePrism:t.prism??null,sourceBaseHz:a,sourceBars:Math.max(1,e.bars||1),sourceBeatsPerBar:Math.max(1,e.beatsPerBar||4),totalBeats:Math.max(1e-4,n),voices:l}}function mje(e,t,n,r){const a=r?.trackId??ije,o=r?.color??sje,i=n.prism?`Carrier · ${n.prism}`:"Carrier Figure";let s=e.tracks.find(c=>c.id===a)??null;const l=lje(t);return s||(e.tracks.push(uR({id:a,label:i,color:o,volume:.82,instrumentRole:"texture",instrumentPreset:l,patternPresetId:"patternA",pan:0,enabled:!0},e.tracks.length)),s=e.tracks.find(c=>c.id===a)??null),s&&(s.label=i,s.color=o,s.instrumentRole="texture",s.instrumentPreset=l,s.enabled=!0),{track:s,fallbackPreset:l,trackId:a}}function pje(e){const{draft:t,detail:n,config:r,pattern:a,anchorRoundedHz:o,fallbackPreset:i,maxUnits:s,unitsPerBeat:l,trackId:c,pendingPitchAnchor:d}=e,p=Math.max(1,a.baseHz||220),f=n.carrierIntegralTimbre??r.synthPatch?.carrierIntegralTimbre??null;return a.notes.filter(b=>b.durationBeats>0).map(b=>{const g=UB(a,b),y=Math.max(1,Math.min(12e3,o*(g/p))),x=WB(t,y),A=Math.max(0,Math.min(s-.0625,b.startBeat*l)),M=Math.max(.0625,Math.min(s-A,b.durationBeats*Math.max(.05,Math.min(2,b.gate||1))*l)),v=Fi(t,{trackId:c,channelIndex:HK(t,x.anchorIndex),startUnit:A,durationUnits:M,velocity:Math.max(.16,Math.min(1,b.velocity||.72)),fadeInUnits:Math.max(0,Math.min(l*.08,M*.12)),fadeOutUnits:Math.max(0,Math.min(l*.12,M*.18))});return v.renderSourceKind="synth-live",v.noteClass="standard",v.octaveOffset=0,v.instrumentPresetOverride=QB(b.instrumentPresetOverride??i),v.carrierIntegralTimbre=f,v.anchorHz=x.roundedAnchorHz,v.sourceTempoBpm=null,v.sourceLoopDurationSec=null,v.pendingPitchAnchor=d===!0,pr(t,v)})}function hje(e){const{draft:t,channelIndex:n,totalBeats:r,maxUnits:a,unitsPerBeat:o,fallbackPreset:i,velocity:s,trackId:l,pendingPitchAnchor:c}=e,d=0,p=Math.max(.125,Math.min(a,r*o)),f=Fi(t,{trackId:l,channelIndex:n,startUnit:d,durationUnits:p,velocity:s,fadeInUnits:Math.max(0,Math.min(o*.25,p*.08)),fadeOutUnits:Math.max(0,Math.min(o*.25,p*.08))});return f.renderSourceKind="synth-live",f.noteClass="carrier-field",f.octaveOffset=0,f.instrumentPresetOverride=i,f.sourceTempoBpm=null,f.sourceLoopDurationSec=null,f.pendingPitchAnchor=c===!0,f}function fje(e,t,n,r){const a=t.config??null,o=a?.synthPattern??null,i=qB(t.projectionMode),s=WB(e,n);if(!a||!o||!Array.isArray(o.notes)||o.notes.length===0)return{applied:!1,reason:"This lens does not yet have a synthetic pink-track plan.",noteCount:0,roundedAnchorHz:s.roundedAnchorHz,roundedAnchorLabel:s.roundedAnchorLabel};if(i==="grained")return{applied:!1,reason:"Raw Audio uses the rendered material body. Choose the Raw Audio entry in the import menu and confirm the import.",noteCount:0,roundedAnchorHz:s.roundedAnchorHz,roundedAnchorLabel:s.roundedAnchorLabel};const l=Da(Math.max(1,Math.round(t.bars||o.bars||1)));l>e.bars&&(e.bars=l,e.timeGuideMarkers=ll(e.bars,e.beatsPerBar,e.segmentCount));const{fallbackPreset:c,trackId:d}=mje(e,a,t,r),p=Li(e),f=Mu(e);e.notes=e.notes.filter(v=>v.trackId!==d);const b=l*Math.max(1,o.beatsPerBar||e.beatsPerBar||4),g=HK(e,s.anchorIndex),y=o.notes.reduce((v,w)=>Math.max(v,w.velocity||0),.75),x=t.carrierIntegralTimbre??a.synthPatch?.carrierIntegralTimbre??null;let A=[],M="";if(i==="scattered")A=pje({draft:e,detail:t,config:a,pattern:o,anchorRoundedHz:s.roundedAnchorHz,fallbackPreset:c,maxUnits:f,unitsPerBeat:p,trackId:d,pendingPitchAnchor:r?.pendingPitchAnchor===!0}),M=`${t.prism??"Carrier"} zerstreut als experimentelle Rasterprojektion eingesetzt`;else{const v=hje({draft:e,channelIndex:g,totalBeats:b,maxUnits:f,unitsPerBeat:p,fallbackPreset:c,velocity:Math.max(.18,Math.min(1,y)),trackId:d,pendingPitchAnchor:r?.pendingPitchAnchor===!0});v.carrierIntegralTimbre=x,v.anchorHz=s.roundedAnchorHz,i==="monotone"?(v.localField=uje(o,b),v.carrierIntegralField=null,M=`${t.prism??"Carrier"} as a monotone anchor body across ${l} Takt${l===1?"":"e"} eingesetzt`):(v.localField=null,v.carrierIntegralField=dje(o,t,b,"last-hearing"),M=`${t.prism??"Carrier"} as a Fretless Field · polyphonic field clip across ${l} Takt${l===1?"":"e"} eingesetzt`),A=[pr(e,v)]}return e.notes.push(...A),e.selectedTrackId=d,e.selectedNoteId=A[0]?.id??null,e.activeTrackIds.includes(d)||e.activeTrackIds.push(d),{applied:A.length>0,reason:M,noteCount:A.length,roundedAnchorHz:s.roundedAnchorHz,roundedAnchorLabel:s.roundedAnchorLabel}}const OR="xensonar:pending-carrier-integral-pink-export",KB="xensonar:pending-carrier-integral-raw-material-melodic-export",L_="xensonar:open-material-import",_E="xensonar:request-material-import",gje=["last-hearing","grained","scattered","monotone"],bje="grained";function yje(e){return e===bje}function Sje(e){return!!(e?.audioPaintDetail||e?.audioPaintRepairDetail)}function qp(e,t){if(yje(t)){const r=!!e?.rawAudioReady;return{mode:t,kind:"raw-audio",ready:r,reason:r?void 0:"Raw Audio is unavailable for this entry because no rendered audio body is ready."}}const n=!!(e?.structuredCarrierModesReady&&e?.audioPaintDetail);return{mode:t,kind:"structured-carrier",ready:n,reason:n?void 0:e?.structuredCarrierModesReason??"Fretless Field, scattered, and monotone require a valid carrier-field contract with pattern voices."}}function vje(e){return Object.fromEntries(gje.map(t=>[t,qp(e,t)]))}const VK="xensonar:carrier-integral-audio-paint-registry-v1",WK=OR;function Aje(e){return JSON.stringify(e)}function zE(e){if(!e||typeof e!="object")return null;const t=e;return t.entryId?t:null}function qK(e){if(!e)return{ok:!1,reason:"Audio Paint contract missing. Resend from Shape Projects."};if(!e.entryId)return{ok:!1,reason:"Audio Paint contract has no material ID."};if(!e.config)return{ok:!1,reason:"Audio Paint contract has no lab configuration."};const t=e.config.synthPattern??null;if(!t||!Array.isArray(t.notes))return{ok:!1,reason:"Audio Paint contract has no synthetic pattern plan."};if(!t.notes.filter(l=>Number.isFinite(l?.durationBeats??NaN)&&Number(l.durationBeats)>0).length)return{ok:!1,reason:"Audio Paint pattern contains no sounding voices."};const r=Number(e.bars??t.bars??1);if(!Number.isFinite(r)||r<=0)return{ok:!1,reason:"Audio Paint contract has no valid bar length."};const a=Number(e.bpm??0);if(e.bpm!==void 0&&(!Number.isFinite(a)||a<=0))return{ok:!1,reason:"Audio Paint contract has no valid tempo."};const o=e.rootHz;if(o!=null&&(!Number.isFinite(Number(o))||Number(o)<=0))return{ok:!1,reason:"Audio Paint contract has no valid pitch anchor."};const i=qB(e.projectionMode),s=VM.find(l=>l.id===i);return s?.enabled?{ok:!0,normalized:{...e,bars:Math.max(1,Math.round(r)),bpm:Number.isFinite(a)&&a>0?a:e.bpm,projectionMode:i}}:{ok:!1,reason:s?`${s.label} is prepared but not rendered yet.`:"Audio Paint variant is unavailable."}}function xje(e){return qK(e).ok}function Mje(e){if(!e?.audioPaintImportDetailJson)return null;try{const t=JSON.parse(e.audioPaintImportDetailJson),n=zE(t);return n?{...n,entryId:e.id,materialName:n.materialName||e.name}:null}catch{return null}}function _R(){return typeof window<"u"&&typeof window.sessionStorage<"u"}function QK(){if(!_R())return{};try{const e=window.sessionStorage.getItem(VK);if(!e)return{};const t=JSON.parse(e);return t&&typeof t=="object"?t:{}}catch{return{}}}function wje(e){if(_R())try{window.sessionStorage.setItem(VK,JSON.stringify(e))}catch{}}function UK(e){if(!e?.entryId)return;const t=QK();if(t[e.entryId]=e,wje(t),_R())try{window.sessionStorage.setItem(WK,JSON.stringify(e))}catch{}}function Rje(e){const t=QK(),n=zE(t[e]);if(n?.entryId)return n;if(_R())try{const r=window.sessionStorage.getItem(WK);if(r){const a=zE(JSON.parse(r));if(a?.entryId===e)return a}}catch{}return null}const lA=e=>String(e||"").toLowerCase(),jE=(e,t)=>t.some(n=>e.includes(n)),zR=e=>({renderMode:lA(e.renderMode),workspaceOrigin:lA(e.workspaceOrigin),sourceVersion:lA(e.sourceVersion),routeSummary:lA(e.routeSummary)});function Cje(e){if(!e)return!1;const t=zR(e);return t.workspaceOrigin.includes("spectralforge-carrier-integral-rendered-material")||t.renderMode.startsWith("carrier-integral-rendered-material")||t.sourceVersion.includes("spectralforge-carrier-integral-rendered-material")}function WM(e){if(!e)return!1;const t=zR(e);return t.workspaceOrigin.includes("spectralforge-carrier-integral-granular-material")||t.renderMode.startsWith("carrier-integral-granular-material")||t.sourceVersion.includes("spectralforge-carrier-integral-granular-material")||t.routeSummary.includes("granularer carrier-materialkörper")}function jR(e){if(!e||Cje(e)||WM(e))return!1;const t=zR(e);return t.workspaceOrigin.includes("spectralforge-carrier-integral")||t.renderMode.startsWith("carrier-integral-")||jE(t.routeSummary,["carrier-integral","carrier integral"])}function GE(e){if(!e)return!1;const t=zR(e);return t.workspaceOrigin.includes("spectralforge-raw-oscillator-material")||t.renderMode.startsWith("spectralforge-raw-oscillator-material")||jE(t.sourceVersion,["spectralforge-raw-oscillator","spectralforge-raw-carrier-material"])||jE(t.routeSummary,["pure dieter","roh-oszillator"])}function kje(e){return!e||jR(e)||!(e.blob instanceof Blob)||typeof e.blob.size=="number"&&e.blob.size<=0?!1:["loop","waveMaterial","particleExciter","droneTexture"].includes(e.role)}function Pje(e){return jR(e)?"audio-paint":"raw-audio"}function Ije(e){return e?jR(e)||kje(e):!1}function Eje(e,t){const n=Pje(e),r=GE(e)||WM(e),a=n==="audio-paint"||r,o=a?Mje(e)??Rje(e.id):null,i=a?qK(o):void 0,s=i?.ok?i.normalized??o:null,l=a?!!(o?.carrierProjectId&&o?.machineId):!1,c=a?!!(o?.carrierProjectId||o?.materialName||e.name):!1,d=e.blob instanceof Blob&&(typeof e.blob.size!="number"||e.blob.size>0),p=!!i?.ok,f=d||p,b=i?.normalized?.bpm??o?.bpm;return{id:e.id,name:e.name,bars:Math.max(1,Math.round(i?.normalized?.bars??o?.bars??e.bars??1)),bpm:n==="audio-paint"&&Number.isFinite(Number(b))&&Number(b)>0?Number(b):t,renderMode:e.renderMode,role:e.role,lane:n,laneLabel:n==="audio-paint"?"Carrier Field / Listening Field (SpectralForge)":GE(e)?"Raw Audio (Pure Dieter)":WM(e)?"Raw Audio (Carrier Body)":"Raw Audio Loops (Material Track)",transferReady:f,rawAudioReady:d,structuredCarrierModesReady:p,structuredCarrierModesReason:i?.reason,audioPaintDetail:s,audioPaintRepairDetail:o,audioPaintValidation:i,canRebuildAudioPaint:l,canEditAudioPaint:c,disabledReason:f?void 0:n==="audio-paint"?i?.reason??"This lab interpretation cannot be imported; resend it from Figure Projects.":"No raw-audio blob is available for the Material Track import."}}function Fje(){typeof window>"u"||window.dispatchEvent(new CustomEvent(_E))}const B_=KB,Tje=OR;function Lje(e,t){if(e.machineId==="fractalia-self-carrier")return __FractaliaLiveTransfer.prepare(e,t);const n=e.valueSource==="right-override"?oi(e.harmonicXploreOverride??e.currentHarmonicXplore,e.currentHarmonicXplore):oi(e.storedHarmonicXplore??e.snapshot.carrierIntegralHarmonicXplore??null,NM(e.storedSynthLab??e.snapshot.carrierIntegralSynthLab??null,e.currentHarmonicXplore)),r=PK({projectName:e.entry.name,snapshot:e.snapshot,machineId:e.machineId,maxPreviewDurationSec:6,previewPitchSemitones:e.previewPitchSemitones,previewGain:t.previewGain,previewBpm:e.previewBpm,valueSource:e.valueSource,selectionOverride:e.selectionOverride,synthLabOverride:e.synthLabOverride,harmonicXploreOverride:n}),a=TR(e.snapshot,{widthMode:"legacy-fixed-width"});return Hze({spectralData:a,projectName:e.entry.name,machineId:e.machineId,targetId:e.targetId,targetLabel:e.targetLabel,renderSource:t.transferPlan.renderSource,melodicHandoffKind:t.transferPlan.melodicHandoffKind}),{executionPlan:t,activeHarmonicXplore:n,artifact:r,spectralData:a}}async function Bje(e,t){const{executionPlan:n}=t,{materialBodyPreviewCacheKey:r,transferPlan:a}=n,o=e.machineId==="fractalia-self-carrier"||e.machineId==="harmonic-xplore-direct-carrier"||e.machineId==="spektral-synthese-body"||gB(e.machineId)!==null,i=o?null:Aze(r),s=i?{buffer:i,audioIdentityKey:da(["carrier-integral-transfer-audio-identity-v1","material-body-cache",r??"no-material-cache-key",a.renderSource,e.machineId,e.targetId].join("|")),audioIdentitySource:"material-body-cache"}:await Dje(e,t),l=s.buffer;!i&&!o&&xze(r,l);const c=DK(l);Oje({machineLabel:n.machineLabel,transferPlan:a,renderedStats:c});const d=lg(l);return _je({machineLabel:n.machineLabel,transferPlan:a,renderedBlob:d}),{renderedBuffer:l,renderedStats:c,renderedBlob:d,renderedDurationSec:Math.max(.25,l.length/Math.max(1,l.sampleRate)),audioIdentityKey:s.audioIdentityKey,audioIdentitySource:s.audioIdentitySource}}async function Dje(e,t){if(e.machineId==="fractalia-self-carrier")return __FractaliaLiveTransfer.render(e,t);const{artifact:n,executionPlan:r,spectralData:a}=t,{durationSec:o,transferPlan:i}=r,s=gB(e.machineId);if(s){const l=tK({spectralData:a,durationSec:o,sampleRate:48e3,baseHz:n.baseHz??110,timbre:s,gain:s==="fm"?.46:s==="acid"?.52:.48,maxVoices:s==="fm"?12:s==="acid"?14:16,readerSettings:r.activeSynthLab.readerSettings}),c=l.buffer.getChannelData(0);for(let d=0;d<c.length;d++)c[d]*=r.previewGain;return{buffer:l.buffer,audioIdentityKey:da(`${l.audioIdentityKey}|gain:${r.previewGain}`),audioIdentitySource:"polytrace-reader-renderer"}}switch(i.renderSource){case"raw-spectral-buffer":return e.machineId==="harmonic-xplore-direct-carrier"?D_(t):e.machineId==="spektral-synthese-body"?N_(t):cA(xt.renderToBuffer(a,e.snapshot.synthMode,e.snapshot.waveformMix),e,t,"audio-engine-fallback");case"root-follow-config-buffer":return e.machineId==="harmonic-xplore-direct-carrier"?D_(t):e.machineId==="spektral-synthese-body"?N_(t):n.config?cA(gze({config:n.config,durationSec:o,bpm:e.previewBpm}),e,t,"root-follow-config-buffer"):cA(xt.renderToBuffer(a,e.snapshot.synthMode,e.snapshot.waveformMix),e,t,"audio-engine-fallback");default:return cA(xt.renderToBuffer(a,e.snapshot.synthMode,e.snapshot.waveformMix),e,t,"audio-engine-fallback")}}function Nje(e){return da(["carrier-integral-transfer-audio-identity-v1",e.source,e.request.machineId,e.request.targetId,e.context.executionPlan.transferPlan.renderSource,e.context.executionPlan.durationSec,e.request.previewBpm,e.request.previewPitchSemitones,e.context.executionPlan.sourceBars].join("|"))}async function cA(e,t,n,r){return{buffer:await e,audioIdentityKey:Nje({request:t,context:n,source:r}),audioIdentitySource:r}}async function D_(e){const{activeHarmonicXplore:t,artifact:n,executionPlan:r,spectralData:a}=e,{activeSynthLab:o,durationSec:i,previewGain:s}=r,l=await BR({spectralData:a,synthLab:LR(o),harmonicXplore:t,durationSec:i,previewDurationSec:i,rootHz:n.baseHz??110,gain:s});return{buffer:l.buffer,audioIdentityKey:l.summary.directEngineKey,audioIdentitySource:"harmonic-xplore-direct-summary"}}async function N_(e){const{activeHarmonicXplore:t,artifact:n,executionPlan:r,spectralData:a}=e,{activeSynthLab:o,durationSec:i,previewGain:s}=r,l=await DB({spectralData:a,synthLab:LR(o),harmonicXplore:t,durationSec:i,previewDurationSec:i,rootHz:n.baseHz??110,gain:s});return{buffer:l.buffer,audioIdentityKey:l.summary.directEngineKey,audioIdentitySource:"spektral-synthese-summary"}}function Oje(e){if(e.transferPlan.requiresAudibleRenderedBody&&e.renderedStats.peak<=5e-4)throw new Error(`${e.machineLabel} produced no audible material body; no Material Track entry was created.`)}function _je(e){if(e.transferPlan.requiresAudibleRenderedBody&&typeof e.renderedBlob.size=="number"&&e.renderedBlob.size<=44)throw new Error(`${e.machineLabel} produced no valid WAV body; no Material Track entry was created.`)}function zje(e,t,n){const{artifact:r,executionPlan:a}=t,{durationSec:o,machineLabel:i,materialEntryStableId:s,sourceBars:l,targetName:c,transferPlan:d}=a,p=Ize({materialEntryStableId:s,targetName:c,entryId:e.entry.id,machineId:e.machineId,machineLabel:i,sourceBars:l,previewBpm:e.previewBpm,durationSec:o,targetId:e.targetId,transferPlan:d,artifact:r,renderAudioIdentityKey:n.audioIdentityKey,renderAudioIdentitySource:n.audioIdentitySource});return{materialEntry:$T({name:c,role:"loop",bpm:e.previewBpm,bars:l,...(e.machineId==="fractalia-self-carrier"?{beatsPerBar:e.snapshot.materialExport.beatsPerBar}:{}),guideSegments:e.snapshot.materialExport.guideSegments,guideMarkers:e.snapshot.materialExport.guideMarkers,loopStartSec:0,loopEndSec:Math.min(n.renderedDurationSec,o),rootHz:r.baseHz,sourceVersion:d.sourceVersion,renderMode:`${d.renderModePrefix}-${e.targetId}`,durationSec:n.renderedDurationSec,intendedLoopDurationSec:o,stableId:s,workspaceOrigin:d.workspaceOrigin,routeSummary:d.summary,rootFollowPreferred:e.targetId==="root-follow-export",audioPaintImportDetailJson:d.usesAudioPaintImportDetail?Aje(p):void 0,audioIdentityKey:n.audioIdentityKey,audioIdentitySource:n.audioIdentitySource},n.renderedBlob),audioPaintImportDetail:p}}function jje(e,t,n){const{artifact:r,executionPlan:a}=t,{transferPlan:o}=a;o.usesAudioPaintImportDetail&&UK(n.audioPaintImportDetail),e.targetId==="root-follow-export"&&Hje({materialEntryId:n.materialEntry.id,transferPlan:o,rootFollowConfig:r.config}),e.targetId==="melodic-pink-export"&&Vje({materialEntry:n.materialEntry,transferPlan:o,audioPaintImportDetail:n.audioPaintImportDetail,baseHz:r.baseHz,machineId:e.machineId})}function Gje(){return{sourceKind:"material",renderMode:"flowing",anchorGridStep:null,synthPattern:null,synthPatch:null,formantWindowPlan:null}}function Hje(e){typeof window>"u"||e.transferPlan.rootFollowMembershipConfig!=="none"&&ri("rootFollowBankMembership",{entryId:e.materialEntryId,enabled:!0,activate:!0,config:e.transferPlan.rootFollowMembershipConfig==="material-flowing"?Gje():e.transferPlan.rootFollowMembershipConfig==="artifact-config"?e.rootFollowConfig??null:null})}function Vje(e){if(!(typeof window>"u")){if(e.transferPlan.melodicHandoffKind==="raw-material"){const t={entryId:e.materialEntry.id,rootHz:e.baseHz??55,machineId:e.machineId,granular:!0};try{e.transferPlan.clearsAudioPaintPendingHandoff&&window.sessionStorage.removeItem(Tje),window.sessionStorage.setItem(B_,JSON.stringify(t))}catch{}ri("carrierIntegralRawMaterialMelodicExport",t)}else if(e.transferPlan.melodicHandoffKind==="audio-paint-field"){try{e.transferPlan.clearsRawMaterialPendingHandoff&&window.sessionStorage.removeItem(B_)}catch{}ri("carrierIntegralMelodicPinkExport",e.audioPaintImportDetail)}ri("openCanonicalMelodicLoop",{reason:e.transferPlan.melodicHandoffKind==="raw-material"?"carrier-integral-raw-material-export":"carrier-integral-pink-export",entryId:e.materialEntry.id})}}async function Wje(e){const t=Pze({entry:e.entry,snapshot:e.snapshot,machineId:e.machineId,targetId:e.targetId,targetLabel:e.targetLabel,valueSource:e.valueSource,selectionOverride:e.selectionOverride,storedSynthLab:e.storedSynthLab,currentSynthLab:e.currentSynthLab,previewBpm:e.previewBpm,previewVolume:e.previewVolume,previewPitchSemitones:e.previewPitchSemitones}),n=Lje(e,t),r=await Bje(e,n),a=zje(e,n,r);return jje(e,n,a),{ok:!0,projectName:e.entry.name,machineId:e.machineId,machineLabel:t.machineLabel,targetId:e.targetId,targetLabel:e.targetLabel,targetName:t.targetName,transferPlan:t.transferPlan,materialEntry:a.materialEntry,rootFollowConfig:n.artifact.config,audioPaintImportDetail:a.audioPaintImportDetail,renderedAudio:{peak:r.renderedStats.peak,rms:r.renderedStats.rms,durationSec:r.renderedDurationSec,sampleRate:r.renderedBuffer.sampleRate,blobSize:typeof r.renderedBlob.size=="number"?r.renderedBlob.size:0,audioIdentityKey:r.audioIdentityKey,audioIdentitySource:r.audioIdentitySource},warnings:t.transferPlan.requiresAudibleRenderedBody&&r.renderedStats.peak<=.001?["Material body is only slightly above the audibility threshold."]:[],uiMessage:`${e.targetLabel} · ${t.targetName}`}}function qje(e){const t={version:1,reportKind:"xensonar-carrier-gesture-sample-save-probe",generatedAtIso:new Date().toISOString(),...e};return typeof window<"u"&&(window.__xensonarCarrierGestureSampleSaveProbeReport=t,window.__xensonarReadCarrierGestureSampleSaveProbe=()=>window.__xensonarCarrierGestureSampleSaveProbeReport??null),t}function Qje(){typeof window>"u"||window.__xensonarReadCarrierGestureSampleSaveProbe||(window.__xensonarReadCarrierGestureSampleSaveProbe=()=>window.__xensonarCarrierGestureSampleSaveProbeReport??null)}function KK(e){return Ti({version:"spectral-forge-transport-preview-request-v2",route:e.routeKind,renderVersion:e.renderVersion,synthMode:e.synthMode,waveformMix:e.waveformMix,bars:Math.round(e.bars*1e3),bpm:Math.round(e.bpm*10),beatsPerBar:e.beatsPerBar??4,carrierIntegral:Uje(e)})}function Uje(e){return e.routeKind!=="basis-hearing"?null:{machineId:e.machineId??null,source:e.carrierIntegralSource??null,presetId:e.carrierIntegralPreset??null,bodySourceMode:e.carrierIntegralBodySource??null,paramsPatch:e.carrierIntegralParams??{},synthLab:Kje(e.synthLab),harmonicXplore:$je(e.harmonicXplore)}}function Kje(e){const t=e;return{presetId:t?.presetId??null,paramsPatch:t?.paramsPatch??{}}}function $je(e){const t=e;return{profileId:t?.profileId??null,seriesType:t?.seriesType??null,phase:t?.phase??null,count:t?.count??null,rolloff:t?.rolloff??null,registerFold:t?.registerFold??null,detailDensity:t?.detailDensity??null,detailMode:t?.detailMode??null}}function Xje(e){const t=Zp(e.materialExport.bars,e.materialExport.bpm,e.materialExport.beatsPerBar),n=Ar/Math.max(.05,t),r=!e.donorSelected&&!(e.variant==="forge3"&&e.hasSourceAsset&&e.sourceAssetContext==="forge3_main"&&e.sourcePreviewMode==="forge"&&e.carrierIntegralSelection.source==="default"||e.hasSourceAsset&&e.sourcePreviewMode!=="forge"||e.carrierIntegralSelection.source!=="default"),a=e.donorSelected?"none":r?"spectral":e.carrierIntegralSelection.source!=="default"?"basis-hearing":"none",o=w_e(a)&&(e.variant==="forge3"||e.carrierIntegralSelection.machineId!=="raw-darkpsy-oscillator"),i=e.donorSelected||R_e(a),s=!!e.materialExport.loopPreview,l=KK({routeKind:a,renderVersion:e.renderVersion,synthMode:e.synthMode,waveformMix:e.waveformMix,machineId:e.carrierIntegralSelection.machineId,carrierIntegralSource:e.carrierIntegralSelection.source,carrierIntegralPreset:e.carrierIntegralSelection.presetId,carrierIntegralBodySource:e.carrierIntegralSelection.bodySourceMode,carrierIntegralParams:e.carrierIntegralSelection.paramsPatch,synthLab:e.carrierIntegralSynthLab,harmonicXplore:e.carrierIntegralHarmonicXplore,bars:e.materialExport.bars,bpm:e.materialExport.bpm,beatsPerBar:e.materialExport.beatsPerBar}),c={requestKey:l,routeKind:a};return{previewDurationSec:t,previewPlaybackRate:n,previewRenderRouteKind:a,previewRenderCanAutoAfterPaint:o,previewLoopAppliesToCurrentRoute:i,previewLoopEnabled:s,currentPreviewPreparedToken:l,currentPreviewRequest:c}}function Yje(e){return{spectralData:e.spectralData,synthMode:e.synthMode,waveformMix:e.waveformMix,routeKind:e.preview.previewRenderRouteKind,token:e.preview.currentPreviewPreparedToken,machineId:e.carrierIntegralSelection.machineId,selection:e.carrierIntegralSelection,synthLab:e.carrierIntegralSynthLab,harmonicXplore:e.carrierIntegralHarmonicXplore,previewBpm:e.previewBpm}}function uA(e){const t=e.routeKind==="basis-hearing";switch(e.phase){case"start":return t?"Finishing listening-mode render":"Preview rendering is finishing";case"stale":return t?"Listening mode waiting for the latest control values":"Preview is waiting for the latest state";case"ready":return t?e.rendered?"Listening mode fully rendered":"Listening mode ready from cache":e.rendered?"Preview fully rendered":"Preview ready from cache";case"unprepared":return t?"Listening mode cannot be prepared yet":"Preview cannot be prepared yet";case"failed":return t&&typeof __Fractalia!=="undefined"&&pe.getState().carrierIntegralSelection?.machineId==="fractalia-self-carrier"?"Fractalia playback interrupted · "+(__Fractalia.lastError()||"audio/transport error"):t?"Listening mode could not be prepared":"Preview could not be prepared";default:return t?"Listening mode is being prepared":"Preview is being prepared"}}const t6e=e=>Math.max(0,Math.min(1,Number.isFinite(e)?e:0));function dA(e){switch(e.kind){case"scheduled":case"prewarming":case"ready":case"playing":return e.requestKey;case"stale":return e.currentKey;case"error":return e.requestKey??null;case"idle":case"dirty":default:return null}}function n6e(e,t){switch(t.type){case"markDirty":return{kind:"dirty",reason:t.reason,routeKind:t.routeKind};case"schedule":return{kind:"scheduled",requestKey:t.requestKey,routeKind:t.routeKind,reason:t.reason};case"prewarmStart":return{kind:"prewarming",requestKey:t.requestKey,routeKind:t.routeKind,progress:0};case"prewarmProgress":{const n=dA(e);return n&&n!==t.requestKey?{kind:"stale",previousKey:t.requestKey,currentKey:n,routeKind:t.routeKind}:{kind:"prewarming",requestKey:t.requestKey,routeKind:t.routeKind,progress:t6e(t.progress)}}case"ready":{const n=dA(e);return n&&n!==t.requestKey?{kind:"stale",previousKey:t.requestKey,currentKey:n,routeKind:t.routeKind}:{kind:"ready",requestKey:t.requestKey,routeKind:t.routeKind,cacheHit:t.cacheHit}}case"playStart":{const n=dA(e);return n&&n!==t.requestKey?{kind:"stale",previousKey:t.requestKey,currentKey:n,routeKind:t.routeKind}:{kind:"playing",requestKey:t.requestKey,routeKind:t.routeKind,loop:t.loop}}case"playEnd":{const n=dA(e);return n&&n!==t.requestKey?{kind:"stale",previousKey:t.requestKey,currentKey:n,routeKind:t.routeKind}:{kind:"ready",requestKey:t.requestKey,routeKind:t.routeKind,cacheHit:!0}}case"staleResult":return{kind:"stale",previousKey:t.previousKey,currentKey:t.currentKey,routeKind:t.routeKind};case"error":return{kind:"error",requestKey:t.requestKey,routeKind:t.routeKind,message:t.message};default:return e}}function r6e(){const[e,t]=P.useState({preparedRequestKey:null,prewarmRendering:!1,prewarmProgress:0}),n=P.useRef(!1),r=P.useRef(!1),a=P.useRef(0),o=P.useRef(null),i=P.useRef(null),s=P.useCallback(E=>{const F=i.current;return F?.requestKey===E?F.payload:null},[]),l=P.useCallback((E,F)=>{i.current={requestKey:E,payload:F}},[]),c=P.useCallback(E=>{(!E||i.current?.requestKey===E)&&(i.current=null)},[]),d=P.useCallback(E=>{t(F=>{const L=typeof E=="function"?E(F.preparedRequestKey):E;return F.preparedRequestKey===L?F:{...F,preparedRequestKey:L}})},[]),p=P.useCallback(E=>{t(F=>F.prewarmRendering===E?F:{...F,prewarmRendering:E})},[]),f=P.useCallback(E=>{t(F=>Object.is(F.prewarmProgress,E)?F:{...F,prewarmProgress:E})},[]),b=P.useCallback(()=>n.current,[]),g=P.useCallback(()=>{r.current=!0},[]),y=P.useCallback(()=>n.current?(r.current=!0,!1):(n.current=!0,!0),[]),x=P.useCallback(()=>(n.current=!1,r.current),[]),A=P.useCallback(()=>n.current?(r.current=!0,!0):!1,[]),M=P.useCallback(()=>r.current,[]),v=P.useCallback(()=>{const E=r.current;return r.current=!1,E},[]),w=P.useCallback(()=>(a.current+=1,a.current),[]),R=P.useCallback(E=>a.current===E,[]),k=P.useCallback(()=>{o.current!==null&&(window.clearTimeout(o.current),o.current=null)},[]),I=P.useCallback(E=>{o.current!==null&&o.current!==E&&window.clearTimeout(o.current),o.current=E},[]);return{transportPrewarmState:e,getTransportPreparedPayload:s,rememberTransportPreparedPayload:l,clearTransportPreparedPayload:c,setTransportPreparedRequestKey:d,setTransportPrewarmRendering:p,setTransportPrewarmProgress:f,isSerialPrewarmInFlight:b,beginTransportSerialPrewarmRun:y,finishTransportSerialPrewarmRun:x,requestTransportSerialPrewarmRerun:g,requestTransportSerialPrewarmRerunIfInFlight:A,hasSerialPrewarmRerun:M,consumeSerialPrewarmRerun:v,beginTransportPrewarmSchedule:w,isCurrentTransportPrewarmSchedule:R,setTransportPrewarmTimer:I,clearTransportPrewarmTimer:k}}const a6e=48;function o6e(e,t){for(;e.size>t;){const n=e.keys().next().value;if(!n)break;e.delete(n)}}function $K(e={}){const t=e.maxPreparedEntries??a6e,n=P.useRef({kind:"idle"}),r=P.useRef(null),{transportPrewarmState:a,getTransportPreparedPayload:o,rememberTransportPreparedPayload:i,clearTransportPreparedPayload:s,setTransportPreparedRequestKey:l,setTransportPrewarmRendering:c,setTransportPrewarmProgress:d,isSerialPrewarmInFlight:p,beginTransportSerialPrewarmRun:f,finishTransportSerialPrewarmRun:b,requestTransportSerialPrewarmRerun:g,requestTransportSerialPrewarmRerunIfInFlight:y,hasSerialPrewarmRerun:x,consumeSerialPrewarmRerun:A,beginTransportPrewarmSchedule:M,isCurrentTransportPrewarmSchedule:v,setTransportPrewarmTimer:w,clearTransportPrewarmTimer:R}=r6e(),k=P.useRef(0),I=P.useRef(new Map),E=P.useRef(new Map),F=P.useCallback(te=>{n.current=n6e(n.current,te)},[]),L=P.useCallback(()=>n.current,[]),B=P.useCallback(()=>r.current,[]),O=P.useCallback(te=>{F({type:"schedule",requestKey:te.requestKey,routeKind:te.routeKind,reason:te.reason})},[F]),T=P.useCallback(te=>{F({type:"prewarmStart",requestKey:te.requestKey,routeKind:te.routeKind})},[F]),_=P.useCallback(te=>{F({type:"prewarmProgress",requestKey:te.requestKey,routeKind:te.routeKind,progress:te.progress})},[F]),G=P.useCallback(te=>{F({type:"ready",requestKey:te.requestKey,routeKind:te.routeKind,cacheHit:te.cacheHit})},[F]),j=P.useCallback(te=>{F({type:"staleResult",previousKey:te.previousKey,currentKey:te.currentKey,routeKind:te.routeKind})},[F]),N=P.useCallback(te=>{F({type:"error",requestKey:te.requestKey,routeKind:te.routeKind,message:te.message})},[F]),W=P.useCallback(te=>{F({type:"playStart",requestKey:te.requestKey,routeKind:te.routeKind,loop:te.loop})},[F]),V=P.useCallback(te=>{F({type:"playEnd",requestKey:te.requestKey,routeKind:te.routeKind})},[F]),U=P.useCallback(()=>(k.current+=1,k.current),[]),H=P.useCallback(te=>k.current===te,[]),q=P.useCallback(te=>I.current.get(te)??null,[]),K=P.useCallback((te,X)=>{I.current.set(te,X),o6e(I.current,t)},[t]),Y=P.useCallback((te,X,Q)=>{const ne=E.current.get(te);if(ne)return ne;Q?.();const ee=X().finally(()=>{if(E.current.get(te)===ee)E.current.delete(te)});return E.current.set(te,ee),ee},[]),J=P.useCallback(te=>{const X=r.current;return!!X&&X.identity.requestKey===te.identity.requestKey&&X.identity.routeKind===te.identity.routeKind},[]),Z=P.useMemo(()=>({getState:L,getCurrentRequest:B,isCurrentRequest:J,schedule:te=>{r.current=te,O({...te.identity,reason:te.reason})},beginPrewarm:te=>{if(!J(te)){const X=r.current;return X&&j({previousKey:te.identity.requestKey,currentKey:X.identity.requestKey,routeKind:te.identity.routeKind}),!1}return T(te.identity),!0},reportProgress:(te,X)=>{J(te)&&_({...te.identity,progress:X})},markReady:(te,X)=>{J(te)&&G({...te.identity,cacheHit:X})},markStale:te=>{const X=r.current;X&&j({previousKey:te.identity.requestKey,currentKey:X.identity.requestKey,routeKind:te.identity.routeKind})},markError:(te,X)=>{J(te)&&N({...te.identity,message:X})},canPlay:te=>{const X=L();return J(te)&&(X.kind==="ready"||X.kind==="playing")&&X.routeKind===te.identity.routeKind&&X.requestKey===te.identity.requestKey},markPlaying:te=>{J(te)&&W({...te.identity,loop:te.loopPreview})},markPlayEnded:te=>{J(te)&&V(te.identity)}}),[B,L,N,W,V,_,T,G,j,J,O]);const __f449DropPrepared=P.useCallback(()=>{
  // The working drawing and listening selection live in pe / session stores.
  // These maps contain only Forge-owned preview results and inflight requests.
  k.current++;n.current={kind:"idle"};r.current=null;I.current.clear();E.current.clear();
  s();l(null);c(false);d(0);R();
 },[s,l,c,d,R]);
 return{discardRoomPreview:__f449DropPrepared,recordEvent:F,scheduleRequest:O,markPrewarmStart:T,markPrewarmProgress:_,markReady:G,markStale:j,markError:N,markPlaying:W,markPlayEnded:V,previewSessionDriver:Z,getSessionState:L,transportPrewarmState:a,getTransportPreparedPayload:o,rememberTransportPreparedPayload:i,clearTransportPreparedPayload:s,setTransportPreparedRequestKey:l,setTransportPrewarmRendering:c,setTransportPrewarmProgress:d,isSerialPrewarmInFlight:p,beginTransportSerialPrewarmRun:f,finishTransportSerialPrewarmRun:b,requestTransportSerialPrewarmRerun:g,requestTransportSerialPrewarmRerunIfInFlight:y,hasSerialPrewarmRerun:x,consumeSerialPrewarmRerun:A,beginTransportPrewarmSchedule:M,isCurrentTransportPrewarmSchedule:v,setTransportPrewarmTimer:w,clearTransportPrewarmTimer:R,beginGeneration:U,isCurrentGeneration:H,getPreparedEntry:q,rememberPreparedEntry:K,getOrStartInflight:Y}}function i6e(e){return e==="basis-hearing"?{coldIdleMs:520,firstDelayMs:160,retryDelayMs:140}:{coldIdleMs:2e3,firstDelayMs:80,retryDelayMs:80}}function s6e(){const e=P.useRef(!1),t=P.useRef(typeof performance<"u"?performance.now():0);return P.useEffect(()=>{const r=()=>{t.current=performance.now()},a=()=>{e.current=!0,r()},o=()=>{e.current=!1,r()},i=()=>{r()};return window.addEventListener("pointerdown",a,{passive:!0}),window.addEventListener("pointerup",o,{passive:!0}),window.addEventListener("pointercancel",o,{passive:!0}),window.addEventListener("wheel",i,{passive:!0}),()=>{window.removeEventListener("pointerdown",a),window.removeEventListener("pointerup",o),window.removeEventListener("pointercancel",o),window.removeEventListener("wheel",i)}},[]),{getQuietWindowState:P.useCallback((r,a=performance.now())=>{const o=i6e(r),i=a-t.current,s=e.current,l=Math.max(0,o.coldIdleMs-i);return{...o,pointerDown:s,quietForMs:i,remainingQuietMs:l,blocked:s||i<o.coldIdleMs}},[])}}async function l6e(e){const t=await new Promise(r=>e.toBlob(r,"image/png"));if(!t)throw new Error("Could not prepare image after downscaling");const n=URL.createObjectURL(t);OV(n,t,"clone-image-element-from-canvas","spectralForge/ImageImporter.cloneImageElementFromCanvas");try{return await new Promise((r,a)=>{const o=new Image;o.onload=()=>r(o),o.onerror=()=>a(new Error("Could not load image after downscaling")),o.src=n})}finally{URL.revokeObjectURL(n),_V(n,"spectral-forge-canvas-clone-url-revoked")}}function c6e(e,t,n){const r=n?.maxPixels??42e5,a=n?.maxDimension??2304,o=Math.sqrt(r/Math.max(1,e*t)),i=a/Math.max(e,t,1);return Math.min(1,o,i)}async function XK(e,t){const n=URL.createObjectURL(e);OV(n,e,"load-image-element-from-file","spectralForge/ImageImporter.loadImageElementFromFile");try{const r=await new Promise((s,l)=>{const c=new Image;c.onload=()=>s(c),c.onerror=()=>l(new Error("Image could not be loaded")),c.src=n}),a=c6e(r.naturalWidth,r.naturalHeight,t);if(a>=.999)return r;const o=document.createElement("canvas");o.width=Math.max(1,Math.round(r.naturalWidth*a)),o.height=Math.max(1,Math.round(r.naturalHeight*a));const i=o.getContext("2d");return i?(i.imageSmoothingEnabled=!0,i.imageSmoothingQuality="high",i.drawImage(r,0,0,o.width,o.height),await l6e(o)):r}finally{URL.revokeObjectURL(n),_V(n,"spectral-forge-file-image-url-revoked")}}function Gl(e){return Math.max(0,Math.min(1,e))}function u6e(e,t,n,r,a){const o=a.fitMode;if(o==="stretch")return{dx:0,dy:0,drawWidth:n,drawHeight:r};const i=o==="crop"?Math.max(n/e,r/t):Math.min(n/e,r/t),s=e*i,l=t*i;if(o==="crop"){const p=Math.max(0,s-n),f=Math.max(0,l-r),b=Math.max(-1,Math.min(1,a.shiftX)),g=Math.max(-1,Math.min(1,a.shiftY)),y=-p*((b+1)*.5),x=-f*((g+1)*.5);return{dx:y,dy:x,drawWidth:s,drawHeight:l}}const c=o==="containRight"?n-s:0,d=(r-l)*.5;return{dx:c,dy:d,drawWidth:s,drawHeight:l}}function YK(e,t,n,r,a,o,i){e.save(),e.fillStyle="#ffffff",e.fillRect(0,0,o,i),e.imageSmoothingEnabled=!0,e.imageSmoothingQuality="high";const{dx:s,dy:l,drawWidth:c,drawHeight:d}=u6e(n,r,o,i,a);e.drawImage(t,s,l,c,d),e.restore()}function d6e(e,t,n,r,a){const o=(l,c)=>{const d=Math.max(0,Math.min(t-1,l)),p=Math.max(0,Math.min(n-1,c));return e[p*t+d]??1},i=-o(r-1,a-1)+o(r+1,a-1)-2*o(r-1,a)+2*o(r+1,a)-o(r-1,a+1)+o(r+1,a+1),s=o(r-1,a-1)+2*o(r,a-1)+o(r+1,a-1)-o(r-1,a+1)-2*o(r,a+1)-o(r+1,a+1);return Math.sqrt(i*i+s*s)*.25}function m6e(e,t,n,r,a){let o=0,i=0;for(let s=-1;s<=1;s++)for(let l=-1;l<=1;l++){const c=Math.max(0,Math.min(t-1,r+l)),d=Math.max(0,Math.min(n-1,a+s));o+=e[d*t+c]??1,i++}return i>0?o/i:1}async function JK(e,t,n,r){const a=t.width,o=t.height,i=document.createElement("canvas");i.width=a,i.height=o;const s=i.getContext("2d",{willReadFrequently:!0});if(!s)throw new Error("Could not create canvas context");r?.(.08),YK(s,e,e.naturalWidth,e.naturalHeight,n,a,o),r?.(.28);const c=s.getImageData(0,0,a,o).data;const target=t;t=new t.constructor(a,o);const d=new Float32Array(a*o),p=new Float32Array(a*o);for(let y=0;y<o;y++)for(let x=0;x<a;x++){const A=(y*a+x)*4,M=c[A]??255,v=c[A+1]??255,w=c[A+2]??255,R=(c[A+3]??255)/255,k=(.2126*M+.7152*v+.0722*w)/255;d[y*a+x]=k,p[y*a+x]=R}const f=n.contrast*.55,b=1+n.contrast*2.4,g=1+n.contrast*1.8;for(let y=0;y<o;y++){const x=Math.max(.18,Math.min(.92,.9-y/Math.max(1,o-1)*.52));for(let A=0;A<a;A++){const M=y*a+A,v=d[M]??1,w=p[M]??1,R=Gl((1-v)*w),k=Gl((1-m6e(d,a,o,A,y))*w),I=Gl(d6e(d,a,o,A,y)*w*g);let E=0;if(n.readMode==="legacy")R>f&&(E=(R-f)/Math.max(1e-6,1-f),E=Math.pow(Gl(E),b));else if(n.readMode==="contour"){const F=Math.max(0,I-f*.55);E=Math.pow(Gl(F),.72+(1-n.contrast)*.35),E*=.82+R*.28}else{const F=R>f?Math.pow(Gl((R-f)/Math.max(1e-6,1-f)),b):0,L=Math.pow(Gl(Math.max(0,I-f*.4)),.8),B=Math.pow(Gl(Math.max(0,k-f*.8)),1.1);E=Gl(F*.55+L*.65+B*.35)}if(t.data[M]=E,E>.001){const F=n.readMode==="contour"?.18:n.readMode==="hybrid"?.08:0;t.grainData[M]=Gl(x-I*F+k*.08)}else t.grainData[M]=.5}y%24===0&&(r?.(.28+.72*(y/Math.max(1,o-1))),await new Promise(A=>setTimeout(A,0)))}target.restoreData(t.cloneData());target.melodicCarrier=null;return r?.(1),{imageWidth:e.naturalWidth,imageHeight:e.naturalHeight,fitMode:n.fitMode,contrast:n.contrast,readMode:n.readMode}}const HE=.86;function p6e(e){const[t,n]=P.useState(null),[r,a]=P.useState(null),o=P.useRef(null),i=P.useRef(null),s=P.useRef(null),l=P.useRef(!1);P.useEffect(()=>{const M=t,v=i.current;if(!M||!v)return;const w=v.getContext("2d");w&&YK(w,M.image,M.image.naturalWidth,M.image.naturalHeight,{fitMode:M.fitMode,shiftX:M.shiftX,shiftY:M.shiftY,contrast:M.hardContrast?HE:M.contrast,readMode:M.readMode},v.width,v.height)},[t]),P.useEffect(()=>{const M=r,v=s.current;if(!M||!v)return;const w=v.getContext("2d");if(!w)return;const R=sg(M.source,{startSec:M.startSec});L4e(w,R,v.width,v.height,"window")},[r]);const c=P.useCallback(()=>{n(null),e.setWorkflowProgress(0)},[e.setWorkflowProgress]),d=P.useCallback(()=>{a(null),e.setWorkflowProgress(0)},[e.setWorkflowProgress]),p=P.useCallback(async M=>{e.setWorkflowBusy(!0),e.setWorkflowProgress(.05),e.setStatusMessage(`Dekodiere Audio ${M.name}...`);try{const v=await Cg(M,w=>e.setWorkflowProgress(w));a({file:M,source:v,startSec:0,readMode:"legacy"}),e.setStatusMessage(`Audio ready: ${v.originalDuration.toFixed(2)} s · ${v.channelCount} channels`),window.setTimeout(()=>e.setStatusMessage(""),1800)}catch(v){console.error("Audio preload error:",v),e.setStatusMessage("Audio could not be decoded"),window.setTimeout(()=>e.setStatusMessage(""),2600)}finally{e.setWorkflowBusy(!1),e.setWorkflowProgress(0)}},[e.setWorkflowProgress,e.setWorkflowBusy,e.setStatusMessage]),f=P.useCallback(async M=>{if(l.current){e.setStatusMessage("Image import is already running ..."),window.setTimeout(()=>e.setStatusMessage(""),1600);return}l.current=!0,e.setWorkflowBusy(!0),e.setWorkflowProgress(.08),e.setStatusMessage(`Loading image ${M.name} defensively...`);try{const v=await XK(M,{maxPixels:42e5,maxDimension:2304});n({file:M,image:v,fitMode:"containLeft",shiftX:0,shiftY:0,contrast:.22,hardContrast:!1,readMode:"legacy"}),e.setStatusMessage(`Image ready: ${v.naturalWidth}×${v.naturalHeight}`),window.setTimeout(()=>e.setStatusMessage(""),1800)}catch(v){console.error("Image preload error:",v),e.setStatusMessage("Image could not be loaded"),window.setTimeout(()=>e.setStatusMessage(""),2600)}finally{l.current=!1,e.setWorkflowBusy(!1),e.setWorkflowProgress(0)}},[e.setWorkflowProgress,e.setWorkflowBusy,e.setStatusMessage]),b=P.useCallback(async M=>{const v=M.target.files?.[0];if(v)try{v.type.startsWith("image/")?await f(v):e.variant!=="forge3"?await p(v):(e.setStatusMessage("Audio enters SpectralForge through Material Intake directly below the spectral workbench."),window.setTimeout(()=>e.setStatusMessage(""),2600))}finally{M.target.value=""}},[e.setStatusMessage,e.variant,p,f]),g=P.useCallback(async()=>{const M=r;if(M){e.setWorkflowBusy(!0),e.setWorkflowProgress(0),e.setStatusMessage(`Importiere Audio ${M.file.name}...`);try{e.isPlaying&&(xt.stop(),e.setIsPlaying(!1)),e.pushUndo();const v=sg(M.source,{startSec:M.startSec}),w=await PB(v,e.spectralData,{readMode:M.readMode},k=>e.setWorkflowProgress(k*.62)),R=await av(v,k=>e.setWorkflowProgress(.62+k*.38));e.setSourceAsset(R,"forge3_main"),xt.invalidateBuffer(),e.triggerRender(),e.setPlayheadPosition(0),e.setSourcePreviewMode("forge"),e.setStatusMessage(w.originalDuration>Ar?`Audio imported: window ${w.importStartSec.toFixed(2)} s → ${(w.importStartSec+w.importedDuration).toFixed(2)} s · ${M.readMode==="legacy"?"Legacy":M.readMode==="transient"?"Transient":"Hybrid"} · source remains previewable`:`Audio imported: ${w.importedDuration.toFixed(2)} s · ${M.readMode==="legacy"?"Legacy":M.readMode==="transient"?"Transient":"Hybrid"} · source remains previewable`),window.setTimeout(()=>e.setStatusMessage(""),3200),d()}catch(v){console.error("Audio import error:",v),e.setStatusMessage("Audio import failed"),window.setTimeout(()=>e.setStatusMessage(""),2600)}finally{e.setWorkflowBusy(!1)}}},[e.isPlaying,e.pushUndo,e.setIsPlaying,e.setPlayheadPosition,e.setWorkflowProgress,e.setWorkflowBusy,e.setSourceAsset,e.setSourcePreviewMode,e.setStatusMessage,e.spectralData,e.triggerRender,d,r]),y=P.useCallback(async()=>{const M=t;if(M){e.setWorkflowBusy(!0),e.setWorkflowProgress(0),e.setStatusMessage(`Importing image ${M.file.name}...`);try{e.isPlaying&&(xt.stop(),e.setIsPlaying(!1)),e.pushUndo();const v=await JK(M.image,e.spectralData,{fitMode:M.fitMode,shiftX:M.shiftX,shiftY:M.shiftY,contrast:M.hardContrast?HE:M.contrast,readMode:M.readMode},w=>e.setWorkflowProgress(w));e.setSourceAsset(null),e.setSourcePreviewMode("forge"),xt.invalidateBuffer(),e.triggerRender(),e.setPlayheadPosition(0),e.setShowPlayheadMarker(!1),e.setStatusMessage(`Image imported: ${v.imageWidth}×${v.imageHeight} → ${M.readMode==="legacy"?"Legacy":M.readMode==="contour"?"Contour":"Hybrid"} · ${M.fitMode==="crop"?"Crop":M.fitMode==="stretch"?"Stretch":M.fitMode==="containLeft"?"align left":"align right"} · ${M.hardContrast?"hard contrast":`Kontrast ${M.contrast.toFixed(2)}`}`),window.setTimeout(()=>e.setStatusMessage(""),2600),c()}catch(v){console.error("Image import error:",v),e.setStatusMessage("Image import failed"),window.setTimeout(()=>e.setStatusMessage(""),2600)}finally{e.setWorkflowBusy(!1)}}},[e.isPlaying,e.pushUndo,e.setIsPlaying,e.setPlayheadPosition,e.setWorkflowProgress,e.setWorkflowBusy,e.setShowPlayheadMarker,e.setSourceAsset,e.setSourcePreviewMode,e.setStatusMessage,e.spectralData,e.triggerRender,c,t]),x=P.useCallback(M=>{n(v=>v&&{...v,...M})},[]),A=P.useCallback(M=>{a(v=>v&&{...v,...M})},[]);return{pendingImageImport:t,pendingAudioImport:r,fileInputRef:o,imagePreviewCanvasRef:i,audioPreviewCanvasRef:s,closeImageImport:c,closeAudioImport:d,handleImportFile:b,handleConfirmAudioImport:g,handleConfirmImageImport:y,updatePendingImageImport:x,updatePendingAudioImport:A}}function Xk(e){return e.trim().toLowerCase().replace(/[^a-z0-9-_]+/g,"-").replace(/^-+|-+$/g,"")||"spectral-material"}function Yk(e,t,n){const r=URL.createObjectURL(e);DV(r,e,t,n);const a=document.createElement("a");a.href=r,a.download=t,a.click(),URL.revokeObjectURL(r),NV(r,"spectral-forge-transport-download-url-revoked")}const h6e=[{id:"forge",label:"Forge"},{id:"sourceWindow",label:"Original · Window"},{id:"sourceFull",label:"Original · Full"}],f6e={width:42,minWidth:42,height:34,minHeight:34,padding:0};function g6e(e){const t=e.isPlaying&&!e.rendering?"⏸":"▶",n=e.renderFillActive?"border-neutral-300 bg-neutral-700 text-white shadow-inner disabled:cursor-progress":e.isPlaying?"border-red-400/40 bg-red-600 text-white hover:bg-red-500":e.previewReadyForImmediatePlay?"border-green-400/40 bg-green-600 text-white hover:bg-green-500":"border-neutral-500/60 bg-neutral-700 text-neutral-100 hover:bg-neutral-600";return e.renderFillActive?{symbol:t,className:Xb(n),title:`Preparing preview · ${e.renderFillPercent}%`,screenReaderLabel:`Preparing preview · ${e.renderFillPercent} percent`}:e.isPlaying?{symbol:t,className:Xb(n),title:"Pause Preview",screenReaderLabel:"Pause Preview"}:e.previewReadyForImmediatePlay?{symbol:t,className:Xb(n),title:"Preview ready · starts immediately",screenReaderLabel:"Preview ready, starts immediately"}:e.previewRenderRouteKind==="basis-hearing"?{symbol:t,className:Xb(n),title:"Listening mode is rendered automatically",screenReaderLabel:"Listening mode is rendered automatically"}:{symbol:t,className:Xb(n),title:"Preview not rendered yet",screenReaderLabel:"Preview not rendered yet"}}function Xb(e){return`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded border font-bold text-lg leading-none transition-[border-color,box-shadow,transform] duration-150 ${e}`}function b6e(e,t){const n=e*t,r=Math.floor(n/60),a=n%60;return`${r}:${a.toFixed(2).padStart(5,"0")}`}function S6e(e){if(e.variant==="forge3"&&e.hasSourceAsset&&e.sourcePreviewMode==="forge")return`Preview ${e.previewDurationSec.toFixed(2)}s`;if(e.hasSourceAsset&&e.sourcePreviewMode!=="forge"){if(e.sourcePreviewMode==="sourceFull")return`Source ${(e.sourceOriginalDuration??0).toFixed(2)}s`;const t=e.sourceImportStartSec??0,n=t+(e.sourceImportDurationSec??0);return`Fenster ${t.toFixed(2)}–${n.toFixed(2)}s`}return`Preview ${e.previewDurationSec.toFixed(2)}s`}function v6e(e){const t=e.routeKind==="basis-hearing"&&e.bridgeRequestKey===e.currentRequestKey&&e.bridgeMachineId===e.currentMachineId&&e.bridgePhase!=="idle",n=t&&e.bridgePhase==="preparing"&&!e.isPlaying,r=n?Math.max(4,Math.min(99,Math.round(e.bridgeProgress*100))):0;return{matchesCurrentRoute:t,fillActive:n,fillPercent:r}}function A6e(e){const t=[{key:"undo-domain",label:e.undoBadgeLabel,title:"Global undo acts on the workbench here.",className:"rounded border border-neutral-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-neutral-300"}];return e.sourceAssetContext==="forge3_main"&&t.push({key:"source-loaded",label:"Source Loaded",title:"An audio source is loaded and available to SpectralForge as material.",className:"rounded border border-neutral-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-neutral-300"}),e.forge3BodyActive&&t.push({key:"source-prepared",label:"Source Prepared",title:"The loaded source is prepared for SpectralForge.",className:"rounded border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-1 text-[10px] text-fuchsia-200"}),t.push({key:"body-label",label:e.forge3BodyLabel,title:"Shows whether the coupled body path currently belongs to the Forge preview.",className:"rounded border border-neutral-700 bg-neutral-950/80 px-2 py-1 text-[10px] text-neutral-300"}),t}function x6e(e){const __f345BusyRef=P.useRef(false);const t=P.useCallback(()=>__ForgeDonorRoutingF317.guardExport(()=>__f333ExportCurrent(pe.getState(),{audioMode:e.forge3AudioMode,onProgress:e.setWorkflowProgress})),[e.forge3AudioMode,e.setWorkflowProgress]),n=P.useCallback(()=>__f333CurrentLabel(pe.getState()),[]),r=P.useCallback(async(format='wav')=>{
  if(__f345BusyRef.current)return;
  __f345BusyRef.current=true;
  const flac=format==='flac';
  e.setWorkflowBusy(!0);
  e.setStatusMessage(`${n()} als ${flac?'FLAC':'WAV'} vorbereiten …`);
  try{
    const name=Xk(e.materialExport.name),label=Xk(n());
    let blob;
    if(flac){
      let last=-1;
      blob=await __ForgeDonorRoutingF317.guardExport(()=>__f345ExportFlacCurrent(pe.getState(),{
        audioMode:e.forge3AudioMode,onProgress:e.setWorkflowProgress,
        onEncodeProgress:p=>{
          const pct=Math.floor(Math.max(0,Math.min(1,p))*20)*5;
          if(pct!==last){last=pct;e.setStatusMessage(`Encoding FLAC · ${pct} %`);}
        }
      }));
    }else blob=await t();
    Yk(blob,`${name}-${label}.${flac?'flac':'wav'}`,'spectralForge/TransportBar.handleDownloadCurrentPreview');
    e.setStatusMessage(`${n()} als ${flac?'FLAC':'WAV'} heruntergeladen`);
    window.setTimeout(()=>e.setStatusMessage(''),2200);
  }catch(error){
    console.error('Current hearing download error:',error);
    e.setStatusMessage(`${n()}-${flac?'FLAC':'WAV'}-Download fehlgeschlagen: ${error instanceof Error?error.message:String(error)}`);
    window.setTimeout(()=>e.setStatusMessage(''),3500);
  }finally{__f345BusyRef.current=false;e.setWorkflowBusy(!1);e.setWorkflowProgress(0);}
},[e.materialExport.name,e.forge3AudioMode,e.setWorkflowProgress,e.setWorkflowBusy,e.setStatusMessage,t,n]),a=P.useCallback(async(destination='material')=>{
  const root=destination==='root',pink=destination==='pink';
  const destinationLabel=root?'Root Follow Loop':pink?'pinke Spur im Melodic Loop':"Material Track";
  e.setWorkflowBusy(!0);e.setStatusMessage(`${n()} an ${destinationLabel} senden …`);
  try{
   const i=await t(),s=e.getActivePreviewDuration();
   const l={
    name:e.materialExport.name,role:"loop",bpm:e.materialExport.bpm,bars:e.materialExport.bars,beatsPerBar:e.materialExport.beatsPerBar,
    guideSegments:e.materialExport.guideSegments,guideMarkers:e.materialExport.guideMarkers,
    loopStartSec:0,loopEndSec:s,rootHz:__forgeMaterialRootHz(e.materialExport.rootHz),
    sourceVersion:e.variant==='forge3'?'xensonar-forge3-preview-v1':'xensonar-l3lab-v1',
    renderMode:__f333Route(pe.getState()),
    durationSec:s,intendedLoopDurationSec:s,
    ...(root?{rootFollowPreferred:true,workspaceOrigin:'spectral-forge-rendered-hearing',routeSummary:"Rendered listening mode as an Audio Root Follow Loop"}:{}),
    ...(pink?{workspaceOrigin:'spectral-forge-rendered-hearing',routeSummary:"Rendered listening mode as a pink Melodic Loop track"}:{})
   };
   const entry=bu(Yd(l,i));
   if(root)ri('rootFollowBankMembership',{entryId:entry.id,enabled:true,activate:true,config:{sourceKind:'material',renderMode:'flowing'}});
   if(pink){
    const intent={entryId:entry.id,anchorHz:55,source:'spectral-forge-rendered-hearing'};
    try{window.sessionStorage.setItem(yx,JSON.stringify(intent))}catch{}
    ri('materialIntakeRawMelodicImport',intent);
    ri('openCanonicalMelodicLoop',{reason:'spectral-forge-rendered-hearing',entryId:entry.id});
   }
   e.setStatusMessage(`${n()} an ${destinationLabel} transferred`);
   window.setTimeout(()=>e.setStatusMessage(''),2400);
  }catch(error){
   console.error("Listening-mode transfer failed:",error);
   e.setStatusMessage(`${n()} could not be sent to ${destinationLabel} gesendet werden`);
   window.setTimeout(()=>e.setStatusMessage(''),2600);
  }finally{e.setWorkflowBusy(!1);e.setWorkflowProgress(0)}
 },[e.forge3AudioMode,e.getActivePreviewDuration,e.materialExport,e.setWorkflowProgress,e.setWorkflowBusy,e.setStatusMessage,e.sourceAsset,e.sourcePreviewMode,e.synthMode,e.variant,t,n]),o=P.useCallback(async()=>{e.setWorkflowBusy(!0),e.setStatusMessage("Exportiere Material (WAV + JSON)...");try{const i=Xk(e.materialExport.name),s=Vt.getSnapshot().selected,l=await t();Yk(l,`${i}.wav`,"spectralForge/TransportBar.handleExport.audio");const c={name:e.materialExport.name,role:"loop",bpm:e.materialExport.bpm,bars:e.materialExport.bars,beatsPerBar:e.materialExport.beatsPerBar,guideSegments:e.materialExport.guideSegments,guideMarkers:e.materialExport.guideMarkers,loopStartSec:0,loopEndSec:e.getActivePreviewDuration(),rootHz:__forgeMaterialRootHz(e.materialExport.rootHz),sourceVersion:"xensonar-l3lab-v1",renderMode:__f333Route(pe.getState()),durationSec:e.getActivePreviewDuration(),intendedLoopDurationSec:e.previewDurationSec},d=Yd(c,l);bu(d);const p=r0e(d,`${i}.wav`),f=new Blob([JSON.stringify(p,null,2)],{type:"application/json"});Yk(f,`${i}.json`,"spectralForge/TransportBar.handleExport.json"),e.setStatusMessage("Loop exported and saved in the material database"),window.setTimeout(()=>e.setStatusMessage(""),1800)}catch(i){console.error("Export error:",i),e.setStatusMessage("Export failed"),window.setTimeout(()=>e.setStatusMessage(""),2200)}finally{e.setWorkflowBusy(!1)}},[e.materialExport,e.previewDurationSec,e.setWorkflowProgress,e.setWorkflowBusy,e.setStatusMessage,e.spectralData,e.synthMode,e.waveformMix]);return{currentPreviewLabel:n,handleDownloadCurrentPreview:r,handleSendCurrentPreviewToXensonar:a,handleExport:o}}function M6e({pendingAudioImport:e,audioPreviewCanvasRef:t,rendering:n,closeAudioImport:r,updatePendingAudioImport:a,handleConfirmAudioImport:o}){return u.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4",children:u.jsxs("div",{className:"w-full max-w-5xl rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl",children:[u.jsxs("div",{className:"flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[11px] uppercase tracking-[0.3em] text-cyan-300",children:"Audio → SpectralForge"}),u.jsx("h3",{className:"text-lg font-semibold text-neutral-100",children:"Keep Source, Project Window, Continue Auditioning Original"}),u.jsx("p",{className:"mt-1 max-w-3xl text-xs leading-relaxed text-neutral-400",children:"The Forge now receives not only the 10-second projection but also retains the original source as its own asset. This lets you audition Forge resynthesis and the original window directly against each other without losing provenance."})]}),u.jsx("button",{type:"button",onClick:r,className:"rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900",children:"Close"})]}),u.jsxs("div",{className:"grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]",children:[u.jsxs("div",{className:"space-y-3",children:[u.jsx("div",{className:"rounded-xl border border-neutral-800 bg-neutral-900 p-3",children:u.jsx("canvas",{ref:t,width:800,height:220,className:"h-auto w-full rounded-lg border border-neutral-700 bg-[#060913]"})}),u.jsxs("div",{className:"grid gap-3 md:grid-cols-3",children:[u.jsxs("div",{className:"rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300",children:[u.jsx("div",{className:"text-[11px] uppercase tracking-[0.2em] text-neutral-500",children:"Source"}),u.jsx("div",{className:"mt-2 break-all font-medium text-neutral-100",children:e.file.name}),u.jsxs("div",{className:"mt-1 text-neutral-400",children:[e.source.originalDuration.toFixed(2),"s ·"," ",e.source.channelCount," channels ·"," ",e.source.sampleRate," Hz"]})]}),u.jsxs("div",{className:"rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300",children:[u.jsx("div",{className:"text-[11px] uppercase tracking-[0.2em] text-neutral-500",children:"Forge Window"}),u.jsxs("div",{className:"mt-2 font-medium text-neutral-100",children:[Math.min(Ar,e.source.originalDuration).toFixed(2),"s"]}),u.jsx("div",{className:"mt-1 text-neutral-400",children:"visible panorama surface remains 2048 × 512"})]}),u.jsxs("div",{className:"rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300",children:[u.jsx("div",{className:"text-[11px] uppercase tracking-[0.2em] text-neutral-500",children:"Zukunft"}),u.jsx("div",{className:"mt-2 text-neutral-100",children:"Original Is Preserved"}),u.jsx("div",{className:"mt-1 text-neutral-400",children:"future source-aware tools can connect to it"})]})]})]}),u.jsxs("div",{className:"space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4",children:[u.jsxs("label",{className:"block space-y-1 text-xs text-neutral-300",children:[u.jsx("span",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Window Start in Original"}),u.jsx("input",{type:"range",min:0,max:Math.max(0,e.source.originalDuration-Math.min(Ar,e.source.originalDuration)),step:.01,value:e.startSec,disabled:e.source.originalDuration<=Ar,onChange:i=>a({startSec:Number(i.target.value)}),className:"w-full accent-cyan-400 disabled:opacity-40"}),u.jsxs("div",{className:"flex justify-between text-[11px] text-neutral-500",children:[u.jsx("span",{children:"Anfang"}),u.jsxs("span",{children:[e.startSec.toFixed(2),"s"]}),u.jsx("span",{children:"End"})]})]}),u.jsxs("label",{className:"block space-y-1 text-xs text-neutral-300",children:[u.jsx("span",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Audio Interpretation / Projection"}),u.jsxs("select",{value:e.readMode,onChange:i=>a({readMode:i.target.value}),className:"w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100",children:[u.jsx("option",{value:"legacy",children:"Legacy · raw spectral mass / darkpsy"}),u.jsx("option",{value:"transient",children:"Transient · Contours / Attacks / Grooves"}),u.jsx("option",{value:"hybrid",children:"Hybrid · mix mass + contour"})]})]}),u.jsx("div",{className:"rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400",children:"First an explicit time window is selected, then the Forge projection is generated. The original source remains alongside it and can later be used for source-aware brushes, local effects, or A/B comparisons."}),u.jsx("div",{className:"rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400",children:"Legacy remains the existing raw, darkpsy-adjacent path. Transient emphasizes attacks, spectral contours, and grooves; Hybrid sits between them. This is deliberately experimental and is meant to provoke audibly different input materials."}),u.jsxs("div",{className:"flex items-center justify-between gap-3 pt-2",children:[u.jsx("button",{type:"button",onClick:r,className:"rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900",children:"Cancel"}),u.jsx("button",{type:"button",onClick:o,disabled:n,className:"rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50",children:"Import Audio into SpectralForge"})]})]})]})]})})}function w6e({pendingImageImport:e,imagePreviewCanvasRef:t,spectralWidth:n,spectralHeight:r,rendering:a,closeImageImport:o,updatePendingImageImport:i,handleConfirmImageImport:s}){return u.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4",children:u.jsxs("div",{className:"w-full max-w-5xl rounded-2xl border border-neutral-700 bg-neutral-950 shadow-2xl",children:[u.jsxs("div",{className:"flex items-start justify-between gap-4 border-b border-neutral-800 px-5 py-4",children:[u.jsxs("div",{children:[u.jsx("div",{className:"text-[11px] uppercase tracking-[0.3em] text-cyan-300",children:"Image → SpectralForge"}),u.jsx("h3",{className:"text-lg font-semibold text-neutral-100",children:"Import Asemic / Graphic Notation into Sound Surface"}),u.jsx("p",{className:"mt-1 max-w-3xl text-xs leading-relaxed text-neutral-400",children:"Left → right becomes time, top → bottom becomes pitch. Dark traces become sound; bright areas remain silent. Crop fills the surface; left/right alignment leaves space for further construction."})]}),u.jsx("button",{type:"button",onClick:o,className:"rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900",children:"Close"})]}),u.jsxs("div",{className:"grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]",children:[u.jsxs("div",{className:"space-y-3",children:[u.jsx("div",{className:"rounded-xl border border-neutral-800 bg-neutral-900 p-3",children:u.jsx("canvas",{ref:t,width:800,height:200,className:"h-auto w-full rounded-lg border border-neutral-700 bg-white"})}),u.jsxs("div",{className:"grid gap-3 md:grid-cols-3",children:[u.jsxs("div",{className:"rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300",children:[u.jsx("div",{className:"text-[11px] uppercase tracking-[0.2em] text-neutral-500",children:"Source"}),u.jsx("div",{className:"mt-2 break-all font-medium text-neutral-100",children:e.file.name}),u.jsxs("div",{className:"mt-1 text-neutral-400",children:[e.image.naturalWidth," ×"," ",e.image.naturalHeight,"px"]})]}),u.jsxs("div",{className:"rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300",children:[u.jsx("div",{className:"text-[11px] uppercase tracking-[0.2em] text-neutral-500",children:"Target"}),u.jsxs("div",{className:"mt-2 font-medium text-neutral-100",children:[n," × ",r]}),u.jsx("div",{className:"mt-1 text-neutral-400",children:"Forge Panorama Spectrum"})]}),u.jsxs("div",{className:"rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs text-neutral-300",children:[u.jsx("div",{className:"text-[11px] uppercase tracking-[0.2em] text-neutral-500",children:"Interpretation"}),u.jsx("div",{className:"mt-2 text-neutral-100",children:"Time = X · Pitch = Y"}),u.jsx("div",{className:"mt-1 text-neutral-400",children:"Legacy, Contour, or Hybrid Reading"})]})]})]}),u.jsxs("div",{className:"space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4",children:[u.jsxs("label",{className:"block space-y-1 text-xs text-neutral-300",children:[u.jsx("span",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Interpretation / Mapping"}),u.jsxs("select",{value:e.readMode,onChange:l=>i({readMode:l.target.value}),className:"w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100",children:[u.jsx("option",{value:"legacy",children:"Legacy · read dark mass directly"}),u.jsx("option",{value:"contour",children:"Contour · prioritize edges / lines"}),u.jsx("option",{value:"hybrid",children:"Hybrid · mix mass + contour"})]})]}),u.jsxs("label",{className:"block space-y-1 text-xs text-neutral-300",children:[u.jsx("span",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Fit Mode"}),u.jsxs("select",{value:e.fitMode,onChange:l=>i({fitMode:l.target.value}),className:"w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-2 text-neutral-100",children:[u.jsx("option",{value:"crop",children:"Crop / Fill Surface"}),u.jsx("option",{value:"stretch",children:"Stretch / Full Surface"}),u.jsx("option",{value:"containLeft",children:"Align Left / Leave Remainder Free"}),u.jsx("option",{value:"containRight",children:"Align Right / Leave Remainder Free"})]})]}),u.jsxs("label",{className:"flex items-center gap-2 rounded border border-neutral-800 bg-neutral-950/50 px-3 py-2 text-xs text-neutral-300",children:[u.jsx("input",{type:"checkbox",checked:e.hardContrast,onChange:l=>i({hardContrast:l.target.checked})}),u.jsx("span",{children:"Hard Contrast · filter paper noise"})]}),u.jsxs("label",{className:`block space-y-1 text-xs ${e.hardContrast?"text-neutral-600":"text-neutral-300"}`,children:[u.jsx("span",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Silence Filter / Contrast"}),u.jsx("input",{type:"range",min:0,max:1,step:.01,value:e.contrast,disabled:e.hardContrast,onChange:l=>i({contrast:Number(l.target.value)}),className:"w-full accent-cyan-400 disabled:opacity-40"}),u.jsxs("div",{className:"flex justify-between text-[11px] text-neutral-500",children:[u.jsx("span",{children:"soft / more gray values"}),u.jsx("span",{children:e.hardContrast?`Hart ${HE.toFixed(2)}`:e.contrast.toFixed(2)}),u.jsx("span",{children:"hard / more silence"})]})]}),u.jsxs("label",{className:`block space-y-1 text-xs ${e.fitMode==="crop"?"text-neutral-300":"text-neutral-600"}`,children:[u.jsx("span",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Horizontal Crop Shift"}),u.jsx("input",{type:"range",min:-1,max:1,step:.01,value:e.shiftX,disabled:e.fitMode!=="crop",onChange:l=>i({shiftX:Number(l.target.value)}),className:"w-full accent-violet-400 disabled:opacity-40"}),u.jsxs("div",{className:"flex justify-between text-[11px] text-neutral-500",children:[u.jsx("span",{children:"left"}),u.jsx("span",{children:e.shiftX.toFixed(2)}),u.jsx("span",{children:"right"})]})]}),u.jsxs("label",{className:`block space-y-1 text-xs ${e.fitMode==="crop"?"text-neutral-300":"text-neutral-600"}`,children:[u.jsx("span",{className:"uppercase tracking-[0.2em] text-neutral-500",children:"Vertical Crop Offset"}),u.jsx("input",{type:"range",min:-1,max:1,step:.01,value:e.shiftY,disabled:e.fitMode!=="crop",onChange:l=>i({shiftY:Number(l.target.value)}),className:"w-full accent-emerald-400 disabled:opacity-40"}),u.jsxs("div",{className:"flex justify-between text-[11px] text-neutral-500",children:[u.jsx("span",{children:"up"}),u.jsx("span",{children:e.shiftY.toFixed(2)}),u.jsx("span",{children:"down"})]})]}),u.jsx("div",{className:"rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] leading-relaxed text-neutral-400",children:"Hard contrast can filter photographed paper and bright areas from the imported image. This makes asemic writing, glyphs, and graphic notation behave more like painted-in structure than photographic noise."}),u.jsxs("div",{className:"flex items-center justify-between gap-3 pt-2",children:[u.jsx("button",{type:"button",onClick:o,className:"rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900",children:"Cancel"}),u.jsx("button",{type:"button",onClick:s,disabled:a,className:"rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50",children:"Import Image into SpectralForge"})]})]})]})]})})}function __F3564TransportTrim({isPlaying,restartPreview}){
 const st=P.useSyncExternalStore(__F3564Master.subscribe,__F3564Master.getSnapshot,__F3564Master.getSnapshot);
 const slider=(label,name,min,max,step,display)=>u.jsxs('label',{className:'f3564-trim-row',children:[
  u.jsxs('span',{className:'f3564-trim-heading',children:[u.jsx('span',{children:label}),u.jsx('output',{children:display})]}),
  u.jsx('input',{type:'range',min,max,step,value:st[name],onChange:e=>__F3564Master.set(name,Number(e.currentTarget.value)),
   onPointerUp:()=>{if(name==='tuning'&&isPlaying)restartPreview?.(true);},
   onKeyUp:e=>{if(name==='tuning'&&isPlaying&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))restartPreview?.(true);},
   'aria-label':label,'data-f3564-carrier-tuning':name==='tuning'?'true':undefined,'data-f3564-carrier-volume':name==='volume'?'true':undefined,className:'w-full accent-teal-400'})
 ]});
 return u.jsxs('div',{className:'f3564-transport-trim',title:"Carrier Tuning shifts the pitch interpretation of the painted carrier by ±12 semitones without changing its shape or tempo. Carrier Volume applies to playback and rendered outputs.",children:[
  slider('Carrier Tuning','tuning',-12,12,.5,(st.tuning>0?'+':'')+st.tuning.toFixed(1)+' st'),
  slider("Carrier Volume",'volume',0,400,5,st.volume+' %')
 ]});
}
function R6e(e) {
 if(e.variant==='forge3')return __ForgeTransportRack(e);
    return u.jsxs(u.Fragment, {
        children: [ u.jsxs("div", {
            className: "bg-gray-900 border-t border-gray-700 px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2",
            children: [ u.jsx("input", {
                ref: e.fileInputRef,
                type: "file",
                accept: e.variant === "forge3" ? "image/*,.png,.jpg,.jpeg,.webp,.bmp,.gif" : "audio/*,image/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.png,.jpg,.jpeg,.webp,.bmp,.gif",
                className: "hidden",
                onChange: e.handleImportFile
            }), u.jsxs("button", {
                onClick: e.handlePlay,
                disabled: e.rendering,
                "aria-busy": e.renderFillActive || e.donorHearingPhase === "rendering",
                "data-xensonar-spectralforge-render-fill-button": "true",
                "data-xensonar-spectralforge-render-fill-layered": "true",
                "data-xensonar-spectralforge-render-fill-percent": e.renderFillActive ? e.renderFillPercent : void 0,
                style: f6e,
                className: e.playButtonView.className,
                title: e.playButtonView.title,
                children: [ e.renderFillActive && u.jsx("span", {
                    "aria-hidden": "true",
                    className: "pointer-events-none absolute inset-x-0 bottom-0 z-0 bg-emerald-500/90",
                    style: {
                        height: `${e.renderFillPercent}%`
                    }
                }), u.jsx("span", {
                    className: "pointer-events-none relative z-10 flex h-full w-full items-center justify-center text-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]",
                    "aria-hidden": "true",
                    children: e.playButtonView.symbol
                }), u.jsx("span", {
                    className: "sr-only",
                    children: e.playButtonView.screenReaderLabel
                }) ]
            }), u.jsx("button", {
                onClick: e.handleStop,
                className: "w-10 h-8 rounded bg-gray-700 hover:bg-gray-600 text-lg flex items-center justify-center",
                title: "Stop preview",
                children: "⏹"
            }), e.donorHearingSelected && u.jsx("span", {
                "data-forge-main-hearing": "donor-carrier",
                className: "rounded border border-violet-700/70 bg-violet-950/40 px-2 py-1 text-[10px] text-violet-200",
                title: "Play and export use the painted figure with the active donor. Listen to Donor Sample is a separate preview.",
                children: "Figure with Donor"
            }), e.variant === "forge3" && !e.donorHearingSelected && e.workingSource && u.jsxs(u.Fragment, {
                children: [ u.jsxs("div", {
                    className: "flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950/80 p-1 text-[10px]",
                    title: "Choose whether to hear only the workbench or the mediated body.",
                    children: [ u.jsx("button", {
                        type: "button",
                        onClick: () => e.onChangeForge3AudioMode?.("classic"),
                        className: `rounded px-2 py-1 ${e.forge3AudioMode === "classic" ? "bg-cyan-700 text-white" : "text-neutral-300 hover:bg-neutral-800"}`,
                        children: "Workbench"
                    }), u.jsx("button", {
                        type: "button",
                        onClick: () => e.onChangeForge3AudioMode?.("body"),
                        className: `rounded px-2 py-1 ${e.forge3AudioMode === "body" ? "bg-emerald-700 text-white" : "text-neutral-300 hover:bg-neutral-800"}`,
                        children: "Body"
                    }) ]
                }), e.forge3TransportBadges.map(t => u.jsx("span", {
                    className: t.className,
                    title: t.title,
                    children: t.label
                }, t.key)) ]
            }), (e.variant === "forge3" || e.donorHearingSelected) && u.jsxs("div", {
                style: {
                    display: "flex",
                    gap: 4,
                    flexShrink: 0,
                    whiteSpace: "nowrap"
                },
                children: [ u.jsx("span", {
                    className: "self-center text-[11px] font-medium text-emerald-200",
                    children: "Listening Mode"
                }), u.jsx("button", {
                    onClick: () => e.handleDownloadCurrentPreview("wav"),
                    "data-f345-export-format": "wav",
                    "aria-label": "Download Listening Mode as WAV",
                    disabled: e.rendering,
                    className: "h-8 px-3 rounded bg-emerald-700 hover:bg-emerald-600 text-xs font-medium disabled:opacity-50",
                    title: e.donorHearingSelected ? "Download the painted figure with the active donor as WAV. Sample preview does not change this export target." : "Download exactly the current Forge-3 interpretation as WAV",
                    children: "⬇ WAV"
                }), u.jsx("button", {
                    onClick: () => e.handleDownloadCurrentPreview("flac"),
                    "data-f345-export-format": "flac",
                    "aria-label": "Download Listening Mode as FLAC",
                    disabled: e.rendering,
                    className: "h-8 px-3 rounded bg-emerald-800 hover:bg-emerald-700 text-xs font-medium disabled:opacity-50",
                    title: "Download the current listening mode as lossless FLAC from the same audio buffer. Existing FLAC worker, 16-bit, dual mono.",
                    children: "⬇ FLAC"
                }), u.jsx("button", {
                    onClick: e.handleExport,
                    disabled: e.rendering,
                    className: "h-8 px-3 rounded bg-blue-700 hover:bg-blue-600 text-xs font-medium disabled:opacity-50",
                    title: e.variant === "forge3" ? "Export the edited Forge canvas plus JSON. This is different from the raw loop in Material Intake." : "Export as WAV and JSON metadata and write to the material database",
                    children: e.variant === "forge3" ? "💾 Canvas + JSON" : "💾 Export Material"
                }) ]
            }), u.jsxs("label", {
                className: "flex items-center gap-1 text-[11px] text-neutral-300",
                title: "Preview tempo. The number sets the time base; the Loop checkbox beside it determines whether the main preview repeats.",
                children: [ u.jsx("span", {
                    className: "whitespace-nowrap",
                    children: "Tempo"
                }), u.jsx("input", {
                    type: "number",
                    min: 20,
                    max: 320,
                    step: 1,
                    value: e.previewBpmInputValue,
                    disabled: e.previewBpmDisabled,
                    onChange: t => {
                        const n = Number(t.currentTarget.value);
                        Number.isFinite(n) && e.updateMaterialExport({
                            bpm: Math.max(20, Math.min(320, Math.round(n)))
                        });
                    },
                    onPointerUp: t => t.currentTarget.blur(),
                    className: "h-7 w-16 rounded border border-neutral-700 bg-neutral-950 px-2 text-right font-mono text-[11px] text-emerald-100 disabled:opacity-50"
                }), u.jsx("span", {
                    children: "BPM"
                }) ]
            }), u.jsxs("label", {
                className: `flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950/70 px-2 py-1 text-[11px] ${e.previewLoopToggleDisabled ? "text-neutral-500" : "text-neutral-200"}`,
                title: e.previewLoopToggleDisabled ? "Loop applies to the main preview and listening modes; this source uses its own playback path." : "Repeat the current preview or play it once.",
                children: [ u.jsx("input", {
                    type: "checkbox",
                    checked: e.previewLoopEnabled,
                    disabled: e.previewLoopToggleDisabled,
                    onChange: t => e.updateMaterialExport({
                        loopPreview: t.currentTarget.checked
                    }),
                    onPointerUp: t => t.currentTarget.blur(),
                    className: "accent-emerald-500 disabled:opacity-40"
                }), u.jsx("span", {
                    children: "Loop"
                }) ]
            }), e.variant === "forge3" && u.jsx(__F3564TransportTrim, {
                isPlaying: e.isPlaying,
                restartPreview: e.handlePlay
            }), e.sourceAssetPresent && !e.donorHearingSelected && u.jsx("div", {
                className: "flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950/70 p-1 text-[10px] text-neutral-300",
                children: h6e.map(t => u.jsx("button", {
                    type: "button",
                    onClick: () => e.setSourcePreviewMode(t.id),
                    className: `rounded px-2 py-1 ${e.sourcePreviewMode === t.id ? "bg-cyan-700 text-white" : "hover:bg-neutral-800"}`,
                    children: t.label
                }, t.id))
            }), e.variant !== "forge3" && u.jsx("span", {
                className: "text-[10px] text-neutral-500 w-28 text-right",
                children: e.transportDurationLabel
            }), e.variant !== "forge3" && u.jsxs("span", {
                className: "text-xs font-mono text-gray-400 w-24 text-right",
                children: [ e.formatActivePreviewTime(e.playheadPosition), " / ", e.formatActivePreviewTime(1) ]
            }), e.variant !== "forge3" && e.statusMessage && u.jsx("div", {
                className: "max-w-64 truncate text-[10px] text-cyan-300",
                title: e.statusMessage,
                children: e.statusMessage
            }), !(e.variant === "forge3" || e.donorHearingSelected) && u.jsx("button", {
                onClick: e.handleExport,
                disabled: e.rendering,
                className: "h-8 px-3 rounded bg-blue-700 hover:bg-blue-600 text-xs font-medium disabled:opacity-50",
                title: e.variant === "forge3" ? "Export the edited Forge canvas plus JSON. This is different from the raw loop in Material Intake." : "Export as WAV and JSON metadata and write to the material database",
                children: e.variant === "forge3" ? "💾 Canvas + JSON" : "💾 Export Material"
            }) ]
        }), e.variant === "forge3" && u.jsxs("div", {
            "data-forge-hearing-destinations": "v1",
            className: "flex flex-wrap items-center gap-2 border-t border-neutral-800 bg-neutral-950/70 px-4 py-2",
            children: [ u.jsxs("button", {
                type: "button",
                "data-f318-export-target": "material",
                onClick: () => e.handleSendCurrentPreviewToXensonar("material"),
                disabled: e.rendering,
                className: "h-9 inline-flex items-center gap-2 rounded border border-cyan-400 bg-cyan-800 px-3 text-xs font-semibold text-white shadow-sm hover:bg-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50",
                children: [ u.jsx("span", {
                    "aria-hidden": "true",
                    className: "text-base leading-none",
                    children: "📀"
                }), u.jsx("span", {
                    children: "Send to Material Track"
                }) ]
            }), u.jsxs("button", {
                type: "button",
                "data-f318-export-target": "root",
                onClick: () => e.handleSendCurrentPreviewToXensonar("root"),
                disabled: e.rendering,
                className: "h-9 inline-flex items-center gap-2 rounded border border-violet-400 bg-violet-800 px-3 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50",
                children: [ u.jsxs("span", {
                    "aria-hidden": "true",
                    className: "relative inline-flex h-5 w-5 shrink-0 items-center justify-center",
                    children: [ u.jsx("span", {
                        className: "absolute h-4 w-4 rounded-full bg-white shadow-sm"
                    }), u.jsx("span", {
                        className: "relative z-10 text-[17px] leading-none",
                        children: "🎼"
                    }) ]
                }), u.jsx("span", {
                    children: "Use as Root Follow Loop"
                }) ]
            }), u.jsxs("button", {
                type: "button",
                "data-f318-export-target": "pink",
                onClick: () => e.handleSendCurrentPreviewToXensonar("pink"),
                disabled: e.rendering,
                className: "h-9 inline-flex items-center gap-2 rounded border border-pink-400 bg-pink-800 px-3 text-xs font-semibold text-white shadow-sm hover:bg-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50",
                children: [ u.jsxs("span", {
                    "aria-hidden": "true",
                    className: "relative inline-flex h-5 w-5 shrink-0 items-center justify-center",
                    children: [ u.jsx("span", {
                        className: "absolute h-4 w-4 rounded-full bg-white shadow-sm"
                    }), u.jsx("span", {
                        className: "relative z-10 text-[17px] leading-none",
                        children: "🎶"
                    }) ]
                }), u.jsx("span", {
                    children: "Send to Pink Track (Melodic Loop)"
                }) ]
            }), u.jsx("div", {
                "data-forge-hearing-status": "true",
                role: "status",
                "aria-live": "polite",
                "aria-atomic": "true",
                title: e.statusMessage || undefined,
                className: "h-9 flex min-w-0 flex-1 items-center overflow-hidden text-[10px] text-cyan-300",
                children: u.jsx("span", {
                    className: "block min-w-0 max-w-full truncate",
                    children: e.statusMessage || " "
                })
            }) ]
        }), e.pendingAudioImport && u.jsx(M6e, {
            pendingAudioImport: e.pendingAudioImport,
            audioPreviewCanvasRef: e.audioPreviewCanvasRef,
            rendering: e.rendering,
            closeAudioImport: e.closeAudioImport,
            updatePendingAudioImport: e.updatePendingAudioImport,
            handleConfirmAudioImport: e.handleConfirmAudioImport
        }), e.pendingImageImport && u.jsx(w6e, {
            pendingImageImport: e.pendingImageImport,
            imagePreviewCanvasRef: e.imagePreviewCanvasRef,
            spectralWidth: e.spectralWidth,
            spectralHeight: e.spectralHeight,
            rendering: e.rendering,
            closeImageImport: e.closeImageImport,
            updatePendingImageImport: e.updatePendingImageImport,
            handleConfirmImageImport: e.handleConfirmImageImport
        }) ]
    });
}
const C6e = P.forwardRef(function({variant: t = "legacy", forge3AudioMode: n = "classic", onChangeForge3AudioMode: r}, a) {
    const __forgeVisible = P.useContext(__ForgeWorkspaceVisibility);
    const __donorRoutingState = P.useSyncExternalStore(__ForgeDonorRoutingF317.subscribe, __ForgeDonorRoutingF317.getSnapshot, __ForgeDonorRoutingF317.getSnapshot);
    const __f31PlayRef=P.useRef(null);
    const __f333HybridStatus=P.useSyncExternalStore(__F352Runtime.subscribe,__F352Runtime.getSnapshot,__F352Runtime.getSnapshot);
    const __f333CachedRevision=P.useSyncExternalStore(__f333CacheReadySubscribe,__f333CacheReadySnapshot,__f333CacheReadySnapshot);
    const __f333TransportTuning=P.useSyncExternalStore(__F3564Master.subscribe,__F3564Master.getSnapshot,__F3564Master.getSnapshot).tuning;
    const o = cU(), i = pe(Fe => Fe.spectralData), s = pe(Fe => Fe.synthMode), l = pe(Fe => Fe.waveformMix), c = pe(Fe => Fe.isPlaying), d = pe(Fe => Fe.setIsPlaying), p = pe(Fe => Fe.playheadPosition), f = pe(Fe => Fe.setPlayheadPosition), b = pe(Fe => Fe.setShowPlayheadMarker);
    P.useEffect(() => {
        if (!o.selected) return;
        const Fe = o.phase === "playing" && o.auditionKind === "carrier";
        d(Fe), b(Fe), Fe || f(0);
    }, [ o.selected, o.phase, o.auditionKind, d, b, f ]);
    const g = pe(Fe => Fe.pushUndo), y = pe(Fe => Fe.triggerRender), x = pe(Fe => Fe.renderVersion), A = pe(Fe => Fe.materialExport), M = pe(Fe => Fe.updateMaterialExport), v = pe(Fe => Fe.basisHearingTransportBridge), w = pe(Fe => Fe.sourceAsset), R = pe(Fe => Fe.setSourceAsset), k = pe(Fe => Fe.sourcePreviewMode), I = pe(Fe => Fe.setSourcePreviewMode), E = pe(Fe => Fe.sourceAssetContext), F = pe(Fe => Fe.activeMediatedBody), L = pe(Fe => Fe.carrierIntegralSelection), B = pe(Fe => Fe.carrierIntegralSynthLab), O = pe(Fe => Fe.carrierIntegralHarmonicXplore), T = pe(Fe => Fe.createProjectSnapshot), __f333DonorListening = t === "forge3" ? ["donor","hybrid","donor-pending"].includes(__f333Route(pe.getState())) : !!o.selected, _ = P.useMemo(() => Xje({
        donorSelected: __f333DonorListening,
        variant: t,
        hasSourceAsset: !!w,
        sourcePreviewMode: k,
        sourceAssetContext: E,
        carrierIntegralSelection: L,
        carrierIntegralSynthLab: B,
        carrierIntegralHarmonicXplore: O,
        renderVersion: x,
        synthMode: s,
        waveformMix: l,
        materialExport: A
    }), [ O, L, B, __f333DonorListening, A.bars, A.bpm, A.beatsPerBar, A.loopPreview, x, w, k, E, s, t, l ]), {previewDurationSec: G, previewPlaybackRate: j, previewRenderRouteKind: N, previewRenderCanAutoAfterPaint: W, previewLoopAppliesToCurrentRoute: V, previewLoopEnabled: U, currentPreviewPreparedToken: H, currentPreviewRequest: q} = _, [K, Y] = P.useState(!1), [J, Z] = P.useState(0), te = P.useRef(0), [X, Q] = P.useState(""), {pendingImageImport: ne, pendingAudioImport: ee, fileInputRef: ie, imagePreviewCanvasRef: de, audioPreviewCanvasRef: oe, closeImageImport: ue, closeAudioImport: fe, handleImportFile: he, handleConfirmAudioImport: re, handleConfirmImageImport: le, updatePendingImageImport: Ae, updatePendingAudioImport: ce} = p6e({
        variant: t,
        spectralData: i,
        isPlaying: c,
        setIsPlaying: d,
        pushUndo: g,
        setSourceAsset: R,
        setSourcePreviewMode: I,
        setPlayheadPosition: f,
        setShowPlayheadMarker: b,
        triggerRender: y,
        setWorkflowBusy: Y,
        setWorkflowProgress: Z,
        setStatusMessage: Q
    }), ge = P.useRef(null), {discardRoomPreview:__f449DropPrepared,previewSessionDriver: Ce, getSessionState: Re, transportPrewarmState: se, getTransportPreparedPayload: xe, rememberTransportPreparedPayload: Be, clearTransportPreparedPayload: Ie, setTransportPreparedRequestKey: Qe, setTransportPrewarmRendering: Ne, setTransportPrewarmProgress: Ue, isSerialPrewarmInFlight: Ye, beginTransportSerialPrewarmRun: Ve, finishTransportSerialPrewarmRun: tt, requestTransportSerialPrewarmRerun: dt, requestTransportSerialPrewarmRerunIfInFlight: gt, hasSerialPrewarmRerun: Ge, consumeSerialPrewarmRerun: Te, beginTransportPrewarmSchedule: rt, isCurrentTransportPrewarmSchedule: lt, setTransportPrewarmTimer: ut, clearTransportPrewarmTimer: at} = $K(), qe = se.preparedRequestKey, mt = se.prewarmRendering, It = se.prewarmProgress, Ct = Yje({
        spectralData: i,
        synthMode: s,
        waveformMix: l,
        preview: _,
        carrierIntegralSelection: L,
        carrierIntegralSynthLab: B,
        carrierIntegralHarmonicXplore: O,
        previewBpm: A.bpm
    }), St = P.useRef(Ct);
    St.current = Ct;
    const {getQuietWindowState: At} = s6e();
    P.useEffect(() => {
        if (t === "forge3" && !__forgeVisible) __f449DropPrepared();
    }, [t, __forgeVisible, __f449DropPrepared]);
    P.useImperativeHandle(a, () => ({
        openImageImportDialog: () => {
            t === "forge3" && ie.current?.click();
        }
    }), [ t ]), P.useEffect(() => {
        if (t !== "forge3") return;
        if (__f334TransferNotice && __f333ReadCarrier(pe.getState().spectralData)) Q(__f334TransferNotice);
        const notice = event => Q(event.detail);
        window.addEventListener(__f334NoticeEvent, notice);
        return () => window.removeEventListener(__f334NoticeEvent, notice);
    }, [ t ]);
    const Et = P.useCallback(() => {
        if (t === "forge3" && !__forgeWorkspaceVisible) return;
        Ve() && (async () => {
            try {
                do {
                    Te();
                    const Fe = St.current;
                    if (Fe.routeKind === "none") break;
                    const pt = n0({
                        identity: {
                            requestKey: Fe.token,
                            routeKind: Fe.routeKind
                        },
                        reason: "after-paint-preview",
                        loopPreview: U
                    }), an = () => {
                        const Yt = St.current;
                        return Yt.token === Fe.token && Yt.routeKind === Fe.routeKind;
                    };
                    if (!Ce.beginPrewarm(pt)) {
                        dt();
                        continue;
                    }
                    Qe(Yt => Yt === Fe.token ? null : Yt), Fe.routeKind !== "basis-hearing" && Ie(), 
                    Ne(!0), Ue(.035), Q(uA({
                        routeKind: Fe.routeKind,
                        phase: "start"
                    })), await new Promise(Yt => window.requestAnimationFrame(() => Yt())), await new Promise(Yt => window.setTimeout(Yt, 0));
                    const Pt = Fe.routeKind === "basis-hearing" ? T() : null, Dn = Fe.routeKind === "basis-hearing" && t !== "forge3" ? await EK({
                        snapshot: Pt,
                        machineId: Fe.machineId,
                        selection: Fe.selection,
                        synthLab: Fe.synthLab,
                        harmonicXplore: Fe.harmonicXplore,
                        previewBpm: Fe.previewBpm,
                        previewGain: 1,
                        previewPitchSemitones: __f3565PitchSemis(),
                        onRenderProgress: Yt => {
                            an() && (Ce.reportProgress(pt, Yt), Ue(Math.max(.035, Yt)));
                        }
                    }) : await __f333RenderCurrent(pe.getState(), {
                        onProgress: Yt => {
                            an() && (Ce.reportProgress(pt, Yt), Ue(Math.max(.035, Yt)));
                        }
                    }), er = St.current;
                    if (er.token !== Fe.token || er.routeKind !== Fe.routeKind) {
                        Ce.markStale(pt), dt(), Ne(!1), Ue(0), Q(uA({
                            routeKind: Fe.routeKind,
                            phase: "stale"
                        }));
                        continue;
                    }
                    const yn = !("warmed" in Dn) || Dn.warmed !== !1;
                    yn && Ce.markReady(pt, "cacheHit" in Dn ? !!Dn.cacheHit : !1), Ue(yn ? 1 : 0), Ge() || (yn ? (Qe(Fe.token), 
                    Fe.routeKind === "basis-hearing" && Pt && Be(Fe.token, Pt)) : Ie(Fe.token), Q(uA({
                        routeKind: Fe.routeKind,
                        phase: yn ? "ready" : "unprepared",
                        rendered: !!Dn.rendered
                    }))), Ge() || window.setTimeout(() => {
                        !Ye() && !Ge() && Q("");
                    }, 900);
                } while (Ge());
            } catch (Fe) {
                Ce.markError(n0({
                    identity: {
                        requestKey: St.current.token,
                        routeKind: St.current.routeKind
                    },
                    reason: "after-paint-preview",
                    loopPreview: U
                }), Fe instanceof Error ? Fe.message : String(Fe)), console.warn("SpectralForge serial preview render failed:", Fe), 
                Ue(0), Q(uA({
                    routeKind: St.current.routeKind,
                    phase: "failed"
                })), window.setTimeout(() => Q(""), 1600);
            } finally {
                if (tt()) {
                    window.setTimeout(() => Et(), 0);
                    return;
                }
                window.setTimeout(() => {
                    !Ye() && !Ge() && Ne(!1);
                }, 140);
            }
        })();
    }, [ Te, T, Ge, Ye, Ve, tt, U, Ce, dt, t ]);
    P.useEffect(() => {
        if (t === "forge3" && !__forgeVisible) {
            at();
            return;
        }
        if (!W) {
            N === "basis-hearing" && L.machineId === "raw-darkpsy-oscillator" && Q("");
            return;
        }
        if (c || K || N === "spectral" && x <= 0) return;
        if (zB({
            currentRequest: q,
            preparedRequestKey: qe
        })) {
            const Pt = n0({
                identity: q,
                reason: "transport-prepared-cache-hit",
                loopPreview: U
            });
            Ce.schedule(Pt), Ce.markReady(Pt, !0), at(), Te(), Ne(!1), Ue(1);
            return;
        }
        Ie(), at();
        const Fe = rt();
        Ce.schedule(n0({
            identity: q,
            reason: "after-paint-preview",
            loopPreview: U
        })), Qe(Pt => Pt === H ? null : Pt), gt(), Ne(!1), Ue(0), Q(N === "basis-hearing" ? "Interpretation queued · waiting for controls to settle" : "Preview queued · renders after two seconds of tool idle time");
        const pt = At(N), an = () => {
            if (!lt(Fe) || c || K) return;
            const Pt = At(N);
            if (Pt.blocked) {
                Q(C_e(N, Pt.pointerDown)), ut(window.setTimeout(an, Math.max(Pt.retryDelayMs, Pt.remainingQuietMs)));
                return;
            }
            ut(null), Et();
        };
        return ut(window.setTimeout(an, pt.firstDelayMs)), () => {
            at();
        };
    }, [ rt, Ie, at, H, q, At, lt, c, W, U, Ce, qe, N, x, K, Et, ut, __forgeVisible, t ]);
    const Se = P.useCallback(() => Vt.getSnapshot().selected ? G : w && k === "sourceFull" ? Math.max(.05, w.originalDuration) : w && k === "sourceWindow" ? Math.max(.05, w.importDurationSec) : G, [ G, w, k ]), be = P.useCallback(async (forceRestart = false) => {
        if(__f31PlayRef.current && forceRestart!==true){__f333Stop();__f31PlayRef.current=null;Y(false);Z(0);d(false);b(false);return;}
        if (forceRestart === true) {
            __f333Stop();
            d(false);
            b(false);
            f(0);
        } else if (c || Vt.getSnapshot().phase === "playing") {
            __f333Stop();
            d(false);
            b(false);
            f(0);
            return;
        }
        const ticket={};__f31PlayRef.current=ticket;const epoch = __f333Epoch;
        Y(true);
        Q("Preparing listening mode …");
        const warming = Re();
        te.current = warming.kind === 'prewarming' && warming.requestKey === St.current.token ? Math.max(.02, warming.progress) : .02;
        Z(te.current);
        try {
            // Let the initial busy/fill state paint before cold synchronous setup.
            // A finished PCM cache needs no extra frame or simulated loading.
            if (!__f333CachedPreviewReady(pe.getState())) {
                await new Promise(resolve => window.requestAnimationFrame(() => window.setTimeout(resolve, 0)));
                if (epoch !== __f333Epoch || __f31PlayRef.current !== ticket) return;
            }
            const played = await __f333PlayCurrent(pe.getState(), {
                audioMode: n,
                fromPosition: pe.getState().playheadPosition,
                onProgress: p => {
                    if (epoch !== __f333Epoch || __f31PlayRef.current !== ticket) return;
                    te.current = p;
                    Z(p);
                },
                onPosition: p => f(p),
                onEnd: () => {
                    d(false);
                    b(false);
                    f(0);
                }
            });
            if (epoch !== __f333Epoch) return;
            d(played);
            b(played);
            Q(played ? __f333CurrentLabel(pe.getState()) : "The figure has changed; please play again.");
        } catch (error) {
            if (epoch === __f333Epoch) {
                d(false);
                b(false);
                Q(error instanceof Error ? error.message : "Vorschau fehlgeschlagen");
            }
        } finally {
            if(__f31PlayRef.current===ticket){__f31PlayRef.current=null;Y(false);Z(0);}
        }
    }, [ c, n, d, b, f, Re ]), ve = P.useCallback(() => {
        __f333Stop();
        __f31PlayRef.current=null;Y(false);Z(0);Q('');const Fe = ge.current;
        Fe && (Ce.markPlayEnded(Fe), ge.current = null), d(!1), f(0), b(!1);
    }, [ Ce, d, f, b ]), {handleDownloadCurrentPreview: Je, handleSendCurrentPreviewToXensonar: Oe, handleExport: Xe} = x6e({
        variant: t,
        forge3AudioMode: n,
        activeMediatedBody: F,
        previewDurationSec: G,
        sourceAsset: w,
        sourcePreviewMode: k,
        sourceAssetContext: E,
        spectralData: i,
        synthMode: s,
        waveformMix: l,
        materialExport: A,
        getActivePreviewDuration: Se,
        setWorkflowBusy: Y,
        setWorkflowProgress: Z,
        setStatusMessage: Q
    }), it = Fe => b6e(Fe, Se()), Ze = __f333WorkingSource(pe.getState()), st = D4e(Ze), ft = A6e({
        undoBadgeLabel: "Undo: Workbench",
        sourceAssetContext: E,
        forge3BodyActive: Ze,
        forge3BodyLabel: st
    }), Ot = v6e({
        routeKind: N,
        bridgeRequestKey: v.requestKey,
        currentRequestKey: H,
        bridgeMachineId: v.machineId,
        currentMachineId: L.machineId,
        bridgePhase: v.phase,
        bridgeProgress: v.progress,
        isPlaying: c
    }), un = F_e({
        currentRequest: q,
        preparedRequestKey: qe,
        rendering: K,
        renderProgress: J,
        prewarmRendering: mt,
        prewarmProgress: It,
        isPlaying: c,
        sessionState: Re()
    }), __f333PcmCached=P.useMemo(()=>t==='forge3'&&__forgeVisible&&__f333CachedPreviewReady(pe.getState()),
        [t,__forgeVisible,__f333HybridStatus,__f333CachedRevision,__f333TransportTuning,x,s,l,L,B,O,A.bars,A.bpm,A.beatsPerBar,w,k,E,o.selected,o.modelRevision,__F35611DonorIntent]),
        Xt = !!o.selected && o.phase === "rendering", hn = !!o.selected && !!o.preparedFigureKey && o.preparedFigureRenderVersion === x && o.phase !== "rendering", fn = t === "forge3" ? (o.selected && __f333Route(pe.getState()) === "donor" ? hn : __f333PcmCached) : un.readyForImmediatePlay, Ut = Xt || (!fn && (un.renderFillActive || Ot.fillActive)), He = Xt ? Math.max(2, Math.min(99, Math.round(o.renderProgress * 100))) : Ot.fillActive ? Ot.fillPercent : un.renderFillPercent, _e = g6e({
        renderFillActive: Ut,
        renderFillPercent: He,
        isPlaying: c,
        rendering: K,
        previewReadyForImmediatePlay: fn,
        previewRenderRouteKind: N
    }), ot = S6e({
        variant: t,
        hasSourceAsset: !!w,
        sourcePreviewMode: k,
        previewDurationSec: G,
        sourceOriginalDuration: w?.originalDuration,
        sourceImportStartSec: w?.importStartSec,
        sourceImportDurationSec: w?.importDurationSec
    }), kt = Number.isFinite(A.bpm) ? Math.round(A.bpm) : 108, Ke = !!w && k !== "forge", Mt = !V;
    // Clear the previous synthesis status when the hearing mode changes: a stale Emilia label is not Donor state.
    P.useEffect(()=>{if(t!=='forge3')return;const clear=()=>Q('');window.addEventListener('xensonar:forge:listening-choice',clear);return()=>window.removeEventListener('xensonar:forge:listening-choice',clear)},[t,Q]);
    P.useEffect(()=>t==='forge3'&&__forgeVisible?__ForgeTransportAccess.attach({play:be,stop:ve,activate:()=>{const busy=K||__donorRoutingState.phase==='applying'||o.phase==='analyzing';return busy?ve():be()}}):undefined,[t,be,ve,K,o.phase,__forgeVisible]);
    P.useEffect(()=>{if(t==='forge3'&&__forgeVisible)__ForgeTransportAccess.update({phase:K||Ut?'preparing':c||o.phase==='playing'?'playing':'idle',progress:He,ready:fn})},[t,K,Ut,c,o.phase,He,fn,__forgeVisible]);
    return u.jsx(R6e, {
        materialExport:A,
        variant: t,
        forge3AudioMode: n,
        onChangeForge3AudioMode: r,
        fileInputRef: ie,
        handleImportFile: he,
        handlePlay: be,
        handleStop: ve,
        isPlaying: c || o.phase === "playing",
        rendering: K || __donorRoutingState.phase === "applying" || o.phase === "analyzing",
        renderFillActive: Ut,
        renderFillPercent: He,
        donorHearingPhase: o.phase,
        donorHearingSelected: !!o.selected,
        playButtonView: N === "basis-hearing" && !W && !c && !K && !fn ? {
            ..._e,
            title: "Listen · rendering starts on Play",
            screenReaderLabel: "Listen"
        } : _e,
        forge3TransportBadges: ft,
        handleSendCurrentPreviewToXensonar: Oe,
        handleDownloadCurrentPreview: Je,
        playheadPosition: p,
        setPlayheadPosition: f,
        setShowPlayheadMarker: b,
        previewBpmInputValue: kt,
        previewBpmDisabled: Ke,
        updateMaterialExport: M,
        previewLoopToggleDisabled: Mt,
        previewLoopEnabled: U,
        sourceAssetPresent: !!w,
        workingSource: __f333WorkingSource(pe.getState()),
        sourcePreviewMode: k,
        setSourcePreviewMode: I,
        transportDurationLabel: ot,
        formatActivePreviewTime: it,
        statusMessage: X,
        handleExport: Xe,
        pendingAudioImport: ee,
        audioPreviewCanvasRef: oe,
        closeAudioImport: fe,
        updatePendingAudioImport: ce,
        handleConfirmAudioImport: re,
        pendingImageImport: ne,
        imagePreviewCanvasRef: de,
        spectralWidth: i.width,
        spectralHeight: i.height,
        closeImageImport: ue,
        updatePendingImageImport: Ae,
        handleConfirmImageImport: le
    });
});
function VE(e,t,n,r=.05){const a=Math.max(r,n||r),o=Math.max(r,Math.min(t,a));return{startSec:Math.max(0,Math.min(a-o,e)),durationSec:o}}function $B(e,t,n,r=2.2){const a=Math.max(.15,Math.min(n,t*r)),o=e+t*.5;return VE(o-a*.5,a,n,.15)}function pc(e){return e.startSec+e.durationSec}function Ty(e,t){const n=Math.max(e.startSec,t.startSec),r=Math.min(pc(e),pc(t));return r<=n?null:{startSec:n,durationSec:r-n}}function k6e(e,t){return e.startSec>=t.startSec&&pc(e)<=pc(t)}function xi({tone:e="neutral",active:t=!1,pending:n=!1,success:r=!1,disabled:a=!1,className:o="",children:i,onClick:s}){const l={neutral:"border-neutral-700 text-neutral-100 hover:bg-neutral-900",cyan:"border-cyan-700 text-cyan-100 hover:bg-cyan-950/30",violet:"border-violet-700 text-violet-100 hover:bg-violet-950/30",emerald:"border-emerald-700 text-emerald-100 hover:bg-emerald-950/30",amber:"border-amber-700 text-amber-100 hover:bg-amber-950/30",pink:"border-pink-600 text-pink-100 hover:bg-pink-950/30"},c={neutral:"bg-neutral-800/90 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",cyan:"bg-cyan-950/60 shadow-[0_0_0_1px_rgba(34,211,238,0.38)]",violet:"bg-violet-950/60 shadow-[0_0_0_1px_rgba(168,85,247,0.4)]",emerald:"bg-emerald-950/65 shadow-[0_0_0_1px_rgba(16,185,129,0.42)]",amber:"bg-amber-950/60 shadow-[0_0_0_1px_rgba(245,158,11,0.4)]",pink:"bg-pink-950/60 shadow-[0_0_0_1px_rgba(236,72,153,0.42)]"};return u.jsx("button",{type:"button",onClick:s,disabled:a,className:`rounded border px-3 py-2 transition ${l[e]} ${t||n||r?c[e]:""} ${a?"opacity-40":""} ${o}`,children:u.jsxs("span",{className:"inline-flex items-center gap-2",children:[u.jsx("span",{children:i}),n?u.jsx("span",{className:"text-[11px] opacity-80",children:"…"}):null,!n&&r?u.jsx("span",{className:"text-[11px] text-emerald-300",children:"✓"}):null]})})}const Jk=.05,Yb=.001,r0=(e,t,n)=>Math.max(t,Math.min(n,e)),P6e=e=>e.sampleRate<=0?0:e.monoSamples.length/e.sampleRate,O_=(e,t)=>{const n=Math.max(Jk,Math.min(Math.max(Jk,t),e.durationSec)),r=r0(e.startSec,0,Math.max(0,t-n));return{startSec:r,durationSec:Math.min(n,Math.max(Jk,t-r))}},__=e=>e.startSec+e.durationSec;class I6e{ctx=null;sourceNode=null;gainNode=null;playing=!1;playbackStartedAtCtxSec=0;playbackLoopStartSec=0;playbackLoopDurationSec=0;playbackInitialAbsoluteSec=0;assetDurationSec=0;getContext(){return this.ctx||(this.ctx=new AudioContext({sampleRate:44100})),this.ctx}isPlaying(){return this.playing}getPlaybackPositionSec(){if(!this.playing||!this.ctx||this.playbackLoopDurationSec<=0)return null;const t=Math.max(0,this.ctx.currentTime-this.playbackStartedAtCtxSec),n=this.playbackLoopStartSec,r=this.playbackLoopDurationSec,a=r0(this.playbackInitialAbsoluteSec-n,0,Math.max(0,r-Yb));return n+(a+t)%r}getPlaybackOffsetSec(){const t=this.getPlaybackPositionSec();return t==null||this.playbackLoopDurationSec<=0?null:r0(t-this.playbackLoopStartSec,0,Math.max(0,this.playbackLoopDurationSec-Yb))}async playLoop(t,n,r=0){this.stop();const __generation=this.previewGeneration,a=this.getContext();a.state==="suspended"&&await a.resume();if(this.previewGeneration!==__generation)return false;const o=P6e(t),i=O_(n,o),s=Math.min(o,__(i)),l=r0(r,0,Math.max(0,i.durationSec-Yb)),c=r0(i.startSec+l,0,Math.max(0,o-Yb)),d=a.createBuffer(1,Math.max(1,t.monoSamples.length),t.sampleRate);d.copyToChannel(Float32Array.from(t.monoSamples),0,0);const p=a.createBufferSource();p.buffer=d,p.loop=!0,p.loopStart=i.startSec,p.loopEnd=s;const f=a.createGain();f.gain.value=.9,p.connect(f),f.connect(a.destination),p.start(0,c),this.sourceNode=p,this.gainNode=f,this.playing=!0,this.assetDurationSec=o,this.playbackStartedAtCtxSec=a.currentTime,this.playbackLoopStartSec=i.startSec,this.playbackLoopDurationSec=i.durationSec,this.playbackInitialAbsoluteSec=c,p.onended=()=>{this.sourceNode===p&&(this.sourceNode=null,this.gainNode=null,this.playing=!1,this.playbackStartedAtCtxSec=0,this.playbackLoopStartSec=0,this.playbackLoopDurationSec=0,this.playbackInitialAbsoluteSec=0,this.assetDurationSec=0)}}updateLoopRangeLive(t){if(!this.playing||!this.ctx||!this.sourceNode||this.assetDurationSec<=0)return!1;const n=this.getPlaybackPositionSec()??t.startSec,r=O_(t,this.assetDurationSec),a=Math.min(this.assetDurationSec,__(r));this.sourceNode.loopStart=r.startSec,this.sourceNode.loopEnd=a;const o=n-r.startSec,i=o>=0&&o<r.durationSec?n:r.startSec+(o%r.durationSec+r.durationSec)%r.durationSec;return this.playbackStartedAtCtxSec=this.ctx.currentTime,this.playbackLoopStartSec=r.startSec,this.playbackLoopDurationSec=r.durationSec,this.playbackInitialAbsoluteSec=r0(i,r.startSec,Math.max(r.startSec,a-Yb)),!0}stop(){this.previewGeneration=(this.previewGeneration??0)+1;if(this.sourceNode){try{this.sourceNode.stop()}catch{}try{this.sourceNode.disconnect()}catch{}}if(this.gainNode)try{this.gainNode.disconnect()}catch{}this.sourceNode=null,this.gainNode=null,this.playing=!1,this.playbackStartedAtCtxSec=0,this.playbackLoopStartSec=0,this.playbackLoopDurationSec=0,this.playbackInitialAbsoluteSec=0,this.assetDurationSec=0}}const Id=new I6e,ZK=new Map;