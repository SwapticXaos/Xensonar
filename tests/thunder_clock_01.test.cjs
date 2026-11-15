// THUNDER-CLOCK-01 (unit): which lanes get exact Thunder timing, and the audio time of a pulse (one anchor per gesture, like Nodal's clock).
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src/runtime/instrument/09_monitoring_and_manual_patterns.js'),'utf8');
const a=src.indexOf('const __XEN_THUNDER_EXACT_AHEAD_MS'),b=src.indexOf('function Nie(e){');
const api=new Function('performance','globalThis',src.slice(a,b)+';return {AHEAD:__XEN_THUNDER_EXACT_AHEAD_MS,lanes:__xenThunderExactLanes,at:__xenThunderAtSec,synths:__XenThunderSynths,cancel:__xenThunderCancel,track:__xenThunderTrack}');

test('exact lanes: every synth except Nodal (own clock), samples (own lookahead) and Psy Lab (no Thunder); loose = none',()=>{
  const {lanes}=api({now:()=>0},{});const pick=(w,k)=>lane=>lane==='klaviatur'?k:w;
  assert.deepStrictEqual(lanes({},pick('bell','entrophon:factory:x@1')),{wellenstart:true,klaviatur:true},'default (no stored value) is exact');
  assert.deepStrictEqual(lanes({thunderTiming:'exact'},pick('nodal:factory:troodle','sample:abc')),{wellenstart:false,klaviatur:false});
  assert.deepStrictEqual(lanes({thunderTiming:'exact'},pick('psylab:factory:Liquid Bell','entrophon')),{wellenstart:false,klaviatur:true});
  assert.strictEqual(lanes({thunderTiming:'loose'},pick('bell','bell')),null,'loose: the planner works exactly as before');
});

test('pulse time: one anchor per gesture and context, every pulse = anchor + its distance on the grid',()=>{
  let now=1000;const {at,AHEAD}=api({now:()=>now},{});assert(AHEAD>=100&&AHEAD<=200,"lead covers main-thread stalls: "+AHEAD);
  const ctx={currentTime:5};const g={startedAtMs:990};
  const t1=at(g,ctx,990+277.5);assert(Math.abs(t1-(5-0.01+0.2775))<1e-9,'anchor = audio time of the key-down: '+t1);
  now=1300;ctx.currentTime=5.31;/* the main thread and the audio clock drift a little: the anchor stays */
  const t2=at(g,ctx,990+555);assert(Math.abs((t2-t1)-0.2775)<1e-9,'exact grid distance between pulses, independent of when they are handed over');
  const ctx2={currentTime:1};assert(Math.abs(at(g,ctx2,990)-(1-0.31))<1e-9,'a new audio context gets a new anchor');
  assert.strictEqual(at(g,null,1000),null);assert.strictEqual(at({},ctx,1000),null);assert.strictEqual(at(g,ctx,NaN),null);
});

test('wiring: the planner hands exact pulses over at most AHEAD ms early; tones, Entrophon and the direct path take the start time',()=>{
  assert(/while\(\(exact\?gesture\.nextPulseAtMs:gesture\.nextPulseAtMs-interval\*\.45\)<=e\.nowMs\+horizon/.test(src),'exact lead is not widened by half an interval');
  assert(/horizon=exact\?__XEN_THUNDER_EXACT_AHEAD_MS:/.test(src));
  const rt=fs.readFileSync(path.join(__dirname,'..','src/audio/05_live_voice_runtime.js'),'utf8');
  assert(/audioStartSec:Number\.isFinite\(e\.thunderAtSec\)\?e\.thunderAtSec/.test(rt),'the tone start honours the pulse time');
  assert(/function Lxe\(e\)\{return\{legacy9061DirectGate:!0,touchGain:e\?\.touchGain\/\* HWKB-02 \*\/,thunderAtSec:e\?\.thunderAtSec/.test(rt),'the direct path keeps the pulse time');
  assert(/exactLanes:__xenThunderExactLanes\(o\.current,F\)/.test(rt));
});

test('synth registry: own clock / starts at / due time; a new synth plays Thunder at once (due time), one line makes it exact',()=>{
  const {synths,lanes}=api({now:()=>0},{});
  assert.deepStrictEqual(['nodal:factory:troodle','sample:x','entrophon','entrophon:factory:m@1','bell','psylab:factory:Liquid Bell','newsynth:pad'].map(synths.modeOf),['own-clock','own-clock','starts-at','starts-at','starts-at','due-time','due-time']);
  assert.deepStrictEqual(lanes({},l=>'newsynth:pad'),{wellenstart:false,klaviatur:false},'unknown synth: not started early');
  synths.register('newsynth','starts-at');assert.strictEqual(synths.modeOf('newsynth:pad'),'starts-at');assert.deepStrictEqual(lanes({},l=>'newsynth:pad'),{wellenstart:true,klaviatur:true});
  synths.register('newsynth','bogus');assert.strictEqual(synths.modeOf('newsynth:pad'),'starts-at','unknown modes are ignored');
});

test('cancel on release: only pulses that have not started are cut; started ones ring out',()=>{
  const {track,cancel}=api({now:()=>0},{});const ctx={currentTime:10};const cut=[];
  const tone=name=>({osc:{stop:t=>cut.push(name+'@'+t)},gain:{gain:{cancelScheduledValues(){},setValueAtTime(){}}}});
  const g={},list=[];list.push(tone('past'));track(g,ctx,9.99,list,0);const n=list.length;list.push(tone('soon'),tone('soon2'));track(g,ctx,10.08,list,n);
  assert.strictEqual(g.thunderPending.length,2);ctx.currentTime=10.02;assert.strictEqual(cancel(g),1,'one pulse cancelled');assert.deepStrictEqual(cut,['soon@10.022','soon2@10.022']);
  assert.strictEqual(g.thunderPending,null);assert.strictEqual(cancel(g),0);
  const g2={};track(g2,ctx,10.5,[{cut(){cut.push('fn')}}],0);cancel(g2);assert.strictEqual(cut.at(-1),'fn','a tone with its own cut() uses it');
});
