'use strict';
// ROOM5-10 (real app): Psy Lab sounds in the Live Room. Rubric between Entrophon and Samples, found by the preset search, plays on the Wave Starter
// (left click / Enter: one note with a short gate) and on the Keyboard (held until the key is released), Hold is off for that lane with a hint,
// nothing is loaded before a Psy Lab sound is chosen. Usage: node tests/e2e/room5_live_psylab.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const ctx=await b.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const S=window.__ps={msgs:[],nodes:0,meter:null};
    const oc=AudioNode.prototype.connect;AudioNode.prototype.connect=function(d){const r=oc.apply(this,arguments);try{if(d instanceof AudioDestinationNode&&d.context instanceof AudioContext){if(!S.meter||S.meter.context!==d.context){S.meter=d.context.createAnalyser();S.meter.fftSize=2048}oc.call(this,S.meter)}}catch(e){}return r};
    const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(n==='xen-psylab-v1'){S.nodes++;try{const an=c.createAnalyser();an.fftSize=2048;super.connect(an);(S.psy=S.psy||[]).push(an)}catch(e){}const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{if(m&&(m.t==='on'||m.t==='off'||m.t==='alloff'||m.t==='dispose'))S.msgs.push({t:m.t,id:m.id,hz:m.hz,at:performance.now()});return pm(m,t)}}}};
    S.psyLevel=()=>{let m=0;for(const an of S.psy||[]){const a=new Float32Array(an.fftSize);an.getFloatTimeDomainData(a);for(const v of a)m=Math.max(m,Math.abs(v))}return m};
    S.level=()=>{if(!S.meter)return 0;const a=new Float32Array(S.meter.fftSize);S.meter.getFloatTimeDomainData(a);let m=0;for(const v of a)m=Math.max(m,Math.abs(v));return m}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const prm=async()=>JSON.parse(await E('JSON.stringify((q=>({w:q.waveStarterHoldSoundPreset,k:q.keyboardHoldSoundPreset,e:q.thunderModeEnabled,ke:q.thunderKeyboardEnabled}))(__NodalBallGrid.params()))'));
  const msgs=()=>p.evaluate(()=>window.__ps.msgs.slice());const clear=()=>p.evaluate(()=>{window.__ps.msgs.length=0});
  assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().psylab),false,'chunk not loaded at boot');
  // ---- rubric order and search ----
  const pick=async(lane,query,label)=>{await p.getByRole('button',{name:lane+' sound'}).first().click();await p.waitForTimeout(300);
   const groups=await p.evaluate(()=>[...document.querySelectorAll('[role=listbox] [role=group] > :first-child,[role=listbox] [role=presentation]')].map(e=>e.textContent.trim()));
   await p.getByLabel(lane+' sound search').fill(query);await p.waitForTimeout(250);const box=await p.evaluate(()=>document.querySelector('[role=listbox]').innerText);assert(/Psy Lab/.test(box),'the search result is listed under the Psy Lab rubric: '+box);await p.getByRole('option',{name:label}).first().click();await p.waitForTimeout(500);return groups};
  assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().psylab),false,'opening menus does not load the chunk');
  await p.getByRole('button',{name:'Wave Starter sound'}).first().click();await p.waitForTimeout(300);
  const order=await p.evaluate(()=>{const t=document.body.innerText;const i=t.indexOf('Entrophon'),j=t.indexOf('Psy Lab',i),k=t.indexOf('Samples',j);return[i,j,k]});assert(order[0]>=0&&order[1]>order[0]&&(order[2]<0||order[2]>order[1]),'Psy Lab rubric sits below Entrophon and above Samples: '+order);
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  await pick('Wave Starter','Liquid','Liquid Bell');
  let s=await prm();assert.equal(s.w,'psylab:factory:Liquid Bell','Wave Starter sound is a Psy Lab patch');
  await p.waitForTimeout(800);assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().psylab),true,'chunk loaded when the sound is chosen');
  // ---- Thunder (E): off + hint ----
  const tabE=p.getByRole('tab',{name:/Enter-Hold Pattern/}),tabK=p.getByRole('tab',{name:/Keyboard-Hold Pattern/});const sw=p.locator('button.xen-thunder-lane-switch');
  await tabE.click();await p.waitForTimeout(200);assert.equal((await sw.innerText()).trim(),'OFF (E)');assert.equal(await sw.getAttribute('aria-disabled'),'true');
  await sw.click({force:true});await p.waitForTimeout(250);assert.match(await p.locator('.xen-thunder-note').innerText(),/Psy Lab sounds: Hold not supported yet/);s=await prm();assert.equal(s.e,true,'the stored Thunder value is untouched');
  // ---- left click = Wave Starter note with a short gate ----
  const h=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);await h.evaluate(c=>c.scrollIntoView({block:'center'}));await p.waitForTimeout(300);const bx=await h.boundingBox();
  await clear();await p.mouse.click(bx.x+bx.width*.5,bx.y+bx.height*.5);await p.waitForTimeout(250);
  let m=await msgs();const wOn=m.find(x=>x.t==='on'&&x.hz>20);assert(wOn&&typeof wOn.id==='number','left click plays a Psy Lab note (numeric voice id): '+JSON.stringify(m));
  assert(await p.evaluate(()=>window.__ps.level())>.003,'audible at the master');
  await p.waitForTimeout(900);m=await msgs();assert(m.some(x=>x.t==='off'&&x.id===wOn.id),'the gate closes after the click (same voice id)');
  // ---- Enter: one note (no Hold pulses even when held) ----
  await clear();await p.keyboard.down('Enter');await p.waitForTimeout(1500);await p.keyboard.up('Enter');await p.waitForTimeout(300);
  m=await msgs();assert.equal(m.filter(x=>x.t==='on').length,1,'Enter-Hold off: one note per press, no repeating pulses: '+JSON.stringify(m.filter(x=>x.t==='on').length));
  // ---- Keyboard lane: held until keyup ----
  await pick('Keyboard','Escher','Escher Staircase');s=await prm();assert.equal(s.k,'psylab:factory:Escher Staircase');await p.waitForTimeout(600);
  await tabK.click();await p.waitForTimeout(200);assert.equal((await sw.innerText()).trim(),'OFF (K)');
  await clear();await p.keyboard.down('KeyA');await p.waitForTimeout(900);
  m=await msgs();const on=m.filter(x=>x.t==='on');assert.equal(on.length,1,'one keyboard note for the held key');assert(!m.some(x=>x.t==='off'&&x.id===on[0].id),'no release while the key is held');
  await p.keyboard.down('KeyS');await p.waitForTimeout(300);const sOn=(await msgs()).filter(x=>x.t==='on')[1];assert(sOn&&sOn.id!==on[0].id);await p.keyboard.up('KeyA');await p.waitForTimeout(250);m=await msgs();assert(m.some(x=>x.t==='off'&&x.id===on[0].id),'keyup releases that key');assert(!m.some(x=>x.t==='off'&&x.id===sOn.id),'the other key keeps sounding');
  await p.keyboard.up('KeyS');await p.waitForTimeout(250);m=await msgs();assert(m.some(x=>x.t==='off'&&x.id===sOn.id));
  assert.notEqual(on[0].hz,sOn.hz,'different keys, different pitches');
  // ---- ROOM5-11: the note really ENDS (PCM at the engine output), and Power off silences at once ----
  const lvl=()=>p.evaluate(()=>window.__ps.psyLevel());
  await pick('Keyboard','Crystal','Crystal Cave');await p.waitForTimeout(800);
  await p.keyboard.down('KeyD');await p.waitForTimeout(700);const held=await lvl();assert(held>.01,'held keyboard note audible at the engine output: '+held);
  await p.keyboard.up('KeyD');await p.waitForTimeout(4000);const after=await lvl();assert(after<held*.08,'released note fades out (release + delay tail): held '+held+' → '+after);
  await p.keyboard.down('KeyF');await p.keyboard.down('KeyG');await p.waitForTimeout(700);const two=await lvl();assert(two>.01,'two held notes audible: '+two);
  await clear();await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(150);
  assert(await p.evaluate(()=>window.__ps.msgs.some(x=>x.t==='alloff')),'Power off sends all-off at once (the output gain fades in ~40 ms)');assert.equal(await E('JSON.stringify(__XenPsyLab.host(false).status().lanes)'),'[]','Power off disposes the Psy Lab engines');
  await p.waitForTimeout(600);const off=await lvl();assert(off<.002,'Power off: no Psy Lab sound or tail (keys still held): '+off);/* the Psy Lab engine output is checked above at 0.75 s; the whole master (other Live Room voices fade on their own Power-off ramps, slower under CPU load) must reach silence too */
  let offMaster=1;for(let k=0;k<25&&offMaster>=.002;k++){offMaster=await p.evaluate(()=>window.__ps.level());if(offMaster>=.002)await p.waitForTimeout(100)}assert(offMaster<.002,'Power off: the master output becomes silent: '+offMaster);
  await p.keyboard.up('KeyF');await p.keyboard.up('KeyG');await p.waitForTimeout(300);
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
  await p.keyboard.down('KeyA');await p.waitForTimeout(700);assert(await lvl()>.01,'after Power on the keyboard plays Psy Lab again');await p.keyboard.up('KeyA');await p.waitForTimeout(300);
  // ---- leaving Psy Lab gives the engine back and Thunder works again ----
  await p.getByRole('button',{name:'Keyboard sound'}).first().click();await p.waitForTimeout(300);await p.getByLabel('Keyboard sound search').fill('Pure');await p.waitForTimeout(250);await p.getByRole('option',{name:/Pure Sine/}).first().click();await p.waitForTimeout(500);
  s=await prm();assert(!String(s.k).startsWith('psylab:'));assert.notEqual((await sw.getAttribute('aria-disabled')),'true','Keyboard Hold switch is usable again');
  assert(await p.evaluate(()=>window.__ps.msgs.some(x=>x.t==='dispose')),'the keyboard engine was disposed when the lane left Psy Lab');
  // ---- reload: the choice is kept, nothing is loaded before Power, the first click after Power plays ----
  await p.waitForTimeout(1500);await p.reload();await p.waitForTimeout(3500);
  assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().psylab),false,'after a reload the chunk stays cold until audio runs');
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);
  s=await prm();assert.equal(s.w,'psylab:factory:Liquid Bell','Wave Starter keeps its Psy Lab sound over a reload');
  assert.equal(await p.evaluate(()=>window.__XenRoomChunks.status().psylab),true,'restored sound: engine prepared once audio runs');
  const h2=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);await h2.evaluate(c=>c.scrollIntoView({block:'center'}));await p.waitForTimeout(300);const b2=await h2.boundingBox();
  await clear();await p.mouse.click(b2.x+b2.width*.5,b2.y+b2.height*.5);await p.waitForTimeout(300);m=await msgs();assert(m.some(x=>x.t==='on'&&x.hz>20),'plays after the reload');
  // a note-on never reads storage (HOT path)
  await p.evaluate(()=>{window.__ls=0;const g=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(k==='xensonar.psylab.instruments.v1')window.__ls++;return g.apply(this,arguments)}});
  await p.waitForTimeout(1200);await p.evaluate(()=>{window.__ls=0});for(let i=0;i<4;i++){await p.mouse.click(b2.x+b2.width*(.3+.1*i),b2.y+b2.height*.5);await p.waitForTimeout(120)}
  assert.equal(await p.evaluate(()=>window.__ls),0,'no storage read per note');
  assert.deepEqual(errors,[]);console.log('PASS ROOM5-10 Psy Lab in the Live Room (rubric, search, Wave Starter, Keyboard, Hold off + hint)');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
