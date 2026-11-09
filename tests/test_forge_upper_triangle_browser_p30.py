"""P30 two-layer UPPER / UP triangle isolated browser geometry and scroll contract."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
out=Path('/mnt/data')
# Reuse the established, previously passing and exact-width export-cross fixture.
prior=(ROOT/'tests/test_forge_cross_geometry_browser.py').read_text()
prelude=prior.split('with sync_playwright() as p:')[0]
namespace={'__file__':str(ROOT/'tests/test_forge_cross_geometry_browser.py')}
exec(prelude,namespace)
html=namespace['source']
html=html.replace('<button class="xen-forge-up-triangle">',
 '''<button class="xen-forge-upper-triangle" type="button" aria-label="Scroll to very top"><span class="xen-forge-upper-double-chevron">⇈</span><span class="xen-forge-upper-label">UPPER</span></button><button class="xen-forge-up-triangle" aria-label="Scroll to Synth Lab" type="button">''')
assert 'xen-forge-upper-triangle' in html
# Bind the REAL P30 upper scroll helper for a synthetic button click, plus a
# stand-in for the UNCHANGED UP action, verified unmodified in the static test.
lab=(ROOT/'src/rooms/lab.js').read_text();a=lab.index('function __forgeScrollCompletelyUp(target){');b=lab.index('\n}',a)+2
helper=lab[a:b]
html=html.replace('</body>', '<div style="height:2000px" id="scroll-fixture">SCROLL FIXTURE</div></body>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for w in (1360,1290,1180,980,600,375):
  page=browser.new_page(viewport={'width':w,'height':470},device_scale_factor=1,reduced_motion='reduce')
  page.set_content(html)
  geo=page.evaluate('''()=>{let b=q=>{let r=document.querySelector(q).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
    return {rack:b('.xen-forge-action-rack'),name:b('.name-probe'),raw:b('.xen-forge-tile-material'),outer:b('.xen-forge-upper-triangle'),inner:b('.xen-forge-up-triangle'),top:b('.xen-forge-action-row-primary'),bottom:b('.xen-forge-action-row-secondary'),upperVisible:getComputedStyle(document.querySelector('.xen-forge-upper-triangle')).display!=='none'}; }''')
  assert abs(geo['rack']['h']-168)<.5,(w,geo)
  assert abs(geo['name']['y']-geo['rack']['bottom']-8)<.5,(w,'NAME moved',geo)
  if geo['upperVisible']:
   assert abs(geo['inner']['w']-80)<.5 and abs(geo['inner']['h']-80)<.5,(w,geo)
   assert abs(geo['outer']['w']-168)<.5 and abs(geo['outer']['h']-168)<.5,(w,geo)
   assert abs(geo['outer']['right']-geo['inner']['right'])<.5,(w,geo)
   assert abs(geo['outer']['bottom']-geo['inner']['bottom'])<.5,(w,geo)
  assert abs(geo['top']['h']-80)<.5 and abs(geo['bottom']['h']-80)<.5,(w,geo)
  assert geo['upperVisible']==(w>1263),(w,geo)
  if w>1263:
   assert geo['outer']['right']-80>=geo['raw']['right']-1,(w,'UPPER visible triangle overlaps material-track button',geo)
  print('UPPER geometry',w,'outer',geo['outer'],'inner',geo['inner'],'visible',geo['upperVisible'],'rack',geo['rack']['h'])
  if w==1360:
   page.screenshot(path=str(out/'XenSonar_P30_UPPER_Two_Layer_Triangle_1360.png'),full_page=False)
   page.evaluate('()=>{'+helper+";document.querySelector('.xen-forge-upper-triangle').addEventListener('click',e=>__forgeScrollCompletelyUp(e.currentTarget));}")
   page.evaluate('window.scrollTo(0,800)')
   assert page.evaluate('window.scrollY')>=700
   page.evaluate("document.querySelector('.xen-forge-upper-triangle').click()")
   page.wait_for_timeout(120)
   assert page.evaluate('window.scrollY')==0,'UPPER did not scroll all the way up'
   # Independent existing UP control (not taken over by the new UPPER button).
   page.evaluate('''()=>{window.__upHits=0;document.querySelector('.xen-forge-up-triangle').addEventListener('click',()=>window.__upHits++);}''')
   page.evaluate("document.querySelector('.xen-forge-up-triangle').click()")
   assert page.evaluate('window.__upHits')==1,'UP click was swallowed by UPPER layer'
  page.close()
 browser.close()
print('P30 UPPER BROWSER PASS: nested concentric triangles, export rack & NAME height unchanged, independent clicks and full-page scroll')
