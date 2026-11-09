# XenSonar – HTML-first-Auslieferungsvertrag (sessionübergreifend)
Stand: 2026-10-24 · Version 1.0

## Geltungsbereich und Zweck

Gilt für XenSonar-Patches, Codex-/ChatGPT-Builds, Konsolidierungen und experimentelle Branches. **Getrennte Systeme:** Dieser Vertrag betrifft die von Assistenten bereitgestellten Entwicklungs-Artefakte; der Package-Station-Export im laufenden XenSonar sichert dagegen die musikalischen Nutzerdaten (`.xenpack`). Die beiden Exportpfade dürfen weder vermischt noch gegeneinander ausgetauscht werden.

## Release-Gate

1. Zu einem als testbar ausgelieferten Stand **muss eine echte, im Browser eigenständig ausführbare `.html`** vorliegen, separat und in einem ZIP mit identischen Bytes. Ein Quellpatch allein reicht nicht.
2. Die ZIP enthält zusätzlich nur die erforderlichen Patches/Handoffs/Tests/Manifest; keine beliebig gedoppelten `node_modules`, `.git`-Ordner oder Vollsource-Meilensteine. Das vollständige Quellpaket bleibt bei der dokumentierten Basis, solange sie verfügbar ist.
3. Vor Auslieferung: `build` (wenn Source vorhanden), `build --verify` (wenn möglich), relevante Unit-/Integrations-/Browserchecks, SHA-256 und Größe; danach ZIP-Inventar, CRC, Manifest, **Bytegleichheit der HTML im ZIP und daneben** prüfen.
4. Jeder Nutzer-Download erhält konkrete, echte Links auf tatsächlich existierende Dateien (z. B. Dateien im Chat-Anhang) – **keine** bloßen `/workspace/output`, `/tmp/...`, Codex-Arbeitspfad-, erfundenen `sandbox:`- oder GitHub-Pfade. Falls nur die Bibliothek dauerhaft zugänglich ist, Artefakt dort zusätzlich als normale Datei sichern.
5. Der Handoff dokumentiert genaue Basis (Dateiname+Hash/Repo-Commit), den Patch/die Quellkorrekturen, Teststatus inklusive nicht ausgeführter Prüfungen, HTML-Hash, Bytezahl und die Wiederaufbaukommandos. Alte Dateien nicht überschreiben, sondern eindeutige Releasebezeichner verwenden.
6. Bei fehlendem Build-Werkzeug, unmöglichem Abruf oder gesperrter Browserumgebung **kein 'fertig' behaupten**. Fehlschlag in Bericht; wenn eine verifizierte Standalone-HTML aus derselben Source rekonstruierbar ist, diese tatsächlich herstellen und prüfen.
7. Keine Download-URL ist von einem Chat/einer Sitzung auf Lebenszeit garantiert. Wenn ein Link scheitert, zusätzlich die persistierte Datei in der ChatGPT-Bibliothek aufsuchen, ins aktuelle Arbeitsverzeichnis kopieren/materialisieren und einen **neuen echten** Link erzeugen.

## Für Codex-Artefakte

Codex muss Dateien aus seinem `/workspace/output`-Verzeichnis tatsächlich in einen Nutzer-abrufbaren Bereich veröffentlichen/übergeben. **Ein Pfad in einer Statusmeldung ist keine Übertragung.** Der Zielstand braucht eine HTML, auch wenn der Sourcepatch als primärer Code-Handoff dient. Code darf nicht ohne Prüfung zwischen abweichenden Git-/ChatGPT-/Codex-Arbeitsumgebungen verknüpft werden. Kompatibilität und Herkunft müssen im Manifest stehen.

## Lokales Werkzeug: HTML_FIRST_RELEASE_V1.py (nur Python-Standardbibliothek)

```bash
python3 HTML_FIRST_RELEASE_V1.py package \
  --html /pfad/zu/gebauter_Standalone.html \
  --patch /pfad/zu/Quellpatch.zip \
  --handoff /pfad/zu/Handoff.md \
  --name XenSonar_RELEASE_TEST \
  --out /pfad/zu/Ausgabe \
  --base 'genaue-Basis+Hash' \
  --expected-sha '64-hex-zeichen'

python3 HTML_FIRST_RELEASE_V1.py verify \
  --html /pfad/zu/Ausgabe/XenSonar_RELEASE_TEST.html \
  --zip /pfad/zu/Ausgabe/XenSonar_RELEASE_TEST.zip
```

Falls in einer anderen Session **nur das Komplett-ZIP** verfügbar ist, lässt sich die enthaltene HTML kontrolliert wiederherstellen:

```bash
python3 HTML_FIRST_RELEASE_V1.py recover \
  --zip /pfad/zu/XenSonar_RELEASE_TEST.zip \
  --out /pfad/zum/neuen/Ausgabeordner
```

Dieser Import prüft anschließend die HTML-Bytes, sämtliche Manifest-Hashes und das Archiv; bei defekter ZIP erfolgt kein Erfolg. Aus einem reinen Quellpatch-ZIP kann `recover` bewusst keine HTML herbeizaubern – dafür ist ein reproduzierbarer Source-Build nötig.

Fehlen HTML, valide Header/Abschluss, die erwartete SHA oder ein Paketbestandteil, endet der Prozess mit Exitcode 1; niemals entsteht absichtlich ein grüner 'HTML-Erfolg' ohne HTML. Neue Zieldateien werden nicht still überschrieben. Das Werkzeug kompiliert XenSonar nicht und prüft nicht die Klangfunktion: Es ist ein **Delivery-Gate**, kein Ersatz für Anwendungstests und kein Fix für ChatGPT/Codex-Plattforminfrastruktur.

## Reproduktion des Reparaturfalls P4.1

- Ausgangsquelle: `XenSonar_P4_0_Modular_Source.zip` (separat in Bibliothek).
- Patch: `XenSonar_P4_1_Auswahl_Quellpatch.zip`.
- Quell-Anwendung: `python3 apply_p41.py /pfad/zur/entpackten/P4.0/source` (alle Input-/Payload-Hashes werden validiert).
- Build: `node build.cjs && node build.cjs --verify`.
- Wiederhergestellte Standalone: **6.366.594 Bytes**, SHA-256 `c92e8d2973a0c7c0108503f06cf9c1b09751c2360ef66c5923dbfd4411e6a0bb`, stimmt exakt mit P4.1-Dokumentation überein.
- Lokale Prüfungen am 24.10.: Source-Contract, 15/15 HTML-Syntax, Editable-Build, P1, P2, P3, P4, P4.1 Source Contract bestanden. Der eigens erstellte Release-/Wiederherstellungsprüfer bestand 7/7 automatisierte Testfälle. `package` und `verify` sind durchgelaufen (ZIP **1.891.520 Bytes**).
- Browser-Smoke-Versuche waren durch `net::ERR_BLOCKED_BY_ADMINISTRATOR` in dieser isolierten Browserumgebung unter `file://` und `http://127.0.0.1/` blockiert – **hier keine neue native Browser-Abnahme**. Im P4.1-Patchkit liegen ältere dokumentierte Browser-Akzeptanzberichte; das ist nicht dasselbe wie heute erneut erfolgreich ausgeführte Tests.

## Grenzen

Dieser Vertrag kann Arbeitsergebnisse in zugänglichen Entwicklungsumgebungen absichern und im Projektarchiv persistieren. Er kann keine defekte Downloadfunktion der ChatGPT-/Codex-Oberflächen systemweit reparieren, keine nicht verbundene frühere Codex-Sandbox rückwirkend öffnen und keine vollständige Wiederherstellung eines beliebigen fremden Entwicklerbranches garantieren.
