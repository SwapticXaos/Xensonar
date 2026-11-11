'use strict';
// LIVE-GF-03 (real app): with a Refucktor drone preset the legacy drone voice graph (JI oscillators etc.)
// must not be rendered; choosing a classic preset reconnects it and it sounds; going back parks it again.
// Usage: node tests/e2e/live_gf03_legacy_drone_park.cjs dist/XenSonar_PROBE.html
const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
const html=path.resolve(process.argv[2]||'dist/XenSonar_PROBE.html');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{
    const C=window.__g={nodes:[],by:new WeakMap(),owner:new WeakMap()};
    const reg=(n,kind)=>{if(!(n.context instanceof AudioContext))return n;const r={kind,n,out:new Map(),started:false,ended:false};C.nodes.push(r);C.by.set(n,r);
      for(const k in n){try{if(n[k] instanceof AudioParam)C.owner.set(n[k],n)}catch(e){}}if('onended' in n)n.addEventListener('ended',()=>{r.ended=true});return n};
    for(const k of Object.getOwnPropertyNames(BaseAudioContext.prototype)){if(!/^create/.test(k))continue;const o=BaseAudioContext.prototype[k];if(typeof o!=='function')continue;
      BaseAudioContext.prototype[k]=function(){const n=o.apply(this,arguments);return n instanceof AudioNode?reg(n,k.slice(6)):n}}
    const s=AudioScheduledSourceNode.prototype.start;AudioScheduledSourceNode.prototype.start=function(){const r=C.by.get(this);if(r)r.started=true;return s.apply(this,arguments)};
    const bs=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(){const r=C.by.get(this);if(r)r.started=true;return bs.apply(this,arguments)};
    const oc=AudioNode.prototype.connect,od=AudioNode.prototype.disconnect;
    AudioNode.prototype.connect=function(d){const r=C.by.get(this);if(r){const t=d instanceof AudioParam?C.owner.get(d):d;if(t)r.out.set(t,1)}return oc.apply(this,arguments)};
    AudioNode.prototype.disconnect=function(d){const r=C.by.get(this);if(r){if(d===undefined||typeof d==='number')r.out.clear();else r.out.delete(d instanceof AudioParam?C.owner.get(d):d)}return od.apply(this,arguments)};
    C.pulledSines=()=>{let ctx=null;for(const r of C.nodes){ctx=r.n.context;break}if(!ctx)return-1;const inc=new Map();for(const r of C.nodes)for(const t of r.out.keys()){if(!inc.has(t))inc.set(t,[]);inc.get(t).push(r.n)}
      const seen=new Set([ctx.destination]),q=[ctx.destination];while(q.length){const t=q.pop();for(const x of inc.get(t)||[])if(!seen.has(x)){seen.add(x);q.push(x)}}
      return C.nodes.filter(r=>r.kind==='Oscillator'&&r.started&&!r.ended&&seen.has(r.n)).length};
  });
  await p.goto('file://'+html);await p.waitForTimeout(3500);await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(3000);
  const choose=v=>p.evaluate(v=>{const s=[...document.querySelectorAll('select')].find(s=>s.getAttribute('aria-label')==='Drone sound');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,v);s.dispatchEvent(new Event('change',{bubbles:true}));return s.value},v);
  // drums/bass off would need UI; bass voices add a few short-lived oscillators, so compare with margins
  const sample=async()=>{let m=1e9;for(let i=0;i<6;i++){m=Math.min(m,await p.evaluate(()=>__g.pulledSines()));await p.waitForTimeout(120)}return m};
  const pilot=await sample();
  assert.equal(await choose('warm_pad'),'warm_pad');await p.waitForTimeout(1500);
  const classic=await sample();
  assert.equal(await choose('dark_sub'),'dark_sub');await p.waitForTimeout(1500);
  const back=await sample();
  assert.equal(await choose('string_swell'),'string_swell');await p.waitForTimeout(1200);
  const again=await sample();
  console.log({pilot,classic,back,again});
  assert(classic>=pilot+18,'classic preset renders the legacy voice incl. JI oscillators: '+classic+' vs '+pilot);
  assert(back<=pilot+3,'Refucktor preset parks the legacy voice again: '+back+' vs '+pilot);
  assert(again>=pilot+18,'legacy voice is reconnected a second time');
  assert(pilot<=14,'no legacy oscillators rendered behind the closed gate (got '+pilot+')');
  assert.deepEqual(errors,[]);
  console.log('PASS LIVE-GF-03 legacy drone graph parked behind the closed gate and reconnected on demand');
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
