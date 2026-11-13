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
  }
  const rfl=async on=>{await setup();await E(`__NodalBallGrid.update({rootFollowLoopActive:${on?'true':'false'},rootFollowLoopId:'${on?entryId:''}'})`);await p.waitForTimeout(1200)};
  const mark=l=>p.evaluate(l=>{try{__glitch.mark(l)}catch{}},l);
  const inside=async(bx,fx=.5,fy=.5,steps=1)=>{await mark('enter');return p.mouse.move(bx.x+bx.width*fx,bx.y+bx.height*fy,{steps})};
  const outside=async(bx,steps=1)=>{await mark('leave');return p.mouse.move(bx.x-60,bx.y+bx.height*.5,{steps})};
  const counters=async(label,t0)=>{const r=await E(`(()=>{const d=__XenRFLPitchReentryProbe.read();const c={};for(const e of d.events)c[e.type]=(c[e.type]||0)+1;return{gate:d.events.filter(e=>e.type==='rfl-playfield-gate').length,counts:c}})()`);console.log('RFL-COUNTERS '+JSON.stringify({scenario:label,...r}));const tl=await p.evaluate(()=>({f0:__glitch.chunks.length?__glitch.chunks[0].f:null,sr:__glitch.sampleRate,marks:__glitch.marks.map(m=>[m.l,m.frame])}));console.log('RFL-TIMELINE '+JSON.stringify({scenario:label,...tl}))};
  const begin=async(on)=>{await rfl(on);await p.evaluate(()=>{__glitch.marks.length=0});await E(`__XenRFLPitchReentryProbe.setEnabled(false);__XenRFLPitchReentryProbe.setEnabled(true)`);const bx=await canvasBox();await inside(bx);await p.waitForTimeout(1500);return bx};
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
  return S;
};
