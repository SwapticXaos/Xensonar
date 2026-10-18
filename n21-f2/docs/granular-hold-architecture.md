# N21–F2: Architektur vor dem Granular-Hold-Patch

Basis: hochgeladenes `XenSonar_N21_F2_Merge_Schlanke_Quellen_NEU.zip`.
`node build.cjs --verify` reproduziert 5.484.078 Byte mit SHA-256
`83115d6e635efcb8f834a992d33b205b71e36859679ac24116d73fa51757b62a`.
Die ältere 3.1.6-React-Struktur im übergeordneten Checkout ist keine Patchbasis.
Die abweichende Ahnenbeschreibung in der alten ZIP-Übergabe wird nicht als
neuer Merge-Auftrag interpretiert; maßgeblich ist die vom Nutzer gelieferte Basis.

## Inventarisierte produktive Pfade

- Sample: `src/audio/05_live_voice_runtime.js`, `Ixe` (direkte manuelle
  Tastatur/Welle), `XW` → asynchrones `dAe` → `TF` (Sample-Cache), `vg`
  (vorhandene Stimmung/Abspielrate), native BufferSource, HP/LP/Pan/Master.
  `activeScheduledTonesRef` hält das selektive Voice-Gate und die Admission-Lease.
- Apostroph: `Xxe`/`Yxe` im selben Modul; `Zke` in
  `src/rhythm/04_workspace_and_transport.js` besitzt den Hold-Zustand,
  `src/app/forge/01_room_shell.js` verbindet Hotkeys mit Audiokontext und Stimmen.
- Ende: `__xenCutLiveScheduledTones`, `__xenLiveLengthRevision`, `ese` in
  `src/runtime/instrument/10_entrophon_and_voice_control.js`; Revision verhindert
  verspätete Starts nach Key-Up. Nodal/C11 besitzen eigene selektive Releases.
- RFL-Samples: `vbe` → `Sbe`/`bbe` in `src/audio/01_voice_and_rfl_ownership.js`;
  Transport in `src/audio/03_rfl_transport_legacy.js`. `i6`/`_ne` planen Grains,
  `zne`/`$P` fenstern sie, `c6` rendert native Grains mit Hann-Fenster `s6`.
  Diese gemeinsamen Bausteine liegen in
  `src/runtime/instrument/05_timing_and_admission.js`.
- Granular Manager: `src/runtime/instrument/11_recording_and_granular_controls.js`
  bedient die RFL-Qualität/Presets; `Fw`, `vG`, `nW` und der Settings-Cache
  (`src/audio/00_rfl_settings_cache.js`) übersetzen sie in Scheduler-Parameter.
  Es gibt keine verifizierte Klasse namens `GranularManager`.
- RFL-Resident-/Workletpfade: `a6`, `Nne`, `src/audio/02_rfl_worklet.js`;
  diagnostischer Wave-Sample-Worklet in `src/audio/04_wave_worklet.js` ist kein
  Ersatz für den selektiven manuellen N21-Samplepfad.

## Entscheidung

Schlanke Erweiterung der vorhandenen `i6`/`_ne`-Planung um eine optionale
Quellpositionsfunktion; Wiedergabe über unverändertes `c6`/Hann-Fenster.
Ein separater manueller Lookahead-Owner steuert ausschließlich gehaltene
Sample-Voices. Er verändert weder RFL-Uhr noch dessen globale Manager-Einstellungen.
Normale Samples bleiben bis zum Hold auf dem bisherigen direkten Signalpfad.
Hold übernimmt aktuelle Quellposition und bestehenden Grain-Pitch, bremst nur die
Quellpositionskurve ab und überblendet den ursprünglichen BufferSource-Pfad.
Am Rand wird der lesbare Bereich begrenzt; Release beendet das Scheduling vor
dem kurzen Master-Fade und räumt Grains/Lease einmalig auf.
