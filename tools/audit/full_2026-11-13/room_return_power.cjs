const {chromium}=require('playwright');const path=require('path');const html=path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});const p=await b.newPage({viewport:{width:1440,height:900}});
  const perr=[];p.on('pageerror',e=>perr.push(e.message.slice(0,200)));
  await p.addInitScript(()=>{window.__n=0;window.__ctx=[];const AC=window.AudioContext;window.AudioContext=class extends AC{constructor(...a){super(...a);__ctx.push(this)}};
    for(const k of ['createGain','createBufferSource','createOscillator']){const o=BaseAudioContext.prototype[k];BaseAudioContext.prototype[k]=function(...a){if(!(this instanceof OfflineAudioContext))__n++;return o.apply(this,a)}}});
  await p.goto('file://'+html);await p.waitForTimeout(4000);
  const click=t=>p.evaluate(t=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\s+/g,' ').includes(t));if(!b)throw Error('no '+t);b.click()},t);
  const rate=async(ms)=>{const a=await p.evaluate(()=>__n);await p.waitForTimeout(ms);const z=await p.evaluate(()=>__n);return +((z-a)/(ms/1000)).toFixed(1)};
  const pw=()=>p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>/power/i.test(b.getAttribute('aria-label')||b.title||''));return b?{label:b.getAttribute('aria-label'),pressed:b.getAttribute('aria-pressed'),title:b.title,cls:String(b.className).slice(0,80)}:null});
  const st=async l=>console.log(l,JSON.stringify({power:await pw(),ctx:await p.evaluate(()=>__ctx.map(c=>c.state)),nodesPerSec:await rate(4000)}));
  await st('A idle');
  await p.getByRole('button',{name:'Power'}).click();await p.waitForTimeout(2500);await st('B power on');
  for(const r of ['MATERIAL FORGE','NODAL CENTER','MULTITRACK','PSY LAB']){
    await click(r);await p.waitForTimeout(3500);await st('  in '+r);
    await click('LIVE ROOM');await p.waitForTimeout(3500);await st('  back from '+r);
    const pwb=await pw(); if(pwb&&pwb.pressed!=='true'){ /* note only */ }
  }
  console.log('pageerrors',perr);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
