# Forge-Höranfrage und Render-Zuständigkeit

Weiterarbeit auf Commit `2835472e4ccfe6bcde8eee84913e4415082c188e`. Aktive Datei: `Xensonar_P7_Forge_Request_Stability_Test.html`.

## Ergebnis und Umfang

Drei aufeinander aufbauende Schritte sind umgesetzt: ein gemeinsamer Erzeuger der Carrier-/Hörmaschinen-Anfrage, eine vor asynchroner Vorbereitung erfasste Render-Zuständigkeit und eine gegen Fehler einzelner Fortschrittsbeobachter abgesicherte gemeinsame Berechnung. Die Produktionsänderung betrifft genau `src/forge_and_melodic/10_audition_and_persistence.js`.

Alle Synthese-Kerne, musikalischen Regeln, Audio-Worklets, Master-Stufen, UI-Quellen, Projekt-/Paketformate und Bibliotheken bleiben bytegleich zur geprüften Basis. Die 207 Quell- und 27 Stil-Einheiten und ihre Reihenfolge bleiben erhalten. Es gibt keine neue Laufzeitabhängigkeit oder zusätzliche Audioanalyse.

## Schritt 1: eine Anfrage-Erzeugung für dasselbe PCM

Vorher setzten Bereitschaftsanzeige und Renderweg teilweise eigene Anfragen für den reinen Carrier zusammen. Maschinenwahl, Snapshot, Tuning, Tempo, Synth-Lab-/Harmonic-Xplore-Parameter und Loop-Flags mussten dadurch mehrfach synchron gepflegt werden.

Jetzt verwendet `__f333HearingRequest` für die beiden gerenderten Routen `hearing` und `carrier` denselben bestehenden Parametervertrag. Der Carrier behält seinen bisherigen Raw-Renderer und sein bisheriges Loop-Flag; die anderen Hörweisen behalten ihre Einstellungen. Live-Gain bleibt eine nachgelagerte Verarbeitung und verändert den Raw-PCM-Schlüssel weiterhin nicht.

Der Vertragstest führt den produktiven Request-/Kontext-Code für alle acht Klangmaschinen jeweils mit und ohne Loop aus. Kontext und Cache-Schlüssel stimmen exakt mit den bisherigen Parametern überein. Für die beiden Render-Routen wird zusätzlich nachgewiesen, dass Bereitschaft und tatsächlicher Renderweg denselben Anfrage-Erzeuger verwenden und denselben vorbereiteten Puffer wiederverwenden. Öffentliche Projekt-Snapshots bleiben unabhängige, vom Aufrufer bearbeitbare Kopien.

Die Legacy-Donor-, Hybrid-, Reference- und Body-Routen bleiben eigenständig. Die musikalisch verschiedenen Renderer werden nicht vereinheitlicht. Die allgemeinere UI-Transportplanung bleibt erhalten; der Patch konzentriert die tatsächlich benötigten PCM-Parameter im bestehenden Renderpfad.

## Schritt 2: Aufträge vor der Donor-Vorbereitung besitzen

Der bisherige äußere Hör-Renderer erfasste seine Abbruchgeneration erst **nach** `await __f3562EnsureDonor()`. Ein währenddessen erfolgter Stop oder Hörmoduswechsel konnte damit zur neuen Ausgangsgeneration eines bereits überholten Auftrags werden.

Der neue Test `forge-request-lifecycle.cjs` reproduzierte dies auf der Basis: Trotz Stop während der Vorbereitung begann eine Rasterrekonstruktion und eine Synthese; der Auftrag endete als `ready` und legte einen Puffer im Cache ab. Mit der Korrektur endet er als `AbortError`, ohne Rasterrekonstruktion, Synthese oder Cache-Eintrag. Das vermeidet nachgewiesene unnötige Berechnung, ohne einen aktuellen Auftrag klanglich zu vereinfachen.

Zusätzlich werden fehlende Fractalia-/Emilia-Rezeptstände beim Auftragseingang einmalig erfasst. Cache-Schlüssel und Renderer lesen denselben Rezeptstand. Der nach der Donor-Vorbereitung erfasste Donor-Schlüssel wird an Fractalia weitergegeben und bei Job-Start sowie vor Cache-Übernahme geprüft. Fractalia besitzt bereits eigene Prüfungen während der eigentlichen Synthese; die äußere Prüfung schließt die Lücken vor der Übergabe und vor der Cache-Übernahme. Sie ersetzt die inneren Prüfungen nicht und berechnet den Donor-Fingerprint nicht zusätzlich bei jeder Fortschrittsmeldung.

Kontrollierte Tests halten die äußeren Abhängigkeiten gezielt an: Donor-Wechsel vor Job-Start, Wechsel während einer ausstehenden Renderer-Antwort und Rezept-Wechsel nach Anfragebeginn. Damit wird der Vertrag des äußeren Job-Eigentümers geprüft, unabhängig davon, ob ein innerer Renderer selbst schon Schutz besitzt. Die Ausgangsergebnisse stehen in `docs/forge-request-ownership/render-lifecycle-before.json`.

Eine Rückkehr zu einem identischen fertig berechneten Klang darf weiterhin dessen Cache verwenden. Identische laufende Aufträge werden weiterhin zusammengeführt; veraltete Aufträge dürfen ihren Registry-Eintrag nicht mit dem eines neueren Auftrags verwechseln.

## Schritt 3: Beobachtung von Synthesefehlern trennen

Fortschrittsmeldungen werden von Vorbereitung, Play und weiteren Verbrauchern desselben Renderauftrags gemeinsam beobachtet. Ein Fehler in einem solchen Callback konnte bisher in die Synthese zurücklaufen; schon der erste Callback konnte die zuständige Registry-Lebensdauer vorzeitig beenden.

Jetzt wird ein fehlerhafter Beobachter entfernt und sein Fehler einmalig in der Konsole gemeldet. Die Berechnung und andere Verbraucher erhalten weiterhin ihren gemeinsamen Puffer. Das gilt für die erste Meldung, Zwischenfortschritt, Abschluss und Cache-Treffer. Der Erfolgspfad berechnet keinen weiteren Fortschritt und erzeugt keinen zusätzlichen Auftrag. Synthesefehler werden weiterhin weitergegeben; der vorhandene Test für Renderfehler, Registry-Bereinigung und Wiederholungsversuch bleibt aktiv.

Der gezielte Test prüft insbesondere einen fehlerhaften ersten Verbraucher und einen später beitretenden gesunden Verbraucher: genau eine Rasterrekonstruktion, genau eine Synthese, identischer Puffer, vollständiger Fortschritt für den gesunden Verbraucher und anschließend leere Job-Registry. Vorherige Ergebnisse nach Schritt 2, aber vor dieser Callback-Korrektur, sind separat als `render-lifecycle-before-observer-fix.json` dokumentiert.

## Browserprüfung

Der neue native Chromium-Test bereitet einen echten Donor aus PCM vor, zeichnet einen Carrier, lädt das Fractalia-Glass-Instrument und aktiviert dessen Donor-Bindung. Er hält die Auflösung der Donor-Vorbereitung an und wechselt über den sichtbaren gemeinsamen Picker auf Antonia. Nach Freigabe darf kein überholter Fractalia-PCM-Job beginnen. Genau der aktuelle Modus wird berechnet; vollgrünes Play verwendet anschließend dessen vorhandenen Puffer.

Der Browserfall wurde zusätzlich gegen die vorherige HTML-Version aus Commit `2835472` ausgeführt: Dort starteten nach dem Wechsel noch zwei Jobs, Fractalia und Antonia. Mit der Korrektur startet nur Antonia; anschließendes Play erzeugt keinen weiteren Job. Die gezielt erwartete fehlgeschlagene Vorher-Prüfung steht in `results/forge-request-ownership/browser-request-before.json`, der neue erfolgreiche Lauf in `browser-request.json`.

Der bestehende reale Fractalia-Test prüft zusätzlich unverändert: ein kalter PCM-Auftrag/eine Donor-Auflösung, warmes Play ohne neue Synthese, eine kleine Zeichenänderung mit genau einem neuen Auftrag und vollständiger Paketexport/-import in ein leeres Browserprofil. Weitere bestehende Prüfungen umfassen alle acht Hörmaschinen, Paint/Morph/Detune, Endstufe, Live-Raster und die zuvor abgesicherte Persistenz.

## Einordnung und nächste Schritte

Dieser Patch arbeitet den nächsten Abschnitt der [Architekturprioritäten](../architecture-stability/report.md) ab. Er beseitigt reale Zuständigkeitslücken und konzentriert bestehende Parameterlogik. Er beansprucht keine pauschale Beschleunigung jeder Klangmaschine und keine lokale PCM-Neuberechnung bei globalen Analyseabhängigkeiten. Der normale Klangpfad verwendet dieselben Parameter, Algorithmen und Cache-Schlüssel.

Der nächste sinnvolle Untersuchungsbereich bleibt die Übergabe von editierbarem Zustand zu vorbereiteten Live-Audiodaten. Eine weitere Änderung sollte erst auf einem nachgewiesenen unnötigen Vorbereitungsschritt oder einer konkret fragilen Übergabe aufbauen. Die verschiedenen Klangmodelle und ihre Tonhöhen-/Zeitregeln bleiben eigenständige Verträge.

Nach Paketimport einmal neu laden, um globale Einstellungen zu aktivieren. P7.12 bleibt archiviertes, nicht integriertes Experiment. Keine neue Prüfung an einer physischen Audioanlage und keine neue Opera-/Firefox-Messreihe.

## Prüfnachweise

Bestanden: 47 Host-/Build-Prüfungen, 12 Chromium-/Build-Prüfungen sowie die zusätzlichen Play-/Save-/Navigationsprüfungen (`npm run test:merge`). Build SHA-256: `666c8f90117f2c3cd1ccc9533dd285cb503ff382b8d976603ddaf58a0caa2797`.

Die gemeinsamen Host-/Build- und Chromium-/Build-Ergebnisse stehen unter `results/forge-request-ownership/`. Ein separater Reversibilitätsnachweis prüft die exakt erklärten Änderungen und alle unveränderten Produktionsquellen gegen die Basis. Die historischen Prüfbelege werden nicht überschrieben; aktuelle Ergebnisse älterer Tests werden im neuen Nachweisverzeichnis archiviert.
