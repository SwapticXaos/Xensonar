'use strict';
// The owner's automatic post-init change is independent of Entrophon selection.
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync('src/audio/07_governor_and_drums.js','utf8');
const slice=(name,next)=>s.slice(s.indexOf('function '+name+'('),s.indexOf(next,s.indexOf('function '+name+'(')));
const kCe=new Function(slice('kCe','function PCe')+';return kCe;')();
let calls=0,permit=false;
const RCe=new Function('Txe','__wave39Owned','E9','rE',s.slice(s.indexOf('function RCe('),s.indexOf('function ',s.indexOf('function RCe(')+10))+';return RCe;')(
 ()=>true,()=>false,['clean_pluck'],{DIRECT:1,GLISS:2});
const shared={options:{legacy9061DirectGate:true,requestedAtMs:1500,keyboardGestureSource:'keyboard-direct'},selection:{kind:'preset',presetId:'clean_pluck'},
 entrophonActive:false,resolved:{playbackFreq:220,volume:.2},ctx:{},isSector:false,rootFollowActive:false,
 browserImplant:{enabled:true,tryAttack(){calls++;return permit;},noteLegacyBypass(){}},c11Allowed:true,c11CorePlan:{voices:[{}]},c11AuxTargets:[],coreOwnerAllowed:false};
const initial=kCe({preferred:'browser-c11',browserEnabled:true,browserState:'initializing',browserOwnsLane:false});
assert.equal(initial,'legacy');assert.equal(RCe({...shared,executor:initial}),'fallthrough');assert.equal(calls,0);
const settled=kCe({preferred:'browser-c11',browserEnabled:true,browserState:'ready',browserOwnsLane:true});
assert.equal(settled,'browser-c11');
assert.equal(RCe({...shared,executor:settled}),'owned');assert.equal(calls,1);
assert.equal(RCe({...shared,executor:settled}),'owned','admission rejection is a deliberate no-queue/no-fallback decision');assert.equal(calls,2);
// The UI does not have to toggle Entrophon for the execution owner to change.
assert.equal(RCe({...shared,executor:settled,entrophonActive:true}),'fallthrough');
fs.mkdirSync('results',{recursive:true});fs.writeFileSync('results/p3b2-owner-cutover-audit.json',JSON.stringify({initialExecutor:initial,postInitExecutor:settled,wasEntrophonSelectionNeeded:false,ownedEvenIfTryAttackReturnedFalse:true,physicalTimingTest:false},null,2)+'\n');
console.log('PASS automatic Classic owner migration from Legacy to Browser-C11 upon readiness, even without Entrophon toggle; no fallback on a failed owned attack');
