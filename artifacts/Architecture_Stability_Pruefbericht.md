# Architekturprüfung: stabile Grundlage für die Weiterentwicklung

Basis: Commit `402d8f54fb7f18980f43eb7b3056724d8f3e8912`. Aktive Datei: `Xensonar_P7_Architecture_Stability_Test.html`.

## Einschätzung

Die Codebasis hat bereits wichtige Grundlagen: einen reproduzierbaren Einzeldatei-Build, einen Quellindex, Verhaltenstests mit produktivem Code, native Browserprüfungen, abgegrenzte Synthese-Kerne, Worker/Worklet-Ausführung, begrenzte Caches und abgesicherte Audio-Ausgänge. Deshalb ist eine komplette Neuarchitektur derzeit weder erforderlich noch ausreichend begründet. Das Instrument lässt sich sinnvoll weiterentwickeln, wenn Erweiterungen die bestehenden musikalischen Verträge ausdrücklich bewahren.

Der Quellindex zählt 207 Einheiten, 6.512 Namen auf oberster Ebene und 1.116 gerichtete Abhängigkeitspaare zwischen Einheiten. Das ist eine Bestandsaufnahme, keine Performance-Messung und kein automatischer Qualitätswert. Die Quellpartitionen teilen weiterhin einen gemeinsamen Gültigkeitsbereich und eine festgelegte Build-Reihenfolge. Mehrere Einheiten enthalten über 100 KiB Quelltext. Dateiaufteilung allein schützt daher nicht vor unbeabsichtigten Querzugriffen und falscher Aufrufreihenfolge.

Die Größe der ausgelieferten HTML-Datei ist hier kein nachgewiesener Engpass. Wichtiger sind PCM-/Snapshot-Speicher, Kopierarbeit, Hauptthread-Blockierung, pünktliche Audio-Steuerung und die Lebensdauer asynchroner Aufgaben. Eingebettete Bilder sind nicht der entscheidende Maßstab für Stabilität; auch Audio, Undo-Daten und doppelte Berechnungen beanspruchen Speicher. Eine Desktop-Hülle würde diese internen Probleme nicht automatisch lösen.

## Priorität 1: eindeutige Zuständigkeit für laufende Aufgaben

**Jetzt umgesetzt:** Der vorhandene Forge-Speichercontroller bekommt eine einmalige Startphase und einen gemeinsamen laufenden Restore-Vorgang. Schnittstelle und gespeicherte Formate bleiben unverändert. Diese Zuständigkeit gehört in den vorhandenen Controller; eine zusätzliche allgemeine Ereignisverwaltung würde dafür unnötige Komplexität erzeugen.

Nachgewiesene Probleme vor der Korrektur:

- Wiederholtes `start()` konnte dieselbe Datenbank mehrfach lesen und mehrfach abonnieren. Der neue Test beobachtete bei drei Aufrufen drei Lesevorgänge. Der Controller hielt nur die zuletzt registrierten Store-/Runtime-Abmeldungen fest.
- Zwei `restore()`-Aufrufe konnten beide die Prüfung passieren, bevor der erste nach `await writeChain` sein `restoring` setzte.
- Eine während dieses Wartens erfolgte neuere Interaktion lag vor dem bisherigen Zeitpunkt der Erfassung des Interaktionszählers. Damit konnte eine ältere Wiederherstellung diese Interaktion überholen.
- Ein während des Wartens abgemeldeter Controller konnte danach noch einen Datenbank-Lesevorgang beginnen.

Korrektur in `src/forge/module_bundle/21_experimentStatePersistence.js`:

1. Wiederholtes Starten teilt dieselbe Promise und installiert genau ein Abonnement pro Quelle.
2. Gleichzeitiges Wiederherstellen teilt dieselbe laufende Promise; ein späterer ausdrücklicher Restore nach Abschluss bleibt möglich.
3. Der Interaktionszähler wird beim Anfordern erfasst. Bereits eingeplante Schreibvorgänge dürfen abschließen; neue Save-Anfragen werden während des wartenden Restore blockiert.
4. Nach asynchronen Grenzen wird die Zuständigkeit geprüft, bevor weiter gelesen oder Zustand angewandt wird. Ein verspäteter Datenbankfehler nach Disposal überschreibt auch den Fehlerstatus nicht mehr.

Ergebnis im gezielten Verhaltenstest: drei Startaufrufe ergeben einen Lesevorgang, je ein Store-/Runtime-Abonnement und je eine Abmeldung; parallele Restores ergeben einen Lesevorgang; Disposal während ausstehendem Save ergibt keinen weiteren Lesevorgang; eine neuere Interaktion bleibt erhalten.

**Danach sinnvoll:** Andere langlebige Controller einzeln auf dieselben Eigentumsfragen prüfen: Wer darf Ergebnisse anwenden? Wer beendet Worker, Timer und Abonnements? Welcher Stand macht ein Ergebnis ungültig? Bereits bestehende Generations-/Epoch-Grenzen nicht pauschal durch einen einzigen globalen Abbruch ersetzen: Ein Forge-Render und eine live gespielte Stimme benötigen unterschiedliche Lebensdauern.

## Priorität 2: eine verbindliche Forge-Höranfrage

Die nächste fachlich wertvolle Architekturänderung liegt zwischen `src/forge/editor/07_composition_and_preview_ui.js` (`Xje`, `Yje`, Transportvorbereitung) und `src/forge_and_melodic/10_audition_and_persistence.js` (`__f333Route`, Höranfrage, Cache-Key, Readiness und Renderauftrag). Dort werden verwandte Entscheidungen an mehreren Stellen getroffen. Der kürzlich korrigierte Unterschied zwischen ausgewähltem Donor und tatsächlich gehörtem Carrier zeigt ein reales Regressionsrisiko.

Ziel wäre eine einzige unveränderliche Höranfrage mit tatsächlicher Route, Klangmaschine, Quell-/Rezeptrevision, Zeit-/Tonhöhenparametern und Abbruchzuständigkeit. Vorbereitung, Play, Cache und Vollgrün-Anzeige sollen diese Anfrage verwenden. Fortschritt gehört zu deren laufendem Auftrag; Vollgrün setzt dessen fertigen, passenden hörbaren Puffer voraus. Die bestehenden musikalisch verschiedenen Renderer bleiben hinter dieser Grenze eigenständig.

Vorteil: neue Hörweisen müssen nicht mehrere Interpretationen des aktuellen Zustands synchron erweitern. Mögliche Performance-Gewinne kommen aus vermiedenen Snapshots, wiederverwendeten fertigen Ergebnissen und zusammengeführten identischen Aufträgen. **Kein zusätzlicher Geschwindigkeitsgewinn dieser künftigen Änderung wurde hier gemessen.** Die bestehende Zusammenführung identischer Renderaufträge und der Ready-Cache bleiben aktiv.

Abnahme: alle vorhandenen Hörweisen, kaltes/warmes Play, Donor-Wechsel während des Ladens, schneller Maschinenwechsel, Paint/Morph/Undo, Abbruch und Wiederaufnahme. Für globale Analyse-, Normalisierungs- oder Relationsschritte bleibt eine vollständige Neuberechnung erforderlich. Lokales PCM-Splicing ohne Abhängigkeitsnachweis wäre musikalisch riskant.

## Priorität 3: editierbaren Zustand von vorbereiteten Audiodaten trennen

Die Live-Engine soll weiterhin fertige Tabellen, Koeffizienten und kleine Steuerwerte erhalten. Aufwendige Analyse, Serialisierung oder allgemeine Zustandsabfragen gehören außerhalb des zeitkritischen Audio-Pfads. Diese Trennung existiert bereits in mehreren Nodal-/RFL-Bereichen; dort ist zunächst der vorhandene Vertrag zu stärken, statt neue Engines einzuführen.

Konkreter nächster Untersuchungsbereich: Übergabe vom editierbaren Instrument-/Rasterzustand zu vorbereiteten Voice-/RFL-Daten, etwa in `src/audio/01_voice_and_rfl_ownership.js`, `src/audio/05_live_voice_runtime.js` und den Nodal-Vorbereitungsmodulen. Große Dateien sind nur ein Suchhinweis. Erst eine nachgewiesene doppelte Vorbereitung oder ein unnötiger Zugriff im Live-Pfad rechtfertigt eine Änderung.

Sinnvoller Vertrag: ein vorbereiteter Stand besitzt eine eindeutige Revision und enthält alles, was die laufende Stimme braucht. Eine neue Revision wird vorbereitet und übernommen, ohne bereits klingende Ausläufe mit veränderten Puffergrenzen oder einem fremden Zustand zu beschädigen. Protokolle, nicht Klangmodelle, dürfen vereinheitlicht werden.

Abnahme: Klang-/Tonhöhenparität, Root-Wechsel bei Hauptthread-Stalls, Stop/Release, mono/stereo, mehrere Sample-Raten und maximale reale Stimmenlast. Rasterabstände dürfen nicht vereinheitlicht werden: Die Cursor-Rastersuche verwendet linearen Hertz-Abstand; andere Instrumentpfade verwenden bewusst Cent-Abstände und teils andere Perioden als die Oktave.

## Priorität 4: gespeicherten Zustand ausdrücklich beschreiben

Forge-Autosave und globale Paketstation erfüllen unterschiedliche Zwecke und sollten bestehen bleiben. Zu prüfen sind ihre gemeinsamen Datenverträge, nicht eine erzwungene Zusammenlegung der Speicher.

Wichtige Stellen: `src/forge/module_bundle/21_experimentStatePersistence.js` sowie `src/app/forge/02_boot_and_workspace_tools.js`. Die Paketstation besitzt bereits eine Allowlist und Versionsregeln. Künftig sollte jedes neue dauerhaft relevante Feld zusammen mit Export, Import, Rückwärtskompatibilität und einem Roundtrip-Test eingeführt werden. Flüchtige Zustände wie Playhead, Renderfortschritt und Audioknoten gehören nicht in den gespeicherten Projektzustand.

Ein deklarativer Vertrag kann diese Zuordnung dokumentieren und Adapter gemeinsam prüfen. Er sollte erst dort ausführbarer gemeinsamer Code werden, wo die Semantik tatsächlich gleich ist. Ein pauschales Serialisieren aller Runtime-Felder wäre fehleranfälliger und teurer.

Abnahme: Projekt aus Browser A in ein leeres Profil von Browser B übertragen, einschließlich Bibliotheken, Carrier-/Donor-Wahl, Tuning, Gain und neuer dauerhafter Einstellungen; alte Pakete behalten ihre bisherigen Regeln. Globale Einstellungen erfordern nach dem Paketimport weiterhin einmaliges Neuladen. Der vorhandene Chromium-Leerprofiltest ist ein Nachweis für die Importkette, kein Nachweis tatsächlicher Firefox-/Opera-Parität.

## Priorität 5: Regressionen an musikalischen Grenzen abfangen

Vorhandene Verhaltenstests bleiben die Grundlage. Ergänzungen sollten echte Grenzen absichern: Vollgrün entspricht spielbarem Ergebnis; Raster-Mute unterbindet alle zugehörigen Spielwirkungen; Envelope-Null ist Stille; Stop verwirft veraltete Aufgaben; Paket-Roundtrip erhält dauerhaften Zustand; gleiche Eingabe liefert die beabsichtigte Tonhöhenlogik. Quellhashes belegen zusätzlich den begrenzten Änderungsumfang, ersetzen diese Tests aber nicht.

Der aktuelle Patch ergänzt zwei Host-Gates im gemeinsamen Release-Lauf: Zuständigkeit des Controllers und überprüfbare Begrenzung der Produktionsänderung. CI sammelt die Nachweise im neuen Ergebnisverzeichnis. Eine spätere Aufräumarbeit sollte die historisch gewachsene Kette der Freigabe-/Preservation-Skripte und die teilweise fest eingebauten Ergebnisverzeichnisse vereinfachen. Dabei historische Belege erhalten und Verhaltenstests nicht durch ständig aktualisierte Hashes ersetzen.

## Bewusst erhalten

Keine Zusammenlegung von Synthese-Kernen, keine Verringerung von Stimmen, Obertönen oder Auflösung. Keine Änderung an UI, Mastering, Granular-Fenstern, Tonhöhenregeln oder Projektformaten. Keine neue Laufzeitabhängigkeit, Framework-Umstellung oder Desktop-Hülle. Der Produktionspatch betrifft genau einen bestehenden Verwaltungscontroller. Die 207 Quell- und 27 Stil-Einheiten sowie ihre Reihenfolge bleiben erhalten. Die übrigen Produktionsquellen werden bytegenau gegen die geprüfte Basis kontrolliert.

P7.12 bleibt archiviertes, nicht integriertes Experiment.

## Validierung

Bestanden: 43 Host-/Build-Prüfungen sowie 11 Chromium-/Build-Prüfungen, jeweils ohne Fehler. Der erweiterte gezielte Controller-Test wurde danach ebenfalls erfolgreich ausgeführt. Build SHA-256: `30efae37d2450eae4ddc9c8ea5909af2ef2bcc72413fe4710d50a621db78c146`.

Die abschließenden Ergebnisse stehen in `results/architecture-stability/host-validation.json` und `browser-validation.json`. Der gezielte Test führt den echten Controller im vollständigen produktiven Offline-Runtime-Harness aus und hält Schreib-/Lesegrenzen gezielt an. Die bestehenden nativen Tests prüfen unter anderem Forge-Hörweisen/Readiness, Paint/Morph/Tonhöhen, Paketimport, räumliche Anordnung und die Master-Endstufe.

Grenzen: kein allgemeiner Nachweis der Abwesenheit aller Regressionen; kein Hörtest an einer physischen Audioanlage und keine neue Opera-/Firefox-Messreihe. Dieser Patch beseitigt unnötige parallele Verwaltungsarbeit und schließt belegte Race-Conditions. Er beansprucht keine gemessene Beschleunigung der Synthese oder des gesamten Instruments.
