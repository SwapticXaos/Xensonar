'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {harness,rms,root}=require('./emilia3_harness.cjs');
const fixture=name=>fs.readFileSync(path.join(root,'tests/fixtures',name),'utf8');
const old=harness(root,{'src/nodal/02_synthesis_kernel.js':fixture('reciprocal_v1/kernel.js'),'src/forge/emilia/03_network_color.js':fixture('reciprocal_v1/compiler.js'),'src/forge/emilia/01_nodal_carrier.js':fixture('reciprocal_v1/carrier.js')});
const modern=harness(),base=modern.api.snapshot(),sr=44100,duration=6;
const geometries=[[[.15,.18],[.32,.31],[.42,.12]],[[.58,.18],[.80,.31],[.91,.12]],[[.16,.74],[.49,.88],[.84,.65]],[[.43,.45],[.56,.54],[.49,.64]]];
// Short/long, quiet/strong, glissando, silence and simultaneous Carrier voices.
const carrierEvents=[{start:0,end:.22,hz:196,endHz:196,gain:.64},{start:.42,end:.66,hz:246.94,endHz:246.94,gain:.36},{start:.88,end:1.8,hz:196,endHz:329.63,gain:.62},{start:2.1,end:3.15,hz:293.66,endHz:293.66,gain:.25},{start:3.5,end:5.25,hz:220,endHz:220,gain:.68}];
const track={at(t){const e=carrierEvents.find(e=>t>=e.start&&t<e.end);if(!e)return {hz:220,gain:0};const u=(t-e.start)/(e.end-e.start),envelope=Math.min(1,(t-e.start)/.006,(e.end-t)/.018);return{hz:e.hz*Math.pow(e.endHz/e.hz,u),gain:e.gain*envelope};}};
const chord={at:t=>({hz:330,gain:t>=3.5&&t<5.25?.19*Math.min(1,(t-3.5)/.008,(5.25-t)/.03):0})};
function wav(file,arrays,match){
 const frames=arrays.reduce((n,a)=>n+a.length,0),b=Buffer.alloc(44+frames*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(frames*2,40);let k=44;
 const crest=Math.max(...arrays.map(a=>a.reduce((m,v)=>Math.max(m,Math.abs(v)),0)/Math.max(1e-10,rms(a)))),targetRMS=Math.min(.085,.85/crest);
 for(const a of arrays){const scalar=match?targetRMS/Math.max(1e-10,rms(a)):1;const peak=a.reduce((m,v)=>Math.max(m,Math.abs(v*scalar)),0);if(peak>=1)throw Error('Matched example would clip');for(const x of a){b.writeInt16LE(Math.round(x*scalar*32767),k);k+=2;}}
 fs.writeFileSync(file,b);
}
if(require.main===module)(async()=>{
 const arrays=[],metrics=[];
 for(const [label,{api}] of [['Reciprocal Material v1',old],['Timbre Weave v2',modern]])for(let i=0;i<geometries.length;i++){
  const recipe=api.normalized({...base.model,nodes:base.model.nodes.map((n,j)=>({...n,x:geometries[i][j][0],y:geometries[i][j][1],ratio:1}))});
  const result=await api.renderPCM({instrument:recipe,tracks:[track,chord],durationSec:duration,sampleRate:sr});arrays.push(result.left);
  metrics.push({engine:label,geometry:i+1,startSec:(arrays.length-1)*duration,endSec:arrays.length*duration,rms:rms(result.left),peak:result.left.reduce((m,v)=>Math.max(m,Math.abs(v)),0)});
 }
 wav(path.join(root,'EMILIA_WEAVE_SAME_CARRIER_OLD_NEW.wav'),arrays,true);
 wav(path.join(root,'EMILIA_WEAVE_FOUR_CONSTELLATIONS.wav'),arrays.slice(4),true);
 fs.writeFileSync(path.join(root,'results/weave_listening.json'),JSON.stringify({sampleRate:sr,durationPerSection:duration,levelMatch:'Equal section RMS at a shared target chosen to avoid clipping; no compression',geometries,carrierEvents,metrics},null,2));
 fs.writeFileSync(path.join(root,'EMILIA_WEAVE_LISTENING_SESSION.json'),JSON.stringify({schema:'xensonar.emilia-listening-experiment',version:1,sampleRate:sr,duration,carrierEvents,chord:{start:3.5,end:5.25,hz:330,gain:.19},recipes:geometries.map(xy=>modern.api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({...n,x:xy[i][0],y:xy[i][1],ratio:1}))}))},null,2));
 console.log(JSON.stringify(metrics,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1});

module.exports={sr,duration,base,carrierEvents,track,chord,wav};
