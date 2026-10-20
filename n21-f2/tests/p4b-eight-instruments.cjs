'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/app/forge/02_boot_and_workspace_tools.js','utf8');
const view=fs.readFileSync('src/forge_and_melodic/06_note_editor_and_material_tools.js','utf8');
const ctx=vm.createContext({
 P:{useRef:value=>({current:value})},
 Tp:id=>id.startsWith('import:'),qS:()=>4,sR:()=>[{hz:220}],WS:x=>x,ll:()=>[],QS:(_,x)=>x,am:()=> 'octave',nodalComposerSourceFields:()=>({}),
 u:{Fragment:'fragment',jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},Vj:'archive',__XenSampleRackRays:'sample-rays',NodalLibraryManager:'nodal',EntrophonLibraryManager:'entrophon'
});
vm.runInContext(source.slice(source.indexOf('function Lp('),source.indexOf('function Xa('))+
 source.slice(source.indexOf('function uR('),source.indexOf('function Bo('))+
 view.slice(view.indexOf('function mQe('))+';this.api={defaults:Vp,extras:MELODIC_EXTRA_TRACKS,add:addMelodicInstrument,clone:$n,count:melodicInstrumentTracks,ui:mQe};',ctx);
const plain=x=>JSON.parse(JSON.stringify(x)),api=ctx.api;
const composer={tracks:plain(api.defaults),notes:[],activeTrackIds:api.defaults.map(t=>t.id),bars:4,stepsPerBar:16,pitchLines:[{hz:220}],pitchSteps:[{hz:220}],selectedTrackId:'bass'};
assert.equal(composer.tracks.length,4,'existing project defaults stay four');
composer.tracks.push({...plain(api.defaults[0]),id:'import:material',label:'Imported material',color:'#fff',instrumentPreset:'sample:material'});
for(let n=5;n<=8;n++){
 const added=api.add(composer);assert(added);assert.equal(added.label,`Instrument ${n}`);assert.equal(composer.selectedTrackId,added.id);assert(composer.activeTrackIds.includes(added.id));
 composer.notes.push({id:'note'+n,trackId:added.id,startUnit:n,channelIndex:0,durationUnits:1});
}
assert.equal(api.count(composer).length,8);assert.equal(api.add(composer),null,'eight is a total cap, not eight extra slots');
assert.equal(new Set(api.count(composer).map(t=>t.color)).size,8,'each instrument has its own color');
const cloned=api.clone(JSON.parse(JSON.stringify(composer)));
assert.deepEqual(plain(cloned.tracks),plain(composer.tracks));assert.deepEqual(plain(cloned.notes),plain(composer.notes));assert.deepEqual(plain(cloned.activeTrackIds),plain(composer.activeTrackIds));
assert.equal(api.clone({...composer,tracks:plain(api.defaults)}).tracks.length,4,'legacy projects retain four tracks');
const missingDefaults=api.clone({...composer,tracks:[...plain(api.defaults),{id:'instrument5'}]});
assert.equal(missingDefaults.tracks[4].color,api.extras[0].color,'new track fallback does not reuse Instrument 1 color');
// L10 moved instrument cards out of mQe; test the actual L16 toolbar contract.
function nodes(tree){return !tree?[]:Array.isArray(tree)?tree.flatMap(nodes):typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[]}
let added=0,removed=0;
function render(count){return nodes(api.ui({loopComposer:composer,melodicProjectChoices:[],gridTuningOptions:[],instrumentCount:count,onAddInstrument:()=>added++,onRemoveInstrument:()=>removed++}));}
for(const count of [4,5,6,7,8]){
 const tree=render(count),add=tree.find(n=>n.props?.['aria-label']==='Add Instrument'),remove=tree.find(n=>n.props?.['aria-label']==='Remove last additional instrument');
 assert.equal(!!add,count<8);assert.equal(!!remove,count>4);
 if(add){add.props.onClick();assert(added>0);}if(remove){remove.props.onClick();assert(removed>0);}
 const stack=tree.find(n=>n.props?.className==='melodic-import-sounds-stack');
 assert(stack);assert.equal(stack.props.children[0].props.children,'Import Sounds');
 assert.deepEqual(Array.from(stack.props.children.slice(1,3),n=>n.type),['nodal','entrophon']);
 assert(stack.props.children.slice(1,3).every(n=>n.props.compact));
 assert(tree.some(n=>n.props?.className==='melodic-compact-control-grid grid gap-3'));
}
console.log('PASS P4B eight instruments: bounded slots, unique colors, snapshot roundtrip, L16 toolbar callbacks and independent managers');
