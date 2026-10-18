import os
"""FIX1 browser regression: using set_content because sandbox navigation is restricted.
Normal offline HTML users get native localStorage. The tiny shim below only
substitutes storage for about:blank; no product code is changed.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
entry=root/json.loads((root/'source-manifest.json').read_text())['entry']
result={'status':'FAIL','checks':[],'dimensions':{},'pageErrors':[]}
def check(name,ok):
 if not ok:raise AssertionError(name)
 result['checks'].append(name)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=os.environ.get('XENSONAR_CHROMIUM_PATH'),args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 try:
  page=browser.new_page(viewport={'width':1560,'height':1060})
  page.on('pageerror',lambda e:result['pageErrors'].append(str(e)))
  page.evaluate('''() => {const db=new Map();const api={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v)),removeItem:k=>db.delete(k),clear:()=>db.clear(),key:i=>[...db.keys()][i]??null,get length(){return db.size}};Object.defineProperty(window,'localStorage',{value:api,configurable:true});Object.defineProperty(window,'sessionStorage',{value:api,configurable:true});}''')
  page.evaluate('''() => {if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})});}''')
  page.set_content(entry.read_text(),wait_until='domcontentloaded')
  page.get_by_role('button',name='Power',exact=True).wait_for(timeout=15000)
  check('first rendering contains no JS errors',not result['pageErrors'])
  page.locator('button').filter(has_text='RhythmForg').first.click()
  modal=page.locator('.xen-bass-manager-modal')
  modal.wait_for(timeout=10000)
  check('bass manager opens',modal.count()==1)
  rect=modal.bounding_box();body=page.locator('[data-bass-body-canvas]').bounding_box()
  result['dimensions']['desktop']={'modal':round(rect['width']),'noteCanvas':round(body['width']),'noteCanvasHeight':round(body['height'])}
  check('wide bass editor uses real viewport width and enlarged grid',rect['width']>1400 and body['width']>720 and body['height']>=250)
  dialogs=[]
  page.on('dialog',lambda d:(dialogs.append(d.message),d.dismiss()))
  modal.get_by_role('button',name='Reroll',exact=True).click()
  name=modal.get_by_label('New Bass Pattern Name');name.wait_for()
  name.fill('Bass Test 13 Okt')
  modal.get_by_role('button',name='Save As…').last.click()
  check('Save As reads entered name without browser prompt',modal.get_by_text('Bass Test 13 Okt',exact=True).count()>=1 and name.input_value()=='Bass Test 13 Okt' and not dialogs)
  for width in [1280,1024,900]:
   page.set_viewport_size({'width':width,'height':980})
   info=modal.evaluate('(e)=>({client:e.clientWidth,scroll:e.scrollWidth})');body=page.locator('[data-bass-body-canvas]').bounding_box()
   result['dimensions'][str(width)]={'modal':info['client'],'scroll':info['scroll'],'noteCanvas':round(body['width'])}
   check(f'modal fits width {width} without horizontal clipping',info['scroll']<=info['client']+1)
  modal.get_by_role('button',name='Close Window').click()
  page.get_by_role('button',name='Power',exact=True).click()
  page.wait_for_timeout(500)
  current=lambda:page.locator('select').evaluate_all('(e)=>({system:e[0]?.value,mode:e[1]?.value,grid:e[2]?.value})')
  # The bottom green squares are the SAME mute pattern as the moving particles,
  # not a second independently maintained display. Verify actual DOM state,
  # rather than only checking the mode dropdown.
  toggle_header=page.get_by_text('Toggle particles individually',exact=False).first
  toggle_grid=toggle_header.locator('xpath=following-sibling::div[1]')
  squares=toggle_grid.locator('button')
  def mask():
   return squares.evaluate_all('(els)=>els.map(e=>e.classList.contains("bg-emerald-400"))')
  check('lower particle mute squares exist',squares.count()==12)
  original_ji=mask()
  original_grid=current()['grid']
  original_grid_mode=page.locator('select').nth(3).input_value()
  page.keyboard.press('n')
  check('N never alters grid tuning or mode',current()['grid']==original_grid and page.locator('select').nth(3).input_value()==original_grid_mode)
  check('N advances JI particle mode',current()['mode']=='dorian')
  check('JI mode immediately changes bottom mute squares',mask()!=original_ji)
  page.keyboard.press('m')
  check('M restores JI mute pattern in bottom squares',current()['mode']=='ionian' and mask()==original_ji)
  check('M never alters grid tuning or mode',current()['grid']==original_grid and page.locator('select').nth(3).input_value()==original_grid_mode)
  page.keyboard.press('-')
  check('minus changes particle system to 12EDO, leaving grid tuning intact',current()['system']=='12edo' and current()['grid']=='12edo')
  check('12EDO ionian mute squares match the sounding mode',mask()==[i in [0,2,4,5,7,9,11] for i in range(12)])
  page.keyboard.press('n')
  check('N advances 12EDO particle mode',current()['mode']=='dorian')
  check('12EDO dorian mute squares are synchronized',mask()==[i in [0,2,3,5,7,9,10] for i in range(12)])
  check('12EDO particle N/M leaves grid unchanged', current()['grid']==original_grid and page.locator('select').nth(3).input_value()==original_grid_mode)
  # Manual mutes remain usable; choosing a mode reestablishes its own pattern.
  squares.nth(2).click()
  check('clicking a lower square manually mutes one note',mask()[2] is False)
  page.keyboard.press('n')
  check('12EDO Ukrainian Dorian restores all lower squares to its pattern',current()['mode']=='ukr_dorian' and mask()==[i in [0,2,3,6,7,9,10] for i in range(12)])
  page.keyboard.press('-')
  check('minus changes particle system to Bohlen-Pierce',current()['system']=='bp' and current()['mode']=='chromatic')
  check('Bohlen-Pierce creates thirteen active mute squares',squares.count()==13 and all(mask()))
  page.keyboard.press('m')
  check('M cycles native Bohlen-Pierce modes',current()['mode']=='bp_minor')
  check('Bohlen-Pierce minor mute squares show the native thirteen-step pattern',mask()==[i in [0,1,3,5,6,8,9,11,12] for i in range(13)])
  check('all browser interactions are free of uncaught JS errors',not result['pageErrors'])
  result['status']='PASS'
 finally:
  browser.close()
root.joinpath('results/f355_fix1_browser_contract.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(result,ensure_ascii=False))
