from pathlib import Path
import sys
s=Path(sys.argv[1]).read_text()
checks={
 'drone linked grid explicitly enables cursor follow': "xensonar:drone-grid-cursor-follow" in s and "droneCursorFollow:true" in s,
 'power off resets echo UI': "e.updateNParams({echoOn:false})" in s[s.find('function __f447TogglePower'):s.find('function Oce(')],
 'power off resets hardware feedback': "feedback.gain" in s[s.find('function __f447TogglePower'):s.find('function Oce(')],
 'rightclick echo inactive guard': "if(!e.nexusActive)return" in s[s.find('onCanvasContextMenu:t=>'):s.find('onCanvasMouseMove:t=>')],
 'drone workbench persistence': "__xenDronePersist" in s and "xensonar:refucktor-drone-workbench.v1" in s,
 'forge region audition': 'function __f333PreviewNavigatorSample' in s,
 'forge audition left of save': "h(__ForgeNavigatorPreviewButton),h(__ForgeNavigatorSaveButton)" in s,
 'mycelium status explained': "Mycelium Drive ·" in s,
}
for k,v in checks.items():print(('PASS' if v else 'FAIL'),k)
assert all(checks.values())
