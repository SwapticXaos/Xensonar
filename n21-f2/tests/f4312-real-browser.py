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
 layer=page.locator('[data-emilia-ripple-layer]');assert layer.count()==1
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
 page.wait_for_timeout(250)
 end=page.evaluate('''() => {const a=document.querySelector('[data-emilia-ripple]');return{n:document.querySelectorAll('[data-emilia-ripple]').length,same:a===window.__rippleFirst,hasHTML:!!document.querySelector('.emilia-b-ripple-wave'),position:document.querySelector('g[aria-label^="Move "]')?.getAttribute('transform')}}''')
 assert end['n']==2,end
 assert not errors,errors
 print('PASS: real browser app + press/move/release; HTML ripple nodes persist through drag; release emits exactly one new wave;',mid,end)
 b.close()
