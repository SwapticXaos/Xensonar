'use strict';
// LIVE-GF-05 (real app): the 12 mix-bus EQ biquads are not rendered while Live Mastering is off, are
// connected the moment it is switched on (and then really move), and are parked again after switching off.
// Also: parked vs connected-at-0-dB is sample-identical to float rounding (offline render).
// Usage: node tests/e2e/live_gf05_mix_bus_eq_park.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{const S=window.__eq={bq:[],edges:new Map()};
    const cb=BaseAudioContext.prototype.createBiquadFilter;BaseAudioContext.prototype.createBiquadFilter=function(){const n=cb.call(this);if(this instanceof AudioContext)S.bq.push(n);return n};
    const oc=AudioNode.prototype.connect,od=AudioNode.prototype.disconnect;
    AudioNode.prototype.connect=function(d){if(d instanceof AudioNode){let s=S.edges.get(this);if(!s)S.edges.set(this,s=new Set());s.add(d)}return oc.apply(this,arguments)};
    AudioNode.prototype.disconnect=function(d){const s=S.edges.get(this);if(s){if(d instanceof AudioNode)s.delete(d);else if(d===undefined)s.clear()}return od.apply(this,arguments)};
    // bus EQ biquads: lowshelf/peaking/highshelf triples reaching the destination
    S.state=()=>{const ctx=S.bq[0]&&S.bq[0].context;if(!ctx)return null;const inc=new Map();for(const[n,ds]of S.edges)for(const d of ds){if(!inc.has(d))inc.set(d,[]);inc.get(d).push(n)}
      const seen=new Set([ctx.destination]),q=[ctx.destination];while(q.length){const t=q.pop();for(const x of inc.get(t)||[])if(!seen.has(x)){seen.add(x);q.push(x)}}
      const shelves=S.bq.filter(n=>n.type==='lowshelf'&&n.frequency.value>0);
      return{lowShelves:shelves.length,rendered:shelves.filter(n=>seen.has(n)).length,gains:shelves.map(n=>+n.gain.value.toFixed(3))}}});
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3500);
  const st=()=>p.evaluate(()=>__eq.state());
  let s0=await st();console.log('off',JSON.stringify(s0));
  assert(s0&&s0.lowShelves>=4,'four bus low shelves exist');assert.equal(s0.rendered,0,'Live Mastering off: bus EQ not rendered');
  // open the Effects panel, switch Live Mastering on
  await p.evaluate(()=>{const h=[...document.querySelectorAll('button')].find(e=>/Effects/.test(e.innerText)&&e.offsetParent);h&&h.click()});await p.waitForTimeout(800);
  const toggle=on=>p.evaluate(on=>{const l=[...document.querySelectorAll('label')].find(l=>/Live Mastering Enabled/.test(l.innerText));if(!l)return'no';const c=l.querySelector('input');if(c.checked!==on)c.click();return c.checked},on);
  assert.equal(await toggle(true),true,'Live Mastering checkbox found');await p.waitForTimeout(2500);
  const s1=await st();console.log('on ',JSON.stringify(s1));assert(s1.rendered>=4,'Live Mastering on: bus EQ connected');
  assert.equal(await toggle(false),false);await p.waitForTimeout(5000);
  const s2=await st();console.log('off',JSON.stringify(s2));assert.equal(s2.rendered,0,'parked again after fade-out');
  assert.equal(await toggle(true),true);await p.waitForTimeout(1500);assert((await st()).rendered>=4,'reconnected a second time');
  // identity of the parked topology (offline, same node types and settings)
  const maxDiff=await p.evaluate(async()=>{const sr=44100,n=sr*2;const make=async parked=>{const c=new OfflineAudioContext(2,n,sr);const buf=c.createBuffer(2,n,sr);let seed=7;for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<n;i++){seed=(seed*1664525+1013904223)>>>0;d[i]=(seed/4294967296-.5)*.8}}
      const src=c.createBufferSource();src.buffer=buf;const an=c.createAnalyser(),lo=c.createBiquadFilter(),mid=c.createBiquadFilter(),hi=c.createBiquadFilter(),g=c.createGain();lo.type='lowshelf';lo.frequency.value=120;mid.type='peaking';mid.frequency.value=1500;mid.Q.value=.85;hi.type='highshelf';hi.frequency.value=8000;
      src.connect(an);lo.connect(mid);mid.connect(hi);g.connect(c.destination);if(parked)an.connect(g);else{an.connect(lo);hi.connect(g)}src.start();return(await c.startRendering()).getChannelData(0)};
    const a=await make(true),b=await make(false);let m=0;for(let i=0;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m});
  console.log('max parked-vs-connected diff',maxDiff);assert(maxDiff<2e-6,'0 dB chain is identity to float rounding');
  assert.deepEqual(errors,[]);console.log('PASS LIVE-GF-05 mix-bus EQ parked while Live Mastering is off');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
