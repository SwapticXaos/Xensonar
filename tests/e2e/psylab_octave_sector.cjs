'use strict';
// PSY-OCT-01 (real app): a Psy Lab sound behaves like every other sound for
//  - the Sector waves (bottom letter row): the fifth (x1.5) of the played tone, not the same tone;
//  - Backspace (octave hold): a held note glides one octave up fast, back down on release; a note started while Backspace is held starts an octave up.
// Usage: node tests/e2e/psylab_octave_sector.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const cents=(a,b)=>1200*Math.log2(a/b);
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const S=window.__pg={msgs:[]};let engines=0;const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(n==='xen-psylab-v1'){const eng=++engines;const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{if(m&&(m.t==='on'||m.t==='bend'))S.msgs.push({eng,t:m.t,hz:m.hz,at:performance.now()});return pm(m,t)}}}}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 await p.getByRole('button',{name:'Wave Starter sound'}).first().click();await p.waitForTimeout(300);
 await p.getByLabel('Wave Starter sound search').fill('Barber');await p.waitForTimeout(250);await p.getByRole('option',{name:'Barber Spiral'}).first().click();await p.waitForTimeout(800);
 await p.evaluate(()=>__xenProbe.bridge.patch({lockCursorToGrid:false}));await p.waitForTimeout(500);
 const h=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);await h.evaluate(c=>c.scrollIntoView({block:'center'}));await p.waitForTimeout(300);const bx=await h.boundingBox();
 const x=bx.x+bx.width*.5,y=bx.y+bx.height*.6;
 const msgs=()=>p.evaluate(()=>window.__pg.msgs.slice()),clear=()=>p.evaluate(()=>{window.__pg.msgs.length=0});
 await p.mouse.move(x,y);await p.waitForTimeout(300);
 // ---- 1. mouse note held, Backspace held: fast glide up by one octave; released: back down ----
 await clear();await p.mouse.down();await p.waitForTimeout(400);
 const base=(await msgs()).find(m=>m.t==='on').hz;
 await clear();await p.keyboard.down('Backspace');await p.waitForTimeout(500);
 const up=await msgs();assert(up.length>=3,'the octave is a glissando, not a jump ('+up.length+' pitch messages)');
 assert(Math.abs(cents(up[up.length-1].hz,base*2))<5,'Backspace held: the held note ends one octave up ('+up[up.length-1].hz.toFixed(1)+' vs '+(base*2).toFixed(1)+')');
 assert(up.every((m,i)=>i===0||m.hz>=up[i-1].hz-.01),'the glide only rises');
 assert(up[up.length-1].at-up[0].at<350,'fast: the glide takes well below 350 ms ('+Math.round(up[up.length-1].at-up[0].at)+' ms)');
 await clear();await p.keyboard.up('Backspace');await p.waitForTimeout(500);
 const down=await msgs();assert(down.length>=3&&Math.abs(cents(down[down.length-1].hz,base))<5,'Backspace released: glides back to the played pitch ('+down[down.length-1]?.hz.toFixed(1)+' vs '+base.toFixed(1)+')');
 await p.mouse.up();await p.waitForTimeout(300);
 // ---- 2. Backspace already held: the note starts an octave up ----
 await p.keyboard.down('Backspace');await p.waitForTimeout(200);await clear();await p.mouse.down();await p.waitForTimeout(300);
 const first=(await msgs()).find(m=>m.t==='on');assert(first&&Math.abs(cents(first.hz,base*2))<5,'Backspace held before the click: the note starts one octave up ('+first?.hz.toFixed(1)+')');
 await p.mouse.up();await p.keyboard.up('Backspace');await p.waitForTimeout(500);
 // ---- 3. Sector wave (bottom letter row): the fifth of the played tone ----
 await clear();await p.keyboard.press('Enter');await p.waitForTimeout(400);
 const plain=(await msgs()).find(m=>m.t==='on');assert(plain,'Enter plays the Psy Lab note');
 await clear();let sector=null;for(const k of ['y','x','c','v']){await p.keyboard.press(k);await p.waitForTimeout(300);sector=(await msgs()).find(m=>m.t==='on');if(sector)break}
 assert(sector,'a key of the bottom row launches a Sector wave');
 assert(Math.abs(cents(sector.hz,plain.hz*1.5))<5,'Sector wave: the fifth of the played tone ('+sector.hz.toFixed(1)+' vs '+(plain.hz*1.5).toFixed(1)+')');
 assert.deepEqual(errors,[]);
 console.log('PASS PSY-OCT-01: Backspace = fast octave glissando up/down on a held Psy Lab note ('+up.length+'/'+down.length+' steps), starts an octave up when held first; Sector wave = fifth ('+(cents(sector.hz,plain.hz)).toFixed(0)+' cents)');
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
