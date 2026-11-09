"""3 concurrent EQ tracks and sustained gesture churn; NOT hardware-xrun verification."""
from pathlib import Path
from playwright.sync_api import sync_playwright
core=Path(__file__).resolve().parents[3].joinpath('src/quickrack/equalizer/eq-core.js').read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<!doctype html><title>EQ P1.4 three-track load gate</title>')
    page.add_script_tag(content=core+'\nwindow.EQ=__XenEQ;')
    result=page.evaluate('''async()=>{
      const eq=window.EQ, ctx=new AudioContext({sampleRate:48000,latencyHint:'interactive'});
      await ctx.resume();
      const shape=Array.from({length:360},(_,i)=>i%80<40?.9:-.75),keys=['material:track-A','material:track-B','material:track-C'];
      const devices=[],sources=[];
      for(let i=0;i<3;i++){
       eq.set(keys[i],{mode:'adaptive',bands:12,a:shape,b:shape,morph:0});
       const device=eq.create(ctx,keys[i]),src=ctx.createOscillator();src.frequency.value=145*(i+1);
       const gain=ctx.createGain();gain.gain.value=.015;
       src.connect(gain);gain.connect(device.input);device.output.connect(ctx.destination);src.start();
       sources.push(src);devices.push(device);
      }
      const start=eq.diagnostics(),wait=ms=>new Promise(r=>setTimeout(r,ms));
      await wait(800);
      const settled=eq.diagnostics();let maxGesture=0;
      eq.startGesture(keys[0]);
      for(let i=0;i<80;i++){
       const t=performance.now();eq.set(keys[0],{morph:i/79});eq.refresh();
       maxGesture=Math.max(maxGesture,performance.now()-t);
       await new Promise(r=>requestAnimationFrame(r));
      }
      eq.endGesture(keys[0]);await wait(800);
      const after=eq.diagnostics();
      for(const src of sources)src.stop();for(const device of devices)device.dispose();await ctx.close();
      return{start,settled,after,maxGesture,ctxState:'running'};
    }''')
    assert not errors,errors
    assert result['start']['filters']==36,result
    assert result['settled']['filters']==36,result
    assert result['after']['filters']==36,result
    assert not result['after']['workerFailed'],result
    assert not result['after']['fitRunning'] and result['after']['fitQueued']==0,result
    print('PASS P1.4 3 live WebAudio signal paths; stable 36 biquads, 80 gesture frames, no pending fit;',result)
    browser.close()
