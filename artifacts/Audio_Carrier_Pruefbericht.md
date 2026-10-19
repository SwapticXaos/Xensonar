# Polyphones Audio to Carrier · N21–F2

Basis: Commit `0032c0968b113f58030df922a85d3d98af125d82` (Mikrofon-Patch). Eigenständige Testdatei: `Xensonar_N21_F2_Audio_Carrier_Test.html`.

## Bedienung und Ergebnis

`Transform to Carrier` steht beim Mikrofon und Import Audio in Sound Material · Donor. Eine importierte Datei und eine Mikrofonaufnahme verwenden denselben bestehenden AudioAsset-Vertrag. Analysiert wird nur die untere Fine Selection, unabhängig vom oberen Wellenform-Viewport. Der Button zeigt tatsächliche Worker-Fortschritte und erlaubt Abbrechen. Filter und Fehlermeldungen bleiben bei der Quelle. Auch bei 720 px bleiben die Controls erreichbar.

Die Aktion ersetzt ausdrücklich die aktuelle Carrier-Figur und besitzt einen Undo-Schritt. Rohsamples und Importauswahl bleiben erhalten. Ohne erkannte stabile Töne bleibt die Figur unverändert. Ein Quellen-/Maskenwechsel oder Raumwechsel beendet den Worker; eine während der Analyse bearbeitete Figur wird nicht mit einem verspäteten Ergebnis überschrieben. Mikrofon und Dateiaustausch sind während der Analyse gesperrt. Malen, Bildimport und Melodic-Übertragung behalten ihre bisherigen Wege.

Die Tonlinien verwenden den vorhandenen `melodic-carrier-v1`-Vertrag. Dadurch bleiben sie editierbar und nutzen die vorhandene Materialisierung, Projekt-Snapshots und Klangerzeugung. Der neue Einstieg setzt die Hörroute auf den neutralen Carrier zurück, auch nach vorheriger Emilia-/Donor-Auswahl. Die originale Klangfarbe wird nicht eingebettet. Die Dauer des gewählten Ausschnitts wird exakt auf das Carrier-Material abgebildet; das angepasste Tempo ist deshalb nicht als musikalische Tempoerkennung zu verstehen.

## Berechnung und begrenzte Refaktorisierung

Die ausgewählte PCM-Kopie wird an einen Worker übertragen, niemals der Originalpuffer. Die vorhandenen FFT-/Sinc-Werkzeuge werden wiederverwendet. Nach Downsampling auf höchstens 12 kHz werden Hann-Fenster, interpolierte Spektralspitzen und harmonische Kandidatengruppen berechnet. Ein Greedy-Verfahren entfernt zugeordnete Obertöne und verfolgt mehrere Grundtöne über die Zeit. Das Verfahren quantisiert Tonhöhen nicht auf ein Tonsystem. Ein absoluter RMS-Gate, relativer Spektralboden, harmonische Konsistenz und Mindestlaufzeiten reduzieren Geräusche/kurze Fehlspuren.

Standard: vier gleichzeitige Töne, −46 dB Rauschschwelle, 50 % Strenge, 90 ms Mindestlänge, 65–1600 Hz. Einstellbar sind ein bis sechs Kandidaten sowie tiefer/hoher Tonbereich. Aus Sicherheits-/Arbeitsgründen maximal 60 Sekunden, 4096 Tonlinien und 120 Sekunden Worker-Laufzeit. Die zeitliche Rasterung beträgt 20 ms; Fensterbreite ca. 171 ms, im tiefen Bereich ca. 341 ms. Das ist eine Grundtonschätzung, keine fehlerfreie Akkordtranskription. Oktav-Dopplungen, fehlende Grundtöne im Akkord, stark unterschiedliche Pegel, dichte Akkorde und Rauschen bleiben mögliche Fehlerquellen.

Nur drei vorhandene Runtime-Module ändern sich: Einbindung im Donor-UI, gemeinsamer Visibility-Cleanup für Mikrofon/Analyse und extrahierter Carrier-Commit für Audio/Melodic. Zwei Module kommen hinzu (Analyse/Controls). Alle Synthesekerne bleiben unverändert. Der alte Melodic-Empfänger liegt als eingefrorene Referenz vor; ein Vergleich prüft erfolgreiche Übernahme, identische Rasterdaten, Tonlinien, Timing und Hörauswahl. Frühere Source-Baselines bleiben unverändert; deren Tests akzeptieren ausschließlich den expliziten neuen Hash-Overlay. Der neue Erhaltungsvertrag prüft zusätzlich die gesamte bestehende Quellenbasis.

## Nachweise

- 14 unabhängige synthetische Signal-Fälle: Sinus, dominante Obertöne, fehlender Grundton bei Mono, dreistimmiger gezupfter Akkord, tiefer Gitarrenakkord, 44,1/48/96 kHz, Stille, deterministisches Breitbandrauschen, leises Signal mit/ohne angepasstes Gate, kurzer Transient und kontinuierliches Vibrato. Frequenzabweichung je Sollton unter 18 Cent; keine zusätzlichen Obertonspuren in den Akkord-Fällen.
- Realer Thread-Worker: Fortschritt, Original-PCM unverändert, Abbrechen, ungültige Maske, exakte Dauer, Undo, Snapshot-Wiederherstellung und Vergleich mit dem bisherigen Melodic-Empfänger.
- Native Chromium-UI: tatsächlicher WAV-Import/Decoder, nativer Worker, drei neutrale Akkordlinien, 2,33 % belegte Rasterzellen, erhaltene Rohsamples, echte Play-Wiedergabe mit endlichem nichtstillem Mono-PCM, Undo, Stille-Fehler ohne Bildverlust, Abbruch, Schutz bei gleichzeitiger Bearbeitung und Raumwechsel. Keine ungefangenen Browserfehler; erreichbare Controls bei 1490/720 px.
- Mikrofonaufnahme mit echtem MediaRecorder/Decoder und synthetischem Chromium-Testgerät bleibt erfolgreich, einschließlich Verwerfen, Berechtigungsfehler, Wiederaufnahme und Freigabe beim Raumwechsel.
- Bestehende N21-Suite: 65 erfolgreiche Prüfungen einschließlich reproduzierbarem Build. Ergänzend Merge, Workflow-Integrität, Wartungsvergleiche und Forge-Fortschritt/PCM.

Messdaten liegen in `results/audio-carrier/`. Frische Ausgaben historischer Prüfungen werden dort unter `regression-output/` archiviert; alte Ergebnisdateien und frühere Lieferartefakte bleiben erhalten. Physische Stimme/Gitarre, Geräteberechtigungen und Opera/Firefox/Safari sind hier nicht nachgewiesen. Die synthetischen Signale belegen das Verfahren, ersetzen aber keinen musikalischen Hörtest am Rechner.

Das Quellenpaket enthält alle aktuellen Quellen und Tests. Drei ältere, von Tests nicht benötigte HTML-Buildkopien (Granular Hold, Live Stability, Forge Progress) werden zur Größenbegrenzung nicht erneut dupliziert; sie bleiben im Repository und in bisherigen Lieferungen erhalten.
