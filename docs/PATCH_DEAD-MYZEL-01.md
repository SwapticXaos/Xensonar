# DEAD-MYZEL-01: alte Mycelium-Farbstimme (toter Code) entfernt

Zone: **WARM/HEISS-Steuerung** (Myzel-Steuerschleife auf dem Hauptthread), entfernt wurde nur nie ausgeführter Code.

## Beweis, dass der Pfad tot war
- Die alte Farbstimme `vpe` lief nur im aktiven Zweig von `Ape` (`src/rhythm/02_bass_and_rack.js`). Bedingung: Live-Power an, `myzelEnabled` an, Modus nicht `installation`.
- `Tpe` übergibt `Ape` aber `myzelEnabled && !installationAudible`, und `installationAudible = myzelEnabled && installationSoundEnabled` (`src/app/forge/01_room_shell.js`).
- `myzelEnabled` und `installationSoundEnabled` starten beide `false` und werden an **allen fünf** Stellen nur gemeinsam auf denselben Wert gesetzt: Mycelium-Knopf (`toggleMyzelEnabled`), Nodal-Autostart, Verlassen von Nodal, Session-Wechsel (`mycelium-session-engaged`), kalter Raum. Damit ist die an `Ape` übergebene Bedingung immer `false`.
- Gegenprobe im Browser (TS-MOD-01): auch im Stand **vor** NODAL-AUTOSTART-01 lief `vpe` in keinem erreichbaren Zustand.

## Was entfernt wurde
- Der aktive Zweig von `Ape` (rAF-Schleife mit `vpe`). Der Park-Zweig bleibt mit denselben Abhängigkeiten, weil alte Myzel-Knoten anderswo noch entstehen können (`ensureMyzelSynth` beim Vorwärmen) und weiterhin geparkt werden müssen.
- Danach von `tools/slim/dead_code.cjs` als beweisbar unerreichbar gefunden und entfernt: `vpe`, `fpe`, `cpe`, `xH`, `ppe`, `bpe`, `Mi`, `ope`, `$o`, `Co`, `q4` (`src/rhythm/02_bass_and_rack.js`), `Qae`, `ru` (`src/runtime/instrument/07_interpreters_and_installation.js`). Zweiter Durchlauf: 0 weitere.
- Die Rechenfunktionen der Modulationsmatrix (`deriveNodalModSourceValues`, `evaluateNodalModulationMatrix`) haben damit keinen Aufrufer mehr in der App. Sie bleiben im typisierten Modul (Export, Paritätstest); die Beschriftungen und Standardrouten werden weiter in Art Installation angezeigt.

## Werkzeugfehler unterwegs gefunden und behoben
`dead_code.cjs --apply` schrieb die **übersetzte** Fassung zurück über `src/ts/nodal/nodalModulationMatrix.ts`. Sofort aus Git wiederhergestellt; `tools/slim/page.cjs` schreibt `.ts`-Quellen jetzt nie zurück (vorher nur abgesichert, wenn eine Löschung die Datei selbst traf).

## Messwerte und Prüfung
- `index.html` 8 347 191 → **8 333 504 Bytes (−13 687)**, sha256 `3523e8d9…`.
- `run_tests.sh` 138/138, `slim_undefined_names` ohne neue Namen, `dead_code.cjs` findet nichts mehr, Typprüfung OK, `run_e2e.sh --fast` 77 grün, 0 rot, 0 flaky.
- Klang: Der entfernte Code lief nie, also keine Klangänderung erwartet. Kein PCM-Vorher/Nachher gemacht. **Nicht gehört.**

Rollback: `602fc2d`.
