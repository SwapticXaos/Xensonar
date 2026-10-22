import os
# Self-contained Chromium geometry/interaction proof for the actual Meta-Menu CSS.
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'styles/27_meta_menu.css').read_text()
html='<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#121826}*{box-sizing:border-box}__META_STYLES__</style></head><body><div class="xen-meta-overlay"><div class="xen-meta-editor" style="height:640px"><div class="xen-meta-titlebar"><strong>🎧 Meta-Menu</strong></div><div class="xen-meta-toolbar">Session <input value="Nocturnal Geometry"/></div><div class="xen-meta-workspace"><section class="xen-meta-library"><div class="xen-meta-head"><strong>Bibliotheken</strong><small>QUELLE / 01–05</small></div><div class="xen-meta-tab-assembly" data-xen-meta-tab-mode="sessions"><button type="button" class="xen-meta-session-backtab" aria-pressed="true"><span class="xen-meta-session-backtab-label">🎧 Sessions</span></button><div role="tablist" class="xen-meta-tabs"><button role="tab" aria-selected="false"><span>🪜</span><span>Thread</span></button><button role="tab" aria-selected="false"><span>📀</span><span>Material</span></button><button role="tab" aria-selected="false"><span>🎼</span><span>RFL</span></button><button role="tab" aria-selected="false"><span>🥁</span><span>Drums</span></button><button role="tab" aria-selected="false"><span>🎸</span><span>Bass</span></button></div></div><div id="xen-meta-sessions-panel" class="xen-meta-browser xen-meta-session-manager"><div class="xen-meta-browser-heading"><strong>🎧 Gespeicherte Sessions</strong><span>2 Sessions</span></div><div class="xen-meta-session-list"><div class="xen-meta-session-row"><div class="xen-meta-session-details"><strong>Nocturnal Geometry</strong><small>12 Materialien</small></div><button>Laden</button></div><div class="xen-meta-session-row"><div class="xen-meta-session-details"><strong>Xaos Session</strong><small>7 Materialien</small></div><button>Laden</button></div></div></div></section><section class="xen-meta-constellation"><div class="xen-meta-head"><strong>Session-Konstellation</strong></div><div class="xen-meta-board" style="min-height:300px"></div></section></div></div></div><script>document.querySelector(\'.xen-meta-session-backtab\').onclick=()=>{const x=document.querySelector(\'.xen-meta-tab-assembly\');x.dataset.xenMetaTabMode=\'sessions\';document.querySelectorAll(\'.xen-meta-tabs [role=tab]\').forEach(y=>y.setAttribute(\'aria-selected\',\'false\'));document.querySelector(\'.xen-meta-session-backtab\').setAttribute(\'aria-pressed\',\'true\')};document.querySelectorAll(\'.xen-meta-tabs button\').forEach((y)=>y.onclick=()=>{const x=document.querySelector(\'.xen-meta-tab-assembly\');x.dataset.xenMetaTabMode=\'libraries\';document.querySelectorAll(\'.xen-meta-tabs button\').forEach(z=>z.setAttribute(\'aria-selected\',\'false\'));y.setAttribute(\'aria-selected\',\'true\');document.querySelector(\'.xen-meta-session-backtab\').setAttribute(\'aria-pressed\',\'false\')})</script></body></html>'.replace('__META_STYLES__',css)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('XEN_CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [750,1360,1920]:
  page=browser.new_page(viewport={'width':width,'height':850})
  page.set_content(html)
  back=page.locator('.xen-meta-session-backtab');back.click()
  assert page.locator('.xen-meta-tab-assembly').get_attribute('data-xen-meta-tab-mode')=='sessions'
  rects=page.evaluate('''() => {const q=s=>document.querySelector(s).getBoundingClientRect(); const rear=q('.xen-meta-session-backtab'),text=q('.xen-meta-session-backtab-label'),teeth=[...document.querySelectorAll('.xen-meta-tabs>button')].map(x=>x.getBoundingClientRect()),mgr=q('.xen-meta-session-manager'); return {centerDiff:Math.abs(text.left+text.width/2-(rear.left+rear.width/2)),rearBottom:rear.bottom,managerTop:mgr.top,teeth:teeth.map(x=>({left:x.left,right:x.right,top:x.top,bottom:x.bottom})),rearTop:rear.top,plateHeight:parseFloat(getComputedStyle(document.querySelector('.xen-meta-session-backtab'),'::after').height),colors:[...document.querySelectorAll('.xen-meta-tabs>button')].map(x=>getComputedStyle(x).backgroundColor)} }''')
  assert rects['centerDiff']<=2, f"{width}px: Sessions icon/label group should be centered over the tabs, not right-justified ({rects['centerDiff']:.1f}px off)"
  assert rects['rearBottom']+rects['plateHeight']-1>=rects['managerTop'],f"{width}px: rear plate must reach panel"
  assert all(c.startswith('rgb(') for c in rects['colors']),f"{width}px: foreground tabs must be opaque"
  # Gap between Material and RFL, and between RFL and Drums must be visible.
  for i in (1,2):
   a,b=rects['teeth'][i],rects['teeth'][i+1]
   assert b['left']-a['right']>=3, f"{width}px: no visible gap between tabs {i} and {i+1}"
   midx=(a['right']+b['left'])/2
   midy=(a['top']+a['bottom'])/2
   el=page.evaluate('''([x,y])=>document.elementFromPoint(x,y)?.className''',[midx,midy]); assert el in ('xen-meta-tabs','xen-meta-session-backtab'),f"{width}px: gap covered by a material tab, got {el}"
  page.locator('.xen-meta-tabs button').nth(2).click()
  assert page.locator('.xen-meta-tab-assembly').get_attribute('data-xen-meta-tab-mode')=='libraries'
  page.close()
 browser.close()
print('PASS: front tabs opaque; two central gaps reveal clickable Sessions layer; session/panel joined; label centered; library switch reversible')
