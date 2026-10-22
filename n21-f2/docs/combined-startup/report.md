# XenSonar P7.39 · Combined Nodal / Starter Grid / Startup

**Zwischenstand – Gesamtregression noch offen.** Dieses Paket liefert den aktuellen Quellenstand mit den bereits ausgeführten fokussierten Prüfungen und Ressourcenmessungen. Die vollständige native Browser-Gesamtmatrix wurde für diese Zwischenübergabe noch nicht ausgeführt; dies ist keine abgeschlossene Produktionsfreigabe.

Die fokussierten nativen Protokolle dokumentieren ihre jeweiligen Zwischenstände: Starter-Grid und Starter-Bedarf wurden vor dem abschließenden aktiven Build geprüft, Nodal-Dauerhaftigkeit und Export auf dem integrierten Nodal-Quellstand. Die abschließenden zwölf Startmessungen und der zurückgehaltene Donor-/Eltern-Play-Versuch verwenden die aktive Fassung `602dc819…`. Daraus wird kein vollständiger nativer Gesamtregressionsnachweis dieses SHA abgeleitet.

Prüfstand 22.10.2026. Exakter Vorfahr: `18fc0331a58fd7528d9f7c071418ebe590bd0b68`, Branch `codex/granular-sample-hold`. Neue aktive Datei: `Xensonar_P7_39_Combined_Startup_Test.html`.

## Herkunft und Entscheidungsumfang

Die Übergabe `XenSonar_Codex_P7_38_to_Combined_Nodal_StarterGrid_Handoff.zip` trägt SHA-256 `0ca611d038f5b3983986c4ab1b1d248fbf418451e6fb5a7879104e140925bab9`. Der kumulative SOURCE-Patch trägt `4c4978bc1a013076fe3c48c13304706094fe3845d3b6fa12100aec75c68271eb` und betrifft 64 Dateien. Sein unveränderter Kandidat wurde bytegenau als 5.884.717 Bytes mit SHA-256 `572971dd9c06fd4aee243625e1b3d377933e35477304ec619a7b918509c56370` reproduziert. Die beiden gleich benannten P7.38.12-Teilzweige sind Geschwister; angewendet wird ein gemeinsamer Quellenstand. Der alternative HTML-Patch und die beiden Teilpatches werden nicht zusätzlich angewendet.

Der Bericht trennt übernommene Übergabearbeit, korrigierte Eigentums-/Persistenzgrenzen und verworfene beziehungsweise zurückgestellte Aussagen. Details und vollständige Quelldifferenzprüfung liegen unter `docs/combined-startup/source-review.md`.

## Stufenentscheidung

| Bereich | Entscheidung | Begründung |
| --- | --- | --- |
| Gemeinsamer 64-Dateien-Quellenstand | Übernommen mit gezielten Korrekturen | Bytegenau reproduziert; strukturelle und wörtliche Änderungen aller Dateien geprüft. |
| Fünf Starter-Grid-Profile, natives Harmonic Minor, Custom-Anzeige | Übernommen | Native Tonhöhenpools, explizite Masken und vorhandene Audio-Eigentümer bleiben maßgeblich. |
| Migration bestehender Starter | Korrigiert | Namen, ursprüngliche Modi/Masken, exakt null Offsets und bekannte Sessionherkunft müssen übereinstimmen; umbenannte oder bearbeitete Daten bleiben erhalten. |
| Transaktions-Fence des Nodal-Exports | Korrigiert | Ein Promise nach Request-Erfolg beweist keinen dauerhaften Commit; Veröffentlichung muss nach Transaktionsabschluss erfolgen. |
| Bedarfsgesteuerte Workspace-Hydrierung | Gezielte Erweiterung | Verhindert deterministisch das ungefragte Lesen aller gespeicherten PCM-Assets; asynchrone Hydrierung schützt vor leerem Autosave. |
| Bedarfsgesteuerte Starter-Audiovorbereitung | Korrigiert | Die drei Starter-Audiomaterialien werden erst auf tatsächliche Verwendung vorbereitet; reine Initialisierung startet keinen OfflineAudioContext. |
| Neue direkte Nodal-Snapshot-Route | Als nächste Karte zurückgestellt | Versioniertes Schema, vollständige Abhängigkeitsmenge und sämtliche Blob-Verbraucher müssen zusammen umgestellt werden. |
| Universelle Crashbehebung / Astra als nachgewiesenes Primärmodell | Nicht als Behauptung übernommen | Die erforderlichen Geräte-/Laufzeitnachweise stehen nicht zur Verfügung. |

## Native Persistenzbefunde

Im isolierten Chromium-Origin wurde nach tatsächlichem IndexedDB-Request-Erfolg die Transaktion abgebrochen. Der frühere Schreib-Promise meldete trotzdem Erfolg; der Datensatz fehlte. Der Export-Fence verhinderte bereits einen RFL-Bankeintrag, aber die Materialbibliothek hatte den nicht dauerhaft gespeicherten Eintrag vorher veröffentlicht. Auch ein injizierter QuotaExceededError auf dem nativen Store erzeugte einen solchen Material-Geistereintrag. Das reproduziert einen konkreten Fehlermechanismus. Es beweist nicht die Ursache des früher vom Benutzer beschriebenen stummen Objekts; dessen ursprünglicher Browserstore stand nicht zur Verfügung.

Die korrigierte Grenze wartet auf den Transaktionsabschluss. Die eigenständige neue Nodal-Direktroute samt versioniertem Snapshot und vollständiger Blob-Abhängigkeitsmenge bleibt eine ausdrücklich abgegrenzte nächste Implementierungskarte. In dieser Freigabe bleibt die vorhandene gerenderte Material-/WAV-Route für Nodal erhalten; die Architekturentscheidung wird nicht als bereits implementierte Direktwiedergabe ausgegeben. Exportveröffentlichung und RFL-Mitgliedschaft folgen der dauerhaften Registrierung. Abbruch, Quota-Fehler, Löschung während des Exports und fehlendes IndexedDB müssen vor Veröffentlichung scheitern. Der Prüfstand protokolliert Fehlerstufe, Fehlername und Identität. Die tatsächlichen Fälle und Ausgaben stehen unter `results/combined-startup/nodal/`.

Die gerenderte WAV ist in der vorhandenen Nodal-/Hybrid-Materialroute eine notwendige Wiedergabeabhängigkeit, kein optionaler Cache. Fehlende gespeicherte Audioblobs lösen einen sichtbaren `MissingMaterialAudioError` mit Materialidentität und Fehlerstufe aus. Der native Exportversuch prüft Nodal, Synth und Hybrid jeweils unmittelbar, nach Bearbeiten/Löschen des Quellprojekts und Presets sowie nach vollständigem Dokumentneuladen: Der WAV-Hash bleibt pro Export gleich; alle drei Routen liefern ein messbares Signal. Synth verwendet weiter seine vorhandene direkte Synthroute. Dies ist ein Browser-Audiobeweis ohne physisches Ausgabegerät.

Der Archivversuch speichert 55 Materialien und hält neben dem bisherigen Fenster von 48 unreferenzierten Einträgen drei ältere RFL-Bankreferenzen sichtbar. Alle 55 Datensätze bleiben im IndexedDB-Store; die drei referenzierten Exporte und die Bankzuordnung überleben die Katalogbegrenzung und das Neuladen. Verdrängung aus dem sichtbaren Fenster ist somit keine Löschung gespeicherter Nutzerdaten. Die zehn nativen Dauerhaftigkeitsfälle prüfen außerdem Löschung vor Commit und nach Request-Erfolg, freigegebene DB-Verbindungen über einen Versionswechsel sowie den Erhalt einer laufenden Bearbeitung während der Hydrierung. Die abgetrennte nächste Architekturkarte mit den gemeinsam umzustellenden Eigentümern steht in `results/combined-startup/nodal/BOUNDED_SNAPSHOT_IMPLEMENTATION_PLAN.md`.

## Startressourcen und Aussagegrenzen

Es wurden wiederholte Kaltstarts und Starts mit acht gespeicherten Workspaces gemessen. Jeder Workspace enthält zwölf Sekunden Stereo-PCM bei 48 kHz sowie eine Mono-Analysekopie; zusammen 52,73 MiB persistiertes PCM. Vor der Änderung wurden beim Wiederöffnen ungefragt alle acht Assets in einen dauerhaften Preload-Cache gelesen. Im betrachteten Startfenster starteten weder Worker noch AudioContext noch Audiodecode. Die Messung stützt deshalb eine gezielte bedarfsgesteuerte Hydrierung der Workspace-Assets; eine allgemeine Behauptung über Audio-Worker-Fan-out wäre unbelegt.

Zeit-, Long-Task- und Heapwerte streuen auf dem gemeinsam genutzten Host erheblich. Der frühere Batch `retained-summary.json` ist durch einen gleichzeitig laufenden CPU-Diffprozess kontaminiert; seine Zeitwerte dienen keinem Geschwindigkeitsvergleich. Seine wiederholten deterministischen Befunde bleiben auswertbar:

| Stufe, jeweils drei Starts | Ungefragte Asset-Lesevorgänge bei acht gespeicherten Workspaces | Dauerhaft vorgeladene Workspaces | Backing-Storage im betrachteten Fenster |
| --- | ---: | ---: | ---: |
| Original P7.38 | 8 / 8 / 8 | 8 / 8 / 8 | 100,046–100,047 MiB |
| Unveränderter kombinierter Übergabekandidat | 8 / 8 / 8 | 8 / 8 / 8 | 100,068–100,080 MiB |
| Bedarfsgesteuerte Hydrierung | 0 / 0 / 0 | 0 / 0 / 0 | 48,873–49,627 MiB |

Die zwölfsekündigen Stereo-Assets plus Mono-Analysekopie benötigen zusammen exakt 55.296.000 Bytes (52,73 MiB). Das neue Laden erfolgt erst auf Workspace-Anforderung, mit zusammengeführten Anfragen und höchstens einem Asset-Leser. Jeder Workspace erhält seine eigene PCM-Kopie; Bearbeitung oder Transfer eines Buffers verändert keinen anderen Workspace. Die konkrete Opera-/Firefox-Absturzmeldung wurde nicht reproduziert. Der Zusammenhang zwischen Startressourcen und dem gemeldeten Browserabsturz bleibt eine Hypothese; keine Aussage über universelle Absturzfreiheit, physische Audioausgabe oder tatsächliche Opera-/Firefox-/PipeWire-Hardware wird abgeleitet.

Der native Hydrierungsversuch hält den tatsächlichen gespeicherten PCM-Empfang zurück. Der Donor-Editor und sein Autosave bleiben bis zur Wiederherstellung ungemountet. Auch der übergeordnete Forge-Play-Versuch im Donor-Hörmodus mit gezeichneter Figur bleibt als `donor-pending` gesperrt: kein fertiger Cache, kein grüner Play-Zustand, kein falsches 100%-Signal und kein Audio-/Offline-/Medienstart mit einem Standarddonor. Nach Freigabe kommen gespeicherter Donor, exakte Auswahl und echter Autosave zurück; ein weiteres Dokumentneuladen erhält das Material.

Starter-Audio besitzt eine gemeinsame bedarfsgesteuerte Vorbereitung. Gleichzeitige Anforderungen teilen denselben Auftrag; erst dauerhaft gespeicherte Materialien werden verfügbar. Die vorhandenen nativen Material-/RFL-Controller und direkte Buchstaben-Hotkeys warten auf diese Vorbereitung und lesen anschließend den aktuellen Katalog. Stop, Bankwechsel oder eine neuere Auswahl verwerfen die veraltete Fortsetzung; reine Registrierung startet keine Wiedergabe. Ein bereits fertiges oder bewusst gelöschtes Demo wird beim bloßen Öffnen eines Managers nicht neu gerendert. Die synchrone bisherige Quick-Aktivierung behält ihren Boolean-Vertrag; bedarfsgesteuerte UI-Aktivierung besitzt eine eigene explizite Operation.

Diese Änderung verschiebt Datenladen und Audiovorbereitung auf tatsächliche Verwendung. Sie ist kein JavaScript-Code-Splitting: Die rund 5,91 MB große einzelne HTML-Datei enthält weiterhin den gesamten Anwendungscode und wird beim Öffnen weiterhin geparst und kalt kompiliert. Belegt sind vermiedene unangeforderte PCM-Lesevorgänge und automatische Audioberechnungen. Ein verlässlicher Zeitgewinn, die Ursache der gemeldeten Browserabstürze oder eine Garantie gegen Abstürze sind damit nicht belegt.

Die abschließende serielle Vergleichsmessung umfasst zwölf frische Browserstarts: je zwei leere und zwei mit acht Workspaces bestückte Starts pro Stufe. Die Messung wartet auf den tatsächlich gemounteten einzelnen React-Root, zwei Frames und ein zweisekündiges Fenster ohne Bedienung. Das reine Dokument-`load` genügt wegen Top-Level-Await nicht als Bereitschaftsnachweis. `final-summary.json`, drei Rohprotokolle und zwölf CPU-Profile dokumentieren jede Messung. Die aktive HTML ist 5.906.819 Bytes groß und trägt SHA-256 `602dc8199d85cf49cd259aad14e3f13de6a071d2e1e53f0105af7babd86b504c`.

| Finale serielle Messung, jeweils zwei Starts | Backing-Storage nach GC | RSS des aktiven Renderers | Unangeforderte Asset-Lesevorgänge / vorgeladene Workspaces | OfflineAudioContexts |
| --- | ---: | ---: | ---: | ---: |
| Original / leer | 47,31 MiB | 194,20–194,25 MiB | 0 / 0 | 0 |
| Original / acht Workspaces | 100,05 MiB | 245,56–245,72 MiB | 8 / 8 | 0 |
| Übergabekandidat / leer | 48,87–51,15 MiB | 210,43–215,29 MiB | 0 / 0 | 3 |
| Übergabekandidat / acht Workspaces | 101,60 MiB | 261,55–261,58 MiB | 8 / 8 | 2 |
| Finale Fassung / leer | 47,35 MiB | 196,45–199,38 MiB | 0 / 0 | 0 |
| Finale Fassung / acht Workspaces | 47,35 MiB | 198,42–201,54 MiB | 0 / 0 | 0 |

Alle vier finalen Starts erzeugen null Worker, AudioContexts, OfflineAudioContexts und Decode-Aufrufe; im Workspace-Cache liegen null unangeforderte Fixture-PCM-Bytes. Alle zwölf Versuche behalten einen React-Root und zwei Canvasflächen mit zusammen 970.760 Backing-Pixeln; es gibt keine Seitenfehler. Beim Übergabekandidaten kann der vorgeschaltete Fixture-Initialisierungsbesuch bereits einen Teil seiner automatischen Defaults vorbereitet haben; die beiden OfflineAudioContexts im bestückten Fall sind deshalb keine vollständige Maximalzahl. Die Speicherentlastung bestückter Workspaces ist wiederholt messbar; die leere finale Fassung bleibt nahe am Original. Die Messwerte rechtfertigen weiterhin keine Prozentangabe für einen Startzeitgewinn.

## Erhaltung und Freigabebeweis

Alle alten aktiven HTMLs und veröffentlichten Artefakte bleiben erhalten. Das neue Ledger reversiert jede erklärte Änderung exakt auf den Vorfahren und bindet vollständige aktuelle Quelldateien, neuen Build-/Head-Extension-Code und die gesamte Manifestreihenfolge an SHA-256. Die bisherige P7.38-/P7.24-Prüfkette arbeitet weiterhin auf den rekonstruieren ursprünglichen Bytes; historische Verträge werden ausgeführt. Die ersten 121 Einträge der Prüfsummenliste bleiben bytegleich. Fünf neue Artefakte erweitern die Liste auf 126 Einträge.

Die frische Host-Gesamtmatrix umfasst 84 Prüfungen: **68 bestanden, 16 fehlgeschlagen**. Die vier zusätzlichen fokussierten Hostprüfungen für Intake-Persistenz, Hydrierungsowner, Starter-Bedarf und native Controller bestanden. Die vollständige native Chromium-Gesamtmatrix wurde nicht gestartet und bleibt offen. Protokolle und vollständige Zeilen stehen unter `results/combined-startup/host-validation.{json,log}`; die fokussierten Nachweise stehen in `focused-host-validation.{json,log}`. Acht neu geschriebene historische Ergebnisdateien wurden nach Beweissicherung bytegenau aus dem eingefrorenen Git-Vorfahren wiederhergestellt. Der separate vollständige historische Quellen-/Dateibeweis bestand für 2.218 Pfade und den unveränderten Präfix von 121 Prüfsummen.

| Offene Host-Befunde | Anzahl | Einordnung anhand des Protokolls |
| --- | ---: | --- |
| `meta-menu-design-parity-keyboard`, `meta-menu-p726-editor-ui`, `meta-menu-p729-ui`, `meta-menu-p730-engage`, `p728-sessions-reiter-interactive`, `p728-sessions-tab-two-state`, `p730-quickdock-first-layout`, `p732-meta-navigation-menus`, `p733-library-links-and-corner`, `p734-meta-mini-preview` | 10 | Isolierte Ausschnitte laden den neuen echten `__XenStarterMaterialStatus`-Owner nicht; `ReferenceError`. Die zugehörigen alten Verhaltensprüfungen sind deshalb noch nicht vollständig ausgeführt. |
| `test_material_standalone_preview`, `p734-material-preview-state`, `meta-save-from-quick` | 3 | Isolierte Fixtures fehlen `__XenStarterMaterial` beziehungsweise `__XenStarterInstalled`; `ReferenceError`. |
| `microphone-capture`, `audio-carrier-analysis` | 2 | Assertions verlangen bisherige deutsche Formulierung beziehungsweise Großschreibung `Filter`; die übernommene englische Fehlermeldung stimmt damit nicht überein. |
| `p7_live_grid_space_behavior` | 1 | **UNGELÖSTER VERTRAGSKONFLIKT:** Der bisherige Test verlangt einen nach Keyup weiterhin gehaltenen Space-Zustand; die Übergabe enthält sofortiges Wiederverbinden. Eine kreative/native Verhaltensprüfung und die Entscheidung über den richtigen Vertrag stehen noch aus. Der Test wird nicht als obsolet verworfen. |

Diese Einordnung ist keine pauschale Entwarnung für die fehlgeschlagenen Verträge. Vor einer Gesamtfreigabe müssen die Fixtures an den tatsächlichen Besitzergrenzen ergänzt und sämtliche betroffenen Verhaltensfälle erneut ausgeführt werden.

Das Quellen-ZIP wird ohne Git-Datenbank entpackt, neu gebaut und mit den Preservation-/Fokustests geprüft. Der Netto-Quellenpatch wird zusätzlich gegen den exakten Vorfahren angewendet und erzeugt dieselbe aktive HTML. Feste ZIP-Zeitstempel machen unveränderte Paketinputs deterministisch. Dependencies werden für den Prüfbeweis aus dem vorhandenen gepinnten `node_modules` verknüpft; das Paket dokumentiert `npm ci` für eine frische Installation.

## Nächste Schritte

1. Die 16 offenen Host-Befunde an echten Owner-/Wortlaut-/Space-Verträgen bearbeiten, betroffene Fälle erneut ausführen und danach vollständige Host-/native Chromium-Gesamtregression am eingefrorenen Stand abschließen.
2. Die ursprüngliche Opera-/Firefox- und PipeWire-Hardwareumgebung prüfen, einschließlich längerer Live-Nutzung und vorhandener Benutzerdaten. Eine Crashursache ist bislang nicht bewiesen.
3. Die abgegrenzte direkte, unveränderliche Nodal-Snapshot-Architektur mit vollständiger Abhängigkeitsmenge und allen Blob-Verbrauchern umsetzen; die jetzige notwendige Nodal-/Hybrid-WAV-Route erst nach diesem gemeinsamen Umbau ablösen.

## Tatsächliche Modellrollen

Sol 6.1 High führte Quellenintegration und Starter Grid, native Nodal-DB-Forensik und Korrekturen, Startressourcenmessung und bedarfsgesteuerte Hydrierung einschließlich nativer Controller sowie Freigabeintegration, Tests und Paketierung aus. Auch die wiederaufgenommenen Integrationsagenten liefen mit Sol 6.1 High. Ein zusätzlicher Agent `combined_inventory` mit `gpt-6-luna`, Reasoning High, übernahm ausschließlich lesende Archiventpackung, Prüfsummen-/Dateiinventar und Basispatchprüfung ohne Anwendungsausführung. Weitere Modelle wurden nicht eingesetzt. Eine primäre Astra-Ausführung ist anhand dieses Laufs nicht überprüfbar; ein Werkzeug zum Umschalten stand nicht zur Verfügung.
