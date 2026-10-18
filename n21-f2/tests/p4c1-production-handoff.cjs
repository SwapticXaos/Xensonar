'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{Worker:Thread}=require('node:worker_threads');
const read=p=>fs.readFileSync(p,'utf8'),app=read('src/01_app_runtime.js'),config=read('src/runtime/instrument/10_entrophon_and_voice_control.js'),live=read('src/audio/05_live_voice_runtime.js');
const urls=new Map();let serial=0,workers=0,renderCalls=0,destroyedKernels=0,workerStarts=0;
class BrowserWorker {
 constructor(url){workers++;workerStarts++;this.thread=new Thread('const {parentPort}=require("node:worker_threads");globalThis.postMessage=(m,t)=>parentPort.postMessage(m.left?{...m,__testDestroys:globalThis.__testDestroys}:m,t);parentPort.on("message",data=>globalThis.onmessage({data}));\n'+urls.get(url).replaceAll('e.xen_wasm_destroy()', '(globalThis.__testDestroys=(globalThis.__testDestroys||0)+1,e.xen_wasm_destroy())'),{eval:true});this.thread.on('message',data=>{if(data.left){assert(data.__testDestroys>0,'kernel resources destroyed before returning PCM');destroyedKernels++;}this.onmessage?.({data});});this.thread.on('error',error=>this.onerror?.({message:error.message}));}
 postMessage(message){if(message.type!=='init')renderCalls++;this.thread.postMessage(message);}terminate(){workers--;this.thread.terminate();}
}
const context=vm.createContext({console,atob,Math,Map,Set,WeakMap,WeakSet,AbortController,Uint32Array,Float32Array,ArrayBuffer,WebAssembly,setTimeout,clearTimeout,Worker:BrowserWorker,
 Blob:class{constructor(parts){this.source=parts.join('');}},URL:{createObjectURL(blob){const id='blob:'+ ++serial;urls.set(id,blob.source);return id;},revokeObjectURL(id){urls.delete(id);}}});
const prep=app.slice(app.indexOf('function __entPreparedConfig('),app.indexOf('// F3_41 visual donor workbench'));
vm.runInContext('const __entConfigCache=new WeakMap();'+prep+config.slice(0,config.indexOf('const Fb='))+read('src/instruments/01_entrophon_definition.js'),context);
vm.runInContext('const yM=256;'+live.slice(live.indexOf('function fMe('),live.indexOf('class t9'))+live.slice(live.indexOf('const gMe=1'),live.indexOf('function MMe(')),context);
vm.runInContext(read('src/audio/entrophon/01_wasm_asset.js')+';const T8='+read('src/audio/entrophon/02_worklet_and_voice_backend.js').match(/const T8=("(?:[^"\\]|\\.)*")/)[1]+';'+read('src/instruments/04_entrophon_melodic_audio.js')+';this.api={renderEntrophonSound,prepareEntrophonMelodicSources,entrophonRenderTailSeconds,previewEntrophonSavedSound,resolve:resolveEntrophonInstrument,record:__entrophonMelodicRecord,capture:captureEntrophonInstrument,set:(surface,config)=>rc={...rc,[surface]:zA(surface,config)}}',context);

vm.runInContext(read('src/nodal/04_audio_runtime.js').split('function nodalWorkletProcessorFactory')[0]+read('src/nodal/01_instrument_model.js')+read('src/nodal/06_melodic_bridge.js')+read('src/instruments/06_source_preparation.js'),context);
const transport=read('src/audio/03_rfl_transport_legacy.js');
vm.runInContext(transport.slice(transport.indexOf('async function SW('),transport.indexOf('const Vye='))+';this.load=SW;',context);
(async()=>{
 const sound=context.api.capture('P4C actual C11'),preset='entrophon:actual@1';
 const nodal=JSON.parse(read('examples/nodal_open/filament.xen-nodal.json'));
 Object.assign(context,{lD:()=>.1,iD:()=>1,uD:(_,n)=>n.channelIndex??0,F$:(_,n)=>n.durationUnits??1,
 yW:(t,n)=>n.instrumentPresetOverride??t.instrumentPreset,m9e:(_,n)=>n.frequency??221.731,
 d9e:()=>0,T$:()=>0,resolveNodalArticulationFields:()=>({volumeCurve:null,pitchCurve:null}),
 entrophonFindInstrument:id=>id===preset?sound:null,pg:async()=>{throw Error('Unselected sample loaded');}});
 const composer={bars:3,stepsPerBar:11,tracks:[{id:'e',enabled:true,instrumentPreset:preset},{id:'n',enabled:true,instrumentPreset:'nodal:unused@1'},{id:'s',enabled:false,instrumentPreset:'sample:missing'}],
 notes:[{id:'a',trackId:'e',frequency:221.731},{id:'b',trackId:'e',frequency:221.731},{id:'c',trackId:'n',instrumentPresetOverride:'nodal:actual@1'},{id:'s',trackId:'s'}],
 pitchSteps:[{}],nodalInstruments:{'nodal:actual@1':nodal}};
 const ctx={sampleRate:48000,createBuffer:(channels,length,sampleRate)=>({length,numberOfChannels:channels,sampleRate,data:[],copyToChannel(pcm,ch){this.data[ch]=pcm;}})};
 const request={composer,trackIds:['e','n','s']},before=JSON.stringify(composer),previousRenders=renderCalls;
 const sources=await context.load(request,ctx);
 assert.equal(sources.size,2);assert.equal(renderCalls-previousRenders,1,'identical notes share actual C11 output');
 const source=sources.get(preset),a=source.noteBuffers.get('a').buffer;
 assert.equal(a,source.noteBuffers.get('b').buffer);assert.equal(source.resources.uniqueBuffers,1);
 assert.equal(source.resources.pcmBytes,a.length*8);assert.equal(source.resources.noteCount,2);
 assert(a.data[0].some(v=>Math.abs(v)>1e-4));assert(a.data[0].every(Number.isFinite));
 const direct=await context.api.renderEntrophonSound(sound,{frequency:221.731,velocity:.8,durationSec:.1,attackSec:sound.config.attack,releaseSec:sound.config.release},48000);
 assert.deepEqual(a.data[0],direct.left,'common handoff preserves production PCM exactly');
 assert.equal(sources.get('nodal:actual@1').resources.nodeCount,3);
 assert.equal(JSON.stringify(composer),before,'request geometry, explicit frequencies and snapshots remain intact');
 const starts=workerStarts,renders=renderCalls;
 const invalid={...composer,notes:[...composer.notes,{id:'bad',trackId:'e',frequency:NaN}]};
 await assert.rejects(context.load({...request,composer:invalid},ctx),/Invalid Entrophon note/);
 assert.equal(workerStarts,starts,'invalid final note rejected before Worker creation');assert.equal(renderCalls,renders);
 const long={...composer,notes:Array.from({length:30},(_,i)=>({id:'long'+i,trackId:'e',frequency:220+i,durationUnits:300}))};
 await assert.rejects(context.load({...request,composer:long},ctx),/preparation limit/);
 assert.equal(workerStarts,starts,'complete aggregate frame budget checked before Worker allocation');
 const abort=new AbortController(),pending=context.load({...request,signal:abort.signal},ctx);abort.abort();
 await assert.rejects(pending,{name:'AbortError'});assert.equal(workers,0);
 assert.equal(urls.size,0,'all blob URLs revoked');assert(destroyedKernels>0);
 console.log('PASS P4C1 production SW handoff: real mixed Nodal/C11, exact PCM, microtonal frequencies, deduplication, preflight limits, cancellation and worker cleanup');
})().catch(error=>{console.error(error);process.exitCode=1});
