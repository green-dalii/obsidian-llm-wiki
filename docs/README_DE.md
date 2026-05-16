![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# Karpathy LLM Wiki Plugin für Obsidian

> KI-gestützte strukturierte Wissensbasis — wandelt Notizen automatisch in ein Wiki um. Basierend auf [Andrej Karpathys LLM Wiki-Konzept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Autor:** Greener-Dalii **Version:** 1.7.18

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

> **Upgrade von früherer Version?** `Cmd+P` → "Regenerate index" ausführen, um den Wiki-Index mit Aliases neu aufzubauen — dies aktiviert die Alias-aware Search in Query (z. B. findet Suche nach "DSA" die Seite "DeepSeek-Sparse-Attention").

**Ingestion Acceleration:** Für Sources mit vielen Entities (20+), parallele Page-Generierung in Settings → Ingestion Acceleration aktivieren:
- **Page Generation Concurrency**: 1 (seriell, sicherste) bis 5 (parallel, schnellste). Mit 3 für die meisten Providers starten.
- **Batch Delay**: 100–2000 ms Verzögerung zwischen parallelen Batches. Auf 500 ms+ erhöhen für rate-limited Providers.

> **Safety**: Parallele Generierung nutzt `Promise.allSettled` — bei Fehler einer Page laufen andere weiter. Fehlgeschlagene Pages werden einzeln mit Exponential Backoff wiederholt.

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
  lint-fixes.ts     # Fix Logic + Duplicate Candidate Generation
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

## License

MIT License — see [LICENSE](LICENSE)

---

## Acknowledgments

- [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — Original LLM Wiki Concept
- Obsidian Team — Plugin Platform and API
- Anthropic, OpenAI, Google, DeepSeek, Kimi, GLM, OpenRouter, Ollama — LLM Providers

---

**Official Site:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)