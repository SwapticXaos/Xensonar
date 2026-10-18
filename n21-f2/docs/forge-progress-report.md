# Spectral Forge: Play-Fortschritt und Ladevorbereitung

Basis: `be1fc5300f4e56556d5e0bd2976cc239f0566246` (Live Stability).
Testdatei: `Xensonar_N21_F2_Forge_Progress_Test.html`; 5513256 Bytes.
SHA256: `3d29de7704f2a9632c9a1cbf917a8d0b0382e07a6252b7142dee8d163c31726c`.

## Fehler und Korrekturen

1. Play konnte eine automatische Vorbereitung übernehmen, bekam dabei aber nur deren Endmeldung. Im ursprünglichen Browser-Test fiel Emilia von etwa 25 % auf 4 % zurück und wechselte anschließend direkt zur Wiedergabe. Jeder Teilnehmer am gemeinsamen Render erhält jetzt den letzten Arbeitsstand und die weiteren Zwischenstände. Ein Render pro identischem Auftrag bleibt erhalten.
2. Die Play-Anzeige begann beim Übernehmen erneut bei null. Sie übernimmt jetzt den Stand der passenden Vorbereitung. Fortschritt bleibt endlich, begrenzt und monoton. Alte oder abgebrochene Aufträge können die neue Play-Anzeige nicht mehr überschreiben.
3. Antonia, Bert und Cecilia berechneten ihren Polytrace-Ton synchron ohne nutzbare Zwischenstände. Ein gemeinsamer, lesbarer Offline-Renderer in `src/forge/dsp/04_polytrace_render.js` behält seinen vollständigen Zustand über Rechenabschnitte hinweg. Die synchrone API bleibt erhalten.
4. Die 75-ms-Höhenanimation konnte schnellen Meldungen hinterherhinken: Pure Dieter meldete im Diagnosefall bereits 95 %, während der gemessene Balken bei 4 % blieb. Die Füllhöhe übernimmt jetzt den echten Stand direkt. Kalte Starts dürfen ihren Anfangszustand vor der synchronen Vorbereitung zeichnen. Fertige PCM-Caches starten ohne zusätzliche Wartephase.
5. `aria-busy` umfasst auch die automatische Vorbereitung; der Tooltip zeigt während Play-Rendering weiterhin Prozent und Abbruchmöglichkeit. Abbruch, Wiederholung und Fehlerbehandlung wurden an den echten Bedienelementen geprüft.

## Ladezeit und Rechenlast

Bei Cache-Treffern und dem Beitritt zu laufenden Jobs entfällt eine komplette Rasterrekonstruktion. Gemessen an einem 2048 × 512 Raster spart das im Median etwa 5.81 ms je Aufruf. Vollständige Polytrace-Renders verwenden die bereits für den Cache-Schlüssel berechnete Figurenanalyse; eine zweite Analyse entfällt (etwa 20.41 ms im gemessenen Fall). Teilfenster analysieren weiterhin ihr eigenes Raster.

Die kooperative Fortsetzung verwendet normale MessageChannel-Aufgaben. So können React und Browser ihre Fortschrittsanzeige aktualisieren, ohne die Mindestwartezeit verschachtelter Timer zu bezahlen. Ältere Hosts behalten den Timer-Fallback. Beide Ports werden bei Erfolg, Fehler und Abbruch geschlossen; echte Node-MessagePorts und der Timer-Fallback wurden geprüft.

Chromium/V8, 8 Sekunden Audio bei 48 kHz, sieben aufgewärmte, abwechselnde Messungen; Median in Millisekunden:

| Klangpfad | Bisher synchron | Neue synchrone API | Kooperativ mit Timer | Kooperativ mit MessageChannel |
|---|---:|---:|---:|---:|
| fm | 173.3 | 187.1 | 247.0 | 190.6 |
| acid | 225.4 | 223.7 | 286.3 | 238.6 |
| vocal | 31.0 | 37.0 | 29.4 | 33.7 |

Die MessageChannel-Variante spart im Vergleich zur Timer-Fortsetzung bei FM/Acid rund 17–23 % Warte-/Renderzeit. Bei Vocal/Cecilia ist kein Zeitgewinn belegt. Die ursprüngliche synchrone Berechnung blockierte die Oberfläche; ihre Zeiten sind deshalb separat aufgeführt. Dies sind keine pauschalen Beschleunigungsfaktoren gegenüber der bisherigen Gesamtladezeit oder für Emilia. Die Syntheserechnung selbst wurde weder reduziert noch klanglich vereinfacht. Kurze Renders profitieren kaum von der Timer-Optimierung.

Verworfener Versuch: `scheduler.yield()` meldete Fortschritt intern, verdrängte im Browser aber die sichtbaren React-Updates. Er wurde nicht übernommen. Messdaten und fehlgeschlagener UI-Nachweis bleiben unter `results/forge-progress/rejected-scheduler-*` nachvollziehbar.

## Verifikation

- 13 Browser-Szenarien mit echten Play-/Stop-Bedienelementen und Produktionsrenderern, ohne Ersatz-Renderer: Emilia-Vorbereitung übernehmen, Cache-Sofortstart, kalter Start aller acht Synthese-Modi, Abbruch während laufender Berechnung, Wiederholung, leere Figur und anschließende Fehlererholung. Keine ungefangenen Browserfehler. Protokolliert werden DOM-Fortschritt und tatsächlich gemessene Füllhöhen in Animationsframes. Pure Dieter wird für den Frame-Test mit 16 Takten geprüft; übrige Modi mit 2 Takten.
- Antonia/FM, Bert/Acid und Cecilia/Vocal: 18 Kombinationen aus gemalter Figur, gespeicherten Melodic-Noten und Stille bei 16/48 kHz. Synchrone und kooperative Ergebnisse sind gegenüber der eingefrorenen ursprünglichen Funktion samplegenau identisch, ebenso Identität und Metadaten. Emilia-Stereo ist gegenüber der eingefrorenen Ausgangsdatei bei 16/48 kHz ebenfalls identisch.
- Gemeinsame Jobs: erster und späterer Teilnehmer, Hintergrundauftrag ohne UI-Listener, Fortschrittsgrenzen, Cache-Treffer ohne Rasteraufbau, Abbruch, Fehler und Wiederholung.
- Bestehende Audio-/Runtime-Suite: 65 Prüfungen bestanden. Granular-Hold-, RFL-Live-Stability-, Merge-, Cache-Ready- und Play/Save-Prüfungen bestanden. Play und Save bleiben bei drei Breiten/DPR-Konfigurationen exakt 42 × 34 px und spiegelbildlich angeordnet.
- 216 bisherige Quell-, Stil- und Template-Dateien sind SHA256-identisch zum Ausgangsstand. Fünf vorhandene Forge-Dateien sind gezielt geändert; ein Offline-Modul wurde ergänzt. Live-Nodal-DSP, Granular Hold, RFL, Entrophon und die Styles bleiben unverändert. Historische Quellanker werden nicht überschrieben; ein eigener Patch-Vertrag begrenzt die neuen Änderungen.
- Reproduzierbarer Standalone-Build, aktueller Quellindex und Kontrolle des Patch-/Quellpaket-Builds gehören zur Auslieferungsprüfung.

Details: `results/forge-progress/`, `tests/forge-progress-*.cjs`, `docs/forge-progress-source-anchors.json` und `docs/forge-progress-baseline-hashes.json`.

## Prüfen und verwenden

Die Test-HTML herunterladen und im Browser öffnen. In Material Forge → SpectralForge eine Figur zeichnen, Emilia wählen und Play während der Vorbereitung betätigen. Der Stand darf dabei nicht zurückspringen. Stop/erneutes Play mit fertigem Cache startet sofort. Bei einer geänderten Figur wird wieder der echte neue Render angezeigt.

```sh
npm ci
npm run build
npm run verify:build
npm run test:forge-progress
XEN_CHROMIUM_PATH=/usr/bin/chromium npm run test:forge-progress:browser
npm run bench:forge-progress
npm run test:merge
npm run test:p4c2-n21
```

Browserprüfungen hier: systemweites Chromium, abgefangene HTTPS-Testadresse; echte WebAudio-/Worker-Ausführung. Reale Rechenzeiten hängen von Gerät, Figur, Rezept und Browser ab. Ein Hördurchgang auf dem Live-Gerät und ein eigener Opera-Test wurden in dieser Cloud nicht durchgeführt. Sehr kurze oder bereits vorbereitete Renders dürfen direkt fertig sein; die Oberfläche simuliert keinen längeren Ladevorgang. Donor wird weiterhin über seinen bestehenden Analyse-/Renderfortschritt geführt; die acht neuen Modus-Szenarien ersetzen keine neue Donor-Hörabnahme.

Die Cloud-Startanleitung wurde gemäß `cloud-environment-onboarding:setup` auf die neue Testdatei und Fokustests aktualisiert. Der Umgebungsentwurf ist gespeichert; eine dauerhafte Übernahme erfolgt über die Umgebungseinstellungen und deren Veröffentlichung.
