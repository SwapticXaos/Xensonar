'use strict';
// PSY-GRID-01 (real app): a Psy Lab note held with the left mouse in the Live Room follows the pointer like the pad of Room V.
//  Snap on : it sounds only on OPEN Grid lines (muted steps of the scale are skipped) and on the same line the Wave Starter's own snap
//            gives for the pointer (the green line), stepping from line to line; no glide through the tones in between.
//  Snap off: free glissando (unchanged), while the Keyboard still plays only the open Grid tones: chords on the keys plus a
//            glissando lead with the mouse (the decoupling asked for already exists; the switch now says so).
// Before PSY-GRID-01 the held note glided towards its target and sounded ~60 % of the time between Grid lines, also on muted ones,
// while the screen named a Grid tone. Usage: node tests/e2e/psylab_live_grid.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
const MUTED=[2,5,9,12,16,20,23,27];
const cents=(a,b)=>1200*Math.log2(a/b),near=(f,l)=>l.reduce((m,g)=>Math.min(m,Math.abs(cents(f,g))),Infinity);
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const S=window.__pg={msgs:[],ptr:null};let engines=0;const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(n==='xen-psylab-v1'){const eng=++engines;const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{if(m&&(m.t==='on'||m.t==='bend'))S.msgs.push({eng,t:m.t,hz:m.hz,at:performance.now()});return pm(m,t)}}}};
  window.addEventListener('mousemove',e=>{const c=e.target;if(c instanceof HTMLCanvasElement){const r=c.getBoundingClientRect();S.ptr=(e.clientY-r.top)*580/r.height}},true)});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
 await p.getByRole('button',{name:'Wave Starter sound'}).first().click();await p.waitForTimeout(300);
 await p.getByLabel('Wave Starter sound search').fill('Barber');await p.waitForTimeout(250);await p.getByRole('option',{name:'Barber Spiral'}).first().click();await p.waitForTimeout(800);
 const setGrid=lock=>p.evaluate(([l,m])=>__xenProbe.bridge.patch({gridTuning:'31edo',lockCursorToGrid:l,manualGridMutedSteps:m}),[lock,MUTED]);
 await setGrid(true);await p.waitForTimeout(1200);
 const P=JSON.parse(await E('JSON.stringify(__NodalBallGrid.params())'));
 const open=JSON.parse(await E(`JSON.stringify(Fx(${P.gridBase},"31edo",${JSON.stringify(MUTED)},[]))`)),all=JSON.parse(await E(`JSON.stringify(Fx(${P.gridBase},"31edo",[],[]))`));
 const muted=all.filter(f=>near(f,open)>1);
 const snapOf=y=>E(`(P=>Qa(lZ(${y},P.gridBase,P.gridTuning,P.manualGridMutedSteps,P.manualGridStepOffsets)))(__NodalBallGrid.params())`);
 const h=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);await h.evaluate(c=>c.scrollIntoView({block:'center'}));await p.waitForTimeout(300);const bx=await h.boundingBox();
 const toClient=yGame=>bx.y+yGame*bx.height/580,x=bx.x+bx.width*.5;
 const msgs=()=>p.evaluate(()=>window.__pg.msgs.slice()),clear=()=>p.evaluate(()=>{window.__pg.msgs.length=0});
 // ---- 1. Snap on, drag up over many lines, resting on each position ----
 await clear();let y=bx.y+bx.height*.8;await p.mouse.move(x,y);await p.mouse.down();await p.waitForTimeout(300);
 const rests=[];
 for(let i=0;i<8;i++){y-=bx.height*.05;await p.mouse.move(x,y,{steps:4});await p.waitForTimeout(220);
  const m=await msgs(),last=m[m.length-1],ptr=await p.evaluate(()=>window.__pg.ptr);rests.push({sounding:last.hz,expected:await snapOf(ptr)})}
 await p.mouse.up();await p.waitForTimeout(300);
 const held=await msgs();
 const offGrid=held.filter(m=>near(m.hz,open)>1),onMuted=held.filter(m=>near(m.hz,muted)<5);
 console.log('snap on:',held.length,'pitches,',offGrid.length,'off the open lines,',onMuted.length,'near muted lines; rests',JSON.stringify(rests.map(r=>[+r.sounding.toFixed(1),+r.expected.toFixed(1)])));
 assert(held.length>=6,'the drag moves the held note over several lines ('+held.length+')');
 assert.equal(offGrid.length,0,'with Snap the held note only ever sounds on open Grid lines: '+JSON.stringify(offGrid.slice(0,5).map(m=>+m.hz.toFixed(2))));
 assert.equal(onMuted.length,0,'never on (or near) a muted step of the scale');
 for(const r of rests)assert(Math.abs(cents(r.sounding,r.expected))<1,'at rest it sounds the line the Wave Starter snap gives for the pointer (green line): '+r.sounding+' vs '+r.expected);
 // ---- 2. pointer exactly on a muted line: the note sounds the nearest open line ----
 const target=muted.find(f=>f>200&&f<400);const yGame=await E(`Zs(${target})`);
 await clear();await p.mouse.move(x,toClient(yGame+30));await p.mouse.down();await p.waitForTimeout(200);await p.mouse.move(x,toClient(yGame),{steps:3});await p.waitForTimeout(300);
 const atMuted=(await msgs()).pop();await p.mouse.up();await p.waitForTimeout(300);
 assert(near(atMuted.hz,open)<1&&near(atMuted.hz,[target])>5,'pointer on muted '+target.toFixed(1)+' Hz: the note sounds an open neighbour ('+atMuted.hz.toFixed(1)+' Hz)');
 // ---- 3. Snap off: free glissando stays ----
 await setGrid(false);await p.waitForTimeout(600);await clear();y=bx.y+bx.height*.8;await p.mouse.move(x,y);await p.mouse.down();await p.waitForTimeout(200);
 await p.mouse.move(x,y-bx.height*.3,{steps:12});await p.waitForTimeout(400);await p.mouse.up();await p.waitForTimeout(200);
 const free=await msgs(),between=free.filter(m=>near(m.hz,all)>5);
 assert(free.length>=8&&between.length>=3,'without Snap the held note glides freely between the lines ('+free.length+' pitches, '+between.length+' between lines)');
 // ---- 4. Snap off: chord on the Keyboard (same Psy Lab sound) + mouse lead: the keys stay on open lines, the mouse glides ----
 await p.evaluate(s=>__xenProbe.bridge.patch({keyboardHoldSoundPreset:s}),P.waveStarterHoldSoundPreset);await p.waitForTimeout(1200);await clear();
 const chord=['a','d','g'];for(const k of chord)await p.keyboard.down(k);await p.waitForTimeout(250);
 await p.mouse.move(x,bx.y+bx.height*.8);await p.mouse.down();await p.mouse.move(x,bx.y+bx.height*.5,{steps:10});await p.waitForTimeout(400);await p.mouse.up();
 for(const k of chord)await p.keyboard.up(k);await p.waitForTimeout(250);
 const both=await msgs(),engs=[...new Set(both.map(m=>m.eng))],per=engs.map(e=>both.filter(m=>m.eng===e));
 const keys=per.find(l=>l.every(m=>m.t==='on')&&l.length===chord.length),lead=per.find(l=>l!==keys);
 assert(keys&&lead,'Keyboard and Wave Starter each have their own Psy Lab engine ('+per.map(l=>l.length).join('/')+' messages)');
 assert(keys.every(m=>near(m.hz,open)<1),'the chord on the keys sounds only open Grid tones: '+keys.map(m=>m.hz.toFixed(1)));
 assert(lead.filter(m=>near(m.hz,all)>5).length>=3,'meanwhile the mouse lead glides between the lines');
 // ---- 6. PSY-SNAP-02: level 'Grid' (Snap on + cursorSnapAll): the mouse tone also lands on MUTED lines; keys stay open; held keys are drawn pink ----
 await p.evaluate(()=>{const S=window.__pk={pink:[]};const ac=CanvasGradient.prototype.addColorStop;CanvasGradient.prototype.addColorStop=function(o,c){if(c==='rgba(255,115,220,.9)'&&o===0)S.pink.push(1);return ac.apply(this,arguments)}});
 await p.evaluate(()=>__xenProbe.bridge.patch({lockCursorToGrid:true,cursorSnapAll:true}));await p.waitForTimeout(800);
 await clear();await p.mouse.move(x,toClient(yGame+30));await p.mouse.down();await p.waitForTimeout(200);await p.mouse.move(x,toClient(yGame),{steps:3});await p.waitForTimeout(300);
 const gridLvl=(await msgs()).pop();await p.mouse.up();await p.waitForTimeout(300);
 assert(near(gridLvl.hz,[target])<1,'Grid level: the pointer on the muted line sounds exactly that line ('+gridLvl.hz.toFixed(2)+' vs '+target.toFixed(2)+')');
 await p.evaluate(()=>{window.__pk.pink.length=0});await p.keyboard.down('a');await p.waitForTimeout(500);const pink=await p.evaluate(()=>window.__pk.pink.slice());await p.keyboard.up('a');await p.waitForTimeout(200);
 assert(pink.length>0,'a held Keyboard key is drawn as a pink line in the Live Room');
 await p.evaluate(()=>{window.__pk.pink.length=0});await p.waitForTimeout(400);assert.equal(await p.evaluate(()=>window.__pk.pink.length),0,'no pink line after the key is released');
 await p.evaluate(()=>__xenProbe.bridge.patch({lockCursorToGrid:true,cursorSnapAll:false}));await p.waitForTimeout(500);
 assert.equal(await E('__xenCursorSnapMode(__NodalBallGrid.params())'),'scale','without cursorSnapAll (old data) Snap means Scale');
 await p.getByRole('radio',{name:'Grid'}).first().click();await p.waitForTimeout(300);
 assert.equal(await E('__xenCursorSnapMode(__NodalBallGrid.params())'),'grid','the Grid button switches the level');
 await p.getByRole('radio',{name:'Free'}).first().click();await p.waitForTimeout(300);
 assert.equal(await E('__xenCursorSnapMode(__NodalBallGrid.params())'),'free','the Free button switches Snap off');
 // ---- 5. the switch says so ----
 const hint=await p.getByText('Free: the mouse glides',{exact:false}).count();
 assert(hint>=1,'the Snap switch explains the decoupling');
 assert.deepEqual(errors,[],'no page errors');
 console.log(`PASS PSY-GRID-01: Snap on ${held.length} pitches all on open lines, none on muted steps, = Wave Starter snap at rest; muted line → open neighbour; Snap off glides (${between.length} pitches between lines) while a Keyboard chord stays on open lines; the switch explains it`);
 await b.close();
})().catch(e=>{console.error(String(e.message||e).split('\n').slice(0,4).join('\n'));process.exit(1)});
