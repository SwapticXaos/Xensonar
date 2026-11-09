"""Forge action cross: static geometry from exact source classes + compiled CSS.
The screenshot proves the two fixed rows, not full Forge playback behavior.
"""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
html=(ROOT/'dist/XenSonar_Standalone.html').read_text()
css='\n'.join(re.findall(r'<style(?:\s[^>]*)?>([\s\S]*?)</style>',html))
def button(label,cls):return f'<button class="{cls} border rounded px-2" type="button">{label}</button>'
sub=lambda emoji,a,b:f'<span class="xen-forge-export-tile"><span class="xen-forge-export-icon">{emoji}</span><span class="xen-forge-export-words"><span>{a}</span><span>{b}</span></span></span>'
primary=[button('Load Selection','xen-forge-tile-load'),button('Loop korrigieren','xen-forge-tile-repair'),button('Apply Raw','xen-forge-tile-apply'),button(sub('🧬','Extract Timbre','(Donor Workshop)'),'xen-forge-tile-extract'),button('PLAY','xen-forge-tile-play'),button(sub('📀','Send raw as a loop to Material Track','(Main Room)'),'xen-forge-tile-material')]
secondary=[button(sub('🎵','Send as Pink Track','to Melodic Loop'),'xen-forge-tile-pink')]
secondary += ['<div class="xen-forge-source-save-row">'+button(sub('🎼','Use as','Root Follow Loop'),'xen-forge-tile-root')+button('Save as Sample','xen-forge-tile-sample')+button('Add to Donor Library','xen-forge-tile-donor')+'''<div class="xen-carrier-actions"><button class="xen-carrier-transform">'''+sub('🧪','Transform to','Carrier')+'''</button><details class="xen-carrier-filter"><summary>Filter</summary></details></div></div>''']
source='''<!doctype html><html><head><meta charset="utf-8"><style>'''+css+'''\nbody{margin:0;background:#08070b;color:#ebeff7;font-family:monospace}.sample{padding:8px 20px}.name-probe{margin-top:8px;height:104.75px;border:1px solid #422a70;box-sizing:border-box;background:#140d1e}.xen-forge-action-row button{border-width:1px;border-style:solid;border-color:#4d4764;background:#110d18;color:#eef8fb;font-family:monospace;font-size:11px;}.xen-forge-tile-pink{border-color:#f500d6!important}.xen-forge-tile-material{border-color:#de7b00!important}</style></head><body><section class="sample"><div class="xen-forge-action-rack"><div class="xen-forge-action-row xen-forge-action-row-primary">'''+''.join(primary)+'''</div><div class="xen-forge-action-row xen-forge-action-row-secondary">'''+''.join(secondary)+'''</div><button class="xen-forge-up-triangle"><span class="xen-forge-up-chevron">⌃</span><span class="xen-forge-up-label">UP</span></button></div><div class="name-probe">NAME</div></section></body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1360,1290,1180,980,600,375):
  page=browser.new_page(viewport={'width':width,'height':400},device_scale_factor=1)
  page.set_content(source)
  m=page.evaluate('''()=>{const box=s=>{const x=document.querySelector(s),r=x.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,b:r.bottom}};let pri=[...document.querySelectorAll('.xen-forge-action-row-primary>button')].map(x=>({text:x.textContent,...{x:x.getBoundingClientRect().x,y:x.getBoundingClientRect().y,w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}}));let sec=[...document.querySelectorAll('.xen-forge-action-row-secondary button')].map(x=>({text:x.textContent,x:x.getBoundingClientRect().x,y:x.getBoundingClientRect().y,w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}));return {rack:box('.xen-forge-action-rack'),row1:box('.xen-forge-action-row-primary'),row2:box('.xen-forge-action-row-secondary'),name:box('.name-probe'),raw:box('.xen-forge-tile-material'),pink:box('.xen-forge-tile-pink'),extract:box('.xen-forge-tile-extract'),carrier:box('.xen-carrier-transform'),up:box('.xen-forge-up-triangle'),pri,sec,scroll1:document.querySelector('.xen-forge-action-row-primary').scrollWidth,scroll2:document.querySelector('.xen-forge-action-row-secondary').scrollWidth}}''')
  assert len(m['pri'])==6 and len(m['sec'])==5,(width,'wrong card count',m['pri'],m['sec'])
  assert abs(m['row1']['h']-80)<=.25 and abs(m['row2']['h']-80)<=.25,(width,'rows must remain 80px',m)
  assert abs(m['row2']['y']-m['row1']['y']-88)<=.5,(width,'rows should have only 8px gap')
  assert abs(m['name']['y']-m['rack']['b']-8)<=.5,(width,'NAME must not move below fixed 168px rack')
  assert abs(m['extract']['w']-248)<=.5,(width,'Extract original width lost')
  assert abs(m['pink']['w']-271)<=.5,(width,'Pink original width lost')
  assert abs(m['raw']['w']-310)<=.5,(width,'Raw outside card not shortened')
  assert abs(m['carrier']['w']-216)<=.5,(width,'Carrier only expanded')
  assert all(abs(c['y']-m['row1']['y'])<.5 and abs(c['h']-80)<=.5 for c in m['pri']), (width,'top row placement')
  assert all(abs(c['y']-m['row2']['y'])<.5 and abs(c['h']-80)<=.5 for c in m['sec']), (width,'bottom row placement')
  assert m['pink']['y']>m['raw']['y']+79,(width,'Pink must ALWAYS stay below Raw')
  assert all(m['pri'][i]['x']<m['pri'][i+1]['x'] for i in range(5)),(width,'top cards reordered')
  assert all(m['sec'][i]['x']<m['sec'][i+1]['x'] for i in range(4)),(width,'bottom cards reordered')
  if width>=1300:
   assert m['row1']['w']>=m['scroll1']-1 and m['row2']['w']>=m['scroll2']-1,(width,'horizontal scroll not desired at reference size')
  if width==1360:
   path=Path('/mnt/data/XenSonar_Forge_Kreuz_Raster_Geometrie_1360.png');page.screenshot(path=str(path),full_page=True)
  print('width',width,'primary y',m['row1']['y'],'secondary y',m['row2']['y'],'NAME y',m['name']['y'],'extract',m['extract']['w'],'pink',m['pink']['w'],'material',m['raw']['w'],'carrier',m['carrier']['w'],'scroll',m['scroll1'],m['scroll2'])
  page.close()
 browser.close()
print('FORGE CROSS BROWSER PASS: original cross fixed, 80px rows, NAME unmoved, allowed width exceptions only')
