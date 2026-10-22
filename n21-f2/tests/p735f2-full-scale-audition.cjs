'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/mix/03_meta_menu.js','utf8');
const start=src.indexOf('function __xenMetaGridPreviewPitches('),end=src.indexOf('const __XenMetaAudition=',start);
assert(start>=0&&end>start,'grid audition function exists');
const scaleSteps={
  '12edo': Array.from({length:12},(_,i)=>i*100),
  '17edo': Array.from({length:17},(_,i)=>i*1200/17),
  'bp': Array.from({length:13},(_,i)=>i*1901.955/13),
  'irregular':[0,101,305,502,699,902,1101]
};
const ctx=vm.createContext({Kp:id=>scaleSteps[id]||[],AF:id=>id==='bp'?3:2,Number,Math,
 Fx:()=>[110,220]});
vm.runInContext(src.slice(start,end)+'\nglobalThis.compute=__xenMetaGridPreviewPitches',ctx);
for(const [id,expectedCount,period] of [['12edo',13,2],['17edo',18,2],['bp',14,3],['irregular',8,2]]){
 const p=Array.from(ctx.compute(110,id));
 assert.equal(p.length,expectedCount,`${id}: play every step, no skipping`);
 assert.ok(Math.abs(p[0]-110)<1e-6);
 assert.ok(Math.abs(p.at(-1)-110*period)<1e-6);
 for(let i=1;i<p.length;i++)assert.ok(p[i]>p[i-1],id+' strictly ascending at '+i);
 if(id==='12edo')assert.ok(Math.abs(p[1]-110*2**(1/12))<1e-4);
}
assert.equal(ctx.compute(0,'12edo').length,0);
assert.equal(ctx.compute(110,'missing').length,0);
console.log('PASS full scale ascending with actual Kp steps, 12/17 EDO, BP tritave, irregular intervals, no shortcut');
