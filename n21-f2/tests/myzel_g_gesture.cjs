'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const scope={Math,Number,Object,Array,console,Promise};vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root,'src/audio/08_myzel_g_live.js'),'utf8')+';globalThis.G={gesture:myzelGGesture,create:myzelGCreate,update:myzelGUpdate};',scope);
const {gesture,create,update}=scope.G;
function snapshot(id,type,custom=false){return{nearestNodeId:id,nearestNodeLabel:type,nearestNodeFreq:330,myzelNearestIsCustomResident:custom,
  myzelNearestModuleTypes:[type],ballToNearestNodeNormDist:.09,myzelNearestAuraStrength:.9,nearestNodeEnergy:.5,
  myzelLocalBody:.7,myzelLocalBrightness:.5,myzelRelationTension:.2,cursorNormalizedX:.45,myceliumBallSpeed:3};}
let g={history:[],candidate:null,candidateSince:0},contact;const visit=(id,type,t,custom=false)=>gesture(g,snapshot(id,type,custom),t,.05,true);
visit('A','wavefolder',0);visit('A','wavefolder',.11);
assert.equal(g.history.length,1);
visit('B','resonator',.20);visit('A','wavefolder',.22);assert.equal(g.history.length,1,'boundary jitter cannot reorder history');
visit('B','resonator',.31);visit('B','resonator',.41);
assert.deepEqual(Array.from(g.history,e=>e.type),['wavefolder','resonator']);
visit('C','comb_filter',.5);visit('C','comb_filter',.61);
let result=visit('C','comb_filter',.64);assert.deepEqual(Array.from(result.stages,e=>e.type),['wavefolder','resonator','comb_filter']);
visit('D','formant_filter',.72);result=visit('D','formant_filter',.83);
assert.deepEqual(Array.from(result.stages,e=>e.type),['resonator','comb_filter','formant_filter']);
result=visit('CUSTOM','drive',.95,true);assert.equal(g.history.length,3,'custom residents may not become effects');
result=gesture(g,snapshot('CUSTOM','drive',true),9,.05,true);
assert.equal(result.stages.length,0,'old organs decay instead of accumulating forever');
console.log('PASS ordered temporal history, boundary hysteresis, 3-stage limit, custom exclusion, finite memory');
class P{constructor(value=0){this.value=value;}setTargetAtTime(value){this.value=value;}}
class N{constructor(){this.frequency=new P();this.Q=new P();this.gain=new P();this.threshold=new P();this.knee=new P();this.ratio=new P();this.attack=new P();this.release=new P();this.port={postMessage:()=>{},close:()=>{}};}connect(){}disconnect(){}start(){this.started=true;}stop(){this.started=false;}}
const ctx={currentTime:0,sampleRate:48000,state:'running',createGain:()=>new N(),createOscillator:()=>new N(),
  createBiquadFilter:()=>new N(),createDynamicsCompressor:()=>new N()};scope.myzelGPrepareWorklet=async()=>false;
const refs={};create(ctx,refs,new N());const initial=refs.__myzelG.nodes.length;assert(initial>0);
for(let i=0;i<260;i++){ctx.currentTime=i*.016;update(ctx,refs,{enabled:true,mode:'installation',couplingEnabled:true,rootHz:147,
  snapshot:snapshot(i%60<30?'A':'B',i%60<30?'wavefolder':'resonator'),mix:{rootLevel:.7,ballLevel:.4,nodeLevel:.9}});}
assert.equal(refs.__myzelG.nodes.length,initial,'no AudioNode added by rAF ball updates');
assert(refs.__myzelG.lastControls.stages.length<=3);assert(refs.__myzelG.lastControls.level>0);
ctx.currentTime+=.1;update(ctx,refs,{enabled:false,mode:'installation'});assert.equal(refs.__myzelG.lastControls.active,0);
refs.__myzelG.dispose();assert(refs.__myzelG.disposed);
console.log('PASS native graph is fixed; controls, master route, pause and cleanup are wired');
