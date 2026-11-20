'use strict';
// BALL-PAINT-01 (real app, Art Installation): the ball leaves a trail that builds up and fades only slowly.
// Usage: node tests/e2e/ball_paint.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const q=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];q.on('pageerror',e=>errors.push(e.message));
 await q.addInitScript({path:path.resolve(__dirname,'../../tools/probes/room_activity_instrument.js')});
 await q.goto('file://'+html);await q.waitForTimeout(3500);
 await q.evaluate(()=>[...document.querySelectorAll('header button')].find(b=>/NODAL/.test(b.innerText)).click());await q.waitForTimeout(2000);
 const art=q.getByRole('button',{name:'Art Installation'});if(await art.count())await art.first().click();await q.waitForTimeout(1500);
 const lit=()=>q.evaluate(()=>{let best=0;for(const c of document.querySelectorAll('canvas')){if(c.width<300)continue;const d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=16){if(d[i]>60&&d[i+1]>60&&d[i+2]>60)n++;}best=Math.max(best,n);}return best;});
 await q.waitForTimeout(2500);
 const bx=await q.evaluate(()=>{const c=[...document.querySelectorAll('canvas')].find(c=>c.width>300);const r=c.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};});
 for(let k=0;k<140;k++){const t=k/12;await q.mouse.move(bx.x+bx.w*(.5+.35*Math.cos(t)),bx.y+bx.h*(.5+.35*Math.sin(t*1.3)));await q.waitForTimeout(40);}
 await q.waitForTimeout(500);const a=await lit();await q.screenshot({path:'dist/ball_paint.png'});
 await q.waitForTimeout(8000);const b2=await lit();
 console.log('bright pixels (sampled):',a,'->',b2);
 assert.ok(b2>=a*0.9,'the picture does not empty out while the ball wanders: '+a+' -> '+b2);
 assert.deepEqual(errors,[],'no page errors');
 await b.close();console.log('ball_paint OK');
})().catch(e=>{console.error(e);process.exit(1)});
