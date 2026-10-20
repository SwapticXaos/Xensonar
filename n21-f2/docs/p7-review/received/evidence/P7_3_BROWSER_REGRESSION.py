from pathlib import Path
from playwright.sync_api import sync_playwright
f=Path('/mnt/data/P7_3_FORGE_NAV/n21-f2/XenSonar_Codex_Handoff_Through_10.html')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':1540,'height':1040})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("""(()=>{let store=new Map;for(const target of ['localStorage','sessionStorage'])Object.defineProperty(window,target,{configurable:true,value:{getItem:k=>store.get(target+k)||null,setItem:(k,v)=>store.set(target+k,String(v)),removeItem:k=>store.delete(target+k),clear:()=>store.clear(),key:i=>[...store.keys()][i]||null,get length(){return store.size}}})})()""")
 page.goto('about:blank');page.set_content(f.read_text().replace('const __ForgeNavigatorSample=(()=>{','window.__forgeNavigatorTestHandle=()=>__ForgeNavigatorSample;const __ForgeNavigatorSample=(()=>{'),wait_until='domcontentloaded',timeout=60000)
 page.wait_for_timeout(400)
 page.get_by_role('button',name='II. MATERIAL FORGE').click()
 page.get_by_role('button',name='SPECTRALFORGE',exact=False).click()
 nav=page.locator('[data-forge-navigator]');nav.wait_for(timeout=10000)
 box=nav.bounding_box();print('NAV BOX',box)
 assert box and box['width']>200
 y=box['y']+box['height']/2
 def x(frac):return box['x']+box['width']*frac
 page.mouse.move(x(.27),y);page.mouse.down();page.mouse.move(x(.68),y,steps=5);page.mouse.up()
 s=page.locator('[data-forge-navigator-sample-selection]');s.wait_for(timeout=15000)
 before=s.evaluate('(e)=>({left:parseFloat(e.style.left),width:parseFloat(e.style.width)})')
 print('BEFORE',before)
 assert abs(before['left']-27)<2 and abs(before['width']-41)<3,before
 page.mouse.move(x(.27),y);print('CURSOR LEFT',nav.evaluate('(e)=>e.style.cursor'))
 assert nav.evaluate('(e)=>e.style.cursor')=='ew-resize'
 page.mouse.down();page.mouse.move(x(.16),y,steps=5);page.mouse.up()
 after=s.evaluate('(e)=>({left:parseFloat(e.style.left),width:parseFloat(e.style.width)})')
 print('AFTER LEFT',after)
 assert after['left']<before['left']-6 and after['width']>before['width']+6
 # Right handle closer to end of selection.
 page.mouse.move(x(.68),y);assert nav.evaluate('(e)=>e.style.cursor')=='ew-resize'
 page.mouse.down();page.mouse.move(x(.84),y,steps=5);page.mouse.up()
 right=s.evaluate('(e)=>({left:parseFloat(e.style.left),width:parseFloat(e.style.width)})')
 print('AFTER RIGHT',right)
 assert abs(right['left']-after['left'])<1 and right['width']>after['width']+10
 assert page.locator('[data-forge-navigator-save-sample]').count()==1
 assert page.locator('[data-forge-navigator-preview]').count()==1
 inp=page.locator('[data-forge-navigator-sample-name]');assert inp.count()==1
 inp.scroll_into_view_if_needed()
 ib=inp.bounding_box(); pb=page.locator('[data-forge-navigator-preview]').bounding_box(); sb=page.locator('[data-forge-navigator-save-sample]').bounding_box()
 print('NAME/PREVIEW/SAVE',ib,pb,sb)
 label=page.get_by_text('Sample Name:',exact=True);assert label.count()==1
 lb=label.bounding_box();print('SAMPLE LABEL',lb)
 assert lb and lb['x']+lb['width']<=ib['x']-1 and abs(lb['y']+lb['height']/2-(ib['y']+ib['height']/2))<2,(lb,ib)
 proj=page.get_by_text('Project Name:',exact=True);print('PROJECT NAME',proj.bounding_box())
 assert abs(ib['width']-sb['width'])<1 and abs(ib['height']-sb['height'])<1,(ib,sb)
 assert ib['x']+ib['width']<pb['x'] and pb['x']+pb['width']<sb['x'],(ib,pb,sb)
 # Changing the name must not reposition either button.
 inp.fill('Dark Sub Navigator Cut')
 pb2=page.locator('[data-forge-navigator-preview]').bounding_box();sb2=page.locator('[data-forge-navigator-save-sample]').bounding_box()
 assert abs(pb2['x']-pb['x'])<1 and abs(sb2['x']-sb['x'])<1
 assert inp.input_value()=='Dark Sub Navigator Cut'
 page.locator('[data-forge-navigator-save-slot]').screenshot(path='/mnt/data/P7_3_FORGE_NAV/navigator_named_action_p73.png')
 # CSS sweep tied to preview state (audio rendering requires actual audible input).
 page.evaluate('''() => { window.__forgeNavigatorTestHandle().update({previewing:true,previewDurationSec:.85}); }''')
 playhead=page.locator('[data-forge-navigator-region-playhead]');playhead.wait_for()
 css=playhead.evaluate('(e)=>({duration:getComputedStyle(e).animationDuration,animation:getComputedStyle(e).animationName})')
 print('PLAYHEAD',css)
 assert 'forge-navigator-region-sweep' in css['animation'] and '0.85s' in css['duration'],css
 page.wait_for_timeout(240)
 transform=playhead.evaluate('(e)=>getComputedStyle(e).transform');print('TRANSFORM',transform)
 assert transform!='none'
 page.screenshot(path='/mnt/data/P7_3_FORGE_NAV/forge_navigator_named_p73.png',full_page=False)
 assert not errors, errors[:5]
 print('PASS: Forge sample-edge resize, independent save+preview UI, violet timed playhead, browser no exceptions')
 b.close()
