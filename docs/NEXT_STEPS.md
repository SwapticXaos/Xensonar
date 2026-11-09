# Entscheidungsfreundliche Folgearbeit (keine unerbetene automatische Umsetzung)

**P0 – Quellen sichern:** Hash verifizieren, ZIP entpacken, eigene lokale Kopie behalten; nicht den Netlify-Production-Deploy unbeabsichtigt überschreiben. Ggf. benutzereigene `.xenpack`-Session als separaten Daten-Snapshot exportieren.

**P1 – Baseline-Walkthrough mit Claude:** Architektur- und Ownership-Notizen am tatsächlichen aktuellen Quelltext prüfen. DUB03 vs DUB02 auf echte Unterschiede der Daten- und Rhythmusmodelle vergleichen. Nur aktuell existierende Bedienflächen aufführen.

**P2 – Funktionale Browser-Validierung:** Besonders Dub Echo/Liveguard, Keyboard Hold, Mixpaste/Golden Move und native Speicher-Workflows. Echte Aktionen statt allein AST- oder Rendering-Proxies.

**P3 – Minimal-invasive Fehlerbehebung:** Nur reproduzierte Probleme beheben. Naheliegende Prüfstellen: DUB03 3,9-s-Grenze im Verhältnis zum intendierten Delay, Drag-/Thumb-Verhalten unter dem 80-ms-Gate, Start/Stop-BPM-Retiming, Verwechslung von Bar- und Quarter-Beat-Relationen, Firefox-AudioParam-Recovery, Sessionpersistenz.

**P4 – Kompositorische Erweiterungen:** Erst nach P2/P3 und nur wenn Nutzer ausdrücklich wünscht: zusätzliche Symmetrie-/Polyrhythmikmodelle, Mikrotonalitäts-/Temperierungsdimensionen, Audiointerface/MIDI-Anschlagsdynamik, Text→Sound-Agent-Integration. Isolierte Prototypen **nicht** ungefragt in die Hauptlinie mergen.

**P5 – Wartbarkeit:** Gezielte modulare Eigentümergrenzen mit Byte-/Semantik-Regression, wiederholbarer Build-Pipeline und Smoke-Proben. Nicht sofort einen Multi-Megabyte-Quellblock neu schreiben.

**Übernahmeprotokoll:** Jeder neue Claude-Zwischenstand erhält `BASE_SHA256`, `NEXT_SHA256`, Dateigröße, konkret geänderte Blöcke, Code-Diff, Owner-Migrationen, Testliste, offene QA, standalone HTML, identische deploybare ZIP, Rollback-Basis.
