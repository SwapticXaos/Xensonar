const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const box={localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},requestAnimationFrame:()=>1,setTimeout,clearTimeout,console};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/quickrack/equalizer/eq-core.js'),'utf8')+'\nglobalThis.eq=__XenEQ',box);const eq=box.eq;
for(const rate of [44100,48000,96000])for(const bands of [4,12,24]){
 const a=Array.from({length:360},(_,i)=>i>90&&i<240?1:0),key='material:parity'+rate+bands;
 eq.startGesture(key);eq.set(key,{mode:'raster',bands,a,b:a});
 for(const drawing of [true,false]){
  if(!drawing)eq.endGesture(key);const cfg=eq.get(key),audio=eq.livePlan(cfg,rate,key),preview=eq.peekPlan(cfg,rate,key);
  assert.deepEqual(JSON.stringify(preview.filters),JSON.stringify(audio.filters));
  assert.equal(preview.provisional,false);assert(audio.bandError<.1);
  const r=eq.response(cfg,rate,2400,preview);const mid=r[Math.round(.5*2399)];assert(mid>9,`${bands} ${rate} plateau ${mid}`);
 }
}
console.log('PASS real preview/audio raster bank parity during/after gesture, 3 rates x3 band counts, calibrated plateau');
