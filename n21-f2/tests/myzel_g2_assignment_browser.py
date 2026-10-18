from playwright.sync_api import sync_playwright
from pathlib import Path
import json
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading
f=Path(__file__).resolve().parents[1]/'Xensonar_F3_56_55_CLEAN5_MYZEL_G2_ORGAN_SHUFFLE.html'
report={'file':str(f),'checks':[],'errors':[]}
server=ThreadingHTTPServer(("127.0.0.1",0),SimpleHTTPRequestHandler)
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--no-zygote','--single-process'])
    page=browser.new_page(viewport={'width':1490,'height':1050})
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_address[1]}/{f.name}',wait_until='domcontentloaded',timeout=25000)
    page.get_by_role('button',name='III. NODAL INSTALLATION',exact=True).click(timeout=10000)
    page.get_by_role('button',name='Installation',exact=True).first.click(timeout=10000)
    canvas=page.locator('.nd-legacy-root canvas').first
    before=canvas.bounding_box(); assert before is not None
    # Explicit reset exercises live generator, not an isolated test harness.
    rebuild=page.get_by_role('button',name='Rebuild Layout',exact=True)
    rebuild.click(timeout=10000)
    first=page.evaluate('''() => { const nodes = Array.from(document.querySelectorAll('canvas')); return typeof myzelRandomEffectAssignments === 'function' ? Gpe(220,1000,600).map(n=>[n.label,n.myzelEffectModuleType]) : null }''')
    assert first and len(first)==12
    second=page.evaluate('''() => Gpe(220,1000,600).map(n=>[n.label,n.myzelEffectModuleType])''')
    assert first!=second
    report['checks'].append('actual bundled G2 generator changes JI/effect assignments between builds')
    toggle=page.get_by_role('button',name='▸ Advanced · JI / Organ Assignment')
    toggle.click(timeout=10000)
    root=page.get_by_label('Root organ')
    assert root.count()==1
    root.select_option('drive')
    assert root.input_value()=='drive'
    report['checks'].append('manual Root→Drive override through visible advanced UI')
    assert canvas.bounding_box()['y']==before['y']
    report['checks'].append('unfolding editor below canvas does not displace performance canvas')
    rebuild.click()
    root=page.get_by_label('Root organ')
    assert root.count()==1
    report['checks'].append('regeneration remains functional while manual editor open')
    assert not report['errors'],report['errors']
    report['checks'].append('no page JavaScript exceptions')
    browser.close()
    server.shutdown()
print(json.dumps(report,indent=2,ensure_ascii=False))
