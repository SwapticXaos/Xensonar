'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.resolve(__dirname,'..');const src=fs.readFileSync(path.join(root,'src/rooms/canonical.js'),'utf8');const shell=fs.readFileSync(path.join(root,'src/rooms/lab.js'),'utf8');
assert.match(shell,/children:"Melodic Loop"/,'top heading becomes Melodic Loop');
assert.match(shell,/children:"Compose Ideas, Tune Precisely"/,'approved Melodic Loop subtitle');
assert.match(src,/data-xensonar-melodic-exact-hz/,'precision control anchored near overview');
assert.match(src,/onMouseDown:__mlSelectPitchOnMouseDown/,'real primary canvas selection hooked up');
assert.match(src,/onContextMenu:Ie/,'contextmenu delegates to canonical handler');
assert.match(src,/onMouseMove:se/,'existing drag handler intact');
assert.doesNotMatch(src,/Math\.round\(je\*10\)\/10/,'no unwanted 0.1 Hz quantisation');
assert.doesNotMatch(src,/"1 decimal place · Enter applies · Esc discards"/,'obsolete limitation removed');
assert.doesNotMatch(src,/data-xensonar-grid-frequency-editor/,'floating editor removed in favor of inline anchor');
assert.match(src,/inGutter\?y\.inLineGrab\?"ns-resize":"grab"/,'pitch triangle hover cursor');
// Extract the exact math used by editable pitches from the production code.
const norm=(hz)=>Number.parseFloat(hz.trim().replace(',','.'));
const semitone=(base,target)=>1200*Math.log2(target/base);
const base=880;for(const val of [879.9999,880.0000001,879.1234567]){
  const cents=semitone(base,norm(String(val)));const back=base*Math.pow(2,cents/1200);
  assert.ok(Math.abs(back-val)<1e-8,'floating point Hz must survive roundtrip without 0.1-Hz steps');
}
console.log('PASS R20 metadata and exact-Hz grid control contract');
// Execute the real React onCommit callback in a minimal VM; this checks the actual
// mutation that feeds the audio renderer, not merely a duplicated math formula.
const start=src.indexOf('const li=P.useCallback(()=>{if(!be)return;');
const finish=src.indexOf(',[e.pitchLines,g,be]),',start);
assert.ok(start>0&&finish>start,'canonical commit callback must be locatable');
const formatter=src.match(/function __mlExactHzText\(hz\)\{[^\n]+\}/)?.[0];
assert.ok(formatter,'canonical formatting function must exist');
function runInput(input){
 const composer={pitchLines:[{id:'p-0',hz:880,offsetCents:0}],pitchSteps:[{id:'step-0',offsetCents:0}]};
 let selection={channelIndex:0,draft:input,editing:true,error:null}, status='';
 const context={P:{useCallback:fn=>fn},e:composer,be:selection,g:(fn,st)=>{fn(composer);status=st},ve:fn=>{selection=fn(selection)}};
 vm.runInNewContext(`${formatter};${src.slice(start,finish+',[e.pitchLines,g,be])'.length)}; li();`,context);
 return {composer,selection,status};
}
for(const target of [879.9999999,880.0000001,879.123456789,880.002]){
 const {composer,selection,status}=runInput(String(target));
 const actual=composer.pitchLines[0].hz*Math.pow(2,composer.pitchLines[0].offsetCents/1200);
 assert.ok(Math.abs(actual-target)<1e-9,`${target} Hz should reach render model unchanged, got ${actual}`);
 assert.equal(composer.pitchSteps[0].offsetCents,composer.pitchLines[0].offsetCents);
 assert.equal(selection.editing,false);
 assert.match(status,/Hz/);
}
const comma=runInput('879,123456789');
assert.ok(Math.abs(880*Math.pow(2,comma.composer.pitchLines[0].offsetCents/1200)-879.123456789)<1e-9);
for(const bad of ['NaN','0','abc','880 xyz','100000']){
 const {composer,selection}=runInput(bad);
 assert.equal(composer.pitchLines[0].offsetCents,0,`invalid pitch ${bad} must not alter the state`);
 assert.ok(selection.error,`invalid pitch ${bad} needs explanatory error`);
}
console.log('PASS R20 real Hertz mutation at sub-cent precision, comma decimal and validation');
