'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
function fixture({audioOnly=false,selected=null,nativeThrows=false,nativeMissing=false,renderError=null,volume=100}={}){
 const source=fs.readFileSync(path.join(__dirname,'../src/forge/editor/07_composition_and_preview_ui.js'),'utf8');
 const events=[],saved=[],registered=[],messages=[],disk=new Map();
 const {fixture:runtime,grid}=require('./helpers/carrier_runtime.cjs');const raster=grid();for(let x=0;x<raster.width;x++){raster.set(x,35,.8);raster.set(x,65,.7)}
 const state={renderVersion:42,selectedProjectId:'current-project',materialExport:{name:'Current draft',bpm:120,bars:2,beatsPerBar:4},carrierIntegralSelection:{machineId:'branch-a-line-traffic'},createProjectSnapshot:()=>({current:true,grid:raster})};
 const c=runtime();Object.assign(c,{console,Math,Number,JSON,Object,Date,crypto:require('crypto').webcrypto,
 P:{useRef:v=>({current:v}),useCallback:fn=>fn},pe:{getState:()=>state},
 window:{sessionStorage:{setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)},setTimeout(){}},
 __ForgeDonorRoutingF317:{guardExport:fn=>fn()},__f333ExportCurrent:async()=>{if(renderError)throw renderError;return {size:100}},__f333CurrentLabel:()=> 'Antonia',
 __ForgeNavigatorSample:{current:()=>selected},__f333NavigatorTypedName:()=> 'Visible name',__f333NavigatorBars:x=>x,__f333NavigatorName:x=>x,
 __f333RenderNavigatorClip:async()=>({blob:{size:100},durationSec:4}),
 __f333Route:()=>audioOnly?'reference':'hearing',
 __f333HearingRequest:s=>({snapshot:s.createProjectSnapshot(),machineId:s.carrierIntegralSelection.machineId}),
 TR:s=>s.grid,AV:v=>v,
 oze:()=>{if(nativeThrows)throw Error('Unsupported machine');return{usesAudioPaintImportDetail:!nativeMissing}},PK:req=>({config:{sourceKind:'synth',synthPattern:{notes:[{durationBeats:1}],baseHz:110},synthPatch:{carrierIntegralTimbre:nativeMissing?null:{schemaVersion:'carrier-integral-timbre-v1',presetId:'native',oscillators:[{type:'sine',gain:.3,freqMul:1}]}}},baseHz:110,request:req}),
 Aje:JSON.stringify,UK:v=>registered.push(v),ri:(name,detail)=>events.push({name,detail}),
 Yd:(meta,blob)=>(saved.push({meta,blob}),{id:meta.stableId??'raw-id',name:meta.name}),bu:v=>v,
 __forgeMaterialRootHz:x=>x??55,KB:'raw-pending',OR:'structured-pending',yx:'direct-pending'});
 vm.createContext(c);
 const a=source.indexOf('function __xenForgePinkPlan('),start=a>=0?a:source.indexOf('function x6e('),end=source.indexOf('function M6e(',start);
 vm.runInContext(source.slice(start,end)+';globalThis.transport=x6e;',c);
 c.__testCarrierVolume=volume;
 const ui={materialExport:state.materialExport,variant:'forge3',getActivePreviewDuration:()=>4,setWorkflowBusy(){},setWorkflowProgress(){},setStatusMessage:v=>messages.push(v)};
 return {context:c,send:c.transport(ui).handleSendCurrentPreviewToXensonar,events,saved,registered,state,messages,disk};
}
test('Pink transport registers the current carrier and opens interpretation choice instead of inserting audio',async()=>{
 const f=fixture();await f.send('pink');
 assert.equal(f.events.some(e=>e.name==='materialIntakeRawMelodicImport'),false);
 const handoff=f.events.find(e=>e.name==='carrierIntegralMelodicPinkExport');assert.ok(handoff);
 assert.equal(handoff.detail.carrierProjectId,'current-project');assert.equal(handoff.detail.carrierRevision,42);
 assert.equal(handoff.detail.entryId,f.saved[0].meta.stableId);
 assert.equal(JSON.parse(f.saved[0].meta.audioPaintImportDetailJson).config.sourceKind,'synth');
 assert.equal(f.saved[0].meta.name,'Visible name');assert.equal(f.registered.length,1);
 assert.ok(f.events.some(e=>e.name==='openCanonicalMelodicLoop'));
});
test('Audio-only and Navigator selection open Raw Audio choice with an explicit reason',async()=>{
 for(const options of [{audioOnly:true},{selected:{start:1,end:2}}]){
  const f=fixture(options);await f.send('pink');
  assert.equal(f.events.some(e=>e.name==='materialIntakeRawMelodicImport'),false);
  const raw=f.events.find(e=>e.name==='carrierIntegralRawMaterialMelodicExport');assert.ok(raw);
  assert.ok(raw.detail.reason.length>0);assert.equal(f.registered.length,0);
 }
});
test('Material and Root Follow destinations retain their existing separate routing',async()=>{
 for(const dest of ['material','root']){
  const f=fixture();await f.send(dest);
  assert.equal(f.saved.length,1);assert.equal(f.events.some(e=>e.name.includes('Melodic')),false);
  assert.equal(f.events.some(e=>e.name==='rootFollowBankMembership'),dest==='root');
 }
});

test('new machines with absent or throwing native policies still get polyphonic Basic transfer',async()=>{
 for(const options of [{nativeMissing:true},{nativeThrows:true}]){
  const f=fixture(options);f.state.carrierIntegralSelection.machineId='emilia-nodal-carrier';await f.send('pink');
  assert.equal(f.saved.length,1);const handoff=f.events.find(e=>e.name==='carrierIntegralMelodicPinkExport');assert.ok(handoff);
  assert.equal(handoff.detail.fallback.kind,'basic-synth');assert.equal(handoff.detail.config.synthPattern.notes.length,2);
  assert.equal(handoff.detail.carrierIntegralTimbre.presetId,'basic-carrier');
 }
});
test('even a compressed native BERT plan cannot replace the two painted geometry voices',async()=>{
 const f=fixture();await f.send('pink');const plan=f.events.find(e=>e.name==='carrierIntegralMelodicPinkExport').detail;
 assert.equal(plan.config.synthPattern.notes.length,2);assert.equal(plan.geometry.maxPolyphony,2);
});
test('a native audio render failure uses a labelled Basic WAV and still opens the chooser',async()=>{
 const f=fixture({renderError:Error('New machine export unavailable')});await f.send('pink');
 assert.equal(f.saved.length,1);const detail=f.events.find(e=>e.name==='carrierIntegralMelodicPinkExport').detail;
 assert.equal(detail.renderFallback.kind,'basic-synth-audio');assert.equal(detail.fallback.kind,'basic-synth');
 assert.ok(f.saved[0].blob.size>44);assert.equal((await f.saved[0].blob.text()).slice(0,4),'RIFF');
 assert.equal(f.saved[0].meta.audioIdentitySource,'basic-carrier-fallback');
 assert.match(f.saved[0].meta.routeSummary,/Basic/);
});
test('an aborted native render is never replaced or saved',async()=>{
 const error=Error('Cancelled');error.name='AbortError';const f=fixture({renderError:error});await f.send('pink');
 assert.equal(f.saved.length,0);assert.equal(f.events.length,0);
});
test('Basic audio fallback honors a muted Carrier Volume',async()=>{
 const f=fixture({nativeMissing:true,renderError:Error('Unavailable'),volume:0});await f.send('pink');
 const wav=new DataView(await f.saved[0].blob.arrayBuffer());let peak=0;for(let i=44;i<wav.byteLength;i+=2)peak=Math.max(peak,Math.abs(wav.getInt16(i,true)));
 assert.equal(peak,0);
});
