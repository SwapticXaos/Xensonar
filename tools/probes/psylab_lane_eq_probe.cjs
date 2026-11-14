'use strict';
// Probe: does the instrument EQ act on BOTH Psy Lab lanes (Wave Starter and Keyboard)? Plays one note per lane, cuts the lane's EQ, measures the lane tap.
// Usage: node tools/probes/psylab_lane_eq_probe.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 await p.addInitScript(()=>{const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);window.__pgCtx=c}}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
 await p.getByRole('button',{name:'Wave Starter sound'}).first().click();await p.waitForTimeout(300);
 await p.getByLabel('Wave Starter sound search').fill('Barber');await p.waitForTimeout(250);await p.getByRole('option',{name:'Barber Spiral'}).first().click();await p.waitForTimeout(800);
 const sound=JSON.parse(await E('JSON.stringify(__NodalBallGrid.params().waveStarterHoldSoundPreset)'));
 await p.evaluate(s=>__xenProbe.bridge.patch({keyboardHoldSoundPreset:s}),sound);await p.waitForTimeout(1200);
 const level=lane=>p.evaluate(async lane=>{const ctx=window.__pgCtx;const rec=await window.__xenProbe.draw.evalInBundle(`__XenPsyLab.outputs(window.__pgCtx).map(o=>o.lane)`);return rec},lane);
 const meas=async lane=>E(`(async()=>{const ctx=window.__pgCtx,o=__XenPsyLab.outputs(ctx).find(x=>x.lane==='${lane}');if(!o)return -2;const a=ctx.createAnalyser();a.fftSize=2048;o.node.connect(a);const b=new Float32Array(2048);let acc=0,n=0;for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,40));a.getFloatTimeDomainData(b);for(const x of b)acc+=x*x;n+=2048}o.node.disconnect(a);return Math.sqrt(acc/n)})()`);
 const cut=(kind,v)=>E(`(()=>{const k=__XenEQ.keyFor('${kind}','instrument');__XenEQ.set(k,{a:Array(360).fill(${v}),enabled:true});const c=__XenEQ.snapshot()[k];return JSON.stringify({mode:c.mode,enabled:c.enabled,a0:c.a[0]})})()`);
 console.log('lanes with an output:',JSON.stringify(await E('JSON.stringify(__XenPsyLab.outputs(window.__pgCtx).map(o=>o.lane))')),'status',await E('JSON.stringify(__XenPsyLab.host(false).status())'));
 // keyboard lane
 await p.keyboard.down('a');await p.waitForTimeout(500);const k0=await meas('keyboard');console.log('keyboard flat',k0);
 console.log('cut cfg',await cut('keyboard',-1));await p.waitForTimeout(1500);const k1=await meas('keyboard');console.log('keyboard cut',k1);await cut('keyboard',0);await p.waitForTimeout(1200);await p.keyboard.up('a');await p.waitForTimeout(500);
 // wave lane (Enter = short gate, hold the mouse instead)
 const h=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);await h.evaluate(c=>c.scrollIntoView({block:'center'}));const bx=await h.boundingBox();
 await p.mouse.move(bx.x+bx.width/2,bx.y+bx.height*.6);await p.mouse.down();await p.waitForTimeout(500);const w0=await meas('wave');console.log('wave flat',w0);
 await cut('wave',-1);await p.waitForTimeout(1500);const w1=await meas('wave');console.log('wave cut',w1);await cut('wave',0);await p.mouse.up();
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
