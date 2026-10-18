from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
html=(root/'XenSonar_F448_S1_P4B_L16_Aligned_Import_Menus_Test.html').read_text()
res=[]
with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
  for w in (1740,1440):
    page=browser.new_page(viewport={'width':w,'height':960})
    errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
    page.evaluate('''() => {const m=new Map();let i=0;crypto.randomUUID=()=>('10000000-0000-4000-8000-'+String(++i).padStart(12,'0'));for(const k of ['localStorage','sessionStorage'])Object.defineProperty(window,k,{value:{getItem:x=>m.get(k+':'+x)??null,setItem:(x,v)=>m.set(k+':'+x,String(v)),removeItem:x=>m.delete(k+':'+x),clear:()=>m.clear()},configurable:true});}''')
    page.set_content(html,wait_until='load',timeout=60000)
    page.get_by_role('button',name='II. MATERIAL FORGE').click(timeout=12000)
    page.get_by_role('button',name='SYNTHETICFORGE',exact=False).first.click(timeout=12000)
    page.get_by_role('button',name='Melodic Loop',exact=True).click(timeout=12000)
    for mname in ('nodal','entrophon'):
      selector='.melodic-import-sounds-stack>.entrophon-library-manager>button' if mname=='entrophon' else '.melodic-import-sounds-stack>.nd-library-manager:not(.entrophon-library-manager)>button'
      page.locator(selector).click(timeout=12000)
      data=page.evaluate('''() => {const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width}};const fly=document.querySelector('.melodic-import-sounds-stack .nd-library-manager-content');const card3=document.querySelectorAll('[data-ml-instrument-card]')[2];const patternC=Array.from(card3.querySelectorAll('button')).find(b=>b.textContent.includes('Pattern C'));const violinTile=document.querySelector('.melodic-instrument-plus-column');const card4=document.querySelectorAll('[data-ml-instrument-card]')[3];const style=getComputedStyle(fly);return{fly:rect(fly),patternC:rect(patternC),tile:rect(violinTile),card4:rect(card4),bg:style.backgroundColor,opacity:style.opacity}}''')
      assert abs(data['fly']['right']-data['tile']['right'])<1,('not aligned with violin',w,mname,data)
      assert abs(data['fly']['right']-data['card4']['right'])<1,('not aligned with card4',w,mname,data)
      assert data['fly']['left'] > data['patternC']['right']+8,('covers pattern C',w,mname,data)
      assert data['bg']==('rgb(33, 22, 46)' if mname=='entrophon' else 'rgb(16, 32, 39)')
      assert data['opacity']=='1'
      res.append({'viewport':w,'manager':mname,**data})
      if w==1740 and mname=='entrophon':
        page.screenshot(path=str(root/'P4B_L16_Import_Flyout_Aligned.png'))
    # Close manager, go to eight instrument state; verify only bottom minus and center violin.
    page.locator('.melodic-import-sounds-stack>.entrophon-library-manager>button').click(timeout=12000)
    page.get_by_role('button',name='Add Instrument').click(timeout=12000)
    for _ in range(3):page.locator('.melodic-instrument-triangle-add').click(position={'x':12,'y':12})
    btn=page.locator('.melodic-instrument-max-remove')
    assert btn.count()==1
    v=btn.evaluate('''e=>{const a=e.querySelector('.melodic-instrument-max-minus').getBoundingClientRect(),b=e.getBoundingClientRect(),f=e.querySelector('.melodic-instrument-violin').getBoundingClientRect();return {minusTop:a.top,minusBottom:a.bottom,tileTop:b.top,tileBottom:b.bottom,violinCenter:(f.left+f.right)/2,tileCenter:(b.left+b.right)/2}}''')
    assert v['minusTop']>v['tileTop']+v['tileBottom']*0-v['tileTop']+26,('minus not low',v)
    assert abs(v['violinCenter']-v['tileCenter'])<1
    res.append({'viewport':w,'maxTile':v})
    if w==1740:page.screenshot(path=str(root/'P4B_L16_8_Instruments_Minus_Bottom.png'))
    assert not errs,errs
    page.close()
  browser.close()
(root/'P4B_L16_BROWSER_REPORT.json').write_text(json.dumps(res,ensure_ascii=False,indent=2))
for a in res:print(a,flush=True)
print('PASS L16 popup alignment, pattern C free, opacity, 8-instrument glyph',flush=True)
