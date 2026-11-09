from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
css=(ROOT/'styles/areas/040_xen-p9-m9-cockpit-canonical.css').read_text()
old_css=((ROOT/'tests/fixtures/name_layout_history/r7')/'styles/areas/040_xen-p9-m9-cockpit-canonical.css').read_text()

def markup(fields,style):
 entries=''.join(f'<label class="xen-forge-quick-field"><span class="xen-forge-quick-caption">{label}</span><input class="xen-forge-quick-input" type="number" value="4" /></label>' for label in fields)
 return f'''<!doctype html><html><head><style>*{{box-sizing:border-box}}body{{margin:0;color:#aaa;background:#100b15;font:12px Arial}}.page{{margin:15px;width:calc(100% - 30px)}}.xen-forge-name-section{{overflow-x:auto}}.xen-forge-name-rack{{background:#1c1028;border:1px solid #562774}}.xen-forge-name-heading{{height:15px}}.xen-forge-name-help{{height:15px;overflow:hidden;white-space:nowrap}}.xen-forge-name-input{{height:38px}}.xen-forge-name-word{{font-size:50px}}{style}</style></head><body><div class="page"><div class="xen-forge-name-section"><div class="xen-forge-name-rack"><span class="xen-forge-name-word">NAME</span><span class="xen-forge-name-colon">:</span><span class="xen-forge-name-heading">LOOP / SAMPLE</span><input class="xen-forge-name-input" type="text" value="xensonar-name"><span class="xen-forge-name-help">This title is used when exporting material</span><div class="xen-forge-inline-metadata">{entries}</div></div></div></div></body></html>'''

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1280, 1000, 750, 375):
  page=browser.new_page(viewport={'width':width,'height':380})
  vals=[]
  for name,style,fields in [('old',old_css,['Number of Bars','Frequency Anchor (Hz)']),('new',css,['Number of Bars','Number of Segments','Frequency Anchor (Hz)'])]:
   page.set_content(markup(fields,style))
   result=page.evaluate('''()=>{
   const box=e=>{let r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
   return {rack:box(document.querySelector('.xen-forge-name-rack')),panel:box(document.querySelector('.xen-forge-inline-metadata')),fields:[...document.querySelectorAll('.xen-forge-quick-field')].map(e=>({label:e.querySelector('span').innerText,field:box(e),caption:box(e.querySelector('span')),input:box(e.querySelector('input'))}))};}''')
   vals.append((name,result))
  a,b=vals[0][1],vals[1][1]
  assert b['rack']['height']<=a['rack']['height']+2, f'height regression at {width}: old {a["rack"]["height"]}, new {b["rack"]["height"]}'
  fields=b['fields']; assert len(fields)==3
  assert len({round(f['field']['y'],1) for f in fields})==1,'all 3 fields must share row'
  assert fields[0]['field']['x']<fields[1]['field']['x']<fields[2]['field']['x']
  assert fields[2]['field']['x']+fields[2]['field']['width'] <= b['panel']['x']+b['panel']['width']+1
  print(width, 'old height',a['rack']['height'],'R8 height',b['rack']['height'],'field widths', [round(f['field']['width']) for f in fields])
  if width==1280:page.screenshot(path=str(ROOT/'docs/R12_R8_LAYOUT_TEST.png'))
  page.close()
 browser.close()
