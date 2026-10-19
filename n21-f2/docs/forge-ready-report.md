# Spectral Forge · Auswahl und tatsächliche Play-Bereitschaft

Basis: `a8078b0d1f17ff4ff523c4f91c8a18a27eb7220f`, polyphones Audio to Carrier.

## Reproduzierte Ursachen und Korrekturen

1. Audio to Carrier setzte `carrierIntegralSelection` auf die Standardauswahl zurück. Der Carrier-Commit behält jetzt die vorherige Maschine mit Preset/Parametern bei und trennt lediglich die importierte Donor-Klangfarbe ab. Ein Test wählt Emilia und vergleicht die komplette Auswahl nach der Umwandlung. Die vorhandene Melodic-Übertragung bleibt charakterisiert.
2. Die UI akzeptierte einen lokalen Vorbereitungsstatus auch ohne den tatsächlich von Play benötigten Cache-Eintrag. In Spectral Forge bestimmen nun der aktuelle Audio-Cache und dessen exakter Sound-Schlüssel die Bereitschaft; ein lokales „ready“ allein genügt nicht. Automatisches Vorbereiten und Play verwenden denselben Renderer statt verschiedener Interpretationen der Standardauswahl. Der Legacy-Raum behält seinen bisherigen Weg.
3. Der Cache-Schlüssel enthielt `updatedAt` aus normalisierten Einstellungen. Insbesondere für den Standard-/Raw-Pfad konnte jeder identische Request einen neuen Zeitstempel erzeugen. Das verursachte erneutes Rechnen trotz vorheriger Vorbereitung. Die Cache-Identität schließt diese Zeitstempel jetzt aus; Maschine, Parameter, Rezepte, Figur, Tonhöhe, Dauer und Abtastrate bleiben berücksichtigt.
4. Renderer meldeten 100 %, bevor der Puffer im Cache eingetragen war. Während des Rechnens wird der Fortschritt auf höchstens 99 % begrenzt. Erst der erfolgreiche Cache-Eintrag veröffentlicht den Abschluss. Die aktiven UI-Füllstände sind ebenfalls auf 99 % begrenzt; vollgrüne Bereitschaft verlangt den fertigen aktuellen Puffer. Cancel, Fehler und geänderte Requests dürfen keine Bereitschaft veröffentlichen.
5. Pure Dieter war von automatischer Vorbereitung ausgeschlossen. Im aktuellen Forge wird auch dieser vorhandene Worker-Pfad nach der üblichen Ruhephase vorbereitet. Hybrid-Cacheänderungen werden über den vorhandenen Runtime-Subscriber beobachtet; dessen DSP und Pipeline bleiben unverändert.

## Umfang und Nachweise

Vier bestehende Runtime-Dateien ändern sich: Carrier-/Render-Orchestrierung, Vorschau-UI, Fortschrittsprojektion und Audio-to-Carrier-Status. Keine Synthesekerne und keine granularen Live-/RFL-Algorithmen ändern sich. Frühere Baselines und Lieferartefakte bleiben unverändert; explizite Hash-Overlays beschränken die erlaubten Integrationsänderungen.

Die neuen Tests schlagen am vorherigen Stand wegen verlorener Maschinenauswahl, vorzeitigem 100-%-Fortschritt und vollgrün ohne passenden Cache fehl. Native Chromium-Tests überwachen die Anzeige in Animationsframes und prüfen Default, Emilia, Pure Dieter, Fractalia, HarmonicXplorE, Spektral-Synthese, Antonia, Bert und Cecilia: vollgrün nur bei passendem PCM; anschließendes Play ohne neue Berechnungsfortschritte. Tempoänderungen müssen eine neue Identität vorbereiten. Der Audio-Import-Browsertest wählt Emilia vor dem WAV-Import und prüft deren Erhalt nach der Umwandlung, hörbares PCM, Undo und erhaltene Rohsamples.

Bestanden: Job-/Abbruch-/Cache-Tests, Audio-to-Carrier-Signale und Worker-Lebensdauer, 18 exakte Polytrace-PCM-Vergleiche plus Emilia-Stereo, der bestehende native Fortschritts-/Cancel-/Fehler-Browsertest, Merge sowie sämtliche 65 N21-Regressionsprüfungen einschließlich Build-Verifikation. Aktuelle Ergebnisse stehen in `results/forge-ready/`; historische Ergebnisdateien bleiben erhalten. Physisches Audio und Opera/Firefox/Safari sind durch native Chromium-Tests nicht abgedeckt.

Die Startbereitschaft bezeichnet den fertig berechneten Audiopuffer für den aktuellen Zustand. Betriebssystem-/Gerätelatenz und die normale WebAudio-Aktivierung nach Benutzerklick bleiben davon getrennt. Ein Raumwechsel gibt die Raum-Vorschaucaches wie bisher frei und kann beim Zurückkehren erneute Vorbereitung erfordern.
