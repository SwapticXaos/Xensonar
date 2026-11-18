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

## Stufe 1: was gleitet, was am Ende umschaltet
| Teil | während des Übergangs |
|---|---|
| Drums, Bass (Rhythmus-Takt), Drum-Echo, Metronom-Puls | **gleitet** Schlag für Schlag |
| Partikel-Quantisierung | **gleitet** |
| Material-Loop, Root Follow Loop, Melodic Loop | bleiben beim alten Tempo, übernehmen das Ziel **am Ende einmal** (wie eine Reglerbewegung) |
| gehaltene Hold/Thunder-Muster, Drone-Rhythmus/Wobble | ebenso: Ziel am Ende; neu angeschlagene Hold-Muster nehmen das Tempo des Zustands |

**Stufe 2 (offen):** Loops gleiten mit (stetige Rate im Material-Phasen-Worklet und im RFL-Worklet, Zeitleisten-Buchhaltung über die Karte statt Neustart), gehaltene Hold/Thunder-Uhren und Drone-Rhythmus lesen die Karte. Jeweils mit PCM-Vergleich.
