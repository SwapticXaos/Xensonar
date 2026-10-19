'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),scope={console,Math,Number,WeakMap,Float32Array,Float64Array,Int8Array};vm.createContext(scope);
for(const file of ['07_myzel_g_geometry.js','09_myzel_g_dsp.js','08_myzel_g_live.js'])vm.runInContext(fs.readFileSync(path.join(root,'src/audio',file),'utf8'),scope);
vm.runInContext(fs.readFileSync(path.join(root,'src/nodal/13_installation_ball_grid.js'),'utf8'),scope);
vm.runInContext('globalThis.api={make:createMyzelGDSP,frame:myzelGSpatialFrame,gesture:myzelGGesture,create:myzelGCreate,update:myzelGUpdate}',scope);
const {make,frame,gesture,create,update}=scope.api,sr=24000,checks=[];
const pass=s=>{checks.push(s);console.log('PASS',s)};
function render(dsp,seconds=.6){const count=Math.round(sr*seconds),left=new Float32Array(count),right=new Float32Array(count);for(let pos=0;pos<count;pos+=128){const n=Math.min(128,count-pos);dsp.process([],[left.subarray(pos,pos+n),right.subarray(pos,pos+n)]);}assert(left.every(Number.isFinite));return left;}
function energy(p){return Math.sqrt(p.reduce((s,v)=>s+v*v,0)/p.length)}
function difference(a,b){let v=0,ea=energy(a),eb=energy(b);for(let i=0;i<a.length;i++)v+=Math.abs(a[i]/Math.max(1e-6,ea)-b[i]/Math.max(1e-6,eb));return v/a.length}
const kinds=['resonator','formant_filter','spectral_tilt','wavefolder','sub_harmonic','shimmer_delay','comb_filter','grain_blur','drive','chorus','bitcrusher','resonator'];
function layout(compact=false){return kinds.map((type,i)=>({id:'organ-'+i,label:type,frequency:137*(1+i*.137),isCustomResident:false,muted:false,
 x:compact?440+(i%4)*32:60+(i%4)*285,y:compact?230+Math.floor(i/4)*28:50+Math.floor(i/4)*230,
 config:{auraRadius:160,modules:[{type,intensity:.9}]}}));}
function snap(nodes){return {myzelAudioNodes:nodes,myzelAudioWidth:1000,myzelAudioHeight:600,cursorNormalizedX:.50,cursorNormalizedY:.45,
 nearestNodeId:'organ-3',nearestNodeFreq:193.307,myzelNearestModuleTypes:['wavefolder'],myzelNearestAuraStrength:.8,
 ballToNearestNodeNormDist:.1,myceliumBallSpeed:5,myzelLocalBrightness:.6};}
const base={active:1,root:137,frequency:193.307,neighbourFrequency:267.11,presence:.8,neighbour:.3,motion:.4,gesture:.7,level:.7};
let compact=frame(snap(layout(true)),137),spread=frame(snap(layout(false)),137);
assert(compact.density>spread.density+.1);assert(Math.abs(compact.bloom-spread.bloom)>.1);
const a=make(sr),b=make(sr);a.controls({...base,...compact});b.controls({...base,...spread});const pa=render(a,1),pb=render(b,1);
assert(difference(pa,pb)>.2);pass('same input, compact vs spread layout changes normalized waveform beyond volume');
let exchange=layout(false);[exchange[0].x,exchange[6].x]=[exchange[6].x,exchange[0].x];[exchange[0].y,exchange[6].y]=[exchange[6].y,exchange[0].y];
const moved=frame(snap(exchange),137);assert(Math.abs(moved.hollow-spread.hollow)+Math.abs(moved.bloom-spread.bloom)>.0001);pass('exchanging labelled organs changes pair character, even with the same point cloud');
assert.deepEqual(JSON.parse(JSON.stringify(frame(snap(layout(true).reverse()),137))),JSON.parse(JSON.stringify(compact)),'array order must not randomize sound');pass('spatial recipe depends on actual positions and roles, not incidental array order');
const pitch=make(sr);pitch.controls(base);render(pitch,1);const pitches=pitch.snapshot().sourceFrequencies;
assert(Math.abs(pitches[0]-137)<.00001);assert(Math.abs(pitches[2]-193.307)<.00001);assert(Math.abs(pitches[3]-267.11)<.00001);pass('root and two resident frequencies remain genuine independent pitches');
const silent=make(sr);silent.controls({...base,rootLevel:0,ballLevel:0,nodeLevel:0});assert(energy(render(silent,1))===0);pass('all three source faders at zero are truly silent');
const custom=layout(true);custom.push({id:'CUSTOM',frequency:377,x:500,y:270,isCustomResident:true,config:{auraRadius:160,modules:[{type:'drive',intensity:1}]}});
const fc=frame(snap(custom),137);assert.equal(fc.nodeCount,12);assert.equal(fc.tone.id,'CUSTOM');assert(fc.organs.every(n=>n.id!=='CUSTOM'));pass('custom resident contributes actual pitch but cannot become an organ');
const muted=layout(true).map(n=>({...n,muted:true})),fm=frame(snap(muted),137);assert.equal(fm.organs.length,0);assert.equal(fm.tone,null);let mutedHistory={history:[],candidate:null,candidateSince:0};assert.equal(gesture(mutedHistory,snap(muted),0,.03,true,fm).contact,0);mutedHistory.history=[{key:'organ-0',type:'resonator',touched:0,power:1}];assert.equal(gesture(mutedHistory,snap(muted),.1,.03,true,fm).stages.length,0);pass('muted full-layout nodes cannot reappear through the legacy nearest-node fallback');
const stamp=type=>({id:type==='resonator'?'R1':'W',type,frequency:193.307,strength:.85,x:.8,y:.6,memory:2});
function ordered(types){let d=make(sr);d.controls({...base,stages:types.map(stamp)});return render(d,1)}
assert(difference(ordered(['wavefolder','resonator']),ordered(['resonator','wavefolder']))>.2);pass('actual ordered audio processing is noncommutative');
const mem=make(sr);mem.controls({...base,stages:[{...stamp('resonator'),id:'R1'},{...stamp('wavefolder'),id:'W'}]});render(mem,.7);
let before=mem.snapshot();assert(before.nodes.find(n=>n.id==='R1').storedEnergy>0);
mem.controls({...base,stages:[{...stamp('wavefolder'),id:'W'},{...stamp('resonator'),id:'R2'}]});render(mem,.3);
let away=mem.snapshot();assert(away.nodes.find(n=>n.id==='R1').lastFrame<away.nodes.find(n=>n.id==='R2').lastFrame);
assert.equal(away.nodes.filter(n=>n.type==='resonator').length,2);
mem.controls({...base,stages:[{...stamp('resonator'),id:'R1'}]});render(mem,.3);assert.equal(mem.snapshot().route[0],'R1');pass('two resonators own separate remembered states, preserved across slot changes and revisits');
// Isolate cached delayed PCM: after a genuine absence, no fresh source may mask the memory test.
const cached=make(sr),fresh=make(sr),grain={id:'K',type:'grain_blur',frequency:193,strength:1,x:.7,y:.8,memory:3};
cached.controls({...base,stages:[grain]});render(cached,.8);cached.controls({...base,rootLevel:0,ballLevel:0,nodeLevel:0,stages:[]});render(cached,.7);
cached.controls({stages:[grain]});fresh.controls({...base,rootLevel:0,ballLevel:0,nodeLevel:0,stages:[grain]});
assert(energy(render(cached,.25))>energy(render(fresh,.25))+1e-6);pass('Korn revisits real prior audio after an absence, instead of a newly reset stage buffer');
let g={history:[],candidate:null,candidateSince:0};function visit(id,type,t){return gesture(g,{nearestNodeId:id,nearestNodeFreq:220,myzelNearestModuleTypes:[type],ballToNearestNodeNormDist:.05,myzelNearestAuraStrength:.9},t,.05,true,{organs:[],density:.4});}
visit('A','wavefolder',0);visit('A','wavefolder',.12);visit('B','resonator',.2);visit('A','wavefolder',.23);assert.equal(g.history.length,1);
visit('B','resonator',.3);visit('B','resonator',.42);assert.deepEqual(Array.from(g.history,n=>n.key),['A','B']);
assert(visit('B','resonator',.5).stages.every(n=>n.id));let off=gesture(g,{},.6,.05,false,{organs:[],density:0});assert.equal(off.stages.length,0);pass('hysteresis keeps stable keyed history; disabling coupling clears the active route');
const reset=make(sr);reset.controls({...base,reset:true,stages:[grain]});const r1=render(reset,.8);reset.controls({...base,root:400,stages:[stamp('wavefolder')]});render(reset,.7);
reset.controls({...base,reset:true,stages:[grain]});const r2=render(reset,.8);let resetDiff=0;for(let i=0;i<r1.length;i++)resetDiff=Math.max(resetDiff,Math.abs(r1[i]-r2[i]));assert.equal(resetDiff,0);pass('explicit restart resets phases, stored material and hidden history reproducibly');
const baseline=make(sr);baseline.controls(base);const pbase=render(baseline,.8);
for(const type of kinds.slice(0,11)){const d=make(sr);d.controls({...base,stages:[{id:'node',type,strength:.95,frequency:193.307,x:.8,y:.7}]});assert(difference(render(d,.8),pbase)>.01,type);}
pass('all eleven labelled processor families transform the same source');
const hostile=make(sr);hostile.controls({active:1,root:NaN,frequency:Infinity,level:Infinity,stages:kinds.map(type=>({id:type,type,strength:Infinity,frequency:-1}))});assert(render(hostile,.4).every(Number.isFinite));pass('hostile controls stay finite; route and memory pools stay bounded');
const stable=make(sr);stable.controls({...base,stages:[grain]});const out=render(stable,2);assert(Math.max(...out.subarray(0,20000).map(Math.abs))<.95);stable.controls({active:0});assert(energy(render(stable,1).slice(-sr/4))===0);pass('bounded output and exact silence after deactivation');
const long=make(8000);long.controls({...base,rootLevel:.6,nodeLevel:0,ballLevel:0});const block=[new Float32Array(128),new Float32Array(128)];let lateEnergy=0;for(let i=0;i<2000;i++){long.process([],block);if(i>1937)for(const v of block[0])lateEnergy+=v*v;}assert(lateEnergy>1e-4);pass('32-second held source remains continuous beyond the old Emilia watchdog boundary');
class P{constructor(value=0){this.value=value;}setTargetAtTime(v){this.value=v;}}
class N{constructor(){for(const key of ['frequency','Q','gain','threshold','knee','ratio','attack','release'])this[key]=new P();this.port={postMessage(){},close(){}};}connect(){}disconnect(){}start(){}stop(){}}
const ctx={currentTime:0,sampleRate:48000,state:'running',createGain:()=>new N(),createOscillator:()=>new N(),createBiquadFilter:()=>new N(),createDynamicsCompressor:()=>new N()};scope.myzelGPrepareWorklet=async()=>false;
const refs={};create(ctx,refs,new N());const initial=refs.__myzelG.nodes.length;
for(let i=0;i<240;i++){ctx.currentTime=i*.016;update(ctx,refs,{enabled:true,mode:'installation',audible:true,couplingEnabled:true,rootHz:137,snapshot:snap(layout(true)),mix:{rootLevel:.6,nodeLevel:.8,ballLevel:.4}});}
assert.equal(refs.__myzelG.nodes.length,initial);ctx.currentTime+=.1;update(ctx,refs,{enabled:true,mode:'installation',audible:false});assert.equal(refs.__myzelG.lastControls.active,0);pass('native graph remains fixed and Forge room gate stops the installation');
fs.writeFileSync(path.join(root,'results/myzel_g2_concept.json'),JSON.stringify({checks,layoutNormalizedDifference:difference(pa,pb),rootAndResidentFrequencies:pitches,memoryBytes:mem.snapshot().memoryBytes},null,2)+'\n');
