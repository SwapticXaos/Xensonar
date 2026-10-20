'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2]||'/mnt/data/P7_3_FINAL_REPLAY/n21-f2';
const src=fs.readFileSync(root+'/src/rhythm/04_workspace_and_transport.js','utf8');
const {start,end}= {start:src.indexOf('function Zke('),end:src.indexOf('function ePe(',src.indexOf('function Zke('))};
assert(start>0&&end>start);
let frames=new Map(),token=0,now=0,refs=[],states=[],stateAt=0,refAt=0,effects=[],cleanups=[];
const P={useRef:v=>refs[refAt++]??(refs[refAt-1]={current:v}),useState:v=>{
 const idx=stateAt++;if(!(idx in states))states[idx]=v;return[states[idx],set=>{states[idx]=typeof set==='function'?set(states[idx]):set}];
},useCallback:f=>f,useEffect:f=>{effects.push(f)}};
const context={P,window:{addEventListener(){},removeEventListener(){}},document:{addEventListener(){},removeEventListener(){},hidden:false},requestAnimationFrame:f=>{const id=++token;frames.set(id,f);return id},cancelAnimationFrame:id=>frames.delete(id)};
vm.createContext(context);vm.runInContext(src.slice(start,end)+';this.make=Zke;',context);
let hold;
function render(){for(const f of cleanups)f?.();cleanups=[];stateAt=0;refAt=0;effects=[];hold=context.make(true);for(const f of effects)cleanups.push(f());}
function step(){now+=16.667;const work=[...frames.values()];frames.clear();for(const f of work)f(now)}
function moveFrames(n){for(let i=0;i<n;i++)step()}
render();hold.setSwellHoldActive(true);render();moveFrames(25);
const rising=hold.waveSoundSwellRef.current;assert(rising>.1,`B must swell, saw ${rising}`);
hold.setSwellHoldActive(false);render();moveFrames(23);
assert(Math.abs(hold.waveSoundSwellRef.current)<.002,`B release must return to baseline, got ${hold.waveSoundSwellRef.current}`);
hold.setDampHoldActive(true);render();moveFrames(25);
const falling=hold.waveSoundSwellRef.current;assert(falling<-.1,`Left Alt must damp, got ${falling}`);
hold.setDampHoldActive(false);render();moveFrames(23);
assert(Math.abs(hold.waveSoundSwellRef.current)<.002,`Alt release must return to baseline, got ${hold.waveSoundSwellRef.current}`);
console.log('PASS P7.4 momentary B/Alt ramps and release-to-neutral');
