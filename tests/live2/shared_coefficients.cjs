'use strict';
// Identical immutable plans on parallel buses compute RBJ trigonometry only once.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let sines=0;const math=Object.create(Math);math.sin=x=>(sines++,Math.sin(x));
const box={console,Math:math,WeakMap,Float64Array};vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../src/quickrack/equalizer/eq-worklet.js'),'utf8')+'\nglobalThis.eq=__XenEqLive;',box);
const plan={base:-1,filters:Array.from({length:24},(_,i)=>({gain:2,frequency:40*Math.pow(400,i/23),q:1}))};
const received=[];
for(let i=0;i<6;i++){const m=box.eq.coefficients(plan,24,48000);received.push(structuredClone(m,{transfer:[m.coefficients.buffer]}));}
assert.equal(sines,24,'six buses share one coefficient calculation');
assert(received.every(m=>m.count===24&&m.coefficients.length===120));
for(let i=1;i<6;i++){assert.deepEqual(received[i].coefficients,received[0].coefficients);assert.notEqual(received[i].coefficients.buffer,received[0].coefficients.buffer);}
const old=received[0].coefficients[0];received[0].coefficients[0]=99;const fresh=box.eq.coefficients(plan,24,48000);assert.equal(fresh.coefficients[0],old,'transfers and callers cannot corrupt shared cache');
box.eq.coefficients(plan,12,48000);assert.equal(sines,36,'different bank count gets correct coefficients');box.eq.coefficients(plan,12,44100);assert.equal(sines,48,'different sample rate gets correct coefficients');
console.log('PASS one RBJ calculation across six buses, independent transfers, sample-rate/count isolation');
