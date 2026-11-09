# Mehrspurraum (Raum IV): Bestandsaufnahme und Wiederverwendungsplan

Stand: 09.11.2026, Basis `main` = `livepath-02`. **Reine Lesestudie, keine Produktänderung.**
Status aller Aussagen: **CODE_PRESENT** (im Quelltext gefunden und gelesen). Nichts davon ist im Browser, per PCM oder durch Abhören geprüft.

## Leitidee

Sparsam und eng verschaltet: Der Mehrspurraum enthält **keinen eigenen Klang-Code**. Er ordnet Bestehendes neu, und zwar in **Zeit (Zeitleiste)**, **Mischung (Kanalzüge, Master)** und **Ablage (kalte Projekte)**. Neu geschrieben wird nur, was es nachweislich noch nicht gibt.

Das Bild: Der Live Room ist ein **heißes**, umschaltbares Loop-Instrument mit bis zu drei gleichzeitigen Materialspuren. Der Mehrspurraum ist dasselbe Material in **abgekühlter** Form: vorgeplant, ruhig, nicht auf drei Spuren begrenzt, als Kreuzung aus Live Room und Wave Editor in einer eigenen Hülle.

---

## 1. Was schon da ist

### 1.1 Materialspuren (Live Room)

| Baustein | Owner / Datei | Was er kann | Rolle im Mehrspurraum |
|---|---|---|---|
| `__XenMaterialLayers` | `src/mix/03_quick_menu__before_eq-core.js:114` | Primärspur plus höchstens 2 zusätzliche hörbare Spuren (`if(ids.length>=2)return false`), Reihenfolge, Restore | Vorbild für die Spurliste. Die **Grenze 3 gilt für den Live-Betrieb** und wird im kühlen Raum nicht übernommen. |
| `__XenMaterialPrimarySwitch` | ebd. `:198` | Primärspur stummschalten | Mute pro Spur |
| `__XenMaterialVoiceMix` | ebd. `:456` | Pro Material-ID: `volume` 0–1,5, `pan` −1…1, `pitch` ±1200 Cent, `att` ±2 (Nudge), `nudgeMode` (`granular`/`vinyl`), `nudgeFeel` (`soft`/`hard`); Gesten, Revisionen, getrennter UI-Notifier | **Kanalzug und Clip-Parameter**, direkt übernommen. Hier ist schon gelöst, dass Audio vor UI kommt (`uiNotify.queue()` bei kontinuierlichen Gesten). |
| `__XenTimeStablePitch` | ebd. `:253` | AudioWorklet `XenLaneShift`: tempo-erhaltende Tonhöhe, Hann-Overlap, Ringpuffer 32768, ±1200 Cent, Mess-Sonde | **Clip-Tonhöhe** ohne neuen DSP |
| `__XenMaterialPhase` | ebd. `:531` | Phasen-Transport im Worklet: Idle und Vinyl lesen PCM direkt, Granular nutzt zwei überlappende, phasengleiche Hann-Leser; Quellbänke pro AudioContext; vorbereitende Arbeit gibt mit `scheduler.yield()` Rechenzeit ab | **Elastische Clip-Wiedergabe** (granular/tape) |
| `__XenNudgeOptions`, `__XenNudgeMotion`, `__XenNudgeFeedback` | ebd. `:1732ff` | Nudge-Modi, Gefühl, Vorschau | Clip-Feinverschiebung live; im kühlen Raum: Versatz in Samples |
| Materialspur-Start | `src/audio/01_voice_and_rfl_ownership.js:401–568` | Taktinterpretation (auch Bruchteile von Takten: *„Fractional material is a musical span“*), Rate-Grenzen 0,125–8×, Wechsel an der nächsten Raum-Taktgrenze, Pro-Material-EQ (`__XenEQ.create(ctx, keyFor('material', id))`), Pan, Pitch-Worklet, Routing auf Rhythm-Bus, Myzel-Post-FX, Forge-Send | Zeigt die **vollständige Signalkette pro Spur**. Diese Kette soll wiederverwendet werden, ohne den Loop-Scheduler zu übernehmen. |
| `materialTrackLifecycleRegistry` (`registerMaterialTrackGainNode`) | `src/audio/01_voice_and_rfl_ownership.js` | Lebenszyklus der Audioknoten pro Material | Spurknoten registrieren statt eigener Verwaltung |
| Material-Metadaten | u. a. `src/forge/editor/05_machine_and_carrier_projection.js`, Material-Export | `bpm`, `bars`, `beatsPerBar` (1–16), `loopStartSec`/`loopEndSec`, `guide.segmentsPerBar`, `guide.markers16`, `rootHz`, Elastizität (`raw-granular-elastic` / `raw-tape-coupled`) | **Das ist bereits eine Clip-Beschreibung.** Jedes Material ist ohne Umbau „clipfähig“. |

### 1.2 One-Shot-Fills und Freeze

| Baustein | Owner / Datei | Was er kann | Rolle |
|---|---|---|---|
| `__XenOneShotAudio` | `src/mix/03_quick_menu__before_eq-core.js:819` | Abspielen je nach Quellformat, Taktung mit freier Phase, begrenzte Stimmen. **Varianten werden offline gerendert** (*„Rendering is offline and never schedules Grains on the actual Live Room AudioContext“*), dekodierte Quellen und gerenderte Varianten haben eigene Budgets (24 MB / 48 MB). | **Vorlage für Freeze:** granular bearbeitete Clips offline festrendern und als einfaches PCM abspielen |
| `__XenOneShotLivePort` | ebd. `:795` | Bindung an die Live-Power und den Master-Ausgang | Muster für die Bindung des Mehrspurraums an den Master |
| `__XenOneShotAssignments` | ebd. | Zuordnungen | Ereignis- bzw. Trigger-Spur |

### 1.3 Wave Editor W01 (Bearbeitungskern)

| Baustein | Owner / Datei | Was er kann |
|---|---|---|
| `__XenWaveCoreW01` | `src/post-oct/015-xen-wave-editor-w01-modules.js` (ca. 200 KB) | PCM-Dokument mit Zeit in ganzen Samples und halboffenen Bereichen; Bearbeitungen verändern die Eingabe nie. 31 Operationen, u. a. `cut`, `trim`, `split`, `insertSilence`, `mixPaste`, `moveMix`, `fadeIn`/`fadeOut`, `normalize`, `reverse`, Mono/Stereo. Undo/Redo mit Speicherbudget (64 MB), Marker, Peaks, `analyze`, Resampling mit Fenster-Sinc (Radius 16), `encodeWav` (16-Bit mit optionalem TPDF-Dither, 32-Bit Float), Projekt `.xwe` (`application/x-xensonar-wave-project`) |
| Effektkette (Offline) | ebd. `:605ff` | **25 Effekte:** Gain, Fade In/Out (Kurvenexponent, `equalPower`), Tief-/Hoch-/Bandpass, Notch, parametrischer EQ, Low/High Shelf, Kompressor, **Lookahead-Limiter**, Gate/Expander, Delay, algorithmischer Hall (4 Kamm- + 2 Allpassfilter), Phaser, Flanger, Chorus, Tremolo, Balance, Stereobreite, 5 Verzerrer-Varianten. **Automationsspuren pro Parameter** (`automation[key].points[{frame,value}]`, Interpolation `linear`/`hold`). Ketten speicher- und ladbar, A/B-Vergleich, „Preview FX“, „Apply / Bake“, Live-Room-EQ offline (`__XenWaveOfflineEQ`) |
| Golden Move | ebd. | Gestengesteuertes Verschieben mit Überlaufschutz |
| `__XenWaveTaktometer` | `src/rooms/lab.js:1496` | Taktlineal über der Wellenform: Taktanzahl (auch Bruchteile) und Segmente (1–16) |

**Folge:** Verschieben (Move/MixPaste), Fades, Schnitt, Clip-Effekte und Automation gibt es schon, allerdings **innerhalb einer Datei**. Der Mehrspurraum braucht davon keine eigene Version. Er öffnet einen Clip im Wave Editor und erhält ein neues Asset zurück (nicht-destruktiv).

### 1.4 Masterbus und Mastering

| Baustein | Owner / Datei | Was er kann |
|---|---|---|
| Final Mix Bus `sh()` | `src/runtime/instrument/02_observation_and_sample_storage.js:128–137` | **Ein Owner pro AudioContext** (*„Main mix bus belongs to another active AudioContext“*). Kette: Eingänge `main`/`drone`/`rhythm`/`space` → `premaster` → `glue` → Clipper (WaveShaper) → Limiter (DynamicsCompressor) → Output-Trim → Ausgang; Analyser vor FX, nach FX und am Monitor |
| `getLiveMasterBus(ctx, kind)`, `getLiveMasterEffectBus` | ebd. `:157` | Benannte Master-Eingänge |
| Live Mastering | `src/runtime/instrument/01_voice_gradients_and_effects.js:39` | `liveMasteringEnabled/Strength/Glue/Air`, automatischer Trim, Master-Monitor |
| Aufnahmeziele | ebd. `XZ`, `$Z` | Mit und ohne Drums (eigener Clipper/Limiter ohne Drums), Capture-Bus für externe Spiele |
| `__XenEQ`, `__XenEqLive`, EQ-UI | `src/quickrack/equalizer/` | EQ-Kern, Worklet und Bedienung, über `keyFor(kind, id)` adressierbar |
| `__XenPan`, `__XenMixTargets` | `src/mix/01_pan.js` | Pan-Routing pro Ziel |

**Folge:** Einen Masterbus gibt es. Der Mehrspurraum bekommt **einen weiteren benannten Eingang** am bestehenden Master (z. B. `arrangement`) statt eines eigenen Masters. Damit gelten Live Mastering, Recording und LoopRec automatisch mit.

### 1.5 Aufnahme und Ernte

| Baustein | Owner / Datei | Was er kann |
|---|---|---|
| `__XenLoopRec` | `src/post-oct/gaps/010-main-bundle__15_after_03_pcm_master_recorder.js:122` | Aufnahme-Abgriffe pro Quelle (`wave`, `keyboard`, `particle`, `rootFollow`), EQ vor dem Abgriff, Takes |
| `__xenLongMasterPCM` | `src/post-oct/gaps/010-main-bundle__14_after_02_rfl_worklet.js:6` | Lange Master-Aufnahmen in IndexedDB `xensonar-master-long-sessions-v1`, Batches zu 4 MB, Segmente zu 600 s, begrenzte Warteschlange |
| PCM Master Recorder, FLAC/WAV-Export | `src/audio/03_pcm_master_recorder.js`, `src/audio/03_recorder.js` | Export WAV/FLAC |

**Folge:** Lange Takes sind schon **in Stücken gespeichert**. Das ist das Muster, um lange Clips zu streamen, statt sie vollständig zu dekodieren.

### 1.6 Sessions, Assets, Pakete

| Baustein | Owner / Datei | Was er kann |
|---|---|---|
| `__createXenMetaSessionStore` | `src/sessions/v2-session-store.js:729` | Live-Sessions (Paletten): `items`, `colors`, `roomSettings`, `songPerformance`, `sessionTakes`, `loopBarEdits`, `drumWorkspace`, `saved[]`; `localStorage` V2 plus kompakter Boot-Seed |
| `__XenSongKinds` | `src/mix/03_quick_menu__before_eq-core.js` | `grid`, `material`, `rootFollow`, `drum`, `bass` |
| `__XenDataContractsV1` | `src/contracts/01_asset_contract.js` | Versionierte Asset-Beschreibung `xensonar.asset` (`audio/pcm`, `audio/wav`, IDs `asset:`) ohne Ein-/Ausgabe |
| `__XenReferenceGraphP26/P27`, `__XenReferenceIntegrityP25` | `src/contracts/07–09_*.js` | Referenzindex über die Repositories mit Adaptern pro Verbraucher |
| `__XenPackageTransactionsV1`, `__XenImportCoordinatorV1`, `__XenProjectCommitP37`, Export-Stream | `src/contracts/03,04,16_*.js` | Paket-Transaktionen, fortsetzbarer Import, Commit-Grenze von Projekten |
| Package Station / Eye | `src/package_station/` | Bestand, Export, gezieltes Löschen mit Schutz geteilter Assets |

**Folge:** Ein Mehrspurprojekt ist ein **weiterer Verbraucher** von Assets. Es bekommt einen neuen Adapter im Referenzgraphen (z. B. `arrangement.clip.asset`). Damit kann die Package Station kein Asset löschen, das ein Arrangement benutzt, und `.xenpack` nimmt Arrangements mit.

### 1.7 Zeit und Raum

| Baustein | Owner / Datei | Was er kann |
|---|---|---|
| Gemeinsame Zeit `sM()` | `src/audio/01_voice_and_rfl_ownership.js:18` | Anker, BPM, Quantisierungsraster, Referenztakte 0,125–16, absolute Schrittposition; Spuren `MATERIAL_TRACK`, `RHYTHM_PATTERN` |
| Drum-/Bass-Scheduler | `src/rhythm/`, `src/audio/07_governor_and_drums.js` | Tick alle 25 ms, Vorlauf ≥ 0,32 s, Schläge sample-genau |
| Raumwechsel | Raumknöpfe I `LIVE ROOM`, II `MATERIAL FORGE` (`L3LAB` → Chunk `lab`), III `NODAL CENTER` | Ein Knopf **IV** passt in dieses Muster |
| Lazy-Räume | `src/startup/00_room_and_function_dispatch.js` | `lab`, `canonical`, `nodal` als Chunks, die beim ersten Bedarf ausgewertet werden; Funktionsinseln. Die Liste ist fest im Code (`kind!=="lab"&&…`). |
| AudioContexts | Live: `src/runtime/instrument/03_selection_and_recording_tools.js:264` (`latencyHint:'interactive'`); Forge-Vorschauen mit eigenen 44,1-kHz-Kontexten, die im Leerlauf geschlossen werden | Der Mehrspurraum nutzt **den Live-Kontext** (wegen des einzigen Masterbus-Owners), keinen neunten Kontext |

---

## 2. Was wirklich neu ist

Nach Abzug des Bestands bleibt:

| # | Neu | Warum nicht vorhanden | Schätzung (lesbar) |
|---|---|---|---|
| N1 | **Clip-Modell und Arrangement-Projekt** (Spuren → Clips: Asset-Ref, Ausschnitt `[start,end)`, Position, Elastizität, Tonhöhe, Gain, Fades, Herkunft) mit kaltem Speicher in IndexedDB und Adapter im Referenzgraphen | Live-Sessions sind Paletten (gleichzeitig verfügbar), keine Zeitachse | 25–40 KB |
| N2 | **Zeitleisten-Scheduler (kühl):** plant Clips mit langem Vorlauf auf der vorhandenen Spurkette; Neuplanung nur ab einer geänderten Stelle | Der bestehende Scheduler denkt in Loops und Taktgrenzen | 20–35 KB |
| N3 | **Verhältnis-Raster und Snap:** Takt als frei wählbare Schlagzahl in frei wählbarer Unterteilung, Taktwechsel pro Abschnitt, Polymetrik pro Spur, freie Zeit (s/Samples), Snap abschaltbar | Taktometer und Guides **zeigen** Raster (1–16 Segmente), es gibt aber **kein Einrasten** auf der Zeitachse (kein `snapTo` im Code) | 15–25 KB |
| N4 | **Hülle für Raum IV:** Spurenansicht (Canvas mit Peaks aus W01), Listenansicht für Tastatur und Screenreader, Ansagen über `aria-live`, Kanalzüge aus `__XenMaterialVoiceMix`/`__XenEQ`/`__XenPan` | Kein Raum zeigt mehrere Spuren über die Zeit | 60–100 KB |
| N5 | **Brücken:** „Send to Arrangement“ nach dem Muster von „Send to Material Track“ aus Forge, Wave Editor, LoopRec-Takes, Long Master, One-Shots und Live-Sessions | Ziel existiert noch nicht | 10–20 KB |
| N6 | **Freeze und Streaming:** Clips per OfflineAudioContext festrendern (Muster: One-Shot-Varianten), lange Clips in Stücken nach dem Muster von `__xenLongMasterPCM` | Bisher immer an einen Owner gebunden | 15–25 KB |
| N7 | **Mixdown:** derselbe Plan im `OfflineAudioContext`, Encoder vorhanden | Kein Mehrspur-Render | 5–10 KB |

**Summe neu: ca. 150–255 KB lesbarer Code**, als komprimierte Lazy-Insel geschätzt 50–90 KB. Die erste Schätzung lag bei 300–450 KB. Der Unterschied ist das, was Materialspuren, Wave Editor, Master und Verträge schon mitbringen.

**Bewusst nicht neu:** Clip-Effekte und -Automation (Wave Editor), Masterbus und Live Mastering, EQ, Pan, Tonhöhe, elastische Wiedergabe, WAV-/FLAC-Encoder, Asset-Verträge und Paketlogik.

**Die neue Ebene danach** (Klang und Effekte, getrennt planen): Sinc-Interpolation in den Grain-Lesern, LUFS/True Peak, 24-Bit-Export, Granular an Transienten ausgerichtet, Faltungshall, Latenzausgleich.

---

## 3. Architektur: ein Spur-Baustein, zwei Taktgeber

```
            ┌──────────────── bestehend, unverändert ────────────────┐
Live Room:  Loop-Scheduler (heiß)  ──┐
                                     ├─► Spurkette: Phase/Elastik → Pitch → EQ → Pan → Gain
Raum IV:    Zeitleisten-Scheduler ───┘        (MaterialPhase, TimeStablePitch, __XenEQ, __XenPan,
            (kühl, neu, N2)                    VoiceMix, LifecycleRegistry)
                                                          │
                                         Master: Eingang „arrangement“ → premaster → glue → clip → limit → trim
```

**Grundsatz (Nutzerentscheidung 09.11.):** Live Room und Raum IV laufen **nie gleichzeitig**. Wer im Mehrspurraum arbeitet, braucht den Live-Pfad nicht. Die Frage lautet also nicht, ob man den Live-Pfad unangetastet lassen kann, sondern **wie sauber umgeschaltet wird**. Gemeinsamer Code darf dafür umgebaut werden. Die einzige Pflicht: Nach dem Umbau klingt der Live Room wie vorher. Gemeinsam genutzt wird der Code, nicht die Laufzeit.

**Modus statt Eingriff (Nutzerentscheidung 09.11.):** Ein einziger Modus-Owner kennt den aktiven Zustand, `live` oder `mehrspur`. Im Modus `live` ist die Loop-Uhr der Strukturgeber, im Modus `mehrspur` die Zeitleiste. Die Spurkette bleibt dieselbe und fragt nur, wer gerade den Takt vorgibt. Zwei Regeln dazu:
- **Wechsel an der Grenze:** Ein Schalter beendet nichts, was schon läuft. Beim Wechsel legt sich der bisherige Modus mit seinen vorhandenen Mitteln schlafen (Live-Power aus, eingeplante Ereignisse verwerfen), danach wacht der neue auf.
- **Nur beim Wechsel abfragen:** Bausteine melden sich beim Modus-Owner an und werden einmal benachrichtigt. Kein Abfragen des Modus pro Scheduler-Tick oder Audioblock (Zone HEISS bleibt unberührt).

**Umschaltung, drei Bausteine:**

- **U1 Modus-Owner mit Übergabe:** Beim Betreten von Raum IV werden Material-Loops, One-Shots und Drum-/Bass-Scheduler des Live Room gestoppt. Live-Power aus (`__XenOneShotLivePort.setPower(false)` gibt es), Spurknoten über die Lifecycle-Registry freigeben, Visuals parken. AudioContext und Masterbus bleiben. Beim Verlassen: Arrangement-Knoten abbauen, Live-Zustand aus der Session wiederherstellen (der Session-Store hält ihn schon). Heute ist ein Raumwechsel nur `setRoom(...)` (z. B. `cH()` in `src/rhythm/02_bass_and_rack.js:1061`). Die Forge bleibt nach dem ersten Öffnen versteckt eingehängt (`__xenForgeWasOpened`, Keepalive für die Package Station). Ob der Live Room beim Wechsel in die Forge heute verstummt, ist **nicht geprüft**.
- **U2 Taktgeber als Parameter der Spurkette:** Die Kette (Phase/Elastik → Pitch → EQ → Pan → Gain) bekommt ihren Taktgeber übergeben: Loop-Uhr (Standard im Live Room, Verhalten unverändert) oder Zeitleisten-Uhr (Raum IV).
- **U3 Instanzen statt Einzelstücke:** `__XenMaterialVoiceMix` und `__XenMaterialLayers` sind heute Singletons (IIFE), die nach Material-ID schlüsseln. Daraus werden Fabriken: Der Live Room behält seine Instanz, Raum IV bekommt eine eigene, die nach **Clip-ID** schlüsselt. Derselbe Code, getrennter Zustand, und die Persistenz der Live-Session bleibt unberührt.

**Regeln:**

1. **Kopieren ist verboten.** Kein zweiter Materialspur-Owner. Gemeinsamer Code wird für U2/U3 umgebaut. Danach folgt **ein** Regressionsvergleich im Live Room (PCM vorher/nachher bei gleichen Material-, Pitch-, Nudge-, EQ- und Pan-Einstellungen, dazu Abhören durch den Nutzer).
2. **Ein Kontext, ein Master.** Raum IV nutzt den Live-Kontext und einen neuen benannten Master-Eingang.
3. **Wenn Raum IV spielt, schläft der Live Room:** keine Partikel und Visuals, keine Loop-Scheduler. Das wird im Patch geprüft (Timer, rAF und Listener zählen).
4. **Kühl heißt vorgeplant:** langer Vorlauf, Neuplanung nur bei Änderung; Live-Granular nur auf der Spur, an der gearbeitet wird, alle anderen als Freeze.
5. **Musikalische Offenheit:** Tonhöhe als Verhältnis bzw. in Cent, Taktmaße frei, kein stilles Quantisieren. Die Live-Grenze von 3 Spuren wird im Mehrspurraum nicht übernommen. Technische Grenzen (Speicher, gleichzeitige Live-Granular-Spuren) werden sichtbar angezeigt.

---

## 4. Zu klären vor dem ersten Code

| Frage | Wo nachsehen | Warum |
|---|---|---|
| Wo greift der Loop-Taktgeber in die Spurkette (`src/audio/01_voice_and_rfl_ownership.js:401–568`, `:680`, `:1029–1089`)? | Aufrufkette `$fe` / `zfe` / `cV`, Refs `sourceRef`, `gainRef`, `pitchRef`, `panRef` | Zeigt, wo U2 ansetzt und was der Live-Regressionsvergleich abdecken muss |
| Was läuft heute nach einem Raumwechsel im Live Room weiter (Audio, Scheduler, Timer, rAF)? | `setRoom`-Aufrufer, Effekte abhängig von `room` | Ausgangslage für U1 |
| Hängt `__XenMaterialVoiceMix` an der Material-ID? Clips brauchen eine **eigene** ID pro Clip | `src/mix/03_quick_menu__before_eq-core.js:456ff` | Zwei Clips desselben Materials mit verschiedener Tonhöhe |
| Darf der Live-Kontext ohne Live-Power laufen? `__XenOneShotLivePort` verlangt aktive Live-Power | `:795ff` | Bestimmt, wie Raum IV startet |
| Interpolation in `XenLaneShift` und im Phasen-Worklet: linear oder Sinc? | `:253ff`, `:531ff` | Klangqualität beim Pitchen (siehe neue Ebene) |
| Erzeugen Phase- und Pitch-Worklet im `OfflineAudioContext` dasselbe wie live? | Prüfstand mit Sweeps und Impulsen | Mixdown muss klingen wie die Wiedergabe |
| Speichergrenzen: Budget für dekodierte Clips, Streaming-Schwelle | One-Shot-Budgets, `__xenLongMasterPCM` | Tablets und Safari |
| Startpfad: Raum-Liste in `__xenLoadDeferred` erweitern, Knopf IV | `src/startup/00_room_and_function_dispatch.js` | Kleinster Eingriff im Start |

---

## 5. Vorgeschlagene Reihenfolge

0. **Vorarbeiten (getrennte Patches):** komprimierte Lazy-Inseln (`DecompressionStream` ist schon im Code) mit Messung der HTML-Größe vor und nach dem Patch; Lesestudie zu Abschnitt 4, Punkt 1.
1. **Kleinste brauchbare Version:** Raum IV als Lazy-Chunk, N1, N2, N4 (Grundansicht und Liste), N5 mit Wave Editor und LoopRec, N7 als WAV. Spuren nutzen die Kette der Materialspuren.
2. **Kühlen:** N6 (Freeze und Streaming), Live-Granular nur auf der gerade bearbeiteten Spur.
3. **Raster:** N3 (Verhältnis-Snap, Taktwechsel, Polymetrik pro Spur).
4. **Neue Klang-Ebene:** getrennt planen und messen (siehe Abschnitt 2).

Jeder Schritt mit Zone, Größenzuwachs der HTML, Test im echten Layout, und Rückweg (Rollback) über die vorherige `index.html`.
