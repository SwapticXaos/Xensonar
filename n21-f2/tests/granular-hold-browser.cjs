'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync('source-manifest.json'));
const boot='const kEe=CEe("root");iY.createRoot(kEe).render(u.jsx(P.StrictMode,{children:u.jsx(REe,{})}));';
let html=fs.readFileSync(manifest.entry,'utf8');assert(html.includes(boot));
// Test-only exposure of production functions, injected into a served copy.
const originalSample=fs.readFileSync('tests/fixtures/granular-hold/sample-baseline.js','utf8');
const baseline=originalSample.slice(originalSample.indexOf('async function dAe(')).replace('async function dAe(', 'async function __baselineSamplePlay(');
html=html.replace(boot,baseline+';window.__holdTest={baseline:__baselineSamplePlay,play:dAe,set:__xenSetSampleHold,state:__xenSampleHoldState,tick:__xenSampleHoldTick,cache:Cee,generation:OP,cut:__xenCutLiveScheduledTones};'+boot);
const out=path.resolve('results/granular-hold');fs.mkdirSync(out,{recursive:true});
function wav(file,channels,rate){
 const length=channels[0].length,data=Buffer.alloc(44+length*channels.length*2);
 data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);
 data.writeUInt16LE(1,20);data.writeUInt16LE(channels.length,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*channels.length*2,28);
 data.writeUInt16LE(channels.length*2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);
 for(let i=0;i<length;i++)for(let c=0;c<channels.length;c++)data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,channels[c][i]))*32767),44+(i*channels.length+c)*2);
 fs.writeFileSync(file,data);
}
const rms=(pcm,rate,a,b)=>Math.sqrt(pcm.slice(Math.round(a*rate),Math.round(b*rate)).reduce((s,x)=>s+x*x,0)/Math.max(1,Math.round((b-a)*rate)));
function peakHz(pcm,rate,time,center=220){
 const length=Math.floor(rate*.25),start=Math.floor(time*rate);let best=0,hz=0;
 for(let f=center-20;f<=center+20;f+=.25){let re=0,im=0;
  for(let i=0;i<length;i++){const value=pcm[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(length-1))),angle=2*Math.PI*f*i/rate;re+=value*Math.cos(angle);im+=value*Math.sin(angle);}
  const power=re*re+im*im;if(power>best){best=power;hz=f;}
 }
 return hz;
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.XEN_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://xensonar.test/**',r=>r.fulfill({contentType:'text/html',body:html}));
  await page.goto('http://xensonar.test/test.html');await page.locator('.xen-performance').waitFor();
  assert.equal(await page.locator('.xen-quick-signal').count(),0);
  const rows=[];let normalPcm=null;
  for(const scenario of [
   {name:'normal',rate:48000,sourceRate:44100,hold:null,release:3,length:4},
   {name:'normal-baseline',rate:48000,sourceRate:44100,hold:null,release:3,length:4},
   {name:'held',rate:48000,sourceRate:44100,hold:.25,release:3.6,length:4},
   {name:'held-96k',rate:96000,sourceRate:48000,hold:.25,release:3.6,length:4},
   {name:'pitch-down',rate:48000,sourceRate:44100,hold:.25,release:3.6,length:4,targetHz:55},
   {name:'pitch-up',rate:48000,sourceRate:44100,hold:.25,release:3.6,length:4,targetHz:440},
   {name:'pitch-high',rate:48000,sourceRate:44100,hold:.25,release:3.6,length:4,targetHz:880},
   {name:'right-only',rate:48000,sourceRate:44100,hold:.25,release:3.6,length:4,rightOnly:true},
   {name:'tail',rate:48000,sourceRate:48000,hold:1.97,release:3.6,length:4},
   {name:'preheld',rate:44100,sourceRate:44100,hold:0,release:3.6,length:4},
   {name:'shorten',rate:48000,sourceRate:48000,hold:.25,release:.3,length:1},
   {name:'moving-pitch',rate:48000,sourceRate:44100,hold:.25,release:6,length:6.5,moving:true},
   {name:'polyphony',rate:48000,sourceRate:44100,hold:.25,release:3.6,length:4,polyphony:8}
  ]){
   const rendered=await page.evaluate(async s=>{
    const api=window.__holdTest,ctx=new OfflineAudioContext(3,Math.ceil(s.length*s.rate),s.rate);
    // Offline contexts suspend between checkpoints. Bridge only the live-input
    // freshness state; all nodes, automation and PCM rendering are real WebAudio.
    Object.defineProperty(ctx,'state',{get:()=> 'running'});
    const buffer=ctx.createBuffer(2,Math.floor(2*s.sourceRate),s.sourceRate);
    for(let c=0;c<2;c++){
     const pcm=buffer.getChannelData(c);
     for(let i=0;i<pcm.length;i++){const t=i/s.sourceRate;
      // A continuously changing pitch is embedded in the recording itself.
      const phase=s.moving?2*Math.PI*(180*t+60*t*t):2*Math.PI*220*t;
      pcm[i]=s.rightOnly&&c===0?0:.45*Math.sin(phase+(c?.35:0))*(.85+.15*Math.sin(t*2.5));
     }
    }
    const id='granular-test-'+s.name;api.cache(id,api.generation(id),{buffer,baseHz:220,tempoPitchLinked:true});
    const primary=ctx.createBuffer(1,Math.ceil(s.length*s.rate),s.rate);
    const primaryData=primary.getChannelData(0);for(let i=0;i<primaryData.length;i++)primaryData[i]=.1*Math.sin(2*Math.PI*55*i/s.rate);
    const primarySource=ctx.createBufferSource(),merger=ctx.createChannelMerger(3);primarySource.buffer=primary;primarySource.connect(merger,0,2);merger.connect(ctx.destination);primarySource.start();
    const tones={current:[]};let acquired=0,returned=0;
    if(s.hold===0)api.set(ctx,true);
    const random=Math.random;Math.random=()=>.5;
    try{for(let i=0;i<(s.polyphony||1);i++){
     const success=await (s.name==='normal-baseline'?api.baseline:api.play)({ctx,sampleId:id,baseFreq:s.targetHz||220,volume:.24/(s.polyphony||1),output:ctx.destination,
      activeScheduledTonesRef:tones,acquireVoice:()=>{acquired++;return {release(){returned++}}}});
     if(!success)throw Error('sample failed to start');
    }}finally{Math.random=random;}
    const state=api.state(ctx),first=tones.current[0];
    const stopTimer=()=>{if(state.timer!==null){clearTimeout(state.timer);state.timer=null}};stopTimer();
    const checkpoints=[];
    if(s.hold!==null){for(let t=Math.max(.025,s.hold);t<s.release;t+=.025)checkpoints.push(t);checkpoints.push(s.release);}
    let pending=checkpoints.length?ctx.suspend(checkpoints[0]):null;
    const rendering=ctx.startRendering();
    const positions=[];
    for(let i=0;i<checkpoints.length;i++){
     await pending;
     const t=checkpoints[i];
     if(i===0&&s.hold!==0)api.set(ctx,true);
     if(i===checkpoints.length-1){api.set(ctx,false);api.cut(ctx,tones.current);}
     else{stopTimer();api.tick(state);positions.push({time:ctx.currentTime,source:first.sourcePositionAt(ctx.currentTime)});}
     stopTimer();
     pending=i+1<checkpoints.length?ctx.suspend(checkpoints[i+1]):null;
     await ctx.resume();
    }
    const result=await rendering;stopTimer();
    return {channels:[Array.from(result.getChannelData(0)),Array.from(result.getChannelData(1))],positions,acquired,returned,
     active:state.active.size,voices:state.voices.size,tracked:tones.current.length,
     primaryByteIdentical:result.getChannelData(2).every((x,i)=>x===primaryData[i])};
   },scenario);
   const pcm=rendered.channels[scenario.rightOnly?1:0],rate=scenario.rate;
   assert(pcm.every(Number.isFinite));assert(rms(pcm,rate,.05,.2)>.005,'normal attack must sound');
   assert.equal(rendered.returned,rendered.acquired,'all physical voice leases return');
   assert.equal(rendered.active,0);assert.equal(rendered.voices,0);assert.equal(rendered.tracked,0);
   assert(rendered.primaryByteIdentical,'independent primary PCM must remain byte-identical throughout hold/release');
   const row={scenario:scenario.name,rate,sourceRate:scenario.sourceRate,acquired:rendered.acquired,returned:rendered.returned,primaryByteIdentical:true};
   if(scenario.name==='normal')normalPcm=pcm;
   if(scenario.name==='normal-baseline'){assert.deepEqual(pcm,normalPcm,'no-hold audio must be byte-identical to the supplied N21–F2 baseline');row.baselineByteIdentical=true;}
   if(scenario.name.startsWith('normal'))assert(rms(pcm,rate,2.1,2.3)<1e-8);
   else{
    assert(rms(pcm,rate,scenario.release-.15,scenario.release-.05)>.003,'hold must survive original sample end');
    assert(rms(pcm,rate,scenario.release+.03,scenario.release+.1)<1e-8,'cut is silent after 20ms');
    row.tailRms=rms(pcm,rate,scenario.release-.15,scenario.release-.05);
    if(!scenario.moving&&scenario.name!=='shorten'){
     row.pitchHz=peakHz(pcm,rate,Math.min(3,scenario.release-.4),scenario.targetHz||220);
     assert(Math.abs(row.pitchHz-(scenario.targetHz||220))<=2,'pitch must remain at the original transposition: '+row.pitchHz);
    }
    if(scenario.moving){row.embeddedPitchHz=[peakHz(pcm,rate,.5,240),peakHz(pcm,rate,3,350),peakHz(pcm,rate,5,365)];assert(row.embeddedPitchHz[1]>row.embeddedPitchHz[0]+60,'recorded pitch expression must keep developing');assert(Math.abs(row.embeddedPitchHz[2]-row.embeddedPitchHz[1])<25,'pitch-expression evolution slows toward a stationary region');}
    row.positions=rendered.positions.filter((_,i)=>i%20===0);
   }
   if(['normal','held','tail','moving-pitch'].includes(scenario.name))wav(path.join(out,scenario.name+'.wav'),rendered.channels,rate);
   rows.push(row);console.log('PASS browser audio',JSON.stringify(row));
  }
  const realtime=await page.evaluate(async()=>{
   const api=window.__holdTest,ctx=new AudioContext(),buffer=ctx.createBuffer(1,ctx.sampleRate*.7,ctx.sampleRate);
   const pcm=buffer.getChannelData(0);for(let i=0;i<pcm.length;i++)pcm[i]=.3*Math.sin(2*Math.PI*220*i/ctx.sampleRate);
   api.cache('realtime',api.generation('realtime'),{buffer,baseHz:220,tempoPitchLinked:true});
   const analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.connect(ctx.destination);
   const tones={current:[]};let acquired=0,returned=0;await ctx.resume();
   if(!await api.play({ctx,sampleId:'realtime',baseFreq:220,volume:.2,output:analyser,activeScheduledTonesRef:tones,acquireVoice:()=>{acquired++;return {release(){returned++}}}}))throw Error('real-time sample rejected');
   await new Promise(r=>setTimeout(r,100));const t=performance.now();api.set(ctx,true);const initialHoldMs=performance.now()-t;
   await new Promise(r=>setTimeout(r,1100));
   const data=new Float32Array(2048);analyser.getFloatTimeDomainData(data);const heldRms=Math.sqrt(data.reduce((a,x)=>a+x*x,0)/data.length);
   const elapsed=ctx.currentTime;api.set(ctx,false);api.cut(ctx,tones.current);
   await new Promise(r=>setTimeout(r,100));analyser.getFloatTimeDomainData(data);const releasedRms=Math.sqrt(data.reduce((a,x)=>a+x*x,0)/data.length);
   const state=api.state(ctx),result={heldRms,releasedRms,elapsed,initialHoldMs,acquired,returned,voices:state.voices.size,timerStopped:state.timer===null};await ctx.close();return result;
  });
  assert(realtime.heldRms>.005,'real wall-clock scheduler must extend beyond the original sample');assert(realtime.releasedRms<1e-8);assert.equal(realtime.returned,realtime.acquired);assert.equal(realtime.voices,0);assert(realtime.timerStopped);rows.push({scenario:'real-time-scheduler',...realtime});console.log('PASS real-time scheduler',JSON.stringify(realtime));
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,'application.png')});
  fs.writeFileSync(path.join(out,'browser-audio.json'),JSON.stringify({engine:'Chromium OfflineAudioContext; production cache, dAe, planner, c6 and gates',rows,errors,limitations:['Offline rendering is not a physical Opera listening or hardware deadline test.']},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
