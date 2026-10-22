# XenSonar – Codex-Handoff 22.10.2026, aktualisiert

**Ausgangsreferenz:** P7.24 (`e3568a8`), aktueller Codex-HEAD unbekannt.  
**Letzter kumulativer modularer Quellpatch:** P7.24 → P7.37 Rhythm.  
**Neuester gesicherter Browser-Stand:** `XenSonar_P7_37_GridProfiles_Hover_BootGuard_Test.html`.

**Dieses Paket enthält:** vollständiges Master-Patch-Logbuch seit P7.24, aktualisierte Codex-Mergeanleitung, einen geprüften kumulativen **Source**-Patch bis P7.37 Rhythm, zwei **alternative kumulative HTML-Netto-Diffs** bis zum neuesten Teststand (ab P7.37 bzw. direkt ab P7.24), die neueste Test-HTML und ein SHA256-Manifest mit lokaler Integritätsprüfung.

**Neue Entwicklung nach dem alten Handoff:** Grid-Profile/Period Workbench, Native-Workbench-Grafik-/BP-Mode-Korrekturen, Taktzahlen in Hover für Material/RFL/Drums/Bass, Dock-Boot-Guard mit zwei konsistenten RAF-Geometrien sowie befristete Startup-Diagnostik. Audio- und Browserabsturzfragen bleiben ausdrücklich offen.

**Achtung:** Die neuesten Profile/UI/Hover/Boot-Änderungen sind bisher **HTML-only**. Ihre Übertragung in modulare Quellen ist ein konkreter Codex-Arbeitsschritt. Die direkte HTML-Netto-Diff ist **kein** fertiger modularer P7.24→LATEST-Quellpatch; sie ist die prüfbare Zielbeschreibung. Die beiden HTML-Patches dürfen **nicht nacheinander** auf dieselbe Datei angewandt werden.

**Codex soll mit `CODEX_MERGE_RUNBOOK.md` beginnen** und vor Integration den tatsächlichen HEAD und eventuelle eigene Audio-/Entrophon-Änderungen prüfen. Nur Netto-Diffs verwenden, keine historische Patchkette.
