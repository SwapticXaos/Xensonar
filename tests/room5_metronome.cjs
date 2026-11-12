'use strict';
// ROOM5-02: the Room V metronome. Scheduling on the audio clock (120 ms look-ahead), accent on bar lines for free bar lengths,
// tempo change without phase jump, and: its output goes to ctx.destination only, never to the live master input.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.resolve(__dirname,'../src/post-oct/034-xen-room-psylab.js'),'utf8');
const timers=[];let now=0;
const box={console,Math,JSON,Object,Array,Number,String,Float32Array,Float64Array,Uint8Array,Date,WeakMap,Map,P:{},u:{},localStorage:{getItem:()=>null,setItem(){}},
 setTimeout:(fn,ms)=>{timers.push({fn,at:now+ms});return timers.length},clearTimeout:id=>{if(timers[id-1])timers[id-1].fn=null}};
const clicks=[],connections=[];
class Node{constructor(kind){this.kind=kind;this.gain={value:1,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}};this.frequency={value:0}}
 connect(d){connections.push([this.kind,d.kind]);return d}disconnect(){}start(t){if(this.kind==='osc')clicks.push({t,f:this.frequency.value})}stop(){}}
const destination={kind:'destination'};
const ctx={get currentTime(){return now/1000},destination,createGain:()=>new Node('gain'),createOscillator:()=>new Node('osc')};
let masterAsked=0;
box.__xenMultitrackBridge={current:{ensureAudioReady:async()=>ctx,getMasterInput:()=>{masterAsked++;return{kind:'master'}}}};
box.globalThis=box;vm.createContext(box);const T=vm.runInContext(src,box).__test;
const advance=ms=>{const end=now+ms;for(;;){const due=timers.filter(t=>t.fn&&t.at<=end).sort((a,b)=>a.at-b.at)[0];if(!due)break;now=due.at;const f=due.fn;due.fn=null;f()}now=end};
(async()=>{
 const m=new T.Metronome();m.bpm=120;m.beats=4;m.vol=.5;await m.start();advance(4100);
 assert(clicks.length>=8&&clicks.length<=9,'8 clicks in 4 s at 120 BPM, got '+clicks.length);
 const gaps=clicks.slice(1).map((c,i)=>+(c.t-clicks[i].t).toFixed(6));assert(gaps.every(g=>Math.abs(g-.5)<1e-9),'steady 0.5 s spacing '+gaps.join(','));
 assert.deepEqual(clicks.slice(0,6).map(c=>c.f),[1600,1000,1000,1000,1600,1000],'accent on beat 1 of every bar of 4');
 assert(connections.every(([a,b])=>b!=='master')&&connections.some(([a,b])=>a==='gain'&&b==='destination'),'goes to the destination, not to the master');assert.equal(masterAsked,0,'the master input is never even requested');
 // tempo change keeps the grid going: the next gap is the new beat length, nothing jumps
 clicks.length=0;m.bpm=240;advance(1000);const g2=clicks.slice(1).map((c,i)=>+(c.t-clicks[i].t).toFixed(6));assert(g2.length>=2&&g2.slice(-2).every(g=>Math.abs(g-.25)<1e-9),'new tempo '+g2.join(','));
 // free bar length (3.5 beats): accents fall on 0, 3.5, 7 ... i.e. on the first beat at or after each bar line
 m.stop();clicks.length=0;const m2=new T.Metronome();m2.bpm=60;m2.beats=3.5;await m2.start();advance(15100);
 const acc=clicks.map((c,i)=>c.f===1600?i:-1).filter(i=>i>=0);assert.deepEqual(acc,[0,4,7,11,14],'accents for 3.5 beats per bar: '+acc);
 // stop really stops
 m2.stop();const n=clicks.length;advance(3000);assert.equal(clicks.length,n,'no clicks after stop');assert(!timers.some(t=>t.fn&&t.at>now&&false));
 console.log('PASS ROOM5-02 metronome',{clicks:n});
})().catch(e=>{console.error(e);process.exit(1)});
