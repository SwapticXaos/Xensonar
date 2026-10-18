from playwright.sync_api import sync_playwright
from pathlib import Path
import json
source=(Path(__file__).resolve().parent.parent / 'XenSonar_F448_S1_P4C2_N14_Full_Grid_Pulse_Slot_Hints_Test.html').read_text(encoding='utf8')
seed="""for(let i=0;i<5;i++)__XenQuick.add({kind:'grid',id:'test-grid-'+i,name:'Fretboard '+(i+1)});
for(let i=0;i<4;i++)__XenQuick.add({kind:'material',id:'test-material-'+i,name:'Material Track '+(i+1)});
window.__n14TestPulse=()=>__XenQuick.signal();
"""
assert source.count('function __useQuickAdapter')==1
source=source.replace('function __useQuickAdapter',seed+'function __useQuickAdapter',1)
mock_storage="""<script>for(const name of ['localStorage','sessionStorage']) {const store=new Map();Object.defineProperty(window,name,{configurable:true,value:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear(),key:i=>Array.from(store.keys())[i]??null,get length(){return store.size}}});} if(!crypto.randomUUID){crypto.randomUUID=()=>String(Math.random()).slice(2)+'-'+Date.now()}</script><script type="module" crossorigin>"""
source=source.replace('<script type="module" crossorigin>',mock_storage,1)

with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
 for w,h in ((1740,1000),(1740,780),(1350,1000)):
  page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  try:
   page.set_content(source,wait_until='domcontentloaded',timeout=120000)
   page.locator('.xen-quick-collection .xen-quick-grid').wait_for(timeout=30000)
   page.wait_for_timeout(500)
   if w==1740 and h==780:
    print('keyboard and marker before', page.evaluate("() => ({pan:document.querySelector('.xen-performance [aria-label=\"Keyboard\"] .xen-performance-pan')?.getBoundingClientRect().bottom,marker:document.querySelector('[aria-label=\"Place a marker in the recording\"]')?.getBoundingClientRect().width})"))
    page.evaluate("() => {const pan=document.querySelector('.xen-performance [aria-label=\"Keyboard\"] .xen-performance-pan');pan.style.transform='translateY(300px)';window.dispatchEvent(new Event('resize'))}")
    page.wait_for_timeout(600)
   print('DOM ready',w,h,'tiles',page.locator('.xen-quick-tile').count(),'errors',errors[:5])
   page.evaluate('window.__n14TestPulse()')
   page.locator('.xen-quick-collection>.xen-quick-signal').wait_for(timeout=5000)
   data=page.evaluate('''() => {const e=document.querySelector('.xen-quick-collection'), s=e?.querySelector(':scope>.xen-quick-signal'),d=document.querySelector('.xen-quick-dock'),a=Array.from(e.querySelectorAll('.xen-quick-tile')),r=(x)=>{let z=x.getBoundingClientRect();return {y:z.y,height:z.height,bottom:z.bottom}};return {tileCount:a.length,firstTile:r(a[0]),lastRow:r(a[4]),menu:r(e),signal:r(s),migrated:d.classList.contains('is-migrated'),signalColor:getComputedStyle(s).backgroundColor,iterations:getComputedStyle(s).animationIterationCount,duration:getComputedStyle(s).animationDuration,animation:getComputedStyle(s).animationName};}''')
   print('DATA',w,h,json.dumps(data,ensure_ascii=False))
   assert data['tileCount']==9
   assert abs(data['signal']['height']-data['menu']['height'])<=2.1
   assert data['signal']['y']<=data['firstTile']['y']+1
   assert data['signal']['bottom']>=data['lastRow']['bottom']-1
   assert data['signalColor']=='rgb(25, 210, 107)'
   assert data['iterations']=='2' and data['duration']=='1.15s'
   if w==1740 and h==780:
    assert data['migrated'],'Tall quick grid must migrate to available right-side marker space'
    assert page.locator('.xen-quick-dock>.xen-quick-signal').count()==1,'Left landing target must still pulse after migration'
   handle=page.locator('.xen-quick-collection>.xen-quick-signal').element_handle()
   page.evaluate('window.__n14TestPulse()')
   assert not handle.evaluate('(el)=>el.isConnected'), 'Second pulse must remount animation'
   # Optional manual screenshot: uncomment when reviewing the cue visually.
   # page.screenshot(path=str(Path(__file__).resolve().parent.parent / f'results/n14_isolated_{w}_{h}.png'),timeout=30000)
  finally:
   page.close()
 b.close()
