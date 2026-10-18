'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const emilia=read('src/forge/emilia/02_lab_ui.js'),css=read('styles/22_emilia3.css');
// F4.3.12 supersedes the older SVG wave layer with a stable HTML compositor overlay.
assert.match(emilia,/function notifyPreviewSettled\(state\)/);
assert.match(emilia,/className:'emilia-b-ripple-overlay','data-emilia-ripple-layer':'true'/);
assert.equal((emilia.match(/'data-emilia-ripple-layer'/g)||[]).length,1);
assert(!emilia.includes('setRipples'),'No React-managed ripple state');
assert.match(css,/@keyframes emilia-b-ripple-flow/);
console.log('PASS Emilia isolated HTML compositor waves and delayed release hook');

// Run the exact F4.3.11 pitch-resolution function, with a deterministic tuning registry stub.
const src=read('src/runtime/instrument/12_rhythm_and_bass_editor.js');
const start=src.indexOf('function __f4311PsyRatioFromSemitones('),end=src.indexOf('const Lw=',start);
assert(start>=0&&end>start);
const ctx={Math,Number,Array,console,hc:id=>/^(12|19|31)edo$|^bp$/.test(id)?{id}:null,
 Kp:id=>id==='ji'?[0,203.9,315.6,386.3,498,551.3,701.9,813.7,840.5,884.3,968.8,1088.3]:id==='bp'?Array.from({length:13},(_,i)=>i*Math.log2(3)*1200/13):Array.from({length:parseInt(id)||12},(_,i)=>1200*i/(parseInt(id)||12)),
 vF:id=>id==='bp'?1200*Math.log2(3):1200};
vm.createContext(ctx);vm.runInContext(src.slice(start,end)+';globalThis.psy=__f4311PsyRatioFromSemitones',ctx);
const ratio=ctx.psy;
for(const tuning of ['12edo','19edo','31edo','ji','bp','invalid']){
 const expected=Math.pow(2,(7-24)/12);
 assert.equal(ratio(7,-2,'classic-semitone',tuning),expected,'Existing PsyBass voice stays bit-exact with Classic');
}
const follow31=ratio(7,-2,'follow-grid','31edo');
const nativeCents=(Math.log2(follow31)*1200+2400);
const expected31=Math.round(700/1200*31)*1200/31;
assert(Math.abs(nativeCents-expected31)<1e-8,`31-EDO snapped fifth: ${nativeCents}`);
assert.notEqual(follow31,ratio(7,-2,'classic-semitone','31edo'));
assert(Math.abs(ratio(7,-2,'follow-grid','ji')/Math.pow(2,-2)-1.5)<.005,'JI uses the nearest 3:2');
assert.equal(ratio(7,-2,'follow-grid','invalid'),ratio(7,-2,'classic-semitone','invalid'),'Unrecognized tuning is backwards-compatible');
assert(ratio(-5,-2,'follow-grid','19edo')>0);
console.log('PASS Classic semitone bit identity; opt-in 31-EDO, 19-EDO, JI and BP tuning relationships');

// Test the actual main-room realtime note handler (keeps legacy fallback for already-cached/old Psy patterns).
const main=read('src/rhythm/04_workspace_and_transport.js'),d=main.indexOf('function DPe(e){'),dEnd=main.indexOf('const NPe=',d);assert(d>0&&dEnd>d);
const scheduler={Math,Rp:(v,min,max)=>Math.max(min,Math.min(max,v))};vm.createContext(scheduler);
vm.runInContext(main.slice(d,dEnd)+';globalThis.play=DPe',scheduler);
const active={active:true,semitone:7,octave:-2,length:.5,accent:1};
function play(step){let event; scheduler.play({pattern:{swing:0,rootHz:220,steps:[step]},step:0,time:1,bassLevel:.3,quantizeBpm:120,playBassNote:(...x)=>event=x});return event;}
const legacy=play(active),native=play({...active,pitchRatio:follow31});
assert.equal(legacy[1],220*Math.pow(2,(7-24)/12));
assert.equal(native[1],220*follow31);
assert.equal(legacy[0],native[0]);assert.equal(legacy[3],native[3]);
console.log('PASS Main-room bass scheduler honors precomputed pitch but preserves timing, dynamics and legacy pattern fallback');

for(const key of ['psyBassPitchMode','pitchMode:e.pitchMode,tuningId:e.tuningId','pitchRatio??Math.pow(2','PsyBass interval interpretation'])
 assert(src.includes(key)||main.includes(key)||read('src/rhythm/03_live_drum_bodies.js').includes(key),`UI/config/runtime path ${key}`);
assert.match(main,/e\.currentPattern\.pitchMode/,'Psy cache invalidates when tuning policy changes');
assert.match(main,/pitchMode:c\.psyBassPitchMode,tuningId:c\.gridTuning/,'Scheduler receives global grid and selected interpretation');
console.log('PASS PsyBass UI, generation, saved-clip ratios and live transport are wired');
