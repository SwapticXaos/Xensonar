'use strict';
const fs=require('fs'),assert=require('assert/strict'),vm=require('vm'),{load}=require('./offline_runtime.cjs');
const h=load(process.cwd());h.run('document.querySelector=()=>null;__ForgeListeningMode.choose("emilia",{prepare:false});');
const before=h.run('JSON.stringify(pe.getState().carrierIntegralSelection)');
h.run(`__f334CommitCarrier({name:'Audio',bars:1,beatsPerBar:4,bpm:120,carrier:{version:'melodic-carrier-v1',durationBeats:4,notes:[{id:'a',voiceId:'a',trackId:'a',startBeat:0,durationBeats:4,pitchHz:[220],gainCurve:[.6]}],tracks:[{id:'a',enabled:true}]}},{neutral:true});`);
assert.equal(h.run('JSON.stringify(pe.getState().carrierIntegralSelection)'),before,'audio conversion must keep the last selected machine and its parameters');
console.log('PASS audio-to-carrier retains last listening machine');
