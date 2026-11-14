'use strict';
// MTW-02 (real app, Room IV), measured on the exported mixdown (white noise, so the level at a place can be read as RMS):
//  - fade shapes: linear 0.5, equal power 0.707 at the middle of the fade, S-curve soft at the start
//  - position-accurate: an export that begins inside a fade starts at the level of that place (not at full level)
//  - crossfade (key X) over the overlap of two clips on one track: equal power keeps the level even; linear dips by 3 dB; without fades the overlap is 3 dB louder
//  - the fade handle on the clip sets the fade length
//  - meters: every playing track and the master show a level and a peak in dB; they rest after Stop
//  - sample grid: a clip at its original speed that starts off the sample grid is no longer dulled by interpolation
//  - the track header no longer hangs over the timeline
// Usage: node tests/e2e/mtw02_fades_meters.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
function parseWav(buf){let at=12,fmt=null,data=null;while(at+8<=buf.length){const id=buf.toString('latin1',at,at+4),size=buf.readUInt32LE(at+4);if(id==='fmt ')fmt={tag:buf.readUInt16LE(at+8),ch:buf.readUInt16LE(at+10),rate:buf.readUInt32LE(at+12),bits:buf.readUInt16LE(at+22)};if(id==='data'){data=buf.subarray(at+8,at+8+size);break}at+=8+size+(size&1)}
 assert(fmt&&data&&fmt.tag===3,'a float WAV');const n=Math.floor(data.length/(4*fmt.ch)),ch=Array.from({length:fmt.ch},()=>new Float32Array(n));for(let i=0;i<n;i++)for(let c=0;c<fmt.ch;c++)ch[c][i]=data.readFloatLE((i*fmt.ch+c)*4);return {...fmt,frames:n,channels:ch}}
const rms=(w,t0,t1)=>{const a=Math.max(0,Math.round(t0*w.rate)),b=Math.min(w.frames,Math.round(t1*w.rate));let s=0;for(let i=a;i<b;i++)s+=w.channels[0][i]*w.channels[0][i];return Math.sqrt(s/Math.max(1,b-a))};
const near=(got,want,tol,msg)=>assert(Math.abs(got-want)<=tol,msg+': '+got.toFixed(3)+', expected '+want+' ± '+tol);
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-mtw02-'));const file=path.join(dir,'noise.wav');
  {const sr=48000,n=sr*4,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
   let s=12345;for(let i=0;i<n;i++){s=(s*1103515245+12345)&0x7fffffff;const v=Math.round((s/0x7fffffff-.5)*2*.3*32767);buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(file,buf)}
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1600,height:1000},acceptDownloads:true});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file://'+html);await p.waitForTimeout(3500);
  const room=name=>p.evaluate(n=>{[...document.querySelectorAll('header button, button')].find(x=>new RegExp(n).test(x.innerText)&&x.offsetParent).click()},name);
  const openRoom=async()=>{await room('MULTITRACK');await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(900)};
  const project=()=>p.evaluate(async()=>{const db=await __XenMultitrackInbox.db();return await new Promise(ok=>{const q=db.transaction('projects').objectStore('projects').get('current');q.onsuccess=()=>ok(q.result)})});
  // change the saved arrangement while the room is closed (the room saves on leaving and loads on entering)
  const patch=async fn=>{await room('LIVE ROOM');await p.waitForTimeout(1200);await p.evaluate(async code=>{const db=await __XenMultitrackInbox.db();await new Promise((ok,bad)=>{const tx=db.transaction('projects','readwrite'),st=tx.objectStore('projects'),q=st.get('current');q.onsuccess=()=>{const pr=q.result;(new Function('p',code))(pr);st.put(pr,'current')};tx.oncomplete=ok;tx.onerror=()=>bad(tx.error)})},'('+fn.toString()+')(p)');await openRoom();await p.waitForSelector('.xmt .clip');await p.waitForTimeout(1200);await p.selectOption('[data-xmt-export-format]','float32')};
  const mixdown=async()=>{const [dl]=await Promise.all([p.waitForEvent('download',{timeout:90000}),p.getByRole('button',{name:/Mixdown/}).first().click()]);const w=parseWav(fs.readFileSync(await dl.path()));await p.waitForTimeout(300);return w};
  await openRoom();await p.setInputFiles('.xmt input[type=file]',file);await p.waitForSelector('.xmt .clip',{timeout:30000});await p.waitForTimeout(1500);
  await p.selectOption('[data-xmt-export-format]','float32');
  // the tempo detection may hear a beat in noise: put the clip at its original speed explicitly (inspector: Fit)
  await p.locator('.xmt .clip').first().click();await p.locator('.xmt label:has-text("Fit") select').selectOption('natural');await p.waitForTimeout(900);
  let pr=await project();const c0=pr.tracks[0].clips[0],spb=60/pr.bpm;assert.equal(c0.fit,'natural','the clip plays at its original speed');near(c0.lenBeats,4/spb,.02,'clip length in beats');
  // ---- header layout: nothing hangs over the timeline ----
  const over=await p.evaluate(()=>[...document.querySelectorAll('.xmt .trk:not(.rr):not(.auto) .hdr')].map(h=>Math.max(...[...h.querySelectorAll('input,button')].map(i=>i.getBoundingClientRect().right))-h.getBoundingClientRect().right));
  assert(over.every(v=>v<=0),'track header controls stay inside the header: '+over);
  assert(/dB/.test(await p.getByLabel(/^Volume /).first().getAttribute('title')),'the fader tells its level in dB');
  // ---- fade shapes, measured ----
  await p.locator('.xmt .clip').first().click();await p.getByLabel('Fade in',{exact:true}).fill('2');await p.waitForTimeout(400);
  const ref=w=>rms(w,2,3),mid=w=>rms(w,spb-.04,spb+.04)/ref(w),quarter=w=>rms(w,spb*.5-.03,spb*.5+.03)/ref(w);
  let w=await mixdown();near(mid(w),.5,.04,'linear fade at its middle');near(quarter(w),.25,.035,'linear fade at a quarter');
  await p.selectOption('[data-xmt-fade-shape="in"]','eq');await p.waitForTimeout(400);w=await mixdown();near(mid(w),Math.SQRT1_2,.04,'equal-power fade at its middle');
  await p.selectOption('[data-xmt-fade-shape="in"]','s');await p.waitForTimeout(400);w=await mixdown();near(mid(w),.5,.04,'S-curve at its middle');near(quarter(w),.146,.03,'S-curve at a quarter (soft start)');
  await p.selectOption('[data-xmt-fade-shape="in"]','eq');await p.waitForTimeout(900);
  assert.equal((await project()).tracks[0].clips[0].fadeInShape,'eq','the shape is saved with the clip');
  // ---- position-accurate: the export range begins at beat 1, in the middle of the 2-beat fade ----
  await patch(function(p){p.loop={on:true,start:1,end:5}});
  w=await mixdown();near(rms(w,.02,.07)/rms(w,2*spb,3*spb),Math.sin((1+.045/(60/108))/2*Math.PI/2),.05,'an export that begins inside the fade starts at the level of that place');
  // ---- crossfade over an overlap of 2 beats ----
  await patch(function(p){p.loop.on=false;const c=p.tracks[0].clips[0];c.fadeIn=0;delete c.fadeInShape;p.tracks[0].clips.push({...c,id:'clip-second',startBeat:c.startBeat+c.lenBeats-2})});
  const midOverlap=w=>rms(w,(c0.lenBeats-1)*spb-.07,(c0.lenBeats-1)*spb+.07)/rms(w,1,2);
  w=await mixdown();if(process.env.DEBUG_MTW){const o=[];for(let t=0;t<w.frames/w.rate;t+=.25)o.push(rms(w,t,t+.25).toFixed(3));console.log(o.join(' '),JSON.stringify((await project()).tracks[0].clips))}near(midOverlap(w),Math.SQRT2,.08,'without fades the overlap is the sum of both clips (+3 dB)');
  near(rms(w,4.3,5.3)/rms(w,1,2),1,.015,'a clip that starts between two samples (beat 5.2 = frame 138666.67) is as loud and bright as one that starts on a sample (it was 2.6 dB quieter: linear interpolation)');
  await p.locator('[data-clip="clip-second"]').click({position:{x:120,y:30}});await p.keyboard.press('x');await p.waitForTimeout(900);
  pr=await project();{const [a,b2]=pr.tracks[0].clips;near(a.fadeOut,2,.002,'fade-out of the earlier clip = overlap');near(b2.fadeIn,2,.002,'fade-in of the later clip = overlap');assert.equal(a.fadeOutShape,'eq');assert.equal(b2.fadeInShape,'eq')}
  w=await mixdown();near(midOverlap(w),1,.07,'equal-power crossfade keeps the level even');
  near(rms(w,(c0.lenBeats-1.5)*spb-.05,(c0.lenBeats-1.5)*spb+.05)/rms(w,1,2),1,.07,'… also at a quarter of the crossfade');
  await patch(function(p){for(const c of p.tracks[0].clips){delete c.fadeInShape;delete c.fadeOutShape}});
  w=await mixdown();near(midOverlap(w),Math.SQRT1_2,.06,'a linear crossfade of different material dips by 3 dB (that is why equal power is the default here)');
  // ---- the fade handle sets the length ----
  await p.locator('.xmt .clip').first().click({position:{x:60,y:40}});const h=await p.locator('.xmt .clip').first().locator('[data-xmt-fade="in"]').boundingBox();
  await p.mouse.move(h.x+h.width/2,h.y+h.height/2);await p.mouse.down();for(let i=1;i<=8;i++)await p.mouse.move(h.x+h.width/2+i*7,h.y+h.height/2);await p.mouse.up();await p.waitForTimeout(900);
  pr=await project();near(pr.tracks[0].clips[0].fadeIn,56/pr.zoom,.12,'dragging the handle 56 px sets the fade-in length');near(pr.tracks[0].clips[0].lenBeats,c0.lenBeats,1e-6,'… and nothing else (length)');assert.equal(pr.tracks[0].clips[0].startBeat,c0.startBeat);
  await p.keyboard.press('Control+z');await p.waitForTimeout(800);assert.equal((await project()).tracks[0].clips[0].fadeIn,0,'one undo step');
  // ---- meters ----
  await p.keyboard.press('Home');await p.keyboard.press(' ');await p.waitForTimeout(1300);
  const live=await p.evaluate(()=>({track:parseFloat(document.querySelector('[data-xmt-track-meter] i').style.width)||0,master:parseFloat(document.querySelector('[data-xmt-master-meter] i').style.width)||0,peak:document.querySelector('[data-xmt-peak]').innerText}));
  assert(live.track>40&&live.master>40,'track and master meters move while playing: '+JSON.stringify(live));const pk=/peak (-?[\d.]+) dB/.exec(live.peak);assert(pk&&Number(pk[1])<0&&Number(pk[1])>-30,'master peak in dB: '+live.peak);
  await p.keyboard.press(' ');await p.waitForTimeout(500);
  const rest=await p.evaluate(()=>({track:document.querySelector('[data-xmt-track-meter] i').style.width,master:document.querySelector('[data-xmt-master-meter] i').style.width}));assert.deepEqual(rest,{track:'0px',master:'0px'},'meters rest after Stop: '+JSON.stringify(rest));
  assert.deepEqual(errors,[]);
  console.log('PASS MTW-02 fade shapes measured (lin .5 / eq .707 / S), position-accurate fades, crossfade level even, fade handle, meters, header layout');
  await b.close();fs.rmSync(dir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
