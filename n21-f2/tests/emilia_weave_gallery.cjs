'use strict';
const fs=require('fs'),path=require('path'),{harness,root}=require('./emilia3_harness.cjs');
const {sr,duration,base,carrierEvents,track,chord,wav}=require('./emilia_material_demo.cjs'),{api}=harness();
const positions=[.055,.20,.40,.60,.80,.945].map(x=>[[-.015+x,.25],[x,.48],[x+.015,.72]]);
positions.push([[.24,.22],[.76,.22],[.50,.80]],[[.24,.50],[.76,.50],[.50,.50]]);
const recipes=positions.map(xy=>api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({...n,ratio:1,x:xy[i][0],y:xy[i][1]}))}));
(async()=>{
 const audio=[];
 for(const recipe of recipes){const r=await api.renderPCM({instrument:recipe,tracks:[track,chord],durationSec:duration,sampleRate:sr});audio.push(r.left);}
 wav(path.join(root,'EMILIA_WEAVE_8_STERNBILDER.wav'),audio,true);
 fs.writeFileSync(path.join(root,'EMILIA_WEAVE_GALLERY_SESSION.json'),JSON.stringify({schema:'xensonar.emilia-listening-experiment',version:2,sampleRate:sr,durationPerConstellation:duration,carrierEvents,chord:{start:3.5,end:5.25,hz:330,gain:.19},recipes},null,2));
 console.log('Rendered 8 constellations × the identical six-second Carrier figure; roles, ratios, expression and voices unchanged.');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
