'use strict';
// Executable behavioral regression harness against the ACTUAL P7 grid/Space implementation.
// No fake implementation of the grid algorithm. Only external tuning/library/browser dependencies are stubbed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sourceRoot = path.resolve(process.argv[2] || path.join(__dirname,'../../../codex_patch_handoff_work/replay_from_delivery/n21-f2'));
const sourceFile=path.join(sourceRoot,'src/handoff/00_chat_feature_addons.js');
const source=fs.readFileSync(sourceFile,'utf8');
const end=source.indexOf('function __XenBassGridRuntime(');
assert(end>0,'Expected grid compiler and keyboard detach prior to UI runtime');
const persisted=new Map();
const library=new Map([["12edo",12],["9edo",9],["17edo",17],["5edo",5]]);
const listeners=new Map();
const win={addEventListener:(n,fn)=>listeners.set('window:'+n,fn),__xenBassGridDebug:null};
const doc={hidden:false,addEventListener:(n,fn)=>listeners.set('document:'+n,fn)};
const ctx={
  window:win,document:doc,
  localStorage:{getItem:k=>persisted.get(k)||null,setItem:(k,v)=>persisted.set(k,v)},
  Kp:id=>{const n=library.get(id);return n?Array.from({length:n},(_,i)=>1200*i/n):[]},
  vF:id=>1200,
  Au:(mode,tuning)=>Array.from({length:library.get(tuning)||0},()=>true),
  sj:()=>[...library.keys()].map(id=>({id,label:id})),
  xp:()=>['12edo','9edo'],
  console,Set,Map,Float64Array,Math,Number,Array,Object,JSON,
};
vm.createContext(ctx);
vm.runInContext(source.slice(0,end)+'\n;globalThis.testBindings={grid:__XenBassGrid,detach:__xenKeyboardFoundationDetach,afterGesture:__xenKeyboardFoundationReleaseAfterNextGesture,interval:__XenBassGridInterval};',ctx,{timeout:2000});
const {grid,detach,afterGesture,interval}=ctx.testBindings;
let n=0;
function test(name,run){run();console.log('PASS',name);n++}
const near=(a,b,eps=1e-8)=>assert(Math.abs(a-b)<eps,`Expected ${a} ≈ ${b}`);
const base={gridTuning:'12edo',gridBase:55,gridMode:'chromatic',manualGridMutedSteps:[],manualGridStepOffsets:[]};
function asArray(config){return JSON.parse(JSON.stringify(config))}
test('Default Main Grid preserves incoming Bass/Drone/RFL frequencies',()=>{
 grid.prepare(base);near(grid.quantize(60),60);near(grid.quantizeDrone(60),60);near(grid.quantizeRFL(60),60);
});
test('Derived grid restricts degrees and performs nearest pitch mapping',()=>{
 grid.set('12edo',{sourceMode:'derived',mutedDegrees:[1,2,3,4,5,6,8,9,11],offsetsCents:{}});
 grid.setSource('bass');grid.prepare(base);
 near(grid.quantize(60),55); // root is closer than fifth or b7
 near(grid.quantize(82.4069),55*Math.pow(2,700/1200),0.05);
});
test('Bass/Drone/RFL grid-routing switches are independent',()=>{
 grid.set('12edo',{droneEnabled:false,rflEnabled:true});grid.prepare(base);
 near(grid.quantizeDrone(60),60);near(grid.quantizeRFL(60),55);
 grid.set('12edo',{droneEnabled:true,rflEnabled:false});grid.prepare(base);
 near(grid.quantizeDrone(60),55);near(grid.quantizeRFL(60),60);
});
test('A linked nine-EDO tuning is not folded back into main 12-EDO',()=>{
 grid.set('12edo',{sourceMode:'linked',linkedTuningId:'9edo',linkedMutedDegrees:[1,2,3,4,5,6,7]});
 grid.prepare(base);
 near(grid.quantize(60),55);
 near(grid.quantize(100),55*Math.pow(2,8*1200/9/1200),0.2);
});
test('Linked grid has no duplicate cents offset layer',()=>{
 const exported=grid.exportAll()['12edo'];assert.equal(exported.sourceMode,'linked');
 const c=grid.effectiveCents('12edo',8);near(c,8*1200/9);
});
test('Linked grid does NOT recompile when only main scale/mutes/offsets change',()=>{
 grid.prepare(base);const before=win.__xenBassGridDebug.compileCount();
 grid.prepare({...base,gridMode:'phrygian',manualGridMutedSteps:[2,4,6],manualGridStepOffsets:[17,-3]});
 assert.equal(win.__xenBassGridDebug.compileCount(),before);
});
test('Changing the linked degree exclusions recomputes once',()=>{
 const before=win.__xenBassGridDebug.compileCount();
 grid.set('12edo',{linkedMutedDegrees:[1,2,3,4,5,6,7,8]});
 assert.equal(win.__xenBassGridDebug.compileCount(),before+1);
});
test('Deleted linked tuning is visible, and never silently maps to 12-EDO',()=>{
 library.delete('9edo');grid.refreshLibrary();
 assert.equal(grid.status().missing,true);
 near(grid.quantize(60),60);near(grid.quantizeDrone(60),60);
 library.set('9edo',9);grid.refreshLibrary();assert.equal(grid.status().missing,false);
});
test('All-muted Bass Grid drops Bass notes rather than generating replacements',()=>{
 grid.set('12edo',{sourceMode:'linked',linkedTuningId:'5edo',linkedMutedDegrees:[0,1,2,3,4]});
 grid.prepare(base);assert(Number.isNaN(grid.quantize(60)));
});
test('When all steps muted, Drone and RFL do not emit an invalid pitch',()=>{
 assert.equal(grid.quantizeDrone(60),60);
 near(grid.quantizeRFL(60),60);
});
test('Preview degrees ascend and stay within one period',()=>{
 grid.set('12edo',{sourceMode:'derived',mutedDegrees:[],offsetsCents:{}});
 grid.prepare(base);
 const samples=Array.from({length:12},(_,i)=>grid.frequencyForDegree('12edo',i));
 assert(samples.every(Number.isFinite));
 for(let i=1;i<samples.length;i++)assert(samples[i]>samples[i-1]);
 assert(samples[11]<samples[0]*2);
});
test('Fifth interval has an English ~5th / 5th orientation label',()=>{
 const v=interval(700);assert(v.label.includes('5th'));assert.equal(v.fifth,true);
 assert.equal(interval(455).label,'');
});
test('Foundation detaches on Space and holds identical root before and after keyup',()=>{
 detach.press(55,.4);assert.equal(detach.freezeActive(),true);near(detach.rootHz(),55);
 detach.release();assert.equal(detach.freezeActive(),true);assert.equal(detach.hasPendingRelease(),true);near(detach.rootHz(),55);
});
test('No keyup catch-up; only next intentional gesture reattaches foundation',()=>{
 afterGesture(false);assert.equal(detach.freezeActive(),true);
 afterGesture(true);assert.equal(detach.freezeActive(),false);assert.equal(detach.rootHz(),null);
});
test('Window blur resets latched Space state',()=>{
 detach.press(64.16,.2);
 listeners.get('window:blur')();
 assert.equal(detach.freezeActive(),false);
});
test('Visibility hidden resets held foundation and prevents stuck modifier',()=>{
 detach.press(82.4,.9);doc.hidden=true;listeners.get('document:visibilitychange')();
 assert.equal(detach.freezeActive(),false);doc.hidden=false;
});
test('Stored grid extension survives export/import with no duplicate tuning payload',()=>{
 grid.set('12edo',{sourceMode:'linked',linkedTuningId:'17edo',linkedMutedDegrees:[1,2]});
 const ex=grid.exportAll();
 grid.importExtensions({'12edo':{sourceMode:'derived',mutedDegrees:[2]}},{},'replace');
 assert.equal(grid.read('12edo').sourceMode,'derived');
 grid.importExtensions(ex,{},'replace');
 assert.equal(grid.read('12edo').linkedTuningId,'17edo');
 assert.equal(grid.read('12edo').sourceMode,'linked');
 assert.equal(grid.read('12edo').linkedMutedDegrees.join(','),'1,2');
});
console.log(`PASS ${n} P7 runtime-derived-grid/keyboard-foundation behavior checks`);

// Review regression: non-octave tunings must audition the same pitch lattice.
library.set('tritave',13);ctx.vF=id=>id==='tritave'?1200*Math.log2(3):1200;
ctx.Kp=id=>Array.from({length:library.get(id)||0},(_,i)=>ctx.vF(id)*i/library.get(id));
grid.setSource('bass');grid.prepare({...base,gridTuning:'tritave',gridBase:440});
const tri=grid.frequencyForDegree('tritave',0);near(tri,440/9);near(grid.quantize(tri),tri);
console.log('PASS non-octave preview uses the actual tuning period and compiled note table');
