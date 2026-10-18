#!/usr/bin/env python3
"""XenSonar F4.4.3 RW1 — lossless split at existing FLAC boundaries.

Usage: python3 apply_rw1_flac_split.py /path/to/extracted/xensonar-f443 [apply|rollback|check]
The published HTML remains byte-identical. Requires the exact F4.4.3 source release.
"""
import hashlib, json, sys
from pathlib import Path
SOURCE_SHA = 'd26a978a785ae058e991843490e9e186f2c902fa9129f007844db0edcc989578'
HTML_SHA='5ee222f8e1cdf4d27ce2cb0b2b4767d5734ad5bf11989cb04d807ed661b04bdc'
OLD='src/audio/03_recorder.js'
TRIPLE=['src/audio/03_rfl_transport_legacy.js','src/audio/03_flac_encoder.js',OLD]
FIRST=b'/* Standalone recorder FLAC encoder:'
LAST=b'function FW('

def sha(data):return hashlib.sha256(data).hexdigest()
def run(root,cmd):
    mpath=root/'source-manifest.json'; mdata=mpath.read_bytes(); manifest=json.loads(mdata)
    entry=root/manifest['entry']
    if sha(entry.read_bytes()) != HTML_SHA: raise RuntimeError('Not the exact published F4.4.3 HTML; refusing modification')
    paths=[root/x for x in TRIPLE]
    if cmd=='apply':
        if any(p.exists() for p in paths[:2]):raise RuntimeError('RW1 files already exist; refusing overwrite')
        original=paths[2].read_bytes()
        if sha(original)!=SOURCE_SHA:raise RuntimeError('Recorder source SHA differs from F4.4.3; refusing modification')
        pos=manifest['files'].index(OLD);a=original.index(FIRST);b=original.index(LAST,a)
        assert 0<a<b<len(original)
        pieces=[original[:a],original[a:b],original[b:]]
        assert b''.join(pieces)==original
        paths[0].write_bytes(pieces[0]);paths[1].write_bytes(pieces[1]);paths[2].write_bytes(pieces[2])
        manifest['files'][pos:pos+1]=TRIPLE
        mpath.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        print('APPLIED lossless three-source FLAC split; original HTML unchanged')
    elif cmd=='rollback':
        pos=manifest['files'].index(TRIPLE[0]);assert manifest['files'][pos:pos+3]==TRIPLE
        reconstructed=b''.join(p.read_bytes() for p in paths)
        if sha(reconstructed)!=SOURCE_SHA:raise RuntimeError('RW1 sources changed; rollback refused')
        paths[2].write_bytes(reconstructed);paths[0].unlink();paths[1].unlink()
        manifest['files'][pos:pos+3]=[OLD]
        mpath.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        print('ROLLED BACK original F4.4.3 recorder source')
    elif cmd!='check':raise RuntimeError('Use apply|rollback|check')
    if cmd=='check':
        if not all(p.exists() for p in paths):raise RuntimeError('RW1 split absent')
        combined=b''.join(p.read_bytes() for p in paths)
        if sha(combined)!=SOURCE_SHA:raise RuntimeError('RW1 source reconstruction differs from original')
        pos=manifest['files'].index(TRIPLE[0]);assert manifest['files'][pos:pos+3]==TRIPLE
        print('CHECK PASS source reconstruction byte-identical')
    # Recreate distribution in-memory with the exact manifest build assembly.
    full=(root/'template/head.html').read_bytes()
    for fn in manifest['files']:full+=(root/fn).read_bytes()
    full+=(root/'template/script-close.html').read_bytes()
    for obj in manifest['styles']:
        full+=obj['tag'].encode('utf-8')+(root/obj['file']).read_bytes()+b'</style>'+obj['after'].encode('utf-8')
    full+=(root/'template/foot.html').read_bytes()
    if sha(full)!=HTML_SHA or full!=entry.read_bytes():raise RuntimeError('Distribution byte parity FAILED!')
    print('CHECK PASS generated HTML identical to F4.4.3:',HTML_SHA)

if __name__=='__main__':
    try:run(Path(sys.argv[1]).resolve(),sys.argv[2] if len(sys.argv)>2 else 'apply')
    except (IndexError,Exception) as e:print('FAIL',e,file=sys.stderr);sys.exit(1)
