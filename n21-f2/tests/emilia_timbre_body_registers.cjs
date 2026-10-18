'use strict';
// This is a source-identity regression, not an aesthetic listening verdict.
// Carrier is an unchanged straight line (or two lines). Compare recognisable
// odd/even overtone structure in low/middle/high registers on the ACTUAL
// renderCarrier path. Overall gain and phase cannot satisfy this contract.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {harness,grid,rms,root}=require('./emilia3_harness.cjs');
const current=harness(),api=current.api,base=api.snapshot();
const recipe=x=>api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({...n,ratio:1,x:x+[-.01,0,.01][i],y:[.26,.50,.72][i]}))});
function harmonicEnergy(pcm,sr,hz){
 const start=Math.floor(sr*.30),end=Math.floor(sr*.75),limit=Math.min(16,Math.floor(sr*.46/hz));let powers=[];
 for(let h=1;h<=limit;h++){let a=0,b=0;for(let i=start;i<end;i++){const w=.5-.5*Math.cos(2*Math.PI*(i-start)/(end-start-1)),p=2*Math.PI*hz*h*i/sr;a+=pcm[i]*w*Math.cos(p);b+=pcm[i]*w*Math.sin(p);}powers.push(a*a+b*b);}
 const sum=powers.reduce((a,b)=>a+b,0);return powers.map(v=>v/Math.max(1e-30,sum));
}
(async()=>{
 const report={engine:api.ENGINE,checks:[],registers:[],limits:'Checks direct spectral character and routing; does not certify musical quality.'};
 for(const hz of [220,880,1760]){
  const g=grid(120,768,[{hz,gain:.65}]),trackHz=api.carrierTracks(g,.9)[0].at(.45).hz;
  const a=await api.renderCarrier({grid:g,durationSec:.9,instrument:recipe(.045)}),b=await api.renderCarrier({grid:g,durationSec:.9,instrument:recipe(.955)});
  const f=harmonicEnergy(a.getChannelData(0),a.sampleRate,trackHz),q=harmonicEnergy(b.getChannelData(0),b.sampleRate,trackHz);
  const distance=f.reduce((s,v,i)=>s+Math.abs(v-q[i]),0);
  assert(rms(a.getChannelData(0))>.002&&rms(b.getChannelData(0))>.002,'Both materials must survive Carrier playback');
  assert(distance>.20,'Odd/even material identity collapsed in Carrier register '+hz);
  assert(f[0]<.85&&q[0]<.85,'Rich material collapsed to the same near-sine in register '+hz);
  report.registers.push({requestedHz:hz,actualHz:trackHz,harmonicEnergy:[f,q],distance});
 }
 // Negative controls explicitly fail the identity criterion.
 const g=grid(120,768,[{hz:880,gain:.65}]),hz=api.carrierTracks(g,.9)[0].at(.45).hz;
 const a=await api.renderCarrier({grid:g,durationSec:.9,instrument:recipe(.045)}),pcm=a.getChannelData(0),f=harmonicEnergy(pcm,a.sampleRate,hz),control=harmonicEnergy(Float32Array.from(pcm,v=>v*-.37),a.sampleRate,hz);
 assert(f.reduce((s,v,i)=>s+Math.abs(v-control[i]),0)<1e-6);
 const two=await api.renderCarrier({grid:grid(120,768,[{hz:220,gain:.6},{hz:330,gain:.3}]),durationSec:.9,instrument:recipe(.955)});assert(rms(two.getChannelData(0))>.002);
 report.checks=['Distinct odd/even source structure survives straight Carrier lines at 220/880/1760 Hz','Gain and polarity changes cannot pass as material identity','Two-line Carrier uses the same material path'];
 fs.writeFileSync(path.join(root,'results/timbre_body_registers.json'),JSON.stringify(report,null,2));console.log(report.checks.join('\n'));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
