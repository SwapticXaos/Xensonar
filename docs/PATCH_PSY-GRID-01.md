# PSY-GRID-01 · Psy-Lab-Klang im Live-Raum hält sich an Raster und Mute-Muster

Parent: `a9d8ea8` (`index.html` 8 076 990 Bytes). Rollback: `a9d8ea8`.
Neu: `index.html` 8 077 494 Bytes (+504 Bytes), sha256 `76ee022ba19e2477475b37ee0f2f2228039110d00a9886c65f7743acdba496ad`.
Zone: WARM (Hauptraum-Zeiger → gehaltene Psy-Lab-Note); der Psy-Lab-Folgeschritt läuft im vorhandenen Bildtakt, keine neue Allokation, kein neuer Audioknoten.
Status: CODE_PRESENT, BROWSER_CHECKED (Chromium headless). **Nicht gehört.**

## Problem (Nutzermeldung)
Wave Starter mit Psy-Lab-Klang (z. B. *Barber Spiral*), 31-EDO mit Kirchentonart, Snap an, linke Maustaste gehalten: Der Klang glitt durch alle Zwischentöne, auch über gemutete Rasterstufen. Die grüne Linie zeigte dabei eine Stufe der Tonleiter an. In Raum V (Psy Lab) trat das nicht auf.

Messung auf dem Parent (`tools/probes/psylab_wave_glide_probe.cjs`): ~63 % der Haltezeit mehr als 5 Cent neben einer offenen Rasterlinie, bis 38 Cent daneben, 40 von 140 Tonhöhen nahe gemuteten Linien.

## Ursachen
1. Die gehaltene Note glitt exponentiell zum Ziel, also auch über die Zwischentöne (`__XenPsyLab`, `src/mix/02_performance_catalog.js`).
2. Ihr Ziel (`focusHz`, `src/app/forge/01_room_shell.js`) rastete auf die nächste **aller** Rasterzeilen ein, gemutete eingeschlossen, und anders als der Anschlag des Wave Starters (`xm` → `lZ`).

## Änderung
- `focusHz` nutzt denselben Snap wie der Anschlag (`xm`): nächste offene Rasterlinie, gemutete Stufen werden übersprungen.
- Mit Snap springt die gehaltene Note direkt von Rasterton zu Rasterton wie das Pad in Raum V (`cursor.snap()`). Ohne Snap gleitet sie frei wie bisher.
- Wunsch „Wave Starter vom Raster entkoppeln“: Das gibt es bereits. Mit **Snap aus** gleitet die Maus frei, während die Tastatur weiter nur die offenen Rastertöne spielt (Live-Raum: `keyboardExactPitchHz` aus den Rasterzeilen; Raum V: `wF` mit Mute-Muster). Akkorde auf den Tasten plus Glissando-Lead mit der Maus gehen also schon. Ein zweiter Schalter wäre doppelt, deshalb steht es jetzt am Schalter:
  - Live-Raum, *Controls & Space*: Hinweiszeile unter „Snap Cursor to Grid“ plus Tooltip.
  - Raum V: Tooltip an „Snap ball to grid“.

## Daten-Owner
Unverändert: `lockCursorToGrid` und Mute-Muster gehören dem Hauptraum (nexusParams / `__NodalBallGrid`). Keine neue Persistenz, keine Migration.

## Tests
- Neu `tests/e2e/psylab_live_grid.cjs`, fünf Fälle:
  1. Snap an: alle gehaltenen Tonhöhen auf offenen Linien, keine nahe gemuteten; in Ruhe = Snap des Wave Starters.
  2. Zeiger genau auf einer gemuteten Linie: Es klingt der offene Nachbar.
  3. Snap aus: freies Glissando.
  4. Snap aus, Akkord auf der Tastatur (gleicher Psy-Lab-Klang) plus Maus-Lead: Die Tasten bleiben auf offenen Linien, die Maus gleitet.
  5. Der Hinweis steht am Schalter.
  Auf dem Parent rot (111 Tonhöhen neben dem Raster), auf dem neuen Stand grün.
- `room5_live_psylab`, `room5_live_psylab_xgradient`, `room5_psylab` grün; `run_tests.sh` 121/121; `build.py --check` OK; Browser-Suite komplett grün (39 e2e + 5 Oktober-Browsertests).

## Offene Risiken
- Mit Snap an gibt es beim gehaltenen Psy-Lab-Ton jetzt Stufen statt Gleiten. Das ist die Raum-V-Semantik. Wer im Live-Raum mit Snap gleiten will, schaltet Snap aus. Nicht gehört.
- Der Glide-Regler des Patches (Engine-Parameter `glide`) wirkt weiter im Klangerzeuger. Die Stufen sind also so weich, wie der Patch es vorgibt.
