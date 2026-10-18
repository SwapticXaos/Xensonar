const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
function harness(base=root,overrides={}){const read=f=>overrides[f]??fs.readFileSync(path.join(base,f),'utf8'),context=vm.createContext({console,Math,Date,Number,JSON,Map,Set,WeakMap,WeakSet,Object,Array,Float32Array,Float64Array,Uint32Array,Promise,Error,DOMException,setTimeout,clearTimeout,localStorage:{getItem(){return null},setItem(){}},xt:{getContext(){return{sampleRate:16000,createBuffer(channels,length,sampleRate){const c=Array.from({length:channels},()=>new Float32Array(length));return{length,sampleRate,numberOfChannels:channels,getChannelData:i=>c[i],copyToChannel:(a,i)=>c[i].set(a)}}}}}});
for(const file of ['src/nodal/01_instrument_model.js','src/nodal/02_synthesis_kernel.js','src/nodal/07_sound_designer.js'])vm.runInContext(read(file),context);
const registry=vm.runInContext('({'+read('src/forge/module_bundle/04_carrierSupportField.js')+read('src/forge/module_bundle/05_carrierContinuity.js')+read('src/forge/module_bundle/02_projectionCarrierPlan.js')+'})',context),cache={};
function requireModule(name){const key=Object.keys(registry).find(k=>k.endsWith(name.replace('./','')+'.ts'));if(!key)throw Error('missing '+name);if(cache[key])return cache[key].exports;const m={exports:{}};cache[key]=m;registry[key](m,m.exports,requireModule);return m.exports;}
context.__ForgeF33=requireModule('./carrierSupportField');
// Run the original stored-Melodic helpers unchanged, including raster identity guard.
const carrier=read('src/forge_and_melodic/10_audition_and_persistence.js');const start=carrier.indexOf('function __f333Signature'),end=carrier.indexOf('function __f333HearingRequest');vm.runInContext(carrier.slice(start,end),context);
// Evaluate the unchanged HX source/compiler section from the application.
// Definitions unrelated to rendering remain inert; RR/nU are the real helpers.
const profiles=read('src/app/forge/04_profiles_and_body_models.js');
const helpers=profiles.slice(profiles.indexOf('function Ti('),profiles.indexOf('function IO('));
const hxSection=profiles.slice(profiles.indexOf('const $Be='),profiles.indexOf('function hDe('));
vm.runInContext(helpers+hxSection,context);
if(fs.existsSync(path.join(base,'src/forge/emilia/05_hx_reciprocal.js')))vm.runInContext(read('src/forge/emilia/05_hx_reciprocal.js'),context);
if(fs.existsSync(path.join(base,'src/forge/emilia/04_source_materials.js')))vm.runInContext(read('src/forge/emilia/04_source_materials.js'),context);
if(fs.existsSync(path.join(base,'src/forge/emilia/03_network_color.js')))vm.runInContext(read('src/forge/emilia/03_network_color.js'),context);
if(fs.existsSync(path.join(base,'src/forge/emilia/01_nodal_carrier.js')))vm.runInContext(read('src/forge/emilia/01_nodal_carrier.js'),context);
return {context,api:vm.runInContext('typeof __Emilia!=="undefined"?__Emilia:null',context),model:vm.runInContext('__XenNodalModel',context),dsp:vm.runInContext('__XenNodalDSP',context)};
}
function grid(width=120,height=96,voices=[{hz:220,gain:.65}]){const data=new Float32Array(width*height);for(let x=0;x<width;x++)for(const v of voices){const y=Math.round(height*(1-Math.log(v.hz/20)/Math.log(1000)));if(y>=0&&y<height)data[y*width+x]=v.gain;}return{width,height,data,get:(x,y)=>data[y*width+x],getColumn:x=>Array.from({length:height},(_,y)=>data[y*width+x])};}
function rms(a,start=0,end=a.length){let s=0;for(let i=start;i<end;i++)s+=a[i]*a[i];return Math.sqrt(s/Math.max(1,end-start))}
function distance(a,b){let d=0,e=0;for(let i=0;i<a.length;i++){d+=(a[i]-b[i])**2;e+=a[i]**2;}return Math.sqrt(d/Math.max(1e-30,e))}
module.exports={harness,grid,rms,distance,root};
