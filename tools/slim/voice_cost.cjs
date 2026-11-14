'use strict';
/* Audio-thread cost of the drum/bass voices (analysis only): renders the same dense 8 s passage (bass notes every 110 ms with 3 to 4
 * overlapping, drum bodies every 35 ms) in an OfflineAudioContext, through the native nodes and through the resident worklet,
 * and reports the median render time of 5 runs. Offline rendering is CPU bound, so the time is the cost.
 *   node tools/slim/voice_cost.cjs dist/XenSonar_PROBE.html */
const path=require('path');const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'));
 await p.waitForFunction(()=>window.__xenProbe&&__xenProbe.bridge.available(),null,{timeout:60000});
 const r=await p.evaluate(async()=>{const ev=__xenProbe.draw.evalInBundle;const Host=ev('__XenLiveVoiceHost'),OPe=ev('OPe');const SR=48000,LEN=8;
  const body=new Float32Array(9000);for(let i=0;i<body.length;i++)body[i]=Math.sin(i*.03)*Math.exp(-i/2500);
  const once=async(useHost)=>{const ctx=new OfflineAudioContext(2,SR*LEN,SR);Host.allowOffline=useHost;let host=null,out=-1;
   if(useHost){await Host.prepare(ctx);Host.bass(ctx,ctx.destination);for(let i=0;i<200&&!Host.status(ctx).tables;i++)await new Promise(k=>setTimeout(k,10));host=Host.drums(ctx,ctx.destination);out=host.output('bus',ctx.destination)}
   const B=ctx.createBuffer(1,body.length,SR);B.copyToChannel(body,0);
   const params={bassVoice:'classic',bassTone:.5,bassGrit:.3,bassSub:1,bassEnvelope:1,bassResonance:.4};
   const owner=OPe({audioCtx:ctx,nexusParamsRef:{current:params},applyLiveAttack:false,bassDestination:ctx.destination,ensureFinalMixBus:()=>ctx.destination,enterHoldPsyFxEnabled:false,enterHoldRef:{current:false}});
   for(let t=.05;t<LEN-.5;t+=.11)owner.playBassNote(t,55*(1+((t*7)|0)%3),.6,.4,.6,{glideToNext:false});
   for(let t=.03;t<LEN-.3;t+=.035){if(useHost)host.play({b:host.id(B),o:out,s:t,p:Math.sin(t),g:null});else{const s=ctx.createBufferSource(),g=ctx.createGain(),pn=ctx.createStereoPanner();s.buffer=B;s.connect(g);g.gain.setValueAtTime(1,t);pn.pan.setValueAtTime(Math.sin(t),t);g.connect(pn);pn.connect(ctx.destination);s.start(t)}}
   if(useHost){await Host.bass(ctx,ctx.destination).sync();await host.sync()}
   Host.allowOffline=false;const t0=performance.now();await ctx.startRendering();return performance.now()-t0};
  const med=a=>a.sort((x,y)=>x-y)[2];const old=[],now=[];for(let i=0;i<5;i++){old.push(await once(false));now.push(await once(true))}
  return {nativeMs:+med(old).toFixed(1),workletMs:+med(now).toFixed(1),seconds:LEN}});
 console.log(`8 s dense drums+bass, median render time: native nodes ${r.nativeMs} ms, worklet voices ${r.workletMs} ms (${(100*r.nativeMs/8000).toFixed(2)} % vs ${(100*r.workletMs/8000).toFixed(2)} % of real time on one core)`);
 await b.close()})().catch(e=>{console.error(e);process.exit(1)});
