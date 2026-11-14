'use strict';
/* PSY-GLIDE probe (analysis only): Wave Starter with a Psy Lab sound, Snap on, some Grid steps muted, left mouse held and dragged.
 * Records every pitch the Psy Lab engine is told to play (on/bend) per frame, the grid (unmuted and muted lines) and the pitch the
 * screen shows, and reports how much of the held note sounds off the allowed grid lines and how often it passes muted ones.
 *   node tools/probes/psylab_wave_glide_probe.cjs dist/XenSonar_PROBE.html [patch] [tuning]
 */
const {chromium}=require('playwright');const path=require('path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html'),PATCH=process.argv[3]||'Barber Spiral',TUNING=process.argv[4]||'31edo';
(async()=>{
 const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{const S=window.__pg={msgs:[]};const O=window.AudioWorkletNode;window.AudioWorkletNode=class extends O{constructor(c,n,o){super(c,n,o);if(n==='xen-psylab-v1'){const pm=this.port.postMessage.bind(this.port);this.port.postMessage=(m,t)=>{if(m&&(m.t==='on'||m.t==='bend'||m.t==='off'))S.msgs.push({t:m.t,hz:m.hz,id:m.id,at:performance.now()});return pm(m,t)}}}}});
 await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2000);
 const E=code=>p.evaluate(c=>window.__xenProbe.draw.evalInBundle(c),code);
 const muted=[2,5,9,12,16,20,23,27];
 // choose the sound like a user does (this also loads the Psy Lab chunk), then set the grid
 await p.getByRole('button',{name:'Wave Starter sound'}).first().click();await p.waitForTimeout(300);
 await p.getByLabel('Wave Starter sound search').fill(PATCH.split(' ')[0]);await p.waitForTimeout(250);await p.getByRole('option',{name:PATCH}).first().click();await p.waitForTimeout(800);
 await p.evaluate(([t,m])=>__xenProbe.bridge.patch({gridTuning:t,lockCursorToGrid:true,manualGridMutedSteps:m}),[TUNING,muted]);
 await p.waitForTimeout(1500);
 const prm=JSON.parse(await E('JSON.stringify((q=>({w:q.waveStarterHoldSoundPreset,t:q.gridTuning,l:q.lockCursorToGrid,m:q.manualGridMutedSteps,b:q.gridBase}))(__NodalBallGrid.params()))'));
 const grid=JSON.parse(await E(`JSON.stringify({open:Fx(${prm.b},${JSON.stringify(prm.t)},${JSON.stringify(prm.m||[])},[]),all:Fx(${prm.b},${JSON.stringify(prm.t)},[],[])})`));
 const mutedLines=grid.all.filter(f=>!grid.open.some(g=>Math.abs(1200*Math.log2(f/g))<1));
 const h=await p.evaluateHandle(()=>[...document.querySelectorAll('canvas')].filter(c=>c.offsetParent).sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0]);await h.evaluate(c=>c.scrollIntoView({block:'center'}));await p.waitForTimeout(300);const bx=await h.boundingBox();
 // screen readout: every element whose own text is a frequency
 const hud=()=>p.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&/\d+(\.\d+)?\s*Hz\b/.test(e.textContent)&&e.offsetParent).map(e=>e.textContent.trim()).filter(t=>t.length<60));
 await p.evaluate(()=>{window.__pg.msgs.length=0});
 // what the Wave Starter's own snap gives for the pointer right now (same mapping as the canvas handlers: j4 on the event target)
 await p.evaluate(()=>{window.__pg.ptr=null;window.addEventListener('mousemove',e=>{const c=e.target;if(!(c instanceof HTMLCanvasElement))return;const r=c.getBoundingClientRect();window.__pg.ptr={y:(e.clientY-r.top)*580/r.height,tag:c.className||c.id||'canvas',w:r.width,h:r.height}},true)});
 const x=bx.x+bx.width*.5;let y=bx.y+bx.height*.8;await p.mouse.move(x,y);await p.mouse.down();await p.waitForTimeout(400);
 const hudSamples=[];
 // drag upwards in jumps of several grid lines, rest a little on each target (a musician's gesture)
 for(let i=0;i<10;i++){y-=bx.height*.06;await p.mouse.move(x,y,{steps:3});for(let k=0;k<4;k++){await p.waitForTimeout(40);hudSamples.push({at:await p.evaluate(()=>performance.now()),texts:await hud(),expected:await p.evaluate(()=>{const q=window.__pg.ptr;if(!q)return null;return +window.__xenProbe.draw.evalInBundle('(P=>Qa(lZ('+q.y+',P.gridBase,P.gridTuning,P.manualGridMutedSteps,P.manualGridStepOffsets)))(__NodalBallGrid.params())').toFixed(1)}),ptr:await p.evaluate(()=>window.__pg.ptr)})}}
 await p.mouse.up();await p.waitForTimeout(400);
 const msgs=await p.evaluate(()=>window.__pg.msgs.slice());
 await b.close();
 const cents=(a,b)=>1200*Math.log2(a/b);
 const near=(f,list)=>{let best=Infinity;for(const g of list){const d=Math.abs(cents(f,g));if(d<best)best=d}return best};
 const played=msgs.filter(m=>m.t==='on'||m.t==='bend');
 if(!played.length){console.log('no Psy Lab pitch messages',JSON.stringify(prm),errors);process.exit(1)}
 let off=0,maxOff=0,passMuted=0,dwell=0;const t0=played[0].at,tEnd=played[played.length-1].at;
 for(let i=0;i<played.length;i++){const m=played[i],d=near(m.hz,grid.open),dur=((played[i+1]?.at??tEnd+16)-m.at);dwell+=dur;if(d>5)off+=dur;maxOff=Math.max(maxOff,d);if(near(m.hz,mutedLines)<10)passMuted++}
 // steps between snapped targets, as the screen would name them
 // timeline: what the screen names vs what sounds at the same moment
 const shown=s=>{const m=(s.texts[0]||'').match(/([\d.]+)\s*Hz/);return m?+m[1]:null};
 const timeline=hudSamples.map(s=>{const last=[...played].reverse().find(m=>m.at<=s.at);const sh=shown(s);return {ms:Math.round(s.at-t0),expectedHz:s.expected,ptr:s.ptr&&{y:+s.ptr.y.toFixed(1),h:+s.ptr.h.toFixed(0),tag:String(s.ptr.tag).slice(0,30)},shownHz:sh,soundingHz:last?+last.hz.toFixed(1):null,centsApart:last&&sh?+cents(last.hz,sh).toFixed(0):null,shownIsOpenLine:sh?near(sh,grid.open)<2:null}});
 const apart=timeline.filter(x=>x.centsApart!==null).map(x=>Math.abs(x.centsApart));
 console.log('screen vs sound (every ~40 ms):');for(const r of timeline)console.log('  ',JSON.stringify(r));
 console.log('screen and sound more than 10 cents apart in',apart.filter(c=>c>10).length,'of',apart.length,'samples; median',apart.sort((a,b)=>a-b)[apart.length>>1],'cents');
 console.log(JSON.stringify({patch:PATCH,tuning:prm.t,snap:prm.l,mutedSteps:prm.m,openLines:grid.open.length,mutedLines:mutedLines.length,
  pitchMessages:played.length,glideMs:Math.round(tEnd-t0),shareOffGridOver5Cents:+(off/dwell).toFixed(2),maxCentsOffGrid:+maxOff.toFixed(1),messagesNearMutedLines:passMuted,
  firstPitches:played.slice(0,14).map(m=>+m.hz.toFixed(1)),hudSample:hudSamples.slice(0,6).map(s=>s.texts.join(' | ')),errors}));
})().catch(e=>{console.error(e);process.exit(1)});
