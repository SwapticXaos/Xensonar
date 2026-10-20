# XenSonar P7.11 – kompakte Materialvorschau und Pedal-Finetuning

Basis: N21-F2 + Quell-Patches 00–21. Stage 22 führt drei kleine Moduländerungen durch.

**Materialbibliothek:** Vorschau-Button rechts neben zweizeiligem Bibliothekseintrag; quadratische 40×40px Trefferfläche, ▶ ohne redundantes Preview-Label. Keine zusätzliche vertikale Zeile. Material-Preview-Kern unverändert. Die ausgewählte Materialspur oben hat unabhängig davon ihren eigenen Preview-Knopf.

**Alt:** `keyup` für linkes Alt verhindert nun ebenfalls die Default-Aktion im aktiven musikalischen Key-Handler; `keydown` war schon unterdrückt. Eine vollständige Unterbindung nativer Opera-/Desktop-Shortcuts ist auf Webebene nicht garantiert. Auf Ubuntu/Opera nachprüfen, ob das Browsermenü noch geöffnet wird. Wenn ja: früheren `keydown`-Capture-Gate und ggf. Browser-/Systembelegung untersuchen, ohne AltGr oder Texteingaben zu brechen.

**Pedal:** Dämpfungs-/Swell-Rampe im Pedalmodus von 0.00155 auf 0.00065 Ausdruckseinheiten/ms verlangsamt; negative Untergrenze von -0.35 auf -0.26 reduziert; exponentielle Rückkehrzeit 42ms → 220ms. KNOB behält seine Halte-Rate, nutzt aber gleiche weichere negative Untergrenze. B+Alt Umschaltung unangetastet. Bestehende Stimmen erhalten weiterhin keine direkte VCA-Korrektur: nur neue Anschläge übernehmen die Expressionskurve. Daher ist echtes weiches Pedal für *bereits klingende* Töne noch nicht implementiert; nicht mit Apostroph-Cut gleichsetzen.

**Offen/ungepatcht:** Nutzer beobachtet zeitweise gemeinsame Volume-Verschiebung zwischen verschieden zugewiesenen Entrophon-Sounds (Wave vs Keyboard). Zuordnung und geteilte Parameter müssen mit Instrument-ID, Slot, Revision, Live-Status und Gain-Layer reproduziert werden. Nicht blind globale Entrophon-Volume mit Instrument-Volume gleichsetzen. Kein behaupteter Fix.

**Gates:** HTML durch `node build.cjs` und `node build.cjs --verify` reproduzierbar. Vollständiger Opera-/Audiotest ausstehend. Die lange P7-Patchkette ist SHA-strikt; Codex kann Stage 22 kontrolliert nach Patch 21 anwenden.
