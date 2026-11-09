"""An EQ gesture must be reversible in the original MWCM editor toolbar."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import sys
HTML=Path(sys.argv[1]).read_text()
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1280,'height':900})
    failures=[]
    page.on('pageerror',lambda err:failures.append(str(err)))
    page.evaluate("""()=>{let store={};Object.defineProperty(window,'localStorage',{configurable:true,get:()=>({getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k],clear:()=>store={}})});Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>({getItem:k=>null,setItem:()=>{}})})}""")
    page.set_content(HTML,wait_until='load',timeout=30000)
    page.wait_for_timeout(450)
    page.get_by_role('tab',name='🎸 Bass',exact=True).click()
    page.locator('.xen-eq-trigger').click()
    page.get_by_role('button',name='Raster EQ fixed frequency bands').click()
    page.get_by_role('button',name='Paint EQ curves').click()
    pane=page.locator('.xen-eq-panel')
    key=page.evaluate("document.querySelector('.xen-eq-panel').dataset.eqSource")
    def curves():return page.evaluate('k=>{const c=window.XenSonarEQ.get(k);return {a:c.a,b:c.b}}',key)
    baseline=curves()
    canvas=pane.locator('.xen-eq-profile').first.locator('canvas')
    bounds=canvas.bounding_box()
    x=bounds['x']+bounds['width']*.3;y=bounds['y']+bounds['height']*.18
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+bounds['width']*.2,y,steps=6);page.mouse.up()
    painted=curves()
    assert painted['a']!=baseline['a'], 'paint stroke not registered'
    assert painted['b']==baseline['b'], 'stroke spilled to B'
    pane.locator('.xen-eq-profile').first.get_by_role('button',name='Undo').click()
    reverted=curves()
    assert reverted['a']==baseline['a'],'Undo did not restore the A curve after Raster Paint'
    assert reverted['b']==baseline['b'],'Undo must never touch B'
    assert not failures,failures
    print('PASS raster Paint gesture then Undo preserves B')
    browser.close()
