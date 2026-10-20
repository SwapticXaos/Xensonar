'use strict';
// Real, isolated Nodal BallGrid control function from shipped P7 (not rewritten logic).
// Asserts that Stage 00's installation sound gate and grid-crossing control are sane.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'.');
const src=fs.readFileSync(path.join(root,'src/nodal/13_installation_ball_grid.js'),'utf8');
const rows=[{id:'g-0',freq:200,manualMuted:false,modeMuted:false}];
const ctx={
  myzelGClamp:x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0)),
  __xenGridMuted:()=>false,pEe:()=>rows,gj:()=>({min:100,max:300}),tc:100,
  P:{},Set,Map,Object,Math,Number
};
vm.createContext(ctx);
vm.runInContext(src+'\nglobalThis.__testGrid=__NodalBallGrid;',ctx,{timeout:2500});
const api=ctx.__testGrid;
const params={gridTuning:'12edo'};
api.bind({paramsRef:{current:params},modeRef:{current:'installation'},mixRef:{current:{ballToneMode:'grid'}}});
const mix={ballToneMode:'grid',rootLevel:.62,ballToneLevel:1};
const at=y=>({cursorNormalizedY:y});
const s={};
assert.equal(api.control(at(.4),mix,s,1).gate,0,'Cold initialization must not replay a crossing');
const hit=api.control(at(.6),mix,s,1.015);
assert.equal(hit.hz,200,'Line crossing must select the correct precompiled frequency');
assert(hit.gate>0,'Fresh line crossing must produce audible gate');
const quiet=api.control(at(.61),{...mix,ballToneLevel:0},s,1.020);
assert.equal(quiet.gate,0,'Ball-tone mute must silence the grid gate');
assert.equal(quiet.hz,hit.hz,'Mute must not erase chosen pitch');
const delayed=api.control(at(.2),mix,s,2.0);
assert.equal(delayed.gate,0,'A stalled frame must not replay accumulated line events');
console.log('PASS installation Ball Grid crossing, mute, pitch continuity and no late catch-up');
// Separate audio-domain checks without mutating DSP: ensure ball tone gain reaches
// both fallback voices and actual native DSP, while resident voices stay independent.
const fallback=fs.readFileSync(path.join(root,'src/audio/08_myzel_g_live.js'),'utf8');
const dsp=fs.readFileSync(path.join(root,'src/audio/09_myzel_g_dsp.js'),'utf8');
assert.match(fallback,/rootLevel\*\.05\*ballTone\.gate\*ballToneLevel/,'Native fallback ball-tone gain missing');
assert.match(fallback,/ballLevel\*\(\.006\+g\.gestureEnergy\*\.08\)\*ballToneLevel/,'Native fallback ball motion gain missing');
assert.match(dsp,/gains\[0\]=t\.rootLevel\*\.21\*t\.ballToneGate\*t\.ballToneLevel/,'DSP root/ball gain missing');
assert.match(dsp,/gains\[1\]=t\.ballLevel\*.*\*t\.ballToneLevel/,'DSP ball reaction gain missing');
assert.match(dsp,/gains\[2\]=t\.nodeLevel\*t\.presence/,'Resident voice must remain independent of ball-tone mute');
console.log('PASS independent resident-gain boundary, native/Worklet ball-tone muting present');
