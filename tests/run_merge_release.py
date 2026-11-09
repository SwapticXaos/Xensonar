#!/usr/bin/env python3
"""Independent release gates with explicit exit codes and retained logs."""
from pathlib import Path
import argparse,hashlib,json,os,subprocess,sys,time
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--browser',action='store_true');p.add_argument('--out',default='docs/merge-validation');a=p.parse_args()
out=root/a.out;out.mkdir(parents=True,exist_ok=True)
env=os.environ.copy()
exe=env.get('XEN_CHROMIUM') or env.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH')
if exe:
    for key in ['XEN_CHROMIUM','P4_CHROMIUM','PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH']:env[key]=exe
html='dist/XenSonar_Standalone.html'
commands=[['node','build.cjs','--verify'],['node','tests/source_contract.cjs'],
          ['node','tests/ui_m1_p1.cjs'],['node','tests/ui_m1_p2_carrier_play.cjs'],['node','tests/ui_m1_p3_cleanup.cjs'],
          [sys.executable,'tests/check_runtime_syntax.py'],[sys.executable,'tests/test_editable_build.py']]
for key in ['test:p1','test:p2','test:p3','test:p4','test:p41','test:rack','test:cleanup','test:p37',
            'test:forge:r5','test:forge:r6','test:forge:r7','test:forge:r8','test:forge:r13','test:forge:r14','test:forge:r15','test:forge:r20']:
    commands.append(['npm','run',key])
commands.extend([['node','tests/test_integration_p41_rc4_pcm1.cjs',str(root)],
                 ['node','tests/test_pcm_capture_merged.cjs',html],
                 ['node','tests/test_forge_first_contact_info_r18.cjs']])
for glob in ['tests/omega_*.test.cjs','tests/regression/eq/*.cjs','tests/touchpad/*.cjs']:
    commands.extend(['node',str(f.relative_to(root))] for f in sorted(root.glob(glob)))
for name in ['planning','processor','lifecycle','nailed_coalescing','nailed2_priority','nailed2_morph_worklet','nailed3_preview_owner','nailed3_identical_dsp']:
    commands.append(['node','tests/live2/'+name+'.cjs'])
commands.extend([['node','tests/merge_eq_fallback_window.cjs'],['node','tests/merge_pcm2_continuity.cjs'],
                 ['node','tests/merge_clean_flac.cjs'],['node','tests/merge_package_snapshot_retry.cjs'],[sys.executable,'tests/ui_cleanup/canonical_css.py'],
                 [sys.executable,'tests/ui_cleanup/canonical5_css.py'],['node','tests/ui_cleanup/complementary_quick_rack.cjs']])
commands.extend([['node','tests/eq_raster_preview_parity_fix.cjs'],['node','tests/hold_resident_controller.cjs'],['node','tests/hold_resident_processor.cjs']])
commands.extend([['node','tests/'+name] for name in ['song_performance_p0.test.cjs','song_sources_codec.cjs','test_session_library_delete_guard.cjs','ld2_owner_refs.cjs','eq_morph_priority_p0.test.cjs','mix_smoothing.cjs']])
if a.browser:
    commands.extend([
        ['node','tests/ui_visual_restore.cjs'],['node','tests/mix_audio_browser.cjs'],['node','tests/ld2_eq_browser.cjs'],['node','tests/ld2_layout_browser.cjs'],
        [sys.executable,'tests/test_song_performance_browser_p0.py',html],
        ['node','tests/hold_resident_browser.cjs'],
        [sys.executable,'tests/test_ui_m1_p2_visual.py'],
        [sys.executable,'tests/test_ui_m1_p3_device.py'],
        [sys.executable,'tests/test_emilia_mute_circle_r19.py'],
        [sys.executable,'tests/test_emilia_css_cleanup_parity_r19.py'],
        [sys.executable,'tests/test_forge_first_contact_layout_r18.py',html],
        [sys.executable,'tests/test_fastboot_eq_session_browser.py',html],
        [sys.executable,'tests/regression/eq/test_eq_native_multirate.py'],
        [sys.executable,'tests/regression/eq/test_eq_raster_native_dsp.py'],
        [sys.executable,'tests/regression/eq/test_eq_p14_three_tracks_browser.py'],
        [sys.executable,'tests/regression/eq/test_eq_undo_extended_browser.py',html],
        ['node','tests/merge_eq_gesture_lifecycle.cjs'],
        ['node','tests/live2/browser.cjs'],['node','tests/live2/app.cjs'],
        ['node','tests/test_stamp_full_browser_p37.cjs'],
        ['node','tests/test_package_station_selection_p41.cjs'],
        ['node','tests/test_package_station_browser_p4.cjs'],
        ['node','tests/test_package_station_outputs_p4.cjs'],
    ])
results=[]
for i,command in enumerate(commands):
    start=time.monotonic()
    try:
        result=subprocess.run(command,cwd=root,env=env,text=True,capture_output=True,timeout=240)
        code=result.returncode;text=result.stdout+result.stderr
    except subprocess.TimeoutExpired as error:
        code=124;text='TIMEOUT\n'+str(error.stdout or '')+str(error.stderr or '')
    log=f'{i:03d}.log';(out/log).write_text(text)
    row={'command':command,'exit_code':code,'seconds':round(time.monotonic()-start,3),'log':log}
    results.append(row)
    print(('PASS' if code==0 else 'FAIL')+' '+ ' '.join(command),flush=True)
    if code:print(text[-1400:],flush=True)
    report={'html_sha256':hashlib.sha256((root/html).read_bytes()).hexdigest(),'browser':a.browser,
            'gates':results,'passed':sum(r['exit_code']==0 for r in results),'failed':sum(r['exit_code']!=0 for r in results)}
    (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'failed':report['failed']}),flush=True)
sys.exit(1 if report['failed'] else 0)
