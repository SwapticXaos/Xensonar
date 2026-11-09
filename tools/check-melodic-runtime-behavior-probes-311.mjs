#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = process.cwd();
const outDir = path.join(root, '.xensonar-checks', 'melodic-runtime-behavior-311');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const write = (name, source) => { const p = path.join(outDir, name); fs.writeFileSync(p, source); return p; };

const loopPreviewStub = write('loopPreviewStub.ts', `
export function hasSeekableLoopComposerPreview(){ return false; }
export function seekLoopComposerPreviewToStep(){}
`);

const interactionEntry = write('interactionProbe.tsx', `
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createEmptyLoopComposer, getLoopNoteScreenRect, getLoopNoteLineRect } from '../../src/features/l3lab/canonicalForge/loopDrumDomain';
import { applyMaterialBaseImportToDraft } from '../../src/features/l3lab/canonicalForge/materialBaseWorkflow';
import { getLoopComposerCanvasGeometry } from '../../src/features/l3lab/canonicalForge/loopComposerInteraction';
import { resolveMaterialGridHz } from '../../src/features/l3lab/canonicalForge/materialBasePitchDisplay';
import { useCanonicalLoopComposerInteractions } from '../../src/features/l3lab/canonicalForge/useCanonicalLoopComposerInteractions';
import { getLoopComposerViewportWindow, applyLoopComposerViewportWindow, getLoopComposerVerticalViewportWindow, applyLoopComposerVerticalViewportWindow } from '../../src/features/l3lab/canonicalForge/viewportMath';

const checks:any[]=[];
function check(label:string, condition:any, detail=''){ checks.push(label); if(!condition) throw new Error(label + (detail ? ' :: '+detail : '')); }
const state:any = createEmptyLoopComposer(4);
const anchorIndex = Math.max(4, state.pitchLines.length - 3);
const noteId = applyMaterialBaseImportToDraft(state, {
  sampleId:'probe-sample', entry:{id:'probe-material', name:'Probe Material', bars:1}, anchorIndex,
  roundedAnchorHz: state.pitchLines[anchorIndex].hz, sourceBpm:120, sourceLoopDurationSec:2,
  materialPitchMode:'source-granular', lanePlacement:{trackId:'material-base:probe', color:'#ec4899', pendingPitchAnchor:true},
});
const note0:any = state.notes.find((n:any)=>n.id===noteId);
check('import starts pending', note0?.pendingPitchAnchor === true);
check('import starts on requested line', note0?.channelIndex === anchorIndex);

const attrs = new Map<string,string>();
const canvas:any = {
  width:1200, height:640,
  getBoundingClientRect:()=>({left:0,top:0,width:1200,height:640,right:1200,bottom:640}),
  setAttribute:(k:string,v:string)=>attrs.set(k,v), removeAttribute:(k:string)=>attrs.delete(k),
};
const clipComposerRef:any={current:canvas};
const overviewRef:any={current:null};
const verticalOverviewRef:any={current:null};
const dragRef:any={current:null};
const viewportDragRef:any={current:null};
const verticalViewportDragRef:any={current:null};
let api:any=null;
const mutate=(updater:any)=>updater(state);
function Probe(){ api=useCanonicalLoopComposerInteractions({
  clipComposerRef, composerOverviewRef:overviewRef, composerVerticalOverviewRef:verticalOverviewRef,
  composerDragRef:dragRef, composerViewportDragRef:viewportDragRef, composerVerticalViewportDragRef:verticalViewportDragRef,
  loopComposer:state, lockTrackEditing:false, materialFragmentPrepActive:false, autoZoomOnDenseOverlap:false,
  selectedLoopNoteIds:[], chordVoicing:'closed', chordStrumSteps:0, chordVelocitySlope:0,
  mutateLoopComposer:mutate, refreshSelectionFromBox:()=>{}, previewComposerGesture:()=>{},
  setSelectedLoopNoteIds:()=>{}, setComposerSelectionBox:()=>{}, setComposerHover:()=>{}, setComposerCursor:()=>{},
  setShowChordGhost:()=>{}, setDenseOverlapWarning:()=>{}, setStatus:()=>{},
}); return React.createElement('div'); }
renderToStaticMarkup(React.createElement(Probe));
check('interaction hook exposed', !!api);

function pointerEvent(x:number,y:number){ return {clientX:x,clientY:y,button:0,altKey:false,shiftKey:false,metaKey:false,ctrlKey:false,preventDefault(){},stopPropagation(){}} as any; }
let geometry:any=getLoopComposerCanvasGeometry(canvas,state);
let live:any=state.notes.find((n:any)=>n.id===noteId);
let rect:any=getLoopNoteScreenRect(state,live,geometry.lineLayout,{gutterW:geometry.gutterW,cellW:geometry.cellW,scrollStart:geometry.scrollStart,visibleSteps:geometry.visibleSteps});
const startX=rect.x+Math.max(20,rect.w*0.5), startY=rect.y+rect.noteH*0.5;
api.handleLoopComposerDown(pointerEvent(startX,startY));
check('pointer down enters pitch-anchor drag', dragRef.current?.type==='note-move' && dragRef.current?.pitchAnchorOnly===true);
const targetIndex=Math.max(0,anchorIndex-4);
const targetY=getLoopNoteLineRect(geometry.lineLayout,targetIndex).lineY;
api.handleLoopComposerMove(pointerEvent(startX,targetY));
live=state.notes.find((n:any)=>n.id===noteId);
check('live anchor drag moves imported body', live.channelIndex===targetIndex, String(live.channelIndex));
check('anchor remains pending until release', live.pendingPitchAnchor===true);
api.releaseComposerInteractions();
live=state.notes.find((n:any)=>n.id===noteId);
check('release clears pending anchor', live.pendingPitchAnchor===false);
check('release preserves chosen line', live.channelIndex===targetIndex);
check('release writes exact grid anchor Hz', Math.abs(live.anchorHz-resolveMaterialGridHz(state,live))<1e-9, String(live.anchorHz));

// Normal post-anchor dragging must remain functional.
geometry=getLoopComposerCanvasGeometry(canvas,state);
rect=getLoopNoteScreenRect(state,live,geometry.lineLayout,{gutterW:geometry.gutterW,cellW:geometry.cellW,scrollStart:geometry.scrollStart,visibleSteps:geometry.visibleSteps});
const x2=rect.x+Math.max(20,rect.w*0.5), y2=rect.y+rect.noteH*0.5;
api.handleLoopComposerDown(pointerEvent(x2,y2));
check('second drag is ordinary move', dragRef.current?.type==='note-move' && dragRef.current?.pitchAnchorOnly!==true);
const secondTarget=Math.max(0,targetIndex-2);
const secondY=getLoopNoteLineRect(geometry.lineLayout,secondTarget).lineY;
const beforeStart=live.startUnit;
api.handleLoopComposerMove(pointerEvent(x2+geometry.cellW*2,secondY));
api.releaseComposerInteractions();
live=state.notes.find((n:any)=>n.id===noteId);
check('ordinary drag changes pitch after anchor', live.channelIndex===secondTarget);
check('ordinary drag changes time after anchor', Math.abs(live.startUnit-beforeStart)>0.1, String(live.startUnit));
check('ordinary drag does not re-enter pending state', live.pendingPitchAnchor===false);

// Viewport pure behavior roundtrips: overview/window operations must describe the same state they apply.
state.zoom=2.75; state.scrollX=0.37;
const xWindow:any=getLoopComposerViewportWindow(state);
const xClone:any=structuredClone(state);
applyLoopComposerViewportWindow(xClone,xWindow.scrollStart,xWindow.visibleSteps);
const xRound:any=getLoopComposerViewportWindow(xClone);
check('X viewport roundtrip preserves visible span', Math.abs(xRound.visibleSteps-xWindow.visibleSteps)<=1);
check('X viewport roundtrip preserves start', Math.abs(xRound.scrollStart-xWindow.scrollStart)<=1);
state.zoomY=2.5; state.scrollY=0.41;
const yWindow:any=getLoopComposerVerticalViewportWindow(state);
const yClone:any=structuredClone(state);
applyLoopComposerVerticalViewportWindow(yClone,yWindow.scrollStart,yWindow.visibleLines);
const yRound:any=getLoopComposerVerticalViewportWindow(yClone);
check('Y viewport roundtrip preserves visible lines', Math.abs(yRound.visibleLines-yWindow.visibleLines)<=1);
check('Y viewport roundtrip preserves start', Math.abs(yRound.scrollStart-yWindow.scrollStart)<=1);
console.log('interaction '+checks.length+'/'+checks.length);
`);

const reactStub = write('reactEffectStub.ts', `
export function useEffect(effect:any){ const cleanup=effect(); if(typeof cleanup==='function') (globalThis as any).__effectCleanups.push(cleanup); }
`);
const renderStub = write('loopComposerRenderingStub.ts', `
export function drawLoopComposerCanvas(){ (globalThis as any).__drawCount++; }
`);
const ampStub = write('amplitudePreviewStub.ts', `
let resolver:any=null;
export function ensureMelodicSampleAmplitudePreview(){ return new Promise((resolve)=>{ resolver=resolve; (globalThis as any).__resolveAmplitude=()=>resolve(null); }); }
export function getCachedMelodicSampleAmplitudePreview(){ return null; }
`);
const renderEntry = write('renderLifecycleProbe.ts', `
import { useCanonicalForgeRenderEffects } from '../../src/features/l3lab/canonicalForge/useCanonicalForgeRenderEffects';
const checks:any[]=[]; function check(label:string, condition:any, detail=''){ checks.push(label); if(!condition) throw new Error(label+(detail?' :: '+detail:'')); }
(globalThis as any).__effectCleanups=[]; (globalThis as any).__drawCount=0;
let nextId=1; const rafs=new Map<number,Function>(); let maxActive=0;
(globalThis as any).window={
  requestAnimationFrame(cb:Function){ const id=nextId++; rafs.set(id,cb); maxActive=Math.max(maxActive,rafs.size); return id; },
  cancelAnimationFrame(id:number){ rafs.delete(id); },
};
(globalThis as any).performance={now:()=>1234};
const ctx:any={}; const canvas:any={getContext:()=>ctx};
const loopComposer:any={
  selectedTrackId:'material-base:probe', selectedNoteId:'note-1',
  tracks:[{id:'material-base:probe', instrumentPreset:'sample:probe-sample'}],
  notes:[{id:'note-1',trackId:'material-base:probe',instrumentPresetOverride:null,pendingPitchAnchor:true}],
};
useCanonicalForgeRenderEffects({
  logicView:'melodic', activeWorkspace:'melodic', materialExportBars:4,
  drumComputerRef:{current:null} as any, visibleDrumComputer:{}, clipPreviewRatio:0, drumMarkerDragIndex:null, safeDrumViewport:{},
  clipComposerRef:{current:canvas} as any, loopComposer, selectedLoopNoteIds:['note-1'], composerHover:{stepIndex:null,gridStep:null},
  clipPreviewStep:0, grooveDrumPattern:'fourOnFloor', composerSelectionBox:null, chordGhostNotes:null, materialFragmentGuideSnapshot:null,
});
check('pending render draws initial frame', (globalThis as any).__drawCount===1, String((globalThis as any).__drawCount));
check('pending render schedules exactly one RAF', rafs.size===1, String(rafs.size));
check('one lifecycle cleanup registered', (globalThis as any).__effectCleanups.length===1, String((globalThis as any).__effectCleanups.length));
(globalThis as any).__resolveAmplitude();
await Promise.resolve(); await Promise.resolve();
check('amplitude completion does not redraw behind pending RAF', (globalThis as any).__drawCount===1, String((globalThis as any).__drawCount));
check('amplitude completion does not create second RAF', rafs.size===1, String(rafs.size));
const [id,cb]=rafs.entries().next().value; rafs.delete(id); cb(1300);
check('RAF callback draws next frame', (globalThis as any).__drawCount===2, String((globalThis as any).__drawCount));
check('RAF chain remains singular after frame', rafs.size===1 && maxActive===1, 'active='+rafs.size+' max='+maxActive);
(globalThis as any).__effectCleanups[0]();
check('cleanup cancels remaining RAF', rafs.size===0, String(rafs.size));
console.log('render '+checks.length+'/'+checks.length);
`);

async function bundle(entry, outfile, kind) {
  await build({
    entryPoints:[entry], outfile, bundle:true, platform:'node', format: kind === 'interaction' ? 'cjs' : 'esm', target:'node20', logLevel:'silent',
    plugins:[{
      name:'xensonar-311-test-aliases', setup(b){
        if(kind==='interaction') b.onResolve({filter:/^\.\/loopPreview$/}, args => args.importer.endsWith('useCanonicalLoopComposerInteractions.ts') ? {path:loopPreviewStub} : null);
        if(kind==='render') {
          b.onResolve({filter:/^react$/}, ()=>({path:reactStub}));
          b.onResolve({filter:/^\.\/loopComposerRendering$/}, args => args.importer.endsWith('useCanonicalForgeRenderEffects.ts') ? {path:renderStub} : null);
          b.onResolve({filter:/^\.\/melodicSampleAmplitudePreview$/}, args => args.importer.endsWith('useCanonicalForgeRenderEffects.ts') ? {path:ampStub} : null);
        }
      }
    }],
  });
}

const interactionBundle=path.join(outDir,'interactionProbe.cjs');
const renderBundle=path.join(outDir,'renderLifecycleProbe.mjs');
await bundle(interactionEntry,interactionBundle,'interaction');
await bundle(renderEntry,renderBundle,'render');
let total=0;
for (const [label,file] of [['interaction/anchor/viewport',interactionBundle],['render-lifecycle',renderBundle]]) {
  const p=spawnSync(process.execPath,[file],{cwd:root,encoding:'utf8',env:{...process.env}});
  if(p.status!==0){ console.error(`[melodic-runtime-behavior-311] FAIL ${label}`); console.error(p.stdout||''); console.error(p.stderr||''); process.exit(1); }
  const text=String(p.stdout||'').trim(); console.log(`[melodic-runtime-behavior-311] ${label}: ${text}`);
  const m=text.match(/(\d+)\/(\d+)/); if(m) total+=Number(m[1]);
}
console.log(`[melodic-runtime-behavior-311] PASS: ${total} executable behavioral assertions`);
