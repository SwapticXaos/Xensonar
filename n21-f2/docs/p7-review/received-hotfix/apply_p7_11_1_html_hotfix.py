#!/usr/bin/env python3
from pathlib import Path
import hashlib,sys
p=Path(sys.argv[1]);data=p.read_text(encoding='utf-8')
old='aria-label:`Preview ${B.name}`'
new='"aria-label":`Preview ${B.name}`'
if data.count(old)!=1: raise SystemExit('ABORT: expected exactly one broken aria-label occurrence')
if hashlib.sha256(data.encode()).hexdigest()!='e1d03bb19f03dd647f5d25f810b27ac312297eb8339e35e53cf6a17f5264a571':raise SystemExit('ABORT: wrong original HTML version')
out=p.with_name('XenSonar_N21_F2_P7_11_1_WhiteScreen_Fix_Test.html')
out.write_text(data.replace(old,new),encoding='utf-8')
assert hashlib.sha256(out.read_bytes()).hexdigest()=='3d84f707cffbecfb19736194660f13282d006c6186c39a44f3129bfd530705f4'
print(out)
