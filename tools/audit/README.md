# Live-Pfad-Messskripte (nur Test, nicht Teil der App)

Benötigt Node + Playwright mit Chromium. Aufruf jeweils mit absolutem Pfad zur `index.html`:

    node tools/audit/run-audit.js "$PWD/index.html"   # Szenarien S0–S4: Kontexte, Worklets, Timer, rAF, Listener, Heap
    node tools/audit/run2.js "$PWD/index.html"        # AudioParam-Automation/s, Hauptthread-Aufteilung, Session-Sicherungs-Auslöser
    node tools/audit/run3.js "$PWD/index.html"        # große JSON-Serialisierungen und Storage-Lesezugriffe während des Spiels
    node tools/audit/run4.js "$PWD/index.html"        # dasselbe nach Aufrufer aufgeschlüsselt

Die `probe*.js` werden per `addInitScript` nur in die Testseite injiziert.
