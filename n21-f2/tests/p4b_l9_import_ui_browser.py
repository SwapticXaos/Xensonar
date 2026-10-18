"""P4B-L9 real Chromium layout and exclusive import managers acceptance.
Run: python3 tests/p4b_l9_import_ui_browser.py
Uses browser page with isolated in-memory storage.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'source-manifest.json').read_text())
html=(root/manifest['entry']).read_text()
# Test-only bridge injected inside the existing module; never written to the shipping HTML.
html=html.replace('</script>', "\nwindow.__L9test={entrophon:__XenEntrophonLibrary,nodal:__XenNodalLibrary,capture:captureEntrophonInstrument,starter:nodalStarter};\n</script>", 1)
checks=[]; errors=[]

def rect(e):return e.bounding_box()
def overlap(a,b):return max(0,min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x']))*max(0,min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y']))

def start(page):
  page.evaluate('''() => {const m=new Map();let z=0;Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()},configurable:true});Object.defineProperty(window,'sessionStorage',{value:window.localStorage,configurable:true});crypto.randomUUID=()=>('10000000-0000-4000-8000-'+String(++z).padStart(12,'0'));}''')
  page.set_content(html,wait_until='load',timeout=50000)
  page.get_by_role('button',name='II. MATERIAL FORGE').click()
  page.get_by_role('button',name='SYNTHETICFORGE',exact=False).first.click()
  page.get_by_text('Melodic Loop',exact=True).first.click()
  assert page.locator('.melodic-import-sounds-stack').count()==1
  # Create real samples through the library API; the two libraries remain independent.
  page.evaluate("""() => {window.__L9test.entrophon.save(window.__L9test.capture('L9 Purple Test','wave'));window.__L9test.nodal.save({...window.__L9test.starter('glass'),name:'L9 Turquoise Test'});}""")
  page.wait_for_timeout(100)

def test_managers(page,tag):
  container=page.locator('.melodic-import-sounds-stack')
  nodal=container.get_by_role('button',name='Nodal · Manage')
  entro=container.get_by_role('button',name='Entrophon · Manage')
  assert nodal.count()==1 and entro.count()==1
  assert container.locator('.nd-library-manager-content').count()==0
  nb,eb=rect(nodal),rect(entro)
  nodal.click()
  assert nodal.get_attribute('aria-expanded')=='true'
  assert entro.get_attribute('aria-expanded')=='false'
  content=container.locator('.nd-library-manager-content')
  assert content.count()==1
  p=rect(content)
  assert p['y']>eb['y']+eb['height']+2,('nodal menu covers lower button',p,eb)
  assert p['x']<nb['x'],('menu should open diagonally down-left',p,nb)
  assert overlap(p,nb)==0 and overlap(p,eb)==0
  assert content.get_by_text('L9 Turquoise Test').count()==1
  assert page.evaluate("getComputedStyle(document.querySelector('.nd-library-manager:not(.entrophon-library-manager) .nd-library-manager-content')).backgroundColor")=='rgb(16, 32, 39)'
  page.screenshot(path=str(root/f'P4B_L9_{tag}_nodal_open.png'))
  entro.click()
  assert nodal.get_attribute('aria-expanded')=='false','opening Entrophon must close Nodal'
  assert entro.get_attribute('aria-expanded')=='true'
  assert content.count()==1
  p2=rect(content)
  assert p2['y']>eb['y']+eb['height']+2 and p2['x']<eb['x']
  assert overlap(p2,nb)==0 and overlap(p2,eb)==0
  assert content.get_by_text('L9 Purple Test').count()==1
  styles=page.evaluate("""() => {const s=document.querySelector('.entrophon-library-manager'); const p=s.querySelector('.nd-library-manager-content');const row=p.querySelector('.nd-library-manager-row');return {popup:getComputedStyle(p).backgroundColor, input:getComputedStyle(row.querySelector('input')).backgroundColor,button:getComputedStyle(row.querySelector('button')).backgroundColor,border:getComputedStyle(p).borderTopColor}}""")
  assert styles['popup']=='rgb(33, 22, 46)',styles
  assert styles['input']=='rgb(23, 15, 32)',styles
  assert styles['button']=='rgb(73, 48, 93)',styles
  assert styles['border']=='rgb(167, 139, 250)',styles
  page.screenshot(path=str(root/f'P4B_L9_{tag}_entrophon_open.png'))
  nodal.click()
  assert nodal.get_attribute('aria-expanded')=='true'
  assert entro.get_attribute('aria-expanded')=='false'
  assert content.count()==1
  nodal.click()
  assert content.count()==0
  checks.append(f'{tag}: 2 managers exclusive, no trigger covered, diagonally offset menu, correct Nodal/Entrophon surfaces and controls')

with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  try:
    page=browser.new_page(viewport={'width':1740,'height':1000})
    page.on('pageerror',lambda ex:errors.append(str(ex)))
    start(page)
    assert page.locator('.melodic-added-instrument').count()==0
    test_managers(page,'4_instruments')
    for i in range(4):page.get_by_role('button',name='Add Instrument').click()
    assert page.locator('.melodic-added-instrument').count()==4
    test_managers(page,'8_instruments')
    assert not errors,errors
    checks.append('no browser JavaScript exceptions')
  finally:browser.close()
report={'checks':checks,'errors':errors,'pass':True}
(root/'P4B_L9_BROWSER_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('PASS',json.dumps(report,ensure_ascii=False))
