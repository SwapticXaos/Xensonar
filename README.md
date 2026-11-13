# XenSonar

Experimentelles, offlinefähiges Musikinstrument im Browser: mikrotonal, frei in Tuning und Zeit.

- `index.html`: die komplette App. Diese eine Datei wird auf Netlify veröffentlicht oder direkt im Browser geöffnet. Sie wird aus `src/` gebaut: `python3 tools/build.py`.
- `source-manifest.json`, `src/`, `styles/`: die App in 368 Quelldateien, gegliedert nach dem Oktober-Quellbaum; `src/post-oct/` enthält, was seither neu ist.
- `CLAUDE.md` und `docs/`: Arbeitsregeln, Philosophie, Architektur, Heiß/Kalt-Vertrag.
- `evidence/`: Prüfberichte früherer Stände.

## Versionen

Jede Version liegt als eigener Zweig `version/...` vor (auf GitHub oben links im Zweig-Menü auswählbar).

| Tag | Stand |
|---|---|
| `version/xensonar-3.1.6-maerz` | alter Quellcode-Stand (März 2026) |
| `version/w31-milestone` | W31-Meilenstein |
| `version/w31-af01-ml01-kh04` | W31 mit AF01/ML01/KH04 |
| `version/dub-echo-03-racklive-01` | Dub Echo + geschützte Drum-Rack-Regler |
| `version/liveguard02` | zusätzlich Slider-Gate für die Hauptraum-Regler |
| `version/dub-echo-04` | Echo mit Time Warp, N in M, Enter-Übernahme |
| `version/livepath-01` | Live-Pfad entlastet: Session-Sicherung, Drone-Automation, XNC opt-in |
| `version/livepath-02` | kein App-Neuaufbau pro Schlag mehr |
| `version/pkg-boot-tdz-01` | Paket-Import: Startfehler nach dem Wiederherstellen behoben |
| `version/bass-drag-01` | Bass-Regler im Live-Pfad |
| `version/thunder-hpp01e-noteclip04` | Stand vom 11.11. (Forge-Eintritt, Hörweisen, Melodic-Loop-Copy/Paste) |

Die Zweige `claude/…` sind Arbeitsstände der einzelnen Sitzungen; der jeweils neueste Stand steht in `docs/` (`STATUS_…`, `PATCH_…`, `AUDIT_…`).

Zweig `reference/ts-400.2`: historischer TypeScript/React-Quellbaum (September), nur lesen; Herkunftskarte `docs/TS_ORIGIN_MAP.json`.

Zweig `reference/waypoints`: historische Runtimes 26.10.–W31 für die Herkunftsanalyse. Herkunftskarte: `docs/provenance/PROVENANCE.md`.

Zweig `gpt-dub02`: parallele Echo-Linie DUB02 aus der GPT-Phase, zum Zusammenführen.
