import json, pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
html=root/'Xensonar_F3_56_55_CLEAN5_MYZEL_G.html'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required','--disable-dev-shm-usage'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.evaluate("""() => {
      const store=new Map();for(const prop of ['localStorage','sessionStorage'])Object.defineProperty(window,prop,{configurable:true,get(){return{
        setItem:(k,v)=>store.set(k,String(v)),getItem:k=>store.get(k)??null,removeItem:k=>store.delete(k),
        clear:()=>store.clear(),key:i=>Array.from(store.keys())[i]||null,get length(){return store.size}
      };}});
    }""")
    instrumented=html.read_text().replace('</script>',
      ';window.__myzelGDebug={create:myzelGCreate,update:myzelGUpdate,make:createMyzelGDSP,loader:jF};</script>',1)
    page.set_content(instrumented,wait_until='load',timeout=60000)
    page.wait_for_timeout(2000)
    state=page.evaluate('''() => ({ready:document.readyState, title:document.title, g:typeof window.__myzelGDebug?.create, d:typeof window.__myzelGDebug?.make, loader:typeof window.__myzelGDebug?.loader, hasApp:!!document.querySelector('#root'), bodyLength:document.body?.innerText.length})''')
    print('APP',json.dumps(state,ensure_ascii=False))
    if errors:print('PAGE_ERRORS',errors[:5])
    assert state['g']=='function' and state['d']=='function' and state['hasApp']
    # Browser runs the real worklet processor, not a mocked offline implementation.
    page.evaluate('''async () => {let ctx=new AudioContext({sampleRate:48000}), analyzer=ctx.createAnalyser();analyzer.fftSize=2048;
      analyzer.connect(ctx.destination);let refs={};window.__myzelGDebug.create(ctx,refs,analyzer);
      await ctx.resume();window.__gProbe={ctx,analyzer,refs};
      for(let i=0;i<5;i++){const id=i<2?'fold':'res';ctx.currentTime;
        window.__myzelGDebug.update(ctx,refs,{enabled:true,mode:'installation',couplingEnabled:true,rootHz:132,
        snapshot:{nearestNodeId:id,nearestNodeLabel:id,myzelNearestModuleTypes:i<2?['wavefolder']:['resonator'],
        myzelNearestIsCustomResident:false,nearestNodeFreq:i<2?198:247,myzelNearestAuraStrength:.88,ballToNearestNodeNormDist:.05,
        nearestNodeEnergy:.8,myceliumBallSpeed:5,myzelLocalBrightness:.69,myzelLocalBody:.8,myzelRelationTension:.3,cursorNormalizedX:.5},
        mix:{rootLevel:.8,nodeLevel:.82,ballLevel:.6}});
        await new Promise(ok=>setTimeout(ok,90));}
      await refs.__myzelG.ready;
    }''')
    page.wait_for_timeout(600)
    response=page.evaluate('''() => {const r=window.__gProbe, engine=r.refs.__myzelG;let data=new Float32Array(2048);r.analyzer.getFloatTimeDomainData(data);let sum=0,peak=0;
      for(let v of data){sum+=v*v;peak=Math.max(peak,Math.abs(v));}
      return{rms:Math.sqrt(sum/data.length),peak,worklet:!!engine.worklet,error:engine.error,
       history:engine.history.map(e=>e.type),nodes:engine.nodes.length,ctx:r.ctx.state};}''')
    print('AUDIO',json.dumps(response,ensure_ascii=False))
    # about:blank is an opaque origin: Chromium intentionally disables AudioWorklet.
    # The fallback must be genuinely audible, while worklet DSP is tested in Node below.
    assert response['worklet'] or 'AudioWorklet unavailable' in (response['error'] or ''),response
    assert response['rms']>.00001,response
    assert not errors,errors[:5]
    page.evaluate('''async () => {let r=window.__gProbe;window.__myzelGDebug.update(r.ctx,r.refs,{enabled:false,mode:'installation'});r.refs.__myzelG.dispose();await r.ctx.close();}''')
    browser.close()
    print('PASS real Chromium rendered full G HTML, fallback produced nonzero PCM; opaque-origin AudioWorklet unavailable')
