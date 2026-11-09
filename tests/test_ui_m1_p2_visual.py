"""Chromium CSS geometry regression: only source styles, no synthetic rescaling of PLAY."""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
s1=(root/'styles/areas/028_inline-028.css').read_text()
s2=(root/'styles/areas/040_xen-p9-m9-cockpit-canonical.css').read_text()
fixture=f'''<!doctype html><html><head><meta charset="utf-8"><style>*{{box-sizing:border-box}}body{{margin:0;background:#070b0e;color:#d8f6e8;font:12px Arial}}.unit{{padding:20px}}.xen-forge-draw-header{{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #334347;min-height:48px;padding:0 12px}}.mock-sample{{margin:22px 0 10px 250px;position:relative;width:210px;height:34px}}.xen-forge-name-rack{{margin:28px 10px}}.mock-giant{{height:80px}}.xen-forge-name-input{{height:38px}}.f35-navigator-sample-name{{height:25px}}
</style><style>{s1}\n{s2}</style></head><body><div class="unit"><div class="xen-forge-draw-header"><button class="xen-forge-draw-play" data-forge-draw-play><span class="xen-forge-draw-play-word">PLAY</span></button><span style="font-size:12px;color:#849e99">CANVAS · CARRIER</span></div><div class="mock-sample f35-navigator-save-slot"><label class="f35-navigator-sample-caption f33-project-name-text"><span class="f35-navigator-name-glyph">NAME</span><span class="f35-navigator-name-colon">:</span></label><input class="f35-navigator-sample-name" value="Sample"></div><div class="mock-giant" style="display:flex;align-items:center;gap:15px"><div class="xen-forge-giant-play"><span class="xen-forge-giant-play-wrap"><span class="xen-forge-giant-play-ghost">Preview Loop</span><span class="xen-forge-giant-play-legend">PLAY</span></span></div></div><div class="xen-forge-name-rack"><span class="xen-forge-name-word">NAME</span><span class="xen-forge-name-colon">:</span><span class="xen-forge-name-heading">LOOP / SAMPLE</span><input class="xen-forge-name-input" value="Sample"><span class="xen-forge-name-help">Send as Pink Track</span></div></div></body></html>'''
with sync_playwright() as s:
 browser=s.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1440,780,390):
  page=browser.new_page(viewport={'width':width,'height':600},device_scale_factor=1)
  page.set_content(fixture,wait_until='load')
  data=page.evaluate('''() => {let get=x=>{let e=document.querySelector(x),c=getComputedStyle(e),r=e.getBoundingClientRect();return {fontSize:c.fontSize,fontFamily:c.fontFamily,weight:c.fontWeight,lineHeight:c.lineHeight,spacing:c.letterSpacing,transform:c.transform,color:c.color,width:r.width,height:r.height}};return {play:get('.xen-forge-draw-play-word'),upperName:get('.f35-navigator-name-glyph'),lowerName:get('.xen-forge-name-word'),upperButton:get('.xen-forge-draw-play')}}''')
  for key in ('fontSize','fontFamily','weight','lineHeight','spacing','transform'):
   assert data['play'][key]==data['upperName'][key],f'{width}px {key} is not same as small NAME: {data}'
  assert data['play']['fontSize']=='34px'
  assert float(data['lowerName']['fontSize'][:-2])>float(data['play']['fontSize'][:-2])*1.5, data
  button=page.locator('.xen-forge-draw-play');base=data['upperButton']['color'];button.hover(force=True)
  page.wait_for_timeout(160)
  hover=page.evaluate("getComputedStyle(document.querySelector('.xen-forge-draw-play')).color")
  assert base!=hover and hover=='rgb(255, 108, 218)',f'{width}px hover not pink: {base}, {hover}'
  if width==1440:
   page.screenshot(path=str(root/'docs'/'M1_UI_P2_small_PLAY_CSS_Probe.png'))
  print('PASS',width,'small PLAY matches upper NAME:',data['play']['fontSize'],'lower NAME',data['lowerName']['fontSize'],'hover',hover)
  page.close()
 browser.close()
