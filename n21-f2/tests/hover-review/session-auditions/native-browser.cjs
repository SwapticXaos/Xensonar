'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..');process.chdir(root);
const entry=require(path.join(root,'source-manifest.json')).entry;
const ts=require('typescript'),baselineSource=require('../../sessions-reviewed-preservation.cjs').readBaseline('src/rhythm/04_workspace_and_transport.js');
const tree=ts.createSourceFile('baseline.js',baselineSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let baselineBass;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='OPe')baselineBass=node.initializer.getText(tree);ts.forEachChild(node,visit)}visit(tree);assert(baselineBass);
const expose=`const __sessionBaselineBass=${baselineBass};window.__sessionProbe={audition:__XenMetaAudition,pcm:__XenSessionPCM,hook:__useSessionRhythmAuditions,bassBody:OPe,baselineBass:__sessionBaselineBass,bridge:__XenMainRoomSessionBridge,bassClip:Gle,schedule:lce,material:$T,wav:lg,materials:bs,bassGrid:__XenBassGrid,quick:__XenQuick,sessions:__XenMetaSessions,drumGrid:im,saveDrum:KH,importSample:xee,saveBass:Pce,exportDrums:()=>typeof qp==='function'?qp():null};`;
(async()=>{const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});const errors=[];
try{const page=await browser.newPage({viewport:{width:1600,height:1100}});page.on('pageerror',e=>errors.push(e.message));
const html=fs.readFileSync(entry,'utf8').replace('const kEe=CEe("root");',expose+'const kEe=CEe("root");').replace('__rflPreviewEnsureRef.current=Bs;','window.__nativeRFLLive=()=>({ctx:Lr.current??i,power:Gr,preview:Pl,refs:Re,params:Tt.current,readyRef:__rflPreviewEnsureRef});__rflPreviewEnsureRef.current=Bs;');
await page.route('https://xensonar.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('https://xensonar.test/session-auditions');await page.waitForFunction(()=>window.__sessionProbe?.quick.adapters.get('bass')?.entries?.length>0);
const result=await page.evaluate(async()=>{
 const api=__sessionProbe,a=api.audition,events=[],buffers=[],taps=[],oscillators=[];
 const originalOscillator=OfflineAudioContext.prototype.createOscillator;
 OfflineAudioContext.prototype.createOscillator=function(){const node=originalOscillator.call(this),set=node.frequency.setValueAtTime.bind(node.frequency);node.frequency.setValueAtTime=(hz,time)=>{oscillators.push({hz,time});return set(hz,time)};return node};
 const originalConnect=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(destination,...rest){const result=originalConnect.call(this,destination,...rest);if(destination instanceof AudioDestinationNode){const ctx=this.context,tap=ctx.createAnalyser(),mute=ctx.createGain();tap.fftSize=2048;mute.gain.value=0;originalConnect.call(this,tap);originalConnect.call(tap,mute);originalConnect.call(mute,destination);taps.push({ctx,tap})}return result};
 async function hear(){let peak=0,energy=0;for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,65));for(const {tap,ctx} of taps){if(ctx.state!=='running')continue;const pcm=new Float32Array(tap.fftSize);tap.getFloatTimeDomainData(pcm);for(const value of pcm){peak=Math.max(peak,Math.abs(value));energy+=value*value}}}return {peak,energy,taps:taps.length}}
 window.__sessionHear=hear;
 const original=api.pcm.play;
 // Observe the real AudioBuffer before the real native source starts.
 const AC=window.AudioContext||window.webkitAudioContext,originalCreate=AC.prototype.createBufferSource;
 AC.prototype.createBufferSource=function(){const node=originalCreate.call(this),start=node.start.bind(node);node.start=function(...args){if(node.buffer){let energy=0,peak=0;for(const v of node.buffer.getChannelData(0)){if(!Number.isFinite(v))throw Error('nonfinite PCM');energy+=v*v;peak=Math.max(peak,Math.abs(v))}const pcm=node.buffer.getChannelData(0),firstNonzero=pcm.findIndex(value=>Math.abs(value)>1e-5);buffers.push({firstNonzero,frames:node.buffer.length,rate:node.buffer.sampleRate,channels:node.buffer.numberOfChannels,energy,peak,args})}return start(...args)};return node};
 a.subscribe(()=>events.push({...a.status()}));
 const context=api.pcm.getContext(),buffer=context.createBuffer(1,Math.round(context.sampleRate*.4),context.sampleRate);
 buffer.getChannelData(0).set(Float32Array.from({length:buffer.length},(_,i)=>.2*Math.sin(2*Math.PI*220*i/context.sampleRate)));
 const source=api.material({name:'Session RFL source',role:'loop',rootFollowPreferred:true,rootHz:220,bpm:120,bars:1,loopStartSec:.05,loopEndSec:.35,durationSec:.4},api.wav(buffer));
 await new Promise(r=>setTimeout(r,75));
 const secondSource=api.material({name:'Session RFL second',role:'loop',rootFollowPreferred:true,rootHz:440,bpm:120,bars:1,loopStartSec:0,loopEndSec:.4,durationSec:.4},api.wav(buffer));
 await new Promise(r=>setTimeout(r,75));
 const libraries=Object.fromEntries([...api.quick.adapters].map(([kind,adapter])=>[kind,adapter.entries]));
 const params=api.bridge.capture().nParamsUI;
 await api.importSample(api.wav(buffer),{replaceSampleId:'session-drum-tone',name:'Session raw drum sample',baseHz:220,baseHzSource:'manual',durationSec:.4,tempoPitchLinked:false});
 const sampleGrid=api.drumGrid({useCustom:true,presetSource:'custom',bars:3,segmentsPerBar:4,segmentMarkers:[.1,.6,.8],stepCount:12,laneOrder:['sample1'],laneSteps:{sample1:[0,1,0,0,0,0,0,0,0,0,0,0]},sampleSlots:{sample1:{id:'session-drum-tone',name:'Tone',volume:1,pan:0}}});
 await api.saveDrum({...sampleGrid,id:'session-raw-drums',name:'Session sample-only 3 bars',drumKit:params.drumKit,laneKitOverrides:{},laneSettings:{}});
 await new Promise(r=>setTimeout(r,75));
 const entries=[{kind:'rootFollow',id:source.id,name:source.name},libraries.drum[0],libraries.bass[0]].map((e,i)=>({...e,kind:['rootFollow','drum','bass'][i]}));
 const liveBefore=JSON.stringify({room:api.bridge.capture(),quick:api.quick.snapshot().selectedByKind,grid:api.bassGrid.exportAll(),session:api.sessions.snapshot().items});
 const rows=[];
 for(const entry of entries){const before=buffers.length;const state=await a.toggle(entry);for(let ready=0;a.status().phase==='preparing'&&ready<120;ready++)await new Promise(r=>setTimeout(r,35));await new Promise(r=>setTimeout(r,25));const nativeAudio=await hear();rows.push({entry,state,status:a.status(),buffers:buffers.slice(before),nativeAudio,nativeDebug:entry.kind==='rootFollow'?{power:__nativeRFLLive().power,preview:__nativeRFLLive().preview,params:{active:__nativeRFLLive().params.rootFollowLoopActive,id:__nativeRFLLive().params.rootFollowLoopId},gain:__nativeRFLLive().refs.gainRef.current?.gain.value,nodeCount:__nativeRFLLive().refs.activeNodesRef.current.size,truth:window.__xensonarReadRootFollowPlaybackTruthProbe?.()}:null});a.stop();await new Promise(r=>setTimeout(r,125));if(a.snapshot()!==null)throw Error('stop did not clear owner')}
 const sampleBefore=buffers.length;await a.toggle({kind:'drum',id:'exported:session-raw-drums',name:'Sample-only'});const rawDrum=buffers.slice(sampleBefore);a.stop();
 await a.toggle(entries[1]);const switched=await a.toggle(entries[2]);const switchState=a.status();a.stop();
 const preparing=a.toggle(entries[0]);a.stop();await preparing;await new Promise(r=>setTimeout(r,25));const cancelState=a.status();
 const unavailable=await a.toggle({kind:'bass',id:'clip:missing-ref',name:'Missing'});const missingState=a.status();a.stop();
 // Independent 19-EDO fixture, saved non-16-step three-bar clip. Capture the
 // actual native oscillator pitch while changing the live grid during render.
 const savedRoom=api.bridge.capture(),savedSource=api.bassGrid.snapshot().source;
 api.bridge.apply({...savedRoom,nParamsUI:{...savedRoom.nParamsUI,gridTuning:'19edo',gridMode:'chromatic',manualGridMutedSteps:[],manualGridStepOffsets:Array(19).fill(0),bassVoice:'sub',bassRootHz:55}});
 api.bassGrid.setSource('bass');await new Promise(r=>setTimeout(r,75));api.bassGrid.prepare(api.bridge.capture().nParamsUI);
 const clip=api.bassClip({pattern:'offbeat',rootHz:55});clip.bars=3;clip.stepsPerBar=7;clip.stepCount=21;clip.events=[{...clip.events[0],startStep:5.25,durationSteps:2.1,ratioFromRoot:1.07,octave:0}];clip.generatorMeta={kind:'manual',rootBinding:'free',rootHz:55};
 const savedBass=api.saveBass(clip,{name:'Session 19-EDO three-bar clip'}),oscBefore=oscillators.length;
 const pendingBass=a.toggle({kind:'bass',id:'clip:'+savedBass.id,name:savedBass.name});
 api.bridge.apply({...savedRoom,nParamsUI:{...savedRoom.nParamsUI,gridTuning:'12edo',gridMode:'chromatic',manualGridMutedSteps:[],manualGridStepOffsets:Array(12).fill(0)}});api.bassGrid.prepare({...savedRoom.nParamsUI,gridTuning:'12edo',gridMode:'chromatic',manualGridMutedSteps:[],manualGridStepOffsets:[]});
 await pendingBass;const actual19=oscillators.slice(oscBefore);a.stop();
 const expected19=savedRoom.nParamsUI.gridBase*Math.pow(2,Math.round(19*Math.log2(55*1.07/savedRoom.nParamsUI.gridBase))/19);
 api.bassGrid.setSource(savedSource);api.bridge.apply(savedRoom);await new Promise(r=>setTimeout(r,75));api.bassGrid.prepare(savedRoom.nParamsUI);
 // Queued native RFL start must stay silent after cancellation beyond its bar.
 const queued=a.toggle(entries[0]);a.stop();await queued;await new Promise(r=>setTimeout(r,2450));const cancelledAudio=await hear();
 const staleA=a.toggle(entries[0]);await staleA;
 const switchedRoot=await a.toggle({kind:'rootFollow',id:secondSource.id,name:secondSource.name});
 for(let ready=0;a.status().phase==='preparing'&&ready<200;ready++)await new Promise(r=>setTimeout(r,35));
 const rootSwitch={status:a.status(),audio:await hear(),lastWindow:window.__xensonarReadRootFollowPlaybackTruthProbe?.().recent.filter(event=>event.stage==='first-render-window').at(-1)};
 api.bridge.apply({...savedRoom,nParamsUI:{...savedRoom.nParamsUI,rootFollowLoopId:source.id,rootFollowLoopActive:true,resonanceHotkeyMode:'material'}});await new Promise(r=>setTimeout(r,100));const manualRoot={status:a.status(),params:api.bridge.capture().nParamsUI};a.stop();await new Promise(r=>setTimeout(r,75));const manualAfterStop=api.bridge.capture().nParamsUI;
 api.bridge.apply(savedRoom);await new Promise(r=>setTimeout(r,100));
 await api.saveDrum({...sampleGrid,id:'session-missing-drums',name:'Missing raw reference',drumKit:params.drumKit,laneKitOverrides:{},laneSettings:{},sampleSlots:{sample1:{id:'absent-session-sample',name:'Missing',volume:1,pan:0}}});await new Promise(r=>setTimeout(r,75));
 let missingSampleError=null;try{await a.toggle({kind:'drum',id:'exported:session-missing-drums',name:'Missing'})}catch(error){missingSampleError=error.message}const missingSampleState=a.status();a.stop();
 const readyRef=__nativeRFLLive().readyRef,originalReady=readyRef.current;readyRef.current=async()=>{throw Error('fixture readiness rejected')};let readinessError=null;try{await a.toggle(entries[0])}catch(error){readinessError=error.message}const readinessState=a.status();readyRef.current=originalReady;a.stop();
 const naturalEnds=[];
 for(const entry of [entries[2],entries[1]]){await a.toggle(entry);for(let tick=0;a.snapshot()!==null&&tick<180;tick++)await new Promise(r=>setTimeout(r,45));naturalEnds.push({kind:entry.kind,status:a.status(),key:a.snapshot()});a.stop()}
 // Exact prechange/default native bass synthesis parity and injected route.
 const parameters={bassVoice:'acid',bassTone:.63,bassGrit:.27,bassResonance:.38,bassEnvelope:1.2,bassDecay:1.1,bassSub:.6};
 async function bassRender(factory,injected=false){const ctx=new OfflineAudioContext(2,22050,44100);const owner=factory({audioCtx:ctx,nexusParamsRef:{current:parameters},ensureFinalMixBus:()=>ctx.destination,...(injected?{bassDestination:(()=>{const pan=ctx.createStereoPanner();pan.pan.value=0;pan.connect(ctx.destination);return pan})(),quantizeBassHz:hz=>hz}:{})});owner.playBassNote(.01,55,.6,.25,.81,{glideToNext:true});return ctx.startRendering()}
 const oldBass=await bassRender(api.baselineBass),newBass=await bassRender(api.bassBody),injectedBass=await bassRender(api.bassBody,true);
 let baselineDiff=0,injectedDiff=0;for(let c=0;c<2;c++)for(let i=0;i<oldBass.length;i++){baselineDiff=Math.max(baselineDiff,Math.abs(oldBass.getChannelData(c)[i]-newBass.getChannelData(c)[i]));injectedDiff=Math.max(injectedDiff,Math.abs(oldBass.getChannelData(c)[i]-injectedBass.getChannelData(c)[i]))}
 const liveAfter=JSON.stringify({room:api.bridge.capture(),quick:api.quick.snapshot().selectedByKind,grid:api.bassGrid.exportAll(),session:api.sessions.snapshot().items});
 return {readinessError,readinessState,naturalEnds,manualRoot:{status:manualRoot.status,id:manualRoot.params.rootFollowLoopId,active:manualRoot.params.rootFollowLoopActive,mode:manualRoot.params.resonanceHotkeyMode},manualAfterStop:{id:manualAfterStop.rootFollowLoopId,active:manualAfterStop.rootFollowLoopActive,mode:manualAfterStop.resonanceHotkeyMode},rootSwitch,secondSourceId:secondSource.id,missingSampleError,missingSampleState,actual19,expected19,cancelledAudio,rawDrum,rawDrumBpm:params.quantizeBpm,baselineDiff,injectedDiff,rows,events,switched,switchState,cancelState,unavailable,missingState,liveBefore,liveAfter,libraryKeys:Object.keys(libraries)};
});
await page.evaluate(()=>window.dispatchEvent(new CustomEvent('xensonar:open-meta-menu')));
await page.getByRole('tab',{name:'Bass',exact:false}).click();
await page.locator('.xen-meta-library-row[data-xen-quick-kind="bass"] .xen-meta-row-preview').first().waitFor();
const pointerBefore=await page.evaluate(()=>JSON.stringify({items:__sessionProbe.sessions.snapshot().items,room:__sessionProbe.bridge.capture()}));
for(const kind of ['rootFollow','drum','bass']){await page.getByRole('tab',{name:{rootFollow:'RFL',drum:'Drums',bass:'Bass'}[kind],exact:false}).click();const button=page.locator('.xen-meta-library-row[data-xen-quick-kind="'+kind+'"] .xen-meta-row-preview').first();await button.click();await page.waitForFunction(()=>__sessionProbe.audition.status().phase==='playing');assert.equal(await button.getAttribute('aria-pressed'),'true');await button.click();await page.waitForFunction(()=>__sessionProbe.audition.status().phase==='idle');}
const pointerAfter=await page.evaluate(()=>JSON.stringify({items:__sessionProbe.sessions.snapshot().items,room:__sessionProbe.bridge.capture()}));assert.equal(pointerBefore,pointerAfter,'pointer Play must not add tiles or select live material');result.pointerUI=true;
await page.screenshot({path:'results/sessions-reviewed/session-auditions/sessions-preview.png'});
await page.getByRole('button',{name:'Open original Root Follow Loop manager',exact:true}).last().click();
const nativePreview=page.locator('[data-xen-header-menu="rootFollow"] [data-xensonar-root-follow-preview-button]');await nativePreview.waitFor();await nativePreview.click();
await page.waitForFunction(()=>window.__nativeRFLLive?.().preview===true);
await page.waitForFunction(()=>{const state=__nativeRFLLive(),window=globalThis.__xensonarReadRootFollowPlaybackTruthProbe?.().recent.filter(e=>e.stage==='first-render-window').at(-1);return window&&state.ctx.currentTime>=window.detail.renderWindowStartSec});
result.nativeManager=await page.evaluate(async()=>({power:__nativeRFLLive().power,preview:__nativeRFLLive().preview,audio:await __sessionHear()}));await nativePreview.click();assert.equal(result.nativeManager.power,false);assert(result.nativeManager.audio.peak>1e-4,'original native Preview also outputs sound with Power off');
fs.writeFileSync('results/sessions-reviewed/session-auditions/native-browser.json',JSON.stringify({...result,errors},null,2)+'\n');
assert.equal(result.readinessState.phase,'failed');assert.match(result.readinessError,/could not start/);
for(const end of result.naturalEnds){assert.equal(end.status.phase,'idle');assert.equal(end.key,null,'natural '+end.kind+' end releases shared owner')}
assert.equal(result.manualRoot.status.phase,'idle');assert.equal(result.manualAfterStop.active,true);assert.equal(result.manualAfterStop.mode,'material');assert.equal(result.manualRoot.id,result.manualAfterStop.id,'late Stop must preserve manual root selection');
assert.equal(result.rootSwitch.status.key,'rootFollow\0'+result.secondSourceId);assert.equal(result.rootSwitch.lastWindow.loopId,result.secondSourceId);assert(result.rootSwitch.audio.peak>1e-4,'switched native RFL source outputs audio');assert.equal(result.missingSampleState.phase,'failed');assert.match(result.missingSampleError,/Missing drum sample/);
assert(result.actual19.length>0&&Math.abs(result.actual19[0].hz-result.expected19)<1e-8,'saved Bass oscillator retains click-time 19-EDO pitch across live grid change');assert(result.cancelledAudio.peak<1e-5,'stopped queued native RFL must stay silent beyond planned bar');
assert(result.rawDrum.some(b=>b.energy>1&&Math.abs(b.firstNonzero/b.rate-(.1*4*60/result.rawDrumBpm))<.002),'actual raw sample starts at saved shifted segment marker');assert(result.rawDrum.some(b=>Math.abs(b.frames/b.rate-(3*4*60/result.rawDrumBpm+.18))<1/b.rate),'full saved three-bar drum duration');
assert.equal(result.baselineDiff,0,'default bass body must retain exact native PCM');assert.equal(result.injectedDiff,0,'isolated bass destination must retain exact native PCM');
assert.equal(result.liveBefore,result.liveAfter,'auditions must preserve live selections/grid/session');assert.equal(result.rows.length,3);
for(const row of result.rows){assert.equal(row.status.phase,'playing',JSON.stringify(row));assert(row.nativeAudio.peak>1e-4&&row.nativeAudio.energy>0,JSON.stringify(row));if(row.entry.kind!=='rootFollow'){assert(row.buffers.length>0,JSON.stringify(row));assert(row.buffers.some(b=>b.peak>1e-4&&b.energy>0),JSON.stringify(row));}}
assert.equal(result.cancelState.phase,'idle');assert.equal(result.missingState.phase,'failed');assert.equal(result.switchState.key,result.rows[2].status.key);assert.deepEqual(errors,[]);
fs.writeFileSync('results/sessions-reviewed/session-auditions/native-browser.json',JSON.stringify({...result,errors},null,2)+'\n');console.log('PASS native Sessions PCM: RFL/drums/bass, stop, switch, preparation cancellation, missing source, unchanged live state');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
