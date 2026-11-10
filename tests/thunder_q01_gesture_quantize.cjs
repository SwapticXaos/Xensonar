'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const target = process.argv[2] || require('path').join(__dirname,'..','dist','XenSonar_Standalone.html');
if (!target) throw new Error('Usage: node Thunder_Q01.tests.cjs <XenSonar HTML>');
const html = fs.readFileSync(target,'utf8');
function func(name){
 const needle='function '+name+'(',i=html.indexOf(needle);
 if(i<0)throw Error('Missing function '+name);
 const brace=html.indexOf('{',html.indexOf(')',i)+1);let depth=0;
 for(let j=brace;j<html.length;j++){
   if(html[j]==='{')depth++;
   if(html[j]==='}'&&!--depth)return html.slice(i,j+1);
 }
 throw Error('Function not closed '+name);
}
const code = `
 const lT=e=>e.trim()||'unknown-hold-key', Ux=(a,b)=>a||b?'sustain-extend':'normal', Kx=(a,b)=>a||b?'apostrophe-safe-extend':'none';
 const __XenSampleClock04={ cancelKey(){} }, __XenNodalSurfaces={muteFallbackHold(){}}, __XenC20C={pulse(){}};
 ${func('l0')}\n${func('tG')}\n${func('nG')}\n${func('rG')}\n${func('Die')}\n${func('w4')}\n${func('Nie')}\n${html.includes('function __xenThunderQ01AttackAtMs(')?func('__xenThunderQ01AttackAtMs'):''}
 ;({Die,w4,Nie,quantize:typeof __xenThunderQ01AttackAtMs==='function'?__xenThunderQ01AttackAtMs:null,nG})
`;
const context = vm.createContext({Math,Number,Array,Object,globalThis:{},console});
fs.writeFileSync('/tmp/thunder-vm.js',code); const {w4,Nie,quantize,nG} = vm.runInContext(code,context);
function state(){return {gestures:{klaviatur:{},wellenstart:{}},lastStartByLane:{klaviatur:{},wellenstart:{}},immediateHitCount:0,repeatAbsorbedCount:0,patternMutedPulseCount:0,loopPulseCount:0,skippedCatchupCount:0};}
function attack(s,lane,key,atMs,qAt,slots=24,bars=1,steps=null){return w4({state:s,lane,keyId:key,isRepeat:false,nowMs:atMs,bpm:120,segmentsPerBar:slots,referenceBars:bars,targetHz:440,activeSteps:steps||Array(slots).fill(1),quantizedAttackAtMs:qAt,sustainExtendActive:false})}
function pulse(s,nowMs,steps={}){return Nie({state:s,nowMs,bpm:120,segmentsByLane:{klaviatur:24,wellenstart:24},referenceBarsByLane:{klaviatur:1,wellenstart:1},maxPulses:8,sustainExtendActive:false,activeStepsByLane:{klaviatur:steps.klaviatur||Array(24).fill(1),wellenstart:steps.wellenstart||Array(24).fill(1)},sampleLanes:{klaviatur:false,wellenstart:false}})}
let ran=0;
function test(label,check){try{check();console.log('PASS',label);ran++}catch(e){console.error('FAIL',label, e.message);process.exitCode=1}}
test('Q absent/OFF: immediate gesture and original per-key onset retained',()=>{
 const s=state(),v=attack(s,'klaviatur','KeyA',1070,null);assert.equal(v.allowImmediateAudio,true);assert.equal(s.gestures.klaviatur.KeyA.startedAtMs,1070);assert.equal(s.gestures.klaviatur.KeyA.pulseCount,1);
});
test('Q ON: first sound is deferred to the selected slot, not emitted at keydown',()=>{
 const s=state(),v=attack(s,'klaviatur','KeyA',1070,1125);assert.equal(v.allowImmediateAudio,false);assert.equal(s.gestures.klaviatur.KeyA.startedAtMs,1125);assert.equal(s.gestures.klaviatur.KeyA.pulseCount,0);assert.equal(pulse(s,1100).length,0);const due=pulse(s,1126);assert.equal(due.length,1);assert.equal(due[0].keyId,'KeyA');assert.equal(due[0].pulseIndex,0);
});
test('separate roots keep translated pattern index, no phase collapse',()=>{
 const s=state();attack(s,'klaviatur','KeyA',1000,1020);attack(s,'klaviatur','KeyS',1550,1520);const gA=s.gestures.klaviatur.KeyA,gB=s.gestures.klaviatur.KeyS;assert.equal(gB.startedAtMs-gA.startedAtMs,500);assert.equal(gB.nextPulseAtMs-gA.nextPulseAtMs,500);assert.equal(gA.pulseCount,0);assert.equal(gB.pulseCount,0);
});
test('slot quantizer uses the common audio grid for Keyboard and Enter',()=>{
 assert.equal(typeof quantize,'function');const ctx={currentTime:4.03,state:'running'};const a=quantize({enabled:true,nowMs:7000,ctx,bpm:120,segmentsPerBar:24,referenceBars:1});const b=quantize({enabled:true,nowMs:7000,ctx,bpm:120,segmentsPerBar:4,referenceBars:1});assert.ok(a>7000&&a<7300,`24-slot: ${a}`);assert.ok(b>7000&&b<7600,`4-slot: ${b}`);
 const aa=(a-7000+4.03*1000)/(2000/24),bb=(b-7000+4.03*1000)/(2000/4);assert.ok(Math.abs(aa-Math.round(aa))<1e-6);assert.ok(Math.abs(bb-Math.round(bb))<1e-6);
 assert.equal(quantize({enabled:false,nowMs:7000,ctx,bpm:120,segmentsPerBar:24,referenceBars:1}),null);
});
test('Q ON release before boundary: no later pulse',()=>{
 const s=state();attack(s,'klaviatur','KeyA',1050,1125);delete s.gestures.klaviatur.KeyA;assert.equal(pulse(s,1130).length,0);
});
test('pattern 4 slots: pulse interval is quarter bar and steps remain distinct',()=>{
 const s=state();attack(s,'klaviatur','KeyA',1005,1100,4);const g=s.gestures.klaviatur.KeyA;assert.equal(g.intervalMs,500);assert.equal(g.nextPulseAtMs,1100);
});
test('no active first step means no sound until the first active slot',()=>{
 const s=state(),steps=Array(24).fill(1);steps[0]=0;const g=attack(s,'klaviatur','KeyA',1010,1100,24,1,steps);assert.equal(g.allowImmediateAudio,false);const first= pulse(s,1101,{klaviatur:steps});assert.equal(first.length,0);const second=pulse(s,1185,{klaviatur:steps});assert.equal(second.length,1);assert.equal(second[0].pulseIndex,1);
});
test('Q metadata is rendered as a switch with OFF default',()=>{
 assert.match(html,/"aria-label":"Quantize Gestural Attack"/);assert.match(html,/thunderQuantizeGestureAttack===true/);assert.match(html,/thunderQuantizeGestureAttack:!1|thunderQuantizeGestureAttack:false/);assert.match(html,/xen-thunder-quantize/);
});
test('Q ON: Sample-clock lookahead plans the very first slot (index 0)',()=>{
 const s=state();attack(s,'klaviatur','KeyA',1010,1300,24);const ev=Nie({state:s,nowMs:1020,bpm:120,segmentsByLane:{wellenstart:24,klaviatur:24},referenceBarsByLane:{wellenstart:1,klaviatur:1},maxPulses:12,sustainExtendActive:false,activeStepsByLane:{wellenstart:Array(24).fill(1),klaviatur:Array(24).fill(1)},sampleAudioCtx:{state:'running'},sampleLanes:{wellenstart:false,klaviatur:true},sampleLookaheadMs:550,sampleSignatures:{klaviatur:'sample-test'}});
 assert.ok(ev.length>=1,'Expected an advanced scheduled sample');assert.equal(ev[0].pulseIndex,0);assert.equal(ev[0].dueAtMs,1300);assert.equal(ev[0].sampleClock04,true);assert.equal(s.gestures.klaviatur.KeyA.quantizedAttackPending,false);
});
test('Q ON: per-key pitch offset at slot 5 is carried with that key, not globally reset',()=>{
 const s=state(),slots=24,ms=nG({bpm:120,segmentsPerBar:slots,referenceBars:1});
 attack(s,'klaviatur','KeyA',1000,1050);attack(s,'klaviatur','KeyS',1510,1550);
 // Both patterns retain local index 4 (= the fifth displayed slot).
 let idxA=[],idxB=[];
 for(let at=1051;at<=2000;at+=ms){const ev=pulse(s,at); for(const p of ev){if(p.keyId==='KeyA')idxA.push([p.pulseIndex,at]);if(p.keyId==='KeyS')idxB.push([p.pulseIndex,at]);}}
 // Separate onsets differ by 6 slots; the same local pitch step therefore does not coincide.
 assert.equal(s.gestures.klaviatur.KeyS.startedAtMs-s.gestures.klaviatur.KeyA.startedAtMs,500);
 assert.ok(idxA.some(([idx])=>idx===4));assert.ok(idxB.some(([idx])=>idx===4));
});
console.log('Tests completed:',ran,'pass,',10-ran,'fail.');
if(process.exitCode)process.exit(process.exitCode);
