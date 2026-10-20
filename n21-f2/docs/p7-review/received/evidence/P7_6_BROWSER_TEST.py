import asyncio, subprocess, os, signal
from pathlib import Path
from playwright.async_api import async_playwright
html=Path('/mnt/data/P7_6_EXPRESSION_MODE/n21-f2/XenSonar_Codex_Handoff_Through_13.html')
async def main():
 server=subprocess.Popen(['python','-m','http.server','8892','--bind','127.0.0.1'], cwd=str(html.parent), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
 try:
  await asyncio.sleep(0.4)
  await run_browser()
 finally:
  server.terminate();server.wait(timeout=5)
async def run_browser():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=no-user-gesture-required'])
  page=await browser.new_page(viewport={'width':1530,'height':1080})
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  await page.evaluate('''() => {const m=new Map(); const store={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:n=>Array.from(m.keys())[n]||null,get length(){return m.size}}; Object.defineProperty(window,'localStorage',{configurable:true,value:store});Object.defineProperty(window,'sessionStorage',{configurable:true,value:store});}''')
  await page.set_content(html.read_text(),wait_until='domcontentloaded', timeout=45000)
  await page.wait_for_timeout(1100)
  print('TITLE',await page.title())
  for label in ['PEDAL','KNOB']:
   print('INIT',label,await page.get_by_text(label,exact=True).count())
  print('hint',await page.get_by_text('B + Left Alt',exact=False).count())
  await page.get_by_role('button',name='Power').click()
  await page.wait_for_timeout(450)
  print('power after', (await page.get_by_role('button',name='Power').count()), 'pageerrors', len(errors))
  # Main room active by default? Need switch power if button dormant
  await page.keyboard.down('b')
  await page.keyboard.down('Alt')
  await page.wait_for_timeout(120)
  print('B+LEFTALT', 'pedal',await page.get_by_text('PEDAL',exact=True).count(),'knob',await page.get_by_text('KNOB',exact=True).count())
  await page.keyboard.up('Alt')
  await page.keyboard.up('b')
  await page.wait_for_timeout(120)
  await page.keyboard.down('Alt')
  await page.keyboard.down('b')
  await page.wait_for_timeout(120)
  print('ALT+B', 'pedal',await page.get_by_text('PEDAL',exact=True).count(),'knob',await page.get_by_text('KNOB',exact=True).count())
  await page.keyboard.up('b');await page.keyboard.up('Alt')
  print('errors',errors[:4], 'count',len(errors))
  await page.screenshot(path='/mnt/data/P7_6_EXPRESSION_MODE/P7_6_visible_mode.png',full_page=False)
  await browser.close()
asyncio.run(main())
