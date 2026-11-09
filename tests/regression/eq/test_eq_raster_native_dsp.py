"""Real Chrome Biquad graph must implement the raster painted center gains, not cosmetic SVG."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
core=Path(__file__).resolve().parents[3].joinpath('src/quickrack/equalizer/eq-core.js').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page()
 page.set_content('<div>EQ offline DSP test</div>')
 page.add_script_tag(content=core+'\nwindow.XenSonarEQ=__XenEQ;')
 report=page.evaluate('''()=>{
  const eq=window.XenSonarEQ, n=24,key='material:raster-native-test';
  const c=eq.neutral();c.mode='raster';c.bands=n;
  const targets=Array.from({length:n},(_,i)=>i%4<2?1:-1);
  for(let i=0;i<360;i++){const b=Math.min(n-1,Math.floor(i/359*n));c.a[i]=targets[b];c.b[i]=targets[b]}
  eq.set(key,c);const cfg=eq.get(key),plan=eq.plan(cfg,48000);
  const context=new OfflineAudioContext(1,256,48000),device=eq.create(context,key);
  const nodes=device.response(),freq=Float32Array.from(plan.filters.slice(0,n),f=>f.frequency),mag=new Float32Array(n),phase=new Float32Array(n);
  const sum=Array.from({length:n},()=>20*Math.log10(nodes.base.gain.value));
  for(const node of nodes.filters){node.getFrequencyResponse(freq,mag,phase);for(let i=0;i<n;i++)sum[i]+=20*Math.log10(mag[i])}
  const error=sum.map((actual,i)=>Math.abs(actual-eq.target(cfg,(i+.5)/n)));
  const analytic=eq.response(cfg,48000,n*40+1,plan);
  const delta=sum.map((v,i)=>Math.abs(v-analytic[(i*40)+20]));
  const out={n,centerRms:Math.sqrt(error.reduce((s,v)=>s+v*v,0)/n),maxCenterError:Math.max(...error),maxAnalyticDiff:Math.max(...delta),nativeNodes:device.filterCount};
  device.dispose();return out;
 }''')
 print('RASTER NATIVE DSP AUDIT',json.dumps(report))
 assert report['nativeNodes']==24,report
 assert report['maxAnalyticDiff']<.08,report
 assert report['maxCenterError']<1.3,report
 browser.close()
