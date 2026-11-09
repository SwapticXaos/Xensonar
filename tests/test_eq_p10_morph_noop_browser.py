"""True browser regression: inert EQ morph press must not enter fast-preview DSP;
actual slider changes retain live morph + restoration after release.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re, sys, time
from p9_shared_hook import hook
ROOT=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'dist/XenSonar_Standalone.html'
html=source.read_text()
rx=r'(<script type="module" crossorigin>)([\s\S]*?)(</script>)'
assert len(re.findall(rx,html))==1
probe='''
window.__p10={...window.__p8, status(){const c=__XenEQ.get(this.key),diag=__XenEQ.diagnostics();const p=__XenEQ.peekPlan(c,48000,this.key);return{morph:c.morph,hot:diag.morphHotKeys,version:diag.version,fitQueued:diag.fitQueued,filterSignature:p.filters.map(f=>[f.frequency,f.q,f.gain]),provisional:p.provisional||false}}};
'''
html=re.sub(rx,lambda m:m.group(1)+m.group(2)+'\n'+hook.replace('morph:0}', 'morph:0.5}')+'\n'+probe+m.group(3),html,count=1)
errors=[];results={}
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1450,'height':1100})
 page.on('pageerror',lambda err:errors.append(str(err)))
 page.evaluate('''()=>{const values=new Map();const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};Object.defineProperty(window,'localStorage',{configurable:true,value:storage});Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage})}''')
 page.set_content(html,wait_until='domcontentloaded',timeout=100000)
 page.wait_for_function('window.__p10!==undefined',timeout=20000)
 page.evaluate('window.__p10.mount()')
 slider=page.get_by_role('slider',name='EQ A B Morph');slider.wait_for(timeout=16000)
 page.wait_for_timeout(1600)
 before=page.evaluate('window.__p10.status()')
 # Hit the native thumb at current value (0), not an empty portion of the slider.
 box=slider.bounding_box();assert box, 'slider absent'
 x=box['x']+box['width']/2;y=box['y']+box['height']/2
 page.mouse.move(x,y);page.mouse.down();page.wait_for_timeout(150)
 during=page.evaluate('window.__p10.status()')
 assert during['morph']==before['morph'],'pointerdown changed morph scalar'
 assert during['hot']==0,'pointerdown without change must NOT invalidate resolved fit or use provisional morph DSP'
 assert during['version']==before['version'],'pointerdown without change altered canonical EQ state'
 page.mouse.up();page.wait_for_timeout(170)
 after=page.evaluate('window.__p10.status()')
 assert after['version']==before['version'],'pointerup without change must not submit EQ mutations'
 assert after['morph']==before['morph'],'pointerup without change altered morph scalar'
 results['no_op_pointer']={'version':before['version'],'hot':during['hot'],'unchanged':True}
 # Keyboard control must still change the DSP and settle back to ordinary mode.
 slider.focus();slider.press('ArrowRight');page.wait_for_timeout(200)
 changed=page.evaluate('window.__p10.status()')
 assert abs(changed['morph']-before['morph'])>1e-7,('actual keyboard morph did not update scalar',before,changed,slider.input_value())
 slider.press('ArrowRight');page.wait_for_timeout(180)
 assert page.evaluate('window.__p10.status().hot')==0,'key release did not settle morph gesture'
 results['real_change']={'before':before['morph'],'after':changed['morph']}
 # A real held pointer drag still uses the fast path for actual changes only.
 position=slider.bounding_box();center_x=position['x']+position['width']/2
 current_morph=page.evaluate('window.__p10.status().morph')
 thumb_y=position['y']+position['height']*(1-current_morph)
 page.mouse.move(center_x,thumb_y);page.mouse.down()
 page.mouse.move(center_x,thumb_y-position['height']*.17,steps=8)
 page.wait_for_timeout(110)
 dragging=page.evaluate('window.__p10.status()')
 assert abs(dragging['morph']-current_morph)>.015,('pointer drag did not update actual morph value',dragging,current_morph)
 assert dragging['hot']==1,'actual held morph gesture must use fast DSP path'
 page.mouse.up();page.wait_for_timeout(110)
 assert page.evaluate('window.__p10.status().hot')==0,'pointer release must end fast morph path'
 results['pointer_drag']={'before':current_morph,'during':dragging['morph'],'hotDuring':dragging['hot'],'settled':True}
 assert not errors,errors
 (ROOT/'dist/P10_morph_noop_browser.json').write_text(json.dumps({'status':'GREEN','results':results,'errors':errors},indent=2))
 print('PASS P10 real morph no-op and keyboard change:',results)
 browser.close()
