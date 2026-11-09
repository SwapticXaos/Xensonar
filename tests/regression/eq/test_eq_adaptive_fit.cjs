'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = fs.readFileSync(require('node:path').resolve(__dirname, '../../../src/quickrack/equalizer/eq-core.js'), 'utf8');
const scope = {localStorage:{getItem:()=>null,setItem:()=>{}},window:{addEventListener(){}},requestAnimationFrame:()=>1,clearTimeout,setTimeout,console,Math,Number,Array,Object,JSON,Set,WeakMap,Date,Map};
vm.runInNewContext(core+'\nglobalThis.xen = __XenEQ;', scope);
const eq = scope.xen;
const cfg = eq.neutral();
// Synthetic facsimile of user's 24-Oct curve: two broad deep notches, two high plateaus.
function paintCurve() {
 const shape = Array(360).fill(0);
 const points = [[0,0],[.35,-.28],[.42,-.6],[.462,.96],[.47,-1],[.568,-1],[.58,.2],[.60,1],[.705,1],[.71,-1],[.80,-1],[.812,1],[.98,1],[1,1]];
 for(let i=0;i<360;i++){const x=i/359;let j=0;while(j<points.length-2 && x>points[j+1][0])j++;const [xa,ya]=points[j],[xb,yb]=points[j+1],w=xb===xa?0:(x-xa)/(xb-xa);shape[i]=Math.min(1,Math.max(-1,ya+(yb-ya)*w));}
 return shape;
}
const s=paintCurve();
const patterned = {...cfg,a:s,b:s,morph:.32};
const idx = x => Math.round(x*239);
const real = (bands) => eq.response({...patterned,bands},48000,240);
const desired = x => eq.target(patterned,x);
const profile = real(12),profile24=real(24);

for (const x of [.52,.65,.75,.89]) {
 const error=Math.abs(profile[idx(x)]-desired(x));
 assert(error<=15, `12 adaptive filters should substantially preserve broad plateaus at x=${x} (error ${error.toFixed(1)} dB)`);
}
const rms = arr => Math.sqrt(arr.reduce((sum,v,i)=>sum+(v-desired(i/(arr.length-1)))**2,0)/arr.length);
assert(rms(profile24)<=rms(profile)+1, `24 filters should not be significantly worse than 12 (${rms(profile24).toFixed(1)} vs ${rms(profile).toFixed(1)})`);
const p = eq.plan({...patterned,bands:12},48000);
assert(p.filters.some(f=>f.type==='peaking' && f.gain!==0),'curve should generate frequency-selective peaking filters');
assert(p.filters.every(f=>f.frequency>0 && Number.isFinite(f.frequency) && Number.isFinite(f.gain) && Number.isFinite(f.q)),'all parameters finite');
assert(p.filters.filter(f=>Math.abs(f.gain)>1e-6).length<=12,'hard native filter budget');
// A rapid brush gesture must stay on a cheap provisional graph until release.
const key='material:gesture-probe';eq.startGesture(key);
eq.set(key,{a:[...s],b:[...s],bands:24});
const moving=eq.get(key);
assert(moving.a.every((v,i)=>Math.abs(v-s[i])<1e-12),'gesture must store every source sample unchanged');
const tick=performance.now(),preview=eq.plan(moving,48000),elapsed=performance.now()-tick;
assert(preview.provisional===true && preview.fitError===null,'dragging should use the bounded quick preview');
eq.endGesture(key);
const finalized=eq.plan(eq.get(key),48000);
assert(!finalized.provisional && Number.isFinite(finalized.fitError),'release refits actual frequency response');
console.log('GESTURE PREVIEW (ms)',elapsed.toFixed(2));
const flat={...cfg,a:Array(360).fill(1),b:Array(360).fill(1),morph:.75};
assert(Math.max(...eq.response(flat,48000,120).map(x=>Math.abs(x-12)))<.1,'flat +12 profile should remain true broadband gain');
const neutral=eq.plan(cfg,48000);
assert(neutral.filters.every(f=>Math.abs(f.gain)<1e-6),'neutral curve stays bypass');
console.log('EQ ADAPTIVE FIT PASS; RMSE 12=',rms(profile).toFixed(2),'RMSE 24=',rms(profile24).toFixed(2));
