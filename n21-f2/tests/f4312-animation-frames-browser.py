from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'XenSonar_Fractalia_F4_3_12_Emilia_Compositor_Ripples.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=b.new_page(viewport={'width':1520,'height':1160})
 page.evaluate('''() => {for(const name of ['localStorage','sessionStorage']){const mem={};Object.defineProperty(window,name,{configurable:true,value:{getItem:k=>mem[k]??null,setItem:(k,v)=>mem[k]=v,removeItem:k=>delete mem[k],clear:()=>Object.keys(mem).forEach(k=>delete mem[k])}})}}''')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=30000)
 page.get_by_role('button',name='II. MATERIAL FORGE',exact=True).click(timeout=15000)
 page.get_by_role('button',name='SpectralForge').click(timeout=15000)
 picker=page.locator('select').filter(has=page.locator('option[value="emilia"]')).first
 picker.select_option('emilia')
 field=page.locator('[data-emilia-nodal-field]');field.wait_for(timeout=15000)
 page.evaluate(r'''() => {window.__waveEventLog=[];window.__waveFrames=[];window.__waveFinished=false;
  new MutationObserver(records=>{for(const rec of records)for(const n of rec.addedNodes){if(!n.classList?.contains('emilia-b-ripple-wave'))continue;
    window.__waveEventLog.push({t:performance.now(),x:n.style.left,y:n.style.top});
    if(window.__waveEventLog.length===2){const start=performance.now();
      function observe(t){const m=getComputedStyle(n).transform;let sc=NaN;const v=m.match(/^matrix\(([^,]+)/);if(v)sc=Number(v[1]);
        window.__waveFrames.push({t,sc});if(t-start<1030)requestAnimationFrame(observe);else window.__waveFinished=true;}
      requestAnimationFrame(observe)}
  }}).observe(document.querySelector('[data-emilia-ripple-layer]'),{childList:true})}''')
 layer=page.locator('[data-emilia-ripple-layer]');assert layer.count()==1
 previewBtn=page.locator('[data-emilia-held-preview]')
 print('PREVIEW click...')
 previewBtn.click()
 try:
  page.wait_for_function("document.querySelector('[data-emilia-held-preview]')?.textContent?.includes('Stop')",timeout=10000)
  print('PREVIEW running!')
 except Exception as exc:
  print('PREVIEW failed:',str(exc)[:350])
 nd=field.locator('g[aria-label^="Move "]').first
 nd.scroll_into_view_if_needed();box=nd.bounding_box();assert box
 p1={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}
 page.mouse.move(**p1);page.mouse.down()
 page.wait_for_timeout(120)
 down=page.evaluate('''() => {const a=document.querySelector('[data-emilia-ripple]');return {n:document.querySelectorAll('[data-emilia-ripple]').length,wave:a,transform:a?getComputedStyle(a).transform:null}}''')
 assert down['n']==1,down
 # Capture DOM identity in the browser, not python serialisation.
 page.evaluate("window.__rippleFirst=document.querySelector('[data-emilia-ripple]')")
 page.mouse.move(p1['x']+28,p1['y']+12,steps=3)
 page.wait_for_timeout(130)
 mid=page.evaluate('''() => {const a=document.querySelector('[data-emilia-ripple]');return{n:document.querySelectorAll('[data-emilia-ripple]').length,same:a===window.__rippleFirst,transform:a?getComputedStyle(a).transform:null}}''')
 assert mid['n']==1 and mid['same'],mid
 page.mouse.up()
 page.evaluate('window.__releaseTime=performance.now()')
 page.wait_for_function('window.__waveEventLog.length===2',timeout=10000)
 page.wait_for_function('window.__waveFinished===true',timeout=5000)
 end=page.evaluate('''() => {const a=document.querySelector('[data-emilia-ripple]');return{n:document.querySelectorAll('[data-emilia-ripple]').length,same:a===window.__rippleFirst,hasHTML:!!document.querySelector('.emilia-b-ripple-wave'),position:document.querySelector('g[aria-label^="Move "]')?.getAttribute('transform')}}''')
 assert end['hasHTML'],end
 assert not errors,errors
 stats=page.evaluate('''() => {const f=window.__waveFrames,dt=f.slice(1).map((v,i)=>v.t-f[i].t),finite=f.every(v=>Number.isFinite(v.sc)), increasing=f.every((v,i)=>i===0||v.sc>=f[i-1].sc-.001);return{frames:f.length,maxGapMs:Math.max(...dt),meanGapMs:dt.reduce((a,b)=>a+b,0)/dt.length,firstScale:f[0].sc,lastScale:f[f.length-1].sc,finite,increasing}}''')
 print('FRAME STATISTICS',stats)
 assert stats['frames']>40,stats
 assert stats['maxGapMs']<100,stats
 assert stats['increasing'] and stats['finite'] and stats['lastScale']>stats['firstScale']*10,stats
 print('PASS: preview-on real browser pointer sequence and wave emit after render',mid,end)
 b.close()
