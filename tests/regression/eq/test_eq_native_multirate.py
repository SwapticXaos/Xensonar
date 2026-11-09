"""Compare browser-native Biquads against the modeled EQ at multiple sample rates."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
core=Path(__file__).resolve().parents[3].joinpath('src/quickrack/equalizer/eq-core.js').read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page()
    page.set_content('<div>EQ multirate native test</div>')
    page.add_script_tag(content=core+'\nwindow.XenSonarEQ=__XenEQ;')
    data=page.evaluate('''()=>{
      const eq=window.XenSonarEQ,output=[];
      for(const rate of [22050,44100,48000,96000])for(const bands of [4,12,24]){
       const key='material:rate-'+rate+'-'+bands,c=eq.neutral();c.mode='raster';c.bands=bands;
       for(let i=0;i<360;i++){const b=Math.min(bands-1,Math.floor(i/359*bands));c.a[i]=b%4<2?1:-1}
       eq.set(key,c);const cfg=eq.get(key),ctx=new OfflineAudioContext(1,256,rate),d=eq.create(ctx,key),p=eq.plan(cfg,rate);
       const frequencies=Float32Array.from({length:160},(_,i)=>20*Math.pow(Math.min(20000,rate*.45)/20,i/159)),mag=new Float32Array(frequencies.length),phase=new Float32Array(frequencies.length),r=Array.from(frequencies,()=>20*Math.log10(d.response().base.gain.value));
       for(const f of d.response().filters){f.getFrequencyResponse(frequencies,mag,phase);for(let i=0;i<r.length;i++)r[i]+=20*Math.log10(mag[i])}
       const target=eq.response(cfg,rate,160,p),err=Math.max(...r.map((v,i)=>Math.abs(v-target[i])));
       output.push({rate,bands,maxPreviewDiff:err,bandError:p.bandError});d.dispose();
      }return output;
    }''')
    for entry in data:
        assert entry['maxPreviewDiff']<.005,entry
        assert entry['bandError']<.1,entry
    print('PASS native DSP across sample rates:',json.dumps(data))
    browser.close()
