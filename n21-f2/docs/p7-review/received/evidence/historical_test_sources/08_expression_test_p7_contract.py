from pathlib import Path
p=Path('/mnt/data/XenSonar_N21_F2_P7_Keyboard_Expression_Hovers_Test.html')
assert p.exists(), 'P7 HTML not created yet (RED)'
s=p.read_text()
checks={
 'left-alt only':'e.code==="AltLeft"',
 'B physical key':'e.code==="KeyB"',
 'key-up damping':'setDampHoldActive(!1)',
 'damping state': 'damp:!1',
 'no space swell':'e.code==="Space"?(e.preventDefault(),t.setKeyboardFoundationDetached(!0)',
 'expression gate':'__performanceKeyboard?Rc.current:0',
 'bounded dynamic volume':'Math.max(.12,Math.min(3.35,1+e.swell*2.35))',
 'fretboard cycle tooltip':'Tuning: , / ; previous',
 'mode tooltip':'Mode: Right Ctrl previous',
 'particle hover':'Particle system: ',
 'particle hotkeys':'Particle modes: M previous',
 'B status icon':'Keyboard swell · hold B',
 'no extra reinforcement voices':'swellBlend:0',
 'guide B':'(hold): swell keyboard notes',
 'guide Alt':'(hold, not AltGr): damp keyboard notes',
 'left Alt status':'Keyboard damp · hold Left Alt',
}
for name,needle in checks.items():assert needle in s,name
assert 'title:"Open Grid Workbench"' not in s
print('PASS',len(checks),'structural assertions')
