'use strict';
// FORGE-VOICES-01 (real app): Gaia, Hildegard and Isolde in the Spectral Forge.
// Find the mode -> draw -> hear it. Checks what is actually played and downloaded:
// stereo loop of the figure's length, audible, not clipped; preset, slider (nothing is rendered
// while the hand moves, playback resumes after release), free ratio entry, stereo WAV,
// recipe restored from the Forge workspace, earlier modes untouched.
// Usage: node tests/e2e/forge_voices.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),KEY='xensonar.forge.voices.v1';
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.__played=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...a){const buf=this.buffer;
    if(buf&&buf.duration>1.5){const ch=[];for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);let pk=0,s=0;for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>pk)pk=v;s+=v*v}ch.push({peak:pk,rms:Math.sqrt(s/d.length)})}
     let diff=0;if(buf.numberOfChannels>1){const l=buf.getChannelData(0),r=buf.getChannelData(1);for(let i=0;i<l.length;i+=5)diff+=Math.abs(l[i]-r[i])}
     window.__played.push({channels:buf.numberOfChannels,duration:buf.duration,ch,diff,loop:this.loop})}return start.apply(this,a)}});
  const enter=async()=>{await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(1200);await p.getByRole('button',{name:/MATERIAL FORGE/}).click();await p.waitForTimeout(1500);
    await p.evaluate(()=>[...document.querySelectorAll('button')].find(x=>/Import Audio/.test(x.innerText)).click());await p.waitForSelector('select[aria-label="Select Listening Mode"]',{timeout:20000});await p.waitForTimeout(1500)};
  const picker=p.locator('select[aria-label="Select Listening Mode"]'),playButton='[data-forge-synth-lab-play]';
  const pick=async id=>{await picker.selectOption(id);await p.waitForTimeout(700)};
  const idle=()=>p.waitForFunction(s=>/Play/.test(document.querySelector(s).innerText),playButton,{timeout:40000});
  const stereo=()=>p.evaluate(()=>window.__played.filter(x=>x.channels===2));
  const heard=async n=>{await p.waitForFunction(n=>window.__played.filter(x=>x.channels===2).length>=n,n,{timeout:40000});return (await stereo())[n-1]};
  const draft=()=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),KEY);
  await p.goto('file://'+html);await enter();

  // 1 find: all three modes are offered next to Fractalia, in both pickers
  const options=await picker.evaluate(s=>[...s.options].map(o=>o.value));
  assert.deepEqual(options.slice(-5),['emilia','fractalia','gaia','hildegard','isolde']);assert(options.includes('donor')&&options.includes('pure-dieter'));
  assert.deepEqual(await p.locator('select[data-forge-shared-listening-picker]').first().evaluate(s=>[...s.options].map(o=>o.value)),options,'Play Rack picker offers the same modes');

  // 2 draw a small figure with the brush
  const box=await p.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>c.getBoundingClientRect()).filter(r=>r.width>600&&r.height>300).map(r=>({x:r.x,y:r.y,w:r.width,h:r.height}))[0]);assert(box,'spectrogram canvas');
  for(const [x0,y0,x1,y1] of [[.1,.55,.38,.55],[.4,.5,.62,.5],[.64,.45,.9,.42],[.12,.62,.9,.62]]){await p.mouse.move(box.x+box.w*x0,box.y+box.h*y0);await p.mouse.down();
    for(let i=1;i<=24;i++){await p.mouse.move(box.x+box.w*(x0+(x1-x0)*i/24),box.y+box.h*(y0+(y1-y0)*i/24));await p.waitForTimeout(5)}await p.mouse.up();await p.waitForTimeout(100)}

  // 3 hear: each mode plays a stereo loop of the figure
  let count=0,loopSeconds=null;
  for(const mode of ['gaia','hildegard','isolde']){
    await pick(mode);assert.equal(await p.locator(`[data-forge-voice-lab="${mode}"]`).count(),1,mode+' panel');assert.equal(await p.locator('select[data-forge-shared-listening-picker]').first().inputValue(),mode);
    const painted=await p.locator(`[data-forge-voice-picture="${mode}"]`).evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]+d[i+1]+d[i+2]>90)n++;return n});
    assert(painted>150,mode+' picture shows the figure ('+painted+' lit pixels)');
    await idle();await p.click(playButton);const buf=await heard(++count);loopSeconds??=buf.duration;
    assert.equal(buf.loop,true);assert(Math.abs(buf.duration-loopSeconds)<.01,mode+' loop length');assert(buf.diff>10,mode+' is stereo');
    for(const c of buf.ch){assert(c.peak<=.9201,mode+' peak '+c.peak);assert(c.rms>.02,mode+' audible, rms '+c.rms)}
    await p.waitForSelector('[data-forge-voice-status="rendered"]',{timeout:5000});assert.match(await p.innerText('[data-forge-voice-status]'),/notes · peak -?\d/);
    await p.click(playButton);await idle();
  }

  // 4 Gaia: preset, then a slider. Nothing is committed or rendered while the hand moves.
  await pick('gaia');await p.click('[data-forge-voice-preset="canyon"]');await p.waitForTimeout(250);
  assert.equal((await draft()).gaia.preset,'canyon');assert.equal(await p.getAttribute('[data-forge-voice-preset="canyon"]','aria-pressed'),'true');
  await idle();await p.click(playButton);await heard(++count);
  const slider=p.locator('[data-forge-voice-param="reachPitch"]');await slider.scrollIntoViewIfNeeded();const sb=await slider.boundingBox();
  await p.mouse.move(sb.x+sb.width*.4,sb.y+sb.height/2);await p.mouse.down();for(let i=0;i<15;i++){await p.mouse.move(sb.x+sb.width*(.4+i*.02),sb.y+sb.height/2);await p.waitForTimeout(16)}
  assert.equal((await draft()).gaia.params.reachPitch,12,'recipe untouched while dragging');assert.equal((await stereo()).length,count,'no render while dragging');
  assert.notEqual(await slider.inputValue(),'12','the slider follows the hand');
  await p.mouse.up();await heard(++count);
  const moved=(await draft()).gaia;assert(moved.params.reachPitch>14&&moved.preset===null,'released value is the recipe; it is no longer the preset');
  await p.waitForFunction(s=>/Pause/.test(document.querySelector(s).innerText),playButton,{timeout:8000});await p.click(playButton);
  await p.waitForTimeout(600);

  // 5 Isolde: free ratios, wrong input is refused visibly
  await pick('isolde');const equave=p.locator('[data-forge-voice-ratio-input="equave"]');
  await equave.fill('3/2');await equave.press('Enter');await p.waitForTimeout(200);assert.equal((await draft()).isolde.params.equave,1.5);
  await equave.fill('banana');await equave.press('Enter');await p.waitForTimeout(200);assert.equal(await p.locator('[data-forge-voice-lab="isolde"] [role=alert]').count(),1);assert.equal((await draft()).isolde.params.equave,1.5);
  await p.click('[data-forge-voice-ratio="equave:3/1"]');await p.waitForTimeout(200);assert.equal((await draft()).isolde.params.equave,3);
  const spiral=p.locator('[data-forge-voice-param="spiral"]');await spiral.focus();await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');await p.waitForTimeout(250);assert.equal((await draft()).isolde.params.spiral,2,'keyboard');
  await p.click('[data-forge-voice-preset="tritave"]');await p.waitForTimeout(250);

  // 6 the downloaded WAV keeps both channels
  await idle();const download=p.waitForEvent('download',{timeout:60000});
  await p.evaluate(()=>[...document.querySelectorAll('button')].find(x=>/⬇\s*WAV/.test(x.innerText)&&x.offsetParent).click());
  const wav=fs.readFileSync(await (await download).path());assert.equal(wav.readUInt16LE(22),2,'stereo WAV');assert.equal(wav.readUInt16LE(34),16);
  let lr=0;for(let i=44;i<wav.length-4;i+=400)lr+=Math.abs(wav.readInt16LE(i)-wav.readInt16LE(i+2));assert(lr>1000,'left and right differ in the file');
  assert(Math.abs((wav.length-44)/4/wav.readUInt32LE(24)-loopSeconds)<.01,'file length = loop length');

  // 7 an earlier mode still renders its own, unchanged (mono) way
  await pick('fractalia');assert.equal(await p.locator('[data-forge-voice-lab]').count(),0);assert.equal(await p.locator('[data-fractalia-lab]').count(),1);
  await idle();await p.evaluate(()=>{window.__played.length=0});await p.click(playButton);await p.waitForFunction(()=>window.__played.length>0,null,{timeout:60000});
  assert.equal((await p.evaluate(()=>window.__played[0])).channels,1,'Fractalia is untouched');await p.click(playButton);

  // 8 the recipe is part of the Forge workspace: it comes back without the browser draft
  await pick('isolde');await p.waitForTimeout(2500);await p.evaluate(k=>localStorage.removeItem(k),KEY);
  await p.reload();await enter();
  assert.equal(await picker.inputValue(),'isolde','selected mode restored');assert.equal(await p.getAttribute('[data-forge-voice-preset="tritave"]','aria-pressed'),'true','recipe restored from the workspace');
  assert.equal((await draft()).isolde.params.equave,3);

  assert.deepEqual(errors,[],'no page errors');
  console.log(`PASS forge voices: 3 modes found, drawn and heard (stereo loop ${loopSeconds.toFixed(2)} s), slider commits on release and playback resumes, ratios, stereo WAV, workspace restore, Fractalia unchanged`);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
