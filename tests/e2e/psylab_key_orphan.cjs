'use strict';
// KEY-ORPHAN-01 (real app, Psy Lab room): a key whose release never arrived must not leave an unstoppable note.
// The same key pressed again (second keydown without keyup, not a repeat) ends the old note; its keyup then ends the new one. Nothing is left sounding.
// Usage: node tests/e2e/psylab_key_orphan.cjs [html]
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const S=window.__pg={msgs:[]};let engines=0;const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(n==='xen-psylab-v1'){const eng=++engines;const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{if(m&&(m.t==='on'||m.t==='off'||m.t==='alloff'))S.msgs.push({eng,t:m.t,id:m.id});return pm(m,t)}}}}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 await p.evaluate(()=>{const b=[...document.querySelectorAll('header button')].find(x=>/PSY LAB/.test(x.innerText));b&&b.click()});await p.waitForTimeout(3000);
 const ledger=async()=>{const m=await p.evaluate(()=>window.__pg.msgs.slice());const on=new Map();for(const x of m){if(x.t==='on')on.set(x.eng+':'+x.id,1);else if(x.t==='off')on.delete(x.eng+':'+x.id);else if(x.t==='alloff'){for(const k of [...on.keys()])if(k.startsWith(x.eng+':'))on.delete(k)}}return{hang:[...on.keys()],ons:m.filter(x=>x.t==='on').length}};
 const clear=()=>p.evaluate(()=>{window.__pg.msgs.length=0});
 const synth=(type,code,key)=>p.evaluate(([type,code,key])=>document.body.dispatchEvent(new KeyboardEvent(type,{code,key,bubbles:true,cancelable:true})),[type,code,key]);
 await p.evaluate(()=>document.activeElement?.blur?.());
 // plain press: baseline
 await p.keyboard.down('l');await p.waitForTimeout(300);await p.keyboard.up('l');await p.waitForTimeout(1200);let r=await ledger();assert.equal(r.ons,1);assert.deepEqual(r.hang,[],'plain press ends with its key');await clear();
 // lost keyup: keydown, keydown (not a repeat), keyup
 await synth('keydown','KeyL','l');await p.waitForTimeout(200);await synth('keydown','KeyL','l');await p.waitForTimeout(200);await synth('keyup','KeyL','l');await p.waitForTimeout(1200);
 r=await ledger();assert.equal(r.ons,2,'the second keydown sounds again');assert.deepEqual(r.hang,[],'no orphan: the first note ended when the key was pressed again');await clear();
 // a key that never gets its keyup: pressing it again and releasing it silences everything
 await synth('keydown','KeyK','k');await p.waitForTimeout(200);await synth('keydown','KeyK','k');await synth('keyup','KeyK','k');await p.waitForTimeout(1200);
 r=await ledger();assert.deepEqual(r.hang,[],'press-again silences a stuck key');await clear();
 // hiding the tab releases held keys
 await p.keyboard.down('j');await p.waitForTimeout(200);await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});await p.waitForTimeout(1200);
 r=await ledger();assert.deepEqual(r.hang,[],'a hidden tab releases the held key');
 assert.deepEqual(errors,[]);console.log('PASS KEY-ORPHAN psylab lost keyup leaves no orphan');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
