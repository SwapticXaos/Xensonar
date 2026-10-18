'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const stage=fs.readFileSync(path.join(root,'src/rhythm/02_bass_and_rack.js'),'utf8');
const waves=fs.readFileSync(path.join(root,'src/rhythm/04_workspace_and_transport.js'),'utf8');
const shell=fs.readFileSync(path.join(root,'src/app/forge/01_room_shell.js'),'utf8');
const start=stage.indexOf('onCanvasMouseDown:t=>{'); const end=stage.indexOf(',onCanvasMouseUp:',start);
assert(start>=0&&end>start,'Actual canvas mouse-down handler must exist');
const handlerText=stage.slice(start+'onCanvasMouseDown:'.length,end);
let resolve;
const ready=new Promise(r=>resolve=r);
const eventPositions=[];
const refs={current:{cursorX:50,cursorY:180}};
const calls=[];
const e={gameWidth:1100,gameHeight:580,nexusRefs:refs,
 setPlayfieldCursorInside:()=>{},updateFocusCursor:(x,y)=>eventPositions.push([x,y]),
 commitResonanceCursorY:(y,opts)=>{assert.equal(opts.primeSource,'resonance');refs.current.cursorY=Math.round(y/6)*6;return refs.current.cursorY},
 activeGridDragStepRef:{current:null},activeGridDragStartYRef:{current:null},
 ensureAudioReady:()=>ready,spawnNexusRipple:(direction,anchor)=>calls.push({direction,anchor}),
};
const currentTarget={getBoundingClientRect:()=>({left:100,top:50,width:550,height:290})};
const context={e,window:{addEventListener:()=>{}},document:{activeElement:{blur:()=>{}}},j4:(ev,w,h)=>{const r=ev.currentTarget.getBoundingClientRect();return{x:(ev.clientX-r.left)*(w/r.width),y:(ev.clientY-r.top)*(h/r.height)}},hr:()=>{throw Error('audio startup failed')}};
const onDown=vm.runInNewContext('('+handlerText+')',context);
const ev={button:0,preventDefault(){},clientX:350,clientY:130,currentTarget};
// No mouse move before the next note: the click itself must update the free focus and the musical ball.
onDown(ev);
assert.deepEqual(eventPositions.map(v=>Array.from(v)),[[500,160]]);
assert.equal(refs.current.cursorX,500);
assert.equal(refs.current.cursorY,162);
// Simulate a later move while audio preparation is pending: do not move the stored wave target.
refs.current.cursorX=820;refs.current.cursorY=380;
resolve();
setImmediate(()=>{
 assert.equal(calls.length,1);
 assert.equal(calls[0].direction,undefined);
 assert.deepEqual({...calls[0].anchor},{x:500,y:162});
 // Check actual wave constructor consumes the same frozen anchor rather than current cursor.
 const k=waves.indexOf('H9=({refs:e,'); const z=waves.indexOf(',X2e=',k);
 assert(k>0&&z>k,'Actual H9 wave constructor available');
 const H9=vm.runInNewContext('('+waves.slice(k+3,z)+')',{ax:{ripples:40},G9:()=>1,j9:()=>200});
 const state={cursorX:820,cursorY:380,ripples:[]};
 const launched=H9({refs:state,waveRadius:.2,waveDecay:'linear',baseWaveMaxRadius:200,clampValue:v=>v,cursorAtEvent:calls[0].anchor});
 assert.deepEqual({x:launched.cursorX,y:launched.cursorY},{x:500,y:162});
 assert.deepEqual({x:state.ripples[0].x,y:state.ripples[0].y},{x:500,y:162});
 assert(waves.includes('function Y2e(e,t,cursorAtEvent)')&&waves.includes('direction:t,cursorAtEvent}'));
 assert(shell.includes('$g=(ct,cursorAtEvent)=>{Y2e(qm(),ct,cursorAtEvent)}'));
 console.log('PASS click without mousemove commits current free focus and nearest grid target; asynchronous launch freezes original click pitch and x-coordinate');
});
