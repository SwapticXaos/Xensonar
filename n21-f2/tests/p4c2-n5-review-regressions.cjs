'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),read=p=>fs.readFileSync(p,'utf8'),cut=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));
const frames=new Map();let serial=0;const ctx={WeakMap,requestAnimationFrame:f=>(frames.set(++serial,f),serial),cancelAnimationFrame:id=>frames.delete(id)};vm.createContext(ctx);vm.runInContext(read('src/runtime/instrument/13_pointer_motion.js'),ctx);
const input=read('src/rhythm/04_workspace_and_transport.js');vm.runInContext(cut(input,'aPe=e=>','oPe=e=>').replace(/,$/,'')+';this.arrows=aPe;',ctx);
const ref={current:{cursorX:0,cursorY:100}},source={current:'mouse'},calls=[];
const owner=ctx.__resonancePointerMotionFor({nexusRefs:ref,commitResonanceCursorY:y=>{ref.current.cursorY=y;calls.push(y)}});owner.move(500,200);
ctx.arrows({runtimeRefs:{nexusParamsRef:{current:{cursorSpeed:4,lockCursorToGrid:false}},nexusArrowRef:{current:{left:true,right:false,up:false,down:false}},nexusRefs:ref,focusCursorLastInputRef:source},frameBounds:{gameWidth:1100},provenance:{arrowInputSource:'arrow'},actions:{clampValue:(v,a,b)=>Math.max(a,Math.min(b,v)),commitCursorY(){}}});
for(const f of frames.values())f();assert.equal(ref.current.cursorX,0,'New arrow action at clamped boundary must cancel older pending pointer input');assert.equal(ref.current.cursorY,100);assert.equal(calls.length,0);
// Real H2e orchestrator: reset frames draw current truth with alpha=1. The
// following no-step frame must not interpolate backward into pre-reset history.
const sourceCode=read('src/rhythm/03_live_drum_bodies.js');let reset=true,alpha=1,paint=[];
const orchestrate=new Function('G2e','P2e','__XenNodalSurfaces','_2e','z2e','I2e','mu','tc','vr','ir','const ny=6;'+cut(sourceCode,'function H2e(','function V2e(')+';return H2e;')(()=>({fieldStepFrame:{renderAlpha:alpha,reset},fieldSteps:reset?[{motionScale:.5,nowMs:1000}]:[],advanceFieldWaveStep(){},renderFieldWaves(){}}),()=>[],{warmWaveField(){},warmParticleField(){}},e=>{const p=e.state.agents[0];p.previousX=p.x;p.previousY=p.y;p.x++;},e=>{const p=e.state.agents[0];paint.push((p.previousX??p.x)+(p.x-(p.previousX??p.x))*e.presentationAlpha)},()=>{},100,100,1100,580);
const state={agents:[{x:100,y:200}],cursorX:0,cursorY:0,ripples:[],sectorPulses:[]},e={ctx:{},state,params:{},frameNowMs:1000,t:0,fieldClockState:{},installationSharedFieldActive:false,topologyRefs:{current:{}},installationFieldConfigRef:{current:{}},performanceCrisisRuntimePolicy:{particles:{}},audioCtxRef:{current:null},quantizeAnchorRef:{},waveCollisionQueueRef:{}};
orchestrate(e);reset=false;alpha=.5;orchestrate(e);assert.deepEqual(paint,[101,101],'Presentation must never jump backward after a clock reset');assert.equal(state.agents[0].x,101,'Presentation correction must not change physical travel');
console.log('PASS N5 review fixes: newer edge arrow cancels pointer; reset/no-step presentation never reverses');
