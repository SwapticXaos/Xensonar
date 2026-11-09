"""Real AudioContext smoke test with two EQ'd live voices and repeated morph gestures.
This asserts control-path and graph stability, NOT hardware xrun/burst freedom.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
core=Path(__file__).resolve().parents[3].joinpath('src/quickrack/equalizer/eq-core.js').read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<!DOCTYPE html><html><body>XenSonar EQ P1.3 live control churn</body></html>')
    page.add_script_tag(content=core+'\nwindow.XenSonarEQ=__XenEQ;')
    result=page.evaluate('''async()=>{
       const eq=window.XenSonarEQ;
       const audio=new AudioContext({sampleRate:48000,latencyHint:'interactive'});
       await audio.resume();
       const curves=Array.from({length:360},(_,i)=>i<90?.8:i<170?-.8:i<275?.7:-.5);
       const devices=[],oscillators=[],keys=['material:live-a','material:live-b'];
       for(let i=0;i<2;i++){
        const key=keys[i];eq.set(key,{mode:'adaptive',bands:12,a:curves,b:curves,morph:0});
        const d=eq.create(audio,key);devices.push(d);d.output.connect(audio.destination);
        const oscillator=audio.createOscillator(),gain=audio.createGain();gain.gain.value=.035;
        oscillator.frequency.value=i===0?196:293.66;
        oscillator.connect(gain);gain.connect(d.input);oscillator.start();oscillators.push(oscillator);
       }
       const wait=ms=>new Promise(done=>setTimeout(done,ms));
       await wait(550);
       const before=eq.diagnostics();
       const samples=[];
       eq.startGesture(keys[0]);
       for(let frame=0;frame<35;frame++){
        const now=performance.now();
        for(let j=0;j<4;j++)eq.set(keys[0],{morph:((frame*4+j)%64)/64});
        eq.refresh();
        samples.push(performance.now()-now);
        await new Promise(done=>requestAnimationFrame(done));
       }
       eq.endGesture(keys[0]);
       await wait(500);
       const after=eq.diagnostics();
       const report={audioState:audio.state,starts:before,ends:after,
        gestureMeanMs:samples.reduce((a,b)=>a+b,0)/samples.length,
        maxGestureMs:Math.max(...samples),sampleCount:samples.length};
       oscillators.forEach(o=>o.stop());devices.forEach(d=>d.dispose());await audio.close();
       return report;
    }''')
    assert not errors,errors
    assert result['audioState']=='running',result
    assert result['ends']['devices']==2,result
    assert result['ends']['filters']==24,result
    assert result['ends']['fitQueued']<=1,result
    assert result['sampleCount']==35,result
    print('PASS native AudioContext two live EQ sources, gesture churn, stable 24-filter graph:',result)
    browser.close()
