'use strict';
// Check the *actual* output-runtime expression used by the room callback.
// Keyboard must not inherit Wave Starter's enabled gate, while Enter still does.
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('src/app/forge/01_room_shell.js','utf8');
const start=s.indexOf('const __performanceKeyboard=Lt?.keyboardGestureSource');
assert(start>=0,'Keyboard origin classification missing');
const gate=s.indexOf('if(!wr.enabled&&!Lt?.waveStarterPreview)return;',start);
assert(gate>=start,'The shared playback gate has changed unexpectedly: review path');
const chunk=s.slice(start,gate+'if(!wr.enabled&&!Lt?.waveStarterPreview)return;'.length);
const source=new Function('Lt','fa','Tt',chunk+' return wr;');
const fa={current:{enabled:false,volume:.7,preset:'tape_halo'}};
const Tt={current:{keyboardMixVolume:.43}};
const direct=source({keyboardGestureSource:'keyboard-direct',waveStarterPresetOverride:'entrophon',entrophonWaveActive:true},fa,Tt);
assert(direct?.enabled===true,'RED regression: explicit Keyboard Entrophon is muted by the disabled Wave Starter');
assert.equal(direct.volume,.43,'Keyboard keeps its own mix gain');
const classical=source({keyboardGestureSource:'keyboard-direct',waveStarterPresetOverride:'clean_pluck'},fa,Tt);
assert(classical?.enabled===true,'Legacy Keyboard also independent from Wave Starter gate');
const enter=source({keyboardGestureSource:'enter'},fa,Tt);
assert.equal(enter,undefined,'Wave Starter stays disabled for normal Enter gesture');
assert.equal(fa.current.enabled,false,'Keyboard cannot re-enable Wave Starter');

// Earlier ingress admission is separate from the renderer's own Wave gate.
// Verify the *actual* early return before it queues direct keyboard input.
const ingress=s.indexOf('zo=(ct,_t=!1,Lt)=>');
assert(ingress>=0,'Live Wave/Keyboard ingress missing');
const gatePos=s.indexOf('if(!wr||',ingress);
assert(gatePos>ingress,'Ingress admission guard missing');
const gateEnd=s.indexOf(';',gatePos)+1;
const firstDeclaration=s.lastIndexOf('const __keyboardIngress=',gatePos);
const ingressGuard=s.slice(firstDeclaration>ingress?firstDeclaration:gatePos,gateEnd);
const ingressAllowed=new Function('wr','Lt','fa','ct',ingressGuard+'return true;');
const ctx={state:'running'};
assert.equal(ingressAllowed(ctx,{keyboardGestureSource:'keyboard-direct',waveStarterPresetOverride:'entrophon'},fa,220),true,
  'Keyboard Entrophon is dropped at the first ingress gate while Wave Starter is off');
assert.equal(ingressAllowed(ctx,{keyboardGestureSource:'keyboard-glissando'},fa,220),true,'Glissando must remain independent');
assert.equal(ingressAllowed(ctx,{waveStarterGestureLoopLane:'klaviatur'},fa,220),true,'Keyboard hold pulses need independent admission');
assert.equal(ingressAllowed(ctx,{},fa,220),undefined,'Wave Starter Enter must obey its OFF state');

console.log('PASS both live ingress and renderer admit Keyboard independently of Wave Starter OFF');
