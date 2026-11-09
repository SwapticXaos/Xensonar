'use strict';
// Targeted RED/GREEN: UI curve editors are paint gestures, unlike the A/B slider.
// Real source and real EQ core in an isolated, deterministic timer harness.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-ui.js'),'utf8');
const core=fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-core.js'),'utf8');
const worklet=fs.readFileSync(path.join(root,'src/quickrack/equalizer/eq-worklet.js'),'utf8');
const editor=ui.match(/const editor=\(name,field,view\)=>[\s\S]*?\},name\);/);
assert(editor,'EQ curve editor missing');
assert.match(editor[0],/onPointerDown:\(\)=>__XenEQ\.startGesture\(sourceKey\)(?!,'morph')/,
 'EQ curve drag must start paint lifecycle, not the direct Morph slider lifecycle');
assert.match(ui,/const begin=\(\)=>\{if\(!gesture\.current\)\{gesture\.current=true;__XenEQ\.startGesture\(sourceKey,'morph'\)/,
 'Real A/B morph slider must retain its immediate morph lifecycle');
let currentTime=0,seq=0;const jobs=new Map();
const scope={console,window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},
 requestAnimationFrame:()=>1,setTimeout(fn,delay){const id=++seq;jobs.set(id,{at:currentTime+delay,delay,fn});return id},
 clearTimeout(id){jobs.delete(id)}};
vm.runInNewContext(core+'\nglobalThis.eq=__XenEQ;',scope);
const eq=scope.eq,key='material:paint-regression';
function hold(){return [...jobs.values()].find(j=>j.delay===240||j.delay===160)}
eq.startGesture(key);eq.set(key,{a:Array.from({length:360},(_,i)=>Math.sin(i/6)*.4)});
assert.equal(hold()?.delay,240,'paint updates must sample latest at 240 ms');
eq.endGesture(key);
assert.equal(hold()?.delay,160,'paint release must replace remaining hold with 160 ms settle');
assert.equal(eq.diagnostics().morphHotKeys,0,'curve painter may not become a morph-hot gesture');
const morph='material:direct-morph';
eq.startGesture(morph,'morph');eq.set(morph,{morph:.59});
assert.equal(eq.audioIntent(morph),'morph','A/B slider must retain fast audio intent');
assert(![...jobs.values()].some(j=>j.delay===240),'morph control must not enter painter hold');
eq.endGesture(morph);assert.equal(eq.diagnostics().morphHotKeys,0);
// Exact Nailed3 transition budget for 'paint' and 'settle', preserve morph.
assert.match(worklet,/this\.transitionWarm=m\.intent==='morph'\?Math\.round\(sampleRate\*\.012\):\['paint','settle'\]\.includes\(m\.intent\)\?Math\.round\(sampleRate\*\.025\)/);
assert.match(worklet,/this\.transitionFade=m\.intent==='morph'\?Math\.round\(sampleRate\*\.020\):\['paint','settle'\]\.includes\(m\.intent\)\?Math\.round\(sampleRate\*\.025\)/);
// Nailed3 defensive DSP invariants stay unchanged.
assert.match(worklet,/if\(!this\.phase&&this\.samePlan\(this\.banks\[this\.active\],m\)\)/);
assert.match(worklet,/if\(this\.samePlan\(this\.banks\[this\.active\],m\)\)this\.stats\.unchanged\+\+/);
console.log('PASS Nailed3 Paint Restoration: curve lifecycle 240/160 ms, direct morph unchanged, DSP 25/25 ms, samePlan intact');
