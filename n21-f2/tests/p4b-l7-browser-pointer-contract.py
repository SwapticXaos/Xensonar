"""L7: browser cursor is the sole crosshair; audio-targeting state remains separate.
Runs with temporary in-memory instrumentation, never writes into production HTML.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, math, random
root=Path(__file__).resolve().parent.parent
html=(root/'XenSonar_F448_S1_P4B_L7_Free_Crosshair_Test.html').read_text()
code=(root/'src/rhythm/03_live_drum_bodies.js').read_text()
assert 't.moveTo(f.x-9,f.y)' not in code,'legacy painted crosshair still present'
assert 't.moveTo(f.x,f.y),t.lineTo(n.cursorX,n.cursorY)' in code,'tether removed'
assert 'cursor-crosshair' in html,'native cursor missing'
needle='if(x.addColorStop(0,"rgba(220, 180, 255, 0.15)")'
assert html.count(needle)==1
html=html.replace(needle,'(window.__cursorFrames||(window.__cursorFrames=[]),window.__cursorFrames.push({focusX:f.x,focusY:f.y,ballX:n.cursorX,ballY:n.cursorY,at:performance.now()}),window.__cursorFrames.length>1500&&window.__cursorFrames.shift());'+needle)
needle='onCanvasMouseMove:t=>{e.setPlayfieldCursorInside(!0)'
assert html.count(needle)==1
html=html.replace(needle,'onCanvasMouseMove:t=>{(window.__rawEvents||(window.__rawEvents=[]),window.__rawEvents.push({x:t.clientX,y:t.clientY,at:performance.now()}));e.setPlayfieldCursorInside(!0)')
res={'errors':[],'checks':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    try:
        page=browser.new_page(viewport={'width':1600,'height':1000})
        page.on('pageerror',lambda e:res['errors'].append(str(e)[:500]))
        page.evaluate('''() => {let store={};const fake={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>delete store[k],clear:()=>{store={}}};Object.defineProperty(window,'localStorage',{value:fake,configurable:true});Object.defineProperty(window,'sessionStorage',{value:fake,configurable:true});}''')
        page.set_content(html,wait_until='domcontentloaded',timeout=60000)
        page.get_by_role('button',name='Power',exact=True).click(timeout=15000)
        page.wait_for_timeout(850)
        canvas=page.locator('canvas[width="1100"][height="580"]')
        assert canvas.count()==1
        native=page.evaluate('''() => {const canvas=document.querySelector('canvas[width="1100"][height="580"]');return getComputedStyle(canvas.parentElement).cursor}''')
        assert native=='crosshair',native
        res['checks'].append('Native browser pointer uses crosshair styling over the entire playfield')
        bb=canvas.bounding_box()
        def xy(x,y):return bb['x']+x/1100*bb['width'],bb['y']+y/580*bb['height']
        random.seed(349)
        for i in range(65):
            if i<30:
                x=420+(i%5)*1.4;y=170+(i%10)*.85
            else:
                x=random.uniform(315,755);y=random.uniform(119,271)
            page.mouse.move(*xy(x,y))
            if i%3!=0:
                page.mouse.down();page.mouse.up()
        page.wait_for_timeout(200)
        vals=page.evaluate('''() => ({frames:window.__cursorFrames??[],events:window.__rawEvents??[]})''')
        frames=vals['frames'];events=vals['events'];assert len(frames)>30 and len(events)>=65,(len(frames),len(events))
        events=sorted(events,key=lambda x:x['at']);max_err=0;separate=0;index=0;compared=0
        for f in frames:
            while index+1<len(events) and events[index+1]['at']<=f['at']:index+=1
            raw=events[index]
            if raw['at']<=f['at']:
                xx=(raw['x']-bb['x'])*1100/bb['width'];yy=(raw['y']-bb['y'])*580/bb['height']
                max_err=max(max_err,math.hypot(f['focusX']-xx,f['focusY']-yy))
                compared+=1
                if abs(f['focusY']-f['ballY'])>3:separate+=1
        assert max_err<.1,max_err
        assert separate>5,separate
        res['checks'].append('The free cursor follows raw event coordinates under rapid click bursts (max error <0.1 canvas px)')
        res['checks'].append('Wave Starter ball remains independently grid-positioned for multiple frames')
        res['samples']={'draw_frames':len(frames),'raw_mouse_events':len(events),'max_free_cursor_error_canvas_px':round(max_err,5),'focus_ball_separate_frames':separate}
        assert not res['errors'],res['errors']
    finally:browser.close()
(root/'P4B_L7_BROWSER_REPORT.json').write_text(json.dumps(res,ensure_ascii=False,indent=2)+'\n')
print('PASS',json.dumps(res,ensure_ascii=False,indent=2))
