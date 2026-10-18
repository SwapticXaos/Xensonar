'use strict';
const fs=require('node:fs'),path=require('node:path');
const {harness,grid,root}=require('./emilia3_harness.cjs');
const {wav}=require('./emilia_material_demo.cjs');
const read=n=>fs.readFileSync(path.join(root,'tests/fixtures/weave_v2',n),'utf8');
const previous=harness(root,{'src/nodal/02_synthesis_kernel.js':read('kernel.js'),'src/forge/emilia/03_network_color.js':read('compiler.js'),'src/forge/emilia/01_nodal_carrier.js':read('carrier.js')}),current=harness();
const duration=4*4*60/108,sampleRate=44100,figure=grid(360,768,[]);
for(let x=0;x<figure.width;x++){
 const t=(x+.5)/figure.width*duration;
 const hz=t<2?220:t<4?880:t<6?1760:220;
 const pitches=t>=6?[{hz,gain:.60},{hz:330,gain:.30}]:[{hz,gain:.65}];
 for(const v of pitches){const y=Math.round(figure.height*(1-Math.log(v.hz/20)/Math.log(1000)));figure.data[y*figure.width+x]=v.gain;}
}
const layouts=[{name:'Odd partials',x:.045},{name:'Vowel body',x:.20},{name:'Even partials / hollow body',x:.955}];
for(const h of [previous,current])h.context.xt.getContext=()=>({sampleRate,createBuffer:(channels,length,rate)=>{const data=Array.from({length:channels},()=>new Float32Array(length));return {length,sampleRate:rate,numberOfChannels:channels,getChannelData:i=>data[i],copyToChannel:(a,i)=>data[i].set(a)};}});
(async()=>{
 const arrays=[],recipes=[];
 for(const {api} of [previous,current])for(const layout of layouts){
  const recipe=api.normalized({...api.snapshot().model,nodes:api.snapshot().model.nodes.map((n,i)=>({...n,ratio:1,x:layout.x+[-.01,0,.01][i],y:[.26,.50,.72][i]}))});
  const result=await api.renderCarrier({grid:figure,durationSec:duration,instrument:recipe});arrays.push(result.getChannelData(0));recipes.push(recipe);
 }
 wav(path.join(root,'EMILIA_TIMBRE_BODY_V3_CARRIER_VERGLEICH.wav'),arrays,true);
 fs.writeFileSync(path.join(root,'EMILIA_TIMBRE_BODY_V3_CARRIER_SESSION.json'),JSON.stringify({schema:'xensonar.emilia-carrier-material-comparison',sampleRate,durationPerSection:duration,bpm:108,bars:4,order:['V2 odd','V2 vowel','V2 even','V3 odd','V3 vowel','V3 even'],carrier:{width:figure.width,height:figure.height,data:Array.from(figure.data)},recipes,levelMatch:'Section RMS matched solely for this comparison file; no compression. Live Carrier gain remains unchanged.'}));
 console.log('Saved six sections of the same straight / two-line Carrier; first three V2, then three V3');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
