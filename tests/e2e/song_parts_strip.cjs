'use strict';
// SONG-PARTS-01 (real app, Wave Editor / import area): a coloured strip above the overview splits the whole upload into parts A, B, C …
// (returning material = same letter and colour); a click puts the blue view range and the purple loop mask on the part and sets the
// Taktometer (bars, segments per bar, BPM). A drone is one part. The analysis runs in a Blob worker, only after a click on the strip.
// Usage: node tests/e2e/song_parts_strip.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {song,SR}=require('../helpers/meter_synth.cjs'),{wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-parts-'));
const T={A:{},B:{root:73.4,chord:[1,1.2,1.5,1.8],chordHz:293.7,hats:false,lead:660},C:{root:41.2,chord:[1,1.335],chordHz:164.8,lead:0}};
const s=song({bpm:120,S:4,sections:[...'ABACB'].map(k=>({bars:8,...T[k]}))}),file=path.join(dir,'abacb_120.wav');fs.writeFileSync(file,wav(s.samples,SR));
const drone=path.join(dir,'drone.wav');{const n=SR*40,x=new Float32Array(n);for(let i=0;i<n;i++){const t=i/SR;x[i]=.3*Math.sin(2*Math.PI*65.4*t)*(1+.2*Math.sin(2*Math.PI*.07*t))+.15*Math.sin(2*Math.PI*98.1*t)}fs.writeFileSync(drone,wav(x,SR))}
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1100}})).newPage();const errors=[],warn=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(/song-parts/.test(m.text()))warn.push(m.text())});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2000);
 await p.getByText('Import Audio').first().click();await p.waitForTimeout(2500);
 const load=async f=>{await p.locator('input[type=file][accept^="audio/"]').setInputFiles(f);await p.getByRole('button',{name:'Wave Editor'}).first().waitFor({timeout:60000});
  // SONG-PARTS-MANUAL-01: nothing is analysed on upload – the strip waits for a click
  await p.waitForFunction(()=>document.querySelector('[data-xwe-song-parts]')?.getAttribute('data-xwe-song-parts')==='ready',null,{timeout:20000});
  await p.waitForTimeout(1200);assert.equal(await p.locator('[data-xwe-song-parts]').getAttribute('data-xwe-song-parts'),'ready','no analysis without a click');
  assert.equal(await p.locator('[data-xwe-song-part]').count(),0);await p.locator('[data-xwe-song-start]').click();
  await p.waitForFunction(()=>document.querySelector('[data-xwe-song-parts]')?.getAttribute('data-xwe-song-parts')==='done',null,{timeout:60000})};
 await load(file);
 const strip=p.locator('[data-xwe-song-parts]');await strip.scrollIntoViewIfNeeded();
 const parts=strip.locator('[data-xwe-song-part]');assert.equal(await parts.count(),5);
 assert.deepEqual(await parts.evaluateAll(n=>n.map(x=>x.dataset.xweSongPart)),[...'ABACB']);
 const colors=await parts.evaluateAll(n=>n.map(x=>getComputedStyle(x).backgroundColor));assert.equal(colors[0],colors[2]);assert.equal(colors[1],colors[4]);assert.notEqual(colors[0],colors[1]);
 // the strip sits right above the overview canvas and spans its width
 const geo=await p.evaluate(()=>{const s=document.querySelector('.xwe-song-strip').getBoundingClientRect(),c=document.querySelector('[data-xwe-song-parts]').nextElementSibling;const r=c.getBoundingClientRect();return{tag:c.tagName,gap:r.top-s.bottom,dw:Math.abs(r.width-s.width)}});
 assert.equal(geo.tag,'CANVAS');assert.ok(geo.gap>=0&&geo.gap<14,'strip above the overview: '+JSON.stringify(geo));assert.ok(geo.dw<4);
 assert.match(await strip.innerText(),/5 parts · 3 kinds \(A B C\) · 4 segments per bar · 1(19|20)\.\d\d BPM/);
 // KEY-01: every wide part shows its key (chroma timeline of the analysis); A is built on an A major triad
 const keys=await strip.locator('[data-xwe-song-key]').evaluateAll(n=>n.map(x=>x.dataset.xweSongKey));assert.equal(keys.length,5,'a key per part: '+keys);assert.equal(keys[0],'A','part A in A major: '+keys);assert.equal(keys[0],keys[2],'returning A, same key');
 assert.match(await parts.first().getAttribute('title'),/key A major/);
 // KEY-02: the Wave Editor analysis (pitch lines) on one part, on request: root in Hz, tuning, scale; the ♪ marks it
 const sb0=await p.locator('.xwe-song-strip').boundingBox();await p.mouse.click(sb0.x+sb0.width*.05,sb0.y+sb0.height/2,{button:'right'});
 const smenu=p.locator('[data-xwe-song-menu]');await smenu.waitFor();assert.match(await smenu.locator('[data-xwe-song-keyline]').innerText(),/^Key A major/);
 await smenu.locator('[data-xwe-song-action="tonal-part"]').click();
 await p.waitForFunction(()=>/analysed|canceled/.test(document.querySelector('[data-xwe-song-caption]')?.textContent||''),null,{timeout:90000});
 assert.match(await p.locator('[data-xwe-song-caption]').innerText(),/1 part analysed/);const t0=await parts.first().getAttribute('title');
 assert.match(t0,/pitch lines: (\d+(\.\d+)? Hz [≈=] A\d|not determined|no )/,t0);console.log('  part A: '+t0.split(' · ').filter(x=>/key|pitch/.test(x)).join(' · '));
 assert.match(await strip.locator('[data-xwe-song-key]').first().innerText(),/♪|A/);
 // click the second A: blue view and purple mask on 32–48 s, Taktometer 8 bars of 4
 await parts.nth(2).click();await p.waitForTimeout(500);
 assert.equal(await parts.nth(2).getAttribute('aria-pressed'),'true');
 const sel=await p.evaluate(()=>{const v=[...document.querySelectorAll('div')].filter(d=>/^(Viewport|Fine Selection)$/.test(d.textContent));return v.map(d=>d.nextElementSibling?.textContent)});
 const nums=sel.map(t=>(t.match(/[\d.]+/g)||[]).map(Number));assert.ok(Math.abs(nums[0][0]-32)<.05&&Math.abs(nums[0][1]-48)<.05,'blue view '+sel[0]);assert.ok(Math.abs(nums[1][0]-32)<.05&&Math.abs(nums[1][1]-48)<.05,'purple mask '+sel[1]);
 assert.match(await strip.innerText(),/A · 0:32–0:48 · 8 bars × 4 = 32 segments · 1(19|20)\.\d\d BPM/);
 // CUE-01: Subdivide at bar 3 of this A (mask 32–48 s) puts the green playhead at 36 s for the next Play; the mask stays
 {const st=await p.locator('.xwe-song-strip').boundingBox();await p.mouse.click(st.x+st.width*.45,st.y+st.height*.3,{button:'right'});const sm=p.locator('[data-xwe-song-menu]');await sm.waitFor();
  await sm.locator('[data-xwe-song-bar]').click();await sm.locator('[data-xwe-song-barpick="3"]').click();await p.waitForTimeout(400);
  assert.match(await p.locator('[data-xwe-song-caption]').innerText(),/green playhead is there/);
  const green=await p.evaluate(()=>{const c=document.querySelector('canvas[height="124"]');const g=c.getContext('2d').getImageData(0,0,c.width,c.height).data,W=c.width,y=Math.floor(c.height/2);
   for(let x=0;x<W;x++){const i=(y*W+x)*4;if(g[i]<60&&g[i+1]>180&&g[i+2]<120)return x/W}const X=Math.round(W*.25),o=[];for(let d=-3;d<=3;d++){const i=(y*W+X+d)*4;o.push([g[i],g[i+1],g[i+2]].join(","))}return "no green; at 25%: "+o.join(" | ")+" canvases "+document.querySelectorAll("canvas[height=\"124\"]").length});
  const vp=(await p.evaluate(()=>{const d=[...document.querySelectorAll('div')].find(d=>d.textContent==='Viewport');return d.nextElementSibling.textContent})).match(/[\d.]+/g).map(Number);
  assert.ok(green!=null&&Math.abs(vp[0]+green*(vp[1]-vp[0])-36)<.3,'green playhead at 36 s: '+green+' in '+vp);await p.keyboard.press('Escape')}
 const m=p.locator('[data-xen-bar-meter]');await m.scrollIntoViewIfNeeded();const bb=await m.boundingBox();await p.mouse.click(bb.x+bb.width*.3,bb.y+bb.height/2,{button:'right'});
 const menu=p.locator('[data-xwe-meter-menu]');await menu.waitFor();assert.equal(await menu.locator('input[aria-label="Number of Bars"]').inputValue(),'8');assert.equal(await menu.locator('input[aria-label="Number of Segments"]').inputValue(),'4');
 // Analyze inside a part counts like the part (SONG-PARTS-02): 32 segments, 8 × 4 first
 await menu.locator('[data-xwe-meter-action="analyze"]').click();await menu.locator('[data-xwe-meter-result]').waitFor();
 const res=await menu.locator('[data-xwe-meter-result]').innerText();assert.match(res,/^32 segments/m,res);assert.match(res,/counted like part A/,res);
 assert.equal(await menu.locator('[data-xwe-meter-reading]').first().getAttribute('data-xwe-meter-reading'),'4');
 await p.keyboard.press('Escape');
 // a drone: one part, no meter
 await load(drone);await p.waitForFunction(()=>/One part/.test(document.querySelector('[data-xwe-song-caption]')?.textContent||''),null,{timeout:60000});assert.equal(await parts.count(),1);assert.match(await strip.innerText(),/One part · No clear meter/);
 assert.deepEqual(errors,[]);assert.deepEqual(warn,[],'the worker ran (no main-thread fallback)');
 console.log('PASS SONG-PARTS-01 ABACB strip above the overview, click = view + mask + Taktometer 8 × 4, Analyze counts like the part, drone = one part');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
