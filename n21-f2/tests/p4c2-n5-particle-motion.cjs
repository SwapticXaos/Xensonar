'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8'),extract=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)+a.length));
const own=read('src/audio/01_voice_and_rfl_ownership.js'),source=read('src/rhythm/03_live_drum_bodies.js');
const motion=new Function(extract(own,'const Ua=','function DH(')+extract(own,'function vhe(','const xhe=')+';return {LT,vhe,Ahe};')();
function load(s){const math=Object.create(Math);math.random=()=>.5;return new Function('LT','vhe','Ahe','Math','AM','xM','rO','B2e','Ex','C9','k9',extract(s,'const _9=','function N2e(').split('function rO(')[0]+extract(s,'function N2e(','function O2e(')+';return N2e;')(motion.LT,motion.vhe,motion.Ahe,math,(x,a,b,w)=>x>=Math.min(a,b)-w&&x<=Math.max(a,b)+w,()=>.5,()=>{},()=>[],()=>1,()=>0,()=>0)}
const physics=load(source),baseline=load(read('tests/fixtures/p4c2_n4_baseline/03_live_drum_bodies.js'));
const policy={enabled:true,mode:'gentle',minAmbientMotionScale:.82,attackMs:650,releaseMs:1100,impactPreserveWindowMs:180};
function fixture(waves){return {agents:[{x:500,y:500,vx:2,vy:0,lastHit:-Infinity,history:[]}],ripples:Array.from({length:waves},()=>({x:0,y:0,radius:0})),sectorPulses:[],impactRipples:[],wobble:0,ambientCrisisMotionScale:.8704,ambientCrisisMotionLastFrameMs:0}}
function run(fn,state,params={},time=1000){fn({state,params:{performancePolicy:{ambientMotion:policy},agentEnabled:[true],...params},frameNowMs:time,particleMotionScale:.5,waveMotionScale:.5,baseWaveSpeed:1,targetFreq:220,installationAttractors:[],fieldWidth:10000,fieldHeight:10000,audioNowSec:()=>0,onParticleTone(){}})}
const low=fixture(4),high=fixture(16);run(physics,low);run(physics,high);assert.equal(high.agents[0].x,low.agents[0].x,'Wave count must not brake physical travel');assert.equal(high.agents[0].x,501,'Base speed must remain unscaled');
// An actual shell collision still applies exactly the old velocity impulse;
// compare to the old unbraked simulation, not to an invented expected sound.
const hit=fixture(1);hit.ripples[0]={x:490,y:500,prevRadius:9,radius:11,maxRadius:100,decay:'linear'};const old=structuredClone(hit);run(physics,hit);run(baseline,old,{performancePolicy:{ambientMotion:{enabled:false}}});
for(const k of ['x','y','vx','vy','lastHit','lastHitGain'])assert.equal(hit.agents[0][k],old.agents[0][k],`Actual impact ${k} must be preserved`);
assert.notEqual(hit.agents[0].vx,2,'The ring impact acceleration must still occur');
// Draw actual O2e with controlled canvas and observe presentation positions.
const draw=new Function('bj',extract(source,'function O2e(','function _2e(')+';return O2e;')(()=>220);
function picture(alpha){const arcs=[],ctx={beginPath(){},arc(...v){arcs.push(v)},stroke(){},fill(){},fillText(){},moveTo(){},lineTo(){}};const agent={x:110,y:220,previousX:100,previousY:200,label:'A',lastHit:0,history:[]};draw({ctx,state:{agents:[agent],impactRipples:[]},params:{agentEnabled:[true]},frameNowMs:1000,t:1,presentationAlpha:alpha});assert.equal(agent.x,110,'Drawing must not mutate physics');return arcs.at(-1).slice(0,2)}
assert.deepEqual(picture(.25),[102.5,205],'Drawing interpolates prior/current state instead of repeating the truth position');assert.deepEqual(picture(.75),[107.5,215]);
console.log('PASS N5 no wave-load motion brake, real impact preserved, display interpolation is separate from physics');
// Render-only frames must not execute a fake zero-time physics tick.
const clock=new Function(extract(own,'const TH=','function she(')+';return {ohe,ihe};')();
const getFrame=new Function('ihe','ny',extract(source,'function G2e(','function H2e(')+';return G2e;')(clock.ihe,6);
const clockState=clock.ohe();clock.ihe(clockState,0);const empty={ripples:[],sectorPulses:[]};
const f=getFrame({ctx:{},state:empty,clockState,frameNowMs:1000/240});assert.equal(f.fieldSteps.length,0,'No movement/collision/history work on a presentation-only frame');assert(f.fieldStepFrame.renderAlpha>0&&f.fieldStepFrame.renderAlpha<1);
let drawAlpha=null,steps=0;
const orchestration=new Function('G2e','P2e','__XenNodalSurfaces','_2e','z2e','I2e','mu','tc','vr','ir',extract(source,'function H2e(','function V2e(')+';return H2e;')(()=>({fieldStepFrame:{renderAlpha:.37,motionScale:.5},fieldSteps:[],advanceFieldWaveStep(){steps++},renderFieldWaves(){}}),()=>[],{warmWaveField(){},warmParticleField(){}},()=>{steps++},e=>{drawAlpha=e.presentationAlpha},()=>{},100,100,1100,580);
orchestration({ctx:{},state:{cursorX:0,cursorY:0,ripples:[],sectorPulses:[],agents:[]},params:{},frameNowMs:0,t:0,fieldClockState:{},installationSharedFieldActive:false,topologyRefs:{current:{}},installationFieldConfigRef:{current:{}},performanceCrisisRuntimePolicy:{particles:{}},audioCtxRef:{current:null},quantizeAnchorRef:{},waveCollisionQueueRef:{}});
assert.equal(drawAlpha,.37,'Real orchestration must forward clock interpolation to particle drawing');assert.equal(steps,0,'No zero-time simulation tick');
assert(!extract(source,'function W2e(','function q2e(').includes('U+=.016'),'Presentation time cannot advance once per rendered frame');
console.log('PASS N5 actual clock/draw orchestration forwards alpha and skips zero-time simulation');
