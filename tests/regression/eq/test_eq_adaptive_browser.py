"""One source, real browser AudioNodes: native WebAudio frequency response vs white plot."""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
core=Path(__file__).resolve().parents[3].joinpath("src/quickrack/equalizer/eq-core.js").read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1280,'height':800})
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.set_content('<!DOCTYPE html><html><body>EQ isolated</body></html>',wait_until='domcontentloaded')
    page.add_script_tag(content=core+'\nwindow.XenSonarEQ=__XenEQ;')
    result=page.evaluate('''()=>{
     const eq=XenSonarEQ,key='material:adaptive-browser-fixture',cfg=eq.neutral();
     cfg.bands=24;
     for(let j=0;j<360;j++){
       const x=j/359;
       cfg.a[j]=x>.45&&x<.55?-1:x>.62&&x<.73?1:x>.75&&x<.82?-1:0;
       cfg.b[j]=cfg.a[j];
     }
     eq.set(key,cfg);
     const audio=new OfflineAudioContext(1,128,48000),d=eq.create(audio,key);window.__eqNativeFixture={eq,key,cfg,d};
     return {started: eq.livePlan(eq.get(key),48000,key).provisional,worker: eq.diagnostics()};
    }''')
    page.wait_for_function('''()=>{const x=window.__eqNativeFixture;return x&&!x.eq.livePlan(x.eq.get(x.key),48000,x.key).provisional}''',timeout=15000)
    result=page.evaluate('''()=>{
     const {eq,key,d}=window.__eqNativeFixture,cfg=eq.get(key);
     d.apply(cfg,true);
     const native=d.response(),frequencies=new Float32Array(48);
     const mags=new Float32Array(48),phases=new Float32Array(48);
     for(let j=0;j<48;j++)frequencies[j]=20*Math.pow(1000,j/47);
     const combined=Array.from({length:48},()=>20*Math.log10(native.base.gain.value));
     const nodeTypes=[];
     for(const node of native.filters){
       nodeTypes.push(node.type);
       node.getFrequencyResponse(frequencies,mags,phases);
       for(let j=0;j<48;j++)combined[j]+=20*Math.log10(Math.max(1e-15,mags[j]));
     }
     const analytic=eq.response(cfg,48000,48,eq.livePlan(cfg,48000,key));
     const errors=analytic.map((v,i)=>Math.abs(v-combined[i]));
     const answer={filterCount:d.filterCount,types:[...new Set(nodeTypes)],maxDiffDb:Math.max(...errors),fitRms:eq.plan(cfg,48000).fitError,active:nodeTypes.length};
     d.dispose();return answer;
    }''')
    print('NATIVE DSP AUDIT',json.dumps(result))
    assert result['filterCount']==24 and result['types']==['peaking'], result
    assert result['maxDiffDb']<.09, result
    assert not errors,errors[:5]
    browser.close()
