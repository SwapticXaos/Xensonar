"""R12: test the ACTUAL lower NAME ink against the title field, not CSS-box geometry.
Reference: user's GIMP comparison 2026-10-25. The desired visible NAME face is
unchanged from R11, but its vertical center should sit approximately at the
editable title field's visual center rather than the three-line rack center.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io
ROOT=Path(__file__).resolve().parents[1]
CSS='\n'.join((ROOT/f).read_text() for f in (
    'styles/areas/028_inline-028.css',
    'styles/areas/040_xen-p9-m9-cockpit-canonical.css'))
# Fixture uses same produced component markup and both ORIGINAL product stylesheets.
PAGE='''<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{background:#080611;color:#ddd;font:12px Arial;margin:0}
.xen-forge-name-rack{background:#100d19;border:1px solid #531a79}
.xen-forge-name-heading{height:15px}.xen-forge-name-help{height:15px;white-space:nowrap}
.xen-forge-name-input{height:38px;background:#090b0f;color:#eff}
</style><style>STYLES</style></head><body>
<div style="height:10px"></div><div class="xen-forge-name-section" style="width:820px">
<div class="xen-forge-name-rack">
<span class="xen-forge-name-word">NAME</span><span class="xen-forge-name-colon">:</span>
<span class="xen-forge-name-heading">LOOP / SAMPLE</span>
<input class="xen-forge-name-input" value="xensonar">
<span class="xen-forge-name-help">This title will be used in Material Track.</span>
<div class="xen-forge-inline-metadata">
'''+''.join('<label class="xen-forge-quick-field"><span class="xen-forge-quick-caption">'+n+'</span><input class="xen-forge-quick-input" type="number" value="4"></label>' for n in ('Number of Bars','Number of Segments','Frequency Anchor (Hz)'))+'''</div></div></div></body></html>'''
# Reference: the old face had 58 visible pixels in R11 at desktop width.
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (1920,1280,1000,750,375):
        page=browser.new_page(viewport={'width':width,'height':165},device_scale_factor=1)
        page.set_content(PAGE.replace('STYLES',CSS))
        boxes=page.evaluate('''() => {
          const box=s=>{const el=document.querySelector(s),r=el.getBoundingClientRect(),c=getComputedStyle(el);
            return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,font:c.fontSize,transform:c.transform}};
          return {name:box('.xen-forge-name-word'),field:box('.xen-forge-name-input'),
            colon:box('.xen-forge-name-colon'),rack:box('.xen-forge-name-rack'),
            nums:[...document.querySelectorAll('.xen-forge-quick-input')].map(e=>{const r=e.getBoundingClientRect();return {y:r.y,bottom:r.bottom};})};
        }''')
        image=Image.open(io.BytesIO(page.screenshot())).convert('RGB')
        ink=[]
        for y in range(max(0,int(boxes['rack']['y'])),min(image.height,int(boxes['rack']['bottom'])+8)):
            for x in range(max(0,int(boxes['rack']['x'])),int(boxes['colon']['x'])-2):
                red,green,blue=image.getpixel((x,y))
                if 150<=red<=250 and green>=219 and blue>=195 and green>red+4 and green>blue-2:
                    ink.append((x,y))
        assert ink,f'NAME ink absent at {width}'
        ink_top=min(y for x,y in ink);ink_bottom=max(y for x,y in ink)
        center=(ink_top+ink_bottom)/2
        field_center=(boxes['field']['y']+boxes['field']['bottom'])/2
        distance=center-field_center
        print(f'{width}: visible NAME ink [{ink_top},{ink_bottom}], input [{boxes["field"]["y"]},{boxes["field"]["bottom"]}], relative center {distance:.2f}px')
        assert 0<=distance<=4.5, f'R12 target (GIMP): NAME centered with field / slightly below, currently {distance:.2f}px at {width}'
        if width>=1280:
            assert 55<=ink_bottom-ink_top<=61, f'NAME size changed: {ink_bottom-ink_top}px'
        assert abs(boxes['rack']['h']-102)<=1.5, 'Name rack grew vertically'
        for num in boxes['nums']:
            assert abs(num['y']-boxes['field']['y'])<=1.5, 'Input tops not aligned'
            assert abs(num['bottom']-boxes['field']['bottom'])<=1.5, 'Input bottoms not aligned'
        if width==1280:
            page.screenshot(path=str(ROOT/'docs/forge_r12_name_rendered.png'))
        page.close()
    browser.close()
print('PASS R12: NAME lowered without resizing, aligned to actual title field')
