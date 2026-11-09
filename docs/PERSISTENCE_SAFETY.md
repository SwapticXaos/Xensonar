# Speicher-, Datenowner- und Export-Schutz

## Was im Browser liegt

Eine Standalone-HTML speichert **nicht automatisch** private Sessions in die Datei selbst. `localStorage`, `IndexedDB` und gegebenenfalls `OPFS` sind lokale browser-/profil-/originbezogene Speicherräume. `file://`, Vorschau-Domain und Production-Origin können deshalb verschiedene Bibliotheken sehen. Eine neue Datei oder ein neuer Host ist nicht per se ein verlustfreier Datentransfer.

## Nicht verwechseln

1. **Delivery:** `index.html` + Netlify-ZIP + Testbericht + SHA. Das ist ein Entwicklungsartefakt.
2. **Musikalisches Backup:** `.xenpack`/Package Station — Sessions, Referenzen, Sounds und importierbare Anwenderdaten gemäß ihren aktuellen Besitzern und Exportregeln.
3. **Recording-Export:** WAV/FLAC — Audiodaten, nicht vollständiger Projektzustand.
4. **Quellcode-Archiv:** historische Patchnotes/Quellstände — kein Ersatz für das lebende Browserprofil.

## Owner-Regeln

- Session-/Drumbeat-/EQ-/Material-/Forge-/Root-Follow-Daten nur durch kanonische Writer ändern. Weder eine Inventar-UI noch ein Preview-/Export-Tool sollte beiläufig die interne Authority übernehmen.
- Package Station Eye: Überblick über gespeicherten Bestand; zielgenaues **Löschen über den Owner** unter Beachtung referenzierter und gemeinsam verwendeter Ressourcen. Nicht pauschal alle unbekannten IndexedDB-Zeilen löschen.
- Exportauswahl `was in die ZIP kommt` ≠ Löschauswahl `was entfernt wird`. Separat anzeigen, bestätigen und prüfen.
- Hydration und Migration können nur teils experimentell oder opt-in sein. Berichte zu XMEM/M9-M12 nicht ohne aktive Codeanalyse zu Mainline-Zusagen aufwerten.
- Bei neuen Features die Persistenz-Ebene **im passenden Beat/Instrument/Session-Owner** einhängen: z.B. Drumbeat-Parameter/EQ im Drumbeat selbst und dieser über Sessionreferenzen.
- Custom-/gespeicherte EQs dürfen beim passiven Start/Re-Render nicht durch Factory-Default ersetzt werden (KH04-Vertrag).
- Vor Storage-Operationen: Beispiel-Session anlegen → exportieren → Aktion → reload → importieren → Datenintegrität, Audio und Abhängigkeiten prüfen.

## Übergabe an Claude

Für echte User-Daten braucht Claude gegebenenfalls **zusätzlich einen vom Nutzer lokal exportierten `.xenpack`**. Das Handoff enthält absichtlich keine vorgetäuschte Kopie der lokalen Browserdaten.
