'use strict';
// MT-END-01 + MT-NAV-SEEK-02 (real app, Room IV Multitrack):
//  1. Play without Loop runs to the end of the song and then stops by itself: the button shows Play again, the playhead is gone,
//     the cursor stays where playback started.
//  2. While playing, a click WITHOUT dragging inside the navigator's view window seeks there (before: only a click beside the window did);
//     a drag of the window still only scrolls and does not seek.
//  3. Follow: zoomed in, the view turns the page with the playhead; Follow off keeps it.  4. End key: cursor to the song end.
// Usage: node tests/e2e/mt_end_and_navseek.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {wav}=require('../helpers/analysis_synth.cjs');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'xen-mtend-')),file=path.join(dir,'short.wav');
{const SR=44100,n=Math.round(SR*3),x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=.3*Math.sin(2*Math.PI*220*i/SR)*(i%(SR/2)<SR/8?1:.3);fs.writeFileSync(file,wav(x,SR))}/* 3 s */
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1500,height:900}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click().catch(()=>{});await p.waitForTimeout(2000);
 await p.evaluate(()=>{[...document.querySelectorAll('button')].find(x=>/MULTITRACK/.test(x.innerText)&&x.offsetParent).click()});
 await p.waitForSelector('[data-xmt-tempo]',{timeout:30000});await p.waitForTimeout(800);
 await p.setInputFiles('.xmt input[type=file]',file);await p.waitForSelector('.xmt .clip',{timeout:30000});await p.waitForTimeout(1500);
 const playBtn=()=>p.locator('.xmt button',{hasText:/^(▶|■)|Play|Stop/}).first();
 const playing=()=>p.locator('.xmt .ph').evaluate(e=>e.style.display!=='none').catch(()=>false);
 const label=()=>p.locator('.xmt .muted',{hasText:/^Cursor /}).first().innerText();
 // 1) play to the end
 const c0=await label();await p.getByRole('button',{name:/Play from cursor/}).click();await p.waitForTimeout(800);assert(await playing(),'playing');
 let stopped=false;for(let i=0;i<40&&!stopped;i++){await p.waitForTimeout(250);stopped=!(await playing())}
 assert(stopped,'playback stopped by itself after the song end (3 s clip + 1.5 s tail)');
 assert(await p.getByRole('button',{name:/Play from cursor/}).count()>0,'the button shows Play again');
 assert.equal(await label(),c0,'the cursor stays where playback started');
 // 2) navigator: click inside the view window while playing seeks; drag does not
 for(let i=0;i<4;i++){await p.setInputFiles('.xmt input[type=file]',file);await p.waitForTimeout(1500)}/* a longer song: more clips */
 const rail=p.locator('.rail.h');await rail.scrollIntoViewIfNeeded();const rb=await rail.boundingBox();const th=await p.locator('.rail.h .thumb').boundingBox();
 assert(th&&th.width>40,'the view window is visible in the navigator: '+JSON.stringify(th));
 await p.getByRole('button',{name:/Play from cursor/}).click();await p.waitForTimeout(900);
 const xIn=th.x+th.width*.6;await p.mouse.click(xIn,th.y+th.height/2);await p.waitForTimeout(700);
 const c1=await label();assert.notEqual(c1,c0,'a click inside the view window moved the play position: '+c1);assert(await playing(),'keeps playing');
 const ph1=await p.locator('.xmt .ph').evaluate(e=>parseFloat(e.style.left));
 // drag the window: no seek
 await p.mouse.move(th.x+th.width*.5,th.y+th.height/2);await p.mouse.down();await p.mouse.move(th.x+th.width*.5+60,th.y+th.height/2,{steps:6});await p.mouse.up();await p.waitForTimeout(500);
 assert.equal(await label(),c1,'dragging the window does not seek');
 await p.getByRole('button',{name:/^Stop|■/}).first().click().catch(()=>{});await p.waitForTimeout(400);
 // 3) MT-FOLLOW-01: zoomed in, the view turns the page with the playhead; Follow off: it stays
 const sc=p.locator('#xmt-tracks');await rail.focus();for(let i=0;i<10;i++){await p.keyboard.press('+');await p.waitForTimeout(60)}await p.keyboard.press('Home');await p.waitForTimeout(400);
 const geo=()=>sc.evaluate(el=>{const ph=document.querySelector('.xmt .ph');return {sl:el.scrollLeft,cw:el.clientWidth,phl:parseFloat(ph.style.left),vis:ph.style.display!=='none'}});
 await p.locator('.xmt button',{hasText:'⏮'}).first().click();await p.getByRole('button',{name:/Play from cursor/}).click();
 let g=null,turned=false;for(let i=0;i<30&&!turned;i++){await p.waitForTimeout(300);g=await geo();turned=g.sl>0}
 assert(turned,'the view turned the page while playing: '+JSON.stringify(g));const inView=g.phl>=g.sl+240-2&&g.phl<=g.sl+g.cw+2;assert(inView,'the playhead is inside the view: '+JSON.stringify(g));
 await p.getByRole('button',{name:/^Stop|■/}).first().click().catch(()=>{});await p.waitForTimeout(300);
 await p.locator('[data-xmt-follow]').click();await sc.evaluate(el=>{el.scrollLeft=0});await p.locator('.xmt button',{hasText:'⏮'}).first().click();
 await p.getByRole('button',{name:/Play from cursor/}).click();await p.waitForTimeout(4500);g=await geo();assert.equal(g.sl,0,'Follow off: the view stays');
 await p.getByRole('button',{name:/^Stop|■/}).first().click().catch(()=>{});await p.locator('[data-xmt-follow]').click();
 // 4) MT-END-02: End key = cursor to the song end
 await sc.click({position:{x:400,y:5}}).catch(()=>{});await p.keyboard.press('End');await p.waitForTimeout(300);const ce=await label();assert(ce!==c0&&/Cursor/.test(ce),'End moved the cursor to the song end: '+ce);
 assert.deepEqual(errors,[]);console.log('PASS MT-END-01/02 + MT-NAV-SEEK-02 + MT-FOLLOW-01 · stopped at the end, cursor '+c0+' · click in the window → '+c1+' (playhead '+ph1.toFixed(0)+' px)');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
