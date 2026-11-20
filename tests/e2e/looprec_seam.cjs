'use strict';
// LOOPREC-SEAM-01 (real app): an edited loop (bars trimmed / silent bars added) has soft seams: no jump at the wrap of the loop,
// at the cut, or between audio and the added silent bars. An unedited loop (front = back = 0) stays byte-exact as it was.
// The synthetic loop is a constant level (0.5) over 4 bars, the worst case for a hard cut: any cut would be a jump of 0.5.
// Usage: node tests/e2e/looprec_seam.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>window.__xenProbe.draw.evalInBundle(`(async()=>{
  const rate=48000,bpm=120,bars=4,barFrames=2*rate,buf=new AudioBuffer({length:bars*barFrames,sampleRate:rate,numberOfChannels:2});
  buf.getChannelData(0).fill(.5);buf.getChannelData(1).fill(-.5);
  const src={bars,bpm,beatsPerBar:4,loopStartSec:0,loopEndSec:bars*2};
  const stat=(pcm,from,to)=>{let jump=0;for(let i=Math.max(1,from);i<to;i++)jump=Math.max(jump,Math.abs(pcm.left[i]-pcm.left[i-1]),Math.abs(pcm.right[i]-pcm.right[i-1]));return jump};
  const out={};
  for(const [name,f,k] of [['plain',0,0],['trimFront',-1,0],['trimBack',0,-1],['trimBoth',-1,-1],['padBack',0,2],['padFront',1,0],['trimFrontPadBack',-1,1]]){
   const d=await __xenRackRenderBarEdit(buf,src,f,k,()=>false,null,true),pcm=d.pcm,n=pcm.left.length,
    a0=d.plan.padLeftFrames,a1=a0+Math.max(0,Math.min(d.plan.readEndFrame,bars*barFrames)-d.plan.readStartFrame);
   out[name]={n,a0,a1,first:pcm.left[0],last:pcm.left[n-1],firstAudio:pcm.left[a0],lastAudio:pcm.left[a1-1],mid:pcm.left[(a0+a1)>>1],midR:pcm.right[(a0+a1)>>1],
    jump:stat(pcm,0,n),wrap:Math.abs(pcm.left[0]-pcm.left[n-1])};
  }
  return JSON.stringify(out)})()`));
 const o=JSON.parse(r);
 // unedited loop: not touched at all
 assert.equal(o.plain.first,.5,'unedited loop plays as recorded (no fade)');assert.equal(o.plain.last,.5);
 for(const k of ['trimFront','trimBack','trimBoth','padBack','padFront','trimFrontPadBack']){
  const x=o[k];
  assert.equal(x.firstAudio,0,k+': the audio starts at exactly 0');assert.equal(x.lastAudio,0,k+': the audio ends at exactly 0');
  assert.equal(x.wrap,0,k+': wrap of the loop is continuous (last = first = 0)');
  assert(x.mid===.5&&x.midR===-.5,k+': the middle of the audio is untouched');
  assert(x.jump<.01,k+': no step between neighbouring samples above 0.01 (a hard cut would be 0.5): '+x.jump);
 }
 assert.deepEqual(errors,[]);
 console.log('looprec_seam OK',JSON.stringify(Object.fromEntries(Object.entries(o).map(([k,v])=>[k,+v.jump.toFixed(5)]))));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
