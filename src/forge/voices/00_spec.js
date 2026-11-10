/* Forge Voices · G/H/I listening modes (Gaia, Hildegard, Isolde).
   This file is the single owner of their parameter ranges, defaults and presets.
   It is plain data: no audio, no DOM, no storage. The DSP lives in the lazy Forge chunk. */
function createForgeVoiceSpec(){
 const P=(min,max,def,step=.01)=>({min,max,def,step});
 // Shared by all three: envelope, stereo and the loop-aware room.
 const common={attack:P(.002,.6,.012,.001),release:P(.02,6,.35,.01),width:P(0,1,.7),space:P(0,1,.22),size:P(0,1,.45),tailWrap:P(0,1,1,1),level:P(.1,1.5,1)};
 const engines={
  gaia:{machineId:'gaia-terrain-carrier',label:'Gaia',title:'Gaia · Terrain Orbit',glyph:'◍',
   summary:'The drawing is a landscape. Every note circles its own surroundings and sounds what it finds there.',
   params:{...common,reachPitch:P(.25,24,5,.05),reachTime:P(0,.6,.06,.005),lift:P(-1.5,1.5,.8),lobes:P(1,7,1,1),relief:P(0,1,.4),
    drift:P(0,1,.25),dynamics:P(0,1,.5),anchor:P(0,1,.35),richness:P(8,64,40,1)},
   presets:[
    {id:'glass-ridge',name:'Glass Ridge',params:{reachPitch:3.5,reachTime:.03,lift:.9,lobes:1,relief:.3,drift:.15,dynamics:.4,anchor:.45,richness:36,space:.3,size:.55,width:.8}},
    {id:'canyon',name:'Canyon Choir',params:{reachPitch:12,reachTime:.14,lift:.35,lobes:2,relief:.55,drift:.4,dynamics:.6,anchor:.3,richness:48,space:.38,size:.7,width:.9,attack:.04,release:.9}},
    {id:'needle',name:'Needle Path',params:{reachPitch:1.2,reachTime:.012,lift:1,lobes:3,relief:.1,drift:.05,dynamics:.7,anchor:.8,richness:64,space:.12,size:.3,width:.5,attack:.003,release:.12}},
    {id:'tide',name:'Tide Organ',params:{reachPitch:7,reachTime:.3,lift:0,lobes:1,relief:.8,drift:.7,dynamics:.3,anchor:.6,richness:24,space:.45,size:.85,width:1,attack:.12,release:1.6}},
    {id:'fold',name:'Fold Engine',params:{reachPitch:19,reachTime:.05,lift:-.6,lobes:5,relief:.2,drift:.55,dynamics:.8,anchor:.9,richness:64,space:.18,size:.4,width:.75}}]},
  hildegard:{machineId:'hildegard-mirror-carrier',label:'Hildegard',title:'Hildegard · Mirror Spectrum',glyph:'♁',
   summary:'The intervals of the figure become the overtones of every note. Any tuning gets a timbre made for it.',
   params:{...common,mirror:P(0,1,1),partials:P(4,32,20,1),tilt:P(0,1,.5),bow:P(0,1,.25),decay:P(.08,12,2.2,.01),hardness:P(0,1,.55),
    dynamics:P(0,1,.5),halo:P(0,1,.35),haloDecay:P(.3,10,3,.05),shimmer:P(0,1,.3),equave:P(1.1,4,2,.0001)},
   presets:[
    {id:'bell-garden',name:'Bell Garden',params:{mirror:1,partials:20,tilt:.55,bow:.05,decay:3.4,hardness:.7,dynamics:.5,halo:.45,haloDecay:4.5,shimmer:.35,space:.3,size:.6,attack:.003,release:1.8}},
    {id:'bowed-glass',name:'Bowed Glass',params:{mirror:1,partials:16,tilt:.4,bow:1,decay:2,hardness:.3,dynamics:.7,halo:.5,haloDecay:6,shimmer:.5,attack:.09,release:.8,space:.35,size:.7,width:.9}},
    {id:'marimba',name:'Tuned Wood',params:{mirror:.85,partials:10,tilt:.75,bow:0,decay:.7,hardness:.45,dynamics:.6,halo:.2,haloDecay:1.5,shimmer:.1,space:.15,size:.3,attack:.003,release:.4}},
    {id:'sympathy',name:'Sympathetic Strings',params:{mirror:.6,partials:28,tilt:.35,bow:.3,decay:4,hardness:.85,dynamics:.45,halo:.9,haloDecay:8,shimmer:.25,space:.25,size:.5,width:1,attack:.004,release:2.5}},
    {id:'pure-harmonic',name:'Harmonic Reference',params:{mirror:0,partials:24,tilt:.5,bow:.6,decay:2.5,hardness:.5,dynamics:.5,halo:0,shimmer:0,space:.1,size:.3}}]},
  isolde:{machineId:'isolde-spiral-carrier',label:'Isolde',title:'Isolde · Endless Spiral',glyph:'꩜',
   summary:'A self-similar tone: the same sound in every register. Lines can rise forever, and the rhythm repeats at every scale.',
   params:{...common,equave:P(1.1,4,2,.0001),density:P(1,4,1,1),body:P(1,4,1,1),center:P(120,2400,520,1),span:P(1.5,7,4.5,.05),
    spiral:P(-12,12,0,1),pulse:P(0,1,0),pulseRate:P(1,32,4,.0001),pulseRatio:P(1,4,2,.0001),sharp:P(0,1,.4),swirl:P(0,1,.6)},
   presets:[
    {id:'shepard',name:'Endless Stair',params:{equave:2,density:1,body:1,center:520,span:5,spiral:0,pulse:0,swirl:.5,space:.25,size:.5}},
    {id:'risset-rise',name:'Rising Forever',params:{equave:2,density:1,body:2,center:440,span:5.5,spiral:2,pulse:0,swirl:.9,space:.4,size:.75,attack:.08,release:1.2,width:1}},
    {id:'pulse-fractal',name:'Fractal Pulse',params:{equave:2,density:1,body:1,center:600,span:5,spiral:0,pulse:.85,pulseRate:2,pulseRatio:2,sharp:.6,swirl:.7,space:.2,size:.4}},
    {id:'tritave',name:'Tritave Glass',params:{equave:3,density:2,body:1,center:700,span:6,spiral:0,pulse:.35,pulseRate:3,pulseRatio:3,sharp:.3,swirl:.6,space:.35,size:.65}},
    {id:'golden',name:'Golden Swarm',params:{equave:1.6180339887,density:1,body:1,center:480,span:5.5,spiral:-3,pulse:.6,pulseRate:5,pulseRatio:1.5,sharp:.5,swirl:1,space:.3,size:.6,width:1}}]}};
 const ids=Object.keys(engines),byMachine=Object.fromEntries(ids.map(id=>[engines[id].machineId,id]));
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function params(engine,input={}){
  const spec=engines[engine];if(!spec)throw Error('Unknown Forge voice: '+engine);
  const out={};for(const [key,p] of Object.entries(spec.params)){let v=Number(input?.[key]);if(!Number.isFinite(v))v=p.def;v=clamp(v,p.min,p.max);if(p.step===1)v=Math.round(v);out[key]=v}
  return out;
 }
 function recipe(engine,input){
  if(input&&input.schema!=null&&input.schema!=='xensonar.forge-voice')throw Error('This is not a Forge voice recipe');
  if(input&&input.version!=null&&input.version!==1)throw Error('Unsupported Forge voice recipe version');
  if(input&&input.engine!=null&&input.engine!==engine)throw Error('Recipe belongs to another listening mode');
  const preset=typeof input?.preset==='string'&&engines[engine]?.presets.some(p=>p.id===input.preset)?input.preset:null;
  return Object.freeze({schema:'xensonar.forge-voice',version:1,engine,preset,params:Object.freeze(params(engine,input?.params))});
 }
 const preset=(engine,id)=>{const p=engines[engine]?.presets.find(x=>x.id===id);if(!p)throw Error('Unknown preset');return recipe(engine,{preset:id,params:p.params})};
 return Object.freeze({engines,ids,byMachine,params,recipe,preset,engineOf:machineId=>byMachine[machineId]??null});
}
if(typeof module!=='undefined'&&module.exports)module.exports=createForgeVoiceSpec;
