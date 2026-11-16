# LOOP-TRIM-PERSIST / VARIANTE-EN / MORE-CHOICES

Parent: `319d187`. Zone: WARM (Oberfläche, Session-Restore); Variante-Texte KALT (lazy Raum). Status: CODE_PRESENT, BROWSER_CHECKED, nicht auf Gerät.

- **Loop-Trim (Quick Rack, Material Track):** Die Bar-Bearbeitung (Daten-Owner `__XenRackLiveBarEdits`, Session-Feld `loopBarEdits`) wurde gespeichert, aber `hydrate` fand für Starter-/Demo-Material kein Audio (lazy PCM, „Original loop data missing“): nach Reload blieb die Absicht, die getrimmte PCM fehlte, der Loop klang untrimmt. Jetzt fordert `hydrate` das Starter-Audio an (`__XenStarterMaterial.ensure`).
- **Variante auf Englisch:** Texte in `tools/variante/**` übersetzt, Chunk mit `node tools/port_variante.cjs` neu erzeugt. Tastenbezeichnungen (ß/Ü) bleiben.
- **More choices here:** Das grüne „(More choices here)“ beim Resident System war nur ein Text. Jetzt ein Button (öffnet Nodal Center, scrollt zu den Resident-Reglern; `<label>` -> `<div>`, damit der Label-Klick nichts auslöst). Der untere, doppelte Link ist entfernt (Nutzerentscheidung).
- Test: `tests/e2e/loop_trim_and_more_choices.cjs` (auf Parent rot). `run_tests.sh` 128/128, `build.py --check` OK. `run_e2e.sh` nicht komplett gelaufen.

## ROOM-ORDER-01 (Psy Lab <-> Multitrack)
Header: IV PSY LAB, V MULTITRACK (vorher IV Multitrack, V Psy Lab), Ziffern, Tooltips, Raumtitel und Verweise („Room IV · Multitrack“ -> „Room V“, Psy-Lab-Text „Room IV“) angepasst. Reihenfolge nur in der Header-Leiste (`05_timing_and_admission.js`); Raum-IDs (`MULTITRACK`, `PSYLAB`) unverändert, keine Daten betroffen. `run_tests.sh` 128/128; Raum-E2E-Tests (Loop-Rec-Lanes, MTW-01/02/04, Playhead) grün. Alte Kommentare/Patchdokumente nennen weiter die alten Raumnummern.

## BAR-METER-LIVE (Taktometer folgt der Loop Mask beim Ziehen)
Befund: Im Wave Editor sprang das Taktometer (Cyan-Rahmen, Takte 1..n) erst beim Loslassen auf die neue Auswahl; in der Import-Ansicht folgt es live (Messung mitten in der Geste: Import 419/599/719 px, Editor 1199/1199/1199, danach 719). Ursache: die Geste der Loop Mask (`src/post-oct/015-xen-wave-editor-w01-modules.js`, Zeigerhandler mit `gesture.active`) meldete die Auswahl (`applySelection` -> `onSelection`) nur im `up`. Jetzt einmal pro Frame während des Ziehens (wachsen und schrumpfen); Golden Move behält sein Commit beim Loslassen. Zone WARM. Test `tests/e2e/wave_meter_live.cjs` (auf Parent rot). `run_tests.sh` 128/128. Nicht gehört/gedrückt von Hand.

## WAVE-LOOP-01 (Loop-Knopf im Wave-Editor-Kopf)
`▶ Loop` steht zwischen `▶ Play` (einmal) und `Close ×`. Kein neuer Wiedergabeweg: der Knopf löst dieselbe Vorschau aus wie der große PLAY (Preview Loop, `togglePreview` des Forge-Panels); der große PLAY zeigt währenddessen „Stop“, der Loop-Knopf „■ Stop“. Ein eigener Loop-Code im Editor wurde verworfen (Doppelstruktur). Änderung: 9 Zeilen (`lab.js`, `015-xen-wave-editor-w01-modules.js`). Test `tests/e2e/wave_loop_button.cjs`; `run_tests.sh` 128/128. Nicht gehört.
