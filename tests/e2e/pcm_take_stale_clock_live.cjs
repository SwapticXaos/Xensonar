'use strict';
// PCM-CLOCK (real app, probe build): a take recorded in the Live Room while drums/bass change the audio graph on the main thread.
// The browser then hands AudioWorklets a stale currentFrame now and then; the PCM recorder must not log that as overlap/gap
// (which made the Loop-Rec projection drop real blocks and leave silence). Real recording continuity: frameGaps 0.
// Since VOICE-HOST-01 drums and bass no longer change the graph; the take therefore uses the previous native drum/bass path
// (?xenVoiceHost=0) as a deliberate source of graph churn, to keep proving the recorder's clock guard under that stress.
// Usage: node tests/e2e/pcm_take_stale_clock_live.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');const SEC=+(process.env.TAKE_SEC||30);
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  // count main-thread graph changes and stale worklet clock observations (a tiny worklet that only compares currentFrame)
  await p.addInitScript(()=>{const S=window.__clk={ops:0};const oc=AudioNode.prototype.connect,od=AudioNode.prototype.disconnect;
    AudioNode.prototype.connect=function(){S.ops++;return oc.apply(this,arguments)};AudioNode.prototype.disconnect=function(){S.ops++;return od.apply(this,arguments)}});
  await p.goto('file://'+html+'?xenVoiceHost=0');await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  await E(`__NodalBallGrid.update({drumActive:true,bassActive:true})`);await p.waitForTimeout(1500);
  const watch=await E(`(async()=>{const ctx=__XenLiveStemSource.get().ctx;const src="class C extends AudioWorkletProcessor{constructor(){super();this.l=-1;this.s=0;this.port.onmessage=()=>this.port.postMessage(this.s)}process(){const f=currentFrame;if(this.l>=0&&f!==this.l+128)this.s++;this.l=this.l<0?f:Math.max(f,this.l+128);return true}}registerProcessor('xen-clock-watch',C)";
    await ctx.audioWorklet.addModule('data:application/javascript;charset=utf-8,'+encodeURIComponent(src));const n=new AudioWorkletNode(ctx,'xen-clock-watch',{numberOfOutputs:0});const g=ctx.createGain();g.gain.value=0;g.connect(n);window.__clkNode=n;return true})()`);
  assert.ok(watch);
  const header=t=>p.evaluate(t=>{const x=[...document.querySelectorAll('header button')].find(b=>new RegExp(t).test(b.innerText.trim()));if(!x)throw Error('no header button '+t);x.click()},t);
  const ops0=await p.evaluate(()=>__clk.ops);
  await header('^Rec$');await p.waitForTimeout(600);
  const box=await (await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0])).boundingBox();
  const t0=Date.now();while(Date.now()-t0<SEC*1000){const t=(Date.now()-t0)/1000;await p.mouse.move(box.x+box.width*(.5+.35*Math.sin(t)),box.y+box.height*(.5+.35*Math.sin(t*.7)));if(Math.floor(t)%3===0)await p.keyboard.press('KeyA');await p.waitForTimeout(40)}
  await header('Enough');await p.waitForTimeout(3000);
  const ops=(await p.evaluate(()=>__clk.ops))-ops0;
  const stale=await p.evaluate(()=>new Promise(r=>{__clkNode.port.onmessage=e=>r(e.data);__clkNode.port.postMessage(0)}));
  const st=await E(`({...__XenPcmCaptureStatus})`);
  console.log('take',JSON.stringify({frames:st.frames,frameGaps:st.frameGaps,missing:st.missingFrames,overlap:st.overlapFrames,state:st.state}),'graph ops/s',(ops/SEC).toFixed(1),'stale clock calls',stale);
  assert.ok(st.frames>SEC*0.8*44100,'the take was recorded');
  assert.ok(ops/SEC>10,'drums/bass changed the graph during the take');
  assert.equal(st.frameGaps,0,'no false frame gap in the take');assert.equal(st.overlapFrames||0,0);assert.equal(st.missingFrames||0,0);
  assert.deepEqual(errors,[]);
  console.log(stale>0?'PASS PCM-CLOCK take continuous although the worklet clock was stale '+stale+'x':'PASS PCM-CLOCK take continuous (no stale clock observed in this run)');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
