'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../src/audio/01_voice_and_rfl_ownership.js'),'utf8');
function fixture(){const a=src.indexOf('function __xenPitchIdentity('),b=src.indexOf('function tg(',a);assert.ok(a>=0,'explicit pitch identity codec is missing');const c={};vm.createContext(c);vm.runInContext(src.slice(a,b),c);return c}
test('Free is explicit knowledge, Unknown is absence of a reliable reference, and material type is independent',()=>{
 const c=fixture();assert.equal(c.__xenRflPitchLabel({sourceKind:'material'}),'Unknown');
 assert.equal(c.__xenRflPitchLabel({sourceKind:'synth',synthPattern:{tuning:'12edo'}}),'Unknown');
 assert.match(c.__xenRflPitchLabel({pitchIdentity:{version:1,reference:'nested',tuningId:'19edo',pitchConstraint:'continuous'}}),/Nested Tuning.*19edo.*Continuous/);
 assert.match(c.__xenRflPitchLabel({sourceKind:'synth',pitchIdentity:{version:1,reference:'free',pitchConstraint:'continuous'}}),/Free.*Continuous/);
 assert.match(c.__xenRflPitchLabel({sourceKind:'material',pitchIdentity:{version:1,reference:'nested',tuningId:'31edo'}}),/31edo/);
 assert.equal(c.__xenPitchIdentity({version:1,reference:'nested'}),null);
});
test('actual Root Follow codec retains explicit tuning identity and carrier provenance across serialization',()=>{
 const a=src.indexOf('function Wt('),b=src.indexOf('function BI(',a),c={AV:x=>x,XT:()=> 'synth-live'};
 vm.createContext(c);vm.runInContext(src.slice(a,b)+';globalThis.clean=tg;',c);
 const input={sourceKind:'synth',pitchIdentity:{version:1,reference:'nested',tuningId:'19edo',pitchConstraint:'continuous'},
  synthPattern:{baseHz:110,tuning:'19edo',tracks:[],activeTrackIds:[],notes:[{id:'a',trackId:'pink',durationBeats:1,
   sourceMaterialId:'material-a',carrierTransfer:{version:1,mode:'last-hearing',materialId:'material-a',projectId:'project-a',revision:17}}]}};
 const restored=c.clean(JSON.parse(JSON.stringify(c.clean(input))));
 assert.equal(restored.pitchIdentity.tuningId,'19edo');assert.equal(restored.pitchIdentity.pitchConstraint,'continuous');
 assert.equal(restored.synthPattern.notes[0].carrierTransfer.projectId,'project-a');
 assert.equal(restored.synthPattern.notes[0].sourceMaterialId,'material-a');
});
