'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const js=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
const scope={localStorage:{getItem:()=>null,setItem:()=>{}},window:{addEventListener(){}},requestAnimationFrame:()=>1,clearTimeout,setTimeout,console,Math,Number,Array,Object,JSON,Set,WeakMap,Date,Map};
vm.runInNewContext(js+'\nglobalThis.eq=__XenEQ;',scope);
const eq=scope.eq;
const curve=(bands,fn)=>Array.from({length:360},(_,i)=>fn(Math.min(bands-1,Math.floor(i/359*bands))));
for(const bands of [4,12,24]){
 const values=Array.from({length:bands},(_,i)=>i%4<2?1:-1);
 const c=eq.clean({...eq.neutral(),mode:'raster',bands,a:curve(bands,i=>values[i]),b:curve(bands,i=>-values[i]),morph:0});
 assert.equal(c.mode,'raster','raster mode persisted');
 const plan=eq.plan(c,48000);assert.equal(plan.mode,'raster');
 assert.equal(plan.knots.length,bands,'band indicators mark true filter centers');
 assert.ok(plan.filters.slice(0,bands).every((f,i)=>Math.abs(Math.log(f.frequency/20)/Math.log(1000)-(i+.5)/bands)<.01),'frequencies are fixed at gesture centers');
 const response=eq.response(c,48000,bands*60+1,plan);
 for(let i=0;i<bands;i++){
  const x=(i+.5)/bands,actual=response[Math.round(x*bands*60)],expected=eq.target(c,x);
  assert.ok(Math.abs(expected-actual)<=1.3,`bands=${bands}, band ${i}: ${actual.toFixed(2)}dB vs ${expected.toFixed(2)}dB; cannot paint band to full target`);
 }
 const ab=eq.clean({...c,morph:.5});assert.equal(ab.mode,'raster');
 const blend=eq.plan(ab,48000);assert.equal(blend.filters.length,24);
 const original=JSON.stringify(c.a);
 eq.plan(c,48000);assert.equal(JSON.stringify(c.a),original,'fit must not mutate source');
}
const key='material:raster-paint';eq.startGesture(key);eq.set(key,{mode:'raster',bands:12,a:curve(12,i=>i%2?1:-1)});
const fast=eq.plan(eq.get(key),48000);assert.ok(fast.provisional,'live draw must be bounded');eq.endGesture(key);
const full=eq.plan(eq.get(key),48000);assert.ok(!full.provisional && Number.isFinite(full.fitError),'release must refine filter response');
// Raster Paint writes the whole band as a stepped source gesture; no hidden smoothing.
const paintKey='material:paint-step';eq.set(paintKey,{mode:'raster',bands:12});
const pre=eq.get(paintKey);eq.rasterStroke(paintKey,'a',2,4,-1,1);
const painted=eq.get(paintKey);
for(let b=0;b<12;b++){
 const expected=b===2?-1:b===3?0:b===4?1:0;
 const at=Math.round((b+.5)/12*359);
 assert.ok(Math.abs(painted.a[at]-expected)<1e-10,`painted band ${b} must preserve gesture target ${expected}`);
}
assert.ok(painted.b.every(v=>v===0),'painting A must not change B');
assert.ok(pre.a.every(v=>v===0),'previous curve immutable');
assert.ok(eq.rasterStroke(paintKey,'a',7,7,1,1),'single extreme click accepted');
assert.ok(eq.get(paintKey).a[Math.round(7.5/12*359)]===1,'single gesture sets band to maximum');
const before=eq.get(key);eq.set(key,{mode:'adaptive'});const after=eq.get(key);
assert.deepEqual([...after.a],[...before.a],'switching modes cannot overwrite drawn curve');
assert.equal(after.mode,'adaptive');
assert.equal(eq.neutral().mode,'adaptive','existing saves should default to adaptive');
console.log('PASS raster gesture fidelity, A/B, no smoothing, mode switch');
