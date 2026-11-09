# Tests und Abnahmeprotokoll für Claude

## In diesem neuen Handoff tatsächlich prüfbar

- Dateihashes / originale Netlify-ZIP / ZIP CRC / Source-Mirror.
- Genau 32 JS-Blöcke und 77 Styles; vollständiger Node-Syntaxcheck der extrahierten JavaScript-Blöcke (nicht Live-Audio).
- Source-Diff DUB02 → DUB03; nur Hauptscript 10 plus HTML-Metadaten/Titel, CSS unverändert.
- Revisions- und Dokumentationstreue; Änderungen zur Vergangenheit aus evidenzbezogenen Quellen ableiten.

## Nicht durch statische Tests bewiesen

- Vollständiger Play-/Stop-/Record-Zyklus mit realer Audiohardware; 120-Minuten-Aufnahme und zusammenhängende WAV/FLAC-Exportprüfung; physisches UAD/Windows-Interface.
- Firefox/Opera/Chromium unter allen lokalen Profil-/Origin-Konstellationen; WebAudio-Latenz, Race Conditions, AudioParam-Mid-Curve-Recovery.
- Persistenz über Browserneustart/-update und zwischen Domains; `.xenpack`-Roundtrip mit referenzierten Assets.
- DUB03 Echtzeit-Dub Throw/Spin mit Parameterbewegung, Beat Marker Drag und Odd-Meter-Auswahl.
- Responsives UI der **gesamten** Anwendung, insbesondere bei 390px; alle Regler, Klaviatur, Mixer und Aufnahme-Anzeigen.
- Netlify Production vs Preview identischer Datei-/Release-Hash.

## Kritische End-to-End Wege (vor einem neuen Release)

1. Leere/neue Sitzung → Sound aus Picker → hörbare Tonänderung → Stop; Controller-Typwechsel; Reload.
2. Drumbeat anlegen/ändern, Spur-EQ/Tempo/Pattern speichern, andere Session öffnen, zurück, richtigen Zustand hören.
3. Drum-Dub-Echo: Normalmodus, Bar-Bruch (auch 5/7/11), Marker bewegen, Free ms, Feel, L:R und Cross-Feed; Throw/Spin gedrückt/losgelassen; Wechsel der BPM und Stop/Play; Audio-Knackser/Lautstärke prüfen.
4. Slider schnell bewegen, sichtbaren Wert mit Ton vergleichen; kein Stottern, kein lost final state, kein doppelter Render-/Persistenzsturm; bei Input/Grenzen/Refresh neu vergleichen.
5. Keyboard Hold: Factory 16 Steps/1 Bar; Root Reset nur Pitch; troodle Sound und genau dieser EQ; Editieren und Reload ohne Überschreiben.
6. Wave Editor: Copy, Insert, Trim, Undo/Redo, Mixpaste auf wirklichem Ziel, Golden Move, Volume-vs-Gain; nulloperation korrekt.
7. Root Follow Pointer in/out: Smooth Entry, kein Klick; Double/Stop/Resume.
8. Recording 15–120min auf speicherbegrenztem Gerät mit Monitoring; Crop, WAV/FLAC 16/24; ZIP/Browser-Storage-Sicherheitsgrenzen; keine pauschal versprochene 2h-Freigabe.
9. Package Eye: Einträge sehen, Owner und mögliche Abhängigkeiten anzeigen, selektiv löschen; Exportauswahl getrennt, anschließend `.xenpack`-Roundtrip.
10. Netlify Preview öffnen und Production nach **explizitem Publish** prüfen; eine funktionierende Preview ist kein Beleg für das Root-Domain-Deployment.

## Testdisziplin

- Auf Parent zunächst tatsächlichen Fehler und RED-Test nachweisen.
- Kleinen GREEN-Patch inklusive Edge-Cases testen.
- Eine adversariale User-Rejection-Frage für **jede** sichtbare UI-Änderung: „Was würde der Nutzer als fehlend, unverständlich oder überraschend bezeichnen?“ Test als echten Click-/Keyboard-/Drag-Workflow.
- Browser-Checks nach Browser (Firefox/Chromium/Opera) und nach Origin (file://, Preview, Production) strikt kennzeichnen.
- QA-PENDING bleibt QA-PENDING, bis ausdrücklich die passende Stufe abgenommen ist.
