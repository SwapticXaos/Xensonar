'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const text=fs.readFileSync('src/app/forge/01_room_shell.js','utf8');
const begin=text.indexOf('/* P7.37: render the ENTIRE saved tuning to one native audio buffer before');
const end=text.indexOf('const{initialOvertonesByPreset:Oa',begin);
assert(begin>=0&&end>begin,'grid audition effect exists');
const starts=[],offlineStarts=[],queued=[];let provider=null,finished=0,boot=0,offlineCount=0,rendered=0,liveOsc=0,stopCount=0,now=5;
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}});
function node(){return {connect(){return this},disconnect(){}}}
class FakeOfflineContext{
 constructor(channels,frames,sampleRate){offlineCount++;this.numberOfChannels=channels;this.length=frames;this.sampleRate=sampleRate;this.destination=node()}
 createGain(){return {...node(),gain:param()}}
 createBiquadFilter(){return {...node(),frequency:param(),Q:param()}}
 createOscillator(){return {...node(),type:'sine',frequency:param(),start(t){offlineStarts.push(t)},stop(){}}}
 async startRendering(){rendered++;return {duration:this.length/this.sampleRate,numberOfChannels:1,getChannelData:()=>new Float32Array(1)}}
}
const ctx={state:'running',sampleRate:48000,get currentTime(){return now},destination:node(),createOscillator(){liveOsc++;return {...node(),frequency:param(),start(t){starts.push(['osc',t])},stop(){}}},createGain(){return {...node(),gain:param()}},createBiquadFilter(){return {...node(),frequency:param(),Q:param()}},createBufferSource(){return {...node(),buffer:null,onended:null,start(t){starts.push(['buffer',t])},stop(){stopCount++;this.onended?.()}}}};
const notes=Array.from({length:20},(_,i)=>110*Math.pow(2,i/19));
const context={P:{useEffect:f=>f()},__XenMetaAudition:{register:(k,p)=>{assert.equal(k,'grid');provider=p;return ()=>{}}},__xenMetaGridPreviewPitches:()=>notes,Tt:{current:{gridBase:110}},Bs:async()=>{boot++;return ctx},gL:id=>{assert.equal(id,'bowed_glass');return [{freqMul:1,delay:0,gainMul:.66,waveform:'triangle'},{freqMul:2.01,delay:.06,gainMul:.24,waveform:'sine'},{freqMul:.5,delay:.03,gainMul:.14,waveform:'sine'}]},OfflineAudioContext:FakeOfflineContext,hi:()=>ctx.destination,__XenPan:{route:()=>ctx.destination},setTimeout:f=>{queued.push(f);return queued.length},clearTimeout:()=>{},console,Promise,Number,Math};
vm.runInNewContext(text.slice(begin,end),context);
(async()=>{
 const stop=provider.start({id:'19edo'},()=>finished++);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(boot,1,'must initialize audio only on preview click');
 assert.equal(offlineCount,1,'render whole scale using OfflineAudioContext');
 assert.equal(rendered,1,'full buffer must be ready before playback');
 assert.equal(offlineStarts.length,notes.length*3,'all 20 tuning steps (3 partials each) must be prepared');
 assert.equal(liveOsc,0,'zero per-note oscillators in LIVE audio graph');
 assert.equal(starts.filter(x=>x[0]==='buffer').length,1,'single live buffer source holds the whole performance');
 assert.equal(queued.length,0,'no main-thread timer governs attacks');
 for(let i=1;i<notes.length;i++)assert(Math.abs(offlineStarts[i*3]-offlineStarts[(i-1)*3]-.155)<1e-6,'all onsets on uniform audio clock');
 now=8;queued.splice(0).forEach(f=>f());
 assert.equal(starts.length,1,'main-thread stalls must not schedule new per-note attacks');
 stop();assert.equal(stopCount,1,'stop must terminate only its buffer source');
 assert.equal(finished,0,'manual stop must not fire finished callback');
 console.log('PASS full 19-EDO offline Bowed Glass rendered; one audio buffer source, no JS attack chain, scoped stop');
})().catch(e=>{console.error(e);process.exitCode=1});
