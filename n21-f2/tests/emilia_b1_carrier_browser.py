from playwright.sync_api import sync_playwright
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'XenSonar_EMILIA_B1_RECIPROCAL_MATERIAL.html'
html=p.read_text().replace('</script>','window.__emtest={emilia:__Emilia,store:pe,cache:__f333HearingCache};</script>',1)
with sync_playwright() as q:
 b=q.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':1512,'height':1040},accept_downloads=True);page.set_default_timeout(16000)
 page.on('pageerror',lambda e: print('PAGEERROR:',str(e)[:500],flush=True))
 page.evaluate('''() => {const obj={};const storage={getItem:k=>obj[k]||null,setItem:(k,v)=>obj[k]=String(v),removeItem:k=>delete obj[k],clear:()=>Object.keys(obj).forEach(k=>delete obj[k])};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});}''')
 page.set_content(html,wait_until='load',timeout=30000)
 page.get_by_role('button',name='II. MATERIAL FORGE',exact=True).click();page.get_by_role('button',name='SpectralForge').click()
 page.locator('select').filter(has=page.locator('option[value=emilia]')).select_option('emilia')
 panel=page.locator('[data-emilia-synth-lab]')
 hold=panel.get_by_role('button',name='Hold tone')
 hold.click()
 try:
  page.get_by_role('button',name='Stop tone').wait_for(timeout=40000)
  print('PASS hold tone actual browser')
 except Exception as e:print('HOLD issue',str(e)[:200],panel.locator('.emilia-b-status').inner_text()[:300])
 # drawn carrier
 canvas=page.locator('[data-forge-carrier-canvas]')
 print('CANVAS',canvas.count());canvas.scroll_into_view_if_needed()
 box=canvas.bounding_box()
 page.mouse.move(box['x']+box['width']*.18,box['y']+box['height']*.55);page.mouse.down();page.mouse.move(box['x']+box['width']*.8,box['y']+box['height']*.57,steps=35);page.mouse.up()
 print('ENERGY',page.evaluate('''() => window.__emtest.store.getState().spectralData.data.reduce((a,b)=>a+b,0)'''))
 play=page.get_by_role('button',name='Listening mode is rendered automatically')
 print('PLAY COUNT',play.count());play.click()
 try:
  page.wait_for_function('''() => window.__emtest.cache.size>0''',timeout=40000)
  print('PASS ACTUAL CARRIER browser, CACHE',page.evaluate('window.__emtest.cache.size')); print('BUFFER PEAK',page.evaluate('''() => Array.from(window.__emtest.cache.values())[0].getChannelData(0).reduce((m,v)=>Math.max(m,Math.abs(v)),0)'''))
 except Exception as e:
  print('CARRIER issue:',str(e)[:250]);print('STATUS',page.locator('body').inner_text()[-1200:])
 
 try:
  with page.expect_download(timeout=40000) as info:
   page.locator('button').filter(has_text='⬇ WAV').last.click()
  download=info.value
  dest=str(p.parent/'inspection/emilia-b1-export-test.wav')
  download.save_as(dest)
  import wave,numpy as np
  with wave.open(dest,'rb') as f:
   a=np.frombuffer(f.readframes(f.getnframes()),'<i2').astype('float32')/32768
  print('PASS actual WAV export',len(a),'frames, peak',float(np.max(abs(a))))
 except Exception as ex:
  print('WAV EXPORT not confirmed',str(ex)[:350])
 b.close()
