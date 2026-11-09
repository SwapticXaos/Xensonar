'use strict';
// Executes the actual P10 component handlers and EQ core; DOM/native thumb behavior
// remains a separate browser gate.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const frames=new Map(),effects=[],workerMessages=[];let frameId=0,captured=0;
class WorkerStub{postMessage(m){workerMessages.push(m)}terminate(){}}
const box={console,Math,JSON,Map,Set,Float32Array,Float64Array,ArrayBuffer,Blob,Worker:WorkerStub,
 localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},setTimeout,clearTimeout,
 URL:{createObjectURL:()=> 'blob:eq-noop',revokeObjectURL(){}},
 requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},cancelAnimationFrame:id=>frames.delete(id),
 P:{useRef:value=>({current:value}),useLayoutEffect:fn=>fn(),useEffect:fn=>effects.push(fn())},
 u:{jsx:(type,props)=>({type,props})}};
vm.createContext(box);vm.runInContext(read('src/quickrack/equalizer/eq-core.js')+';globalThis.eq=__XenEQ;',box);
const ui=read('src/quickrack/equalizer/eq-ui.js'),start=ui.indexOf('function __XenEQMorph('),end=ui.indexOf('// One browser-wide',start);
assert(start>=0&&end>start);vm.runInContext(ui.slice(start,end)+';globalThis.Morph=__XenEQMorph;',box);
const key='material:noop-p10';box.eq.set(key,{mode:'raster',morph:.37,a:Array.from({length:360},(_,i)=>Math.sin(i/13)*.3),b:Array.from({length:360},(_,i)=>Math.cos(i/17)*.4)});
const before={config:JSON.stringify(box.eq.get(key)),plan:JSON.stringify(box.eq.peekPlan(box.eq.get(key),48000,key)),diagnostics:JSON.stringify(box.eq.diagnostics()),messages:workerMessages.length,frames:frames.size};
const {props}=box.Morph({sourceKey:key,value:.37});
const target={value:'0.37',setPointerCapture(){captured++}};
props.onPointerDown({pointerId:1,currentTarget:target});props.onChange({currentTarget:target});props.onPointerUp();
assert.equal(captured,1);assert.equal(frames.size,before.frames,'stationary press must not queue parameter changes');
assert.equal(JSON.stringify(box.eq.get(key)),before.config);
assert.equal(JSON.stringify(box.eq.peekPlan(box.eq.get(key),48000,key)),before.plan,'stationary press must retain exact filter response');
assert.equal(JSON.stringify(box.eq.diagnostics()),before.diagnostics,'stationary press must not enter live-morph ownership or invalidate fits');
assert.equal(workerMessages.length,before.messages);
target.value='.6';props.onPointerDown({pointerId:2,currentTarget:target});props.onChange({currentTarget:target});
assert.equal(box.eq.diagnostics().morphHotKeys,1,'real value change starts gesture');
assert.equal(frames.size,before.frames+1);props.onPointerUp();assert.equal(box.eq.get(key).morph,.6);assert.equal(box.eq.diagnostics().morphHotKeys,0);
for(const cleanup of effects)cleanup?.();
console.log('PASS actual EQ core + Morph handlers: stationary pointer unchanged, real edit/finish owned and released; browser DOM gate separate');
