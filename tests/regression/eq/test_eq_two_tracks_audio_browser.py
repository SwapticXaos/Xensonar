"""Two simultaneously rendered material sources exercise the real native EQ graph."""
from pathlib import Path
from playwright.sync_api import sync_playwright
core=Path(__file__).resolve().parents[3].joinpath('src/quickrack/equalizer/eq-core.js').read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page()
 page.set_content('<div>Two simultaneous native audio EQ chains</div>')
 page.add_script_tag(content=core+'\nwindow.XenSonarEQ=__XenEQ;')
 result=page.evaluate('''async()=>{
   const eq=window.XenSonarEQ;
   async function take(enabled){
    const rate=48000,ctx=new OfflineAudioContext(1,rate,rate),devices=[];
    for(let source=0;source<2;source++){
     const key='material:parallel-'+source,c=eq.neutral();c.mode='raster';c.bands=12;c.enabled=enabled;
     c.a.fill(-.25);c.b.fill(-.25);eq.set(key,c);
     const d=eq.create(ctx,key);devices.push(d);d.output.connect(ctx.destination);
     const osc=ctx.createOscillator(),gain=ctx.createGain();gain.gain.value=.08;osc.frequency.value=source?330:220;
     osc.connect(gain);gain.connect(d.input);osc.start(0);osc.stop(.9);
    }
    const budget=devices.reduce((s,d)=>s+d.filterCount,0);
    const data=(await ctx.startRendering()).getChannelData(0);
    let power=0,peak=0,nonfinite=0;
    for(let i=0;i<data.length;i++){power+=data[i]*data[i];peak=Math.max(peak,Math.abs(data[i]));if(!Number.isFinite(data[i]))nonfinite++}
    for(const d of devices)d.dispose();return {budget,peak,rms:Math.sqrt(power/data.length),nonfinite};
   }
   return {twoEnabled:await take(true),bypass:await take(false)};
 }''')
 assert result['twoEnabled']['budget']==24,result
 assert result['bypass']['budget']==0,result
 assert result['twoEnabled']['nonfinite']==0 and result['bypass']['nonfinite']==0,result
 assert .01<result['twoEnabled']['rms']<result['bypass']['rms'],result
 assert result['twoEnabled']['peak']<.5,result
 print('PASS two simultaneous WebAudio tracks, native filters and neutral bypass:',result)
 browser.close()
