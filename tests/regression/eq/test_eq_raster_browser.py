"""Browser contract: real pointer gesture is interpreted as band values; adaptive switch preserves curve."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from statistics import mean
import sys
HTML=Path(sys.argv[1]).read_text()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1280,'height':860})
 errors=[];page.on('pageerror',lambda err: errors.append(str(err)))
 page.evaluate("""()=>{let store={};Object.defineProperty(window,'localStorage',{configurable:true,get:()=>({getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k],clear:()=>store={}})});Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>({getItem:k=>null,setItem:()=>{}})})}""")
 page.set_content(HTML,wait_until='load',timeout=30000)
 page.wait_for_timeout(500)
 page.get_by_role('tab',name='🎸 Bass',exact=True).click()
 page.locator('.xen-eq-trigger').click()
 page.get_by_role('button',name='Raster EQ fixed frequency bands').click()
 page.get_by_role('button',name='Paint EQ curves').click()
 pane=page.locator('.xen-eq-panel')
 canvas=pane.locator('.xen-eq-profile').first.locator('canvas')
 bounds=canvas.bounding_box();assert bounds,bounds
 # Gesture sweeps to top across adjacent frequency cells; canvas is scaled by CSS.
 y=bounds['y']+12
 for f in [0.28,0.33,0.39,0.45]:
  x=bounds['x']+f*bounds['width']
  if f==0.28:page.mouse.move(x,y);page.mouse.down()
  else:page.mouse.move(x,y,steps=3)
 page.mouse.up()
 # Fast second pass across two lower cells: independent extreme cut targets.
 low_y=bounds['y']+bounds['height']-12
 page.mouse.move(bounds['x']+0.54*bounds['width'],low_y);page.mouse.down()
 page.mouse.move(bounds['x']+0.66*bounds['width'],low_y,steps=5);page.mouse.up()
 cfg=page.evaluate("""()=>{const key=document.querySelector('.xen-eq-panel').dataset.eqSource;
 const x=window.XenSonarEQ.get(key),p=window.XenSonarEQ.plan(x,48000);
 return {mode:x.mode,bands:x.bands,a:x.a,b:x.b,bandError:p.bandError,provisional:p.provisional,key};} """)
 assert cfg['mode']=='raster',cfg
 assert not cfg['provisional'] and cfg['bandError'] is not None,cfg
 counts=[]
 for k in range(cfg['bands']):
  vals=cfg['a'][int((k+.1)/cfg['bands']*359):int((k+.9)/cfg['bands']*359)]
  if vals and mean(vals)>.9:counts.append(k)
 assert len(counts)>=2,f'gesture should touch multiple whole bands: {counts}'
 lows=[k for k in range(cfg['bands']) if (lambda vals:bool(vals) and mean(vals)<-.8)(cfg['a'][int((k+.1)/cfg['bands']*359):int((k+.9)/cfg['bands']*359)])]
 assert len(lows)>=2,f'gesture should touch multiple minimum bands: {lows}'
 assert all(v==0 for v in cfg['b']),'B should remain independent'
 before=cfg['a']
 page.get_by_role('button',name='Adaptive EQ free filter allocation').click()
 after=page.evaluate("""()=>{const key=document.querySelector('.xen-eq-panel').dataset.eqSource;
 const x=window.XenSonarEQ.get(key);return {mode:x.mode,a:x.a};}""")
 assert after['mode']=='adaptive' and after['a']==before,'mode must preserve exact 360 source values'
 assert not errors,errors
 print('PASS native browser raster Paint gesture, band max, B independence, adaptive roundtrip, no JS errors. Painted high',counts,'low',lows)
 browser.close()
