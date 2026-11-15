/* Probe only: Thunder gaps with the DEFAULT pattern (16 slots / bar, pitch steps) per sound and timing mode.
 * Counts voice starts (pL) per held key and expected pulses; records the Keyboard lane via Loop-Rec and lists inter-onset gaps > 1.5 x interval.
 * Usage: node tools/probes/thunder_gap_probe.cjs <probe.html> */
const {chromium}=require('playwright');const path=require('path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 await E(`(()=>{window.__vs=[];const o=pL;pL=function(e){window.__vs.push({t:performance.now(),hz:e.baseFreq,at:e.options?.thunderAtSec??null});return o(e)}})()`);
 const phase=()=>E('__XenLoopRec.snapshot().phase');const takes=()=>E('JSON.stringify(bs().entries.filter(e=>e.sessionTake).map(e=>e.id))').then(JSON.parse);
 const prm=JSON.parse(await E('JSON.stringify((q=>({seg:q.keyboardHoldSegments,bars:q.keyboardHoldReferenceBars,bpm:q.quantizeBpm,preset:q.keyboardHoldSoundPreset}))(__NodalBallGrid.params()))'));
 const interval=240/(prm.bpm||108)/(prm.seg||16)*(prm.bars||1)*1000;
 const run=async(preset,mode)=>{await p.evaluate(([preset,mode])=>__xenProbe.bridge.patch({keyboardHoldSoundPreset:preset,thunderTiming:mode}),[preset,mode]);await p.waitForTimeout(1500);
  for(let i=0;i<100&&!['idle','failed'].includes(await phase());i++)await p.waitForTimeout(100);const before=await takes();await E('__XenLoopRec.toggle()');
  for(let i=0;i<80&&await phase()!=='recording';i++)await p.waitForTimeout(100);await p.waitForTimeout(150);
  await p.evaluate(()=>{window.__vs.length=0});const t0=Date.now();await p.keyboard.down('q');await p.waitForTimeout(3000);await p.keyboard.up('q');const held=Date.now()-t0;const voices=await p.evaluate(()=>window.__vs.slice());
  await p.waitForTimeout(500);await E('__XenLoopRec.toggle()');for(let i=0;i<150;i++){if((await takes()).length>before.length)break;await p.waitForTimeout(100)}const id=(await takes()).find(x=>!before.includes(x));
  const audio=await p.evaluate(async([id,interval])=>{const blob=window.__xenProbe.draw.evalInBundle(`__materialAudioBlob(bs().entries.find(x=>x.id===${JSON.stringify(id)}),'probe')`);
   const buf=await new OfflineAudioContext(1,1,48000).decodeAudioData(await blob.arrayBuffer()),sr=buf.sampleRate,d=buf.getChannelData(0),hop=Math.round(sr*.001),n=Math.floor(d.length/hop),env=new Float32Array(n);
   for(let k=0;k<n;k++){let m=0;for(let i=k*hop;i<(k+1)*hop;i++){const a=Math.abs(d[i]);if(a>m)m=a}env[k]=m}let top=0;for(const v of env)if(v>top)top=v;
   const on=[];let last=-1e9;for(let k=3;k<n;k++){const rise=env[k]-Math.max(env[k-1],env[k-2],env[k-3]);if(rise>top*.1&&env[k]>top*.15&&k-last>interval*.6){on.push(k);last=k}}
   const iois=[];for(let i=1;i<on.length;i++)iois.push(on[i]-on[i-1]);return {onsets:on.length,gaps:iois.map((x,i)=>[i,x]).filter(([,x])=>x>interval*1.5),iois:iois.join(',')}},[id,interval]);
  const vt=voices.map(v=>v.t-voices[0]?.t);const vg=[];for(let i=1;i<vt.length;i++)if(vt[i]-vt[i-1]>interval*1.5)vg.push([i,Math.round(vt[i]-vt[i-1])]);
  return {preset,mode,heldMs:held,expectedPulses:Math.round(held/interval),voiceStarts:voices.length,voiceGaps:vg,exactShare:voices.filter(v=>v.at!=null).length,...audio}};
 const out=[];for(const preset of (process.env.PRESETS||'entrophon,entrophon:factory:marimba-holz@1,bell').split(','))for(const mode of ['exact','loose'])out.push(await run(preset,mode));
 console.log(JSON.stringify({intervalMs:+interval.toFixed(2),prm,out,errors},null,1));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
