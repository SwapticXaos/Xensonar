from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
css=(ROOT/'styles/areas/028_inline-028.css').read_text()
source=(ROOT/'src/rooms/lab.js').read_text()
s=source.index('function __forgePositionCarrierFilterPanel(details){')
e=source.index('function FractaliaMaterialImage(',s)
function=source[s:e]
markup='''<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#080b11;color:#e3efe8;font-family:Arial,sans-serif}
.sim{padding:14px;display:flex;gap:10px;align-items:flex-start}
.f35-navigator-save-slot{position:relative!important;right:auto!important;bottom:auto!important;width:131px;margin-left:200px;height:25px}
.example-field{display:flex;gap:8px;align-items:center;height:25px}
.xen-forge-draw-header{width:410px;height:48px;margin-top:26px;background:#10151f;border-top:1px solid #2593ab;border-right:1px solid #22849f}
.filter-host{position:relative;width:500px;min-height:90px;overflow:hidden;background:#181329;margin-top:90px}
.xen-carrier-actions{display:flex;gap:0;align-items:flex-start}
.xen-carrier-filter-panel>label{display:grid;gap:2px}
.xen-carrier-filter-footer{grid-column:1/-1}
</style><style>'''+css+'''</style></head><body>
<div class="sim">
<div class="f35-navigator-save-slot" id="slot">
<label class="f35-navigator-sample-caption f33-project-name-text" for="name"><span class="f35-navigator-name-glyph">NAME:</span></label>
<input id="name" class="f35-navigator-sample-name" type="text" value="My Sample" />
</div>
</div>
<div class="xen-forge-draw-header" id="header"><button class="xen-forge-down-corner" aria-label="scroll down"></button></div>
<div class="filter-host"><div class="xen-carrier-actions"><details class="xen-carrier-filter" open><summary><span class="xen-carrier-filter-text">Filter</span><span class="xen-carrier-filter-chevron">⌄</span></summary>
<fieldset class="xen-carrier-filter-panel"><label>Maximum simultaneous notes<input type="range"><output>4</output></label><label>Noise threshold<input type="range"><output>-46dB</output></label><label>Detection strictness<input type="range"><output>50%</output></label><label>Minimum note length<input type="range"><output>90ms</output></label><div class="xen-carrier-filter-footer"><label class="xen-carrier-range">Pitch range<select><option>Voice / guitar · 65–1600 Hz</option></select></label><span class="xen-carrier-filter-help">Higher strictness suppresses uncertain notes. Lower the noise threshold for quiet voices. Dense chords and octave doublings may remain ambiguous.</span></div></fieldset>
</details></div></div>
</body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1280,650,375):
  page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
  page.set_content(markup)
  page.add_script_tag(content=function)
  page.evaluate('''()=>__forgePositionCarrierFilterPanel(document.querySelector('details'))''')
  result=page.evaluate('''()=>{
   const get=sel=>{const el=document.querySelector(sel),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,background:s.backgroundImage,z:s.zIndex,font:s.fontSize,transform:s.transform}};
   const glyph=document.querySelector('.f35-navigator-name-glyph'),cv=document.createElement('canvas'),ctx=cv.getContext('2d');ctx.font=getComputedStyle(glyph).font;const m=ctx.measureText(glyph.textContent);
   return {name:get('#name'),label:get('.f35-navigator-sample-caption'),glyph:get('.f35-navigator-name-glyph'),ink:{ascent:m.actualBoundingBoxAscent,descent:m.actualBoundingBoxDescent,width:m.width},panel:get('.xen-carrier-filter-panel'),trigger:get('.xen-carrier-filter summary'),footer:get('.xen-carrier-filter-footer'),range:get('.xen-carrier-range'),help:get('.xen-carrier-filter-help'),corner:get('.xen-forge-down-corner'),before:getComputedStyle(document.querySelector('.xen-forge-down-corner'),'::before').backgroundImage,host:get('.filter-host')};
   }''')
  assert result['name']['h']==25 and result['label']['h']==25
  assert result['panel']['y']>=result['trigger']['bottom']
  assert result['host']['h']==90 or result['host']['h']<100, 'Filter must not push its row down'
  if width>380:assert result['help']['x']>result['range']['x']+result['range']['w']-1,'explanatory text must sit beside pitch range'
  print(width,json.dumps(result,ensure_ascii=False))
  if width==1280:page.screenshot(path='/mnt/data/Forge_R6_Geometrie_Desktop_Intern.png')
  page.close()
 browser.close()
