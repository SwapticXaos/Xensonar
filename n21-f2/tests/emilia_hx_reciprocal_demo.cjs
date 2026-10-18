'use strict';
const fs=require('node:fs'),path=require('node:path');
const {harness,grid,root}=require('./emilia3_harness.cjs');
const {wav}=require('./emilia_material_demo.cjs');
const read=n=>fs.readFileSync(path.join(root,'tests/fixtures/timbre_body_v3',n),'utf8');
const previous=harness(root,{'src/nodal/02_synthesis_kernel.js':read('kernel.js'),'src/forge/emilia/03_network_color.js':read('compiler.js'),'src/forge/emilia/01_nodal_carrier.js':read('carrier.js')}),current=harness();
const duration=4*4*60/108,sampleRate=44100,figure=grid(360,768,[]);
for(let x=0;x<figure.width;x++){
 const t=(x+.5)/figure.width*duration;
 const hz=t<2?220:t<4?880:t<6?1760:220;
 const pitches=t>=6?[{hz,gain:.60},{hz:330,gain:.30}]:[{hz,gain:.65}];
 for(const v of pitches){const y=Math.round(figure.height*(1-Math.log(v.hz/20)/Math.log(1000)));figure.data[y*figure.width+x]=v.gain;}
}
const layouts=[{name:'Odd HX / restrained folding',x:.055},{name:'Natural-to-prime HX',x:.32},{name:'Prime-to-inharmonic HX',x:.64},{name:'Inharmonic-to-Fibonacci HX / strong folding',x:.94}];
for(const h of [previous,current])h.context.xt.getContext=()=>({sampleRate,createBuffer:(channels,length,rate)=>{const data=Array.from({length:channels},()=>new Float32Array(length));return {length,sampleRate:rate,numberOfChannels:channels,getChannelData:i=>data[i],copyToChannel:(a,i)=>data[i].set(a)};}});
(async()=>{
 const arrays=[],recipes=[];
 for(const {api} of [previous,current])for(const layout of layouts){
  const recipe=api.normalized({...api.snapshot().model,nodes:api.snapshot().model.nodes.map((n,i)=>({...n,ratio:1,x:layout.x+[-.01,0,.01][i],y:[.26,.50,.72][i]}))});
  const result=await api.renderCarrier({grid:figure,durationSec:duration,instrument:recipe});arrays.push(result.getChannelData(0));recipes.push(recipe);
 }
 wav(path.join(root,'EMILIA_HX_V3_V4_VERGLEICH.wav'),arrays,true);
 fs.writeFileSync(path.join(root,'EMILIA_HX_RECIPROCAL_V4_SESSION.json'),JSON.stringify({schema:'xensonar.emilia-carrier-material-comparison',sampleRate,durationPerSection:duration,bpm:108,bars:4,order:layouts.map(l=>'V3 '+l.name).concat(layouts.map(l=>'V4 '+l.name)),carrier:{width:figure.width,height:figure.height,data:Array.from(figure.data)},recipes,levelMatch:'Section RMS matched solely for this comparison file; no compression. Live Carrier gain remains unchanged.'}));
 wav(path.join(root,'EMILIA_HX_RECIPROCAL_V4_VIER_STERNBILDER.wav'),arrays.slice(4),true);
 console.log('Saved four V4 constellations and V3/V4 comparison on the identical painted Carrier');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
