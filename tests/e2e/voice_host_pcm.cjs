'use strict';
// VOICE-HOST-01: the resident drum/bass worklet voices must sound like the native node graphs they replace.
// Renders the same events twice in OfflineAudioContexts (48 kHz) inside the real app (probe build): once through the previous native
// nodes, once through the worklet, and compares sample by sample.
//  - Bass: the real playBassNote (OPe) with many voices, notes, glides, ghost/accent, grit (shaper on/off), tone, resonance, sub,
//    and a non-zero Bass Pitch (detune).
//  - Drums: prepared mono bodies with and without the hat envelope, open-hat choke, stereo samples with fade-in, decay cut and
//    tone low-pass, pans, start times between samples.
// Pass: residual ≥ 90 dB below the signal (float rounding), and no single sample off by more than 80 dB below the peak.
// Usage: node tests/e2e/voice_host_pcm.cjs dist/XenSonar_PROBE.html
const assert=require('node:assert/strict'),path=require('node:path');const {chromium}=require('playwright');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch();const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:60000});
 const r=await p.evaluate(async()=>{
  const ev=__xenProbe.draw.evalInBundle;const Host=ev('__XenLiveVoiceHost'),OPe=ev('OPe'),Pitch=ev('__XenBassPitch'),voices=Object.keys(ev('__f48BassVoices'));
  const SR=48000,SEC=6;
  const compare=(a,b)=>{let peak=0,ref=0,dif=0,max=0;for(let c=0;c<a.numberOfChannels;c++){const x=a.getChannelData(c),y=b.getChannelData(c);
   for(let i=0;i<x.length;i++){const d=x[i]-y[i];ref+=x[i]*x[i];dif+=d*d;peak=Math.max(peak,Math.abs(x[i]));max=Math.max(max,Math.abs(d))}}
   return {peak:+peak.toFixed(4),snrDb:dif?+(10*Math.log10(ref/dif)).toFixed(1):999,maxDiffDb:max?+(20*Math.log10(max)).toFixed(1):-999}};
  /* ---------------- bass ---------------- */
  const notes=[];let t=.05;const rnd=(s=>()=>(s=(s*1103515245+12345)%2147483648)/2147483648)(7);
  for(const v of voices)for(const grit of [0,.3,.75])for(let k=0;k<2;k++){
   notes.push({params:{bassVoice:v,bassTone:rnd(),bassGrit:grit,bassSub:rnd()*1.5,bassEnvelope:rnd()*2,bassResonance:rnd(),bassDecay:1},
    time:t,hz:[41.2,55,61.7,82.4,110,146.8][Math.floor(rnd()*6)],level:.4+rnd()*.5,dur:.08+rnd()*.35,accent:rnd(),opt:{glideToNext:rnd()<.4,ghost:rnd()<.3}});
   t+=.11;
  }
  const renderBass=async(useHost)=>{
   const ctx=new OfflineAudioContext(1,Math.ceil(t+.6)*SR,SR);Host.allowOffline=useHost;
   if(useHost){await Host.prepare(ctx);Host.bass(ctx,ctx.destination);for(let i=0;i<200&&!Host.status(ctx).tables;i++)await new Promise(k=>setTimeout(k,20))}
   const params={};const e={audioCtx:ctx,nexusParamsRef:{current:params},applyLiveAttack:false,bassDestination:ctx.destination,ensureFinalMixBus:()=>ctx.destination,enterHoldPsyFxEnabled:false,enterHoldRef:{current:false}};
   const owner=OPe(e);let viaHost=0;
   for(const n of notes){Object.assign(params,n.params);const res=owner.playBassNote(n.time,n.hz,n.level,n.dur,n.accent,n.opt);if(res&&res.nodeCount===0)viaHost++}
   if(useHost)await Host.bass(ctx,ctx.destination).sync();
   Host.allowOffline=false;const buf=await ctx.startRendering();return {buf,viaHost};
  };
  Pitch.set(37);
  const bassOld=await renderBass(false),bassNew=await renderBass(true);
  Pitch.set(0);
  /* ---------------- drums ---------------- */
  const mono=(len,f,decay)=>{const a=new Float32Array(len);for(let i=0;i<len;i++){a[i]=Math.sin(i*f)*Math.exp(-i/decay)*(1+.3*Math.sin(i*.37))}return a};
  const bodies=[mono(4000,.05,900),mono(9000,.013,2600),mono(2200,.4,500)];
  const stereo=[mono(12000,.021,4000),mono(12000,.027,3500)];
  const hits=[];t=.03;
  for(let i=0;i<60;i++){const kind=i%5;hits.push({kind,time:t+(i%3)*.37/SR,pan:(rnd()*2-1)*(i%4?1:0),level:.3+rnd(),body:i%3,decay:.2+rnd()*1.2,tone:i%2?rnd():1});t+=.07}
  const env={initialGain:1e-4,peakGain:.9,attackSec:.0016,targetGain:1e-4,targetTimeConstantSec:.03};
  const renderDrums=async(useHost)=>{
   const ctx=new OfflineAudioContext(2,Math.ceil(t+.5)*SR,SR);Host.allowOffline=useHost;
   const mk=ch=>{const bb=ctx.createBuffer(ch.length,ch[0].length,SR);ch.forEach((x,c)=>bb.copyToChannel(x,c));return bb};
   const B=bodies.map(x=>mk([x])),S=mk(stereo);let host=null,out=-1,openHat=null;
   if(useHost){await Host.prepare(ctx);host=Host.drums(ctx,ctx.destination);out=host.output('bus',ctx.destination)}
   for(const h of hits){
    if(h.kind<=2){ // prepared body; kind 1 = open hat (envelope), kind 2 = closed hat (envelope + choke)
     const hat=h.kind>0,e2={...env,peakGain:h.level};
     if(useHost){host.play({b:host.id(B[h.body]),o:out,s:h.time,p:h.pan,g:hat?[[0,h.time,e2.initialGain],[1,h.time+e2.attackSec,e2.peakGain],[3,h.time+e2.attackSec,e2.targetGain,e2.targetTimeConstantSec]]:null,ck:h.kind===2&&!!openHat,oh:h.kind===1});if(h.kind===1)openHat=true;continue}
     const s=ctx.createBufferSource(),g=ctx.createGain(),pn=ctx.createStereoPanner();s.buffer=B[h.body];s.connect(g);
     if(hat){g.gain.cancelScheduledValues(h.time);g.gain.setValueAtTime(e2.initialGain,h.time);g.gain.linearRampToValueAtTime(e2.peakGain,h.time+e2.attackSec);g.gain.setTargetAtTime(e2.targetGain,h.time+e2.attackSec,e2.targetTimeConstantSec)}
     else g.gain.setValueAtTime(1,h.time);
     if(h.kind===2&&openHat){openHat.gain.cancelScheduledValues(h.time);openHat.gain.setTargetAtTime(1e-4,h.time,.01)}
     if(h.kind===1)openHat=g;
     pn.pan.setValueAtTime(h.pan,h.time);g.connect(pn);pn.connect(ctx.destination);s.start(h.time);
    }else{ // sample lane: stereo, fade-in, optional decay cut and tone low-pass
     const at=h.time,duration=S.duration,decay=h.decay,playSec=decay>=1?duration:duration*decay,when=Math.min(playSec,.008),release=Math.min(.015,playSec*.2),peak=Math.min(1.8,h.level),tone=h.tone;
     if(useHost){const g=[[0,at,0],[1,at+when,peak]];if(decay<1)g.push([0,Math.max(at+when,at+playSec-release),peak],[1,at+playSec,0]);
      host.play({b:host.id(S),o:out,s:at,p:h.pan,g,f:tone<.995?Math.min(SR*.47,500*Math.pow(40,tone)):0,e:decay<1?at+playSec:0});continue}
     const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=S;s.connect(g);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(peak,at+when);
     if(decay<1){g.gain.setValueAtTime(peak,Math.max(at+when,at+playSec-release));g.gain.linearRampToValueAtTime(0,at+playSec)}
     let o=g;if(tone<.995){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(Math.min(SR*.47,500*Math.pow(40,tone)),at);g.connect(f);o=f}
     const pn=ctx.createStereoPanner();pn.pan.setValueAtTime(h.pan,at);o.connect(pn);pn.connect(ctx.destination);s.start(at);if(decay<1)s.stop(at+playSec);
    }
   }
   if(useHost)await host.sync();
   Host.allowOffline=false;return ctx.startRendering();
  };
  const drumOld=await renderDrums(false),drumNew=await renderDrums(true);
  return {notes:notes.length,viaHost:bassNew.viaHost,viaHostOld:bassOld.viaHost,bass:compare(bassOld.buf,bassNew.buf),drums:compare(drumOld,drumNew),hits:hits.length};
 });
 console.log(JSON.stringify(r));
 assert.equal(r.viaHostOld,0,'reference render must use the native nodes');
 assert.equal(r.viaHost,r.notes,'every bass note must be rendered by the worklet');
 assert(r.bass.peak>.05&&r.drums.peak>.05,'renders must not be silent');
 assert(r.bass.snrDb>=90,'bass residual must be ≥ 90 dB below the signal: '+r.bass.snrDb);
 assert(r.drums.snrDb>=90,'drum residual must be ≥ 90 dB below the signal: '+r.drums.snrDb);
 const rel=x=>x.maxDiffDb-20*Math.log10(x.peak);
 assert(rel(r.bass)<=-80&&rel(r.drums)<=-80,'no sample may differ by more than 80 dB below the peak: '+rel(r.bass).toFixed(1)+' / '+rel(r.drums).toFixed(1));
 assert.deepEqual(errors,[],'no page errors');
 console.log(`PASS VOICE-HOST-01 PCM: ${r.notes} bass notes SNR ${r.bass.snrDb} dB (max diff ${r.bass.maxDiffDb} dBFS), ${r.hits} drum/sample hits SNR ${r.drums.snrDb} dB (max diff ${r.drums.maxDiffDb} dBFS)`);
 await b.close();
})().catch(e=>{console.error(String(e.message||e).split('\n').slice(0,6).join('\n'));process.exit(1)});
