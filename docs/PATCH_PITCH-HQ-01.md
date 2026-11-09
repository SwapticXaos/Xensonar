# PITCH-HQ-01: Materialspur-Pitch als vorgerenderte, elastische Schleife

Anlass: Nutzer hört den Materialspur-Pitch „körnig“. Befund und Messungen: `docs/PITCH_ENGINES_BEFUND_2026-11-09.md`.

| | |
|---|---|
| Basis | MATERIAL-LANE-01 (USER_ACCEPTED), `index.html` 8 564 693 Bytes, SHA-256 `351f46c064f404c02a11a3ecaff4fcb79c2c333aeeaa2f67b90cd384124b2c8f` |
| Ergebnis | `index.html` 8 576 290 Bytes, SHA-256 `5285bcdeda8353f704a0bb2b6bbe1b16ac89d3fa16c8962f13d5003bf0d7fd65`, Commit `5dbce82` |
| Größenzuwachs | **+11,6 KB**. Davon ca. 5 KB Worker-Code als Text (wird erst im Worker ausgeführt) und ca. 3,5 KB Owner. Nichts davon läuft beim Start. |
| Zone | Startpfad der Materialspur (HEISS · Steuerung, einmal pro Start) und **KALT** (Rendern im Worker). Im Audio-Thread läuft im Ruhezustand **weniger** als vorher: Der Echtzeit-Shifter geht bei Abweichung 0 in den exakten Bypass. |
| Daten-Owner | Neu: `__XenMaterialPitchVariants` (Varianten pro dekodiertem Quellpuffer, `WeakMap`, nichts persistiert). Gemeinsam genutzt: `__xenOSQRPCMWorker` (One-Shot-Offline-Worker, gleicher Worker, gleiches Budget), weitergereicht als `__xenSharedOfflinePCMWorker`. Unverändert: `__XenMaterialVoiceMix` (Pitch-Wert, Song Save). |
| Status | CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium, Messplätze). **Nicht:** Abhören, Gerätetest, Firefox/Safari, drei Spuren gleichzeitig mit Pitch, USER_ACCEPTED, Netlify. |

## Verhalten

1. **Während der Pitch-Regler bewegt wird:** sofortige Vorschau über den bisherigen Echtzeit-Shifter (unverändert).
2. **Ruht die Hand 350 ms:** Die Schleife (Loop-Bereich) wird im Offline-Worker in hoher Qualität verstimmt: zeiterhaltend, 80-Tap-Sinc, zyklisch und nahtlos, Pegel 1,0, Korrelationsausrichtung für gehaltene Klänge, Transientenschutz.
3. **Fertig:** Die Spur wird über den vorhandenen phasenerhaltenden Neustart (wie bei Nudge/ATT) mit der Variante neu aufgebaut. Der Echtzeit-Shifter deckt nur noch die Differenz Regler − Variante ab, im Ruhezustand also 0 (exakter Bypass).
4. **Zurück auf 0:** Die Variante wird freigegeben, das Original läuft.
5. **Grenzen:** Schleifen, deren Render-Auftrag das Worker-Budget (48 MB je Auftrag, d. h. etwa 30 s Stereo bei 48 kHz) übersteigt, und sehr kurze Schleifen (< 30 ms) behalten den Echtzeitweg. Bei vollem Worker wird nach 1,2 s erneut versucht.

## Quelländerungen

- `src/mix/03_quick_menu__before_eq-core.js`
  - Im Worker-Code (`__xenOSQRWorkerCode`): neue Funktion `xenRenderLoop` und eine Weiche `d.loop===true`. Der One-Shot-Pfad ist unberührt (Messwerte bitgleich, s. u.).
  - `__xenSharedOfflinePCMWorker`: Referenz auf den vorhandenen Worker-Owner.
  - Owner `__XenMaterialPitchVariants`, Diagnose `globalThis.__XEN_MATERIAL_PITCH_HQ__.state` (nur lesend).
- `src/audio/01_voice_and_rfl_ownership.js`
  - `$fe`: Variante auflösen (`resolve`), Pitch-Knoten mit Restabweichung, `__xenPitchBaseCents` am Knoten.
  - `__xenBindMaterialPitch` / `__xenMaterialSetVoicePitch`: ziehen den Basiswert ab.
  - Primär- und Parallelspuren: Neustart bei neuer Variantenversion.
  - Pitch-Diagnose meldet jetzt die tatsächlich angewendete Restabweichung (`pitchCents`) und `renderedCents`.

Diff gegen die Basis: nur Script-Block 12; 32 Scripts / 77 Styles; Syntax wie Basis.

## Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `pitch_loop_bench.js` (Schleifen-Render, faire Testtöne) | Mitte der Schleife −49 bis −66 dB Fremdanteil (Echtzeit-Shifter: um −20 dB), Pegel 0,99–1,00. Naht bei periodischer Quelle −41 bis −62 dB; springt die Quelle selbst an der Naht, bleibt der Sprung etwa gleich. Renderzeit: 2-s-Schleife ca. 0,1 s, 28-s-Schleife ca. 1,3 s (im Worker). |
| `pitch_engine_bench.js` One-Shot-Pfad | Ergebnisse vor/nach bitgleich (Prüfwert `6148f5c85568`). |
| `material_chain_probe.js` (echtes Layout) | Regler 55,4 Cent: Vorschau 55,4 → nach Ruhe Variante 55,4 aktiv, Echtzeit-Shifter **0**. Pegelüberwachung über den Wechsel: 120–122 Messpunkte, **keine Aussetzer**. Pan bleibt 0,89, Pegel wie vorher. Regler auf Minimum (−100): Variante −100, Shifter 0. Zurück auf 0: keine Variante aktiv, Shifter 0. Keine Seitenfehler. |
| `livezone_probe.js` | alle 13 Schritte unverändert |

## Offene Risiken

- **Abhören nötig:** Übergangsmoment (phasengleicher Neuaufbau, wie bei Nudge), Klang der Variante bei verschiedenen Materialien, perkussives Material (Transientenschutz schaltet die Ausrichtung ab).
- Naht bei Quinten etwas schwächer als die Schleifenmitte (ca. −41 dB gegenüber −54…−60 dB).
- Der Root-Follow-Pitch-Regler nutzt weiterhin den Echtzeit-Shifter. Er lässt sich nicht vorrendern, weil Root Follow live dem Grundton folgt. Nächster Schritt: Pitch-Versatz in die Root-Follow-Grain-Engine (Granular Manager) verlegen.
- Der Offline-Worker wird mit den One-Shot-Fills geteilt. Gleichzeitige Vorbereitungen warten aufeinander (bis 8 Aufträge, 96 MB).

## Rückweg

MATERIAL-LANE-01 (`351f46c0…2c8f`). Im Quellbaum: den Commit dieses Patches zurücknehmen und `python3 tools/build.py` ausführen.
