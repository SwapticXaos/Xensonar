# LOOP-TRIM-PERSIST / VARIANTE-EN / MORE-CHOICES

Parent: `319d187`. Zone: WARM (Oberfläche, Session-Restore); Variante-Texte KALT (lazy Raum). Status: CODE_PRESENT, BROWSER_CHECKED, nicht auf Gerät.

- **Loop-Trim (Quick Rack, Material Track):** Die Bar-Bearbeitung (Daten-Owner `__XenRackLiveBarEdits`, Session-Feld `loopBarEdits`) wurde gespeichert, aber `hydrate` fand für Starter-/Demo-Material kein Audio (lazy PCM, „Original loop data missing“): nach Reload blieb die Absicht, die getrimmte PCM fehlte, der Loop klang untrimmt. Jetzt fordert `hydrate` das Starter-Audio an (`__XenStarterMaterial.ensure`).
- **Variante auf Englisch:** Texte in `tools/variante/**` übersetzt, Chunk mit `node tools/port_variante.cjs` neu erzeugt. Tastenbezeichnungen (ß/Ü) bleiben.
- **More choices here:** Das grüne „(More choices here)“ beim Resident System war nur ein Text. Jetzt ein Button (öffnet Nodal Center, scrollt zu den Resident-Reglern; `<label>` -> `<div>`, damit der Label-Klick nichts auslöst). Der untere, doppelte Link ist entfernt (Nutzerentscheidung).
- Test: `tests/e2e/loop_trim_and_more_choices.cjs` (auf Parent rot). `run_tests.sh` 128/128, `build.py --check` OK. `run_e2e.sh` nicht komplett gelaufen.

## ROOM-ORDER-01 (Psy Lab <-> Multitrack)
Header: IV PSY LAB, V MULTITRACK (vorher IV Multitrack, V Psy Lab), Ziffern, Tooltips, Raumtitel und Verweise („Room IV · Multitrack“ -> „Room V“, Psy-Lab-Text „Room IV“) angepasst. Reihenfolge nur in der Header-Leiste (`05_timing_and_admission.js`); Raum-IDs (`MULTITRACK`, `PSYLAB`) unverändert, keine Daten betroffen. `run_tests.sh` 128/128; Raum-E2E-Tests (Loop-Rec-Lanes, MTW-01/02/04, Playhead) grün. Alte Kommentare/Patchdokumente nennen weiter die alten Raumnummern.
