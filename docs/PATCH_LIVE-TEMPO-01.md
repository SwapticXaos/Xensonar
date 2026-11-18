# LIVE-TEMPO-01 · Tempo-Übergang im Live Room über eine Tempo-Karte (Stufe 1)

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium, Messung jedes geplanten Sechzehntels). Nicht gehört.
Zone: **HEISS/WARM-Grenze** (Rhythmus-Takt auf dem Hauptthread, plant 25-ms-weise voraus; keine Allokation pro Schritt, kein React pro Schritt).
Parent `e221175` (`index.html` 8 277 542 B). Neu: `index.html` 8 284 759 B, sha256 `2f39b6f4c79290d0f8f26ac0efdce57bf979157174aaa5135d49e7cd3429de2a` (**+7 217 B**). Rollback: `e221175`.
Ersetzt den verworfenen TEMPO-RAMP-01 (`docs/PATCH_TEMPO-RAMP-01.md`).

## Warum der erste Versuch granular klang (gemessen/gelesen)
1. Der Drum/Bass-Takt rechnete jeden Sechzehntel als `Schritt × Schrittdauer` ab Audiozeit 0 (Anker `GPe = 0`). Jede Tempoänderung setzte deshalb auf `ceil(jetzt / neue Schrittdauer)`: nach einigen Minuten Laufzeit ein Sprung an eine beliebige Taktposition.
2. Der Tempo-Setter des Reglers setzt zusätzlich das Partikel-Raster neu an (`_w`), und Loops starten bei jeder Tempoänderung neu.
Bei ~30 Schritten in Folge stolperte der Puls also bei jedem Schritt neu los.

## Neue Strategie: der Takt ist Owner der musikalischen Zeit
- **`__XenLiveTempo`** (`src/rhythm/04_workspace_and_transport.js`): Tempo-Karte Schlagposition ↔ Audiozeit, exakt geschlossen gerechnet; das Tempo ändert sich **gleichmäßig pro Schlag**: `bpm(b)=f+k(b−b0)`, `t(b)=t0+(60/k)·ln(bpm(b)/f)`, danach konstant. Stetig in Position und Tempo an beiden Enden.
- **Ohne Übergang** ist die Karte das bisherige absolute Raster; der Takt läuft dann im **unveränderten** alten Code.
- **Start:** Die Bedienung stellt nur eine Anfrage. Der Takt beginnt den Übergang an seinem **ersten noch nicht geplanten Sechzehntel**: Nichts bereits Geplantes verschiebt sich, kein Schritt fällt weg oder doppelt, die Taktposition (Schritt im Takt, Taktzähler) läuft durch.
- **Während des Übergangs** plant der Takt jeden Sechzehntel aus der Karte; Schrittdauer = Abstand zum nächsten Kartenpunkt (Bass-Notenlängen, Drum-Echo folgen). Das Partikel-Raster liest dieselbe Karte (gleiches Raster, Anker = letzter Kartenpunkt, Schritt = örtlicher Abstand).
- **Ende:** Der Tempo-Zustand der App wird **einmal** geschrieben (kein Neuansetzen, kein Traffic-Reset); die Karte führt die Phase mit dem Zieltempo weiter.
- **Andere Tempoänderungen** (Regler, Preset, Session) sind wie bisher ein Sprung: Die Karte kehrt zum absoluten Raster zurück. Der Regler übernimmt also sofort. **Stop** friert auf dem nächsten ganzen BPM ein. Power aus mitten im Übergang: Zieltempo wird gesetzt.
- Bedienung: Live Room → Time & Echo, unter dem Tempo-Regler: `Tempo → [BPM] BPM in [Takte] bars [Go]`, während des Laufs `Stop · aktuell → Ziel`. 1 Takt = 4 Schläge (Live-Room-Takt wie Loop-Rec), Bruchteile erlaubt. Spalte wächst nicht (gemessen bei 1024/1440/1920 px).

## Messung (echte App, Chromium, `tests/e2e/live_tempo_ramp.cjs`)
- 108 → 140 BPM in 2 Takten: **32 gleitende Sechzehntel** (= 8 Schläge), Nachbarabstände ändern sich um **höchstens 0,91 %**, monoton, vorher exakt 60/108/4 s, nachher exakt 60/140/4 s; keine Lücke, kein Doppel; Start an einem vor Go nicht geplanten Schritt; Tempo-Zustand **einmal** geschrieben.
- 140 → 100 in 4 Takten (abbremsend): Partikel-Raster nutzt mitten im Übergang die örtliche Schrittdauer (< 2 % Abweichung); Stop mittendrin schreibt einmal einen Wert zwischen Start und Ziel; weiterhin keine Lücke/kein Doppel.
- Regler-Klick danach: klassisches Raster zurück.
- Regressionstests 132/132; Browser-Teillauf 34/34 (u. a. Stimmen-Host-PCM-Vergleich, Stem-Nulltests, RFL-Uhr, Thunder, Tasten-Wächter): ohne Übergang unverändert.
- `tests/live_tempo_map.test.cjs`: Umkehrbarkeit, Stetigkeit an beiden Enden, exakte Dauer `(60/k)·ln(to/from)`, einmaliger Commit, Stop, Power aus, kein laufender Takt.

## Stufe 2 (18.11.): alle Tempo-Folger des Live Rooms auf der Tempo-Karte

`index.html` 8 284 759 → 8 290 714 B (**+5 955 B**), sha256 `4e33a0efe957c515a694e3fdbe75a7d06744113fdf6372eca151a1a584ab49e0`. Rollback: `917942a`. Tests: `run_tests.sh` 132/132; Browser-Teillauf Audio/Live Room 37/37; voller Lauf davor 83/86 (rot: `grid_drag_selection` bekannt wackelig, zwei Messtests mit zu knappen Erkennungsgrenzen, inzwischen robust: Median/Untergrenze statt Einzelwerte).
Nutzermeldung nach Stufe 1: Root Follow Loop und Enter-Hold liefen nicht mit, „vielleicht auch andere Funktionen nicht in Harmonie“.
Ursache: Root Follow, Material-Loop und Drums rechneten ihre Taktgrenzen je für sich ab Audiozeit 0; Loops und Holds liefen während des Übergangs im alten Tempo und starteten beim Landen neu (gemessen: Root Follow danach 0,18 Schläge neben dem Raster).

**Prinzip:** Wer linear ab einem Anker plant, behält sein Starttempo („Folgetempo“, `followKey`) und bekommt die Zeit über die Tempo-Karte verzerrt: Position = Schläge seit dem Anker, in Sekunden des Folgetempos. Ohne Übergang ist die Verzerrung die Identität (alte Rechnung, bitgleich). Ein echter Tempo-Sprung (Regler) setzt wie bisher neu an.

| Teil | Anbindung | Nachweis (Chromium, gemessen) |
|---|---|---|
| Drums, Bass, Drum-Echo, Metronom | Stufe 1 | 32 gleitende Sechzehntel, Nachbarabstand ≤ 0,91 % |
| Partikel-Quantisierung | Stufe 1 | örtliche Schrittdauer < 2 % |
| **Root Follow Loop** (Worklet-Programm, Schnipsel-Plan `V2`, Fragmente `R3`, Synth-Muster `lSe`) | Anker auf der Taktlinie der Karte (`alignBar`), Positionsrechnung verzerrt (`warpElapsed`, Worklet `warp`), Synth-Noten in Folgezeit geplant und zurückgerechnet, kein Neustart beim Landen | `tests/e2e/live_tempo_rfl.cjs`: Klicks vorher +0,198, nachher +0,251 Schlag (eingeschwungen bei 108 bzw. 140: +0,185 / +0,262), danach stabil, ein Worklet-Knoten. Gegenprobe Stufe-1-Stand: −0,107 neben dem Raster, Neustart, 3 Ausreißer |
| **Hold/Thunder** (Keyboard und Enter; C11/Entrophon und Nodal) | gemeinsame Hold-Uhr `xenHoldStepFrame` rechnet Schrittzeiten über die Karte; C11 erfährt laufende Übergänge per `HOLD_WARP`, Nodal per `hold-clock-update` (Vergleich um Kartenversion ergänzt); Intervall aus dem Folgetempo | `tests/e2e/live_tempo_hold.cjs`: C11-Anschläge zur Uhr Median vorher/während/nachher 46,7 / 46,3 / 46,2 ms, Drift 0,3 ms/s, eine Sitzung; Nodal erhält die Karte |
| **Material-Loop** (Phasen-Worklet; Rückfallweg nativ) | Leseschrittweite pro Audioblock × bpm(t)/Folgetempo; nativ exakte exponentielle Raten-Rampe; Einsatz auf Taktlinie der Karte; kein Neustart beim Landen | `tests/e2e/live_tempo_material.cjs`: Abstand Klick–Schlag 46,44 / 46,7 / 46,78 ms (vorher/während/nachher), 140 BPM danach, ein Worklet-Knoten |
| Drone-Rhythmus, Refucktor-Mute-Muster und -Wobble, Enter-Hold-Psy-FX | Puls aus Kartenschlägen bzw. gleitendem Tempo; Musterschlüssel aus Folgetempo (kein Neuansatz) | gelesen; Drone im Standard aus, nicht gemessen |

Psy-Lab-Klänge auf dem Enter-Hold pulsen nicht (Thunder ist dort aus); sie sind vom Tempo nicht betroffen. Der Melodic Loop folgt seinem eigenen Komponisten-Tempo, nicht dem Live-Room-Tempo.

**Grenzen / offen:** Material-Loop: spätere Phasen-Übergaben (ATT-Änderung, Takt-Bearbeitung) rechnen nach einem Übergang linear ab ihrem Anker (kleiner Versatz möglich, nicht gemessen). Root Follow: Impuls-Raster (Slots pro Zyklus) nicht verzerrt (im Standard aus). Material-Loop klingt beim Gleiten wie Resampling (Tonhöhe folgt dem Tempo, wie bisher bei jeder Tempoänderung). Nicht gehört.

## Stufe 1: was gleitet, was am Ende umschaltet (Stand vor Stufe 2)
| Teil | während des Übergangs |
|---|---|
| Drums, Bass (Rhythmus-Takt), Drum-Echo, Metronom-Puls | **gleitet** Schlag für Schlag |
| Partikel-Quantisierung | **gleitet** |
| Material-Loop, Root Follow Loop, Melodic Loop | bleiben beim alten Tempo, übernehmen das Ziel **am Ende einmal** (wie eine Reglerbewegung) |
| gehaltene Hold/Thunder-Muster, Drone-Rhythmus/Wobble | ebenso: Ziel am Ende; neu angeschlagene Hold-Muster nehmen das Tempo des Zustands |

**Stufe 2:** siehe oben (umgesetzt).

## Nachtrag 18.11.: Länge in Takten oder Schlägen
Der Live-Room-Takt ist fest 16 Sechzehntel (Drum-Muster = Takte × 16 Schritte; N-in-M, Triolen usw. liegen in den Segmenten innerhalb des Takts). „In N Takten“ zählt also den Takt von Drums und Loop-Rec. Neu: Einheit wählbar (`bars` / `beats`) in derselben Zeile; in Schlägen beliebige Zahl (z. B. 7). Test `tests/e2e/live_tempo_beats.cjs`: 7 Schläge = 28 gleitende Sechzehntel, 1 Takt = 16; Spalten- und Seitenhöhe bei 1024/1440/1920 px unverändert. `index.html` +561 B.
