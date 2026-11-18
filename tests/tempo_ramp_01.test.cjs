// TEMPO-RAMP-01: from the current Live Room tempo to X BPM in Y bars, through the slider's own setter (whole BPM, one call per step).
const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','src/runtime/instrument/09_monitoring_and_manual_patterns.js'),'utf8');
const a=src.indexOf('const __XenTempoRamp='),b=src.indexOf('function __XenTempoRampControl');assert(a>0&&b>a);
function sim(){let now=0;const q=[];const clock={now:()=>now};
  const st=(fn,ms)=>{q.push({t:now+ms,fn});return q.length};const ct=()=>{};
  const R=new Function('performance','setTimeout','clearTimeout',src.slice(a,b)+';return __XenTempoRamp')(clock,st,ct);
  const runFor=ms=>{const end=now+ms;while(q.length){q.sort((x,y)=>x.t-y.t);if(q[0].t>end)break;const e=q.shift();now=e.t;e.fn()}now=end};return {R,runFor,time:()=>now}}
test('reaches the target in whole BPM steps, one setter call per step, monotonic',()=>{
  const {R,runFor}=sim(),calls=[];R.start({from:120,to:90,bars:4,set:v=>calls.push(v)});runFor(60000);
  assert.strictEqual(calls.at(-1),90);assert.strictEqual(R.snapshot(),null,'finished');
  assert.deepStrictEqual(calls,Array.from({length:30},(_,i)=>119-i),'119 … 90, each once');
});
test('the length is counted in beats at the tempo actually set (4 beats per bar)',()=>{
  const {R,runFor,time}=sim();let done=null;R.subscribe(()=>{if(!R.snapshot()&&done===null)done=time()});R.start({from:60,to:120,bars:2,set:()=>{}});runFor(60000);
  // 8 beats with the tempo rising evenly per beat from 60 to 120: about 8*60/90 s (rounded steps, 40 ms ticks)
  assert.ok(done>5000&&done<5900,'about 5.3 s, got '+done);
});
test('stop() ends it at once; same tempo or zero bars sets the target directly; range 40..240',()=>{
  const {R,runFor}=sim(),calls=[];R.start({from:100,to:140,bars:8,set:v=>calls.push(v)});runFor(1500);const n=calls.length;R.stop();runFor(20000);
  assert.ok(n>0&&calls.length===n&&R.snapshot()===null,'nothing after stop');
  const c2=[];R.start({from:100,to:100,bars:4,set:v=>c2.push(v)});assert.deepStrictEqual(c2,[100]);
  const c3=[];R.start({from:100,to:999,bars:0,set:v=>c3.push(v)});assert.deepStrictEqual(c3,[240]);
});
