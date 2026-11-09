#!/usr/bin/env python3
"""Syntax check every HTML script block, including deferred room/factory scripts."""
from pathlib import Path
from html.parser import HTMLParser
import subprocess, tempfile, re
p=Path(__file__).resolve().parents[1]/'dist/XenSonar_Standalone.html'
s=p.read_text()
class Extract(HTMLParser):
 def __init__(self):
  super().__init__(convert_charrefs=False)
  self.line_starts=[0]+[m.end() for m in re.finditer('\n',s)]
  self.active=None;self.scripts=[]
 def source_index(self):
  ln,col=self.getpos();return self.line_starts[ln-1]+col
 def handle_starttag(self,tag,attrs):
  if tag=='script' and not self.active:
   self.active=(self.source_index()+len(self.get_starttag_text()),dict(attrs))
 def handle_endtag(self,tag):
  if tag=='script' and self.active:
   begin,attrs=self.active
   self.scripts.append((attrs,s[begin:self.source_index()]))
   self.active=None
extract=Extract();extract.feed(s)
assert len(extract.scripts)==s.count('</script>'),len(extract.scripts)
with tempfile.TemporaryDirectory() as d:
 for i,(_,body) in enumerate(extract.scripts):
  f=Path(d)/f'part_{i:02d}.mjs';f.write_text(body)
  r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
  if r.returncode:raise AssertionError(f'Syntax error in HTML script #{i}: {r.stderr[:500]}')
print(f'SYNTAX OK: {len(extract.scripts)} HTML script blocks (including deferred islands)')
