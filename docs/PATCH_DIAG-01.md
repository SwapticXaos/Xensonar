# DIAG-01 · Auslieferung ohne Diagnoseschichten, Diagnose-Fassung auf Wunsch

Parent: `9c45e0b` (NATIVE-OFF-01; `index.html` 9 012 352 Bytes). Rollback: `9c45e0b`.
Neu: `index.html` 8 926 315 Bytes (**−86 037 Bytes**), sha256 `aabaf57e7a52cb2f99b1ad850a67643c1cce745d4913275309e74c46318fec45`.
Zone: KALT (Diagnose, Testlabore). Status: CODE_PRESENT, BROWSER_CHECKED (ganze Browser-Suite auf der neuen Auslieferung). Nicht am Gerät gesehen.

## Was
Zwei Fassungen aus denselben Quellen:
- **`index.html` (Auslieferung)**: ohne Diagnoseschichten.
- **`dist/XenSonar_DIAG.html`** (`python3 tools/build.py --diag`): dieselbe App mit allen Diagnoseschichten; byte-gleich mit der bisherigen Vollfassung.

Im Manifest sind Diagnose-Abschnitte mit `"diag": true` markiert; der Build lässt sie samt `<script>`-Element weg. Markiert sind:
| Abschnitt | Was er tat | Zugriff aus der App |
|---|---|---|
| Render-Monitor (`?xenMonitor`) | Render-Kapazität messen, Oversampling-Deckel per Adresse | nur abgesichert (`?.`); der Oversampling-Standard bleibt „4x“ wie bisher |
| Startup-Observer | Ladezeiten in `__XenStartupDiagnostics` | keiner |
| Opera-Power-Diagnose D3 | Power-Mitschnitt | nur abgesichert; der Schalter im Diagnose-Panel zeigt dann „aus“ |
| LCR-1B-Sammler | Mitschnitt von Messwerten (opt-in) | keiner |
| XMEM-ROOT-01, XMEM-02A/B/C/D1 | Speicher-Testlabore, nur mit Testflag aktiv | nur hinter dem Testflag |

**Nicht** markiert, weil Nutzerfunktion oder Teil der App: Boot-Steuerung (Startanzeige), ML-IDB01 (Speicherung neuer Melodic-Projekte), Rezept-Export, Wissensraum-Effekt, NO-SIGNAL-Anzeige.

Die Analysewerkzeuge (`tools/slim/page.cjs`) prüfen jetzt genau die Auslieferung; `XEN_DIAG=1` prüft die Diagnose-Fassung. Test `tests/build_flavours.cjs`: Auslieferung = Diagnose-Fassung minus genau die markierten Abschnitte.

## Tests
`build.py --check` OK, `run_tests.sh` 121/121, Browser-Suite 43/43 grün auf der Auslieferung; keine undefinierten Namen.

## Offen
In die React-Oberfläche eingewobene Diagnose (Runtime-Diagnose-Panel, Sound-Path-Inspector, Forensik-Zähler) ist noch in beiden Fassungen. Das Herauslösen braucht Markierungen im Code und ist eine eigene Stufe.
