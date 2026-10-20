'use strict';
// Exercise the actual XenSonar keyboard-expression React hook, not a duplicate implementation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||require('node:path').resolve(__dirname,'..');
const src=fs.readFileSync(root+'/src/rhythm/04_workspace_and_transport.js','utf8');
const start=src.indexOf('function Zke('),end=src.indexOf('function ePe(',start);
assert(start>0&&end>start,'Keyboard expression hook remains resolvable');
const frames=new Map();let token=0,now=0,refs=[],states=[],stateAt=0,refAt=0,effects=[],cleanups=[];
const P={useRef:v=>refs[refAt++]??(refs[refAt-1]={current:v}),useState:v=>{
  const i=stateAt++;if(!(i in states))states[i]=v;return[states[i],set=>{states[i]=typeof set==='function'?set(states[i]):set}];
},useCallback:f=>f,useEffect:f=>effects.push(f)};
const context={P,window:{addEventListener(){},removeEventListener(){}},document:{addEventListener(){},removeEventListener(){},hidden:false},requestAnimationFrame:f=>{const id=++token;frames.set(id,f);return id},cancelAnimationFrame:id=>frames.delete(id)};
vm.createContext(context);vm.runInContext(src.slice(start,end)+';this.make=Zke;',context);
let hold;function render(){for(const f of cleanups)f?.();cleanups=[];stateAt=0;refAt=0;effects=[];hold=context.make(true);for(const f of effects)cleanups.push(f())}
function step(n=1){for(let i=0;i<n;i++){now+=16.667;const callbacks=[...frames.values()];frames.clear();for(const cb of callbacks)cb(now)}}
function release(){hold.setSwellHoldActive(false);hold.setDampHoldActive(false);render();step(24);}
render();assert.equal(hold.resonanceActionBadges.expressionMode,'pedal','default is temporary expression pedal');
hold.setSwellHoldActive(true);render();step(22);assert(hold.waveSoundSwellRef.current>.2,'B increases level while held');
hold.setDampHoldActive(true);render();step(4);assert.equal(hold.resonanceActionBadges.expressionMode,'knob','pressing both toggles mode');
let comboLevel=hold.waveSoundSwellRef.current;
hold.setSwellHoldActive(true);hold.setDampHoldActive(true);render();step(8);
assert.equal(hold.resonanceActionBadges.expressionMode,'knob','repeated keydown does not toggle again');
assert.equal(hold.waveSoundSwellRef.current,comboLevel,'combo does not modify expression');
hold.setSwellHoldActive(false);render();step(9);
assert.equal(hold.waveSoundSwellRef.current,comboLevel,'one remaining chord key does not damp');
release();hold.setSwellHoldActive(true);render();step(15);const knobLevel=hold.waveSoundSwellRef.current;
assert(knobLevel>.1,'knob ramps up');hold.setSwellHoldActive(false);render();step(22);
assert.equal(hold.waveSoundSwellRef.current,knobLevel,'knob keeps level after release');
// Reverse order: Left Alt then B should switch back to pedal once.
hold.setDampHoldActive(true);hold.setSwellHoldActive(true);render();step(4);
assert.equal(hold.resonanceActionBadges.expressionMode,'pedal');
assert.equal(hold.waveSoundSwellRef.current,0,'switching mode resets stale knob trim');
release();hold.setDampHoldActive(true);render();step(20);assert(hold.waveSoundSwellRef.current<-.1,'pedal damp works');
hold.setDampHoldActive(false);render();step(100);assert(Math.abs(hold.waveSoundSwellRef.current)<.003,'pedal returns to neutral');
console.log('PASS P7.6 pedal/knob toggle on B+LeftAlt, single-shot, chord suppression, and expression semantics');
