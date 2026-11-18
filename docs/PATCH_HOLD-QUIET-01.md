# HOLD-QUIET-01 · Klassische Klänge auf der Hold-Uhr auch bei leisem Pegel

**Zone:** HEISS (Stimmenzulassung beim ersten Anschlag einer gehaltenen Taste; der Audiopfad selbst ist unverändert).
**Datei / Owner:** `src/audio/05_live_voice_runtime.js`, `nq` (Teiltöne eines Wave-/Keyboard-Anschlags). Owner der Hold-Übernahme bleibt `__XenHoldResident`.
**Größe:** `index.html` +310 Bytes.

## Befund (Nutzer 18.11.)
Klassische Klänge (FM Bell, Steel Pan, Velvet Bloom …) stotterten auch bei Exact wie bei Loose; lokal und über den Deploy verschieden.

## Ursache
- Die Stimmenzulassung (`beginEvent`) gibt leisen Anschlägen (Intensität < 0,42) nur 80 % der angeforderten Stimmen. FM Bell hat 3 Teiltöne, ein leiser Anschlag bekommt also 2. Das gilt schon ohne jede Last (gemessen: `max=2 req=3 load=0.00`, Intensität 0,30).
- `nq` zählte den bewusst weggelassenen dritten Teilton als „unvollständig“. Die Hold-Uhr lehnte die Übernahme ab, und der Hauptthread spielte jeden Schritt (gemessen: 22 von 22 Schritten vom Hauptthread, 9 Ablehnungen).
- Der Pegel liegt in den Browserdaten pro Adresse. Liegt er auf der einen Seite über 0,42 und auf der anderen darunter, läuft derselbe Klang einmal über die Uhr und einmal stotternd über den Hauptthread.
- Die Regel stammt aus THUNDER-ONE (15.11.). Der damalige Test prüfte nur Entrophon.

## Änderung
Die Zahl der zugelassenen Stimmen (`maxVoices` des Anschlagsplans) geht als `voiceCap` an `nq`. Ein Anschlag, der genau seine ersten `cap` Teiltöne bekommen hat, gilt als vollständig. Die Uhr wiederholt dann genau die Note, die auch der Hauptthread spielen würde. Jede andere Lücke bleibt „unvollständig“ und behält den Hauptthread als Owner, wie bisher.

## Messung (Lautsprecherausgang, FM Bell gehalten, Taste i, 108 BPM, 16 Schritte/Takt, je 2 Läufe)
| | rms | Klangschwerpunkt | Schrittabstand | Streuung |
|---|---|---|---|---|
| vorher | 0,079 / 0,082 | 545 / 541 Hz | 129 / 136 ms | 36,9 / 35,8 ms |
| nachher | 0,079 / 0,074 | 537 / 503 Hz | 128 / 125 ms | 2,5 / 9,6 ms |
Pegel und Klangfarbe gleich, gleiche erfasste Bausteine (2 je Anschlag), Schritte gleichmäßig. Nicht gehört.

## Tests
- Neu: `tests/e2e/hold_quiet_classic.cjs` (die THUNDER-ONE-Prüfungen mit FM Bell): rot auf dem Parent (Hauptthread 22/22), grün danach.
- Ebenfalls grün: `thunder_one_clock` (Entrophon), Build-Check, `run_tests.sh` 133/133, `run_e2e.sh` (siehe Status).

## Nicht enthalten: Obertons-Arpeggio
Ist das Obertons-Arpeggio an (Modus Arp/Hybrid), bleibt der Hauptthread Owner. Die Arpeggio-Töne laufen als WebAudio-Oszillatoren (`source:"other"`), nicht über C11, und lassen sich deshalb nicht in die Hold-Aufnahme legen. Auf die Uhr kämen sie nur mit einem Wechsel der Klangerzeugung zu C11; das ist ein eigener Schritt mit Audiovergleich. Ein Versuch in dieser Sitzung wurde vollständig zurückgenommen.

Rollback: den Commit vor diesem Patch nehmen (siehe `git log`).
