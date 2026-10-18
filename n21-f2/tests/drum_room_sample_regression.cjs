/* Regression: both Drum Machine layouts must represent the same 9-lane sample-aware beat. */
const fs=require('node:fs');const vm=require('node:vm');const assert=require('node:assert/strict');
const sampleLanes=['sample1','sample2','sample3'];
const label={kick:'Kick',snare:'Snare',hatClosed:'Hat C',hatOpen:'Hat O',clap:'Clap',perc:'Perc',sample1:'Sample A',sample2:'Sample B',sample3:'Sample C'};
const palette={kick:'#38bdf8',snare:'#f472b6',hatClosed:'#f59e0b',hatOpen:'#fbbf24',clap:'#c084fc',perc:'#38bdf8',sample1:'#2dd4bf',sample2:'#14b8a6',sample3:'#0d9488'};
const base='src/forge_and_melodic/05_preview_and_sample_intake.js';
const code=fs.readFileSync(base,'utf8');
const start=code.indexOf('function b7e('),end=code.indexOf('const y7e=',start);
assert(start>=0&&end>start,'large-room component must exist');
const jsx=(type,props)=>({type,props:props||{}});const u={jsx,jsxs:jsx};
const ctx={u,__f52DrumLaneNames:label,__f52DrumLaneColors:palette,__f52FullDrumSampleInspector:function SampleEditor(){},__f52FullDrumHitInspector:function HitEditor(){},p7e:function Navigator(){},g7e:['kick','snare','hatClosed','hatOpen','clap','perc'],wM:label,RM:palette,__f52SampleLanes:sampleLanes,P:{useState(v){return [v,()=>{}]},useEffect(){}},__mlSharedDrumMachine:{snapshot:{pattern:'broken_lilt',kit:'standard'},canUndo:()=>false,canRedo:()=>false,liveEdit:{grid:{bars:1,segmentsPerBar:16,stepCount:16,laneOrder:[...Object.keys(label)],laneSteps:{},sampleSlots:{}}}}};
vm.runInNewContext(code.slice(start,end),ctx,{filename:base});
const props={selectedLaneId:'sample1',laneSettings:{kick:{level:1,decay:1,pan:0,chokeGroup:'none'}},laneKitOverrides:{},drumPatternOptions:[],drumKitOptions:[],barsValue:1,segmentsPerBarValue:16,hitCount:1,stepCount:16,viewport:{},visiblePercent:100,drumCanvasWidth:1180};
function flatten(node){if(Array.isArray(node))return node.flatMap(flatten);if(!node||typeof node!=='object')return [node];return [node,...flatten(node.props?.children)];}
const rendered=ctx.b7e(props);const text=flatten(rendered).filter(v=>typeof v==='string').join(' | ');
for(const value of ['Sample A','Sample B','Sample C'])assert(text.includes(value),`${value} visible in large-room lane selector`);
assert(flatten(rendered).some(v=>v?.type===ctx.__f52FullDrumHitInspector),'full room must expose shared per-hit settings');
assert(flatten(rendered).some(v=>v?.type==='__f52FullDrumSampleInspector'||v?.type===ctx.__f52FullDrumSampleInspector),'sample slot editor must be available in large room');
const logic=fs.readFileSync('src/forge_and_melodic/07_tuning_and_logic_view.js','utf8');
const ix=logic.indexOf('function IQe('),fin=logic.indexOf('function EQe(',ix);
const ctx2={__f52NormalizeSampleSlots:(x)=>x};vm.runInNewContext(logic.slice(ix,fin),ctx2);
const saved=ctx2.IQe({bars:1,segmentsPerBar:16,segmentMarkers:[],stepCount:16,laneOrder:['sample1'],laneSteps:{sample1:Array(16).fill(0)},stepPrograms:{sample1:{}},sampleSlots:{sample1:{id:'123',name:'Kick WAV'}}},'broken_lilt');
assert.equal(saved.sampleSlots.sample1.id,'123','large room Save As preserves sample reference');
const diagnostic=fs.readFileSync('src/app/forge/01_room_shell.js','utf8');
assert(diagnostic.includes('__f356ShowRuntimeDiagnosis()'),'C11 HUD must be opt-in');
console.log('PASS full-room sample lanes, inspector, persistence, diagnostics opt-in');

// Run the actual full-room raw-sample inspector with a minimal React JSX stub.
const compact=fs.readFileSync('src/rhythm/01_compact_drum_grid.js','utf8');
const p0=compact.indexOf('function __f52CommitSharedDrumGrid('),p1=compact.indexOf('function __mlCompactDrumGrid(',p0);
const drum={snapshot:{pattern:'broken_lilt',kit:'standard'},liveEdit:{grid:{bars:1,segmentsPerBar:16,stepCount:16,useCustom:true,laneOrder:[...Object.keys(label)],sampleSlots:{sample1:{id:'old',name:'Old',volume:1,pan:0}}}},setLiveEdit(next){this.liveEdit=next;}};
const normalizeGrid=(grid)=>({ ...grid, laneOrder:[...(grid.laneOrder||[])], sampleSlots:{sample1:{id:'',name:'',volume:1,pan:0},sample2:{id:'',name:'',volume:1,pan:0},sample3:{id:'',name:'',volume:1,pan:0},...structuredClone(grid.sampleSlots||{})}});
const ctx3={u,P:{useState(v){return [v,()=>{}]},useEffect(){}},window:{addEventListener(){},removeEventListener(){}},__f52DrumLaneNames:label,__f52DrumLaneColors:palette,__mlSharedDrumMachine:drum,__f52EnsureDrumGrid:normalizeGrid,__mlGridFromSelection:()=>drum.liveEdit.grid,gs:async()=>[],__f351DrumSource:()=>'',__f52ImportDrumSample:async()=>{}};
vm.runInNewContext(compact.slice(p0,p1),ctx3);
let editor=ctx3.__f52FullDrumSampleInspector({lane:'sample1'});
const range=flatten(editor).find(node=>node?.type==='input'&&node?.props?.['aria-label']==='Sample A volume');
assert(range,'large-room Sample A gain control');range.props.onChange({target:{value:'1.42'}});
assert.equal(drum.liveEdit.grid.sampleSlots.sample1.volume,1.42,'gain updates shared beat (not local UI shadow)');
assert.equal(drum.liveEdit.grid.sampleSlots.sample1.id,'old','gain preserves sample link');
editor=ctx3.__f52FullDrumSampleInspector({lane:'sample1'});
const pan=flatten(editor).find(node=>node?.type==='input'&&node?.props?.['aria-label']==='Sample A pan');
assert(pan,'large-room pan control');pan.props.onChange({target:{value:'-0.4'}});
assert.equal(drum.liveEdit.grid.sampleSlots.sample1.pan,-0.4,'pan updates shared beat');
assert.equal(drum.liveEdit.grid.sampleSlots.sample1.volume,1.42,'pan preserves gain');

// Canvas path previously rendered "undefined" for all three raw sample tracks.
const canvasSource=fs.readFileSync('src/forge_and_melodic/03_timeline_and_transport_ui.js','utf8');
const ca=canvasSource.indexOf('function aD('),cb=canvasSource.indexOf('function k$(',ca);
assert(ca>=0&&cb>ca);
const displayed=[];
const canvasContext={canvas:{width:1180,height:282},clearRect(){},fillRect(){},fillText(value){displayed.push(value)},beginPath(){},moveTo(){},lineTo(){},stroke(){},save(){},restore(){},closePath(){},fill(){},roundRect(){}};
const canvasFunctions={__f52DrumLaneNames:label,__f52DrumLaneColors:palette,wM:label,RM:palette,ii:(x)=>x,No:x=>x,sl:(markers)=>markers,_T:(segments,markers)=>[0,...markers,1],GL:()=>0,vu:x=>x,Td:(step,bars,segments,markers,position)=>Math.min(1,(step+(position==='start'?0:position==='center'?.5:1))/(bars*segments))};
vm.runInNewContext(canvasSource.slice(ca,cb),canvasFunctions);
const canvasGrid={bars:1,segmentsPerBar:16,segmentMarkers:Array.from({length:15},(_,i)=>(i+1)/16),stepCount:16,useCustom:true,laneOrder:Object.keys(label),laneSteps:Object.fromEntries(Object.keys(label).map(l=>[l,Array(16).fill(0)]))};
canvasFunctions.Sqe(canvasContext,canvasGrid,{viewport:{startRatio:0,endRatio:1}});
for(const value of ['Sample A','Sample B','Sample C'])assert(displayed.includes(value),`Canvas labels ${value}`);
assert(!displayed.includes(undefined)&&!displayed.includes('undefined'),'Canvas must not render undefined');
console.log('PASS shared editor gain/pan and 9-lane canvas labels');
// Compact and full-room per-hit editors now share one updater: no independent hit shadow state.
const h0=compact.indexOf('function __f52PatchDrumHit('),h1=compact.indexOf('/* Full-room sample inspector:',h0);
assert(h0>=0&&h1>h0);
const beat={snapshot:{pattern:'broken_lilt',kit:'standard'},liveEdit:{grid:{bars:1,segmentsPerBar:16,stepCount:16,useCustom:true,laneOrder:[...Object.keys(label)],laneSteps:Object.fromEntries(Object.keys(label).map(l=>[l,Array(16).fill(0)])),stepPrograms:{},sampleSlots:{sample1:{id:'old',name:'Old',volume:1,pan:0}}}},setLiveEdit(edit){this.liveEdit=edit;}};
const ctx4={u,__f52DrumLaneNames:label,__mlSharedDrumMachine:beat,__f52EnsureDrumGrid:normalizeGrid,__mlGridFromSelection:()=>beat.liveEdit.grid,im:structuredClone,WH:(value,lane,index,vel)=>value||{value:vel,probability:1,layers:[{panOffset:0}],microOffsetRatio:0,decayLock:1,toneLock:1},P:{useState:()=>[true,()=>{}]}};
ctx4.__f52CommitSharedDrumGrid=grid=>beat.setLiveEdit({...beat.liveEdit,grid});
vm.runInNewContext(compact.slice(h0,h1),ctx4);
ctx4.__f52PatchDrumHit('sample1',3,'velocity',0.82);
ctx4.__f52PatchDrumHit('sample1',3,'offset',0.12);
ctx4.__f52PatchDrumHit('sample1',3,'probability',0.35);
assert.equal(beat.liveEdit.grid.laneSteps.sample1[3],0.82);
assert.equal(beat.liveEdit.grid.stepPrograms.sample1[3].microOffsetRatio,0.12);
assert.equal(beat.liveEdit.grid.stepPrograms.sample1[3].probability,0.35);
assert.equal(beat.liveEdit.grid.sampleSlots.sample1.id,'old','editing hit keeps linked sample');
const inspector=ctx4.__f52FullDrumHitInspector({selectedHit:{lane:'sample1',index:3}});
assert(flatten(inspector).some(v=>v?.type==='input'&&v.props?.['aria-label']==='Full Drum Hit Microtiming'),'full room exposes per-hit timing');
console.log('PASS shared full/compact hit-editing logic');
