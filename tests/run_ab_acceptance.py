#!/usr/bin/env python3
"""Focused A+B+C acceptance; historical broad regression suite is separate and reported honestly."""
from pathlib import Path
import subprocess,os,json,time,sys
root=Path(__file__).resolve().parents[1]
out=Path(os.environ.get('XEN_ACCEPTANCE_DIR',root/'docs/bass-carrier-acceptance'));out.mkdir(parents=True,exist_ok=True)
env={**os.environ,'XEN_HTML':str(root/'dist/XenSonar_Standalone.html')}
names=['source_contract.cjs', 'ui_m1_p1.cjs', 'ui_m1_p2_carrier_play.cjs', 'ui_m1_p3_cleanup.cjs', 'working_session.test.cjs', 'song_performance_p0.test.cjs', 'song_source_config_p2.test.cjs', 'song_sources_codec.cjs', 'session_bass_drone_p2.test.cjs', 'bass_timbre_contract_p1.test.cjs', 'hold_resident_controller.cjs', 'hold_resident_processor.cjs', 'hold_prefix_takeover.cjs', 'hold_prefix_safety.cjs', 'avalanche_control.cjs', 'avalanche_handlers.cjs', 'avalanche_routes.cjs', 'avalanche_native_timbre.cjs', 'avalanche_worker_lifecycle.cjs', 'avalanche_pcm.cjs', 'avalanche_eq_runtime.cjs', 'avalanche_axes_load.cjs', 'avalanche_mod_budget.cjs', 'avalanche_worker_slices.cjs', 'power_warm_noise.cjs', 'eq_morph_noop_pointer.cjs', 'eq_morph_priority_p0.test.cjs', 'merge_eq_preference_bridge.test.cjs', 'eq_tool_preference.test.cjs', 'test_session_library_delete_guard.cjs', 'live2/processor.cjs', 'live2/lifecycle.cjs', 'live2/nailed_coalescing.cjs', 'live2/nailed2_morph_worklet.cjs', 'live2/nailed3_identical_dsp.cjs', 'live2/shared_coefficients.cjs', 'live2/hold_transition_budget.cjs', 'merge/lineage_contract.cjs', 'merge/nodal_ui_contract.cjs', 'merge/hold_eq_session.test.cjs', 'merge/eq_pcm_parity.cjs', 'merge/provenance/test_download_names.cjs', 'merge/provenance/test_m3b0.cjs', 'merge/provenance/test_legacy_origin.cjs']
names+=['bass_identity_preview.test.cjs','bass_tuning_identity.test.cjs','rfl_pitch_identity.test.cjs','forge_pink_transfer.test.cjs','forge_interpretations.test.cjs','carrier_polyphony_r2.test.cjs','t2_geometry_resize.test.cjs','ui_r2_integration.test.cjs']
commands=[['node','build.cjs','--verify'],[sys.executable,'tests/check_runtime_syntax.py']]+[['node','tests/'+n] for n in names]
results=[]
for i,command in enumerate(commands):
 start=time.monotonic()
 try:
  p=subprocess.run(command,cwd=root,env=env,capture_output=True,text=True,timeout=180);code=p.returncode;output=p.stdout+p.stderr
 except subprocess.TimeoutExpired:code=124;output='TIMEOUT'
 log=f'{i:02}.log';(out/log).write_text(output);results.append({'command':command,'exit_code':code,'seconds':round(time.monotonic()-start,3),'log':log})
 print(('PASS' if code==0 else 'FAIL')+' '+' '.join(command),flush=True)
 if code:print(output[-900:],flush=True)
report={'passed':sum(x['exit_code']==0 for x in results),'failed':sum(x['exit_code']!=0 for x in results),'gates':results}
(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['passed','failed']}));sys.exit(bool(report['failed']))
