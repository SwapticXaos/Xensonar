from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path('/mnt/data/P7_4_KEYBOARD_CURSOR/n21-f2/XenSonar_Codex_Handoff_Through_11.html')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':1540,'height':1040})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""(()=>{let store=new Map;for(const target of ['localStorage','sessionStorage'])Object.defineProperty(window,target,{configurable:true,value:{getItem:k=>store.get(target+k)||null,setItem:(k,v)=>store.set(target+k,String(v)),removeItem:k=>store.delete(target+k),clear:()=>store.clear(),key:i=>[...store.keys()][i]||null,get length(){return store.size}}})})()""")
 page.goto('about:blank');page.set_content(p.read_text(),wait_until='domcontentloaded',timeout=60000);page.wait_for_timeout(450)
 print('BUTTONS',page.get_by_role('button').all_text_contents()[:20], 'errors',errors[:3], 'body', page.locator('body').inner_text()[:250]);page.get_by_role('button',name='II. MATERIAL FORGE').click()
 page.get_by_role('button',name='SPECTRALFORGE',exact=False).click()
 nav=page.locator('[data-forge-navigator]');nav.wait_for(timeout=12000)
 box=nav.bounding_box();print('navigator',box)
 assert box
 def navx(frac): return box['x']+box['width']*frac
 y=box['y']+box['height']*.5
 page.mouse.move(navx(.27),y);page.mouse.down();page.mouse.move(navx(.67),y,steps=3);page.mouse.up();page.wait_for_timeout(150)
 selection=page.locator('[data-forge-navigator-sample-selection]');selection.wait_for()
 main_start=page.locator('[data-forge-main-sample-start]');main_end=page.locator('[data-forge-main-sample-end]')
 print('handles',main_start.count(),main_end.count())
 print('startbox', main_start.bounding_box(),'endbox',main_end.bounding_box())
 print('main canvas count',page.locator('[data-forge-carrier-canvas]').count())
 print('save button',page.locator('[data-forge-navigator-save-sample]').count())
 assert main_start.count() and main_end.count(),'endpoints should be visible in viewport'
 start_box=main_start.bounding_box();end_box=main_end.bounding_box()
 print('before', selection.evaluate('(e)=>e.style.left'),selection.evaluate('(e)=>e.style.width'))
 assert start_box and end_box
 start_cx=start_box['x']+start_box['width']/2; start_cy=start_box['y']+15
 page.mouse.move(start_cx,start_cy);page.mouse.down();page.mouse.move(start_cx+36,start_cy,steps=3);page.mouse.up();page.wait_for_timeout(180)
 val=selection.evaluate('(e)=>({left:parseFloat(e.style.left),width:parseFloat(e.style.width)})')
 print('after start',val)
 assert val['left']>28.5 and val['left']<60, val
 current_end=val['left']+val['width'];assert abs(current_end-67)<2,(current_end,val)
 end_box=main_end.bounding_box();end_cx=end_box['x']+end_box['width']/2;end_cy=end_box['y']+15
 page.mouse.move(end_cx,end_cy);page.mouse.down();page.mouse.move(end_cx-40,end_cy,steps=3);page.mouse.up();page.wait_for_timeout(180)
 val2=selection.evaluate('(e)=>({left:parseFloat(e.style.left),width:parseFloat(e.style.width)})')
 print('after end',val2)
 assert val2['width']<val['width']-1,val2
 assert abs(val2['left']-val['left'])<1,val2
 page.screenshot(path='/mnt/data/P7_4_KEYBOARD_CURSOR/forge_main_handles_p75.png')
 assert not errors,errors[:6]
 print('PASS main visible boundary drag synchronizes Navigator sample selection; no browser errors')
 b.close()
