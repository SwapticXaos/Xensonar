'use strict';
// PSY-X (real app): the Live Room's X gradients shape Psy Lab notes. Timbre gradient ON ("psy_rise"): a note at the left edge pushes the pad regulator (param 37) ~0, at the right edge ~1; a held
// left-mouse note follows the cursor's X; gradient OFF: 0. Volume gradient scales the velocity. Usage: node tests/e2e/room5_live_psylab_xgradient.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await(await b.newContext({viewport:{width:1440,height:1000}})).newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const S=window.__ps={msgs:[]};const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(n==='xen-psylab-v1'){const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{try{S.msgs.push(JSON.parse(JSON.stringify(m)))}catch{}return pm(m,t)}}}}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
  const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
  const pick=async(lane,query,label)=>{await p.getByRole('button',{name:lane+' sound'}).first().click();await p.waitForTimeout(300);await p.getByLabel(lane+' sound search').fill(query);await p.waitForTimeout(250);await p.getByRole('option',{name:label}).first().click();await p.waitForTimeout(500)};
  await pick('Wave Starter','Liquid','Liquid Bell');await pick('Keyboard','Liquid','Liquid Bell');await p.waitForTimeout(800);
  await E("__NodalBallGrid.update({waveTimbreGradientEnabled:true,waveTimbreGradientX:'psy_rise',waveVolumeGradientEnabled:false})");await p.waitForTimeout(800);
  const h=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);await h.evaluate(c=>c.scrollIntoView({block:'center'}));await p.waitForTimeout(300);const bx=await h.boundingBox();
  const at=u=>({x:bx.x+bx.width*u,y:bx.y+bx.height*.5});
  const clear=()=>p.evaluate(()=>{window.__ps.msgs.length=0}),msgs=()=>p.evaluate(()=>window.__ps.msgs.slice());
  const macroOf=m=>{const v=m.filter(x=>x.t==='p'&&x.i===37).map(x=>x.v);return v.length?v[v.length-1]:null};
  const vel=m=>m.find(x=>x.t==='on')?.vel;
  const click=async u=>{await clear();const q=at(u);await p.mouse.move(q.x,q.y);await p.waitForTimeout(80);await p.mouse.down();await p.waitForTimeout(200);await p.mouse.up();await p.waitForTimeout(900);return msgs()};
  // the engine exists after the first note: play one so that the first measured note is a normal one
  await click(.5);
  let m=await click(.08);const left=macroOf(m);assert(left!==null&&left<.15,'psy_rise: a note at the left edge pushes the pad regulator ~0: '+left+' '+JSON.stringify(m.slice(0,4)));
  m=await click(.92);const right=macroOf(m);assert(right!==null&&right>.85,'psy_rise: a note at the right edge pushes it ~1: '+right);
  // a held note follows the cursor's X
  await clear();let q=at(.1);await p.mouse.move(q.x,q.y);await p.waitForTimeout(80);await p.mouse.down();await p.waitForTimeout(200);
  for(let k=1;k<=8;k++){const r=at(.1+k*.1);await p.mouse.move(r.x,r.y);await p.waitForTimeout(80)}await p.waitForTimeout(200);const held=macroOf(await msgs());await p.mouse.up();await p.waitForTimeout(500);
  assert(held!==null&&held>.8,'a held note follows the cursor to the right: '+held);
  // resolution: a slow sweep over the field produces a fine, unquantised sequence of regulator values (no coarse steps); a held KEYBOARD note follows the cursor too
  await clear();q=at(.05);await p.mouse.move(q.x,q.y);await p.keyboard.down('KeyQ');await p.waitForTimeout(300);await clear();
  for(let k=0;k<=60;k++){const r=at(.05+k*.015);await p.mouse.move(r.x,r.y);await p.waitForTimeout(30)}await p.waitForTimeout(300);
  const seq=(await msgs()).filter(x=>x.t==='p'&&x.i===37).map(x=>x.v);await p.keyboard.up('KeyQ');await p.waitForTimeout(500);
  const distinct=new Set(seq.map(v=>v.toFixed(4))).size,maxStep=Math.max(...seq.slice(1).map((v,i)=>Math.abs(v-seq[i])));
  assert(distinct>=35&&maxStep<.04,'fine resolution: '+distinct+' distinct values, largest step '+maxStep.toFixed(4));
  assert(seq.length>0&&seq[seq.length-1]>.85,'a held keyboard note follows the cursor X: '+seq[seq.length-1]);
  // the shape follows the gradient setting: falls to the right with "psy_to_wire"
  await E("__NodalBallGrid.update({waveTimbreGradientX:'psy_to_wire'})");await p.waitForTimeout(300);m=await click(.92);assert(macroOf(m)<.15,'psy_to_wire: right edge ~0: '+macroOf(m));
  // gradient off: no push
  await E("__NodalBallGrid.update({waveTimbreGradientEnabled:false})");await p.waitForTimeout(300);m=await click(.92);assert(macroOf(m)===0||macroOf(m)===null,'gradient off: no push: '+macroOf(m));
  // keyboard note: the same law at the cursor's X (the cursor rests at the right edge of the last click)
  await E("__NodalBallGrid.update({waveTimbreGradientEnabled:true,waveTimbreGradientX:'psy_rise'})");await p.waitForTimeout(300);
  let q2=at(.9);await p.mouse.move(q2.x,q2.y);await p.waitForTimeout(150);await clear();await p.keyboard.down('KeyQ');await p.waitForTimeout(300);await p.keyboard.up('KeyQ');await p.waitForTimeout(600);m=await msgs();assert(macroOf(m)>.8,'keyboard note uses the cursor X (right): '+macroOf(m)+' '+JSON.stringify(m.slice(0,3)));
  // volume gradient: left quiet / right loud scales the velocity
  await E("__NodalBallGrid.update({waveVolumeGradientEnabled:true,waveVolumeGradientX:'left_quiet_right_loud'})");await p.waitForTimeout(300);
  const vl=vel(await click(.05)),vr=vel(await click(.95));assert(vl>0&&vr>vl*1.8,'volume gradient: right is louder than left: '+vl+' vs '+vr);
  assert.deepEqual(errors,[]);console.log('PASS PSY-X Psy Lab follows the X gradients (macro left '+left+', right '+right+', held '+held+', sweep '+distinct+' distinct values, max step '+maxStep.toFixed(4)+'; velocity '+vl.toFixed(2)+' → '+vr.toFixed(2)+')');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
