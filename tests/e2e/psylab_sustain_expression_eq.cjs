'use strict';
// PSY-SUS-01 / PSY-EXPR-01 / PSY-EQ-01 (real app): a Psy Lab Keyboard sound is wired like the classic sounds:
//  - EQ: the lane engine goes through the instrument EQ of its lane (kind 'keyboard'), stems tap the EQ'd signal;
//  - Sustain key (= / ´ / '): a key released while it is held keeps sounding; releasing Sustain ends the note with a QUICK damp (off + fast);
//  - B (raise) / Left Alt (lower): keyboard expression = output gain of the Keyboard lane, Pedal mode returns on release.
// Usage: node tests/e2e/psylab_sustain_expression_eq.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const S=window.__pg={msgs:[]};let engines=0;const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(n==='xen-psylab-v1'){const eng=++engines;window.__pgCtx=c;const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{if(m&&(m.t==='on'||m.t==='off'||m.t==='bend'))S.msgs.push({eng,t:m.t,hz:m.hz,fast:m.fast,at:performance.now()});return pm(m,t)}}}}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
 await p.getByRole('button',{name:'Wave Starter sound'}).first().click();await p.waitForTimeout(300);
 await p.getByLabel('Wave Starter sound search').fill('Barber');await p.waitForTimeout(250);await p.getByRole('option',{name:'Barber Spiral'}).first().click();await p.waitForTimeout(800);
 const sound=JSON.parse(await E('JSON.stringify(__NodalBallGrid.params().waveStarterHoldSoundPreset)'));
 await p.evaluate(s=>__xenProbe.bridge.patch({keyboardHoldSoundPreset:s}),sound);await p.waitForTimeout(1200);
 const msgs=()=>p.evaluate(()=>window.__pg.msgs.slice()),clear=()=>p.evaluate(()=>{window.__pg.msgs.length=0});
 const status=()=>E('JSON.stringify(__XenPsyLab.host(false).status())').then(JSON.parse);
 // ---- EQ ----
 await p.keyboard.down('a');await p.waitForTimeout(500);await p.keyboard.up('a');await p.waitForTimeout(600);
 const st0=await status();assert.equal(st0.eq.keyboard,'keyboard','the Keyboard lane engine is routed through the instrument EQ of its lane');
 // the EQ really acts on BOTH lanes: a full-range cut on the lane's instrument EQ (the real EQ state, as the dock writes it) lowers the signal at that lane's tap; restored afterwards
 const meas=lane=>E(`(async()=>{const ctx=window.__pgCtx,o=__XenPsyLab.outputs(ctx).find(x=>x.lane==='${lane}');if(!o)return -2;const a=ctx.createAnalyser();a.fftSize=2048;o.node.connect(a);const b=new Float32Array(2048);let acc=0,n=0;for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,40));a.getFloatTimeDomainData(b);for(const x of b)acc+=x*x;n+=2048}o.node.disconnect(a);return Math.sqrt(acc/n)})()`);
 const eqSet=(kind,v)=>E(`(()=>{__XenEQ.set(__XenEQ.keyFor('${kind}','instrument'),{a:Array(360).fill(${v}),enabled:true});return 1})()`);
 const lane=async(name,kind,down,up)=>{await down();await p.waitForTimeout(500);const flat=await meas(name);await eqSet(kind,-1);await p.waitForTimeout(1500);const cut=await meas(name);await eqSet(kind,0);await p.waitForTimeout(1200);await up();await p.waitForTimeout(500);
  assert(flat>.01,name+' lane: the held note is audible at its tap ('+flat.toFixed(4)+')');assert(cut<flat*.2,name+' lane: a cut on its instrument EQ lowers it ('+flat.toFixed(4)+' -> '+cut.toFixed(4)+')');return[flat,cut]};
 const kbd=await lane('keyboard','keyboard',()=>p.keyboard.down('a'),()=>p.keyboard.up('a'));
 const hh=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);await hh.evaluate(c=>c.scrollIntoView({block:'center'}));const hb=await hh.boundingBox();
 const wav=await lane('wave','wave',async()=>{await p.mouse.move(hb.x+hb.width/2,hb.y+hb.height*.6);await p.mouse.down()},()=>p.mouse.up());
 // ---- Sustain ----
 await clear();await p.keyboard.down('Equal');await p.keyboard.down('a');await p.waitForTimeout(300);await p.keyboard.up('a');await p.waitForTimeout(500);
 let m=await msgs();assert(m.some(x=>x.t==='on'),'the note started');assert(!m.some(x=>x.t==='off'),'Sustain held: the released key does not end the note');
 await clear();await p.keyboard.up('Equal');await p.waitForTimeout(300);
 m=await msgs();const off=m.find(x=>x.t==='off');assert(off&&off.fast===1,'Sustain released: the note is damped quickly ('+JSON.stringify(off)+')');
 // without Sustain: normal release (no fast)
 await clear();await p.keyboard.down('a');await p.waitForTimeout(300);await p.keyboard.up('a');await p.waitForTimeout(300);
 m=await msgs();const off2=m.find(x=>x.t==='off');assert(off2&&!off2.fast,'without Sustain the key ends the note with the patch\'s own release');
 // ---- Expression (B raises, Pedal mode returns) ----
 await p.keyboard.down('a');await p.waitForTimeout(300);
 const g0=(await status()).gains.keyboard;
 await p.keyboard.down('b');await p.waitForTimeout(900);const g1=(await status()).gains.keyboard;
 assert(g1>g0*1.3,'B held: the Keyboard lane gets louder ('+g0.toFixed(2)+' -> '+g1.toFixed(2)+')');assert(g1<=2.001,'capped at x2');
 await p.keyboard.up('b');await p.waitForTimeout(1500);const g2=(await status()).gains.keyboard;
 assert(Math.abs(g2-g0)<.15,'Pedal mode: back to the base level on release ('+g2.toFixed(2)+')');
 await p.keyboard.down('Alt');await p.waitForTimeout(900);const g3=(await status()).gains.keyboard;await p.keyboard.up('Alt');
 assert(g3<g0*.8,'Left Alt held: quieter ('+g3.toFixed(2)+')');
 await p.keyboard.up('a');await p.waitForTimeout(300);
 assert.deepEqual(errors,[]);
 console.log('PASS PSY-SUS/EXPR/EQ: lane EQ routed; Sustain defers the key release and damps fast on release; B/Alt = lane gain '+g0.toFixed(2)+' -> '+g1.toFixed(2)+' / '+g3.toFixed(2));
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
