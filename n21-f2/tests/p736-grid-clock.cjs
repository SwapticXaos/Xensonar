'use strict';
// P7.36's rolling-lookahead contract was superseded by P7.37's single-buffer
// strategy. This regression guards a dangerous pending-render cancellation race.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('src/app/forge/01_room_shell.js','utf8');
const begin=src.indexOf('/* P7.37: render the ENTIRE saved tuning to one native audio buffer before');
const end=src.indexOf('const{initialOvertonesByPreset:Oa',begin);
assert(begin>=0&&end>begin);
let provider,resolveRender,started=0,finished=0,created=0;
const param=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
const node=()=>({connect(){return this},disconnect(){}});
const ctx={state:'running',sampleRate:48000,currentTime:5,destination:node(),createBufferSource(){created++;return {...node(),start(){started++},stop(){},onended:null}}};
class OfflineAudioContextFake{
 constructor(){this.destination=node()}
 createGain(){return {...node(),gain:param()}}
 createBiquadFilter(){return {...node(),frequency:param(),Q:param()}}
 createOscillator(){return {...node(),frequency:param(),start(){},stop(){}}}
 startRendering(){return new Promise(resolve=>resolveRender=resolve)}
}
const sandbox={P:{useEffect:f=>f()},__XenMetaAudition:{register:(kind,x)=>{provider=x;return ()=>{}}},__xenMetaGridPreviewPitches:()=>[100,110,120],Tt:{current:{gridBase:100}},Bs:async()=>ctx,gL:()=>[{freqMul:1,delay:0,gainMul:.66,waveform:'triangle'}],OfflineAudioContext:OfflineAudioContextFake,__XenPan:{route:()=>ctx.destination},hi:()=>ctx.destination,Promise,Number,Math,console};
vm.runInNewContext(src.slice(begin,end),sandbox);
(async()=>{
 const stop=provider.start({id:'12edo'},()=>finished++);
 await new Promise(r=>setImmediate(r));
 assert.equal(typeof resolveRender,'function','offline render must be pending');
 stop();
 resolveRender({duration:1});
 await new Promise(r=>setImmediate(r));
 assert.equal(created,0,'late PCM result after Stop must never allocate a live source');
 assert.equal(started,0,'late PCM result after Stop must never play');
 assert.equal(finished,0,'cancelled playback must not emit natural completion');
 console.log('PASS P7.37 cancelled offline render cannot restart old preview after a delayed Promise');
})().catch(e=>{console.error(e);process.exitCode=1});
