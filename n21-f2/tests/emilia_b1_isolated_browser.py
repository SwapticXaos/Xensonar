from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
html=(root/'XenSonar_EMILIA_B1_RECIPROCAL_MATERIAL.html').read_text()
results=[]
def ok(msg):
 print('PASS',msg,flush=True);results.append(msg)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1512,'height':1050}); page.set_default_timeout(12000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate('''() => {const obj={};const storage={getItem:k=>obj[k]||null,setItem:(k,v)=>obj[k]=String(v),removeItem:k=>delete obj[k],clear:()=>Object.keys(obj).forEach(k=>delete obj[k])};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});}''')
 page.set_content(html,wait_until='load',timeout=30000)
 page.get_by_role('button',name='II. MATERIAL FORGE',exact=True).click()
 page.get_by_role('button',name='SpectralForge').click()
 sel=page.locator('select').filter(has=page.locator('option[value=emilia]'))
 print('select count',sel.count());sel.select_option('emilia')
 panel=page.locator('[data-emilia-synth-lab]'); panel.wait_for()
 assert panel.locator('.emilia-b-node').count()==3
 ok('B1 UI mounts with three nodes')
 selector=panel.get_by_label('Add Emilia node',exact=True)
 selector.select_option('drive')
 assert panel.locator('.emilia-b-node').count()==4
 ok('B1 selection immediately adds a Drive node')
 panel.get_by_role('button',name='Remove node Drive',exact=True).click()
 assert panel.locator('.emilia-b-node').count()==3
 ok('B1 inline × immediately removes a node')
 for role in ['drive','fold','sub','formant']:
  selector.select_option(role)
 assert panel.locator('.emilia-b-node').count()==7
 assert selector.is_disabled()
 ok('Seven-node ceiling disables Add before exceeding playable capacity')
 # Screenshot for visual validation
 (root/'inspection').mkdir(exist_ok=True)
 panel.screenshot(path=str(root/'inspection/emilia-b1-network-panel.png'))
 # remove back to 3
 for role in ['formant','sub','fold','drive']:
  panel.get_by_role('button',name='Remove node '+role.capitalize(),exact=True).last.click()
 assert panel.locator('.emilia-b-node').count()==3
 # Graph changes only at commit (Node itself moves on pointermove)
 node=panel.locator('.emilia-b-node').first
 position=node.get_attribute('transform')
 rect=node.bounding_box();field=panel.locator('svg.emilia-b-field').bounding_box()
 page.mouse.move(rect['x']+rect['width']/2,rect['y']+rect['height']/2);page.mouse.down()
 page.mouse.move(field['x']+field['width']*.72,field['y']+field['height']*.78,steps=8)
 dragged=node.get_attribute('transform')
 page.mouse.up()
 after=node.get_attribute('transform')
 assert after != position,(after,position)
 ok('Pointer drag modifies constellation only on release')
 panel.get_by_role('button',name='↶ Undo').click()
 assert node.get_attribute('transform')==position
 ok('Undo restores original constellation')
 print('PAGE ERRORS:',errors[:5]);assert not errors
 ok('No uncaught JS errors on mounted React UI')
 b.close()
print(json.dumps({'checks':results},indent=2))
