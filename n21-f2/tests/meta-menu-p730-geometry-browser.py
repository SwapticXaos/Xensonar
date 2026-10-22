import os
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
css=(root/'styles/27_meta_menu.css').read_text()
# DOM reproduces the real editor's nested flex/grid layout, two source modes, and real CSS.
def html(items):
    return f'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{{box-sizing:border-box}}html,body{{padding:0;margin:0;height:100%;font:12px Arial}} {css}</style></head><body>
    <div class="xen-meta-overlay"><section class="xen-meta-editor"><header class="xen-meta-titlebar">🎧 Meta-Menu</header>
    <div class="xen-meta-toolbar"><span>SESSION</span><input value="Night Geometry"><select><option>Saved sessions</option></select><button>New</button><button>Save</button><button>Add settings to session</button><button>→ Quick Access</button></div>
    <div class="xen-meta-workspace"><section class="xen-meta-library"><div class="xen-meta-head">Libraries</div><div class="xen-meta-tab-assembly" data-xen-meta-tab-mode="libraries"><button type="button" class="xen-meta-session-backtab" aria-pressed="false"><span class="xen-meta-session-backtab-label">🎧 Sessions</span></button><div class="xen-meta-tabs">{''.join('<button>● '+s+'</button>' for s in ['Thread','Material','RFL','Drums','Bass'])}</div></div><div class="xen-meta-browser"><div class="xen-meta-browser-heading">Source library</div><div class="xen-meta-library-list">{''.join('<div class="xen-meta-library-row">Sample '+str(i)+'</div>' for i in range(items))}</div></div></section>
    <section class="xen-meta-constellation"><div class="xen-meta-head">Session collection</div><div class="xen-meta-board"><div class="xen-meta-lane">Items</div></div></section></div>
    <footer class="xen-meta-footer">↶ Undo　 Redo ↷</footer></section></div>
    <script>window.selectSessions=()=>{{document.querySelector('.xen-meta-tab-assembly').dataset.xenMetaTabMode='sessions'; const browser=document.querySelector('.xen-meta-browser');browser.classList.add('xen-meta-session-manager');browser.querySelector('.xen-meta-library-list').innerHTML='';document.querySelector('.xen-meta-session-backtab').setAttribute('aria-pressed','true');}};
    window.selectLibraries=()=>{{document.querySelector('.xen-meta-tab-assembly').dataset.xenMetaTabMode='libraries';document.querySelector('.xen-meta-session-backtab').setAttribute('aria-pressed','false');}}
    </script></body></html>'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('XEN_CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    for width,height in [(1360,850),(1920,1080),(900,700),(750,650),(400,650)]:
        page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
        page.set_content(html(18),wait_until='domcontentloaded')
        first=page.locator('.xen-meta-editor').bounding_box()
        assert first['height']>300,(width,height,'not tall enough',first)
        button=page.locator('.xen-meta-session-backtab')
        label=page.locator('.xen-meta-session-backtab-label')
        assert label.inner_text()=='🎧 Sessions'
        button.click(timeout=2000)
        page.evaluate('selectSessions()')
        second=page.locator('.xen-meta-editor').bounding_box()
        assert abs(first['height']-second['height'])<1,(width,height,first,second)
        assert abs(first['y']-second['y'])<1,(width,height,first,second)
        assert page.locator('.xen-meta-session-backtab').get_attribute('aria-pressed')=='true'
        # Actual front tooth is opaque.
        tooth=page.locator('.xen-meta-tabs button').nth(2)
        assert page.evaluate('(el)=>getComputedStyle(el).backgroundColor',tooth.element_handle())!='rgba(0, 0, 0, 0)'
        gap=page.evaluate("getComputedStyle(document.querySelector('.xen-meta-tabs button')).marginInlineStart")
        assert float(gap.replace('px',''))>0,(width,gap)
        # If many entries originally required a scrollbar, empty Sessions still fills the same panel.
        list_h=page.locator('.xen-meta-browser').bounding_box()['height']
        assert list_h>80,(width,list_h)
        print(f'PASS {width}x{height}: editor height {first["height"]:.0f}px stable, Sessions click, opaque teeth, gap {gap}')
        if width==1360:
            page.screenshot(path='/workspace/Xensonar/n21-f2/results/sessions-reviewed/XenSonar_P7_29_Meta_Menu_Sessions_Layout_Preview.png')
        page.close()
    browser.close()
