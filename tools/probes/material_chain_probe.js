/* Probe only (not shipped): Material Track lane chain in the real layout.
 * Imports a generated test WAV via SpectralForge -> "Send raw as a loop to Material Track",
 * powers the Live Room and reports the node chain behind the material phase worklet
 * (types, order, start values) plus the RMS at the lane output.
 * Run: node tools/probes/material_chain_probe.js [path/to/index.html] */
const {chromium}=require('playwright');const path=require('path');const fs=require('fs');const os=require('os');
const target='file://'+path.resolve(process.argv[2]||path.resolve(__dirname,'../../index.html'));
function wav(file){const sr=48000,n=sr*4,buf=Buffer.alloc(44+n*4);buf.write('RIFF',0);buf.writeUInt32LE(36+n*4,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const t=i/sr,env=(i%(sr/2))<sr/8?1:.25,v=Math.round(12000*env*(Math.sin(2*Math.PI*220*t)+.5*Math.sin(2*Math.PI*330*t))/1.5);buf.writeInt16LE(v,44+i*4);buf.writeInt16LE(v,46+i*4)}fs.writeFileSync(file,buf)}
const tone=path.join(os.tmpdir(),'xen_probe_tone.wav');wav(tone);
const init=()=>{const S=window.__chain={edges:[]};const conn=AudioNode.prototype.connect;
 AudioNode.prototype.connect=function(t,...a){S.edges.push([this,t]);return conn.call(this,t,...a)};
 const AW=window.AudioWorkletNode;window.AudioWorkletNode=class extends AW{constructor(c,name,o){super(c,name,o);this.__name=name}};};
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1600,height:1000}});
const errors=[];p.on('pageerror',e=>errors.push(String(e).slice(0,200)));await p.addInitScript(init);
await p.goto(target);await p.waitForTimeout(6000);
const clkX=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&(n(b.innerText)===t||n(b.innerText).endsWith(' '+t)||n(b.getAttribute('aria-label'))===t));if(b)b.click();return !!b},t);
const clkS=t=>p.evaluate(t=>{const n=x=>(x||'').replace(/\s+/g,' ').trim();const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&n(b.innerText).startsWith(t));if(b){b.scrollIntoView();b.click()}return !!b},t);
await clkX('MATERIAL FORGE');await p.waitForTimeout(3000);await clkS('SPECTRALFORGE');await p.waitForTimeout(5000);
await p.setInputFiles('input[type=file][accept^="audio"]',tone);await p.waitForTimeout(5000);
await clkS('📀 Send raw as a loop to Material Track');await p.waitForTimeout(5000);
await clkX('LIVE ROOM');await p.waitForTimeout(3000);await clkX('Power');await p.waitForTimeout(4000);
const vis=[];for(const h of await p.$$('input[type=range]'))if(await h.isVisible())vis.push(h);
const labels=[];for(const h of vis)labels.push(await h.evaluate(x=>(x.getAttribute('aria-label')||x.title||x.closest('label,div')?.innerText||'').replace(/\s+/g,' ').slice(0,40)));
const panAt=labels.findIndex(t=>/pan/i.test(t)&&/material|tone/i.test(t));
let panMove=panAt>=0?labels[panAt]:'not found: '+JSON.stringify(labels.filter(t=>/pan/i.test(t)));
let panValues=null;if(panAt>=0){const before=await vis[panAt].evaluate(x=>x.value);await vis[panAt].focus();for(let k=0;k<10;k++)await p.keyboard.press('ArrowRight');await p.waitForTimeout(300);
 if(await vis[panAt].evaluate(x=>x.value)===before){const bb=await vis[panAt].boundingBox();await p.mouse.click(bb.x+bb.width*0.9,bb.y+bb.height/2)}
 await p.waitForTimeout(800);panValues=[before,await vis[panAt].evaluate(x=>x.value)]}
const res=await p.evaluate(async()=>{const E=window.__chain.edges;const out=new Map();for(const [a,t] of E){if(!out.has(a))out.set(a,[]);out.get(a).push(t)}
 const phase=[...out.keys()].find(n=>n.__name==='xen-material-phase-v1');if(!phase)return {error:'no material phase node'};
 const desc=n=>{if(n instanceof AudioParam)return 'AudioParam';const k=n.constructor.name+(n.__name?':'+n.__name:'');
  if(n instanceof StereoPannerNode)return k+'(pan='+n.pan.value.toFixed(3)+')';if(n instanceof GainNode)return k+'(gain@connect)';if(n instanceof BiquadFilterNode)return k+'('+n.type+')';return k};
 const chain=[];let cur=phase,seen=new Set(),lane=null;
 for(let d=0;d<12&&cur;d++){seen.add(cur);const next=(out.get(cur)||[]).filter(x=>!(x instanceof AudioParam));chain.push(desc(cur)+' -> ['+next.map(desc).join(', ')+']');
  if(cur instanceof StereoPannerNode)lane=cur;cur=next.find(x=>!seen.has(x)&&!(x instanceof AudioDestinationNode))||null}
 const ctx=phase.context;const an=ctx.createAnalyser();an.fftSize=2048;
 const gain=[...out.keys()].find(n=>n instanceof GainNode&&n.__xenEQDevice);const tap=gain.__xenEQDevice.output;tap.connect(an);
 let peak=0,sum=0,k=0;const buf=new Float32Array(2048);
 for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,100));an.getFloatTimeDomainData(buf);let s=0;for(const v of buf)s+=v*v;const r=Math.sqrt(s/buf.length);peak=Math.max(peak,r);sum+=r;k++}
 const lanePan=(out.get((out.get((out.get(phase)||[])[0])||[])[0])||[]).find(n=>n instanceof StereoPannerNode);
 return {lanePanAfterSlider:lanePan?+lanePan.pan.value.toFixed(3):null,chain,laneGainHasEQ:!!gain,eqOutputFanout:(out.get(tap)||[]).filter(x=>x!==an).map(desc),rmsPeak:+peak.toFixed(4),rmsMean:+(sum/k).toFixed(4),pitchDiag:globalThis.__XEN_LANE_PITCH_DIAGNOSTICS__?.material}});
console.log(JSON.stringify({target:path.basename(target),panSlider:panMove,panValues,...res,errors},null,1));await b.close();})();
