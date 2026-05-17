![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# Karpathy LLM Wiki Plugin für Obsidian

> KI-gestützte strukturierte Wissensbasis — wandelt Notizen automatisch in ein Wiki um. Basierend auf [Andrej Karpathys LLM Wiki-Konzept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Autor:** Greener-Dalii **Version:** 1.8.0

![Version](https://img.shields.io/badge/version-1.8.0-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.6.6%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-8-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-8%2B-cyan?style=flat-square)

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[Offizielle Website](https://llmwiki.greenerai.top/) | [Diskussionen](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

## Über LLM Wiki

Notizen schreiben. KI organisiert. Fragen stellen. Das ist alles.

**Das Problem.** Notizen enthalten wertvolle Informationen — Personen, Konzepte, Ideen, Verbindungen. Aktuell liegen sie jedoch als einzelne Dateien in Ordnern. Um Verknüpfungen zu finden, müssen Sie suchen, kennzeichnen und sich an Zusammenhänge erinnern.

**Die Lösung.** [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) hat einen eleganten Ansatz vorgeschlagen: Notizen als Rohmaterial behandeln und den LLM die Architekturarbeit überlassen. Der LLM liest die Notizen, extrahiert Entities und Concepts und verknüpft sie zu einem strukturierten Wiki — mit `[[bidirektionalen Links]]`, automatisch generiertem Index und Chat-Interface für Anfragen an die eigene Wissensbasis.

**Keine Bibliotheksarbeit mehr.** Keine Bewertung des Seitenwerts. Keine Pflege von Querverweisen. Keine Angst vor veraltetem Content. Notizen in `sources/` ablegen — der LLM liest, extrahiert, schreibt, verlinkt und markiert Widersprüche, während Sie im Flow bleiben.

**Kein weiterer Chatbot.** ChatGPT kennt das Internet. LLM Wiki kennt *Sie* — genauer: das, was Sie ihm beigebracht haben. Jede Antwort enthält `[[wiki-links]]` zurück in den Knowledge Graph. Jede Antwort ist ein Wegweiser, kein Dead End.

---

## Warum Obsidian + LLM Wiki?

Obsidian ist exzellent für vernetztes Denken. Mit einem Nachteil: Sie müssen alle Verknüpfungen manuell erstellen.

LLM Wiki ändert das. Statt den Graph manuell aufzubauen, wächst die KI mit. Neue Konzept-Notiz hinzufügen — das Plugin findet übersehene Verbindungen. Frage stellen — es durchläuft den eigenen Knowledge Graph und liefert Antworten mit Quellenangaben.

- **Graph-Ansicht wird lebendig.** Neue Notizen verbleiben nicht isoliert — sie sprießen Links zu Entities, Concepts und Sources. Der Graph wächst organisch, das Plugin pflegt ihn: Duplikate erkennen, tote Links reparieren, Sprachen über Aliases verbinden.
- **Notizen antworten zurück.** Suche wird Gespräch. "Was habe ich über X geschrieben?" wird Dialog mit Streaming-Antworten und `[[wiki-links]]` als Brotkrumen. Jede Antwort führt tiefer in das eigene Wissen.
- **Obsidian wird Denkpartner.** Nicht mehr nur Notizenschrank, sondern Hilfe beim *Denken* — versteckte Verbindungen aufzeigen, Widersprüche markieren, Erinnern an Vergessenes.

---

## Schnellstart

### Installation

**Empfohlen — Obsidian Community Plugin Market:**

1. In Obsidian zu **Settings → Community plugins** navigieren
2. **Browse** klicken und "Karpathy LLM Wiki" suchen
3. **Install** klicken, dann **Enable**

**Alternative — Community Plugin Website:** [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) besuchen und **Add to Obsidian** für direkte Installation klicken.

**Manuell:**

1. `main.js`, `manifest.json`, `styles.css` von [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases) herunterladen
2. In Obsidian zu Settings → Community plugins navigieren. Im Tab **Installed plugins** das Ordner-Icon klicken, um das Plugin-Verzeichnis zu öffnen
3. Ordner `karpathywiki` erstellen, die drei Dateien darin ablegen
4. In Obsidian das Refresh-Icon klicken — **Karpathy LLM Wiki** erscheint unter Installed plugins
5. Toggle auf Enable setzen

**Entwicklung:** `git clone`, `pnpm install`, `pnpm build`

### LLM Provider konfigurieren

1. Settings → Karpathy LLM Wiki öffnen
2. Provider aus dem Dropdown wählen (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, Ollama, OpenRouter oder Custom)
3. API-Key eingeben (nicht für Ollama erforderlich)
4. **Fetch Models** klicken, um das Model-Dropdown zu füllen, oder Model-Namen manuell eingeben
5. **Test Connection** klicken, dann **Save Settings**

**Ollama (lokal, kein API-Key):** [Ollama](https://ollama.com) installieren, Model pullen (`ollama pull gemma4`), "Ollama (Local)" im Provider-Dropdown wählen.

### Nutzung

| Methode | Vorgehen |
|---------|----------|
| **Ingest from `sources/`** | `Cmd+P` → "Ingest Sources" — gesamten `sources/` Ordner verarbeiten |
| **Ingest any folder** | `Cmd+P` → "Ingest from Folder" — Ordner wählen, Wiki aus bestehenden Notizen generieren |
| **Query Wiki** | `Cmd+P` → "Query Wiki" — Fragen stellen, Streaming-Antworten mit `[[wiki-links]]` erhalten |
| **Lint Wiki** | `Cmd+P` → "Lint Wiki" — Health Scan mit Duplikat-Detection, tote Links, Orphans |

Re-Ingesting derselben Source führt zu inkrementellen Updates auf Entity/Concept-Seiten (neue Info wird gemerged). Summary-Seiten werden regeneriert.

**Smart Batch Skip:** Beim Folder-Ingest erkennt das Plugin automatisch bereits verarbeitete Dateien und überspringt diese, um Zeit und API-Kosten zu sparen. Der Batch-Report zeigt die Anzahl übersprungener Dateien.

### Upgrade von einer älteren Version?

Wenn Sie von einer Version **vor v1.7.11** (oder noch früher) upgraden, wurden Ihre Wiki-Seiten ohne mehrere Funktionen generiert, die in späteren Versionen hinzugekommen sind. Führen Sie nach dem Upgrade diese Schritte aus, um Ihr Wiki auf den neuesten Stand zu bringen:

**1. Index neu aufbauen**
`Cmd+P` → **"Regenerate index"** — Baut `wiki/index.md` mit Alias-Einträgen für jede Seite neu auf. Dies ermöglicht die Alias-basierte Suche (z. B. findet die Suche nach "DSA" die Seite "DeepSeek-Sparse-Attention"). Das alte Index-Format enthielt nur Seitentitel.

**2. Lint Wiki ausführen**
`Cmd+P` → **"Lint Wiki"** — Durchsucht Ihr gesamtes Wiki und zeigt Folgendes an:
- **Fehlende Aliases**: Seiten ohne Aliases (alle Seiten vor v1.7.11). Klicken Sie **"Complete Aliases"** — der LLM generiert Übersetzungen, Akronyme und alternative Namen im Batch. Dies ist entscheidend für die Duplikaterkennung.
- **Doppelte Seiten**: Seiten mit überlappenden Inhalten (z. B. "CoT" vs "Chain-of-Thought", die von älteren Versionen ohne Alias-basierte Deduplizierung erstellt wurden). Klicken Sie **"Merge Duplicates"**, um sie zu verschmelzen und alle Aliases zu erhalten.
- **Tote Links / Leere Seiten / Orphans**: Übliche Wiki-Wartungsprobleme.

**3. Smart Fix All verwenden**
Klicken Sie im Lint-Report auf **"Smart Fix All"** für eine einmalige, kausal geordnete Reparatur: Aliases ergänzen → Duplikate zusammenführen → tote Links reparieren → Orphans verlinken → leere Seiten befüllen. Dies ist der schnellste Weg, ein über mehrere Versionen gewachsenes Wiki zu bereinigen.

**4. Parallele Seitengenerierung aktivieren**
Settings → **Ingestion Acceleration**:
- **Page Generation Concurrency**: Stellen Sie den Wert auf 3 für die meisten Provider (vor v1.7.3 war der Standardwert 1/seriell). Beschleunigt die Ingestion um das 2- bis 3-Fache bei Quellen mit 10+ Entities.
- **Batch Delay**: Beginnen Sie bei 300 ms. Erhöhen Sie auf 500–800 ms, wenn Sie auf Rate Limits stoßen.

**5. Neue Einstellungen prüfen (seit v1.4.0–v1.7.x hinzugekommen):**
- **Wiki Output Language** (v1.6.5): Unabhängig von der UI-Sprache — Ihr Wiki kann auf Deutsch sein, während die Plugin-Oberfläche auf Englisch bleibt, oder umgekehrt.
- **Extraction Granularity** (v1.6.2): Fine/Standard/Coarse steuert, wie tief der LLM Entities aus Quellen extrahiert. "Standard" ist eine gute Voreinstellung.
- **Auto-Maintenance** (v1.4.0): Optionaler File Watcher, periodischer Lint und Startup Health Check. Standardmäßig alle AUS — nur aktivieren, wenn Sie automatische Hintergrundverarbeitung wünschen.

> **Safety**: Parallele Generierung nutzt `Promise.allSettled` — bei Fehler einer Seite laufen andere weiter. Fehlgeschlagene Seiten werden einzeln mit Exponential Backoff wiederholt. Smart Batch Skip (v1.7.7) erkennt automatisch bereits verarbeitete Dateien und spart so Zeit und API-Kosten.

---

## Funktionen

### Knowledge Quality

- **Entity/Concept Extraction** — LLM extrahiert Entities (Personen, Orgs, Produkte, Events) und Concepts (Theorien, Methoden, Terme) aus Notizen
- **Mandatory Page Aliases** — Jede generierte Page enthält mindestens einen Alias (Übersetzung, Akronym, alternativer Name); ermöglicht Cross-Language Duplikat-Detection
- **Duplicate Detection & Merge** — Semantic Tiering erfasst echte Duplikate (Cross-Language-Übersetzungen, Abkürzungen, Schreibvarianten); intelligentes LLM Merge fusioniert Content und bewahrt Aliases
- **Smart Knowledge Fusion** — Multi-Source Updates mergen neue Info ohne Redundanz, Widersprüche werden mit Attribution bewahrt, `reviewed: true` Pages sind vor Überschreibung geschützt
- **Content Truncation Protection** — 8000 max_tokens mit automatischer stop_reason-Detection und Retry bei 2× tokens über alle Providers
- **Verbatim Source Mentions** — Original-Language-Quotes mit optionaler Übersetzung für Nachvollziehbarkeit bewahren

### Maintenance

- **Lint Health Scan** — Duplikate, tote Links, leere Pages, Orphans, fehlende Aliases und Widersprüche in einem umfassenden Report erkennen
- **Semantic-Tier Duplicate Detection** — Tier 1 (direkte Name-Matches: Cross-Language, Abkürzungen, hochähnliche Titel) immer verifiziert; Tier 2 (indirekte Signale: gemeinsame Links, moderate Ähnlichkeit) füllt Token-Budget
- **Smart Fix All** — Kausal geordneter Batch-Fix: Duplikate mergen → tote Links auflösen → Orphans verlinken → leere Pages erweitern
- **Alias Completion** — One-Click parallele Batch-Generierung fehlender Aliases zur Verbesserung zukünftiger Duplikat-Detection
- **Auto-Maintenance** — Multi-Folder File Watcher, periodischer Lint, Startup Health Check (alle optional)
- **Contradiction State Machine** — `detected → review_ok → resolved` (AI Fix) oder `detected → pending_fix` (manuell)

### Query & Feedback

- **Conversational Query** — ChatGPT-Style-Dialog, Streaming Markdown Output, `[[wiki-links]]`, Multi-Turn History
- **Query-to-Wiki Feedback** — Wertvolle Conversations ins Wiki speichern, Entity/Concept Extraction, Semantic Dedup vor dem Speichern
- **Duplicate Save Prevention** — Hash Tracking verhindert Re-Evaluation unveränderter Conversations

### LLM & Language

- **Multi-Provider Support** — Anthropic, Anthropic Compatible, Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, Custom Endpoint
- **5xx Auto Retry** — Alle Clients wiederholen bei HTTP 5xx/429-Fehlern mit Exponential Backoff (max. 2)
- **Dynamic Model List** — Echtzeit-Fetch von Provider-API
- **Wiki Output Language** — Interface-unabhängige 8 Sprachen (Englisch/Chinesisch/Japanisch/Koreanisch/Deutsch/Französisch/Spanisch/Portugiesisch), Custom Input unterstützt
- **Internationalization** — Englisch/Chinesisch Interface-Toggle (Standard Englisch), alle Prompts folgen Language Setting

### Architecture & Performance

- **Parallel Page Generation** — Konfigurierbare 1–5 parallele Pages, 3× Speedup bei großen Sources, per-Page Error Isolation
- **Iterative Batch Extraction** — Adaptive Batch-Sizing, eliminiert max_tokens-Bottleneck bei langen Dokumenten
- **Three-Layer Architecture** — `sources/` (read-only) → `wiki/` (LLM-generated) → `schema/` (co-evolved Config)
- **Modular Codebase** — 13 fokussierte Module in `src/`

---

## Befehle

| Befehl | Beschreibung |
|---------|-------------|
| **Ingest single source** | Einzelne Note auswählen → Wiki-Pages mit Entities, Concepts und Summary generieren |
| **Ingest from folder** | Beliebigen Ordner auswählen → Wiki aus bestehenden Notizen im Batch generieren |
| **Query wiki** | Konversationelles Q&A mit Streaming Output und `[[wiki-links]]` |
| **Lint wiki** | Vollständiger Health Scan: Duplikate, tote Links, leere Pages, Orphans, fehlende Aliases, Widersprüche |
| **Regenerate index** | `wiki/index.md` manuell neu aufbauen |
| **Suggest schema updates** | LLM analysiert Wiki und schlägt Schema-Verbesserungen vor |

---

## Modellempfehlungen

Dieses Plugin folgt Karpathys Kernphilosophie: **den vollen Wiki-Context direkt an den LLM übergeben, statt ihn in RAG Retrieval Shards zu fragmentieren**. Modelle mit langem Context Window werden dringend empfohlen — je größer das Wiki, desto mehr Context benötigt der LLM zur Aufrechterhaltung der Cross-Page Consistency.

> Warum kein RAG? Karpathy hat im [Original-Konzept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) darauf hingewiesen, dass RAG Knowledge fragmentiert und die Reasoning Ability des LLM über den gesamten Knowledge Graph untergräbt.

**Top-Empfehlungen:**

| Modell | Context Window | Begründung |
|--------|----------------|------------|
| **DeepSeek V4** | 1M tokens | Top-Pick — extrem niedriger Preis, exzellente Chinesisch-Kenntnisse |
| **Gemini 3.1 Pro** | 1M+ tokens | Größtes Context Window, starke Reasoning-Fähigkeit |
| **Claude Opus 4.7** | 1M tokens | Stärkste Agent Programming und Reasoning Ability |
| **GPT-5.5** | 1M tokens | OpenAIs neuestes Flagship, AI Intelligence Index Top |
| **Claude Sonnet 4.6** | 1M tokens | Gute Balance aus Speed, Cost und Quality |

Für lokale Modelle (Ollama): Context Windows normalerweise kleiner (8K–128K), empfohlen wird die Nutzung von Cloud-Providern für Ingestion + lokales Modell für Query.

---

## Architektur

Basierend auf Karpathys Three-Layer Separation Design:

```
sources/     # Your Source Documents (read-only)
  ↓ ingest
wiki/        # LLM-generated Wiki Pages
  ↓ query / maintain
schema/      # Wiki Structure Config (Naming Conventions, Page Templates, Classification Rules)
```

**Code-Struktur** (`src/`):

```
wiki/               # Wiki Engine Modules
  wiki-engine.ts    # Orchestrator
  query-engine.ts   # Conversational Query
  source-analyzer.ts # Iterative Batch Extraction
  page-factory.ts   # Entity/Concept CRUD + Merge
  lint-controller.ts # Lint Orchestration
  lint-fixes.ts     # Fix Logic for Dead Links, Empty Pages, Orphans
  lint/             # Lint-Submodule
    duplicate-detection.ts  # Programmatische Kandidatengenerierung
    fix-runners.ts          # Batch-Fix-Ausführungshilfen
  contradictions.ts # Contradiction Detection
  system-prompts.ts # Language Directive + Section Labels
schema/             # Schema Co-Evolution
  schema-manager.ts # Schema CRUD + Suggestions
  auto-maintain.ts  # File Watcher + Periodic Lint
ui/                 # User Interface
  settings.ts       # Settings Panel
  modals.ts         # Lint/Ingest/Query Modals
+ Shared Modules: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

---

## Fehlerbehebung

**"Content truncated"-Fehler?**
- max_tokens erhöhen (Settings → Advanced → Max Tokens)
- Modell mit größerem Context Window verwenden
- Für lokale Modelle Ollamas Context-Window-Einstellung prüfen

**Duplikat-Pages nicht erkannt?**
- "Regenerate index" ausführen, um mit Aliases neu aufzubauen
- Prüfen, ob Pages fehlende Aliases haben (Lint → Alias Completion)

**5xx-Fehler während Ingestion?**
- Plugin wiederholt automatisch mit Exponential Backoff
- Bei anhaltenden Problemen Provider-API-Status prüfen
- Bei Rate Limits Batch Delay in Ingestion Acceleration erhöhen

**Query-Ergebnisse nicht relevant?**
- Wiki-Index neu generieren (Aliases verbessern Search Accuracy)
- Prüfen, ob Wiki Output Language zur Content Language passt

**Tote Links nach manuellen Änderungen?**
- Lint → Fix Dead Links ausführen
- Manuelles Umbenennen von Wiki-Pages ohne Link-Updates vermeiden

---

## Mitwirken

**Issues & Bugs:** [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues)

**Feature Requests:** [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

**Pull Requests:** Willkommen! Bitte beachten:
- `pnpm lint` bestehen (0 Fehler)
- `pnpm build` erfolgreich
- Englische Commit Messages (Conventional Format)
- Dokumentation bei Feature-Änderungen aktualisieren

---

## FAQ

### Warum zeigt Lint bei fast all meinen Seiten "fehlende Aliases" an?

Seiten, die vor v1.7.11 generiert wurden, enthielten keine Aliases. Das ist normal und harmlos — Aliases sind eine Verbesserung, keine Voraussetzung. Klicken Sie im Lint-Report auf **"Complete Aliases"**, damit der LLM Übersetzungen, Akronyme und alternative Namen für alle fehlenden Seiten in einem Batch generiert. Sobald Aliases vorhanden sind, werden die Duplikaterkennung und die Alias-basierte Suche deutlich effektiver.

### Warum sehe ich doppelte Seiten mit ähnlichen Namen (z. B. "CoT" und "Chain-of-Thought")?

Ältere Versionen (vor v1.7.10) hatten keine Alias-basierte Duplikaterkennung. Wenn Sie Inhalte über dasselbe Konzept mit unterschiedlichen Namen verarbeitet haben, hat der LLM separate Seiten erstellt. Führen Sie **Lint Wiki** aus — wenn Duplikate gefunden werden, klicken Sie **"Merge Duplicates"**, um sie zu verschmelzen. Die zusammengeführte Seite behält Aliases von beiden und verhindert so zukünftige Duplikate.

### Wie kann ich die Ingestion für große Quelldateien beschleunigen?

Zwei Einstellungen in **Settings → Ingestion Acceleration**:
- **Page Generation Concurrency**: Erhöhen Sie den Wert von 1 auf 3 (oder 5 für Provider mit hohen Rate Limits). Dadurch werden mehrere Entity/Concept-Seiten parallel verarbeitet.
- **Batch Delay**: Niedrigere Werte sind schneller, bergen aber ein Risiko für Rate Limits. Beginnen Sie bei 300 ms; erhöhen Sie auf 500–800 ms, wenn Sie HTTP-429-Fehler sehen.

Prüfen Sie auch die **Extraction Granularity**: "Standard" oder "Coarse" erzeugen weniger Seiten als "Fine" und sind daher schneller.

### Das Plugin friert ein, wenn ich Lint auf einem großen Wiki ausführe. Was ist los?

Dies war ein bekanntes Problem, das in v1.7.15 und v1.7.17 behoben wurde. Wenn Sie eine Version vor v1.7.15 verwenden, aktualisieren Sie auf die neueste Version — das Lint-System enthält jetzt asynchrone Yield Points, die die Kontrolle an den UI-Thread von Obsidian zurückgeben (alle 50 Seiten und alle 500 Vergleiche). Dies verhindert die 10–40 Sekunden langen Freezes, die bei Wikis mit 1200+ Seiten auftraten.

### Kann ich Wiki-Seiten manuell bearbeiten?

Ja. Das Plugin respektiert Ihre Bearbeitungen:
- Setzen Sie `reviewed: true` im Frontmatter, um eine Seite vor Überschreibung bei erneuter Ingestion zu schützen. Überprüfte Seiten erhalten nur ergänzend wirklich neue Inhalte.
- Das `created`-Datum bleibt bei Updates erhalten; nur `updated` wird aktualisiert.
- Manuelle Aliases, Tags und Sources bleiben bei Zusammenführungen erhalten.

### Wie verwende ich lokale Modelle mit Ollama?

1. Installieren Sie [Ollama](https://ollama.com) und pullen Sie ein Modell: `ollama pull gemma4`
2. Wählen Sie in den Plugin-Einstellungen **"Ollama (Local)"** als Provider
3. Klicken Sie **Fetch Models**, um die Modellliste zu füllen, oder geben Sie den Modellnamen manuell ein
4. Es ist kein API-Key erforderlich

> Lokale Modelle haben typischerweise kleinere Context Windows (8K–128K). Ziehen Sie in Betracht, einen Cloud-Provider für die Ingestion (die den größten Context benötigt) und Ihr lokales Modell für Query zu verwenden.

### Was ist der Unterschied zwischen UI-Sprache und Wiki Output Language?

- **Interface Language** (oben in den Einstellungen): Steuert die Plugin-Oberfläche — Einstellungsbezeichnungen, Schaltflächentexte, Notices. Unterstützt derzeit Englisch und Chinesisch.
- **Wiki Output Language** (hinzugefügt in v1.6.5): Steuert, in welcher Sprache der LLM Wiki-Seiten schreibt. Unterstützt 8 Sprachen (EN/ZH/JA/KO/DE/FR/ES/PT) plus benutzerdefinierte Eingabe. Sie können eine englische Oberfläche haben, während Ihr Wiki auf Deutsch geschrieben wird.

### Warum findet Query keine Seiten, von denen ich weiß, dass sie existieren?

Drei häufige Ursachen:
1. **Index ist veraltet**: Führen Sie `Cmd+P` → **"Regenerate index"** aus, um den Index mit aktuellen Seiten und Aliases neu aufzubauen.
2. **Aliases fehlen**: Ohne Aliases (Seiten vor v1.7.11) kann der LLM nur nach exakten Seitentiteln suchen. Führen Sie Lint → Complete Aliases aus, um dies zu beheben.
3. **Suchbegriffe stimmen nicht überein**: Versuchen Sie den Seitentitel, einen Alias oder einen verwandten Begriff. Der LLM führt semantisches Matching durch, keine Stichwortsuche — eine Umformulierung hilft.

### Was macht "Smart Fix All" und in welcher Reihenfolge?

Smart Fix All führt Reparaturen in kausaler Reihenfolge durch, um die Entstehung neuer Probleme zu minimieren:
1. **Phase 0 — Complete Aliases**: Fehlende Aliases ergänzen, damit die Duplikaterkennung korrekt funktioniert.
2. **Phase 1 — Merge Duplicates**: Doppelte Seiten zusammenführen (Hauptursache vieler toter Links und Orphans).
3. **Phase 2 — Fix Dead Links**: Defekte `[[wiki-links]]` reparieren (viele werden nach der Duplikat-Zusammenführung automatisch aufgelöst).
4. **Phase 3 — Link Orphans**: Eingehende Links zu Seiten hinzufügen, die keine haben.
5. **Phase 4 — Expand Empty Pages**: Leere Seiten mit LLM-generierten Inhalten befüllen.

### Wie vermeide ich unerwartete API-Kosten?

- **Auto-Maintenance ist standardmäßig AUS** — aktivieren Sie es nicht, wenn Sie keine kontinuierliche Hintergrundverarbeitung wünschen.
- **Smart Batch Skip** (v1.7.7) überspringt automatisch bereits verarbeitete Dateien, sodass eine erneute Ordner-Ingestion nicht alles neu verarbeitet.
- **Extraction Granularity** auf "Standard" oder "Coarse" verwendet weniger API-Aufrufe als "Fine".
- **Batch Delay**-Werte über 500 ms geben mehr Spielraum, erhöhen aber nicht den Token-Verbrauch — sie verteilen die Aufrufe nur zeitlich.
- Der **Lint-Report** zeigt Anzahlen an, bevor Sie Reparaturen ausführen, sodass Sie entscheiden können, was den API-Aufwand wert ist.

### Wie führe ich ein Upgrade durch, ohne meine Wiki-Daten zu verlieren?

Das Plugin ändert niemals Ihre Quelldateien in `sources/`. Wiki-Seiten in `wiki/` werden nur geändert, wenn Sie explizit Reparaturen ausführen oder erneut ingestieren. Um auf der sicheren Seite zu sein:
1. Erstellen Sie ein Backup Ihres Vaults (oder zumindest des `wiki/`-Ordners)
2. Aktualisieren Sie das Plugin
3. Führen Sie zuerst **Regenerate index** aus
4. Führen Sie **Lint Wiki** aus, um zu sehen, was Aufmerksamkeit benötigt
5. Wenden Sie Reparaturen gezielt an — Sie müssen nicht alles auf einmal beheben

---

## License

MIT License — see [LICENSE](LICENSE)

---

## Acknowledgments

- [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Original LLM Wiki Concept
- Obsidian Team — Plugin Platform and API
- Anthropic, OpenAI, Google, DeepSeek, Kimi, GLM, OpenRouter, Ollama — LLM Providers

---

**Official Site:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)