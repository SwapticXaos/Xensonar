

function Sp(refs){__f49StopRFL(refs)}function UV(e){e.tokenRef.current+=1,Sp(e),e.cacheRef.current.clear(),P3.get(e.tokenRef)?.samples.invalidate()}function xbe(e){if(typeof window>"u")return"unavailable";let t="UI leer",n="Bank leer";try{t=window.localStorage.getItem(e)?"UI gespeichert":"UI leer"}catch{t="UI unlesbar"}try{n=window.localStorage.getItem(HS)?"Bank gespeichert":"Bank leer"}catch{n="Bank unlesbar"}return t+" · "+n}function Mbe(e){const t=JT(),n=t.latest;return{audioContextState:e.audioContextState,selectedLoopName:e.selectedRootFollowLoop?.name??null,selectedLoopId:e.selectedRootFollowLoop?.id??e.fallbackSelectedLoopId??null,rootFollowLoopActive:!!e.rootFollowLoopActive,rootFollowPreviewActive:!!e.rootFollowPreviewActive,rootFollowPlayfieldInside:!!e.rootFollowPlayfieldInside,effectivePlaybackGate:!!(e.rootFollowPreviewActive||e.rootFollowPlayfieldInside),selectedEntryExists:!!e.selectedRootFollowLoop,rootFollowEntries:e.rootFollowEntries,packagePreferredEntries:e.packagePreferredEntries,materialLoopEntries:e.materialLoopEntries,runtimeNodes:e.refs.activeNodesRef.current.size,synthVoices:e.refs.activeSynthVoicesRef.current.size,cacheSize:e.refs.cacheRef.current.size,timerActive:e.refs.timerRef.current!==null,gainConnected:e.refs.gainRef.current!==null,browserState:xbe(e.rootFollowUiStorageKey),lastPlaybackStage:n?.stage??null,lastStopReason:t.latestStopReason,latestColdStartRisk:t.latestColdStartRisk,latestColdStartLeadMs:n?.coldStartLeadMs??null}}function Db(e){const t=e.refs.trafficRef?.current;t&&ute(t,{activeRequested:e.activeRequested,gateOpen:e.gateOpen,selectedLoopId:e.selectedRootFollowLoop?.id??null,selectedLoopName:e.selectedRootFollowLoop?.name??null,sourceKind:e.selectedRootFollowLoopConfig?.sourceKind??null,renderMode:e.selectedRootFollowLoopConfig?.renderMode??null,granulationMode:e.granulationMode,volume:e.volume,currentRootHz:e.currentRootHz,timerActive:e.refs.timerRef.current!==null,gainConnected:e.refs.gainRef.current!==null,activeNodes:e.refs.activeNodesRef.current.size,activeSynthVoices:e.refs.activeSynthVoicesRef.current.size,cacheSize:e.refs.cacheRef.current.size,token:e.refs.tokenRef.current,lastStage:e.stage})}function wbe(e){UV(e.refs),ige();try{window.localStorage.removeItem(e.rootFollowUiStorageKey)}catch{}try{window.sessionStorage.removeItem(e.rootFollowUiStorageKey)}catch{}e.updateNParams({rootFollowLoopActive:!1,rootFollowLoopId:""}),e.setStatus("Root Follow browser state cleared: bank, selection, runtime, and cache are empty. Material Track/samples were not deleted.")}function Rbe(e){const t=e.materialEntries.filter(a=>a.rootFollowPreferred),n=t.length?t:e.selectedLoopMaterial?[e.selectedLoopMaterial]:e.materialEntries.filter(a=>a.role==="loop").slice(0,1);if(!n.length){e.setStatus("No loaded Material Track entries found from which Root Follow can be reactivated.");return}n.forEach(a=>{ri("rootFollowBankMembership",{entryId:a.id,enabled:!0})});const r=n[0];e.updateNParams({rootFollowLoopId:r.id,rootFollowLoopActive:!0,resonanceHotkeyMode:"root-follow"}),e.setStatus(t.length?"Root Follow reactivated from package data:"+n.length+"marked entries; active is"+r.name+".":"No Root Follow marker found in the package; as a fallback"+r.name+"was assigned from Material Track to Root Follow.")}function Cbe(e){const t=e.materialEntries.filter(a=>a.rootFollowPreferred),n=Mbe({audioContextState:e.audioContextState,selectedRootFollowLoop:e.selectedRootFollowLoop,fallbackSelectedLoopId:e.fallbackSelectedLoopId,rootFollowLoopActive:e.rootFollowLoopActive,rootFollowPreviewActive:e.rootFollowPreviewActive,rootFollowPlayfieldInside:e.rootFollowPlayfieldInside,rootFollowEntries:e.rootFollowEntries,packagePreferredEntries:t.length,materialLoopEntries:e.materialEntries.length,rootFollowUiStorageKey:e.rootFollowUiStorageKey,refs:e.refs}),r=obe({materialEntries:e.materialEntries,selectedRootFollowLoop:e.selectedRootFollowLoop,fallbackSelectedLoopId:e.fallbackSelectedLoopId,rootFollowLoopActive:e.rootFollowLoopActive,packagePreferredEntries:t.length});return{rootFollowHealth:n,activationReport:r,clearRootFollowBrowserState:()=>wbe({refs:e.refs,rootFollowUiStorageKey:e.rootFollowUiStorageKey,updateNParams:e.updateNParams,setStatus:e.setStatus}),reactivateRootFollowFromLoadedPackage:()=>Rbe({materialEntries:e.materialEntries,selectedLoopMaterial:e.selectedLoopMaterial,updateNParams:e.updateNParams,setStatus:e.setStatus})}}function kbe({audioContextState:e,selectedRootFollowLoop:t,fallbackSelectedLoopId:n,rootFollowLoopActive:r,rootFollowPreviewActive:a,rootFollowPlayfieldInside:o,rootFollowEntries:i,materialEntries:s,selectedLoopMaterial:l,rootFollowUiStorageKey:c,rootFollowRuntimeRefs:d,materialLoopRuntimeRefs:p,updateNParams:f,setAudioPairTherapistStatus:b,resetResonanceTransientState:g,audioTrafficForensicsRef:y,ensureAudioReady:x,prewarmAudioRuntime:A}){const M=()=>{UV(d)},v=()=>{Yfe(p)},w=()=>{Xge({stopRootFollowRuntimeOnly:M,stopMaterialLoopRuntimeOnly:v,resetResonanceTransientState:g,trafficRef:y,updateNParams:f,setStatus:b,ensureAudioReady:x,prewarmAudioRuntime:A})},R=Cbe({audioContextState:e,selectedRootFollowLoop:t,fallbackSelectedLoopId:n,rootFollowLoopActive:r,rootFollowPreviewActive:a,rootFollowPlayfieldInside:o,rootFollowEntries:i,materialEntries:s,selectedLoopMaterial:l,rootFollowUiStorageKey:c,refs:d,updateNParams:f,setStatus:b});return{stopRootFollowRuntimeOnly:M,stopMaterialLoopRuntimeOnly:v,resetAudioPairTherapistRuntime:w,rootFollowHealth:R.rootFollowHealth,workspacePackageActivationReport:R.activationReport,clearRootFollowBrowserState:R.clearRootFollowBrowserState,reactivateRootFollowFromLoadedPackage:R.reactivateRootFollowFromLoadedPackage}}function Pbe(e){let t=0,n=new Map;return{get(r){return n.get(r)??null},invalidate(){t++,n.clear()},async prepare(r){const a=++t,o=[...new Set(r.filter(d=>!!d?.startsWith("sample:")).map(d=>d.slice(7).trim()).filter(Boolean))],i=new Map,s=[];let l=0;await Promise.all(Array.from({length:Math.min(4,o.length)},async()=>{for(;l<o.length&&a===t;){const d=o[l++];try{const p=await e(d);p?i.set(d,p):s.push(d)}catch{s.push(d)}}}));const c=a===t;return c&&(n=i),{committed:c,missing:s,generation:a}}}}const P3=new WeakMap;function KV(e,t=e){const n="tokenRef"in t?t.tokenRef:t;let r=P3.get(n);if(!r||r.ctx!==e){r?.samples.invalidate();const a=Pbe(async o=>{const i=await pg(o,e);return i?{...i,kind:"sample",sampleId:o}:null});r={ctx:e,samples:a},P3.set(n,r)}return r.samples}function Ibe(e,t,n){return KV(e,n).get(t)}async function Ebe(e,t,n){const r=KV(e,n),a=n&&"tokenRef"in n?n:null,o=a?.tokenRef.current,i=await r.prepare(t);if(i.committed&&a?.tokenRef.current===o&&a)for(const s of new Set(t)){if(!s?.startsWith("sample:"))continue;const l=r.get(s.slice(7).trim());l&&rre(e,a,l.buffer)}return i.committed&&i.missing.length&&console.warn("[root-follow] Samples unavailable; affected notes remain silent:",i.missing),i}function $V(e,t,n){const r=t.synthPattern;if(!r)return Promise.resolve({committed:!0,missing:[],generation:0});const a=new Map(r.tracks.map(s=>[s.id,s])),o=new Set(r.activeTrackIds),i=r.notes.filter(s=>o.has(s.trackId)&&a.get(s.trackId)?.enabled!==!1).map(s=>s.instrumentPresetOverride??a.get(s.trackId)?.instrumentPreset??null);return Ebe(e,i,n)}function Fbe(){return{transportAnchor:null,nextSliceStart:null,sessionAnchorHz:null,materialSmoothedRootHz:null,quantizedRootHz:null,quantizedRootAcceptSec:null,globalSlotCounter:0}}function T1(e){e.transportAnchor=null,e.nextSliceStart=null,e.sessionAnchorHz=null,e.materialSmoothedRootHz=null,e.quantizedRootHz=null,e.quantizedRootAcceptSec=null,e.globalSlotCounter=0}function nL(e){const{refs:t,node:n,fallbackCleanupRef:r}=e;t.activeNodesRef.current.delete(n);try{n.disconnect()}catch{}r&&r.current!==null&&(window.clearTimeout(r.current),r.current=null)}function Tbe(e){const{refs:t,node:n}=e;t.activeNodesRef.current.add(n),n.onended=()=>{nL({refs:t,node:n})}}function XV(e){__f49RegisterRFLNode({refs:e.refs,node:e.node,cleanupDelayMs:Math.max(Number.isFinite(e.minCleanupDelayMs)?e.minCleanupDelayMs:250,Number.isFinite(e.cleanupDelayMs)?e.cleanupDelayMs:Number.isFinite(e.defaultCleanupDelayMs)?e.defaultCleanupDelayMs:2000)})}function Lbe(e){__f49RegisterRFLNode(e)}const I3=new WeakMap;function JV(janitor,record){__f49ReleaseJanitorRecord(janitor,record)}function ZV(janitor){if(janitor.timer!==null||janitor.records.size===0)return;janitor.timer=window.setTimeout(()=>{janitor.timer=null;for(const record of janitor.records.values()){const ctx=record.context??record.source.context;if(ctx.state==='closed'||ctx.currentTime>=record.deadlineAudioSec)JV(janitor,record)}if(janitor.records.size)ZV(janitor)},220)}function Bbe(e){const{refs:t,source:n,auxiliaries:r,cleanupDelayMs:a}=e,o=[n,...r];for(const c of o)t.activeNodesRef.current.add(c);const i=t.activeNodesRef.current;let s=I3.get(i);s||(s={records:new Map,timer:null},I3.set(i,s));const l={refs:t,owner:i,source:n,nodes:o,context:n.context,deadlineAudioSec:n.context.currentTime+Math.max(0,a)/1000,cleaned:!1};s.records.set(n,l),n.onended=()=>JV(s,l),ZV(s)}function Dbe(e){const{refs:t,node:n}=e;if(n instanceof AudioScheduledSourceNode){Tbe({refs:t,node:n});return}if(n instanceof GainNode||n instanceof StereoPannerNode||n instanceof BiquadFilterNode){XV({refs:t,node:n,cleanupDelayMs:e.cleanupDelayMs,defaultCleanupDelayMs:2e3,minCleanupDelayMs:250});return}t.activeNodesRef.current.add(n)}function Nbe(e){const{refs:t,getCleanupDelayMs:n}=e;return r=>{const a=n();if(r instanceof AudioScheduledSourceNode){Lbe({refs:t,node:r,cleanupDelayMs:a});return}XV({refs:t,node:r,cleanupDelayMs:a,defaultCleanupDelayMs:a,minCleanupDelayMs:0})}}function eW(e){const{refs:t,getCleanupDelayMs:n}=e;return({source:r,auxiliaries:a,cleanupDelayMs:o})=>{Bbe({refs:t,source:r,auxiliaries:a,cleanupDelayMs:Number.isFinite(o??NaN)?Number(o):n()})}}function E3(e){return t=>Dbe({refs:e,...t})}const lu=(e,t,n)=>Math.max(t,Math.min(n,Number.isFinite(e)?e:t)),Obe=(e,t,n)=>{const r=lu((n-e)/(t-e),0,1);return r*r*(3-2*r)};function _be(e){const t=lu(e.pressureBias,0,1),n=Number.isFinite(e.currentTimeSec)?e.currentTimeSec:0,r=lu(e.triggerPressure??.72,.54,1),a=lu(e.holdSec??1.25,.25,3);if(t>=r)return e.state.holdUntilSec=n+a,e.state.heldPressure=Math.max(e.state.heldPressure,t),t;if(n<e.state.holdUntilSec&&e.state.heldPressure>0){const o=lu((e.state.holdUntilSec-n)/a,0,1),i=.54+(e.state.heldPressure-.54)*o;return Math.max(t,i)}return e.state.holdUntilSec=0,e.state.heldPressure=0,t}function tW(e){const t=lu(e.pressureBias,0,1),n=e.policy,r=lu(n?.densityReductionUnderLoad??0,0,.85),a=Obe(.54,.98,t),o=lu(1-r*a,.34,1);return{pressure:t,densityScale:o,densityReduction:r,lateGrainStrategy:n?.lateGrainStrategy??"short-catch-up",staleWindowMs:lu(n?.staleWindowMs??38,8,160),preventCatchUpStorm:n?.preventCatchUpStorm??!0,sourcePresetId:n?.sourcePresetId??"balanced"}}function nW(e){const{settings:t,envelope:n}=e;if(n.densityReduction<=.001||n.densityScale>=.997)return t;const r=n.densityScale;return Jr({...t,preset:"custom",powerMode:"custom",microDensity:Number((t.microDensity*r).toFixed(3)),maxGrainsPerWindow:Math.max(4,Math.round(t.maxGrainsPerWindow*r)),stepMs:Math.round(t.stepMs/Math.max(.52,r))},t.qualityMode==="fragment"?"grainy":"flowing")}function zbe(e){const t=e.currentTime+Math.max(.004,e.minimumLeadInSec),n=Math.max(0,t-e.nextSliceStart),r=Math.round(n*1e4)/10;return n<=5e-4?{nextSliceStart:e.nextSliceStart,action:"on-time",lateByMs:0,stale:!1}:r>e.envelope.staleWindowMs||e.envelope.lateGrainStrategy==="drop"?{nextSliceStart:rs({transportAnchor:e.transportAnchor,stepSec:e.stepSec,earliestStart:t}),action:"stale-drop-resync",lateByMs:r,stale:!0}:e.envelope.lateGrainStrategy==="freeze"?{nextSliceStart:rs({transportAnchor:e.transportAnchor,stepSec:e.stepSec,earliestStart:t}),action:"freeze-resync",lateByMs:r,stale:!1}:e.envelope.lateGrainStrategy==="jump"?{nextSliceStart:rs({transportAnchor:e.transportAnchor,stepSec:e.stepSec,earliestStart:t}),action:"jump-current",lateByMs:r,stale:!1}:e.envelope.lateGrainStrategy==="smear"?{nextSliceStart:Math.max(e.currentTime+.006,e.nextSliceStart+n*.5),action:"smear-late-window",lateByMs:r,stale:!1}:e.envelope.preventCatchUpStorm&&r>e.envelope.staleWindowMs*.5?{nextSliceStart:rs({transportAnchor:e.transportAnchor,stepSec:e.stepSec,earliestStart:t}),action:"stale-drop-resync",lateByMs:r,stale:!0}:{nextSliceStart:Math.max(e.currentTime+.006,e.nextSliceStart),action:"short-catch-up",lateByMs:r,stale:!1}}function jbe(e){const t=[...e.events];if(t.length<=1)return t;const n=e.currentTime-e.envelope.staleWindowMs/1e3,r=t.filter(c=>{const d=e.getEventTime(c);return!Number.isFinite(d)||d>=n}),a=r.length>0?r:t.slice(-1);if(e.envelope.densityScale>=.997)return a;const o=Math.max(1,Math.ceil(a.length*e.envelope.densityScale));if(!e.getEventClass)return a.slice(0,o);const i=new Map;for(const c of a){const d=e.getEventClass(c),p=i.get(d)??[];p.push(c),i.set(d,p)}const s=new Set,l=Math.max(o,i.size);for(let c=0;s.size<l;c++){let d=!1;for(const p of i.values())p[c]&&s.size<l&&(s.add(p[c]),d=!0);if(!d)break}return a.filter(c=>s.has(c))}const ei=(e,t,n)=>Math.max(t,Math.min(n,Number.isFinite(e)?e:t));function Gbe(e){return{version:1,lane:"root-follow-material-granular",mode:e.mode,entryId:e.entryId,audioNowSec:e.audioNowSec,transportAnchorSec:e.transportAnchorSec,desiredLoopDurationSec:e.desiredLoopDurationSec,sourceDurationSec:e.sourceDurationSec,loopStartSec:e.loopStartSec,loopEndSec:e.loopEndSec,crisis:{densityScale:e.envelope.densityScale,lateGrainStrategy:e.envelope.lateGrainStrategy,staleWindowMs:e.envelope.staleWindowMs,preventCatchUpStorm:e.envelope.preventCatchUpStorm,sourcePresetId:e.envelope.sourcePresetId},tuning:{grainWindowMs:ei(e.settings.windowMs,4,240),grainStepMs:ei(e.settings.stepMs,2,240),maxGrainsPerWindow:Math.round(ei(e.settings.maxGrainsPerWindow,1,256)),microDensity:ei(e.settings.microDensity,0,8),jitter:ei(e.settings.jitter,0,1),sourceSpread:ei(e.settings.sourceSpread,0,1)},windows:[],preservesLegacyMaterialPath:!0,hasSampleBufferTransfer:e.hasSampleBufferTransfer===!0,activeAudioPath:e.activeAudioPath===!0}}function F3(e,t){if(e.windows.length>=96)return;const n=ei(t.windowStartSec,0,Number.MAX_SAFE_INTEGER),r=ei(t.windowDurationSec,.001,8),a=ei(t.sourceOffsetSec,0,Number.MAX_SAFE_INTEGER),o=ei(t.sourceDurationSec,.001,8),i=ei(t.playbackRate,.03125,32),s=ei(t.targetHz,1,2e4),l=ei(t.anchorHz,1,2e4);e.windows.push({id:t.id||`${e.entryId}:${e.mode}:${Math.round(n*1e3)}:${e.windows.length}`,mode:t.mode,quality:t.quality,windowStartSec:n,windowDurationSec:r,sourceOffsetSec:a,sourceDurationSec:o,playbackRate:i,targetHz:s,anchorHz:l,densityScale:ei(t.densityScale,0,1)})}function rW(e){const t=e.windows.reduce((a,o)=>a+o.windowDurationSec,0),n=e.windows.reduce((a,o)=>Math.min(a,o.windowStartSec),Number.POSITIVE_INFINITY),r=e.windows.reduce((a,o)=>Math.max(a,o.windowStartSec+o.windowDurationSec),0);return{version:1,lane:e.lane,mode:e.mode,entryId:e.entryId,windowCount:e.windows.length,totalWindowDurationSec:Math.round(t*1e4)/1e4,horizonSec:Math.max(0,Math.round((r-e.audioNowSec)*1e4)/1e4),earliestLeadMs:Number.isFinite(n)?Math.round((n-e.audioNowSec)*1e4)/10:null,densityScale:e.crisis.densityScale,staleWindowMs:e.crisis.staleWindowMs,maxGrainsPerWindow:e.tuning.maxGrainsPerWindow,preservesLegacyMaterialPath:e.preservesLegacyMaterialPath,hasSampleBufferTransfer:e.hasSampleBufferTransfer,activeAudioPath:e.activeAudioPath}}const T3=(e,t,n)=>Math.max(t,Math.min(n,Number.isFinite(e)?e:t)),L3=new WeakMap;let Hbe=1;function Vbe(e){const t=L3.get(e);if(t)return t;const n=Hbe++;return L3.set(e,n),n}function Wbe(e){return[e.entryId,Vbe(e.buffer),Math.max(1,Math.round(e.buffer.sampleRate||44100)),Math.max(0,e.buffer.length||0),Math.round(e.loopStartSec*1e5),Math.round(e.loopEndSec*1e5)].join(":")}function qbe(e){let t=0,n=0,r=0;const a=Math.max(1,Math.floor(e.length/512));for(let i=0;i<e.length;i+=1){const s=Number.isFinite(e[i])?e[i]:0,l=Math.abs(s);l>t&&(t=l),n+=s*s,i%a===0&&(r=(r+Math.round((s+1)*1000003)+i)%2147483647)}const o=e.length>0?Math.sqrt(n/e.length):0;return{peak:Math.round(t*1e6)/1e6,rms:Math.round(o*1e6)/1e6,checksum:r}}function Qbe(e,t,n,r){const a=new Float32Array(r);if(typeof e.copyFromChannel=="function")return e.copyFromChannel(a,t,n),a;const o=e.getChannelData(t);return a.set(o.subarray(n,Math.min(o.length,n+r))),a}function B3(e){const t=Math.max(1,Math.round(e.buffer.sampleRate||44100)),n=Math.max(0,e.buffer.length||0),r=Math.max(0,e.buffer.duration||n/t),a=T3(e.loopStartSec,0,Math.max(0,r-.001)),o=T3(e.loopEndSec,a+.001,Math.max(a+.001,r)),i=Math.max(512,Math.min(4194304,Math.round(e.maxTransferFrames??8192))),s=Math.max(0,Math.min(n,Math.floor(a*t))),l=Math.max(0,n-s),c=Math.max(1,Math.floor((o-a)*t)),d=Math.max(1,Math.min(i,l||i,c||i)),p=Math.max(0,e.buffer.numberOfChannels||0),f=Math.max(1,Math.min(2,Math.round(e.maxChannels??2))),b=[],g=e.diagnosticStats!==!1;for(let M=0;M<Math.min(p,f);M+=1){const v=Qbe(e.buffer,M,s,d),w=g?qbe(v):{peak:0,rms:0,checksum:0};b.push({channelIndex:M,frameCount:v.length,data:v,...w})}const y=b.reduce((M,v)=>M+v.data.byteLength,0),x=b.reduce((M,v)=>(M+v.checksum+v.channelIndex)%2147483647,0),A=[e.entryId,t,p,n,Math.round(a*1e3),Math.round(o*1e3),s,d,x].join(":");return{version:1,lane:"root-follow-material-buffer-shadow",entryId:e.entryId,audioNowSec:e.audioNowSec,sampleRate:t,numberOfChannels:p,sourceFrameCount:n,durationSec:r,loopStartSec:a,loopEndSec:o,transferStartFrame:s,transferFrameCount:d,transferDurationSec:d/t,transferByteLength:y,transferSignature:A,transferKind:"bounded-shadow-window",channels:b,preservesLegacyMaterialPath:!0,activeAudioPath:!1,hasSampleBufferTransfer:!0,transfersFullSourceBuffer:!1}}function rL(e){return{version:1,lane:e.lane,entryId:e.entryId,sampleRate:e.sampleRate,numberOfChannels:e.numberOfChannels,sourceFrameCount:e.sourceFrameCount,durationSec:Math.round(e.durationSec*1e4)/1e4,loopStartSec:Math.round(e.loopStartSec*1e4)/1e4,loopEndSec:Math.round(e.loopEndSec*1e4)/1e4,transferStartFrame:e.transferStartFrame,transferFrameCount:e.transferFrameCount,transferDurationSec:Math.round(e.transferDurationSec*1e4)/1e4,transferByteLength:e.transferByteLength,transferSignature:e.transferSignature,channelSummaries:e.channels.map(t=>({channelIndex:t.channelIndex,frameCount:t.frameCount,peak:t.peak,rms:t.rms,checksum:t.checksum})),preservesLegacyMaterialPath:e.preservesLegacyMaterialPath,activeAudioPath:e.activeAudioPath,hasSampleBufferTransfer:e.hasSampleBufferTransfer,transfersFullSourceBuffer:e.transfersFullSourceBuffer}}function aL(e){return e.channels.map(t=>t.data.buffer)}function aW(e){return typeof Blob>"u"||typeof URL>"u"||typeof URL.createObjectURL!="function"?"blob-url-unavailable":!("audioWorklet"in e)||!e.audioWorklet||typeof e.audioWorklet.addModule!="function"?"audio-worklet-unavailable":typeof AudioWorkletNode>"u"?"audio-worklet-node-unavailable":"supported"}function Ube(e){const t=new Blob([e],{type:"application/javascript"});return URL.createObjectURL(t)}async function oW(e,t){const n=Ube(t);try{await e.audioWorklet.addModule(n)}finally{try{URL.revokeObjectURL(n)}catch{}}}const Kbe="message-port";function D3(e){return{kind:"message-port",active:!0,reserved:!1,fallbackReason:null,postMessage:e}}function iW(e){return e.preferredBackendKind==="sab-ringbuffer"?{...D3(e.postMessage),fallbackReason:"sab-ringbuffer-backend-reserved-falling-back-to-message-port"}:D3(e.postMessage)}const N3=120,O3=new WeakMap;function sW(){return typeof performance<"u"&&typeof performance.now=="function"?performance.now():Date.now()}function oL(e){const t=O3.get(e);if(t)return t;const n={backendKind:Kbe,sabRingbufferBackendReserved:!0,backendFallbackReason:null,inFlightSequence:null,pendingMessage:null,postedCount:0,pendingCount:0,droppedSupersededCount:0,forcedPostCount:0,ackCount:0,lastPostedAtMs:null};return O3.set(e,n),n}function lW(e,t){return{...e,stableLanePlanTransportBackendKind:t.backendKind,stableLanePlanTransportSabRingbufferReserved:t.sabRingbufferBackendReserved,stableLanePlanTransportBackendFallbackReason:t.backendFallbackReason,stableLanePlanTransportInFlightSequence:t.inFlightSequence,stableLanePlanTransportPendingSequence:t.pendingMessage?.plan.planSequence??null,stableLanePlanTransportPostedCount:t.postedCount,stableLanePlanTransportPendingCount:t.pendingCount,stableLanePlanTransportDroppedSupersededCount:t.droppedSupersededCount,stableLanePlanTransportForcedPostCount:t.forcedPostCount,stableLanePlanTransportAckCount:t.ackCount,stableLanePlanTransportLastPostedAtMs:t.lastPostedAtMs}}function cW(e){e.state.backendKind=e.backend.kind,e.state.sabRingbufferBackendReserved=!0,e.state.backendFallbackReason=e.backend.fallbackReason,e.backend.postMessage(e.message),e.state.inFlightSequence=e.message.plan.planSequence,e.state.postedCount+=1,e.forced&&(e.state.forcedPostCount+=1),e.state.lastPostedAtMs=sW(),e.publishState(e.state)}function $be(e){const t=oL(e.ctx);t.backendKind=e.backend.kind,t.sabRingbufferBackendReserved=!0,t.backendFallbackReason=e.backend.fallbackReason;const n=t.lastPostedAtMs===null?Number.POSITIVE_INFINITY:sW()-t.lastPostedAtMs;if(t.inFlightSequence===null||n>=N3){const a=t.inFlightSequence!==null&&n>=N3;return cW({state:t,message:e.message,forced:a,backend:e.backend,publishState:e.publishState}),{posted:!0,pending:!1,forced:a}}return t.pendingMessage!==null&&(t.droppedSupersededCount+=1),t.pendingMessage=e.message,t.pendingCount=1,e.publishState(t),{posted:!1,pending:!0,forced:!1}}function Xbe(e){const t=oL(e.ctx);t.ackCount+=1,(t.inFlightSequence===null||e.planSequence>=t.inFlightSequence)&&(t.inFlightSequence=null),e.publishState(t);const n=t.pendingMessage;return!n||!e.canPostPending?!1:(t.pendingMessage=null,t.pendingCount=0,cW({state:t,message:n,forced:!1,backend:e.backend,publishState:e.publishState}),!0)}const iL="xensonar-root-follow-worklet-shadow-bridge",Ybe=`
class XensonarRootFollowWorkletShadowBridge extends AudioWorkletProcessor {
  constructor() {
    super();
    this.messageCount = 0;
    this.directPilotMessageCount = 0;
    this.granularPlanMessageCount = 0;
    this.bufferTransferMessageCount = 0;
    this.granularPilotMessageCount = 0;
    this.stableLaneMessageCount = 0;
    this.bridgeSessionId = 0;
    this.processorGeneration = 0;
    this.stableLaneBufferAckCount = 0;
    this.stableLaneBufferRejectCount = 0;
    this.stableLanePlanAckCount = 0;
    this.stableLanePlanRejectCount = 0;
    this.stableLaneLastAcceptedPlanSequence = 0;
    this.stableLanePlanTransportAcceptedCount = 0;
    this.stableLanePlanTransportDroppedStaleCount = 0;
    this.stableLaneLastRejectedReason = null;
    this.processQuantumCount = 0;
    this.renderedFrameCount = 0;
    this.renderedSampleCount = 0;
    this.activeRenderQuantumCount = 0;
    this.directRenderedFrameCount = 0;
    this.granularRenderedFrameCount = 0;
    this.stableLaneRenderedFrameCount = 0;
    this.stableLaneActiveRenderQuantumCount = 0;
    this.processHotPathCompactionCount = 0;
    this.processHotPathDroppedDirectCount = 0;
    this.processHotPathDroppedGranularCount = 0;
    this.processHotPathRetainedDirectCount = 0;
    this.processHotPathRetainedGranularCount = 0;
    this.stableLaneHoldQuantumCount = 0;
    this.stableLaneCrossfadeFrameCount = 0;
    this.stableLaneGainRampFrameCount = 0;
    this.stableLanePlanCount = 0;
    this.stableLaneRetuneCount = 0;
    this.lastThroughputReportAtWorkletTimeSec = 0;
    this.stableLaneSyntheticSilentProbeAttemptCount = 0;
    this.stableLaneSyntheticSilentProbeAckCount = 0;
    this.stableLaneSyntheticSilentProbeLastResult = null;
    this.directPilotActive = false;
    this.granularPilotActive = false;
    this.stableLaneActive = false;
    this.stableLane = null;
    this.previousStableLane = null;
    this.stableLaneGain = 0;
    this.stableLanePlaybackRate = 1;
    this.stableLaneFadeFrames = Math.max(128, Math.floor(sampleRate * 0.010));
    this.stableLaneSeamFadeFrames = Math.max(64, Math.min(512, Math.floor(sampleRate * 0.006)));
    this.stableLaneSeamGuardFrameCount = 0;
    this.events = [];
    this.granularEvents = [];
    this.phaseById = new Map();
    this.sampleBuffers = new Map();
    this.makeStableLaneBufferKey = (entryId, bufferGeneration) => String(entryId || '') + ':' + String(Math.max(0, Number(bufferGeneration) || 0));
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'root-follow-worklet-ping') {
        this.port.postMessage({
          type: 'root-follow-worklet-pong',
          processQuantumCount: this.processQuantumCount,
          renderedFrameCount: this.renderedFrameCount,
          stableLanePlanCount: this.stableLanePlanCount,
          stableLaneActive: this.stableLaneActive,
          workletTimeSec: currentTime,
        });
        return;
      }
      if (data.type === 'root-follow-worklet-shadow-plan') {
        this.messageCount += 1;
        this.port.postMessage({
          type: 'root-follow-worklet-shadow-ack',
          messageCount: this.messageCount,
          eventCount: Number(data.eventCount) || 0,
          audioNowSec: Number(data.audioNowSec) || 0,
        });
        return;
      }
      if (data.type === 'root-follow-worklet-granular-shadow-plan') {
        this.granularPlanMessageCount += 1;
        const windows = Array.isArray(data.plan && data.plan.windows) ? data.plan.windows : [];
        this.port.postMessage({
          type: 'root-follow-worklet-granular-shadow-ack',
          messageCount: this.granularPlanMessageCount,
          windowCount: windows.length,
          activeAudioPath: Boolean(data.plan && data.plan.activeAudioPath),
          hasSampleBufferTransfer: Boolean(data.plan && data.plan.hasSampleBufferTransfer),
        });
        return;
      }
      if (data.type === 'root-follow-worklet-stable-lane-buffer-transfer') {
        this.bufferTransferMessageCount += 1;
        const transfer = data.transfer || {};
        const bridgeSessionId = Math.max(0, Number(data.bridgeSessionId) || 0);
        const processorGeneration = Math.max(0, Number(data.processorGeneration) || 0);
        const bufferGeneration = Math.max(1, Number(data.bufferGeneration) || Number(transfer.bufferGeneration) || 1);
        const channels = Array.isArray(transfer.channels) ? transfer.channels : [];
        let copiedFrameCount = 0;
        let copiedByteLength = 0;
        for (let index = 0; index < channels.length; index += 1) {
          const channel = channels[index] || {};
          const dataArray = channel.data;
          copiedFrameCount += Number(channel.frameCount) || (dataArray && dataArray.length) || 0;
          copiedByteLength += dataArray && dataArray.byteLength ? dataArray.byteLength : 0;
        }
        const entryId = String(transfer.entryId || '');
        const channelData = channels.map((channel) => channel && channel.data).filter(Boolean);
        let ok = false;
        let rejectedReason = 'ok';
        if (!entryId) rejectedReason = 'missing-entry-id';
        else if (channelData.length === 0 || copiedFrameCount <= 0) rejectedReason = 'empty-buffer';
        else if (bridgeSessionId !== 0 && this.bridgeSessionId !== 0 && bridgeSessionId !== this.bridgeSessionId) rejectedReason = 'stale-session';
        else if (processorGeneration !== 0 && this.processorGeneration !== 0 && processorGeneration !== this.processorGeneration) rejectedReason = 'stale-generation';
        else {
          ok = true;
          rejectedReason = 'ok';
          this.bridgeSessionId = bridgeSessionId || this.bridgeSessionId;
          this.processorGeneration = processorGeneration || this.processorGeneration;
          const bufferState = {
            entryId,
            bufferGeneration,
            bridgeSessionId,
            processorGeneration,
            transferSignature: String(transfer.transferSignature || ''),
            sampleRate: Math.max(1, Number(transfer.sampleRate) || sampleRate),
            transferStartFrame: Math.max(0, Number(transfer.transferStartFrame) || 0),
            transferFrameCount: Math.max(0, Number(transfer.transferFrameCount) || 0),
            channels: channelData,
          };
          this.sampleBuffers.set(this.makeStableLaneBufferKey(entryId, bufferGeneration), bufferState);
          this.sampleBuffers.set(entryId, bufferState);
          this.stableLaneBufferAckCount += 1;
        }
        if (!ok) {
          this.stableLaneBufferRejectCount += 1;
          this.stableLaneLastRejectedReason = rejectedReason;
        }
        this.port.postMessage({
          type: 'root-follow-worklet-stable-lane-buffer-ack',
          messageCount: this.bufferTransferMessageCount,
          bridgeSessionId,
          processorGeneration,
          entryId,
          bufferGeneration,
          ok,
          rejectedReason,
          channelCount: channels.length,
          copiedFrameCount,
          copiedByteLength,
          activeAudioPath: Boolean(transfer.activeAudioPath),
          hasSampleBufferTransfer: Boolean(transfer.hasSampleBufferTransfer),
        });
        return;
      }
      if (data.type === 'root-follow-worklet-buffer-shadow-transfer') {
        this.bufferTransferMessageCount += 1;
        const transfer = data.transfer || {};
        const channels = Array.isArray(transfer.channels) ? transfer.channels : [];
        let copiedFrameCount = 0;
        let copiedByteLength = 0;
        for (let index = 0; index < channels.length; index += 1) {
          const channel = channels[index] || {};
          const dataArray = channel.data;
          copiedFrameCount += Number(channel.frameCount) || (dataArray && dataArray.length) || 0;
          copiedByteLength += dataArray && dataArray.byteLength ? dataArray.byteLength : 0;
        }
        const entryId = String(transfer.entryId || '');
        if (entryId && channels.length > 0) {
          this.sampleBuffers.set(entryId, {
            entryId,
            bufferGeneration: 0,
            transferSignature: String(transfer.transferSignature || ''),
            sampleRate: Math.max(1, Number(transfer.sampleRate) || sampleRate),
            transferStartFrame: Math.max(0, Number(transfer.transferStartFrame) || 0),
            transferFrameCount: Math.max(0, Number(transfer.transferFrameCount) || 0),
            channels: channels.map((channel) => channel && channel.data).filter(Boolean),
          });
        }
        this.port.postMessage({
          type: 'root-follow-worklet-buffer-shadow-ack',
          messageCount: this.bufferTransferMessageCount,
          entryId,
          transferSignature: String(transfer.transferSignature || ''),
          channelCount: channels.length,
          copiedFrameCount,
          copiedByteLength,
          activeAudioPath: Boolean(transfer.activeAudioPath),
          hasSampleBufferTransfer: Boolean(transfer.hasSampleBufferTransfer),
        });
        return;
      }
      if (data.type === 'root-follow-worklet-granular-pilot-plan') {
        this.granularPilotMessageCount += 1;
        this.granularPilotActive = data.active === true;
        const plan = data.plan || {};
        const windows = Array.isArray(plan.windows) ? plan.windows : [];
        const entryId = String(plan.entryId || '');
        const buffer = this.sampleBuffers.get(entryId);
        const safeNow = Number(data.audioNowSec) || currentTime;
        const maxEnd = safeNow + 2.5;
        const kept = [];
        if (buffer && this.granularPilotActive) {
          for (let index = 0; index < windows.length && kept.length < 48; index += 1) {
            const raw = windows[index] || {};
            const startSec = Math.max(safeNow - 0.02, Math.min(Number(raw.windowStartSec) || safeNow, maxEnd));
            const durationSec = Math.max(0.012, Math.min(Number(raw.windowDurationSec) || 0.08, 0.45));
            const endSec = Math.max(startSec + 0.012, Math.min(startSec + durationSec, maxEnd));
            const sourceOffsetSec = Math.max(0, Number(raw.sourceOffsetSec) || 0);
            const playbackRate = Math.max(0.03125, Math.min(8, Number(raw.playbackRate) || 1));
            const densityScale = Math.max(0, Math.min(1, Number(raw.densityScale) || 1));
            kept.push({
              id: String(raw.id || (entryId + ':granular-pilot:' + this.granularPilotMessageCount + ':' + index)),
              entryId,
              startSec,
              endSec,
              sourceOffsetSec,
              playbackRate,
              gain: Math.max(0, Math.min(0.22, 0.045 * (0.5 + densityScale * 0.5))),
            });
          }
        }
        this.compactAndAppendBoundedEvents(this.granularEvents, kept, currentTime - 0.05, 96);
        this.port.postMessage({
          type: 'root-follow-worklet-granular-pilot-ack',
          messageCount: this.granularPilotMessageCount,
          acceptedWindowCount: kept.length,
          active: this.granularPilotActive,
          bufferAvailable: Boolean(buffer),
          entryId,
        });
        return;
      }
      if (data.type === 'root-follow-worklet-stable-lane-plan') {
        this.stableLaneMessageCount += 1;
        const plan = data.plan || {};
        const isSyntheticSilentProbe = data.probeKind === 'stable-lane-synthetic-silent-plan' || plan.probeKind === 'stable-lane-synthetic-silent-plan';
        if (isSyntheticSilentProbe) this.stableLaneSyntheticSilentProbeAttemptCount += 1;
        const bridgeSessionId = Math.max(0, Number(data.bridgeSessionId) || 0);
        const processorGeneration = Math.max(0, Number(data.processorGeneration) || 0);
        const entryId = String(plan.entryId || '');
        const bufferGeneration = Math.max(1, Number(data.bufferGeneration) || Number(plan.bufferGeneration) || 1);
        const bufferKey = this.makeStableLaneBufferKey(entryId, bufferGeneration);
        const buffer = this.sampleBuffers.get(bufferKey) || null;
        const planSequence = Math.max(0, Number(plan.planSequence) || this.stableLaneMessageCount);
        let ok = false;
        let rejectedReason = 'ok';
        if (data.active !== true) rejectedReason = 'inactive-plan';
        else if (!entryId) rejectedReason = 'missing-entry-id';
        else if (!buffer) rejectedReason = 'missing-buffer';
        else if (bridgeSessionId !== 0 && buffer.bridgeSessionId !== 0 && bridgeSessionId !== buffer.bridgeSessionId) rejectedReason = 'stale-session';
        else if (processorGeneration !== 0 && buffer.processorGeneration !== 0 && processorGeneration !== buffer.processorGeneration) rejectedReason = 'stale-generation';
        else if (buffer.bufferGeneration !== bufferGeneration) rejectedReason = 'stale-buffer-generation';
        else if (planSequence < this.stableLaneLastAcceptedPlanSequence) rejectedReason = 'stale-plan-sequence';
        else ok = true;
        if (ok) {
          this.stableLaneLastAcceptedPlanSequence = Math.max(this.stableLaneLastAcceptedPlanSequence, planSequence);
          this.stableLanePlanTransportAcceptedCount += 1;
          const loopStartSec = Math.max(0, Number(plan.loopStartSec) || 0);
          const loopEndSec = Math.max(loopStartSec + 0.02, Number(plan.loopEndSec) || (loopStartSec + 0.25));
          const sourceOffsetSec = Math.max(loopStartSec, Math.min(loopEndSec - 0.005, Number(plan.sourceOffsetSec) || loopStartSec));
          const playbackRate = Math.max(0.03125, Math.min(8, Number(plan.playbackRate) || 1));
          const targetGain = Math.max(0, Math.min(0.28, Number(plan.gain) || 0.035));
          const previous = this.stableLane;
          const offsetJumpSec = previous ? Math.abs((previous.sourceOffsetSec || 0) - sourceOffsetSec) : 0;
          const bufferChanged = previous ? (previous.entryId !== entryId || previous.bufferGeneration !== bufferGeneration) : false;
          const shouldCrossfade = Boolean(previous && (bufferChanged || offsetJumpSec > 0.018));
          if (previous && Math.abs((previous.targetPlaybackRate || previous.playbackRate || 1) - playbackRate) > 0.0005) this.stableLaneRetuneCount += 1;
          if (shouldCrossfade) {
            this.previousStableLane = {
              ...previous,
              fadeFramesRemaining: this.stableLaneFadeFrames,
              fadeFramesTotal: this.stableLaneFadeFrames,
              fadeOutGain: this.stableLaneGain,
            };
            this.stableLaneGain = 0;
          }
          this.stableLanePlaybackRate = previous
            ? previous.playbackRate + (playbackRate - previous.playbackRate) * 0.35
            : playbackRate;
          this.stableLane = {
            entryId,
            bufferGeneration,
            bridgeSessionId,
            processorGeneration,
            anchorTimeSec: Number(data.audioNowSec) || currentTime,
            sourceOffsetSec,
            loopStartSec,
            loopEndSec,
            playbackRate: this.stableLanePlaybackRate,
            targetPlaybackRate: playbackRate,
            targetGain,
            lastPlanWorkletTimeSec: currentTime,
            planSequence,
            fadeInFramesRemaining: shouldCrossfade ? this.stableLaneFadeFrames : 0,
            fadeInFramesTotal: this.stableLaneFadeFrames,
          };
          this.stableLaneActive = true;
          this.stableLanePlanCount += 1;
          this.stableLanePlanAckCount += 1;
          if (isSyntheticSilentProbe) {
            this.stableLaneSyntheticSilentProbeAckCount += 1;
            this.stableLaneSyntheticSilentProbeLastResult = 'ack-ok';
          }
          this.stableLaneLastRejectedReason = null;
        } else {
          this.stableLanePlanRejectCount += 1;
          if (rejectedReason === 'stale-plan-sequence') this.stableLanePlanTransportDroppedStaleCount += 1;
          if (isSyntheticSilentProbe) this.stableLaneSyntheticSilentProbeLastResult = rejectedReason;
          this.stableLaneLastRejectedReason = rejectedReason;
        }
        this.port.postMessage({
          type: 'root-follow-worklet-stable-lane-ack',
          messageCount: this.stableLaneMessageCount,
          bridgeSessionId,
          processorGeneration,
          entryId,
          bufferGeneration,
          planSequence,
          ok,
          active: ok,
          bufferAvailable: Boolean(buffer),
          rejectedReason: ok ? null : rejectedReason,
          stableLaneLastAcceptedPlanSequence: this.stableLaneLastAcceptedPlanSequence,
          stableLanePlanTransportAcceptedCount: this.stableLanePlanTransportAcceptedCount,
          stableLanePlanTransportDroppedStaleCount: this.stableLanePlanTransportDroppedStaleCount,
          probeKind: isSyntheticSilentProbe ? 'stable-lane-synthetic-silent-plan' : null,
        });
        return;
      }
      if (data.type === 'root-follow-worklet-direct-pilot-events') {
        this.directPilotMessageCount += 1;
        this.directPilotActive = data.active === true;
        const incoming = Array.isArray(data.events) ? data.events : [];
        const safeNow = Number(data.audioNowSec) || currentTime;
        const maxEnd = safeNow + 2.5;
        const kept = [];
        for (let index = 0; index < incoming.length && kept.length < 64; index += 1) {
          const raw = incoming[index] || {};
          const startSec = Math.max(safeNow - 0.02, Math.min(Number(raw.startSec) || safeNow, maxEnd));
          const endSec = Math.max(startSec + 0.018, Math.min(Number(raw.endSec) || (startSec + 0.12), maxEnd));
          const frequencyHz = Math.max(20, Math.min(12000, Number(raw.frequencyHz) || 220));
          const gain = Math.max(0, Math.min(0.18, Number(raw.gain) || 0.035));
          kept.push({
            id: String(raw.id || ('pilot-' + this.directPilotMessageCount + '-' + index)),
            startSec,
            endSec,
            frequencyHz,
            gain,
          });
        }
        this.compactAndAppendBoundedEvents(this.events, kept, currentTime - 0.05, 128);
        this.port.postMessage({
          type: 'root-follow-worklet-direct-pilot-ack',
          messageCount: this.directPilotMessageCount,
          acceptedEventCount: kept.length,
          active: this.directPilotActive,
        });
      }
    };
    this.port.postMessage({ type: 'root-follow-worklet-shadow-ready' });
  }

  compactAndAppendBoundedEvents(queue, incoming, minEndSec, maxLength) {
    let writeIndex = 0;
    for (let readIndex = 0; readIndex < queue.length; readIndex += 1) {
      const item = queue[readIndex];
      if (item && item.endSec > minEndSec) {
        if (writeIndex !== readIndex) queue[writeIndex] = item;
        writeIndex += 1;
      }
    }
    const overflow = Math.max(0, writeIndex + incoming.length - maxLength);
    if (overflow > 0) {
      for (let readIndex = overflow; readIndex < writeIndex; readIndex += 1) {
        queue[readIndex - overflow] = queue[readIndex];
      }
      writeIndex -= overflow;
    }
    for (let index = 0; index < incoming.length && writeIndex < maxLength; index += 1) {
      queue[writeIndex] = incoming[index];
      writeIndex += 1;
    }
    queue.length = writeIndex;
    return writeIndex;
  }

  reportThroughput(hasStableLane, hasPreviousStableLane, hasDirectEvents, hasGranularEvents) {
      // Stable Lane is a resident renderer; it should not create an 80 ms
      // diagnostic message clock merely because audio is healthy. 180 ms is
      // still well inside the 450/900 ms liveness windows used by the host.
      const minInterval = (hasStableLane || hasPreviousStableLane)
        ? 0.18
        : (hasDirectEvents || hasGranularEvents)
          ? 0.08
          : 0.28;
      if (currentTime - this.lastThroughputReportAtWorkletTimeSec < minInterval) return;
      this.lastThroughputReportAtWorkletTimeSec = currentTime;
      this.port.postMessage({
        type: 'root-follow-worklet-throughput-meter',
        processorAlive: true,
        processorReady: true,
        processQuantumCount: this.processQuantumCount,
        renderedFrameCount: this.renderedFrameCount,
        renderedSampleCount: this.renderedSampleCount,
        activeRenderQuantumCount: this.activeRenderQuantumCount,
        directRenderedFrameCount: this.directRenderedFrameCount,
        granularRenderedFrameCount: this.granularRenderedFrameCount,
        stableLaneRenderedFrameCount: this.stableLaneRenderedFrameCount,
        stableLaneActiveRenderQuantumCount: this.stableLaneActiveRenderQuantumCount,
        processHotPathCompactionCount: this.processHotPathCompactionCount,
        processHotPathDroppedDirectCount: this.processHotPathDroppedDirectCount,
        processHotPathDroppedGranularCount: this.processHotPathDroppedGranularCount,
        processHotPathRetainedDirectCount: this.processHotPathRetainedDirectCount,
        processHotPathRetainedGranularCount: this.processHotPathRetainedGranularCount,
        stableLaneHoldQuantumCount: this.stableLaneHoldQuantumCount,
        stableLaneCrossfadeFrameCount: this.stableLaneCrossfadeFrameCount,
        stableLaneGainRampFrameCount: this.stableLaneGainRampFrameCount,
        stableLanePlanCount: this.stableLanePlanCount,
        stableLaneRetuneCount: this.stableLaneRetuneCount,
        stableLaneSeamGuardFrameCount: this.stableLaneSeamGuardFrameCount,
        stableLaneBufferAckCount: this.stableLaneBufferAckCount,
        stableLaneBufferRejectCount: this.stableLaneBufferRejectCount,
        stableLanePlanAckCount: this.stableLanePlanAckCount,
        stableLanePlanRejectCount: this.stableLanePlanRejectCount,
        stableLaneLastAcceptedPlanSequence: this.stableLaneLastAcceptedPlanSequence,
        stableLanePlanTransportAcceptedCount: this.stableLanePlanTransportAcceptedCount,
        stableLanePlanTransportDroppedStaleCount: this.stableLanePlanTransportDroppedStaleCount,
        stableLaneRejectedReason: this.stableLaneLastRejectedReason,
        stableLaneActive: this.stableLaneActive,
        bridgeSessionId: this.bridgeSessionId,
        processorGeneration: this.processorGeneration,
        directQueueLength: this.events.length,
        granularQueueLength: this.granularEvents.length,
        sampleBufferCount: this.sampleBuffers.size,
        workletTimeSec: currentTime,
      });
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) {
      this.processQuantumCount += 1;
      return true;
    }
    const left = output[0];
    const right = output[1] || null;
    this.processQuantumCount += 1;
    this.renderedFrameCount += left.length;
    this.renderedSampleCount += left.length * (right ? 2 : 1);
    left.fill(0);
    if (right) right.fill(0);
    const hasDirectEvents = this.directPilotActive && this.events.length > 0;
    const hasGranularEvents = this.granularPilotActive && this.granularEvents.length > 0;
    const hasStableLane = this.stableLaneActive && this.stableLane !== null;
    const hasPreviousStableLane = this.previousStableLane !== null;
    let directFramesThisQuantum = 0;
    let granularFramesThisQuantum = 0;

    if (!hasDirectEvents && !hasGranularEvents && !hasStableLane && !hasPreviousStableLane) {
      this.reportThroughput(hasStableLane, hasPreviousStableLane, hasDirectEvents, hasGranularEvents);
      return true;
    }
    const twoPi = 6.283185307179586;
    if (hasStableLane || hasPreviousStableLane) {
      let stableFramesThisQuantum = 0;
      let stableCrossfadeFramesThisQuantum = 0;
      let stableGainRampFramesThisQuantum = 0;

      const previousLane = this.previousStableLane;
      const previousBuffer = previousLane
        ? (this.sampleBuffers.get(this.makeStableLaneBufferKey(previousLane.entryId, previousLane.bufferGeneration)) || this.sampleBuffers.get(previousLane.entryId))
        : null;
      if (previousLane && previousBuffer && previousBuffer.channels && previousBuffer.channels.length > 0 && previousLane.fadeFramesRemaining > 0) {
        const leftData = previousBuffer.channels[0];
        const rightData = previousBuffer.channels[1] || leftData;
        const stereo = right && rightData !== leftData;
        const loopStartFrame = Math.max(0, Math.floor(previousLane.loopStartSec * previousBuffer.sampleRate) - previousBuffer.transferStartFrame);
        const loopEndFrame = Math.max(loopStartFrame + 2, Math.min(leftData.length - 1, Math.floor(previousLane.loopEndSec * previousBuffer.sampleRate) - previousBuffer.transferStartFrame));
        const loopFrameCount = Math.max(2, loopEndFrame - loopStartFrame);
        const seamFadeFrames = Math.min(this.stableLaneSeamFadeFrames, Math.max(2, Math.floor(loopFrameCount * 0.25)));
        for (let i = 0; i < left.length && previousLane.fadeFramesRemaining > 0; i += 1) {
          const t = currentTime + i / sampleRate;
          const elapsed = Math.max(0, t - previousLane.anchorTimeSec);
          const rawSourceFrame = (previousLane.sourceOffsetSec * previousBuffer.sampleRate - previousBuffer.transferStartFrame) + elapsed * previousLane.playbackRate * previousBuffer.sampleRate;
          const loopLocalFrame = (((rawSourceFrame - loopStartFrame) % loopFrameCount) + loopFrameCount) % loopFrameCount;
          const wrappedFrame = loopStartFrame + loopLocalFrame;
          if (wrappedFrame < 0 || wrappedFrame >= leftData.length - 1) continue;
          const idx = Math.floor(wrappedFrame);
          const frac = wrappedFrame - idx;
          const fade = Math.max(0, Math.min(1, previousLane.fadeFramesRemaining / Math.max(1, previousLane.fadeFramesTotal)));
          const gain = previousLane.fadeOutGain * fade;
          let lv = leftData[idx] * (1 - frac) + leftData[idx + 1] * frac;
          let rv = stereo ? rightData[idx] * (1 - frac) + rightData[idx + 1] * frac : lv;
          if (seamFadeFrames > 2 && loopLocalFrame >= loopFrameCount - seamFadeFrames) {
            const seamPos = loopLocalFrame - (loopFrameCount - seamFadeFrames);
            const seamMix = Math.max(0, Math.min(1, seamPos / Math.max(1, seamFadeFrames)));
            const headFrame = loopStartFrame + seamPos;
            if (headFrame >= 0 && headFrame < leftData.length - 1) {
              const headIdx = Math.floor(headFrame);
              const headFrac = headFrame - headIdx;
              const headLv = leftData[headIdx] * (1 - headFrac) + leftData[headIdx + 1] * headFrac;
              const headRv = stereo ? rightData[headIdx] * (1 - headFrac) + rightData[headIdx + 1] * headFrac : headLv;
              lv = lv * (1 - seamMix) + headLv * seamMix;
              rv = rv * (1 - seamMix) + headRv * seamMix;
              this.stableLaneSeamGuardFrameCount += 1;
            }
          }
          left[i] += lv * gain;
          if (right) right[i] += rv * gain;
          previousLane.fadeFramesRemaining -= 1;
          stableCrossfadeFramesThisQuantum += 1;
        }
        if (previousLane.fadeFramesRemaining <= 0) this.previousStableLane = null;
      } else if (previousLane && previousLane.fadeFramesRemaining <= 0) {
        this.previousStableLane = null;
      }

      const lane = this.stableLane;
      const buffer = lane ? (this.sampleBuffers.get(this.makeStableLaneBufferKey(lane.entryId, lane.bufferGeneration)) || this.sampleBuffers.get(lane.entryId)) : null;
      if (lane && buffer && buffer.channels && buffer.channels.length > 0) {
        const leftData = buffer.channels[0];
        const rightData = buffer.channels[1] || leftData;
        const stereo = right && rightData !== leftData;
        const loopStartFrame = Math.max(0, Math.floor(lane.loopStartSec * buffer.sampleRate) - buffer.transferStartFrame);
        const loopEndFrame = Math.max(loopStartFrame + 2, Math.min(leftData.length - 1, Math.floor(lane.loopEndSec * buffer.sampleRate) - buffer.transferStartFrame));
        const loopFrameCount = Math.max(2, loopEndFrame - loopStartFrame);
        const seamFadeFrames = Math.min(this.stableLaneSeamFadeFrames, Math.max(2, Math.floor(loopFrameCount * 0.25)));
        lane.playbackRate += (lane.targetPlaybackRate - lane.playbackRate) * 0.018;
        for (let i = 0; i < left.length; i += 1) {
          const t = currentTime + i / sampleRate;
          const elapsed = Math.max(0, t - lane.anchorTimeSec);
          const rawSourceFrame = (lane.sourceOffsetSec * buffer.sampleRate - buffer.transferStartFrame) + elapsed * lane.playbackRate * buffer.sampleRate;
          const loopLocalFrame = (((rawSourceFrame - loopStartFrame) % loopFrameCount) + loopFrameCount) % loopFrameCount;
          const wrappedFrame = loopStartFrame + loopLocalFrame;
          if (wrappedFrame < 0 || wrappedFrame >= leftData.length - 1) continue;
          const idx = Math.floor(wrappedFrame);
          const frac = wrappedFrame - idx;
          const fadeIn = lane.fadeInFramesRemaining > 0
            ? Math.max(0, Math.min(1, 1 - lane.fadeInFramesRemaining / Math.max(1, lane.fadeInFramesTotal)))
            : 1;
          const targetGain = lane.targetGain * fadeIn;
          const beforeGain = this.stableLaneGain;
          this.stableLaneGain += (targetGain - this.stableLaneGain) * 0.0065;
          if (Math.abs(this.stableLaneGain - beforeGain) > 0.000001) stableGainRampFramesThisQuantum += 1;
          if (lane.fadeInFramesRemaining > 0) lane.fadeInFramesRemaining -= 1;
          let lv = leftData[idx] * (1 - frac) + leftData[idx + 1] * frac;
          let rv = stereo ? rightData[idx] * (1 - frac) + rightData[idx + 1] * frac : lv;
          if (seamFadeFrames > 2 && loopLocalFrame >= loopFrameCount - seamFadeFrames) {
            const seamPos = loopLocalFrame - (loopFrameCount - seamFadeFrames);
            const seamMix = Math.max(0, Math.min(1, seamPos / Math.max(1, seamFadeFrames)));
            const headFrame = loopStartFrame + seamPos;
            if (headFrame >= 0 && headFrame < leftData.length - 1) {
              const headIdx = Math.floor(headFrame);
              const headFrac = headFrame - headIdx;
              const headLv = leftData[headIdx] * (1 - headFrac) + leftData[headIdx + 1] * headFrac;
              const headRv = stereo ? rightData[headIdx] * (1 - headFrac) + rightData[headIdx + 1] * headFrac : headLv;
              lv = lv * (1 - seamMix) + headLv * seamMix;
              rv = rv * (1 - seamMix) + headRv * seamMix;
              this.stableLaneSeamGuardFrameCount += 1;
            }
          }
          const outGain = this.stableLaneGain;
          left[i] += lv * outGain;
          if (right) right[i] += rv * outGain;
          stableFramesThisQuantum += 1;
        }
        if (stableFramesThisQuantum > 0) {
          this.activeRenderQuantumCount += 1;
          this.stableLaneActiveRenderQuantumCount += 1;
          this.stableLaneRenderedFrameCount += stableFramesThisQuantum;
          if (currentTime - lane.lastPlanWorkletTimeSec > 0.18) this.stableLaneHoldQuantumCount += 1;
        }
      } else if (lane) {
        this.stableLaneActive = false;
        this.stableLane = null;
      }
      if (stableCrossfadeFramesThisQuantum > 0) this.stableLaneCrossfadeFrameCount += stableCrossfadeFramesThisQuantum;
      if (stableGainRampFramesThisQuantum > 0) this.stableLaneGainRampFrameCount += stableGainRampFramesThisQuantum;
      if (stableFramesThisQuantum === 0 && stableCrossfadeFramesThisQuantum > 0) this.activeRenderQuantumCount += 1;
    }
    if (hasGranularEvents) {
      let granularWriteIndex = 0;
      let granularDroppedThisQuantum = 0;
      const granularQueueLength = this.granularEvents.length;
      for (let eventIndex = 0; eventIndex < granularQueueLength; eventIndex += 1) {
        const item = this.granularEvents[eventIndex];
        const buffer = item ? this.sampleBuffers.get(item.entryId) : null;
        let used = false;
        if (buffer && buffer.channels && buffer.channels.length > 0) {
          const duration = Math.max(0.012, item.endSec - item.startSec);
          const leftData = buffer.channels[0];
          const rightData = buffer.channels[1] || leftData;
          const stereo = right && rightData !== leftData;
          for (let i = 0; i < left.length; i += 1) {
            const t = currentTime + i / sampleRate;
            if (t < item.startSec || t > item.endSec) continue;
            const elapsed = Math.max(0, t - item.startSec);
            const sourceFrame = (item.sourceOffsetSec + elapsed * item.playbackRate) * buffer.sampleRate - buffer.transferStartFrame;
            if (sourceFrame < 0 || sourceFrame >= leftData.length - 1) continue;
            const idx = Math.floor(sourceFrame);
            const frac = sourceFrame - idx;
            const lv = leftData[idx] * (1 - frac) + leftData[idx + 1] * frac;
            const rv = stereo ? rightData[idx] * (1 - frac) + rightData[idx + 1] * frac : lv;
            const pos = Math.max(0, Math.min(1, elapsed / duration));
            const attack = Math.min(1, pos / 0.12);
            const release = Math.min(1, (1 - pos) / 0.24);
            const env = Math.max(0, Math.min(attack, release));
            left[i] += lv * item.gain * env;
            if (right) right[i] += rv * item.gain * env;
            used = true;
            granularFramesThisQuantum += 1;
          }
        }
        if (item && item.endSec > currentTime && (used || item.startSec > currentTime)) {
          if (granularWriteIndex !== eventIndex) this.granularEvents[granularWriteIndex] = item;
          granularWriteIndex += 1;
        } else {
          granularDroppedThisQuantum += 1;
        }
      }
      if (granularWriteIndex < granularQueueLength) this.granularEvents.length = granularWriteIndex;
      this.processHotPathRetainedGranularCount = granularWriteIndex;
      if (granularDroppedThisQuantum > 0) {
        this.processHotPathCompactionCount += 1;
        this.processHotPathDroppedGranularCount += granularDroppedThisQuantum;
      }
    }
    if (!hasDirectEvents) {
      if (granularFramesThisQuantum > 0) {
        this.activeRenderQuantumCount += 1;
        this.granularRenderedFrameCount += granularFramesThisQuantum;
      }
      this.reportThroughput(hasStableLane, hasPreviousStableLane, hasDirectEvents, hasGranularEvents);
      return true;
    }
    let directWriteIndex = 0;
    let directDroppedThisQuantum = 0;
    const directQueueLength = this.events.length;
    for (let eventIndex = 0; eventIndex < directQueueLength; eventIndex += 1) {
      const item = this.events[eventIndex];
      if (!item) continue;
      const duration = Math.max(0.018, item.endSec - item.startSec);
      let phase = this.phaseById.get(item.id) || 0;
      let used = false;
      for (let i = 0; i < left.length; i += 1) {
        const t = currentTime + i / sampleRate;
        if (t < item.startSec || t > item.endSec) continue;
        const pos = Math.max(0, Math.min(1, (t - item.startSec) / duration));
        const attack = Math.min(1, pos / 0.08);
        const release = Math.min(1, (1 - pos) / 0.18);
        const env = Math.max(0, Math.min(attack, release));
        const value = Math.sin(phase) * item.gain * env;
        phase += twoPi * item.frequencyHz / sampleRate;
        if (phase > twoPi) phase -= twoPi;
        left[i] += value;
        if (right) right[i] += value;
        used = true;
        directFramesThisQuantum += 1;
      }
      this.phaseById.set(item.id, phase);
      if (item.endSec > currentTime && (used || item.startSec > currentTime)) {
        if (directWriteIndex !== eventIndex) this.events[directWriteIndex] = item;
        directWriteIndex += 1;
      } else {
        this.phaseById.delete(item.id);
        directDroppedThisQuantum += 1;
      }
    }
    if (directWriteIndex < directQueueLength) this.events.length = directWriteIndex;
    this.processHotPathRetainedDirectCount = directWriteIndex;
    if (directDroppedThisQuantum > 0) {
      this.processHotPathCompactionCount += 1;
      this.processHotPathDroppedDirectCount += directDroppedThisQuantum;
    }
    if (directFramesThisQuantum > 0 || granularFramesThisQuantum > 0) {
      this.activeRenderQuantumCount += 1;
      this.directRenderedFrameCount += directFramesThisQuantum;
      this.granularRenderedFrameCount += granularFramesThisQuantum;
    }
    this.reportThroughput(hasStableLane, hasPreviousStableLane, hasDirectEvents, hasGranularEvents);
    return true;
  }
}

registerProcessor('${iL}', XensonarRootFollowWorkletShadowBridge);
`,Jbe="Cross-Origin-Opener-Policy: same-origin",Zbe="Cross-Origin-Embedder-Policy: require-corp";function _3(e){return globalThis[e]===!0}function eye(){const t=globalThis.location?.protocol;return typeof t=="string"?t:null}function uW(){const e=typeof window<"u",t=eye(),n=typeof globalThis.SharedArrayBuffer=="function",r=_3("crossOriginIsolated"),a=_3("isSecureContext"),o=t==="file:"||!r&&e;let i="blocked",s="ready";return e?a?r?n?(i="available",s="ready"):s="shared-array-buffer-missing":s="cross-origin-isolation-missing":s="secure-context-missing":(i="unknown",s="not-in-browser-runtime"),{stableLaneSabTransportReadiness:i,stableLaneSabTransportReady:i==="available",stableLaneSabTransportReadinessReason:s,stableLaneSabTransportSharedArrayBufferAvailable:n,stableLaneSabTransportCrossOriginIsolated:r,stableLaneSabTransportSecureContext:a,stableLaneSabTransportSingleFileHtmlLikelyBlocked:o,stableLaneSabTransportRequiredCoop:Jbe,stableLaneSabTransportRequiredCoep:Zbe}}function tye(e){return{...e,...uW()}}const nye=iL,rye="__XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__";function KA(e){const t=uW();return{version:1,status:"unstarted",processorName:nye,requestedAtMs:null,completedAtMs:null,lastMessageAtMs:null,readyMessageCount:0,bridgeSessionId:0,processorGeneration:0,workletNodeCreated:!1,workletNodeConnected:!1,processorReady:!1,processLoopActive:!1,stableLaneBufferAcked:!1,stableLaneBufferRejectedReason:null,stableLanePlanAcked:!1,stableLanePlanRejectedReason:null,stableLanePlanSentCount:0,stableLanePlanTransportBackendKind:"message-port",stableLanePlanTransportSabRingbufferReserved:!0,stableLanePlanTransportBackendFallbackReason:null,stableLaneSabTransportReadiness:t.stableLaneSabTransportReadiness,stableLaneSabTransportReady:t.stableLaneSabTransportReady,stableLaneSabTransportReadinessReason:t.stableLaneSabTransportReadinessReason,stableLaneSabTransportSharedArrayBufferAvailable:t.stableLaneSabTransportSharedArrayBufferAvailable,stableLaneSabTransportCrossOriginIsolated:t.stableLaneSabTransportCrossOriginIsolated,stableLaneSabTransportSecureContext:t.stableLaneSabTransportSecureContext,stableLaneSabTransportSingleFileHtmlLikelyBlocked:t.stableLaneSabTransportSingleFileHtmlLikelyBlocked,stableLaneSabTransportRequiredCoop:t.stableLaneSabTransportRequiredCoop,stableLaneSabTransportRequiredCoep:t.stableLaneSabTransportRequiredCoep,stableLanePlanTransportInFlightSequence:null,stableLanePlanTransportPendingSequence:null,stableLanePlanTransportPostedCount:0,stableLanePlanTransportPendingCount:0,stableLanePlanTransportDroppedSupersededCount:0,stableLanePlanTransportForcedPostCount:0,stableLanePlanTransportAckCount:0,stableLanePlanTransportLastPostedAtMs:null,stableLaneBufferGeneration:null,messageCount:0,directPilotMessageCount:0,granularPlanMessageCount:0,bufferTransferMessageCount:0,granularPilotMessageCount:0,stableLaneMessageCount:0,detail:null,errorMessage:null,preservesMainThreadReferencePath:!0,silentShadowOnly:!0,directPilotActive:!1,granularShadowActive:!1,bufferShadowActive:!1,granularPilotActive:!1,stableLaneActive:!1,directPilotScope:"root-follow-direct-synth-only",pilotHealth:"unknown",lastDirectPilotAcceptedEventCount:0,lastGranularPilotAcceptedWindowCount:0,lastGranularPilotBufferAvailable:!1,lastStableLaneBufferAvailable:!1,lastBufferTransferCopiedByteLength:0,lastDirectPilotAckAtMs:null,lastGranularPilotAckAtMs:null,lastStableLaneAckAtMs:null,lastBufferTransferAckAtMs:null,processorAlive:!1,processorErrorCount:0,processQuantumCount:0,renderedFrameCount:0,renderedSampleCount:0,activeRenderQuantumCount:0,directRenderedFrameCount:0,granularRenderedFrameCount:0,stableLaneRenderedFrameCount:0,stableLaneRenderedFrameDelta:0,stableLaneActiveRenderQuantumCount:0,processHotPathCompactionCount:0,processHotPathDroppedDirectCount:0,processHotPathDroppedGranularCount:0,processHotPathRetainedDirectCount:0,processHotPathRetainedGranularCount:0,lastStableLaneFrameAdvanceAtMs:null,stableLaneHoldQuantumCount:0,stableLaneCrossfadeFrameCount:0,stableLaneGainRampFrameCount:0,stableLanePlanCount:0,stableLaneRetuneCount:0,stableLaneBufferAckCount:0,stableLaneBufferRejectCount:0,stableLanePlanAckCount:0,stableLanePlanRejectCount:0,stableLaneLastAcceptedPlanSequence:0,stableLanePlanTransportAcceptedCount:0,stableLanePlanTransportDroppedStaleCount:0,directPilotAcceptedEventTotal:0,granularPilotAcceptedWindowTotal:0,bufferTransferCopiedByteLengthTotal:0,lastThroughputReportAtWorkletTimeSec:null,stableLaneSyntheticSilentProbeAttemptCount:0,stableLaneSyntheticSilentProbePostedCount:0,stableLaneSyntheticSilentProbeAckCount:0,stableLaneSyntheticSilentProbeFrameDelta:0,stableLaneSyntheticSilentProbeLastResult:null,stableLaneSyntheticSilentProbeLastAtMs:null,...e}}function aye(e){return e.stableLaneActive?e.lastStableLaneBufferAvailable?"pilot-ready":"pilot-starved":!e.directPilotActive&&!e.granularPilotActive?"shadow-only":e.granularPilotActive?e.lastGranularPilotBufferAvailable&&e.lastGranularPilotAcceptedWindowCount>0?"pilot-ready":"pilot-starved":e.directPilotActive&&e.lastDirectPilotAcceptedEventCount>0?"pilot-ready":"pilot-starved"}function Ag(e){return{workletNodeCreated:e.workletNodeCreated,workletNodeConnected:e.workletNodeConnected,processorReady:e.processorReady,processorAlive:e.processorAlive,processLoopActive:e.processLoopActive,bridgeSessionId:e.bridgeSessionId,processorGeneration:e.processorGeneration,processorErrorCount:e.processorErrorCount,processQuantumCount:e.processQuantumCount,renderedFrameCount:e.renderedFrameCount,renderedSampleCount:e.renderedSampleCount,activeRenderQuantumCount:e.activeRenderQuantumCount,directRenderedFrameCount:e.directRenderedFrameCount,granularRenderedFrameCount:e.granularRenderedFrameCount,stableLaneRenderedFrameCount:e.stableLaneRenderedFrameCount,stableLaneHoldQuantumCount:e.stableLaneHoldQuantumCount,stableLaneCrossfadeFrameCount:e.stableLaneCrossfadeFrameCount,stableLaneGainRampFrameCount:e.stableLaneGainRampFrameCount,stableLanePlanCount:e.stableLanePlanCount,stableLaneRetuneCount:e.stableLaneRetuneCount,stableLaneLastAcceptedPlanSequence:e.stableLaneLastAcceptedPlanSequence,stableLanePlanTransportAcceptedCount:e.stableLanePlanTransportAcceptedCount,stableLanePlanTransportDroppedStaleCount:e.stableLanePlanTransportDroppedStaleCount,stableLanePlanTransportInFlightSequence:e.stableLanePlanTransportInFlightSequence,stableLanePlanTransportPendingSequence:e.stableLanePlanTransportPendingSequence,stableLanePlanTransportPostedCount:e.stableLanePlanTransportPostedCount,stableLanePlanTransportPendingCount:e.stableLanePlanTransportPendingCount,stableLanePlanTransportDroppedSupersededCount:e.stableLanePlanTransportDroppedSupersededCount,stableLanePlanTransportForcedPostCount:e.stableLanePlanTransportForcedPostCount,stableLanePlanTransportAckCount:e.stableLanePlanTransportAckCount,stableLanePlanTransportLastPostedAtMs:e.stableLanePlanTransportLastPostedAtMs,stableLanePlanTransportBackendKind:e.stableLanePlanTransportBackendKind,stableLanePlanTransportSabRingbufferReserved:e.stableLanePlanTransportSabRingbufferReserved,stableLanePlanTransportBackendFallbackReason:e.stableLanePlanTransportBackendFallbackReason,stableLaneSabTransportReadiness:e.stableLaneSabTransportReadiness,stableLaneSabTransportReady:e.stableLaneSabTransportReady,stableLaneSabTransportReadinessReason:e.stableLaneSabTransportReadinessReason,stableLaneSabTransportSharedArrayBufferAvailable:e.stableLaneSabTransportSharedArrayBufferAvailable,stableLaneSabTransportCrossOriginIsolated:e.stableLaneSabTransportCrossOriginIsolated,stableLaneSabTransportSecureContext:e.stableLaneSabTransportSecureContext,stableLaneSabTransportSingleFileHtmlLikelyBlocked:e.stableLaneSabTransportSingleFileHtmlLikelyBlocked,stableLaneSabTransportRequiredCoop:e.stableLaneSabTransportRequiredCoop,stableLaneSabTransportRequiredCoep:e.stableLaneSabTransportRequiredCoep,stableLaneBufferAcked:e.stableLaneBufferAcked,stableLaneBufferRejectedReason:e.stableLaneBufferRejectedReason,stableLanePlanAcked:e.stableLanePlanAcked,stableLanePlanRejectedReason:e.stableLanePlanRejectedReason,directPilotAcceptedEventTotal:e.directPilotAcceptedEventTotal,granularPilotAcceptedWindowTotal:e.granularPilotAcceptedWindowTotal,bufferTransferCopiedByteLengthTotal:e.bufferTransferCopiedByteLengthTotal,lastThroughputReportAtWorkletTimeSec:e.lastThroughputReportAtWorkletTimeSec,stableLaneSyntheticSilentProbeAttemptCount:e.stableLaneSyntheticSilentProbeAttemptCount,stableLaneSyntheticSilentProbePostedCount:e.stableLaneSyntheticSilentProbePostedCount,stableLaneSyntheticSilentProbeAckCount:e.stableLaneSyntheticSilentProbeAckCount,stableLaneSyntheticSilentProbeFrameDelta:e.stableLaneSyntheticSilentProbeFrameDelta,stableLaneSyntheticSilentProbeLastResult:e.stableLaneSyntheticSilentProbeLastResult,stableLaneSyntheticSilentProbeLastAtMs:e.stableLaneSyntheticSilentProbeLastAtMs}}function ua(e){const t=tye(e);if(typeof window<"u"){const n=window;n.__XENSONAR_ROOT_FOLLOW_WORKLET_SHADOW__={...t}}return t}function oye(){return typeof window>"u"?null:window[rye]??null}function dW(e){return{status:e?.status??"unstarted",pilotHealth:e?.pilotHealth??"unknown",directAccepted:e?.lastDirectPilotAcceptedEventCount??0,granularAccepted:e?.lastGranularPilotAcceptedWindowCount??0,granularBufferAvailable:e?.lastGranularPilotBufferAvailable===!0,copiedByteLength:e?.lastBufferTransferCopiedByteLength??0,workletNodeCreated:e?.workletNodeCreated===!0,workletNodeConnected:e?.workletNodeConnected===!0,processorReady:e?.processorReady===!0,processorAlive:e?.processorAlive===!0,processLoopActive:e?.processLoopActive===!0,bridgeSessionId:e?.bridgeSessionId??0,processorGeneration:e?.processorGeneration??0,stableLaneBufferAcked:e?.stableLaneBufferAcked===!0,stableLaneBufferRejectedReason:e?.stableLaneBufferRejectedReason??null,stableLanePlanAcked:e?.stableLanePlanAcked===!0,stableLanePlanRejectedReason:e?.stableLanePlanRejectedReason??null,processorErrorCount:e?.processorErrorCount??0,processQuantumCount:e?.processQuantumCount??0,activeRenderQuantumCount:e?.activeRenderQuantumCount??0,renderedFrameCount:e?.renderedFrameCount??0,directRenderedFrameCount:e?.directRenderedFrameCount??0,granularRenderedFrameCount:e?.granularRenderedFrameCount??0,stableLaneRenderedFrameCount:e?.stableLaneRenderedFrameCount??0,stableLaneRenderedFrameDelta:e?.stableLaneRenderedFrameDelta??0,stableLaneActiveRenderQuantumCount:e?.stableLaneActiveRenderQuantumCount??0,processHotPathCompactionCount:e?.processHotPathCompactionCount??0,processHotPathDroppedDirectCount:e?.processHotPathDroppedDirectCount??0,processHotPathDroppedGranularCount:e?.processHotPathDroppedGranularCount??0,processHotPathRetainedDirectCount:e?.processHotPathRetainedDirectCount??0,processHotPathRetainedGranularCount:e?.processHotPathRetainedGranularCount??0,lastStableLaneFrameAdvanceAtMs:e?.lastStableLaneFrameAdvanceAtMs??null,stableLaneHoldQuantumCount:e?.stableLaneHoldQuantumCount??0,stableLaneCrossfadeFrameCount:e?.stableLaneCrossfadeFrameCount??0,stableLaneGainRampFrameCount:e?.stableLaneGainRampFrameCount??0,stableLanePlanCount:e?.stableLanePlanCount??0,stableLaneRetuneCount:e?.stableLaneRetuneCount??0,stableLaneBufferAckCount:e?.stableLaneBufferAckCount??0,stableLaneBufferRejectCount:e?.stableLaneBufferRejectCount??0,stableLanePlanAckCount:e?.stableLanePlanAckCount??0,stableLanePlanRejectCount:e?.stableLanePlanRejectCount??0,stableLaneLastAcceptedPlanSequence:e?.stableLaneLastAcceptedPlanSequence??0,stableLanePlanTransportAcceptedCount:e?.stableLanePlanTransportAcceptedCount??0,stableLanePlanTransportDroppedStaleCount:e?.stableLanePlanTransportDroppedStaleCount??0,stableLanePlanTransportInFlightSequence:e?.stableLanePlanTransportInFlightSequence??null,stableLanePlanTransportPendingSequence:e?.stableLanePlanTransportPendingSequence??null,stableLanePlanTransportPostedCount:e?.stableLanePlanTransportPostedCount??0,stableLanePlanTransportPendingCount:e?.stableLanePlanTransportPendingCount??0,stableLanePlanTransportDroppedSupersededCount:e?.stableLanePlanTransportDroppedSupersededCount??0,stableLanePlanTransportForcedPostCount:e?.stableLanePlanTransportForcedPostCount??0,stableLanePlanTransportAckCount:e?.stableLanePlanTransportAckCount??0,stableLanePlanTransportLastPostedAtMs:e?.stableLanePlanTransportLastPostedAtMs??null,stableLanePlanTransportBackendKind:e?.stableLanePlanTransportBackendKind??"message-port",stableLanePlanTransportSabRingbufferReserved:e?.stableLanePlanTransportSabRingbufferReserved===!0,stableLanePlanTransportBackendFallbackReason:e?.stableLanePlanTransportBackendFallbackReason??null,stableLaneSabTransportReadiness:e?.stableLaneSabTransportReadiness??"unknown",stableLaneSabTransportReady:e?.stableLaneSabTransportReady===!0,stableLaneSabTransportReadinessReason:e?.stableLaneSabTransportReadinessReason??"not-in-browser-runtime",stableLaneSabTransportSharedArrayBufferAvailable:e?.stableLaneSabTransportSharedArrayBufferAvailable===!0,stableLaneSabTransportCrossOriginIsolated:e?.stableLaneSabTransportCrossOriginIsolated===!0,stableLaneSabTransportSecureContext:e?.stableLaneSabTransportSecureContext===!0,stableLaneSabTransportSingleFileHtmlLikelyBlocked:e?.stableLaneSabTransportSingleFileHtmlLikelyBlocked===!0,stableLaneSabTransportRequiredCoop:e?.stableLaneSabTransportRequiredCoop??"Cross-Origin-Opener-Policy: same-origin",stableLaneSabTransportRequiredCoep:e?.stableLaneSabTransportRequiredCoep??"Cross-Origin-Embedder-Policy: require-corp",stableLaneBufferGeneration:e?.stableLaneBufferGeneration??null,lastMessageAtMs:e?.lastMessageAtMs??null,lastStableLaneAckAtMs:e?.lastStableLaneAckAtMs??null,stableLaneSyntheticSilentProbeAttemptCount:e?.stableLaneSyntheticSilentProbeAttemptCount??0,stableLaneSyntheticSilentProbePostedCount:e?.stableLaneSyntheticSilentProbePostedCount??0,stableLaneSyntheticSilentProbeAckCount:e?.stableLaneSyntheticSilentProbeAckCount??0,stableLaneSyntheticSilentProbeFrameDelta:e?.stableLaneSyntheticSilentProbeFrameDelta??0,stableLaneSyntheticSilentProbeLastResult:e?.stableLaneSyntheticSilentProbeLastResult??null,stableLaneSyntheticSilentProbeLastAtMs:e?.stableLaneSyntheticSilentProbeLastAtMs??null,directPilotAcceptedEventTotal:e?.directPilotAcceptedEventTotal??0,granularPilotAcceptedWindowTotal:e?.granularPilotAcceptedWindowTotal??0,bufferTransferCopiedByteLengthTotal:e?.bufferTransferCopiedByteLengthTotal??0,preservesMainThreadReferencePath:e?.preservesMainThreadReferencePath===!0}}function iye(e){const t=e.data||{},n=e.snapshot,r=t.type==="root-follow-worklet-direct-pilot-ack",a=t.type==="root-follow-worklet-granular-shadow-ack",o=t.type==="root-follow-worklet-buffer-shadow-ack"||t.type==="root-follow-worklet-stable-lane-buffer-ack",i=t.type==="root-follow-worklet-stable-lane-buffer-ack",s=t.type==="root-follow-worklet-granular-pilot-ack",l=t.type==="root-follow-worklet-stable-lane-ack",c=t.type==="root-follow-worklet-shadow-ready",d=t.type==="root-follow-worklet-pong",p=t.type==="root-follow-worklet-throughput-meter",f=r?Math.max(0,Number(t.acceptedEventCount)||0):n.lastDirectPilotAcceptedEventCount,b=s?Math.max(0,Number(t.acceptedWindowCount)||0):n.lastGranularPilotAcceptedWindowCount,g=s?t.bufferAvailable===!0:n.lastGranularPilotBufferAvailable,y=l?t.bufferAvailable===!0:i?t.ok===!0:n.lastStableLaneBufferAvailable,x=o?Math.max(0,Number(t.copiedByteLength)||0):n.lastBufferTransferCopiedByteLength,A=p||d,M=A?Math.max(n.processQuantumCount,Number(t.processQuantumCount)||0):n.processQuantumCount,v=A?Math.max(n.renderedFrameCount,Number(t.renderedFrameCount)||0):n.renderedFrameCount,w=p?Math.max(n.renderedSampleCount,Number(t.renderedSampleCount)||0):n.renderedSampleCount,R=p?Math.max(n.activeRenderQuantumCount,Number(t.activeRenderQuantumCount)||0):n.activeRenderQuantumCount,k=p?Math.max(n.directRenderedFrameCount,Number(t.directRenderedFrameCount)||0):n.directRenderedFrameCount,I=p?Math.max(n.granularRenderedFrameCount,Number(t.granularRenderedFrameCount)||0):n.granularRenderedFrameCount,E=p?Math.max(n.stableLaneRenderedFrameCount,Number(t.stableLaneRenderedFrameCount)||0):n.stableLaneRenderedFrameCount,F=p?Math.max(0,E-n.stableLaneRenderedFrameCount):0,L=F>0?e.nowMs():n.lastStableLaneFrameAdvanceAtMs,B=p?Math.max(n.stableLaneActiveRenderQuantumCount,Number(t.stableLaneActiveRenderQuantumCount)||0):n.stableLaneActiveRenderQuantumCount,O=p?Math.max(n.processHotPathCompactionCount,Number(t.processHotPathCompactionCount)||0):n.processHotPathCompactionCount,T=p?Math.max(n.processHotPathDroppedDirectCount,Number(t.processHotPathDroppedDirectCount)||0):n.processHotPathDroppedDirectCount,_=p?Math.max(n.processHotPathDroppedGranularCount,Number(t.processHotPathDroppedGranularCount)||0):n.processHotPathDroppedGranularCount,G=p?Math.max(0,Number(t.processHotPathRetainedDirectCount)||0):n.processHotPathRetainedDirectCount,j=p?Math.max(0,Number(t.processHotPathRetainedGranularCount)||0):n.processHotPathRetainedGranularCount,N=p?Math.max(n.stableLaneHoldQuantumCount,Number(t.stableLaneHoldQuantumCount)||0):n.stableLaneHoldQuantumCount,W=p?Math.max(n.stableLaneCrossfadeFrameCount,Number(t.stableLaneCrossfadeFrameCount)||0):n.stableLaneCrossfadeFrameCount,V=p?Math.max(n.stableLaneGainRampFrameCount,Number(t.stableLaneGainRampFrameCount)||0):n.stableLaneGainRampFrameCount,U=p?Math.max(n.stableLanePlanCount,Number(t.stableLanePlanCount)||0):n.stableLanePlanCount,H=p?Math.max(n.stableLaneRetuneCount,Number(t.stableLaneRetuneCount)||0):n.stableLaneRetuneCount,q=l||p?Math.max(n.stableLaneLastAcceptedPlanSequence,Number(t.stableLaneLastAcceptedPlanSequence)||0):n.stableLaneLastAcceptedPlanSequence,K=l||p?Math.max(n.stableLanePlanTransportAcceptedCount,Number(t.stableLanePlanTransportAcceptedCount)||0):n.stableLanePlanTransportAcceptedCount,Y=l||p?Math.max(n.stableLanePlanTransportDroppedStaleCount,Number(t.stableLanePlanTransportDroppedStaleCount)||0):n.stableLanePlanTransportDroppedStaleCount,J=p?Number(t.workletTimeSec)||null:n.lastThroughputReportAtWorkletTimeSec,Z=p?Math.max(n.stableLaneSyntheticSilentProbeAttemptCount,Number(t.stableLaneSyntheticSilentProbeAttemptCount)||0):n.stableLaneSyntheticSilentProbeAttemptCount,te=p?Math.max(n.stableLaneSyntheticSilentProbeAckCount,Number(t.stableLaneSyntheticSilentProbeAckCount)||0):n.stableLaneSyntheticSilentProbeAckCount+(l&&t.probeKind==="stable-lane-synthetic-silent-plan"&&t.ok===!0?1:0),X=l&&t.probeKind==="stable-lane-synthetic-silent-plan"?t.ok===!0?"ack-ok":typeof t.rejectedReason=="string"?t.rejectedReason:"ack-rejected":p&&typeof t.stableLaneSyntheticSilentProbeLastResult=="string"?t.stableLaneSyntheticSilentProbeLastResult:n.stableLaneSyntheticSilentProbeLastResult,Q=l&&t.probeKind==="stable-lane-synthetic-silent-plan"?e.nowMs():n.stableLaneSyntheticSilentProbeLastAtMs,ne=n.directPilotActive||r,ee=n.granularPilotActive||s,ie=i&&t.ok===!0,de=l&&t.ok===!0&&t.active===!0&&t.bufferAvailable===!0,oe=p&&t.stableLaneActive===!0,ue=p&&t.stableLaneActive===!1,fe=i?ie:n.stableLaneBufferAcked,he=i&&!ie?typeof t.rejectedReason=="string"?t.rejectedReason:"buffer-rejected":ie?null:n.stableLaneBufferRejectedReason,re=l?de:ue?!1:n.stableLanePlanAcked,le=l&&!de?typeof t.rejectedReason=="string"?t.rejectedReason:t.bufferAvailable===!0?"inactive-plan":"missing-buffer":de?null:n.stableLanePlanRejectedReason,Ae=l?de:p?oe&&re:n.stableLaneActive&&re;return{snapshot:{...n,status:"loaded",lastMessageAtMs:e.nowMs(),readyMessageCount:n.readyMessageCount+(c?1:0),bridgeSessionId:e.bridgeSessionId,processorGeneration:e.processorGeneration,workletNodeCreated:!0,workletNodeConnected:!0,processorReady:n.processorReady||c||p||d||t.processorReady===!0,processLoopActive:M>0,stableLaneBufferAcked:fe,stableLaneBufferRejectedReason:he,stableLanePlanAcked:re,stableLanePlanRejectedReason:le,stableLaneBufferGeneration:i||l?Math.max(1,Number(t.bufferGeneration)||1):n.stableLaneBufferGeneration,messageCount:n.messageCount+(r||a||o||s||l||i||p||c||d?0:1),directPilotMessageCount:n.directPilotMessageCount+(r?1:0),granularPlanMessageCount:n.granularPlanMessageCount+(a?1:0),bufferTransferMessageCount:n.bufferTransferMessageCount+(o?1:0),granularPilotMessageCount:n.granularPilotMessageCount+(s?1:0),stableLaneMessageCount:n.stableLaneMessageCount+(l?1:0),granularShadowActive:n.granularShadowActive||a,bufferShadowActive:n.bufferShadowActive||o,granularPilotActive:ee,stableLaneActive:Ae,directPilotActive:ne,lastDirectPilotAcceptedEventCount:f,lastGranularPilotAcceptedWindowCount:b,lastGranularPilotBufferAvailable:g,lastStableLaneBufferAvailable:y,lastBufferTransferCopiedByteLength:x,processorAlive:n.processorAlive||p||M>0,processQuantumCount:M,renderedFrameCount:v,renderedSampleCount:w,activeRenderQuantumCount:R,directRenderedFrameCount:k,granularRenderedFrameCount:I,stableLaneRenderedFrameCount:E,stableLaneRenderedFrameDelta:F,stableLaneActiveRenderQuantumCount:B,processHotPathCompactionCount:O,processHotPathDroppedDirectCount:T,processHotPathDroppedGranularCount:_,processHotPathRetainedDirectCount:G,processHotPathRetainedGranularCount:j,lastStableLaneFrameAdvanceAtMs:L,stableLaneHoldQuantumCount:N,stableLaneCrossfadeFrameCount:W,stableLaneGainRampFrameCount:V,stableLanePlanCount:U,stableLaneRetuneCount:H,stableLaneLastAcceptedPlanSequence:q,stableLanePlanTransportAcceptedCount:K,stableLanePlanTransportDroppedStaleCount:Y,stableLaneBufferAckCount:p?Math.max(n.stableLaneBufferAckCount,Number(t.stableLaneBufferAckCount)||0):n.stableLaneBufferAckCount+(i&&t.ok===!0?1:0),stableLaneBufferRejectCount:p?Math.max(n.stableLaneBufferRejectCount,Number(t.stableLaneBufferRejectCount)||0):n.stableLaneBufferRejectCount+(i&&t.ok!==!0?1:0),stableLanePlanAckCount:p?Math.max(n.stableLanePlanAckCount,Number(t.stableLanePlanAckCount)||0):n.stableLanePlanAckCount+(l&&(t.ok===!0||t.active===!0&&t.bufferAvailable===!0)?1:0),stableLanePlanRejectCount:p?Math.max(n.stableLanePlanRejectCount,Number(t.stableLanePlanRejectCount)||0):n.stableLanePlanRejectCount+(l&&!(t.ok===!0||t.active===!0&&t.bufferAvailable===!0)?1:0),directPilotAcceptedEventTotal:n.directPilotAcceptedEventTotal+(r?f:0),granularPilotAcceptedWindowTotal:n.granularPilotAcceptedWindowTotal+(s?b:0),bufferTransferCopiedByteLengthTotal:n.bufferTransferCopiedByteLengthTotal+(o?x:0),lastThroughputReportAtWorkletTimeSec:J,stableLaneSyntheticSilentProbeAttemptCount:Z,stableLaneSyntheticSilentProbeAckCount:te,stableLaneSyntheticSilentProbeLastResult:X,stableLaneSyntheticSilentProbeLastAtMs:Q,lastDirectPilotAckAtMs:r?e.nowMs():n.lastDirectPilotAckAtMs,lastGranularPilotAckAtMs:s?e.nowMs():n.lastGranularPilotAckAtMs,lastStableLaneAckAtMs:l?e.nowMs():n.lastStableLaneAckAtMs,lastBufferTransferAckAtMs:o?e.nowMs():n.lastBufferTransferAckAtMs,pilotHealth:aye({directPilotActive:ne,granularPilotActive:ee,stableLaneActive:Ae,lastDirectPilotAcceptedEventCount:f,lastGranularPilotAcceptedWindowCount:b,lastGranularPilotBufferAvailable:g,lastStableLaneBufferAvailable:y}),detail:c?"root-follow-worklet-processor-ready":d?"root-follow-worklet-pong":p?"root-follow-worklet-throughput-meter":r?"root-follow-worklet-direct-pilot-acknowledged-events":a?"root-follow-worklet-granular-shadow-acknowledged-plan":o?"root-follow-worklet-buffer-shadow-acknowledged-transfer":s?"root-follow-worklet-granular-pilot-acknowledged-plan":l?"root-follow-worklet-stable-lane-acknowledged-plan":"root-follow-worklet-shadow-acknowledged-plan"},stableLaneAckPlanSequence:l?Math.max(0,Number(t.planSequence)||0):null}}const rm=iL,z3=new WeakMap,OI=new WeakMap,ac=new WeakMap;let sye=1;function iy(){return typeof performance<"u"&&typeof performance.now=="function"?performance.now():Date.now()}function mW(e,t){e.snapshot=ua(lW(e.snapshot,t))}function j3(e,t){return{node:null,outputGain:null,keepAliveSource:null,keepAliveGain:null,bridgeSessionId:0,processorGeneration:0,snapshot:ua(KA({status:"unsupported",requestedAtMs:t,completedAtMs:iy(),detail:e,pilotHealth:"unsupported"}))}}async function cye(e){const t=iy();if(ua(KA({status:"loading",requestedAtMs:t,detail:"root-follow-worklet-shadow-bridge-requested"})),ZZ())return j3("file-origin-blocks-blob-worklet-shadow",t);const n=aW(e);if(n!=="supported")return j3(n,t);const r=sye++,a=r;try{await oW(e,Ybe),ac.set(e,new Set);const o=new AudioWorkletNode(e,rm,{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]}),i=e.createGain();i.gain.value=1;const s=e.createConstantSource(),l=e.createGain();s.offset.value=1,l.gain.value=1,s.connect(l),l.connect(o),o.connect(i),i.connect(e.destination);try{s.start()}catch{}const c={node:o,outputGain:i,keepAliveSource:s,keepAliveGain:l,bridgeSessionId:r,processorGeneration:a,snapshot:ua(KA({status:"loaded",requestedAtMs:t,completedAtMs:iy(),detail:"blob-url-worklet-shadow-loaded-active-keepalive-node-instantiated",bridgeSessionId:r,processorGeneration:a,workletNodeCreated:!0,workletNodeConnected:!0}))};return o.onprocessorerror=()=>{c.snapshot=ua({...c.snapshot,status:"failed",processorAlive:!1,processorErrorCount:c.snapshot.processorErrorCount+1,pilotHealth:"failed",detail:"root-follow-worklet-processor-error-silenced-node",errorMessage:"AudioWorklet processorerror fired; processor output is treated as silent."})},o.port.onmessage=d=>{const p=iye({snapshot:c.snapshot,data:d.data||{},bridgeSessionId:c.bridgeSessionId,processorGeneration:c.processorGeneration,nowMs:iy});if(c.snapshot=ua(p.snapshot),p.stableLaneAckPlanSequence!==null){const f=iW({postMessage:b=>c.node?.port.postMessage(b)});Xbe({ctx:e,planSequence:p.stableLaneAckPlanSequence,canPostPending:c.node!==null&&c.snapshot.status==="loaded",backend:f,publishState:b=>mW(c,b)})}},OI.set(e,c),c}catch(o){const i={node:null,outputGain:null,keepAliveSource:null,keepAliveGain:null,bridgeSessionId:r,processorGeneration:a,snapshot:ua(KA({status:"failed",requestedAtMs:t,completedAtMs:iy(),detail:"root-follow-worklet-shadow-bridge-failed",pilotHealth:"failed",errorMessage:o instanceof Error?o.message:String(o)}))};return OI.set(e,i),i}}function dh(e){const t=z3.get(e);if(t)return t;const n=cye(e);return z3.set(e,n),n}async function uye(e){const t=await dh(e.ctx);if(t.node&&t.snapshot.status==="loaded")try{t.node.port.postMessage({type:"root-follow-worklet-ping",audioNowSec:e.audioNowSec??("currentTime"in e.ctx?Number(e.ctx.currentTime):0)})}catch(n){t.snapshot=ua({...t.snapshot,status:"failed",errorMessage:n instanceof Error?n.message:String(n),detail:"root-follow-worklet-ping-post-message-failed"})}return Fn(e.trafficRef?.current??null,{subsystem:"root-follow",kind:"worklet-shadow-bridge",audioNowSec:e.audioNowSec??("currentTime"in e.ctx?Number(e.ctx.currentTime):0),detail:{status:t.snapshot.status,processorName:rm,livenessOnly:!0,reason:e.reason??null,throughput:Ag(t.snapshot)}}),t.snapshot}function dye(e){return{id:e.id,voiceKey:e.voiceKey,noteStart:e.noteStart,noteEnd:e.noteEnd,targetFrequency:e.targetFrequency,sourceKind:e.sourceKind,noteClass:e.noteClass,presetId:e.presetId}}function pW(e){return{type:"root-follow-worklet-shadow-plan",audioNowSec:e.audioNowSec,eventCount:e.shadowEvents.length,shadowEvents:e.shadowEvents.slice(0,64).map(dye),voicePool:{mode:e.voicePool.mode,audiblePath:e.voicePool.audiblePath,plannedVoiceCount:e.voicePool.plannedVoiceCount,scheduledVoiceCount:e.voicePool.scheduledVoiceCount,pooledVoiceCount:e.voicePool.pooledVoiceCount,existingVoiceCount:e.voicePool.existingVoiceCount,activeVoiceCount:e.voicePool.activeVoiceCount,releasingVoiceCount:e.voicePool.releasingVoiceCount,stealableVoiceCount:e.voicePool.stealableVoiceCount,staleEventCount:e.voicePool.staleEventCount,lateEventCount:e.voicePool.lateEventCount,wouldReuseVoiceCount:e.voicePool.wouldReuseVoiceCount,wouldCreateVoiceCount:e.voicePool.wouldCreateVoiceCount,wouldStealVoiceCount:e.voicePool.wouldStealVoiceCount,maxPoolPressure:e.voicePool.maxPoolPressure},crisis:{densityScale:e.crisisEnvelope.densityScale,lateGrainStrategy:e.crisisEnvelope.lateGrainStrategy,staleWindowMs:e.crisisEnvelope.staleWindowMs,preventCatchUpStorm:e.crisisEnvelope.preventCatchUpStorm,sourcePresetId:e.crisisEnvelope.sourcePresetId}}}function mye(e){dh(e.ctx).then(t=>{const n=pW(e);if(t.node)try{t.node.port.postMessage(n)}catch(r){t.snapshot=ua({...t.snapshot,status:"failed",errorMessage:r instanceof Error?r.message:String(r),detail:"root-follow-worklet-shadow-post-message-failed"})}Fn(e.trafficRef?.current??null,{subsystem:"root-follow",kind:"worklet-shadow-bridge",audioNowSec:e.audioNowSec,detail:{status:t.snapshot.status,processorName:rm,silentShadowOnly:!0,preservesMainThreadReferencePath:!0,eventCount:n.eventCount,scheduledVoiceCount:n.voicePool.scheduledVoiceCount,maxPoolPressure:n.voicePool.maxPoolPressure,detail:t.snapshot.detail,throughput:Ag(t.snapshot)}})})}async function pye(e){const t=await dh(e.ctx),n=e.pilotEvents.filter(o=>o.endSec>e.audioNowSec+.004).slice(0,64);if(!t.node||!t.outputGain||t.snapshot.status!=="loaded")return Fn(e.trafficRef?.current??null,{subsystem:"root-follow",kind:"worklet-shadow-bridge",audioNowSec:e.audioNowSec,detail:{status:t.snapshot.status,directPilotActive:!1,fallbackReason:t.snapshot.detail??"worklet-direct-pilot-unavailable",eventCount:n.length}}),{status:t.snapshot.status,handledEventIds:new Set,postedEventCount:0,fallbackReason:t.snapshot.detail??"worklet-direct-pilot-unavailable"};const r=t.outputGain.gain;try{typeof r.setTargetAtTime=="function"?r.setTargetAtTime(.82,e.audioNowSec,.012):r.value=.82}catch{r.value=.82}const a={type:"root-follow-worklet-direct-pilot-events",active:!0,audioNowSec:e.audioNowSec,events:n,shadow:pW(e)};try{t.node.port.postMessage(a),t.snapshot=ua({...t.snapshot,silentShadowOnly:!1,directPilotActive:!0,detail:"root-follow-worklet-direct-pilot-posted-events"})}catch(o){return t.snapshot=ua({...t.snapshot,status:"failed",directPilotActive:!1,errorMessage:o instanceof Error?o.message:String(o),detail:"root-follow-worklet-direct-pilot-post-message-failed"}),{status:"failed",handledEventIds:new Set,postedEventCount:0,fallbackReason:t.snapshot.detail}}return Fn(e.trafficRef?.current??null,{subsystem:"root-follow",kind:"worklet-shadow-bridge",audioNowSec:e.audioNowSec,detail:{status:t.snapshot.status,processorName:rm,silentShadowOnly:!1,directPilotActive:!0,scope:"root-follow-direct-synth-only",eventCount:n.length,scheduledVoiceCount:e.voicePool.scheduledVoiceCount,maxPoolPressure:e.voicePool.maxPoolPressure,fallbackReason:null}}),{status:t.snapshot.status,handledEventIds:new Set(n.map(o=>o.id)),postedEventCount:n.length,fallbackReason:null}}function G3(e){dh(e.ctx).then(t=>{t.outputGain&&(t.outputGain.gain.value=0);const n=rW(e.plan);if(t.node&&t.snapshot.status==="loaded")try{t.node.port.postMessage({type:"root-follow-worklet-granular-shadow-plan",audioNowSec:e.audioNowSec,plan:e.plan}),t.snapshot=ua({...t.snapshot,silentShadowOnly:!0,granularShadowActive:!0,detail:"root-follow-worklet-granular-shadow-posted-plan"})}catch(r){t.snapshot=ua({...t.snapshot,status:"failed",errorMessage:r instanceof Error?r.message:String(r),detail:"root-follow-worklet-granular-shadow-post-message-failed"})}Fn(e.trafficRef?.current??null,{subsystem:"root-follow",kind:"worklet-shadow-bridge",audioNowSec:e.audioNowSec,detail:{status:t.snapshot.status,processorName:rm,granularShadowActive:!0,silentShadowOnly:!0,preservesLegacyMaterialPath:!0,hasSampleBufferTransfer:!1,activeAudioPath:!1,planSummary:n,detail:t.snapshot.detail,throughput:Ag(t.snapshot)}})})}function hye(e){dh(e.ctx).then(t=>{t.outputGain&&(t.outputGain.gain.value=0);const n=rL(e.transfer),r=ac.get(e.ctx)??new Set;ac.has(e.ctx)||ac.set(e.ctx,r);const a=r.has(e.transfer.transferSignature);let o=!1;if(t.node&&t.snapshot.status==="loaded"&&!a)try{t.node.port.postMessage({type:"root-follow-worklet-buffer-shadow-transfer",audioNowSec:e.audioNowSec,transfer:e.transfer},aL(e.transfer)),r.add(e.transfer.transferSignature),o=!0,t.snapshot=ua({...t.snapshot,silentShadowOnly:!0,bufferShadowActive:!0,detail:"root-follow-worklet-buffer-shadow-posted-transfer"})}catch(i){t.snapshot=ua({...t.snapshot,status:"failed",errorMessage:i instanceof Error?i.message:String(i),detail:"root-follow-worklet-buffer-shadow-post-message-failed"})}Fn(e.trafficRef?.current??null,{subsystem:"root-follow",kind:"worklet-shadow-bridge",audioNowSec:e.audioNowSec,detail:{status:t.snapshot.status,processorName:rm,bufferShadowActive:!0,silentShadowOnly:!0,preservesLegacyMaterialPath:!0,activeAudioPath:!1,hasSampleBufferTransfer:!0,transfersFullSourceBuffer:!1,posted:o,alreadyPosted:a,transferSummary:n,detail:t.snapshot.detail,throughput:Ag(t.snapshot)}})})}function H3(e){dh(e.ctx).then(t=>{const n=rL(e.transfer),r=rW(e.plan),a=ac.get(e.ctx)??new Set;ac.has(e.ctx)||ac.set(e.ctx,a);const o=a.has(e.transfer.transferSignature);let i=!1,s=!1;if(t.node&&t.snapshot.status==="loaded")try{o||(t.node.port.postMessage({type:"root-follow-worklet-buffer-shadow-transfer",audioNowSec:e.audioNowSec,transfer:e.transfer},aL(e.transfer)),a.add(e.transfer.transferSignature),i=!0);const l=t.outputGain?.gain;l&&(typeof l.setTargetAtTime=="function"?l.setTargetAtTime(.42,e.audioNowSec,.018):l.value=.42),t.node.port.postMessage({type:"root-follow-worklet-granular-pilot-plan",active:!0,audioNowSec:e.audioNowSec,plan:{...e.plan,activeAudioPath:!!e.plan.activeAudioPath,hasSampleBufferTransfer:!0}}),s=!0,t.snapshot=ua({...t.snapshot,silentShadowOnly:!1,granularShadowActive:!0,bufferShadowActive:!0,granularPilotActive:!0,detail:"root-follow-worklet-granular-pilot-posted-buffer-and-plan"})}catch(l){t.snapshot=ua({...t.snapshot,status:"failed",granularPilotActive:!1,errorMessage:l instanceof Error?l.message:String(l),detail:"root-follow-worklet-granular-pilot-post-message-failed"})}Fn(e.trafficRef?.current??null,{subsystem:"root-follow",kind:"worklet-shadow-bridge",audioNowSec:e.audioNowSec,detail:{status:t.snapshot.status,processorName:rm,granularPilotActive:s,silentShadowOnly:!1,preservesLegacyMaterialPath:!0,activeAudioPath:s,hasSampleBufferTransfer:!0,transfersFullSourceBuffer:!1,bufferPosted:i,alreadyPosted:o,additivePilotOverLegacy:!0,transferSummary:n,planSummary:r,detail:t.snapshot.detail,throughput:Ag(t.snapshot)}})})}function fye(e){const t=String(e||"stable-lane-buffer");let n=2166136261;for(let r=0;r<t.length;r+=1)n^=t.charCodeAt(r),n=Math.imul(n,16777619);return n>>>0||1}function V3(e,t){const n=Number(e);return Number.isFinite(n)?Math.max(0,Math.min(.72,n)):t}function gye(e){return[e.bridgeSessionId,e.processorGeneration,e.bufferGeneration,e.transferSignature].join(":")}function W3(e){dh(e.ctx).then(t=>{let n=e.transfer??null;const r=String(e.transferIdentity||n?.transferSignature||`${e.lanePlan.entryId}:stable-lane-buffer`),a=ac.get(e.ctx)??new Set;ac.has(e.ctx)||ac.set(e.ctx,a);const o=fye(r),i=gye({bridgeSessionId:t.bridgeSessionId,processorGeneration:t.processorGeneration,transferSignature:r,bufferGeneration:o}),s=a.has(i);let l=!1,c=!1,d=!1,p=!1;if(t.node&&t.snapshot.status==="loaded")try{if(!s){if(n=n??e.createTransfer?.()??null,!n)throw new Error("stable-lane-buffer-transfer-missing");t.node.port.postMessage({type:"root-follow-worklet-stable-lane-buffer-transfer",audioNowSec:e.audioNowSec,bridgeSessionId:t.bridgeSessionId,processorGeneration:t.processorGeneration,bufferGeneration:o,transfer:{...n,bufferGeneration:o}},aL(n)),a.add(i),l=!0}const f=V3(e.lanePlan.stableLaneBlend,.42),b=t.outputGain?.gain;b&&(typeof b.cancelScheduledValues=="function"&&b.cancelScheduledValues(e.audioNowSec),typeof b.setTargetAtTime=="function"?b.setTargetAtTime(f,e.audioNowSec,.055):b.value=f);const g=iW({postMessage:x=>t.node?.port.postMessage(x)}),y=$be({ctx:e.ctx,backend:g,publishState:x=>mW(t,x),message:{type:"root-follow-worklet-stable-lane-plan",active:!0,audioNowSec:e.audioNowSec,bridgeSessionId:t.bridgeSessionId,processorGeneration:t.processorGeneration,bufferGeneration:o,plan:{...e.lanePlan,bufferGeneration:o}}});c=y.posted,d=y.pending,p=y.forced,t.snapshot=ua({...t.snapshot,silentShadowOnly:!1,bufferShadowActive:!0,stableLaneActive:t.snapshot.stableLaneActive&&t.snapshot.lastStableLaneBufferAvailable,stableLanePlanSentCount:t.snapshot.stableLanePlanSentCount+(c?1:0),stableLaneBufferGeneration:o,stableLanePlanAcked:c?!1:t.snapshot.stableLanePlanAcked,stableLanePlanRejectedReason:null,detail:d?"root-follow-worklet-stable-lane-plan-pending-bounded-transport":l?"root-follow-worklet-stable-lane-posted-buffer-and-plan-awaiting-ack":"root-follow-worklet-stable-lane-posted-plan-awaiting-ack-buffer-already-hydrated"}),t.snapshot=ua(lW(t.snapshot,oL(e.ctx)))}catch(f){t.snapshot=ua({...t.snapshot,status:"failed",stableLaneActive:!1,errorMessage:f instanceof Error?f.message:String(f),detail:"root-follow-worklet-stable-lane-post-message-failed"})}Fn(e.trafficRef?.current??null,{subsystem:"root-follow",kind:"worklet-shadow-bridge",audioNowSec:e.audioNowSec,detail:{status:t.snapshot.status,processorName:rm,bridgeSessionId:t.bridgeSessionId,processorGeneration:t.processorGeneration,stableLaneActive:t.snapshot.stableLaneActive,silentShadowOnly:!1,preservesLegacyMaterialPath:!0,activeAudioPath:t.snapshot.stableLaneActive,hasSampleBufferTransfer:!0,transfersFullSourceBuffer:!1,bufferPosted:l,alreadyPosted:s,bufferGeneration:o,sessionSignature:i,planPosted:c,planPending:d,planTransportForcedPost:p,stableLanePlanTransport:{backendKind:t.snapshot.stableLanePlanTransportBackendKind,sabRingbufferReserved:t.snapshot.stableLanePlanTransportSabRingbufferReserved,backendFallbackReason:t.snapshot.stableLanePlanTransportBackendFallbackReason,inFlightSequence:t.snapshot.stableLanePlanTransportInFlightSequence,pendingSequence:t.snapshot.stableLanePlanTransportPendingSequence,postedCount:t.snapshot.stableLanePlanTransportPostedCount,pendingCount:t.snapshot.stableLanePlanTransportPendingCount,droppedSupersededCount:t.snapshot.stableLanePlanTransportDroppedSupersededCount,forcedPostCount:t.snapshot.stableLanePlanTransportForcedPostCount,ackCount:t.snapshot.stableLanePlanTransportAckCount},stableLaneBlendTarget:V3(e.lanePlan.stableLaneBlend,.42),legacyBlendTarget:Math.max(0,Math.min(1,Number(e.lanePlan.legacyBlend)||1)),additivePilotOverLegacy:!0,stableLanePlan:{...e.lanePlan,bufferGeneration:o},transferIdentity:r,transferSummary:n?rL(n):null,detail:t.snapshot.detail,throughput:Ag(t.snapshot)}})})}function bye(e){return e?OI.get(e)?.snapshot??null:oye()}const yye=.025;function H2(e,t){return Math.max(yye,Number.isFinite(e)?e:t)}function q3(e,t){return Number.isFinite(e)?e:t}function Sye(e){const t=H2(e.baseDesiredLoopDur,.25),n=Number.isFinite(e.transportAnchor)?e.transportAnchor:0,r=e.impulseRasterWindow&&!e.impulseRasterWindow.bypass?e.impulseRasterWindow:null;if(!r)return{impulseRasterWindow:null,desiredLoopDur:t,materialTransportAnchor:n,materialRenderHorizonEnd:Number.POSITIVE_INFINITY,impulseRasterSpeedFactor:1,clockInterpretation:"normal-material-cycle"};if(r.clockMode==="mute-pattern"){const o=H2(r.rootFollowWindowDurationSec,t);return{impulseRasterWindow:r,desiredLoopDur:o,materialTransportAnchor:Number.isFinite(r.rootFollowWindowStartSec)?r.rootFollowWindowStartSec:n,materialRenderHorizonEnd:q3(r.slotEndSec,n+o),impulseRasterSpeedFactor:t/Math.max(.001,o),clockInterpretation:"whole-root-follow-window-muted-by-segments"}}const a=H2(Math.min(t,r.slotDurationSec),t);return{impulseRasterWindow:r,desiredLoopDur:a,materialTransportAnchor:Number.isFinite(r.slotStartSec)?r.slotStartSec:n,materialRenderHorizonEnd:q3(r.slotEndSec,n+a),impulseRasterSpeedFactor:t/Math.max(.001,a),clockInterpretation:"fragment-compressed-into-active-segment"}}const Aye=8192,xye=8,Mye=450;function wye(e){return e==="worklet-granular-primary-candidate"||e==="worklet-granular-pilot"?"shadow-plan":e??"legacy"}function hW(e){const t=e??"legacy";return t!=="worklet-granular-shadow"&&t!=="worklet-buffer-shadow"&&t!=="worklet-granular-pilot"&&t!=="worklet-stable-lane-pilot"&&t!=="worklet-stable-lane-primary-audition"&&t!=="worklet-granular-primary-candidate"}function Rye(e){return e==="worklet-stable-lane-pilot"||e==="worklet-stable-lane-primary-audition"||e==="worklet-granular-primary-candidate"}function V2(e){const t=QV({previousHz:e.previousSmoothedRootHz,rawHz:e.rawLiveTargetHz,stepSec:e.stepSec}),n=Number.isFinite(e.sessionAnchorHz??NaN)?Math.max(1,Number(e.sessionAnchorHz)):Math.max(1,t),r=UF({targetHz:t,anchorHz:n}),a=e.ctx.currentTime+Math.max(.012,Math.min(.08,e.stepSec)),o=w3(a-e.transportAnchor,e.desiredLoopDur),i=Me(o/Math.max(.001,e.desiredLoopDur),0,1),s=e.loopStart+e.sourceDuration*i;return{plan:{entryId:e.entryId,planSequence:e.planSequence,loopStartSec:e.loopStart,loopEndSec:e.loopEnd,sourceOffsetSec:Math.max(e.loopStart,Math.min(e.loopEnd-.02,s)),playbackRate:r.elasticRate,targetHz:t,anchorHz:n,gain:e.gainBase*Math.max(.35,Math.min(1,e.densityScale)),densityScale:e.densityScale,stableLaneBlend:e.stableLaneBlend,legacyBlend:e.legacyBlend},sessionAnchorHz:n,materialSmoothedRootHz:t}}function Cye(e){const t=typeof performance<"u"&&typeof performance.now=="function"?performance.now():Date.now(),n=typeof e.lastMessageAtMs=="number"&&t-e.lastMessageAtMs<=900,r=typeof e.lastStableLaneAckAtMs=="number"&&t-e.lastStableLaneAckAtMs<=2200;let a=null;e.processorErrorCount>0?a="processor-error":e.processLoopActive?n?e.stableLaneBufferAcked?e.stableLanePlanAcked?r?e.stableLaneRenderedFrameCount<=0&&(a="rendered-frames-missing"):a="plan-ack-stale":a="plan-ack-missing":a="buffer-ack-missing":a="throughput-stale":a="process-loop-inactive";const o=a===null;if(!o)return{legacyBlend:1,stableLaneBlend:.42,stableLaneProven:o,stableLaneReliefReady:!1,stableLaneWarmupReason:null,fallbackReason:a};if(e.primaryAudition)return{legacyBlend:0,stableLaneBlend:.86,stableLaneProven:o,stableLaneReliefReady:!0,stableLaneWarmupReason:null,fallbackReason:null};const i=typeof e.lastStableLaneFrameAdvanceAtMs=="number"&&t-e.lastStableLaneFrameAdvanceAtMs<=Mye;let s=null;e.stableLaneRenderedFrameCount<Aye?s="stable-lane-rendered-frames-warmup":e.stableLaneActiveRenderQuantumCount<xye?s="stable-lane-active-quanta-warmup":(e.stableLaneRenderedFrameDelta<=0||!i)&&(s="stable-lane-frame-advance-window-stale");const l=s===null;return l?{legacyBlend:0,stableLaneBlend:.72,stableLaneProven:o,stableLaneReliefReady:l,stableLaneWarmupReason:null,fallbackReason:null}:{legacyBlend:.68,stableLaneBlend:.56,stableLaneProven:o,stableLaneReliefReady:!1,stableLaneWarmupReason:s,fallbackReason:null}}function Q3(e){return e.stableLaneEnabled&&e.stableLaneReliefReady&&!e.primaryCandidateCanMuteLegacy}const Pye=dW(null),Iye=Object.freeze({legacyBlend:1,stableLaneBlend:0,stableLaneProven:!1,stableLaneReliefReady:!1,stableLaneWarmupReason:null,fallbackReason:null});function U3(e){Fn(e.refs.trafficRef?.current,{subsystem:"root-follow",kind:"worklet-stable-lane-relieves-legacy-slice",audioNowSec:e.ctx.currentTime,detail:{mode:e.mode,reason:e.reason,targetHz:e.targetHz,anchorHz:e.anchorHz,playbackRate:e.playbackRate,windowStart:e.windowStart,windowDur:e.windowDur,stableLaneBlend:e.stableLaneBlend,legacyBlend:e.legacyBlend,stableLaneReliefReady:e.stableLaneReliefReady,legacyReliefGate:"stable-lane-sustained-relief",stableLaneRenderedFrameCount:e.stableLaneRenderedFrameCount,stableLaneRenderedFrameDelta:e.stableLaneRenderedFrameDelta,stableLaneActiveRenderQuantumCount:e.stableLaneActiveRenderQuantumCount,activeRenderQuantumCount:e.activeRenderQuantumCount,lastStableLaneFrameAdvanceAtMs:e.lastStableLaneFrameAdvanceAtMs,expectedEffect:"less-main-thread-root-material-slice-spawning-after-sustained-worklet-proof"}})}function W2(e){const t=zbe({nextSliceStart:e.nextSliceStart,currentTime:e.ctx.currentTime,transportAnchor:e.transportAnchor,stepSec:e.sliceStepSec,minimumLeadInSec:e.minimumLeadInSec,envelope:e.envelope});return t.action!=="on-time"&&(Fn(e.refs.trafficRef?.current,{subsystem:"root-follow",kind:"late-slice-resync",audioNowSec:e.ctx.currentTime,detail:{mode:e.mode,action:t.action,stale:t.stale,lateByMs:t.lateByMs,previousNextSliceStart:e.nextSliceStart,resyncedNextSliceStart:t.nextSliceStart,staleWindowMs:e.envelope.staleWindowMs,lateGrainStrategy:e.envelope.lateGrainStrategy,densityScale:e.envelope.densityScale}}),fr("root-follow-late-slice-resync")),t.nextSliceStart}function Eye(e){const t=e.refs.cacheRef.current.get(e.entry.id);if(!t)return!1;const n=__f442RFLBaseSettings(e.refs,e.dynamicRefs.granularSettingsRef.current,e.dynamicRefs.granulationModeRef.current),r=!qV()&&(n.qualityMode==="base"||n.qualityMode==="fragment")&&!e.impulseRasterActive&&hW(e.rootFollowPolicy?.voiceEngineMode);return Bne({ctx:e.ctx,refs:e.refs,buffer:t,entryId:e.entry.id,eligible:r,mode:n.qualityMode})}