'use strict';
// LINE-IN-01 (real app, Material Forge): the Line-In key is the counterpart of Microphone: same row and look, right of the Import Audio
// tab, left of Project Name. It records an input (here Chromium's fake audio device) lossless and loads it into Import Audio.
// Usage: node tests/e2e/forge_line_in.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const ctx=await b.newContext({viewport:{width:1920,height:1080},permissions:['microphone']});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
 await p.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/MATERIAL FORGE/.test(b.innerText)).click());await p.waitForTimeout(2500);
 await p.getByText('Import Audio · Paint Figures').first().click();await p.waitForTimeout(3500);
 const key=p.locator('[data-forge-line-in]');await key.waitFor({timeout:20000});await key.scrollIntoViewIfNeeded();await p.waitForTimeout(600);
 // place: above Send to Multitrack, left of Figure Projects, right of the Import Audio tab, no overlap
 const g=await p.evaluate(()=>{const r=e=>e?e.getBoundingClientRect().toJSON():null,mic=[...document.querySelectorAll('button')].find(b=>/Microphone/.test(b.innerText)&&b.innerText.length<20);
  return {key:r(document.querySelector('[data-forge-line-in]')),mic:r(mic),pn:r(document.querySelector('.f33-project-name-label')),tab:r([...document.querySelectorAll('button')].find(b=>/I\s*M\s*P\s*O\s*R\s*T/.test(b.innerText))),micBg:getComputedStyle(mic).backgroundColor,keyBg:getComputedStyle(document.querySelector('[data-forge-line-in]')).backgroundColor}});
 if(process.env.SHOT)await p.screenshot({path:process.env.SHOT,clip:{x:g.key.x-260,y:g.key.y-30,width:900,height:170}});
 assert.ok(Math.abs(g.key.top-g.mic.top)<2&&Math.abs(g.key.height-g.mic.height)<1,'same row and height as Microphone: '+JSON.stringify(g));assert.ok(g.key.right<=g.pn.left+1,'left of Project Name: '+JSON.stringify(g));
 assert.ok(g.key.left>=g.mic.right,'on the other side of the Import Audio tab');assert.equal(g.keyBg,g.micBg,'the look of Microphone');assert.ok(g.key.width>=90,'a real key');
 // record 2.5 s from the (fake) input device and import it
 await key.click();const panel=p.locator('[data-forge-linein-panel]');await panel.waitFor();
 await panel.locator('[data-forge-linein-source="device"]').check();await p.waitForTimeout(300);
 await panel.locator('[data-forge-linein-rec]').click();if(process.env.SHOT2){await p.waitForTimeout(1200);const pb=await panel.boundingBox();await p.screenshot({path:process.env.SHOT2,clip:{x:pb.x-10,y:pb.y-50,width:pb.width+20,height:pb.height+60}})}await p.waitForFunction(()=>/Stop/.test(document.querySelector('[data-forge-linein-rec]')?.textContent||''),null,{timeout:15000});
 await p.waitForTimeout(2500);assert.match(await key.textContent(),/REC 0:0[1-4]/);
 await panel.locator('[data-forge-linein-rec]').click();
 await p.waitForFunction(()=>/Loaded into Import Audio|Line-In:/.test(document.querySelector('[data-forge-linein-msg]')?.textContent||''),null,{timeout:30000});
 const msg=await panel.locator('[data-forge-linein-msg]').innerText();assert.match(msg,/Loaded into Import Audio: 0:0[23] · \d+ Hz · stereo · lossless/,msg);
 await p.waitForFunction(()=>/Line-In .*\.wav/.test(document.body.innerText),null,{timeout:30000});
 const head=await p.evaluate(()=>{const m=document.body.innerText.match(/Line-In [^\n·]*\.wav · ([\d.]+)s/);return m?Number(m[1]):null});
 assert.ok(head>2&&head<3.6,'the recording is the Import Audio source: '+head+' s');
 assert.deepEqual(errors,[]);console.log('PASS LINE-IN-01 key beside Import Audio, input recorded lossless ('+head+' s) and loaded into Import Audio');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
