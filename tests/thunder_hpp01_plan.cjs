'use strict';
// THUNDER-HPP01: Hold Pattern Plan runtime contract (no browser).
// 1) key frequency → audible-step position (any period, octave shifts, mutes, off-grid → lane pattern)
// 2) Nie schedules a plan gesture with its OWN slots/bars/mutes/volumes while a lane gesture keeps the lane pattern.
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const html=fs.readFileSync(process.argv[2]||require('path').join(__dirname,'..','dist','XenSonar_Standalone.html'),'utf8');
function func(name){const i=html.indexOf('function '+name+'(');if(i<0)throw Error('Missing '+name);const brace=html.indexOf('{',html.indexOf(')',i)+1);let d=0;
 for(let j=brace;j<html.length;j++){if(html[j]==='{')d++;if(html[j]==='}'&&!--d)return html.slice(i,j+1)}throw Error('open '+name)}
function block(start,end){const i=html.indexOf(start);if(i<0)throw Error('Missing '+start);return html.slice(i,html.indexOf(end,i)+end.length)}
const code=`
 const lT=e=>e.trim()||'unknown-hold-key',Ux=()=>'normal',Kx=()=>'none',sT=24;
 const __XenSampleClock04={cancelKey(){}},__XenNodalSurfaces={muteFallbackHold(){}};globalThis.__XenC20C=null;
 const eu=e=>Math.max(1,Math.min(256,Math.round(Number.isFinite(e)?e:24)));
 const STEPS={'12edo':[0,100,200,300,400,500,600,700,800,900,1000,1100],'13edt':Array.from({length:13},(_,i)=>i*1901.955/13)};
 const Kp=id=>STEPS[id]||[],vF=id=>id==='13edt'?1901.955:1200,__xenLiveGridParams=p=>p;
 ${['l0','tG','nG','rG','__xenHoldMicroRatio','__xenHoldMicroVector','__xenHoldSlotDueMs','__xenHoldSlotGain','__xenHoldVolumeVector','__xenHoldPitchValue','__xenHoldPitchVector','__xenHoldPitchState','Die','w4','Nie'].map(func).join('\n')}
 const __xenHoldPitchCache=new WeakMap();
 ${block('const __XenHoldPlanRuntime=(()=>{','\n})();')}
 ;({w4,Nie,R:__XenHoldPlanRuntime})`;
const {w4,Nie,R}=vm.runInContext(code,vm.createContext({Math,Number,Array,Object,Set,WeakMap,String,JSON,console,globalThis:{}}));
let failed=0;const test=(l,f)=>{try{f();console.log('PASS',l)}catch(e){failed++;console.error('FAIL',l,e.message)}};
const pat=(slots,steps)=>({pattern:{slots,referenceBars:1,muteSteps:steps||Array(slots).fill(1),pitchCents:Array(slots).fill(0),slotVolumes:Array(slots).fill(1),microtiming:Array(slots).fill(0)}});
const ionianMutes=[1,3,6,8,10];
const plan={version:1,enabled:true,nativeGrid:{},entries:[3,4,5,6,7,8,9].map(n=>pat(n))};
const params={gridTuning:'12edo',gridBase:220,manualGridMutedSteps:ionianMutes,manualGridStepOffsets:[],keyboardHoldPlan:plan};
test('each audible step in every octave resolves to its plan position',()=>{
 const deg=[0,200,400,500,700,900,1100];
 for(let k=-3;k<=3;k++)deg.forEach((c,i)=>assert.equal(R.forHz(params,220*Math.pow(2,(c+1200*k)/1200)).slots,3+i));
});
test('off-grid frequency and disabled/absent plans fall back to the lane pattern',()=>{
 assert.equal(R.forHz(params,220*Math.pow(2,150/1200)),null);
 assert.equal(R.forHz({...params,keyboardHoldPlan:{...plan,enabled:false}},220),null);
 assert.equal(R.forHz({...params,keyboardHoldPlan:null},220),null);
});
test('fine-tuned step offsets (10-cent units) move the step, not the plan',()=>{
 const off=[0,0,0,0,3];// degree 4 (+30 cents)
 assert.equal(R.forHz({...params,manualGridStepOffsets:off},220*Math.pow(2,430/1200)).slots,5);
});
test('non-octave period (13-EDT) wraps by the tritave; more steps than plan entries reuse positions',()=>{
 const p13={...params,gridTuning:'13edt',manualGridMutedSteps:[]};
 const hz=i=>220*Math.pow(2,i*1901.955/13/1200);
 assert.equal(R.forHz(p13,hz(0)).slots,3);assert.equal(R.forHz(p13,hz(7)).slots,3,'position 8 reuses position 1');
 assert.equal(R.forHz(p13,hz(13+2)).slots,5,'next tritave, third step');
});
test('resolved overrides are cached per entry (no allocation per attack)',()=>{
 assert.equal(R.forHz(params,220),R.forHz(params,440));
});
const st=()=>({gestures:{klaviatur:{},wellenstart:{}},lastStartByLane:{klaviatur:{},wellenstart:{}},immediateHitCount:0,repeatAbsorbedCount:0,patternMutedPulseCount:0,loopPulseCount:0,skippedCatchupCount:0});
const lane={segmentsByLane:{klaviatur:24,wellenstart:24},referenceBarsByLane:{klaviatur:1,wellenstart:1},activeStepsByLane:{klaviatur:Array(24).fill(1),wellenstart:Array(24).fill(1)},sampleLanes:{klaviatur:false,wellenstart:false}};
test('Nie: plan gesture uses its own interval and mutes; lane gesture keeps the lane pattern',()=>{
 const s=st();const ov=R.forHz({...params,keyboardHoldPlan:{...plan,entries:[pat(4,[1,0,1,1]),...plan.entries.slice(1)]}},220);
 w4({state:s,lane:'klaviatur',keyId:'KeyA',isRepeat:false,nowMs:1000,bpm:120,segmentsPerBar:ov.slots,referenceBars:ov.bars,targetHz:220,activeSteps:ov.steps,sustainExtendActive:false});
 s.gestures.klaviatur.KeyA.hpp=ov;
 w4({state:s,lane:'klaviatur',keyId:'KeyS',isRepeat:false,nowMs:1000,bpm:120,segmentsPerBar:24,referenceBars:1,targetHz:330,activeSteps:Array(24).fill(1),sustainExtendActive:false});
 const pulses=[];for(let t=1000;t<=3000;t+=10)pulses.push(...Nie({state:s,nowMs:t,bpm:120,maxPulses:12,sustainExtendActive:false,...lane}));
 const a=pulses.filter(x=>x.keyId==='KeyA'),b=pulses.filter(x=>x.keyId==='KeyS');
 assert.equal(s.gestures.klaviatur.KeyA.intervalMs,500);assert.equal(s.gestures.klaviatur.KeyS.intervalMs,2000/24);
 assert.deepEqual(a.map(x=>x.pulseIndex%4),[2,3,0],'muted slot 2 of the plan pattern is skipped');
 assert.ok(b.length>=20,'lane gesture still pulses 24 per bar');
});
if(failed)process.exit(1);
