/* Probe only (not shipped): Thunder Mode pulse timing per sound family on the Keyboard lane.
 * Holds one key with a plain hold pattern (every slot on, equal volume, no pitch steps), records the Keyboard lane with Loop-Rec (sample clock),
 * finds the note onsets and compares them with the ideal pulse grid. Usage: node tools/probes/thunder_timing_probe.cjs <probe.html> [seconds]
 * Prints per family: pulses found, mean / max deviation of the inter-onset interval from the pattern interval (ms), and the path the notes took. */
const {chromium}=require('playwright');const path=require('path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),HOLD=Number(process.argv[3]||4);
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(r=>{window.__rise=r},Number(process.env.RISE||.12));await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
 const phase=()=>E('__XenLoopRec.snapshot().phase');const takes=()=>E('JSON.stringify(bs().entries.filter(e=>e.sessionTake).map(e=>e.id))').then(JSON.parse);
 // a plain pattern: 8 slots per bar, all on, equal volume, no pitch steps
 await p.evaluate(([dyn,mode])=>__xenProbe.bridge.patch({thunderModeEnabled:true,thunderKeyboardEnabled:true,keyboardHoldSegments:8,keyboardHoldCustomSegments:8,keyboardHoldReferenceBars:1,keyboardHoldPatternSteps:Array(8).fill(true),keyboardHoldPitchCents:Array(8).fill(0),keyboardHoldSlotVolumes:dyn?[1,.7,1,.7,1,.7,1,.7]:[],keyboardHoldMicrotiming:[],thunderTiming:mode}),[!!process.env.DYN,process.env.TIMING||'exact']);await p.waitForTimeout(800);
 const bpm=Number(await E('__NodalBallGrid.params().quantizeBpm||108')),interval=240/bpm/8;
 const take=async()=>{for(let i=0;i<100&&!['idle','failed'].includes(await phase());i++)await p.waitForTimeout(100);const before=await takes();await E('__XenLoopRec.toggle()');
  for(let i=0;i<80&&await phase()!=='recording';i++)await p.waitForTimeout(100);await p.waitForTimeout(150);
  await p.keyboard.down('q');await p.waitForTimeout(HOLD*1000);await p.keyboard.up('q');await p.waitForTimeout(500);await E('__XenLoopRec.toggle()');
  for(let i=0;i<150;i++){if((await takes()).length>before.length)break;await p.waitForTimeout(100)}const id=(await takes()).find(x=>!before.includes(x));
  return p.evaluate(async([id,interval])=>{const blob=window.__xenProbe.draw.evalInBundle(`__materialAudioBlob(bs().entries.find(x=>x.id===${JSON.stringify(id)}),'probe')`);
   const buf=await new OfflineAudioContext(1,1,48000).decodeAudioData(await blob.arrayBuffer()),sr=buf.sampleRate,d=buf.getChannelData(0),hop=Math.round(sr*.001),n=Math.floor(d.length/hop),env=new Float32Array(n);
   for(let k=0;k<n;k++){let m=0;for(let i=k*hop;i<(k+1)*hop;i++){const a=Math.abs(d[i]);if(a>m)m=a}env[k]=m}
   let top=0;for(const v of env)if(v>top)top=v;const on=[];let last=-1e9;const min=Math.round(interval*1000*.7);
   for(let k=3;k<n;k++){const rise=env[k]-Math.max(env[k-1],env[k-2],env[k-3]);if(rise>top*Number(window.__rise||.12)&&env[k]>top*.2&&k-last>min){on.push(k);last=k}}
   const iois=[];for(let i=1;i<on.length;i++)iois.push(on[i]-on[i-1]);const want=interval*1000,dev=iois.map(x=>Math.abs(x-want));
   const phaseDev=on.map(t=>{const r=((t-on[0])/want)%1;return Math.min(r,1-r)*want});
   return {iois:iois.join(','),pulses:on.length,ioiMean:iois.length?+(iois.reduce((a,b)=>a+b,0)/iois.length).toFixed(2):null,devMean:dev.length?+(dev.reduce((a,b)=>a+b,0)/dev.length).toFixed(2):null,devMax:dev.length?Math.max(...dev):null,gridMax:+Math.max(0,...phaseDev).toFixed(2),peak:+top.toFixed(3)}},[id,interval])};
 const set=v=>p.evaluate(x=>__xenProbe.bridge.patch({keyboardHoldSoundPreset:x}),v).then(()=>p.waitForTimeout(1500));
 const rows={};const families=(process.env.FAMILIES||'classic:,nodal:nodal:factory:troodle,entrophon:entrophon').split(',');
 for(const f of families){const i=f.indexOf(':'),name=f.slice(0,i),id=f.slice(i+1);if(id)await set(id);else await set(await E('__xenStarterSourceSettings().keyboard.keyboardHoldSoundPreset??__NodalBallGrid.params().keyboardHoldSoundPreset'));
  rows[name]={preset:await E('__NodalBallGrid.params().keyboardHoldSoundPreset'),...await take()}}
 console.log(JSON.stringify({bpm,intervalMs:+(interval*1000).toFixed(2),rows,errors},null,1));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
