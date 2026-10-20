from playwright.sync_api import sync_playwright
from pathlib import Path
content=Path('/mnt/data/XenSonar_N21_F2_P7_9_1_Zoom_And_Sample_Rays_Test.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1440,'height':900})
 page.set_default_timeout(5000)
 page.evaluate("""(() => {let data=new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),clear:()=>data.clear(),key:i=>[...data.keys()][i]??null,get length(){return data.size}}}); Object.defineProperty(window,'sessionStorage',{configurable:true,value:{getItem:k=>null,setItem:(k,v)=>{},removeItem:k=>{},clear:()=>{}}});Object.defineProperty(window.crypto,'randomUUID',{configurable:true,value:()=>('00000000-0000-4000-8000-'+Math.floor(Math.random()*2**48).toString(16).padStart(12,'0'))});})();""")
 print('loading',flush=True)
 page.set_content(content,wait_until='domcontentloaded',timeout=30000)
 page.wait_for_timeout(900)
 for fn in ["page.get_by_role('button',name='II. MATERIAL FORGE').first", "page.locator('button').filter(has_text='SYNTHETICFORGE').first", "page.locator('button').filter(has_text='↪').first"]:
  loc=eval(fn);loc.evaluate('(x)=>x.click()');page.wait_for_timeout(450)
 print('nav',page.locator('[data-ml-nav-mode="resize-start"]').count(),flush=True)
 nav=page.locator('[data-ml-nav-mode="resize-start"]');nav.scroll_into_view_if_needed()
 bb=nav.bounding_box();print('bb',bb,flush=True)
 page.evaluate("""(()=>{window._navE=[];for(const t of ['pointerdown','pointermove','pointerup','mousemove','mouseup','lostpointercapture'])window.addEventListener(t,e=>{if(window._navE.length<28)window._navE.push([t,Math.round(e.clientX),e.target?.getAttribute?.('data-ml-nav-mode')])},true)})()""")
 before=page.locator('[data-ml-nav-mode="move"]').get_attribute('style')
 x=bb['x']+6;y=bb['y']+10
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+120,y,steps=1);page.mouse.up()
 print('done gestures',flush=True)
 page.wait_for_timeout(100)
 after=page.locator('[data-ml-nav-mode="move"]').get_attribute('style')
 print('before',before,'after',after,'events',page.evaluate('window._navE'),flush=True)
 b.close()
