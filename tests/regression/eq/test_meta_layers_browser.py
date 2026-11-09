"""End-to-end visual stacking order for the ordinary and native-behind meta states."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import sys,json
html=Path(sys.argv[1]); output=Path(sys.argv[2]) if len(sys.argv)>2 else None
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1674,'height':896});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.evaluate("""()=>{let s={};Object.defineProperty(window,'localStorage',{configurable:true,get:()=>({getItem:k=>s[k]||null,setItem:(k,v)=>s[k]=v,removeItem:k=>delete s[k]})});Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>({getItem:k=>null,setItem:()=>{}})});} """)
 page.set_content(html.read_text(),wait_until='load',timeout=45000);page.wait_for_timeout(600)
 page.get_by_role('tab',name='🎸 Bass',exact=True).click()
 page.locator('.xen-eq-trigger').click()
 def probe():
  return page.evaluate("""()=>{const fly=document.querySelector('.xen-eq-flyout'),eq=document.querySelector('.xen-eq-trigger'),meta=document.querySelector('.xen-meta-overlay'),popover=document.querySelector('.xen-lane-window-popover');const bb=fly.getBoundingClientRect(); const cx=bb.left+bb.width*.5,cy=bb.top+Math.min(200,bb.height*.5);const at=document.elementFromPoint(cx,cy);return {eqZ:getComputedStyle(eq).zIndex,eqFlyoutZ:getComputedStyle(fly).zIndex,metaZ:meta?getComputedStyle(meta).zIndex:null,metaClass:meta?.className,top:at?.closest('.xen-meta-overlay')?'meta':at?.closest('.xen-eq-flyout')?'eq':at?.className,point:[cx,cy],popupZ:popover?getComputedStyle(popover).zIndex:null}}""")
 r0=probe();assert r0['top']=='eq',r0
 page.locator('.xen-meta-rack').click();page.locator('.xen-meta-overlay').wait_for();r1=probe();assert r1['metaZ']=='170' and r1['top']=='meta',r1
 page.evaluate("""()=>document.querySelector('.xen-meta-overlay').classList.add('is-native-behind')""")
 r2=probe();assert r2['metaZ']=='100' and r2['top']=='meta',r2
 r3=page.evaluate("""()=>{let q=document.createElement('div');q.className='xen-lane-window-popover';q.id='test-native-popover';Object.assign(q.style,{left:'900px',top:'350px',width:'60px',height:'60px'});document.body.append(q);return {z:getComputedStyle(q).zIndex,front:document.elementFromPoint(920,370)===q}}""")
 assert int(r3['z'])>100 and r3['front'],r3
 assert not errs,errs
 print(json.dumps({'eq_front_when_alone':r0,'meta_front_normal':r1,'meta_front_native_mode':r2,'native_lane_front':r3,'errors':errs},indent=2))
 if output:output.write_text(json.dumps({'eq_front_when_alone':r0,'meta_front_normal':r1,'meta_front_native_mode':r2,'native_lane_front':r3,'errors':errs},indent=2))
 browser.close()
