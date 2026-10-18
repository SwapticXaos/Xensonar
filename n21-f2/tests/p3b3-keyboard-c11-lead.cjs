'use strict';
// Exercise the production direct-owner router + C11 tryAttack callback. The
// host is simulated so frame deadlines are deterministic; physical audio isn't.
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const owner=read('src/audio/07_governor_and_drums.js'), backend=read('src/audio/entrophon/02_worklet_and_voice_backend.js');
const recorder=read('src/audio/03_recorder.js');
const slice=(s,a,b)=>{const i=s.indexOf('function '+a+'(');assert(i>=0,a);const j=s.indexOf(b,i);assert(j>i,b);return s.slice(i,j);};
const timing=new Function('const BW=20;'+slice(recorder,'m1e','function p1e')+';return {m1e,__c11LeadForDemand};')();
const {m1e,__c11LeadForDemand}=timing;
assert.equal(m1e(48000,48000,0),48960,'non-keyboard direct owner retains existing 20ms lookahead');
assert.equal(m1e(48000,48000,0,12),48576,'keyboard lead must be overridable independently of standard C11');
const rBegin=owner.indexOf('function RCe('),rEnd=owner.indexOf('function CCe(',rBegin);
const RCe=new Function('Txe','__wave39Owned','E9','rE',owner.slice(rBegin,rEnd)+';return RCe;')(()=>true,()=>false,['clean_pluck'],{DIRECT:1,GLISS:2});
const qBegin=backend.indexOf('function QMe(');
const cbStart=backend.indexOf('const g=P.useCallback(w=>{',qBegin),cbEnd=backend.indexOf(',[e.audioCtx,n,b]),y=',cbStart);
assert(cbStart>qBegin&&cbEnd>cbStart,'production direct-owner callback located');
const callback=backend.slice(cbStart,cbEnd+',[e.audioCtx,n,b])'.length);
let now=4000, actualFrame=null, reservations=0, committed=0;
const host={currentContextFrame:()=>48000,observeInputAge(){},tryReserveAttack:(token,frame,units,voices)=>{actualFrame=frame;reservations++;return true;},cancelUnsubmitted(){},syncDirectMirrorTargets(){},onFinished(){},trySubmitTonePlan:()=>{committed++;return true;},epoch:1};
const counters={current:{submittedAttacks:0,submittedSinceFlush:0,failedSubmissions:0,failedSinceFlush:0,lastSoundId:null,dirty:false}};
const context={sampleRate:48000};
const imports={BW:20,P:{useCallback:fn=>fn},e:{audioCtx:context},n:true,s:{current:false},i:{current:true},o:{current:true},r:{current:host},a:{current:{}},l:{current:1},c:counters,b:()=>{},JW:()=>({voices:1}),performance:{now:()=>now},m1e,__c11LeadForDemand,zMe:()=>new Uint32Array(64),d1e:65536,WMe:(x,lo,hi)=>Math.max(lo,Math.min(hi,x)),OMe:()=>({ok:false}),a9:()=>({tones:[{}]}),bn:()=>{}};
const tryAttack=new Function(...Object.keys(imports), callback+';return g;')(...Object.values(imports));
function dispatch(keyboard,age){now=4000;actualFrame=null;const result=RCe({options:{legacy9061DirectGate:true,keyboardGestureSource:keyboard?'keyboard-direct':undefined,requestedAtMs:now-age},selection:{kind:'preset',presetId:'clean_pluck'},entrophonActive:false,executor:'browser-c11',resolved:{playbackFreq:220,volume:.3},browserImplant:{tryAttack,enabled:true,noteLegacyBypass(){}},c11Allowed:true,c11CorePlan:{tones:[{}]},c11AuxTargets:[],ctx:context,isSector:false});assert.equal(result,'owned');return actualFrame;}
assert.equal(dispatch(false,0),48960,'wave-starter C11 control path must preserve 20ms deadline');
assert.equal(dispatch(true,0),48576,'fresh keyboard events should use 12ms C11 target');
assert.equal(dispatch(true,6),48384,'older keyboard events get at least 8ms current-frame lead');
assert.equal(dispatch(true,15),48240,'older events keep the existing 20ms bounded deadline, never queued or replayed');
assert.equal(committed,4);assert.equal(reservations,4);
console.log('PASS C11 keyboard direct owner: bounded short lead; wave unchanged; no fallback or queued attack');
