'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const txt=fs.readFileSync(path.join(root,'src/audio/07_governor_and_drums.js'),'utf8');
const start=txt.indexOf('function QCe(e,t,n,r,a,o){');
const end=txt.indexOf('function UCe(',start);
assert.ok(start>=0 && end>start,'Source missing live HUD cadence function');
const context={Me:(v,min,max)=>Math.max(min,Math.min(max,v))};
vm.runInNewContext(txt.slice(start,end)+';this.gate=QCe',context);
let now=100, last=now, saved=0, count=0;
for(let n=1;n<=200;n++) {
 now+=5;
 const hz=220+n*1.12;
 const next=context.gate(n,580,saved,last,now,()=>hz);
 saved=next.nextHz;
 if(next.shouldUpdate){last=now;count++;}
}
assert.ok(count>14&&count<=22,`1000ms of tiny raw motions must not trigger unbounded HUD renders: ${count}`);
let jumped=context.gate(250,580,saved,last,last+50,()=>1000);
assert.equal(jumped.shouldUpdate,true,'Large interval must reach HUD on next eligible 48ms tick');
const stage=fs.readFileSync(path.join(root,'src/rhythm/02_bass_and_rack.js'),'utf8');
assert.ok(stage.includes('e.updateFocusCursor(n,r,"mouse")'),'Free cursor source is missing');
assert.ok(stage.includes('cursorAtClick={x:n,y:e.commitResonanceCursorY(r,'),'MouseDown must capture click pitch');
assert.ok(stage.includes('e.spawnNexusRipple(void 0,cursorAtClick)'),'Wave launch must keep click snapshot');
console.log('PASS L8 bounded HUD renders:',count,'per 200 5ms movements; free focus and click snapshot unchanged');
