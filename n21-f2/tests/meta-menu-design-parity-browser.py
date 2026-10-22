import os
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
source=(root/'src/mix/03_meta_menu.js').read_text()
css=(root/'styles/27_meta_menu.css').read_text()
start=source.index('function __xenMetaDropTarget(')
end=source.index('function __XenMetaRack()',start)
helper=source[start:end]
body='''<div class="xen-meta-overlay" data-xen-header-menu="meta" style="position:static;padding:0;background:transparent"><div class="xen-meta-editor" style="width:1100px;max-height:none"><section class="xen-meta-constellation"><div class="xen-meta-board" style="width:1060px;height:340px">'''
for kind in ['grid','material','rootFollow','drum','bass']:
 body+=f'<div class="xen-meta-lane" data-xen-meta-column="{kind}"><header style="height:35px">{kind}</header><div class="xen-meta-lane-items" style="min-height:160px">'
 if kind=='grid':
  for code in ['a','b','c']:
   body+=f'<button class="xen-meta-tile" data-xen-meta-item="true" data-xen-quick-kind="grid" data-xen-quick-id="{code}" style="height:38px">{code}</button>'
 body+='</div></div>'
body+='</div></section></div></div>'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('XEN_CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1330,'height':850})
 page.set_content('<html><head><style>'+css+'</style></head><body>'+body+'</body></html>')
 page.add_script_tag(content=helper)
 def geom(sel):return page.locator(sel).first.bounding_box()
 board=geom('.xen-meta-board')
 r1=geom('[data-xen-meta-column="grid"] [data-xen-quick-id="a"]')
 r2=geom('[data-xen-meta-column="grid"] [data-xen-quick-id="b"]')
 bass=geom('[data-xen-meta-column="bass"]')
 for y,expect in [(r1['y']+2,'a'),(r2['y']+2,'b'),(r2['y']+r2['height']*.8,'c'),(r2['y']+r2['height']+70,None)]:
  out=page.evaluate('''([x,y])=>{const source=document.createElement('div');const target=__xenMetaDropTarget({clientX:x,clientY:y},{entry:{kind:'grid',id:'incoming'},source});__xenMetaRenderDropMarker(target);const mark=document.querySelector('.xen-meta-insertion-line');return {beforeId:target?.beforeId||null,marker:!!mark,markerHeight:mark?.getBoundingClientRect().height,markerCount:document.querySelectorAll('.xen-meta-insertion-line').length};}''',[bass['x']+20,y])
  assert out['beforeId']==expect,(expect,out)
  assert out['marker'] and out['markerCount']==1 and abs(out['markerHeight']-3)<.1,out
  print('PASS browser pointer y',round(y,1),'→ before',repr(expect),'one 3px insertion marker')
 old=page.locator('[data-xen-meta-column="grid"] [data-xen-quick-id="b"]')
 ry=old.bounding_box();src=page.evaluate_handle('document.querySelector(\'[data-xen-meta-column="grid"] [data-xen-quick-id="b"]\')')
 result=page.evaluate('''([x,y,el])=>{const target=__xenMetaDropTarget({clientX:x,clientY:y},{entry:{kind:'grid',id:'b'},source:el});return target?.beforeId??null;}''',[r1['x']+15,r1['y']+6,src])
 assert result=='a',result
 page.evaluate('__xenMetaRenderDropMarker(null)')
 assert page.locator('.xen-meta-insertion-line').count()==0
 print('PASS self-reorder ignores original source; marker removes after drop')
 browser.close()
