"""Reproducible, guarded patch of the shipped 131 singlefile (no npm needed)."""
from pathlib import Path
import hashlib

root = Path(__file__).resolve().parents[1]
s = (root / 'Xensonar_131.html').read_text()
# Deliberately patch only this renderer; preserve the shipped build profile.
start = s.index('async function lH(')
end = s.index('function gMe(', start)
body = s[start:end]
old = 'smoothing=1-Math.exp(-1/(n*.0025));let seed='
new = 'smoothing=1-Math.exp(-1/(n*.0025));const voiceTables=e.bands.map(()=>({frameIndex:-1,cap:-1,key:NaN,a:null,b:null}));let seed='
assert body.count(old) == 1
body = body.replace(old, new)
old = 'cap=hMe(frequency,n),toneA=mMe(tableFor(frameIndex,cap,key),s[voice]),toneB=mMe(tableFor(frameIndex,cap,key+1),s[voice])'
new = 'cap=hMe(frequency,n);const pair=voiceTables[voice];if(pair.frameIndex!==frameIndex||pair.cap!==cap||pair.key!==key){pair.a=tableFor(frameIndex,cap,key);pair.b=tableFor(frameIndex,cap,key+1);pair.frameIndex=frameIndex;pair.cap=cap;pair.key=key}const toneA=mMe(pair.a,s[voice]),toneB=mMe(pair.b,s[voice])'
assert body.count(old) == 1
body = body.replace(old, new)
s = s[:start] + body + s[end:]
# The visible release identity is the document title; old provenance stays intact.
import re
s, count = re.subn(r'<title>[^<]*</title>', '<title>Xensonar 132</title>', s, count=1)
assert count == 1
out = root / 'Xensonar_132.html'
out.write_text(s)
print(out.name, out.stat().st_size, hashlib.sha256(out.read_bytes()).hexdigest())
