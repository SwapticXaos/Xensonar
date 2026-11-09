'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
let root=0,ripples=0,pending=0,eqMorph=0,held=true;
const frames=new Map(),ctx={state:'running',currentTime:0};
const box={console,WeakMap,WeakSet,Map,Set,Uint32Array,window:{addEventListener(){},removeEventListener(){}},document:{activeElement:null},
 requestAnimationFrame:fn=>(frames.set(++pending,fn),pending),cancelAnimationFrame:id=>frames.delete(id),
 __XenEQ:{clean:x=>structuredClone(x),get:()=>({a:[0,0],b:[1,1],morph:.2}),runtimeMorph(){eqMorph++},startGesture(){},endGesture(){}},
 __XenBassGridPointer:{isActive:()=>false,move:()=>false,begin:()=>false,finish:()=>false},__XenBassGrid:{visualRows:()=>[]},
 j4:e=>({x:e.clientX,y:e.clientY})};
vm.createContext(box);vm.runInContext(read('src/audio/avalanche.js')+'\n'+read('src/runtime/instrument/13_pointer_motion.js'),box);
const code=read('src/rhythm/02_bass_and_rack.js'),i=code.indexOf('function due(e)'),j=code.indexOf('function mue(',i);vm.runInContext(code.slice(i,j)+'\nglobalThis.D=due;globalThis.A=__XenAvalanche;',box);
const gs={klaviatur:{KeyA:{active:true,targetHz:217.37}},wellenstart:{}},state={cursorX:250,cursorY:170};
const e={nexusActive:true,audioCtx:ctx,gameWidth:1000,gameHeight:500,nexusRefs:{current:state,__f35640HoldState:{current:{gestures:gs}}},nexusParamsRef:{current:{}},activeGridDragStepRef:{current:null},activeGridDragStartYRef:{current:null},getVisibleGridLines:()=>[],yFromFreq:()=>170,setPlayfieldCursorInside(){},updateFocusCursor(){root++},commitResonanceCursorY:y=>(state.cursorY=y,y),spawnNexusRipple(){ripples++}};
const style={},stage={style,getBoundingClientRect:()=>({width:1000,height:500}),parentElement:null};
const event=(x,y=170)=>({clientX:x,clientY:y,button:0,buttons:1,currentTarget:stage,preventDefault(){}}),handlers=box.D(e);
handlers.onCanvasMouseMove(event(250));assert.equal(root,1);assert.equal(frames.size,1,'ordinary focus update queued');
handlers.onCanvasMouseDown(event(250));assert.equal(frames.size,0,'pending root update cancelled');assert.equal(ripples,0);assert(box.A.dragging());
handlers.onCanvasMouseMove(event(450,400));assert.equal(root,1);assert.equal(state.cursorY,170);assert.equal(box.A.value('klaviatur'),.45);
handlers.onCanvasMouseUp();assert(!box.A.dragging());assert.equal(ripples,0);
gs.klaviatur.KeyA.active=false;box.A.sync();gs.klaviatur.KeyA.active=true;handlers.onCanvasMouseDown(event(250));assert.equal(box.A.value('klaviatur'),.25,'new Hold starts from original focus');box.A.cancel();
gs.klaviatur.KeyA.active=false;handlers.onCanvasMouseDown(event(600));assert.equal(ripples,1,'ordinary click restored');
console.log('PASS actual stage handlers: no extra ripple/root/pitch changes, pending RAF cancelled, fresh Hold reset, normal click restored');
