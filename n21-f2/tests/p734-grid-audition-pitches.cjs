'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/mix/03_meta_menu.js','utf8');
const start=src.indexOf('function __xenMetaGridPreviewPitches('),end=src.indexOf('const __XenMetaAudition=',start);
assert(start>=0&&end>start);
const ctx=vm.createContext({
 Kp:id=>{const divisions=id==='tritave'?13:id==='micro'?53:12;const cents=1200*Math.log2(id==='tritave'?3:2);return Array.from({length:divisions},(_,i)=>i*cents/divisions)},
 AF:id=>id==='tritave'?3:2,Number,Math
});
vm.runInContext(src.slice(start,end)+'\nglobalThis.compute=__xenMetaGridPreviewPitches',ctx);
for(const [id,steps,period] of [['12edo',12,2],['tritave',13,3],['micro',53,2]]){
 const result=ctx.compute(110,id);
 assert.equal(result.length,steps+1,`Every ${id} scale step including terminal period`);
 assert(Math.abs(result[0]-110)<1e-6);
 assert(Math.abs(result.at(-1)-110*period)<1e-4);
 for(let i=1;i<result.length;i++)assert(result[i]>result[i-1],id+' ascending pitch order');
}
assert.equal(ctx.compute(0,'12edo').length,0);
assert.match(fs.readFileSync('src/app/forge/01_room_shell.js','utf8'),/__XenMetaAudition\.register\('grid'/);
console.log('PASS real saved tuning steps: 12-EDO 13 notes, tritave 14 notes, 53-EDO 54 notes (none skipped)');
