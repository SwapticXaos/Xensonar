'use strict';
// MTW-03 (real app, Wave Editor): Pitch / Time with the shared XenSonar pitch engine, and Snap to Zero.
//  - pitch by a ratio (3/2): same length, 440 Hz becomes 660 Hz, the level stays; Undo is bit-exact
//  - length × 2 and × 1/2: the length changes, the pitch stays, a click in the middle stays in the middle, the highs survive the shortening (9 kHz tone still there)
//  - a selection only: the audio outside is bit-identical, the seams do not click
//  - limits are told (range, too long), nothing is changed then
//  - Snap to Zero moves the selection ends onto zero crossings
// Usage: node tests/e2e/mtw03_wave_pitch_time.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const near=(got,want,tol,msg)=>assert(Math.abs(got-want)<=tol,msg+': '+(+got).toFixed(3)+', expected '+want+' ± '+tol);
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1500,height:1000}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  // page helpers: build a WAV, hand it to the Wave Editor through the one hand-off every room uses, measure tones (Goertzel) on the editor document
  await p.evaluate(()=>{
    window.__t={
      ed(){const w=globalThis.__XenWaveUIW01;return w.getEditor([...document.querySelectorAll('canvas')].find(c=>{try{return w.getEditor(c)?.doc?.frames>0&&!!w.getEditor(c).overlay}catch{return false}}))},
      async load(seconds,make){const sr=44100,n=Math.round(sr*seconds),L=new Float32Array(n),R=new Float32Array(n);for(let i=0;i<n;i++){const v=make(i,i/sr,n);L[i]=v;R[i]=v}
        const bytes=__XenWaveCoreW01.encodeWav({channels:[L,R],sampleRate:sr,frames:n},{format:'float32'});await __XenSendToWaveEditor.send(new File([bytes],'mtw03.wav',{type:'audio/wav'}));
        for(let k=0;k<200;k++){const e=(()=>{try{return this.ed()}catch{return null}})();if(e&&e.doc.frames===n&&e.nodes.length===0)break;await new Promise(ok=>setTimeout(ok,100))}
        const e=this.ed();e.doc=__XenWaveCoreW01.setSelection(e.doc,0,0);e.refresh(false);return {frames:e.doc.frames,rate:e.doc.sampleRate}},
      tone(hz,t0,t1,ch=0){const e=this.ed(),x=e.doc.channels[ch],sr=e.doc.sampleRate,a=Math.round(t0*sr),z=Math.min(x.length,Math.round(t1*sr));let re=0,im=0;for(let i=a;i<z;i++){const w=.5-.5*Math.cos(2*Math.PI*(i-a)/(z-a));re+=x[i]*w*Math.cos(2*Math.PI*hz*i/sr);im-=x[i]*w*Math.sin(2*Math.PI*hz*i/sr)}return 4*Math.hypot(re,im)/(z-a)},
      /* level of a tone in short windows (20 ms): granular grains are not phase-locked to each other at high frequencies, so one long window would read too low */
      band(hz,t0,t1){let sum=0,n=0;for(let t=t0;t+.02<=t1;t+=.02){sum+=this.tone(hz,t,t+.02);n++}return sum/Math.max(1,n)},
      peakHz(lo,hi,t0,t1){let best=0,at=0;for(let hz=lo;hz<=hi;hz+=1){const v=this.tone(hz,t0,t1);if(v>best){best=v;at=hz}}return {hz:at,amp:best}},
      sum(){const e=this.ed();let h=0;for(const c of e.doc.channels)for(let i=0;i<c.length;i+=3)h=(h*31+Math.round(c[i]*1e6))|0;return h+':'+e.doc.frames},
      state(){const e=this.ed();return {frames:e.doc.frames,sel:{...e.doc.selection},past:e.doc.history.past.length,notice:document.querySelector('[data-xwe-pitch-notice]')?.textContent||''}}}});
  const T=code=>p.evaluate(code);
  const apply=async(pitch,time)=>{await p.locator('[data-xwe-pitch]').fill(pitch);await p.locator('[data-xwe-time]').fill(time);const before=await T('__t.state().past');await p.locator('[data-xwe-chromatic-action="pitchtime"]').click();
    await p.waitForFunction(b=>{const s=__t.state();return s.past>b||/failed|Out of range|nothing to do|takes up to|Select at least|ratio \(3\/2/.test(s.notice)},before,{timeout:120000});await p.waitForTimeout(500);return T('__t.state()')};
  // ---- pitch by a ratio: 440 Hz → 660 Hz, same length ----
  let doc=await T(`__t.load(3,(i,t)=>.4*Math.sin(2*Math.PI*440*t))`);assert.equal(doc.rate,44100);
  await p.waitForSelector('[data-xwe-pitch]');const sum0=await T('__t.sum()');
  let st=await apply('3/2','1');assert.equal(st.frames,doc.frames,'pitch keeps the length');assert(/\+702\.0 cents/.test(st.notice),'the notice names the interval in cents: '+st.notice);
  let pk=await T('__t.peakHz(400,900,1,2)');near(pk.hz,660,2,'440 Hz × 3/2');near(pk.amp,.4,.06,'level kept');near(await T('__t.tone(440,1,2)'),0,.03,'the old pitch is gone');
  await T('__t.ed().runEdit("undo")');await p.waitForTimeout(700);assert.equal(await T('__t.sum()'),sum0,'Undo restores the audio exactly');
  // microtonal: 50 cents
  st=await apply('50','1');pk=await T('__t.peakHz(420,480,1,2)');near(pk.hz,440*Math.pow(2,50/1200),1.5,'+50 cents (a quarter tone)');await T('__t.ed().runEdit("undo")');await p.waitForTimeout(600);
  // ---- length × 2 and × 1/2: pitch stays, a click stays in place, highs survive ----
  doc=await T(`__t.load(3,(i,t,n)=>.3*Math.sin(2*Math.PI*440*t)+.15*Math.sin(2*Math.PI*9000*t)+(Math.abs(i-n/2)<40?.5*Math.cos(Math.PI*(i-n/2)/80):0))`);
  st=await apply('0','2');near(st.frames,doc.frames*2,2,'twice as long');pk=await T('__t.peakHz(400,480,1,2)');near(pk.hz,440,2,'pitch kept at × 2');near(pk.amp,.3,.06,'level kept');
  const notes=[];{const hi=await T('__t.band(9000,1,2)');notes.push('9 kHz after ×2: '+hi.toFixed(3));assert(hi>.09&&hi<.2,'the 9 kHz tone is still there after stretching: '+hi.toFixed(3)+' of 0.15')}
  const click=await T(`(()=>{const x=__t.ed().doc.channels[0];let m=0,at=0;for(let i=1000;i<x.length-1000;i++){const d=Math.abs(x[i]-x[i-12]);if(d>m){m=d;at=i}}return at/x.length})()`);near(click,.5,.01,'the click is still in the middle');
  await T('__t.ed().runEdit("undo")');await p.waitForTimeout(700);assert.equal((await T('__t.state()')).frames,doc.frames);
  st=await apply('0','1/2');near(st.frames,doc.frames/2,2,'half as long');pk=await T('__t.peakHz(400,480,.4,1.1)');near(pk.hz,440,2,'pitch kept at × 1/2');
  {const hi=await T('__t.band(9000,.4,1.1)');notes.push('after ×1/2: '+hi.toFixed(3));assert(hi>.09&&hi<.2,'the highs survive the shortening (shift down first, then resample): '+hi.toFixed(3)+' of 0.15')}
  await T('__t.ed().runEdit("undo")');await p.waitForTimeout(700);
  // pitch and length together: an octave down and one and a half times as long
  st=await apply('1/2','3/2');near(st.frames,doc.frames*1.5,2,'× 3/2');pk=await T('__t.peakHz(180,480,1.5,3)');near(pk.hz,220,2,'an octave down');await T('__t.ed().runEdit("undo")');await p.waitForTimeout(700);
  // ---- a selection only ----
  doc=await T(`__t.load(3,(i,t)=>.4*Math.sin(2*Math.PI*440*t))`);
  const snap=await T(`(()=>{const e=__t.ed();e.doc=__XenWaveCoreW01.setSelection(e.doc,44100,88200);e.refresh(false);return [Array.from(e.doc.channels[0].subarray(0,44100)),Array.from(e.doc.channels[0].subarray(88200))].map(a=>a.reduce((h,v)=>(h*31+Math.round(v*1e7))|0,0))})()`);
  st=await apply('1200','1');assert.equal(st.frames,doc.frames);assert.deepEqual(st.sel,{start:44100,end:88200},'the selection stays');
  const after=await T(`(()=>{const e=__t.ed(),x=e.doc.channels[0];let jump=0;for(const at of [44100,88200])for(let i=at-300;i<at+300;i++)jump=Math.max(jump,Math.abs(x[i]-x[i-1]));return {outside:[Array.from(x.subarray(0,44100)),Array.from(x.subarray(88200))].map(a=>a.reduce((h,v)=>(h*31+Math.round(v*1e7))|0,0)),jump}})()`);
  assert.deepEqual(after.outside,snap,'audio outside the selection is untouched');notes.push('largest step at the seams '+after.jump.toFixed(3));assert(after.jump<.12,'no click at the seams (largest step '+after.jump.toFixed(3)+'; an 880 Hz tone of this level steps up to 0.05)');
  pk=await T('__t.peakHz(800,960,1.2,1.8)');near(pk.hz,880,2,'the selection is an octave up');near(await T('__t.tone(440,.2,.8)'),.4,.03,'before the selection: unchanged');
  // ---- limits are told, nothing changes ----
  let past=(await T('__t.state()')).past;st=await apply('8/1','1');assert(/Out of range/.test(st.notice)&&st.past===past,'three octaves up is refused: '+st.notice);
  st=await apply('zz','1');assert(/ratio \(3\/2/.test(st.notice)&&st.past===past,'nonsense is explained: '+st.notice);
  st=await apply('0','1');assert(/nothing to do/.test(st.notice)&&st.past===past);
  // ---- Snap to Zero ----
  await T(`(()=>{const e=__t.ed();e.doc=__XenWaveCoreW01.setSelection(e.doc,5025,20050);e.refresh(false)})()`);await p.locator('[data-xwe-snap-zero]').click();await p.waitForTimeout(300);
  const z=await T(`(()=>{const e=__t.ed(),x=e.doc.channels[0],s=e.doc.selection;return {s,sign:[(x[s.start-1]<0)!==(x[s.start]<0),(x[s.end-1]<0)!==(x[s.end]<0)],moved:[s.start-5025,s.end-20050]}})()`);
  assert(z.sign[0]&&z.sign[1],'both ends sit on zero crossings: '+JSON.stringify(z));assert(Math.abs(z.moved[0])<=51&&Math.abs(z.moved[1])<=51,'moved by less than half a period');
  assert.deepEqual(errors,[]);console.log('PASS MTW-03 Wave Editor Pitch / Time (ratio and cents, length with pitch kept, selection with clean seams, limits) and Snap to Zero · '+notes.join(' · '));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
