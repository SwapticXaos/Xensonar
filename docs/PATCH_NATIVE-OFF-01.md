# NATIVE-OFF-01 · Experimente für ein natives Begleitprogramm entfernt

Parent: `8edbb24` (VOICE-HOST-01; `index.html` 9 134 671 Bytes). Rollback: `8edbb24`.
Neu: `index.html` 9 012 352 Bytes (**−122 319 Bytes**), sha256 `b46d0572b46209b1241770002c70cf83fb215f1230c8cbdcc8af86734ed1e4f2`.
Zone: Steuerung der Wave-Starter-Anschläge (WARM/HEISS-Grenze); der normale Klangweg ist unverändert.
Status: CODE_PRESENT, BROWSER_CHECKED (headless Chromium, ganze Browser-Suite). Nicht gehört.

## Warum
Nutzerauskunft (14.11.2026): Ein Begleitprogramm auf dem Rechner wird nicht benutzt; die nativen Wege waren Experimente aus der Zeit, bevor die Worklets zuverlässig liefen. Heute läuft alles über Browser-Audio und Worklets.

## Entfernt (alles war nur über Adress-Parameter erreichbar, standardmäßig aus)
| Experiment | Schalter | Inhalt |
|---|---|---|
| nativer Begleiter „XNC“ | `?xnc=1`, `waveDirectOwner=xnc` | WebSocket-Client zu `ws://127.0.0.1:47812`, Besitzer-Wechsel |
| nativer Wave-Starter-Pilot | `?nativeWaveStarter=1`, `waveDirectOwner=native-pilot` | Laden nativer Skripte, Pilot-Panel |
| natives RFL-Material | `?nativeRflMaterial=1` | HTTP zu `127.0.0.1:32185` |
| XRG-Governor | `waveDirectOwner=xrg` | Governor-Worklet (31 KB Quelltext), SharedArrayBuffer-Ring |
| Post-Master-Stream | `?postMasterPcm=1` | Abgriff-Worklet und Stream an den Begleiter |
| B5-Drum-Diagnose | `?bdrumB5=direct|master` | eigener Drum-Worklet als Diagnose |
| Wahl-Schalter | `waveDirectOwner=legacy|c11`, `browserWaveStarter=0` | Umschalten zwischen den Wegen |

Geblieben: der Browser-C11-Weg für Wave Starter und Keyboard, mit dem bisherigen Rückfall auf den klassischen Weg, wenn er nicht bereit ist. Die Wahl ist jetzt eine Zeile (`kCe`).

## Wie
Die zentrale App-Funktion (`REe`, `src/app/forge/01_room_shell.js`) ruft die Experiment-Hooks nicht mehr auf; die Anschlagsverteilung (`RCe`, `src/audio/07_governor_and_drums.js`) kennt nur noch C11 und den klassischen Weg. Was danach unerreichbar war, hat `tools/slim/dead_code.cjs` beweisbar gelöscht (vier Durchgänge bis 0).

**Neue Sicherung:** `tools/slim/undefined_names.cjs` (Test `tests/slim_undefined_names.cjs`, in der GitHub-Action) meldet jeden Namen, der benutzt, aber nirgends definiert wird. Anlass: Eine von Hand entfernte Funktion hatte einen zweiten Aufrufer; der Browser-Test fand es, die neue Prüfung findet es jetzt vorher (Gegenprobe gemacht). Bekannte, zur Laufzeit abgesicherte Namen stehen in `tools/slim/undefined_baseline.txt`.

## Tests
`build.py --check` OK, `run_tests.sh` 120/120 (neu: Namensprüfung), Browser-Suite alle Läufe grün (`grid_drag_selection` einmal wackelig, wie dokumentiert; danach 3/3 grün).

## Offene Risiken
- Nicht gehört. Wave Starter und Keyboard laufen wie vorher über C11; beim allerersten Anschlag vor dessen Bereitschaft über den klassischen Weg.
- Wer die alten Adress-Schalter benutzt hat, bekommt jetzt immer den Standardweg.
