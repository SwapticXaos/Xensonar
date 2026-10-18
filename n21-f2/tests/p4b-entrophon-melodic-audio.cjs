'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{Worker:Thread}=require('node:worker_threads');
const read=p=>fs.readFileSync(p,'utf8'),app=read('src/01_app_runtime.js'),config=read('src/runtime/instrument/10_entrophon_and_voice_control.js'),live=read('src/audio/05_live_voice_runtime.js');
const urls=new Map();let serial=0,workers=0,renderCalls=0,destroyedKernels=0;
class BrowserWorker {
 constructor(url){workers++;this.thread=new Thread('const {parentPort}=require("node:worker_threads");globalThis.postMessage=(m,t)=>parentPort.postMessage(m.left?{...m,__testDestroys:globalThis.__testDestroys}:m,t);parentPort.on("message",data=>globalThis.onmessage({data}));\n'+urls.get(url).replaceAll('e.xen_wasm_destroy()', '(globalThis.__testDestroys=(globalThis.__testDestroys||0)+1,e.xen_wasm_destroy())'),{eval:true});this.thread.on('message',data=>{if(data.left){assert(data.__testDestroys>0,'kernel resources destroyed before returning PCM');destroyedKernels++;}this.onmessage?.({data});});this.thread.on('error',error=>this.onerror?.({message:error.message}));}
 postMessage(message){if(message.type!=='init')renderCalls++;this.thread.postMessage(message);}terminate(){workers--;this.thread.terminate();}
}
const context=vm.createContext({console,atob,Math,Map,Set,WeakMap,WeakSet,Uint32Array,Float32Array,ArrayBuffer,WebAssembly,setTimeout,clearTimeout,Worker:BrowserWorker,
 Blob:class{constructor(parts){this.source=parts.join('');}},URL:{createObjectURL(blob){const id='blob:'+ ++serial;urls.set(id,blob.source);return id;},revokeObjectURL(id){urls.delete(id);}}});
const prep=app.slice(app.indexOf('function __entPreparedConfig('),app.indexOf('// F3_41 visual donor workbench'));
vm.runInContext('const __entConfigCache=new WeakMap();'+prep+config.slice(0,config.indexOf('const Fb='))+read('src/instruments/01_entrophon_definition.js'),context);
vm.runInContext('const yM=256;'+live.slice(live.indexOf('function fMe('),live.indexOf('class t9'))+live.slice(live.indexOf('const gMe=1'),live.indexOf('function MMe(')),context);
vm.runInContext(read('src/audio/entrophon/01_wasm_asset.js')+';const T8='+read('src/audio/entrophon/02_worklet_and_voice_backend.js').match(/const T8=("(?:[^"\\]|\\.)*")/)[1]+';'+read('src/instruments/04_entrophon_melodic_audio.js')+';this.api={renderEntrophonSound,prepareEntrophonMelodicSources,entrophonRenderTailSeconds,previewEntrophonSavedSound,resolve:resolveEntrophonInstrument,record:__entrophonMelodicRecord,capture:captureEntrophonInstrument,set:(surface,config)=>rc={...rc,[surface]:zA(surface,config)}}',context);
(async()=>{
 const api=context.api,sound=api.capture('Wave'),opts={frequency:221.731,velocity:.8,durationSec:.12};
 const body=api.resolve(sound,{freq:opts.frequency,velocity:opts.velocity}),record=api.record(sound,opts,48000),floats=new Float32Array(record.record.buffer);
 const f32=Math.fround;
 assert.equal(floats[31],f32(Math.max(70,body.filterFreq*.62)));assert.equal(floats[35],f32(.62+body.distortion*.28));
 assert.equal(floats[37],f32(Math.max(80,body.tunedFreq*1.5)));assert.equal(floats[38],f32(3.2));assert.equal(floats[39],f32(.08+body.reverbAmount*.14+body.colorAmount*.04));
 assert.equal(floats[41],f32(body.delayAmount*.16));assert.equal(floats[42],f32(Math.min(.42,body.delayAmount*.38)));assert.equal(floats[43],f32(1/Math.max(1,(body.oscillatorFreqs.length+body.colorFreqs.length)*.7)));
 const a=await api.renderEntrophonSound(sound,opts,48000);
 assert.equal(a.left.length,a.right.length);assert(a.left.some(v=>Math.abs(v)>1e-4));assert(a.left.every(Number.isFinite));assert.equal(workers,0);
 api.set('wave',{waveform:'sine',unison:1,volume:.2,colorAmount:0});
 const b=await api.renderEntrophonSound(sound,opts,48000);assert.deepEqual(b.left,a.left,'global sound slot cannot pollute a saved sound');
 const other=await api.renderEntrophonSound(api.capture('Different'),opts,48000);assert.notDeepEqual(other.left,a.left,'separate definitions produce separate actual PCM');
 const shifted=await api.renderEntrophonSound(sound,{...opts,pitchCurve:[0,12],volumeCurve:[1,0]},48000);assert.notDeepEqual(shifted.left,a.left,'C11 pitch and gain controls change actual PCM');
 for(const surface of ['particle','spectral']){const pcm=await api.renderEntrophonSound(api.capture(surface,surface),opts,44100);assert(pcm.left.some(v=>Math.abs(v)>1e-4));}
 const pitchOnly=await api.renderEntrophonSound(sound,{...opts,pitchCurve:[0,12]},48000);assert.notDeepEqual(pitchOnly.left,a.left,'pitch control reaches C11 independently of volume');
 const composer={tracks:[{id:'track',enabled:true,instrumentPreset:'entrophon:saved',volume:.3}],notes:[{id:'note',trackId:'track',velocity:.5}],pitchSteps:[{}]};
 Object.assign(context,{testSound:sound,E$:()=>.1,Ax:()=>0,F$:()=>1,lD:()=>.1,iD:()=>1,uD:()=>0,yW:(track,note)=>note.instrumentPresetOverride??track.instrumentPreset,m9e:()=>221.731,d9e:()=>0,T$:()=>0,resolveNodalArticulationFields:()=>({volumeCurve:null,pitchCurve:null}),entrophonFindInstrument:()=>sound});
 const ctx={sampleRate:48000,createBuffer:(channels,length,rate)=>({channels,length,sampleRate:rate,data:[],copyToChannel(pcm,ch){this.data[ch]=pcm;}})};
 const sources=await api.prepareEntrophonMelodicSources({composer,trackIds:['track']},new Map(),ctx);
 assert.equal(sources.get('entrophon:saved').kind,'entrophon');assert(sources.get('entrophon:saved').noteBuffers.get('note').buffer.data[0].some(v=>v!==0));
 const firstPrepared=sources.get('entrophon:saved').noteBuffers.get('note').buffer.data[0];composer.tracks[0].volume=.9;
 const second=await api.prepareEntrophonMelodicSources({composer,trackIds:['track']},new Map(),ctx);assert.deepEqual(second.get('entrophon:saved').noteBuffers.get('note').buffer.data[0],firstPrepared,'track gain belongs to existing transport and is applied once');assert.equal(workers,0);assert(api.entrophonRenderTailSeconds({composer,trackIds:['track']})>0);
 const beforeDedup=renderCalls;
 const duplicated={...composer,tracks:[...composer.tracks,{id:'other-track',enabled:true,instrumentPreset:'entrophon:saved',volume:.1,pan:1}],notes:[...composer.notes,{id:'duplicate',trackId:'other-track',velocity:.5},{id:'velocity',trackId:'track',velocity:.9},{id:'curve',trackId:'track',velocity:.5,localField:{pitch:[0,12]}},{id:'recipe',trackId:'track',velocity:.5,instrumentPresetOverride:'entrophon:other'}]};
 const distinctRecipe=api.capture('Other recipe');
 context.entrophonFindInstrument=id=>id==='entrophon:other'?distinctRecipe:sound;
 context.resolveNodalArticulationFields=(_,field)=>({volumeCurve:null,pitchCurve:field?.pitch??null});
 const dedup=await api.prepareEntrophonMelodicSources({composer:duplicated,trackIds:['track','other-track']},new Map(),ctx);
 assert.equal(renderCalls-beforeDedup,4,'five notes with one exact repeat require only four actual kernel renders');
 const material=dedup.get('entrophon:saved').noteBuffers;
 assert.equal(material.get('note').buffer,material.get('duplicate').buffer,'identical notes across gain/pan tracks share AudioBuffer');
 assert.notEqual(material.get('note').options,material.get('duplicate').options,'per-note options remain separately owned');
 assert.notEqual(material.get('note').buffer,material.get('curve').buffer,'contour change invalidates render sharing');
 assert.notEqual(material.get('note').buffer,material.get('velocity').buffer,'velocity change invalidates render sharing');
 assert.notEqual(material.get('note').buffer,dedup.get('entrophon:other').noteBuffers.get('recipe').buffer,'different recipe identity invalidates render sharing');
 const beforeRepeat=renderCalls;await api.prepareEntrophonMelodicSources({composer,trackIds:['track']},new Map(),ctx);assert.equal(renderCalls-beforeRepeat,1,'cache is discarded after each preparation');assert.equal(workers,0);
 const abortedPreparation=new AbortController(),beforeCancel=renderCalls;
 const preparing=api.prepareEntrophonMelodicSources({composer:duplicated,trackIds:['track','other-track'],signal:abortedPreparation.signal},new Map(),ctx);abortedPreparation.abort();await assert.rejects(preparing);assert.equal(workers,0);assert.equal(renderCalls,beforeCancel,'cancel while initializing never submits DSP');
 let previewStops=0,previewDisconnects=0,gainDisconnects=0,outputConnections=0;const output={},fades=[];
 const previewGain={gain:{value:1,setValueAtTime(value,time){fades.push(['set',value,time]);},linearRampToValueAtTime(value,time){fades.push(['ramp',value,time]);},cancelScheduledValues(time){fades.push(['cancel',time]);}},connect(destination){assert.equal(destination,output);outputConnections++;},disconnect(){gainDisconnects++;}};
 let previewPCM=null;
 const previewContext={...ctx,currentTime:2,createGain:()=>previewGain,createBufferSource:()=>({connect(destination){assert.equal(destination,previewGain);},start(){previewPCM=this.buffer.data[0];},stop(time){assert(time>=2);previewStops++;},disconnect(){previewDisconnects++;}}),close(){throw Error('Preview must not close shared context');}};
 context.__XenNodalInstallation={current:{ensureAudio:async()=>previewContext,getOutput:()=>output}};
 const previewAbort=new AbortController();
 const handle=await api.previewEntrophonSavedSound({instrument:sound},{frequency:330,signal:previewAbort.signal});await handle.started;
 const expectedPreview=await api.renderEntrophonSound(sound,{frequency:330,velocity:.8,durationSec:.8},48000);assert.deepEqual(previewPCM,expectedPreview.left,'preview uses requested grid frequency');
 assert(fades.some(([op,value])=>op==='set'&&value===0));assert(fades.some(([op,value])=>op==='ramp'&&value===1));
 previewAbort.abort();handle.noteOff();assert.equal(previewStops,1);assert.equal(previewDisconnects,0,'stop fade precedes disconnection');assert(fades.some(([op,value])=>op==='ramp'&&value===0));
 await new Promise(resolve=>setTimeout(resolve,65));assert.equal(previewDisconnects,1);assert.equal(gainDisconnects,1);assert.equal(outputConnections,1);
 const stalePreview=new AbortController();stalePreview.abort();const beforeStale=renderCalls;await assert.rejects(api.previewEntrophonSavedSound({instrument:sound},{frequency:440,signal:stalePreview.signal}),{name:'AbortError'});assert.equal(renderCalls,beforeStale);
 const silent=await api.renderEntrophonSound(sound,{...opts,velocity:0},48000);assert(silent.left.every(v=>v===0));
 await assert.rejects(api.renderEntrophonSound(sound,{...opts,pitchCurve:[NaN]}));
 await assert.rejects(api.renderEntrophonSound(sound,opts,1));
 const controller=new AbortController();controller.abort();await assert.rejects(api.renderEntrophonSound(sound,{...opts,signal:controller.signal}));assert.equal(workers,0,'aborted worker disposed');
 const controller2=new AbortController(),pending=api.renderEntrophonSound(sound,{...opts,durationSec:30,signal:controller2.signal});controller2.abort();await assert.rejects(pending);assert.equal(workers,0);
 assert(api.record(sound,{...opts,durationSec:999},48000).frameCount<=48000*34);
 assert(destroyedKernels>0);
 console.log('PASS saved Entrophon real WASM worker PCM: exact snapshot isolation, different recipes, contours, three surfaces, silence, bounds, cancellation and worker disposal');
})().catch(error=>{console.error(error);process.exitCode=1});
