'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../../../src/quickrack/equalizer/eq-core.js'),'utf8');
const s={localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},requestAnimationFrame:()=>1,console,Math,Number,Array,Object,JSON,Set,WeakMap,WeakSet,Map,Date,setTimeout,clearTimeout};
vm.runInNewContext(code+'\nglobalThis.eq=__XenEQ;',s);const eq=s.eq;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const metrics={filters:0,connected:0,disconnected:0};
function parm(){return {value:0,setTargetAtTime(v){this.value=v},cancelScheduledValues(){},cancelAndHoldAtTime(){}}}
function node(type){const n={connect(){metrics.connected++},disconnect(){metrics.disconnected++}};n.gain=parm();if(type==='filter'){n.type='peaking';n.frequency=parm();n.Q=parm()}return n}
const ctx={state:'running',sampleRate:48000,currentTime:0,createGain:()=>node('gain'),createBiquadFilter(){metrics.filters++;return node('filter')},addEventListener(){},removeEventListener(){}};
const make=(key,bands)=>{eq.set(key,{mode:'raster',bands,a:Array(360).fill(1),b:Array(360).fill(1)});return eq.create(ctx,key)};
async function main(){
 const silent=eq.create(ctx,'material:unused');
 assert.equal(silent.filterCount,0,'neutral EQ should create no Biquad nodes');
 const a=make('material:trackA',12),b=make('material:trackB',12);
 assert.equal(metrics.filters,24,'two 12-band tracks should need only 24 Biquads total, not 48');
 assert.equal(a.filterCount+b.filterCount,24);
 eq.set('material:trackA',{enabled:false});eq.refresh();
 await sleep(190);
 assert.equal(a.filterCount,0,'bypassed track should release the DSP chain after its gain fade');
 assert.equal(b.filterCount,12,'other track remains routed');
 eq.set('material:trackA',{enabled:true});eq.refresh();
 assert.equal(a.filterCount,12,'re-enable allocates just the selected budget');
 eq.set('material:trackB',{bands:4});eq.refresh();
 assert.equal(b.filterCount,4,'new graph uses 4 filters while older branch fades');
 await sleep(190);
 const freed=metrics.disconnected;
 assert.ok(freed>=12,'retired 12-band chain should be disconnected after crossfade');
 eq.set('material:trackB',{enabled:false});eq.refresh();
 await sleep(190);
 assert.equal(b.filterCount,0);
 a.dispose();b.dispose();silent.dispose();
 assert.equal(eq.diagnostics().filters,0);
 assert.equal(eq.diagnostics().devices,0);
 console.log('PASS EQ audio budget, idle bypass, 12→4 crossfade, disposal; created',metrics.filters,'total native filters across transitions');
}
main().catch(e=>{console.error(e);process.exitCode=1});
