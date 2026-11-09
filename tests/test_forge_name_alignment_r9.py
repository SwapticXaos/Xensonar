"""Render both name fields; test visible uppercase ink, not just CSS bounding boxes."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re, io
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
CSS='\n'.join((ROOT/f).read_text() for f in ['styles/areas/028_inline-028.css','styles/areas/040_xen-p9-m9-cockpit-canonical.css'])
HTML='''<!doctype html><html><head><meta charset="utf-8"><style>
body{background:#070610;color:#eee;font-family:Arial;margin:0}*{box-sizing:border-box}
.stage{height:120px;position:relative;padding-top:42px}
.f35-navigator-save-slot{position:absolute;left:245px!important;right:auto!important;top:55px!important;bottom:auto!important;width:62px;height:25px}
.stage .f35-navigator-sample-caption{background:transparent}
.lower{margin:14px;width:1000px}.xen-forge-name-rack{background:#100d19;border:1px solid #531a79}
.xen-forge-name-input{height:38px!important;background:#090b0f;color:#e6f5f0}
.xen-forge-name-heading{height:15px}.xen-forge-name-help{height:15px;white-space:nowrap}
.xen-forge-inline-metadata{height:55px}
</style><style>'''+CSS+'''</style></head><body>
<div class="stage"><div class="f35-navigator-save-slot"><label class="f35-navigator-sample-caption f33-project-name-text" for="upper-name"><span class="f35-navigator-name-glyph">NAME</span><span class="f35-navigator-name-colon">:</span></label><input id="upper-name" class="f35-navigator-sample-name" value="xensonar" style="height:25px;"/><button aria-label="Play" style="height:25px">Play</button></div></div>
<div class="lower"><div class="xen-forge-name-rack"><span class="xen-forge-name-word">NAME</span><span class="xen-forge-name-colon">:</span><span class="xen-forge-name-heading">LOOP/SAMPLE</span><input id="lower-name" class="xen-forge-name-input" value="xensonar"/><span class="xen-forge-name-help">This title will be used in Material Track.</span><div class="xen-forge-inline-metadata">Number of Bars | Number of Segments | Frequency Anchor</div></div></div></body></html>'''
def ink_bbox(image,box):
 x0,y0,x1,y1=map(round,box)
 points=[]
 for y in range(max(0,y0-12),min(image.height,y1+12)):
  for x in range(max(0,x0-6),min(image.width,x1+7)):
   r,g,b=image.getpixel((x,y))[:3]
   if 150<=r<=250 and g>=219 and b>=195 and g>r+4 and g>b-2:
    points.append((x,y))
 if not points:raise AssertionError('No mint NAME ink pixels')
 return {'left':min(x for x,y in points),'right':max(x for x,y in points)+1,'top':min(y for x,y in points),'bottom':max(y for x,y in points)+1}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in (1280,1020):
  page=b.new_page(viewport={'width':width,'height':430},device_scale_factor=1)
  page.set_content(HTML)
  dat=page.evaluate('''()=>{let q=s=>{const r=document.querySelector(s).getBoundingClientRect();const cs=getComputedStyle(document.querySelector(s));return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,font:cs.font,transform:cs.transform}};return {upperField:q('#upper-name'),upperWord:q('.f35-navigator-name-glyph'),upperColon:q('.f35-navigator-name-colon'),lowerField:q('#lower-name'),lowerWord:q('.xen-forge-name-word'),lowerColon:q('.xen-forge-name-colon'),lowerCard:q('.xen-forge-name-rack')}}''')
  pic=Image.open(io.BytesIO(page.screenshot())).convert('RGB')
  word=dat['upperWord']; ink=ink_bbox(pic,(word['x'],word['y'],word['right'],word['bottom']))
  field=dat['upperField'];err_top=ink['top']-round(field['y']);err_bottom=ink['bottom']-round(field['bottom'])
  lower=dat['lowerWord'];lowerink=ink_bbox(pic,(lower['x'],lower['y'],dat['lowerColon']['x']-10,lower['bottom']))
  gap=dat['lowerColon']['x']-lowerink['right']
  print('R9 NAME geometry',width,json.dumps({'upperErrorTop':err_top,'upperErrorBottom':err_bottom,'upperInk':ink,'field':field,'lowerInk':lowerink,'lowerColon':dat['lowerColon'],'lowerGap':gap,'lowerCardHeight':dat['lowerCard']['h'],'wordBox':dat['lowerWord']},ensure_ascii=False))
  assert abs(err_top)<=2 and abs(err_bottom)<=2, f'Upper NAME must be flush with BOTH borders of input: {err_top}/{err_bottom}'
  assert 1<=gap<=11, f'Lower NAME too distant from small colon: {gap:.1f}px'
  assert dat['upperColon']['h']<=27,'Upper small colon must not enlarge or distort'
  assert dat['lowerColon']['h']<=26,'Lower small colon must remain unchanged'
  assert dat['lowerCard']['h']<=106, 'Lower card must not expand vertically'
  if width==1280: page.screenshot(path=str(ROOT/'docs/R12_R9_VISUAL_TEST.png'))
  page.close()
 b.close()
print('PASS: upper NAME flush to input; lower GIMP spacing and unchanged geometry')
