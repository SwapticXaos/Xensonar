'use strict';
const fs=require('node:fs'),vm=require('node:vm'),{Worker:Thread}=require('node:worker_threads');
const read=p=>fs.readFileSync(p,'utf8');
function createEngine(before=false,measure=true){
 const work={pow:0,spread:0};const math=measure?Object.create(Math):Math;if(measure)math.pow=(...args)=>{work.pow++;return Math.pow(...args);};
 const app=read('src/01_app_runtime.js'),config=read(before?'tests/fixtures/p4c2_n2_baseline/entrophon_config.js':'src/runtime/instrument/10_entrophon_and_voice_control.js');
 const prep=before?read('tests/fixtures/p4c2_n2_baseline/entrophon_preparation.js'):app.slice(app.indexOf('const __entConfigCache'),app.indexOf('// F3_41 visual donor workbench'));
 const urls=new Map(),threads=new Set();let serial=0;
 class BrowserWorker{
  constructor(url){this.thread=new Thread('const {parentPort}=require("node:worker_threads");globalThis.postMessage=(m,t)=>parentPort.postMessage(m,t);parentPort.on("message",data=>globalThis.onmessage({data}));\n'+urls.get(url),{eval:true});threads.add(this.thread);this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.({message:error.message}));}
  postMessage(message){this.thread.postMessage(message);}terminate(){threads.delete(this.thread);return this.thread.terminate();}
 }
 const context=vm.createContext({console,atob,Math:math,Map,Set,WeakMap,WeakSet,Uint32Array,Float32Array,ArrayBuffer,WebAssembly,setTimeout,clearTimeout,Worker:BrowserWorker,
  Blob:class{constructor(parts){this.source=parts.join('');}},URL:{createObjectURL(blob){const id='blob:'+ ++serial;urls.set(id,blob.source);return id;},revokeObjectURL(id){urls.delete(id);}}});
 const configSource=config.slice(0,config.indexOf('const Fb='));
 vm.runInContext(prep+configSource+read('src/instruments/01_entrophon_definition.js')+';this.api={body:dT,defaults:ES,capture:captureEntrophonInstrument,resolve:resolveEntrophonInstrument,prepared:__entPreparedConfig,normalize:normalizeEntrophonInstrument,set:(surface,config)=>{rc={...rc,[surface]:zA(surface,config)};return rc[surface]}}',context);
 const spread=context.Zie;if(measure)context.Zie=(...args)=>{work.spread++;return spread(...args);};
 let rendering=false;
 function enableRendering(){if(rendering)return;rendering=true;const live=read('src/audio/05_live_voice_runtime.js');
  vm.runInContext('const yM=256;'+live.slice(live.indexOf('function fMe('),live.indexOf('class t9'))+live.slice(live.indexOf('const gMe=1'),live.indexOf('function MMe(')),context);
  vm.runInContext(read('src/audio/entrophon/01_wasm_asset.js')+';const T8='+read('src/audio/entrophon/02_worklet_and_voice_backend.js').match(/const T8=("(?:[^"\\]|\\.)*")/)[1]+';'+read('src/instruments/04_entrophon_melodic_audio.js')+';this.api.record=__entrophonMelodicRecord;this.api.render=renderEntrophonSound;',context);
 }
 return {api:context.api,work,clear(){work.pow=work.spread=0;},enableRendering,async dispose(){for(const thread of threads)await thread.terminate();threads.clear();},get workers(){return threads.size;}};
}
module.exports={createEngine};
