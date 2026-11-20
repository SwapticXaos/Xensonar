# DONOR-MASK-01 · Spectral Forge: der Donor nimmt, was in der lila Maske liegt

Parent: `3f0a549` (`index.html` 8 344 248 B). Jetzt 8 344 848 B (**+600 B**). Zone: KALT (Donor-Auflösung bei Klick, kein Audiopfad, keine Persistenz). Status: CODE_PRESENT, BROWSER_CHECKED. **Nicht gehört.**

## Befund (Nutzermeldung)
Ein Carrier (schon mit Donor) per Send to Editor in den Wave Editor, dort Echo, Hochpass, Verzerrung, Kopieren, mehrfach Undo, Mix Paste, dann neuer Carrier und „Donor anwenden“: Meldung „bitte aus der Donor-Library oder importieren“, obwohl die lila Maske etwas zeigte.

Die Auflösung (`xensonar:forge:resolve-last-donor`, `src/rooms/lab.js`) nahm die Maske nur an, wenn `mask.durationSec` endlich und > 0 war; sonst fiel sie auf „keine Maske“ und warf genau diese Meldung. Das Material (woher die Quelle stammt) spielte keine Rolle: reproduziert mit einer Maske der Länge 0 im Material-Intake (Parent: `ERR Please select a donor mask below or load an entry from the Donor Library.`). Ein reproduzierender Klickweg über Effekte/Undo/Mix Paste allein fand sich nicht (Carrier, Echo/Hochpass/Verzerrung/Gain gebacken, Kopieren, Undo ×3, Mix Paste, neuer Carrier: Donor jedes Mal angenommen), die Maske mit Länge 0 ist die einzige gefundene Bedingung, unter der die sichtbare Quelle abgelehnt wird; wie sie im Alltag entsteht (Caret/Auswahl nach Undo oder Mix Paste), ist nicht belegt.

Zweiter Weg zur selben Art Meldung („Select a purple donor mask in Sound Material or load a donor from the library.“, `__f3562EnsureDonor`): Das Sound-Material-Panel meldet seinen Resolver bei jeder Änderung von Quelle oder Maske ab und neu an; eine Anfrage in dieser Lücke galt als nicht bearbeitet.

## Änderungen
- **Maske ohne brauchbare Länge** (0, NaN, nicht endlich) gilt nicht mehr als „keine Maske“: der Donor nimmt den Anfang der Quelle, höchstens die 8 s, die die Donor-Analyse liest. Die Analyse bekommt diese korrigierte Maske (nicht die leere). Eine gültige Maske wird unverändert genutzt; 25 ms bis 8 s bleibt (eigene Meldung).
- **Resolver-Lücke:** `__f3562EnsureDonor` fragt einmal nach 120 ms erneut, bevor es meldet.
- Keine Migration, keine Änderung an Bibliothek oder gespeicherten Daten.

## Test
`tests/e2e/donor_mask_accept.cjs` (Parent rot: Maske-0 liefert die Meldung): Send to Editor → Donor angenommen; Maske der Länge 0 → angenommen; Anfrage in der Resolver-Lücke → angenommen. Grün außerdem: `preview_click`, `send_figure_no_hearing`, `dual_donor_aligned`; `run_tests.sh` 139/139, `build.py --check` OK.

## Offen
- Playhead blau/lila (Editor-Playhead im Überblick vs. Loop Mask): nicht untersucht; die Quelle des Versatzes ist unbekannt. Bitte Ablauf (Play im Editor oder Preview Loop, vorher Zoom/Schnitt?).

Rollback: `3f0a549`.

---

# DONOR-MASK-01b + PLAYHEAD-SCALE-01 (Folgeauftrag, gleiche Sitzung)

Parent: `99cefe4` (`index.html` 8 344 848 B). Jetzt 8 345 318 B (**+470 B**). Zone: WARM (Anzeige) / KALT (Meldung). Status: CODE_PRESENT, BROWSER_CHECKED. **Nicht gehört.**

## Rückmeldung zu DONOR-MASK-01
Die Nutzermaske war nicht leer, nicht zu kurz und nicht zu lang (mit verschiedenen Längen geprüft). Die Länge-0-Korrektur oben ist also ein anderer Fix; die Ursache der gemeldeten Ablehnung bleibt offen. Gefunden: dieselbe Meldung kann aus **drei Stellen** kommen, eine davon ohne jede Aussage über die Maske:
1. `resolve-last-donor` (`lab.js`): keine Quelle oder keine nutzbare Maske (siehe oben).
2. `__f3562EnsureDonor`: Resolver nicht angemeldet (Lücke, jetzt wiederholt).
3. `__DonorSelectorF315.hear` (`lab.js`, „Select a purple donor mask in Sound Material or a donor from the library“): erschien bei **jedem** `false` der Hörfunktion ohne Modell (abgebrochen, überholt, beschäftigt), auch mit gültiger Maske. Gemessen: nach einer Änderung der Quelle liefert der Resolver beim ersten Aufruf häufig `superseded`.
**DONOR-MASK-01b:** diese Meldung nennt jetzt den Zustand (Quelle vorhanden / nicht, Donor extrahiert / nicht, Phase) und rät zu erneutem Klick; die Resolver-Meldung nennt Quelle und Masken-Länge. Damit lässt sich der nächste Auftritt zuordnen. Das ist Diagnose, keine Ursachenbehebung.

## PLAYHEAD-SCALE-01: oberer Playhead zu früh (Wave-Editor-Vorschau)
Befund (Nutzermeldung: oberer Playhead „deutlich davor“, der untere am Einsatz): `updatePlayheads` rechnet die obere (Überblick) und die Scratchpad-Leinwand mit `t.sourceFrames`, der Länge des **abgespielten Puffers**. Bei einer Effektkette mit Echo/Reverb-Ausklang (`tailMode extend`) ist der gerenderte Puffer länger als das Dokument; die Leinwand zeigt aber das Dokument (0 bis `doc.frames`). Der untere Playhead rechnet gegen den Viewport und war richtig.
Messung (Echo 700 ms, Rückkopplung 0,7, Auswahl 4 bis 6 s von 8,9 s): Parent oben 0,218 statt 0,637; jetzt 0,641 (Soll 0,643). Render 1 146 600 Frames gegen Dokument 392 000.
Fix: Überblick und Scratchpad nutzen `doc.frames` als Maßstab; nur der A·Original-Vergleich (anderer Puffer) behält seine Länge. Eine Zeile Logik in `src/post-oct/015-xen-wave-editor-w01-modules.js`.
Test `tests/e2e/wave_playhead_scale.cjs` (Parent rot). Grün außerdem: `wave_playhead_clock`, `wave_taktometer_seek`, `wave_loop_button`, `wave_loop_live`, `donor_mask_accept`; `run_tests.sh` 139/139, `build.py --check` OK.
Nicht geprüft: der Fall „blaue und lila Maske nicht deckungsgleich“ ohne Effektkette (Viewport anders als Loop-Auswahl): die Rechnung des unteren Playheads gegen den Viewport ist unverändert.

Rollback: `99cefe4`.
