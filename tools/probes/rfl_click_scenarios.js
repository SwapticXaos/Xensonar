// TEST ONLY. Scenario file for tools/probes/live_glitch_probe.js (PROBE build: it needs window.__xenProbe).
// Measures clicks / discontinuities of the Root-Follow-Loop around the playfield gate (cursor leaves / re-enters the playfield) and while playing.
//   node tools/probes/live_glitch_probe.js dist/XenSonar_PROBE.html --scenarios-file tools/probes/rfl_click_scenarios.js \
//        --scenario rflControlLeave,rflSteady,rflLeaveSlow,rflLeaveFast,rflEdgeWiggle --json out.json
// The loop is a synthetic 1-bar test loop made through the Multitrack inbox (library entry) and put into the Root-Follow bank; nothing of the user's data is touched.
// Each scenario prints a line "RFL-COUNTERS {...}": gate transitions (rfl-playfield-gate), pitch-worklet connects/detaches, and how often the loop restarted.
module.exports=({p,canvasBox})=>{
  const E=c=>p.evaluate(x=>window.__xenProbe.draw.evalInBundle(x),c);
  let entryId=null;
  async function setup(){
    if(entryId)return;
    entryId=await E(`(async()=>{const sr=48000,n=sr*2,L=new Float32Array(n);for(let i=0;i<n;i++){const t=i/sr;L[i]=.4*(Math.sin(2*Math.PI*220*t)+.5*Math.sin(2*Math.PI*330*t)+.25*Math.sin(2*Math.PI*440*t))*(0.6+0.4*Math.sin(2*Math.PI*2*t))}
      const d=await __XenMultitrackInbox.send({channels:[L,L],sampleRate:sr,name:'rfl-probe-loop',origin:'probe',bpm:120,bars:1,enqueue:false});return d.entry.id})()`);
    await E(`ri('rootFollowBankMembership',{entryId:'${entryId}',enabled:true,activate:true})`);
    // RFL_VARIANT (ablation): base = old behaviour (no grace, 22 ms, bus only) | hyst = 150 ms grace only | fade = 60 ms fade of bus + parallel paths only | both = the shipped defaults
    const v=process.env.RFL_VARIANT||'both',cfg={base:[0,.022,false],hyst:[150,.022,false],fade:[0,.06,true],both:[150,.06,true],long:[0,.4,true]}[v];
    if(!cfg)throw Error('unknown RFL_VARIANT '+v);
    await E(`__xenRflLeaveGraceMs=()=>${cfg[0]};__xenRflStopFadeSec=()=>${cfg[1]};__xenRflFadeParallel=()=>${cfg[2]}`);
    // experimental overrides of the stop path (PROBE only): nohold = plain setValueAtTime instead of cancelAndHold | instant = no fade, release at once | target = exponential approach instead of the linear ramp
    const x=process.env.RFL_STOPX;
    if(x==='nohold')await E(`__f49HoldParam=(p,t)=>{const v=p.value;p.cancelScheduledValues(t);p.setValueAtTime(v,t)}`);
    if(x==='instant')await E(`__f49FadeAndRelease=(bus,sec,rel)=>rel()`);
    if(x==='target')await E(`__f49FadeAndRelease=(bus,sec,rel)=>{const ctx=bus?.context;if(!bus||ctx.state!=='running'){rel();return}const at=ctx.currentTime;bus.gain.cancelScheduledValues(at);bus.gain.setTargetAtTime(0,at,.012);setTimeout(rel,Math.ceil((sec+.05)*1000))}`);
    console.log('RFL-VARIANT '+v+' '+JSON.stringify(cfg)+' stopx='+(x||''));
  }
  const rfl=async on=>{await setup();await E(`__NodalBallGrid.update({rootFollowLoopActive:${on?'true':'false'},rootFollowLoopId:'${on?entryId:''}'})`);await p.waitForTimeout(1200)};
  const mark=l=>p.evaluate(l=>{try{__glitch.mark(l)}catch{}},l);
  const inside=async(bx,fx=.5,fy=.5,steps=1)=>{await mark('enter');return p.mouse.move(bx.x+bx.width*fx,bx.y+bx.height*fy,{steps})};
  const outside=async(bx,steps=1)=>{await mark('leave');return p.mouse.move(bx.x-60,bx.y+bx.height*.5,{steps})};
  const counters=async(label,t0)=>{const r=await E(`(()=>{const d=__XenRFLPitchReentryProbe.read();const c={};for(const e of d.events)c[e.type]=(c[e.type]||0)+1;return{gate:d.events.filter(e=>e.type==='rfl-playfield-gate').length,counts:c}})()`);console.log('RFL-COUNTERS '+JSON.stringify({scenario:label,...r}));const tl=await p.evaluate(()=>({f0:__glitch.chunks.length?__glitch.chunks[0].f:null,sr:__glitch.sampleRate,marks:__glitch.marks.map(m=>[m.l,m.frame])}));console.log('RFL-TIMELINE '+JSON.stringify({scenario:label,...tl}))};
  const begin=async(on)=>{await rfl(on);if(process.env.RFL_QUIET){await E(`__NodalBallGrid.update({drumVolume:0,bassVolume:0})`);await p.waitForTimeout(600)}await p.evaluate(()=>{__glitch.marks.length=0});await E(`__XenRFLPitchReentryProbe.setEnabled(false);__XenRFLPitchReentryProbe.setEnabled(true)`);const bx=await canvasBox();await inside(bx);await p.waitForTimeout(1500);return bx};
  const S={};
  // control: the same leaving pattern with the loop OFF (what else clicks when the cursor leaves?)
  S.rflControlLeave=async()=>{const bx=await begin(false);for(let k=0;k<6;k++){await inside(bx,.5,.5,30);await p.waitForTimeout(900);await outside(bx,30);await p.waitForTimeout(900)}await inside(bx);await p.waitForTimeout(800);await counters('rflControlLeave')};
  // steady: playing inside the field, loop on
  S.rflSteady=async()=>{const bx=await begin(true);const t0=Date.now();while(Date.now()-t0<12000){const t=(Date.now()-t0)/1000;await inside(bx,.5+.4*Math.sin(t*1.3),.5+.4*Math.sin(t*1.9+1));if(Math.floor(t/1.5)!==Math.floor((t-.05)/1.5)){await p.mouse.down();await p.mouse.up()}await p.waitForTimeout(16)}await p.waitForTimeout(800);await counters('rflSteady')};
  // leave slowly / re-enter slowly (6 cycles)
  S.rflLeaveSlow=async()=>{const bx=await begin(true);for(let k=0;k<6;k++){await inside(bx,.5,.5,30);await p.waitForTimeout(1500);await outside(bx,40);await p.waitForTimeout(1200);}await inside(bx,.5,.5,40);await p.waitForTimeout(1500);await counters('rflLeaveSlow')};
  // jump out and in at once (10 cycles)
  S.rflLeaveFast=async()=>{const bx=await begin(true);for(let k=0;k<10;k++){await inside(bx,.3+.04*k,.5,1);await p.waitForTimeout(900);await outside(bx,1);await p.waitForTimeout(500)}await inside(bx);await p.waitForTimeout(1500);await counters('rflLeaveFast')};
  // wiggle across the border at ~7 Hz (the 150 ms in/out pattern of the field diagnostic)
  S.rflEdgeWiggle=async()=>{const bx=await begin(true);const t0=Date.now();let k=0;while(Date.now()-t0<6000){await p.mouse.move(bx.x+(k%2?10:-10),bx.y+bx.height*.5,{steps:1});k++;await p.waitForTimeout(70)}await inside(bx);await p.waitForTimeout(1500);await counters('rflEdgeWiggle')};

  // ---- attribution: which bus role carries the click? (stem recorder taps main / drone / rhythm / space before the master chain; premaster = their sum) ----
  const detect=(f32,sr)=>{const n=f32.length,out=[];const d=new Float32Array(n);for(let i=2;i<n;i++)d[i]=Math.abs(f32[i]-2*f32[i-1]+f32[i-2]);const W=384,G=6;let i=W+2;
    while(i<n-W){if(d[i]>0.012){let mx=0,sb=0,cb=0;for(let k=i-W;k<i-G;k++){sb+=d[k];cb++;if(d[k]>mx)mx=d[k]}let s2=sb,c2=cb;for(let k=i+G+1;k<=i+W;k++){s2+=d[k];c2++}const ratio=d[i]/(s2/c2+1e-7);if(ratio>25&&d[i]>8*mx){out.push({at:i/sr,step:Math.abs(f32[i]-f32[i-1])});i+=W;continue}}i++}return out};
  S.rflAttrib=async()=>{
    const cycles=+(process.env.RFL_CYCLES||8);const bx=await begin(true);
    await p.evaluate(async()=>{window.__att={marks:[]};await __XenStemRecorder.start({keep:true,extra:['premaster']});window.__att.t0=__XenLiveStemSource.get().ctx.currentTime});
    const m=l=>p.evaluate(l=>{__att.marks.push([l,__XenLiveStemSource.get().ctx.currentTime-__att.t0])},l);
    for(let k=0;k<cycles;k++){await m('enter');await inside(bx,.5,.5,30);await p.waitForTimeout(1500);await m('leave');await outside(bx,40);await p.waitForTimeout(1200)}
    await m('enter');await inside(bx,.5,.5,40);await p.waitForTimeout(1200);
    const r=await E(`(async()=>{const detect=${detect.toString()};const r=await __XenStemRecorder.stop();const out={sr:r.session.ctx.sampleRate,clicks:{}};for(const s of r.stems){const m=s.meta;const inter=await __xenLongMasterPCM.readFrames(m,0,m.frames),mono=new Float32Array(inter.length>>1);for(let k=0;k<mono.length;k++)mono[k]=inter[2*k];out.clicks[s.id]=detect(mono,out.sr)}for(const s of r.stems)await __xenLongMasterPCM.remove(s.meta.id,s.meta.parts);return out})()`);
    const marks=await p.evaluate(()=>__att.marks);const res={};
    for(const [id,cl] of Object.entries(r.clicks)){res[id]=cl.map(c=>{const prev=marks.filter(x=>x[1]<=c.at+.17).pop();const lv=marks.filter(x=>x[0]==='leave').map(x=>c.at-x[1]).sort((a,b)=>Math.abs(a)-Math.abs(b))[0];return{at:+c.at.toFixed(3),step:+c.step.toFixed(3),after:prev?prev[0]:null,dt:prev?+(c.at-prev[1]).toFixed(2):null,toNearestLeave:lv==null?null:+lv.toFixed(2)}})}
    console.log('RFL-ATTRIB '+JSON.stringify({recSec:+(marks.length?marks[marks.length-1][1]:0).toFixed(1),cycles,leaves:marks.filter(x=>x[0]==='leave').length,variant:process.env.RFL_VARIANT||'both',clicks:res}));
    await counters('rflAttrib')};
  return S;
};
