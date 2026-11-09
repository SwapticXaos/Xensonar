# Teststatus nach Stufe 2b (09.11.2026)

**Basis:** `main` nach Grenzkorrektur, `index.html` unverändert (`aec64584…`). Tests: Oktober-Quellbaum (28.10.), 161 Node-Tests.
Zeitleiste: dieselben Tests gegen Quellbäume von 28.10., 05.11. (Stage05) und W31, alle mit denselben Werkzeugen byte-identisch nachgebaut. Rohdaten: `tests/TEST_TIMELINE_2026-11-09.json`.

| Verlauf 28.10. / 05.11. / W31 / main | Tests |
|---|---|
| grün / grün / grün / grün | 96 |
| grün / rot / grün / grün | 1 |
| grün / rot / rot / rot (rot seit 05.11.) | 38 |
| grün / grün / rot / rot (rot seit W31) | 6 |
| rot / rot / rot / rot (schon im Oktober) | 20 |
| **grün in W31, rot in main** | **0** |

**Keine einzige Regression durch die Arbeiten seit der Übergabe** (DUB-ECHO-04, LIVEPATH-01/02, Quellbaum).

## Automatisch geprüft
97 grüne Tests ohne Browser laufen in der GitHub-Action (`tools/run_tests.sh`, Liste `tests/GREEN_NODE_TESTS.txt`, ca. 15 s). 4 grüne Browser-Tests (`mix_audio_browser`, `ui_visual_restore`, `power_browser_smoke`, `test_stamp_full_browser_p37`) laufen lokal mit Playwright.

## Rote Tests: vorläufige Einordnung (nur aus der Fehlermeldung, nicht einzeln untersucht)

| Klasse | Bedeutung |
|---|---|
| VERHALTEN | Test prüft ein Verhalten, das sich geändert hat: gewollte Weiterentwicklung **oder** Regression; einzeln klären |
| SCHNITTSTELLE | aufgerufene Funktion gibt es so nicht mehr (umbenannt/umgebaut) |
| BROWSER/UI | Browser-Test: Element/Ablauf geändert oder Zeitlimit |
| TESTUMGEBUNG | Test lädt eine feste Dateiauswahl/Fixtures; neuer Code braucht mehr Dateien |

| Klasse | seit | Test | Meldung (main) |
|---|---|---|---|
| VERHALTEN | rot seit 05.11. | `avalanche_axes_load.cjs` | node:assert:150 |
| VERHALTEN | rot seit 05.11. | `avalanche_control.cjs` | node:internal/assert/utils:77 |
| VERHALTEN | rot seit W31 | `avalanche_mod_budget.cjs` | AssertionError [ERR_ASSERTION]: only current final variant published |
| VERHALTEN | rot seit 05.11. | `avalanche_worker_lifecycle.cjs` | AssertionError [ERR_ASSERTION]: pointer-up skips obsolete prepared position |
| VERHALTEN | rot seit 05.11. | `bass_identity_preview.test.cjs` | not ok 1 - direct audition renders saved clip timbre without selecting it or mutating live sound |
| VERHALTEN | rot seit 05.11. | `bass_timbre_contract_p1.test.cjs` | not ok 1 - Bass definition sound captures exactly the seven live DSP controls |
| VERHALTEN | rot seit 05.11. | `eq_tool_preference.test.cjs` | not ok 2 - legacy session EQ restore changes per-source EQ only and leaves global tool preference untouched |
| VERHALTEN | rot seit 05.11. | `forge_interpretations.test.cjs` | not ok 1 - existing interpretations retain distinct musical structures, source identity and chosen track color |
| VERHALTEN | rot seit 05.11. | `forge_pink_transfer.test.cjs` | not ok 1 - Pink transport registers the current carrier and opens interpretation choice instead of inserting a |
| VERHALTEN | rot seit 05.11. | `hard_vinyl_settlement.test.cjs` | not ok 1 - hard Vinyl release commits the reached PCM phase without retargeting or changing attApplied |
| VERHALTEN | rot seit W31 | `merge_clean_flac.cjs` | AssertionError [ERR_ASSERTION]: product export must default diagnostic tones off |
| VERHALTEN | rot seit 05.11. | `merge_pcm2_continuity.cjs` | AssertionError [ERR_ASSERTION]: absent-input silence must occupy its full timeline frames |
| VERHALTEN | rot seit 05.11. | `omega_atomic_voice_ownership.test.cjs` | # node:internal/assert/utils:77 |
| VERHALTEN | rot seit 05.11. | `omega_nodal_dispose_ownership.test.cjs` | # node:internal/assert/utils:77 |
| VERHALTEN | rot seit 05.11. | `omega_voice_lease_renderer_integration.test.cjs` | # AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| VERHALTEN | rot seit 05.11. | `session_bass_drone_p2.test.cjs` | not ok 1 - Quick Save stores instrument Bass Timbre and Drone regardless of the Room Settings checkbox |
| VERHALTEN | rot seit 05.11. | `song_performance_p0.test.cjs` | not ok 1 - same sample can have different Nudge, pan, volume, and EQ per saved song |
| VERHALTEN | rot seit 05.11. | `song_source_config_p2.test.cjs` | not ok 1 - source capture includes detached Current Entrophon settings and all agent pans |
| VERHALTEN | rot seit W31 | `test_integration_p41_rc4_pcm1.cjs` | node:assert:883 |
| VERHALTEN | rot seit 05.11. | `test_melodic_precision_r20.cjs` | node:assert:883 |
| VERHALTEN | rot seit 05.11. | `test_package_selection_contract_p41.cjs` | AssertionError [ERR_ASSERTION]: The input did not match the regular expression /Mindestens/. Input: |
| VERHALTEN | rot seit 05.11. | `test_pcm_capture_merged.cjs` | node:assert:883 |
| VERHALTEN | rot seit 05.11. | `test_runtime_package_trace_p3_15.cjs` | diagnostic ZIP failure { |
| VERHALTEN | rot seit 05.11. | `ui_m1_p3_cleanup.cjs` | node:assert:150 |
| VERHALTEN | rot seit 05.11. | `working_session.test.cjs` | not ok 1 - named active working session reloads latest live source edits without changing the saved row |
| SCHNITTSTELLE | rot seit 05.11. | `avalanche_handlers.cjs` | TypeError: __XenEQ.neutral is not a function |
| SCHNITTSTELLE | rot seit 05.11. | `hold_prefix_safety.cjs` | TypeError: this.holdPrepCopySources is not a function |
| BROWSER/UI | rot seit 05.11. | `test_package_station_browser_p4.cjs` |  |
| BROWSER/UI | rot seit 05.11. | `test_package_station_large_p4.cjs` |  |
| BROWSER/UI | rot seit 05.11. | `test_package_station_selection_p41.cjs` | name: 'TimeoutError' |
| BROWSER/UI | rot seit 05.11. | `ui_side_arrows.cjs` | locator.waitFor: Error: strict mode violation: locator('.xen-performance header button') resolved to 2 element |
| TESTUMGEBUNG | rot seit 05.11. | `avalanche_native_timbre.cjs` | SyntaxError: Identifier '__XenP36SamplePreviewOwner' has already been declared |
| TESTUMGEBUNG | rot seit 05.11. | `avalanche_pcm.cjs` | SyntaxError: Identifier '__XenP36SamplePreviewOwner' has already been declared |
| TESTUMGEBUNG | rot seit 05.11. | `freeze_release_r15.cjs` | Error: ENOENT: no such file or directory, open '/tmp/claude-0/-home-user-xensonar/6556a3f7-e4e9-5ad9-9a41-e75f |
| TESTUMGEBUNG | rot seit 05.11. | `hold_prefix_takeover.cjs` | ReferenceError: __XenNodalSurfaces is not defined |
| TESTUMGEBUNG | rot seit 05.11. | `hold_resident_controller.cjs` | ReferenceError: __XenNodalSurfaces is not defined |
| TESTUMGEBUNG | rot seit W31 | `mix_smoothing.cjs` | ReferenceError: __xenDrumEchoOverlay is not defined |
| TESTUMGEBUNG | rot seit 05.11. | `song_instrument_definitions.test.cjs` | # ReferenceError: __XenNodalHoldPCM is not defined |
| TESTUMGEBUNG | rot seit 05.11. | `song_sources_codec.cjs` | ReferenceError: __XenLiveSampleProfiles is not defined |
| TESTUMGEBUNG | rot seit 05.11. | `source_contract.cjs` | TypeError: Cannot read properties of undefined (reading 'files') |
| TESTUMGEBUNG | rot seit W31 | `test_forge_first_contact_info_r18.cjs` | ReferenceError: __XenMaterialBarsInput is not defined |
| TESTUMGEBUNG | rot seit W31 | `test_forge_meter_r8.cjs` | ReferenceError: __xenAudioMaterialBars is not defined |
| TESTUMGEBUNG | rot seit 05.11. | `test_package_station_independent_p3_13.cjs` | ReferenceError: __xmemMelodicLegacyFence is not defined |
| TESTUMGEBUNG | rot seit 05.11. | `ui_r2_integration.test.cjs` | # Error: ENOENT: no such file or directory, open '/tmp/claude-0/-home-user-xensonar/6556a3f7-e4e9-5ad9-9a41-e7 |
| VERHALTEN | schon 28.10. rot | `__audit_merge_manual_centers.test.cjs` | not ok 1 - P1 song-performance codec accepts v1 and writes v2 with bounded, item-owned placement |
| VERHALTEN | schon 28.10. rot | `eq_nailed3_paint_regression.cjs` | node:assert:883 |
| VERHALTEN | schon 28.10. rot | `expressive_burst_contract.test.cjs` | not ok 2 - stalled hold processor skips stale catch-up and new phase traffic does not change per-sample proces |
| VERHALTEN | schon 28.10. rot | `ld2_layout_browser.cjs` | AssertionError [ERR_ASSERTION]: all three Material lanes must fit without scrolling {"size":{"width":1440,"hei |
| VERHALTEN | schon 28.10. rot | `merge_eq_gesture_lifecycle.cjs` | browserType.launch: Failed to launch chromium because executable doesn't exist at /tmp/claude-0/-home-user-xen |
| VERHALTEN | schon 28.10. rot | `song_performance_p1.test.cjs` | not ok 1 - P1 song-performance codec accepts v1 and writes v2 with bounded, item-owned placement |
| VERHALTEN | schon 28.10. rot | `song_performance_p1_browser.cjs` | page.evaluate: Error: Real starter PCM preparation did not complete |
| VERHALTEN | schon 28.10. rot | `test_forge_export_graphic_wiring.cjs` | node:internal/assert/utils:77 |
| VERHALTEN | schon 28.10. rot | `test_forge_meter_segments_r7.cjs` | node:assert:883 |
| VERHALTEN | schon 28.10. rot | `test_forge_name_anchor_ui.cjs` | node:internal/assert/utils:77 |
| VERHALTEN | schon 28.10. rot | `test_forge_ui_contract_r6.cjs` | node:assert:883 |
| VERHALTEN | schon 28.10. rot | `test_idle_lifecycle_p37.cjs` | Error: Cannot find module '@napi-rs/canvas' |
| VERHALTEN | schon 28.10. rot | `wheel_reversible_browser.cjs` | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| BROWSER/UI | schon 28.10. rot | `avalanche_axes_browser.cjs` | name: 'TimeoutError' |
| BROWSER/UI | schon 28.10. rot | `avalanche_eq_ui_browser.cjs` | name: 'TimeoutError' |
| BROWSER/UI | schon 28.10. rot | `ld2_eq_browser.cjs` | name: 'TimeoutError' |
| BROWSER/UI | schon 28.10. rot | `test_package_station_outputs_p4.cjs` |  |
| BROWSER/UI | schon 28.10. rot | `wheel_original_mandala_browser.cjs` | name: 'TimeoutError' |
| TESTUMGEBUNG | schon 28.10. rot | `hold_resident_browser.cjs` | Error: ENOENT: no such file or directory, open '/tmp/claude-0/-home-user-xensonar/6556a3f7-e4e9-5ad9-9a41-e75f |
| TESTUMGEBUNG | schon 28.10. rot | `omega_particle_selection_epoch.test.cjs` | # ReferenceError: __xenNParamsPublish is not defined |

## Nächste Schritte
1. VERHALTEN-Tests ab 05.11./W31 einzeln prüfen, Audio/Export/Persistenz zuerst (z. B. `merge_pcm2_continuity`, `merge_clean_flac`, `working_session`, `session_bass_drone_p2`, `song_performance_p0`): Regression → eigener Fix-Auftrag; gewollte Änderung → Test begründet anpassen.
2. TESTUMGEBUNG: Dateiauswahl der Tests aus `source-manifest.json` ableiten statt fester Listen.
3. Die schon im Oktober roten 20 Tests nur bei Bedarf.

## Einzeln geklärt (09.11.2026)

| Test | Befund | Beleg | Maßnahme |
|---|---|---|---|
| `merge_pcm2_continuity` | **gewollt** (LM01/MRU01): Rekorder-Worklet startet erst auf eine `start`-Nachricht (sample-genauer, geplanter Start für Loop-Rec-Grenzen). Der Test fütterte Audio vor Ankunft der Nachricht → 128 Samples fehlten. | Mit `await drain()` nach `start()` besteht der vollständige Test (exakte Float32/WAV-Daten, Stille, Recycling, Aufräumen). | Test angepasst, in CI |
| `merge_clean_flac` | **gewollt** (MRU01/FF01): `downloadFlac` hat zusätzlich `bitDepth` (24-Bit-FLAC); Dateiname `-${bitDepth}bit-diagnostic-sync.flac`. Diagnose-Töne bleiben standardmäßig aus. | Vertrag unverändert, nur Text-Signatur. | Test angepasst, in CI |
| `test_pcm_capture_merged` | **gewollt** (W31/MRU01): Rekorder-Aufruf hat zwei zusätzliche Argumente (Status, Langzeit-Speicher). | Rest des Tests besteht unverändert. | Test angepasst, in CI |
| `test_integration_p41_rc4_pcm1` | wie oben | wie oben | Test angepasst, in CI |
| `working_session`, `session_bass_drone_p2`, `song_source_config_p2` | **nicht aussagekräftig in Isolation**: Die Tests schneiden einzelne Besitzer-Objekte aus dem Code; seit November hängen diese an vielen weiteren Funktionen, teils im minifizierten Kern. Automatisches Nachladen der Abhängigkeiten wurde versucht (bis zu 20 Definitionen), bleibt aber wackelig. | Fehlschläge wären vom Testaufbau verursacht, nicht von der App. | Tests auf Oktober-Stand belassen; Prüfung des Speicherverhaltens stattdessen als Browser-Ende-zu-Ende-Test vorgeschlagen |

**Muster:** Viele Oktober-Tests sind Quelltext-Verträge (exakte Code-Zeichenketten). Weiterentwicklung bricht sie, ohne dass sich das Verhalten ändert. Bei solchen Tests wird der Vertrag geprüft, nicht der Wortlaut.
