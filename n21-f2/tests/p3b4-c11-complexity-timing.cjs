'use strict';
// Prove planning differs by actual audible tone demand, not by preset name.
// Exercise real C11 submit callback with a deterministic context / host fake;
// no browser latency or DSP throughput is claimed by this test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const backend=fs.readFileSync('src/audio/entrophon/02_worklet_and_voice_backend.js','utf8');
const recorder=fs.readFileSync('src/audio/03_recorder.js','utf8');
const extract=(src,start,end)=>{const i=src.indexOf(start),j=src.indexOf(end,i+start.length);assert(i>=0&&j>i,start);return src.slice(i,j)};
const scheduler=new Function('const BW=20;'+extract(recorder,'function m1e(','function p1e(')+';return {m1e,__c11LeadForDemand};')();
const callback=extract(backend,'const g=P.useCallback(w=>{',',[e.audioCtx,n,b]),y=')+',[e.audioCtx,n,b])';
const context={sampleRate:48000}, counters={current:{submittedAttacks:0,submittedSinceFlush:0,failedSubmissions:0,failedSinceFlush:0,lastSoundId:null,dirty:false}};
const frames=[]; let count=0, leaseReleased=0, manifestLookups=0;
const host={currentContextFrame:()=>48000,observeInputAge(){},tryReserveAttack:(token,frame,units,voices)=>{frames.push({frame,units,voices});return true},cancelUnsubmitted(){},syncDirectMirrorTargets(){},onFinished(){},trySubmitTonePlan:()=>true,epoch:1};
const input={BW:20,P:{useCallback:f=>f},e:{audioCtx:context},n:true,s:{current:false},i:{current:true},o:{current:true},r:{current:host},a:{current:{}},l:{current:1},c:counters,b:()=>{},JW:()=>{manifestLookups++;return {voices:1}},performance:{now:()=>1000},m1e:scheduler.m1e,__c11LeadForDemand:scheduler.__c11LeadForDemand,zMe:()=>new Uint32Array(64),d1e:65536,WMe:(x,lo,hi)=>Math.max(lo,Math.min(hi,x)),OMe:()=>({ok:false}),a9:()=>({tones:[{}]}),bn:()=>{}};
// All arguments in the callback are production-bound lexical identifiers.
input.v1e=undefined;
const tryAttack=new Function(...Object.keys(input),callback+';return g;')(...Object.values(input));
const fire=(voices,keyboardDirect=true,age=0)=>{frames.length=0;const tones=Array.from({length:voices},()=>({}));const handled=tryAttack({soundId:'test_preset',volume:.3,frequencyHz:220,keyboardDirect,requestedAtMs:1000-age,corePlan:{tones},acquireVoice:n=>{assert.equal(n,voices);count++;return {release(){leaseReleased++}}}});assert.equal(handled,true);assert.equal(frames.length,1);assert.equal(frames[0].voices,voices);assert.equal(frames[0].units,voices*2);return frames[0].frame};
// Baseline: mono retains established P3B3 12ms, ordinary wave remains 20ms.
assert.equal(fire(1,true,0),48576,'mono keyboard must retain 12ms directness');
assert.equal(fire(1,false,0),48960,'non-keyboard C11 retains 20ms default');
// Multivoice work requires more scheduling slack, with unchanged admission demands.
assert.equal(fire(2,true,0),48672,'two-tone keyboard gets 14ms');
assert.equal(fire(3,true,0),48768,'three-tone keyboard gets 16ms');
assert.equal(fire(6,true,0),48960,'six-tone dense sound gets 20ms');
assert.equal(fire(3,true,11),48384,'aged triple tone has no extra queue; original deadline remains bounded');
assert.equal(manifestLookups,0,'fully resolved tone plans must avoid redundant manifest lookup on hot keyboard path');
frames.length=0;
assert.equal(tryAttack({soundId:'fallback_preset',volume:.3,frequencyHz:220,keyboardDirect:true,requestedAtMs:1000}),true);
assert.equal(manifestLookups,1,'cold/unresolved plan still uses the manifest safely');
assert.equal(frames[0].voices,1);
assert.equal(count,6);assert.equal(leaseReleased,0,'release remains owned by host onFinish');
console.log('PASS P3B4 demand-aware planning: mono 12ms, 2 tones 14ms, 3-5 tones 16ms, dense 20ms; demand unchanged');
