"""Focused P4B L10 UI check. No wide legacy suites."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
html=(root/json.loads((root/'source-manifest.json').read_text())['entry']).read_text()
report={'checks':[],'errors':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  pg=browser.new_page(viewport={'width':1740,'height':1080})
  pg.on('pageerror',lambda exc:report['errors'].append(str(exc)))
  pg.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()},configurable:true});Object.defineProperty(window,'sessionStorage',{value:window.localStorage,configurable:true});let z=0;crypto.randomUUID=()=>('10000000-0000-4000-8000-'+String(++z).padStart(12,'0'));}""")
  pg.set_content(html,wait_until='load',timeout=40000)
  pg.get_by_role('button',name='II. MATERIAL FORGE').click()
  pg.get_by_role('button',name='SYNTHETICFORGE',exact=False).first.click()
  pg.get_by_text('Melodic Loop',exact=True).first.click()
  assert pg.get_by_role('button',name='Add Instrument').count()==1
  assert pg.get_by_role('button',name='Upload Samples').count()==1
  assert pg.locator('.melodic-card-sound-select').count()==4
  assert pg.get_by_text('INSTRUMENT 1 SOUND').count()==0
  assert pg.locator('.melodic-instrument-pairgrid').count()==0
  assert pg.locator('.melodic-import-sounds-stack').count()==1
  assert pg.locator('#melodic-sample-database-panel').count()==0
  report['checks'].append('4 card-local instrument selects, no duplicated upper dropdowns, upload always visible, database initially collapsed')
  pg.screenshot(path=str(root/'P4B_L10_compact_closed.png'))
  pg.get_by_role('button',name='0 Samples').click()
  assert pg.locator('#melodic-sample-database-panel').count()==1
  assert pg.get_by_role('button',name='Upload Samples').count()==1
  assert pg.get_by_role('button',name='Import Material Track').count()>=1
  pg.screenshot(path=str(root/'P4B_L10_compact_open.png'))
  pg.get_by_role('button',name='0 Samples').click()
  assert pg.locator('#melodic-sample-database-panel').count()==0
  report['checks'].append('sample database expand/collapse with no duplicate header; upload remains available')
  first=pg.locator('.melodic-card-sound-select select').first
  opts=first.locator('option').all()
  assert len(opts)>3, len(opts)
  current=first.input_value()
  other=next(o.get_attribute('value') for o in opts if o.get_attribute('value')!=current)
  first.select_option(other)
  assert first.input_value()==other
  report['checks'].append('native per-card sound dropdown changes assigned preset')
  for n in range(5,9):
   pg.get_by_role('button',name='Add Instrument').click()
   assert pg.locator('.melodic-card-sound-select').count()==n
  assert pg.get_by_role('button',name='Add Instrument').count()==0
  pg.screenshot(path=str(root/'P4B_L10_eight_cards.png'))
  report['checks'].append('Add Instrument adds one card at a time until 8 and then disappears')
  assert not report['errors'],report['errors']
 finally:browser.close()
report['pass']=True
(root/'P4B_L10_BROWSER_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
