"""Geometry of the actual P34 React-less host-mounted source.
Reuses the P33 donor browser harness (real SVG, DOM and original animated canvas).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
p33=(root/'tests/test_forge_donor_wave_browser_p33.py').read_text()
ns={'__file__':str(root/'tests/test_forge_donor_wave_browser_p33.py')}
exec(p33.split('with sync_playwright() as pw:')[0],ns)
css,js,donor,presenter,component=[ns[k] for k in ('css','js','donor','presenter','component')]
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in (1360,900,540,375):
  page=browser.new_page(viewport={'width':width,'height':1100},device_scale_factor=1)
  html=f'''<!doctype html><html><head><style>*{{box-sizing:border-box}}body{{background:#090a12;color:#a7a1ba;margin:0;font:11px monospace}}.stage{{padding:9px;width:100%}}.rack{{height:176px;border:1px solid #193948;background:#080b13;position:relative}}[data-forge-rack-import-audio]{{position:absolute;right:17%;top:43px;width:46px;height:96px;background:#04333b;color:#d0faff;border:2px solid #32d5dc}}[data-forge-rack-import-audio] svg{{width:43px;height:30px}}{css}</style></head><body><div class="stage"><div class="rack"><button data-forge-rack-import-audio>IMPORT AUDIO<svg viewBox="0 0 44 30"><path d="M2 3 H42 L22 27 Z" fill="currentColor"/></svg></button></div><div id="mount"></div></div><script>{js}\n{donor}\n{presenter}\n{component}\nconst mounted=__XenForgeNoAudioP32({{onImport:()=>window.__importClicks++,disabled:false}});document.querySelector('#mount').append(mounted);window.__importClicks=0;window.__cleanups=effects.map(fn=>fn());</script></body></html>'''
  errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded')
  page.wait_for_timeout(340)
  metrics=page.evaluate('''()=>{
   const mask=document.querySelector('[data-p33-animated-canvas="no-signal"]');
   const button=document.querySelector('.xen-p32-mirror-button');
   const meter=document.querySelector('.xen-p33-meter-label');
   const rect=button.getBoundingClientRect(),parent=mask.getBoundingClientRect();
   const wave=__XenIdleWaveDonorP33.buildTextMask('NO SIGNAL',Math.round(parent.width),Math.round(parent.height),
     {fill:parent.width<320?.96:.88,capHeight:.78,tracking:parent.width<320?.04:.08});
   const groups=[];let start=-1;for(let x=0;x<wave.width;x++){
    if(wave.ink[x]&&start<0)start=x;
    if(start>=0&&(!wave.ink[x]||x===wave.width-1)) {groups.push([start,wave.ink[x]?x:x-1]);start=-1;}}
   const A=groups[6];
   return {label:meter.textContent,labels:meter.children.length,diagnostics:document.querySelectorAll('.xen-p33-diagnostics-dummy').length,
     A, glyphCount:groups.length,
     delta:A?Math.abs((rect.left+rect.width/2)-(parent.left+(A[0]+A[1]+1)/2*parent.width/wave.width)):999,
     glyphVisible:getComputedStyle(button).visibility==='visible',meterSegments:document.querySelectorAll('[data-p33-seven-bars] ~ line').length,
     upper:document.querySelector('.xen-p32-upper').getBoundingClientRect().height,
     overflow:document.documentElement.scrollWidth-innerWidth};
  }''')
  assert not errs,(width,errs)
  assert metrics['glyphCount']==8 and metrics['glyphVisible'] and metrics['delta']<1.25,(width,metrics)
  assert metrics['labels']==1 and "Let's say Seven Bars" in metrics['label'] and metrics['meterSegments']==7,(width,metrics)
  assert metrics['diagnostics']==0 and metrics['overflow']<2,(width,metrics)
  print('P34 geometry PASS',width,metrics,flush=True)
  if width==1360:
   page.wait_for_timeout(7400)
   page.screenshot(path='/mnt/data/XenSonar_P34_A_SevenBars_Visual.png',full_page=True)
   page.locator('.xen-p32-mirror-button').click()
   assert page.evaluate('window.__importClicks')==1
  page.evaluate('window.__cleanups.forEach(fn=>fn?.())')
  page.close()
 browser.close()
print('P34 BROWSER PASS')
