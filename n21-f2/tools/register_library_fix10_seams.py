import difflib,hashlib,json
from pathlib import Path
root=Path(__file__).resolve().parents[1];base=Path('/mnt/data/nodal_edit_fix9')
files=['src/nodal/03_library.js','src/nodal/06_melodic_bridge.js','src/nodal/07_sound_designer.js','src/forge_and_melodic/06_note_editor_and_material_tools.js','src/forge_and_melodic/09_canonical_forge_room.js','styles/20_nodal_sound_designer.css']
items=[]
for name in files:
 a=(base/name).read_text();b=(root/name).read_text()
 # Common prefix/suffix removes unchanged flanks, then short separate edit windows when possible.
 matches=difflib.SequenceMatcher(None,a,b,autojunk=True).get_matching_blocks()
 edits=[]
 x=y=0
 for m in matches:
  if m.a>x or m.b>y: edits.append({'position':y,'before':a[x:m.a],'after':b[y:m.b]})
  x=m.a+m.size;y=m.b+m.size
 if len(edits)>12: # Defensive worst-case fallback: a single exact before/after seam.
  p=0
  while p<min(len(a),len(b)) and a[p]==b[p]:p+=1
  q=0
  while q<min(len(a)-p,len(b)-p) and a[len(a)-q-1]==b[len(b)-q-1]:q+=1
  edits=[{'position':p,'before':a[p:len(a)-q if q else len(a)],'after':b[p:len(b)-q if q else len(b)]}]
 # Try restoring using original coordinates, consuming edits backwards.
 restored=b
 for e in reversed(edits):
  pos=e['position'];assert restored[pos:pos+len(e['after'])]==e['after'],(name,pos,len(e['after']));restored=restored[:pos]+e['before']+restored[pos+len(e['after']):]
 assert restored==a,name
 items.append({'file':name,'baselineSha256':hashlib.sha256(a.encode()).hexdigest(),'seams':edits})
 print(name,'seams',len(edits),'max before',max(map(lambda x:len(x['before']),edits)))
(root/'tests/fixtures/nodal_library_fix10_seams.json').write_text(json.dumps(items,indent=2,ensure_ascii=False)+'\n')
p=root/'tests/nodal_preservation.cjs';s=p.read_text()
s=s.replace("const editFix9Seams=JSON.parse(","const libraryFix10Seams=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/nodal_library_fix10_seams.json'),'utf8'));\nconst editFix9Seams=JSON.parse(")
s=s.replace('return restoreSeams(seams,file,restoreSeams(frontendSeams', 'return restoreSeams(seams,file,restoreSeams(frontendSeams')
s=s.replace('restoreSeams(editFix9Seams,file,data)', 'restoreSeams(editFix9Seams,file,restoreSeams(libraryFix10Seams,file,data))')
s=s.replace('[...editFix9Seams,...distributionFix8Seams', '[...libraryFix10Seams,...editFix9Seams,...distributionFix8Seams')
s=s.replace('PASS exact EDIT_FIX9/', 'PASS exact LIBRARY_FIX10/EDIT_FIX9/')
p.write_text(s)
