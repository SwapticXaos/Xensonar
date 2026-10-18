'use strict';
const assert=require('node:assert/strict');
const {harness,rms,distance}=require('./emilia3_harness.cjs');
const {api,model,dsp}=harness();
// Two translation-equivalent networks: differences come from absolute position,
// not different organs, ratios, node counts, relative positions or carrier.
const base=api.snapshot();
function layout(dx,dy=0){return api.normalized({...base.model,nodes:base.model.nodes.map((n,i)=>({
  ...n,x:[.15,.34,.23][i]+dx,y:[.37,.46,.27][i]+dy,ratio:1
}))});}
const sr=24000;const track={at:t=>({hz:196,gain:t<.77?.65:0})};
function highPassRMS(input,sr,cut=450){
  // RBJ 2nd-order Butterworth high-pass, measured after initial attack.
  const w=2*Math.PI*cut/sr,c=Math.cos(w),sin=Math.sin(w),alpha=sin/(2*Math.SQRT1_2);
  const a0=1+alpha,b0=(1+c)/2/a0,b1=-(1+c)/a0,b2=b0,a1=-2*c/a0,a2=(1-alpha)/a0;
  let x1=0,x2=0,y1=0,y2=0,ss=0,total=0,count=0;
  for(let i=0;i<input.length;i++){
    const x=input[i],y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;
    x2=x1;x1=x;y2=y1;y1=y;
    if(i>sr*.4&&i<sr*.67){ss+=y*y;total+=x*x;count++;}
  }
  return {db:10*Math.log10((ss+1e-18)/(total+1e-18)),rms:Math.sqrt(total/count)};
}
(async()=>{
 const dark=await api.renderPCM({instrument:layout(0),tracks:[track],durationSec:.8,sampleRate:sr});
 const bright=await api.renderPCM({instrument:layout(.52),tracks:[track],durationSec:.8,sampleRate:sr});
 const a=highPassRMS(dark.left,sr),b=highPassRMS(bright.left,sr);
 console.log(JSON.stringify({dark:a,bright:b,deltaDb:b.db-a.db,pcmDifference:distance(dark.left,bright.left)}));
 assert(b.db-a.db>8,'Absolute spatial movement must create unmistakable spectral color, not another low sine');
 assert(b.db>-19,'Bright network needs meaningfully excited upper resonances in the Carrier');
 assert(a.rms>.003&&b.rms>.003,'No silent constellation');
 // Modal diversity should be available even if all connection edges vanish.
 const isolated=api.normalized({...layout(0).model,nodes:layout(0).model.nodes.map((n,i)=>({...n,x:[.05,.94,.51][i],y:[.1,.9,.9][i],radius:.1}))});
 const isolatedPlan=model.compile(isolated.model);
 assert.equal(isolatedPlan.edges.length,0,'Sanity: true separated graph');
 const c=await api.renderPCM({instrument:isolated,tracks:[track],durationSec:.8,sampleRate:sr});
 assert(distance(c.left,dark.left)>.2);
 let seven=api.snapshot();for(let i=seven.model.nodes.length;i<7;i++)seven=api.createNode(seven,i%2?'drive':'formant');
 const sevenSound=await api.renderPCM({instrument:seven,tracks:[track],durationSec:.8,sampleRate:sr});
 assert.equal(seven.model.nodes.length,7);assert(sevenSound.left.every(Number.isFinite));
 assert(rms(sevenSound.left)>.002);
 const peak=sevenSound.left.reduce((p,v)=>Math.max(p,Math.abs(v)),0);
 assert(peak<.97,'7-node output must remain bounded and avoid digital clipping');
 for(const hz of [73.42,196,880,2800]){
   const r=await api.renderPCM({instrument:layout(.52),tracks:[{at:t=>({hz,gain:.5})}],durationSec:.18,sampleRate:sr});
   assert(r.left.every(Number.isFinite),'all registers must remain finite');
 }
 // Nodal V1 is untouched by Emilia-specific controls.
 const legacy=model.compile(base.model);
 assert.equal(legacy.emiliaInteraction,undefined);
 assert.equal(dsp.voice(legacy,{frequency:220,held:true},sr).process(new Float32Array(64),new Float32Array(64),0,64),true);
 console.log('PASS spatial color with carrier, no-edge variant and legacy DSP');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
