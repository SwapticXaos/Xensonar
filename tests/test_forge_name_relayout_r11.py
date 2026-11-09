"""Visual geometry contract: compare R9 original and integrated R11 without modifying text size."""
from pathlib import Path
import io, os, json
from playwright.sync_api import sync_playwright
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OLD=ROOT/'tests/fixtures/name_layout_history/r9'
STYLE_FILES=['styles/areas/028_inline-028.css','styles/areas/040_xen-p9-m9-cockpit-canonical.css']

def fixture(styles):
  return '''<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{background:#080611;color:#ddd;font:12px Arial;margin:0}.stage{height:100px;position:relative}.f35-navigator-save-slot{position:absolute;top:55px;left:245px;width:62px;height:25px}.lower{margin:16px;width:calc(100% - 32px)}.xen-forge-name-rack{background:#100d19;border:1px solid #531a79}.xen-forge-name-heading{height:15px}.xen-forge-name-help{height:15px;white-space:nowrap}.xen-forge-name-input{height:38px;background:#090b0f;color:#eff}.xen-forge-name-rack .xen-forge-quick-input{background:#090b0f;color:#eff}</style><style>'''+styles+'''</style></head><body><div class="stage"><div class="f35-navigator-save-slot"><label class="f35-navigator-sample-caption f33-project-name-text"><span class="f35-navigator-name-glyph">NAME</span><span class="f35-navigator-name-colon">:</span></label><input class="f35-navigator-sample-name" value="example"/></div></div><div class="lower"><div class="xen-forge-name-section"><div class="xen-forge-name-rack"><span class="xen-forge-name-word">NAME</span><span class="xen-forge-name-colon">:</span><span class="xen-forge-name-heading">LOOP / SAMPLE</span><input class="xen-forge-name-input" value="xensonar"><span class="xen-forge-name-help">This title will be used in Material Track.</span><div class="xen-forge-inline-metadata">'''+''.join('<label class="xen-forge-quick-field"><span class="xen-forge-quick-caption">'+name+'</span><input class="xen-forge-quick-input" type="number" value="4"></label>' for name in ['Number of Bars','Number of Segments','Frequency Anchor (Hz)'])+'''</div></div></div></div></body></html>'''

SCRIPT='''()=>{let box=s=>{let el=document.querySelector(s),r=el.getBoundingClientRect(),c=getComputedStyle(el);return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,font:c.font,fontSize:c.fontSize,transform:c.transform}};return {upper:box('.f35-navigator-name-glyph'),upperField:box('.f35-navigator-sample-name'),lower:box('.xen-forge-name-word'),colon:box('.xen-forge-name-colon'),lowerField:box('.xen-forge-name-input'),rack:box('.xen-forge-name-rack'),meta:box('.xen-forge-inline-metadata'),numeric:[...document.querySelectorAll('.xen-forge-quick-input')].map(el=>{let r=el.getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom,h:r.height}})}}'''

with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  for w in (1920,1280,1000,750,375):
    data={}
    inks={}
    for ver,base in [('old',OLD),('new',ROOT)]:
      page=browser.new_page(viewport={'width':w,'height':340},device_scale_factor=1)
      page.set_content(fixture('\n'.join((base/f).read_text() for f in STYLE_FILES)))
      data[ver]=page.evaluate(SCRIPT)
      # Measure visible glyph pixels (rather than the transformed CSS element box).
      from PIL import Image
      pixels=Image.open(io.BytesIO(page.screenshot())).convert('RGB')
      box=data[ver]['rack']; colon=data[ver]['colon']
      pts=[]
      for yy in range(int(box['y'])+5, int(box['bottom'])-5):
        for xx in range(int(box['x'])+5, int(colon['x'])-3):
          r,g,b=pixels.getpixel((xx,yy))
          if 150<=r<=250 and g>=219 and b>=195 and g>r+4 and g>b-2:
            pts.append((xx,yy))
      assert pts,'Name ink not found'
      inks[ver]=(min(x for x,y in pts),max(x for x,y in pts),min(y for x,y in pts),max(y for x,y in pts))
      if w==1280:
        page.screenshot(path=str(ROOT/'docs'/f'R11_{ver}_name_geometry.png'))
      page.close()
    a,b=data['old'],data['new']
    print('METRICS',w,json.dumps({'old':a,'new':b},ensure_ascii=False))
    assert b['lower']['fontSize']==a['lower']['fontSize'], 'Lower NAME font size changed – user prohibited resizing'
    assert b['lower']['transform']==a['lower']['transform'], 'Lower NAME font shape/condensation changed'
    # The CSS box may change when its anchor moves from the three-row rack
    # to the input row; visible ink height is the real typography invariant below.
    oldink,newink=inks['old'],inks['new']
    print('INK',w,oldink,newink,'gap-old',round(a['colon']['x']-oldink[1],2),'gap-new',round(b['colon']['x']-newink[1],2))
    assert abs((newink[3]-newink[2])-(oldink[3]-oldink[2]))<=1, 'Visible NAME ink HEIGHT was changed'
    if w>=1000:
      assert abs((newink[1]-newink[0])-(oldink[1]-oldink[0]))<=5, 'Visible NAME ink WIDTH was changed'
    assert 5<=b['colon']['x']-newink[1]<=15, 'Visual NAME/colon gap must match GIMP (~8-12px)'
    if w==1920:
      assert newink[0]-oldink[0]>=12, 'At desktop width the unchanged NAME must visibly move right'
    assert abs(b['colon']['x']-a['colon']['x'])<.1, 'Small colon position changed'
    assert b['lower']['right']<b['colon']['x'],'The NAME bounding box must not overlap the colon'
    assert 3.5<=b['upper']['x']-a['upper']['x']<=4.5,'Upper N should move right 4 px'
    assert abs(b['rack']['h']-a['rack']['h'])<1.5,'Rack must not become taller'
    assert len(b['numeric'])==3
    for number in b['numeric']:
      assert abs(number['y']-b['lowerField']['y'])<=1.5,'Bars, Segments, Frequency inputs must share title-input top edge'
      assert abs(number['bottom']-b['lowerField']['bottom'])<=1.5,'Bars, Segments, Frequency inputs must share title-input bottom edge'
    assert b['numeric'][0]['x']<b['numeric'][1]['x']<b['numeric'][2]['x']
  browser.close()
print('PASS R11: TYPE SIZE UNCHANGED, name relocated, colon fixed, numeric inputs exact title row alignment')
