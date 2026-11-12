'use strict';
// HOLD-LIB-02: read-only factory arpeggios of the Hold Pattern Memory. Every row must pass the memory's own validation (so it can be loaded
// and saved), names are unique, and major / minor are unambiguous (third = 400 / 300 cents above a fifth of 700).
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../src/factories/xenHoldPatternMemoryFactory.js'),'utf8');
const ctx=vm.createContext({Math,JSON,Object,Array,Number,String,Date,Error,Set,Promise,globalThis:{}});
const memory=vm.runInContext(src+';__xenHoldPatternMemoryFactory()',ctx);
for(const lane of['keyboard','enter']){
 const rows=memory.factory(lane);assert(rows.length>=40,'factory set size: '+rows.length);
 const names=new Set();
 for(const r of rows){
  assert.equal(r.factory,true);assert.equal(r.sourceLane,lane);assert(!names.has(r.name),'unique name '+r.name);names.add(r.name);
  const v=memory.validate(r);assert.equal(v.slots,r.pitchCents.length,'validates: '+r.name);
  assert(r.muteSteps.some(x=>x===1),'at least one active slot: '+r.name);
  assert(r.pitchCents.every(c=>c>=-1200&&c<=1200));assert.equal(r.slotVolumes.length,r.slots);assert.equal(r.microtiming.length,r.slots);assert(r.id.startsWith('factory:'));
 }
 const active=r=>r.pitchCents.filter((_,i)=>r.muteSteps[i]===1);
 const near=(arr,c,tol=2)=>arr.some(x=>Math.abs(x-c)<=tol);
 for(const r of rows.filter(x=>/^Major · (triad|Alberti|maj7|dominant|offbeat)/.test(x.name))){const a=active(r);assert(near(a,400)&&near(a,700)&&!near(a,300),'major triad tones: '+r.name)}
 for(const r of rows.filter(x=>/^Minor · (triad|Alberti|m7|offbeat)/.test(x.name))){const a=active(r);assert(near(a,300)&&near(a,700)&&!near(a,400),'minor triad tones: '+r.name)}
 // THUNDER-SPEED: Thunder Mode is for shredding: every factory figure runs at 20 notes per bar or faster (≤ 111 ms per note at 108 BPM)
 for(const r of rows)assert(r.slots/r.referenceBars>=20-1e-9,'fast enough: '+r.name+' '+r.slots/r.referenceBars+' per bar');
 assert(rows.filter(r=>r.slots/r.referenceBars>=32-1e-9).length>=20,'most figures in 32nds');
 const just=rows.find(x=>x.name.startsWith('Just major'));assert(Math.abs(just.pitchCents[1]-386.314)<.01&&Math.abs(just.pitchCents[2]-701.955)<.01);
}
assert(memory.factory('bogus')[0].sourceLane==='keyboard','unknown lane falls back to keyboard');
console.log('PASS HOLD-LIB-02 factory arpeggios valid, major/minor unambiguous');
