"""Browser runtime of the actual P33 component + unchanged donor animation module.
Fake React host *only* creates DOM and executes mounted effects; renderer and draw loop are real.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'styles/areas/040_xen-p9-m9-cockpit-canonical.css').read_text()
donor=(root/'src/rooms/00_idle_wave_donor_p33.js').read_text()
presenter=(root/'src/rooms/00_forge_rack_presentation.js').read_text()
component=(root/'src/rooms/00_empty_audio_p32.js').read_text()
js='''
const effects=[];
const P={
 createElement:function(tag,props,...children){
  const svgTags=new Set(['svg','rect','line','path','defs','linearGradient','stop','text']);
  const make=(tag,svg)=>svg?document.createElementNS('http://www.w3.org/2000/svg',tag):document.createElement(tag);
  const el=make(tag,svgTags.has(tag));
  for(const [key,val] of Object.entries(props||{})){
   if(key==='ref'){if(val)val.current=el;continue;}
   if(key==='key'||val===undefined||val===null)continue;
   if(key==='onClick'){el.onclick=val;continue;}
   if(key==='className'){el.setAttribute('class',val);continue;}
   if(key==='style'){Object.assign(el.style,val);continue;}
   if(key==='disabled'){if(val)el.setAttribute('disabled','');continue;}
   el.setAttribute(({strokeWidth:'stroke-width',textAnchor:'text-anchor',dominantBaseline:'dominant-baseline',strokeDasharray:'stroke-dasharray',strokeLinecap:'stroke-linecap',tabIndex:'tabindex'}[key]||key),String(val));
  }
  function add(child){if(Array.isArray(child))child.forEach(add);else if(child!=null && child!==false){if(typeof child==='object')el.append(child);else el.append(document.createTextNode(String(child)))}}
  children.forEach(add);return el;
 },
 useRef:init=>({current:init||null}),useState:init=>[init,()=>{}],useEffect:fn=>effects.push(fn)
};
const ao={createPortal:el=>el};
'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1360,'height':1100},device_scale_factor=1)
 html=f'''<!doctype html><html><head><style>*{{box-sizing:border-box}}body{{background:#090a12;color:#a7a1ba;margin:0;font:11px monospace}}.stage{{padding:9px;width:100%}}.rack{{height:176px;border:1px solid #193948;background:#080b13;position:relative}}[data-forge-rack-import-audio]{{position:absolute;right:17%;top:43px;width:46px;height:96px;background:#04333b;color:#d0faff;border:2px solid #32d5dc}}[data-forge-rack-import-audio] svg{{width:43px;height:30px}}{css}</style></head><body><div class="stage"><div class="rack"><button data-forge-rack-import-audio>IMPORT AUDIO<svg viewBox="0 0 44 30"><path d="M2 3 H42 L22 27 Z" fill="currentColor"/></svg></button></div><div id="mount"></div></div><script>{js}\n{donor}\n{presenter}\n{component}\nconst mounted=__XenForgeNoAudioP32({{onImport:()=>window.__importClicks++,disabled:false}});document.querySelector('#mount').append(mounted);window.__importClicks=0;window.__cleanups=effects.map(fn=>fn());</script></body></html>'''
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=30000)
 page.wait_for_timeout(300)
 def snap():
  return page.evaluate('''()=>{const canvases=[...document.querySelectorAll('[data-p33-animated-canvas]')];return {
   masks:canvases.map(c=>({width:c.width,height:c.height,visible:c.getBoundingClientRect().width>200,
     sample:[...c.getContext('2d').getImageData(Math.round(c.width/2),Math.round(c.height/2),1,1).data],
     checksum:(()=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=0;for(let i=0;i<d.length;i+=97)hash=((hash*33)^d[i])>>>0;return hash})()})),
   bars:document.querySelectorAll('[data-p33-seven-bars] ~ line').length,
   label:document.querySelector('.xen-p33-meter-label')?.textContent,
   disabled:[...document.querySelectorAll('.xen-p33-inactive-tile')].every(b=>b.disabled),
   count:document.querySelectorAll('.xen-p33-inactive-tile').length,
   overflow:document.documentElement.scrollWidth-innerWidth,
   mirror:!!document.querySelector('[data-p32-import-mirror-triangle]')}
 }''')
 one=snap();page.wait_for_timeout(850);two=snap()
 assert not errors,errors
 assert len(one['masks'])==2,one
 assert all(x['width']>250 and x['height']>60 for x in one['masks']),one
 assert all(x['checksum']!=y['checksum'] for x,y in zip(one['masks'],two['masks'])),(one,two)
 assert 'Seven Bars' in one['label'],one
 assert one['disabled'] and one['count']>=10,one
 assert one['mirror'] and one['overflow']<2,one
 page.screenshot(path='/mnt/data/XenSonar_P33_Donor_Animation_First_Contact_Preview.png',full_page=True)
 page.locator('.xen-p32-mirror-button').click()
 assert page.evaluate('window.__importClicks')==1
 page.evaluate('window.__cleanups.forEach(fn=>fn?.())')
 page.wait_for_timeout(40)
 assert not errors,errors
 print('P33 BROWSER PASS',one,'ANIMATION CHANGED',[a['checksum']!=b['checksum'] for a,b in zip(one['masks'],two['masks'])])
 browser.close()
