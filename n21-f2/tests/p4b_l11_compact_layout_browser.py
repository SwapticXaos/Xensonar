from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
html=(root/json.loads((root/'source-manifest.json').read_text())['entry']).read_text()
reports=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 try:
  for width in (1740,1440):
   page=b.new_page(viewport={'width':width,'height':1100})
   errors=[]
   page.on('pageerror',lambda exc:errors.append(str(exc)))
   page.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()},configurable:true});Object.defineProperty(window,'sessionStorage',{value:window.localStorage,configurable:true});let z=0;crypto.randomUUID=()=>('10000000-0000-4000-8000-'+String(++z).padStart(12,'0'));}""")
   page.set_content(html,wait_until='load',timeout=45000)
   page.get_by_role('button',name='II. MATERIAL FORGE').click()
   page.get_by_role('button',name='SYNTHETICFORGE',exact=False).first.click()
   page.get_by_text('Melodic Loop',exact=True).first.click()
   assert page.get_by_text('Presets & Projects',exact=True).count()>=1
   assert page.locator('.melodic-project-inline').count()==1
   assert page.get_by_role('button',name='Compose From Scratch').count()==1
   assert page.get_by_role('button',name='Save as Project File').count()==1
   assert page.get_by_role('button',name='Delete Project').count()==1
   assert page.get_by_text('Browser Memory ↔ Workspace Package').count()==0
   assert page.get_by_role('button',name='Export Workspace Package').count()==0
   assert page.get_by_role('button',name='Load Package as Working Copy').count()==0
   assert page.locator('.melodic-action-toolbar').count()==1
   assert page.get_by_text('Cut Boundaries · All Blocks').count()==1
   assert page.get_by_role('button',name='Add Instrument').count()==1
   assert page.locator('.melodic-card-sound-select').count()==4
   assert page.locator('.melodic-project-inline select').count()==1
   assert page.get_by_role('button',name='Undo',exact=True).count()>=1
   grid=page.locator('.melodic-compact-control-grid')
   boxes=grid.locator(':scope > *').evaluate_all("es=>es.map(e=>({name:e.className.slice(0,60),x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width,r:e.getBoundingClientRect().right}))")
   assert len(boxes)==6,boxes
   print('WIDTH',width,'GRID',boxes)
   for a,c in zip(boxes,boxes[1:]):
    assert a['r']<=c['x']+1, ('overlap',width,a,c)
   sample=page.locator('.melodic-sample-controls')
   project=page.locator('.melodic-project-inline')
   imp=page.locator('.melodic-import-sounds-stack')
   assert sample.bounding_box()['x']<project.bounding_box()['x']<imp.bounding_box()['x']
   # The button row of Presets must be directly below the select within same column.
   assert page.locator('.melodic-project-inline .melodic-project-actions button').count()==3
   selectBox=page.locator('.melodic-project-inline select').bounding_box()
   buttonsBox=page.locator('.melodic-project-actions').bounding_box()
   assert buttonsBox['y'] >= selectBox['y']+selectBox['height']-1
   action=page.locator('.melodic-action-toolbar')
   add=page.get_by_role('button',name='Add Instrument').bounding_box()
   cut=page.get_by_text('Cut Boundaries · All Blocks').bounding_box()
   assert abs(add['y']-cut['y'])<25,(add,cut)
   # Undo directly below Number of Bars in same column
   bars=page.get_by_text('Number of Bars',exact=True).first
   parent=bars.locator('xpath=../..')
   assert parent.get_by_role('button',name='Undo',exact=True).count()==1
   assert parent.get_by_role('button',name='Redo',exact=True).count()==1
   # Count and upload remain reachable
   page.get_by_role('button',name='0 Samples').click()
   assert page.locator('#melodic-sample-database-panel').count()==1
   page.get_by_role('button',name='0 Samples').click()
   page.screenshot(path=str(root/f'P4B_L11_{width}_compact.png'),full_page=False)
   assert not errors, errors
   reports.append({'width':width,'columns':boxes,'javascript_errors':errors,'pass':True})
   page.close()
  # Package Station tooltip claims are checked in the displayed header.
  page=b.new_page()
  page.evaluate("""() => {const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()},configurable:true});Object.defineProperty(window,'sessionStorage',{value:window.localStorage,configurable:true});}""")
  page.set_content(html,wait_until='load',timeout=45000)
  page.get_by_role('button',name='Open Package Station').click()
  load=page.get_by_role('button',name='Load Workspace Package')
  prep=page.get_by_role('button',name='Prepare Workspace Package')
  assert 'browser' in load.get_attribute('title').lower()
  assert 'backup' in prep.get_attribute('title').lower()
  assert load.get_attribute('aria-description') and prep.get_attribute('aria-description')
  reports.append({'package_station_help':True,'pass':True})
 finally: b.close()
(root/'P4B_L11_BROWSER_REPORT.json').write_text(json.dumps(reports,indent=2)+'\n')
print('L11 focused browser checks passed')
