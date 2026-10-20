const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('/mnt/data/workp711/base/n21-f2/src/mix/01_pan.js','utf8').split('function __PanVolume')[0];
class Param {constructor(){this.value=0;this.calls=[]}setTargetAtTime(...a){this.calls.push(a);this.value=a[0]}cancelScheduledValues(){}}
const nodes=[];const ctx={state:'running',currentTime:3,createStereoPanner(){const n={pan:new Param(),connect(t){this.to=t},disconnect(){}};nodes.push(n);return n},createGain(){const n={gain:new Param(),connect(t){this.to=t},disconnect(){}};nodes.push(n);return n},addEventListener(){},removeEventListener(){}};
const sandbox={localStorage:{getItem(){return null},setItem(){}},window:{},Object,WeakMap,Set,Map};vm.createContext(sandbox);vm.runInContext(source+';globalThis.pan=__XenPan;',sandbox);
const target={};const k=sandbox.pan.route(ctx,'keyboard',target),w=sandbox.pan.route(ctx,'wave',target);
assert.notStrictEqual(k,w);assert.strictEqual(k.to.to,target);assert.strictEqual(w.to,target);
assert.strictEqual(k.to.gain.value,1);sandbox.pan.setKeyboardExpression(.75);assert.strictEqual(k.to.gain.value,.75);assert.strictEqual(w.to,target);sandbox.pan.setKeyboardExpression(1.3);assert.strictEqual(k.to.gain.value,1.3);assert.strictEqual(sandbox.pan.route(ctx,'keyboard',target),k);
console.log('PASS keyboard-only expression gain isolation + live update + route reuse');
