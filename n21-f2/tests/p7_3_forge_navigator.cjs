#!/usr/bin/env node
// P7.3 behaviour-first contract: selection resize must not interfere with viewport trim.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=process.argv[2]||path.join(__dirname,'..');
const canvas=fs.readFileSync(path.join(root,'src/forge/editor/01_display_and_canvas.js'),'utf8');
const audio=fs.readFileSync(path.join(root,'src/forge/editor/09_workflow_controls.js'),'utf8');
const css=fs.readFileSync(path.join(root,'styles/08_forge_workflow.css'),'utf8');
function extract(name){const i=canvas.indexOf('function '+name+'(');assert(i>=0,`missing ${name}`);const rest=canvas.slice(i);const start=rest.indexOf('{');let level=0;for(let j=start;j<rest.length;j++){if(rest[j]==='{')level++;else if(rest[j]==='}'&&--level===0)return rest.slice(0,j+1)}throw new Error(`unterminated ${name}`)}
const context={};vm.createContext(context);vm.runInContext(extract('__f333NavigatorSampleEdgeHit')+';'+extract('__f333NavigatorSampleResize')+';',context);
const hit=context.__f333NavigatorSampleEdgeHit,resize=context.__f333NavigatorSampleResize;
const selection={start:0.2,end:0.7};
assert.equal(hit(100,500,selection),'selection-left');
assert.equal(hit(350,500,selection),'selection-right');
assert.equal(hit(200,500,selection),null);
assert.equal(hit(100,500,null),null);
assert.equal(hit(100,500,selection,4),'selection-left');
assert.equal(hit(106,500,selection,4),null);
assert.equal(hit(100,500,selection,true),null,'invalid hit widths rejected');
let r=resize('selection-left',selection.end,0.35);
assert.equal(r.start,0.35); assert.equal(r.end,0.7);
r=resize('selection-right',selection.start,0.5);
assert.equal(r.start,0.2); assert.equal(r.end,0.5);
r=resize('selection-left',selection.end,1);assert(r.end-r.start>=0.003-1e-9,'left edge cannot invert selection');
r=resize('selection-right',selection.start,-1);assert(r.end-r.start>=0.003-1e-9,'right edge cannot invert selection');
assert(canvas.includes('data-forge-navigator-region-playhead'), 'missing selected region playhead');
assert(canvas.includes('w.selectionResize'), 'pointer drag must resize selection instead of viewport');
assert(audio.includes('previewDurationSec:seconds'), 'preview duration must be sourced from actual PCM length');
assert(css.includes('@keyframes forge-navigator-region-sweep'), 'compositor playhead sweep missing');
console.log('PASS: independent invisible selection handles, bounds, cursor, and PCM-timed violet preview playhead');
// Name-field regression (RED before implementation): exact width/height and real save routing.
const persistSource=fs.readFileSync(path.join(root,'src/forge_and_melodic/10_audition_and_persistence.js'),'utf8');
assert(audio.includes('data-forge-navigator-sample-name'), 'region name must be editable in the Navigator action row');
assert(audio.includes('Sample Name:'), 'sample name label must be visible before the input');
assert(css.includes('.f35-navigator-sample-caption'), 'label needs the Project Name-aligned offset without moving controls');
assert(audio.includes('h(__ForgeNavigatorSampleNameInput),h(__ForgeNavigatorPreviewButton),h(__ForgeNavigatorSaveButton)'), 'name must be left of Preview, keeping Preview and Save in order');
assert(persistSource.includes('snapshot().nameDraft'), 'Save as Sample must read the typed name, not only display an input');
// Verify save passes the user-entered title to the real Sample Database intake,
// and a blank title preserves the old automatic naming contract.
(async()=>{
  const sourceStart=persistSource.indexOf('async function __f333SaveNavigatorSample(){');
  const sourceEnd=persistSource.indexOf('async function __f333ExportCurrent(',sourceStart);
  assert(sourceStart>=0&&sourceEnd>sourceStart,'missing canonical Forge save function');
  const saveFunction=persistSource.slice(sourceStart,sourceEnd);
  const selected={start:.2,end:.4};let draft='My Dark Drone',registered=[];
  const channel=new Float32Array(48000).fill(.25);
  const peState={renderVersion:4,sourceAsset:'audio1',materialExport:{name:'Forge'}};
  const ctx={
    __ForgeNavigatorSample:{current:()=>selected,snapshot:()=>({busy:false,nameDraft:draft}),update(){}},
    pe:{getState:()=>peState},__f333Route:()=> 'pure',
    __F3564Master:{getSnapshot:()=>({revision:2})},
    __f333RenderCurrent:async()=>({buffer:{length:48000,sampleRate:48000,numberOfChannels:1,getChannelData:()=>channel}}),
    xt:{encodeSamplesToWAV:()=>new Uint8Array(44)},
    xS:async(name)=>{registered.push(name);return{name}},Blob,Float32Array,Number,Math,String,Error
  };
  vm.createContext(ctx);vm.runInContext(saveFunction+';',ctx);
  await ctx.__f333SaveNavigatorSample();
  assert.equal(registered[0],'My Dark Drone.wav','typed title must be the actual registry title');
  draft=' ';await ctx.__f333SaveNavigatorSample();
  assert.match(registered[1],/^Forge · One Shot 20–40%\.wav$/,'blank title keeps the previous automatic fallback');
  draft='dark/bass:17-EDO.wav';await ctx.__f333SaveNavigatorSample();
  assert.equal(registered[2],'dark bass 17-EDO.wav','typed title is sanitized before saving');
  console.log('PASS: sample name is used in actual Sample Database file registration, fallback and filename sanitization');
})().catch(e=>{console.error(e);process.exitCode=1});
