![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin für Obsidian

> KI-gestützte strukturierte Wissensbasis — wandelt Notizen automatisch in ein Wiki um. Basierend auf [Andrej Karpathys LLM Wiki-Konzept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
>
> **Obsidian-offizielle Bewertung 95/100** | Native Unterstützung für 8 Sprachen | Aktiv gepflegt, kontinuierlich weiterentwickelt

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.6.6%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-8-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-8%2B-cyan?style=flat-square)

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[Offizielle Website](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback & Diskussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Codebasis mit DeepWiki erkunden](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

> **⚡ Schnellupdate-Hinweis：** Dieses Projekt entwickelt sich rasant weiter – Fehlerbehebungen, Leistungsverbesserungen, neue Funktionen und UX-Optimierungen werden häufig veröffentlicht. Wir empfehlen, in Obsidian regelmäßig zu aktualisieren (**Einstellungen → Community-Plugins → Nach Updates suchen**) oder die automatische Plugin-Aktualisierung zu aktivieren.

## 📑 Contents

- [💡 Über LLM Wiki](#-Über-llm-wiki)
- [⚡ Warum Obsidian + LLM Wiki?](#-warum-obsidian--llm-wiki)
- [🚀 Schnellstart](#-schnellstart)
  - [📦 Installation](#-installation)
  - [🔄 Plugin aktualisieren](#-plugin-aktualisieren)
  - [🔑 LLM Provider konfigurieren](#-llm-provider-konfigurieren)
  - [🎮 Nutzung](#-nutzung)
  - [⚠️ Upgrade von einer älteren Version?](#️-upgrade-von-einer-älteren-version)
- [⚡ Was ist neu in v1.16.3](#-was-ist-neu-in-v1163)
- [✨ Funktionen](#-funktionen)
  - [📊 Knowledge Quality](#-knowledge-quality)
  - [🛠️ Maintenance](#️-maintenance)
  - [💬 Query & Feedback](#-query--feedback)
  - [🌐 LLM & Language](#-llm--language)
  - [🏗️ Architecture & Performance](#️-architecture--performance)
  - [🔒 Datenschutz & Sicherheit](#-datenschutz--sicherheit)
- [⌨️ Befehle](#️-befehle)
- [📖 Beispiel](#-beispiel)
- [🤖 Modellempfehlungen](#-modellempfehlungen)
- [🏗️ Architektur](#️-architektur)
- [❓ FAQ](#-faq)
  - [💡 Allgemein](#-allgemein)
  - [🏷️ Warum zeigt Lint bei fast all meinen Seiten "fehlende Aliases" an?](#️-warum-zeigt-lint-bei-fast-all-meinen-seiten-fehlende-aliases-an)
  - [🔄 Warum sehe ich doppelte Seiten mit ähnlichen Namen (z. B. "CoT" und "Chain-of-Thought")?](#-warum-sehe-ich-doppelte-seiten-mit-ähnlichen-namen-z-b-cot-und-chain-of-thought)
  - [⚡ Wie kann ich die Ingestion für große Quelldateien beschleunigen?](#-wie-kann-ich-die-ingestion-für-große-quelldateien-beschleunigen)
  - [🧊 Das Plugin friert ein, wenn ich Lint auf einem großen Wiki ausführe. Was ist los?](#-das-plugin-friert-ein-wenn-ich-lint-auf-einem-großen-wiki-ausführe-was-ist-los)
  - [✏️ Kann ich Wiki-Seiten manuell bearbeiten?](#️-kann-ich-wiki-seiten-manuell-bearbeiten)
  - [🦙 Wie verwende ich lokale Modelle mit Ollama?](#-wie-verwende-ich-lokale-modelle-mit-ollama)
  - [🗣️ Was ist der Unterschied zwischen UI-Sprache und Wiki Output Language?](#️-was-ist-der-unterschied-zwischen-ui-sprache-und-wiki-output-language)
  - [🔍 Warum findet Query keine Seiten, von denen ich weiß, dass sie existieren?](#-warum-findet-query-keine-seiten-von-denen-ich-weiß-dass-sie-existieren)
  - [🛠️ Was macht "Smart Fix All" und in welcher Reihenfolge?](#️-was-macht-smart-fix-all-und-in-welcher-reihenfolge)
  - [💰 Wie vermeide ich unerwartete API-Kosten?](#-wie-vermeide-ich-unerwartete-api-kosten)
  - [📦 Wie führe ich ein Upgrade durch, ohne meine Wiki-Daten zu verlieren?](#-wie-führe-ich-ein-upgrade-durch-ohne-meine-wiki-daten-zu-verlieren)
  - [🔒 Transparenz & Compliance](#-transparenz--compliance)
- [📜 License](#-license)
- [🙏 Danksagungen](#-danksagungen)
## 💡 Über LLM Wiki

Notizen schreiben. KI organisiert. Fragen stellen. Das ist alles.

**🎯 Das Problem.** Notizen enthalten wertvolle Informationen — Personen, Konzepte, Ideen, Verbindungen. Aktuell liegen sie jedoch als einzelne Dateien in Ordnern. Um Verknüpfungen zu finden, müssen Sie suchen, kennzeichnen und sich an Zusammenhänge erinnern.

**✨ Die Lösung.** [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) hat einen eleganten Ansatz vorgeschlagen: Notizen als Rohmaterial behandeln und den LLM die Architekturarbeit überlassen. Der LLM liest die Notizen, extrahiert Entities und Concepts und verknüpft sie zu einem strukturierten Wiki — mit `[[bidirektionalen Links]]`, automatisch generiertem Index und Chat-Interface für Anfragen an die eigene Wissensbasis.

**📚 Keine Bibliotheksarbeit mehr.** Keine Bewertung des Seitenwerts. Keine Pflege von Querverweisen. Keine Angst vor veraltetem Content. Notizen in `sources/` ablegen — der LLM liest, extrahiert, schreibt, verlinkt und markiert Widersprüche, während Sie im Flow bleiben.

**🤖 Kein weiterer Chatbot.** ChatGPT kennt das Internet. LLM Wiki kennt *Sie* — genauer: das, was Sie ihm beigebracht haben. Jede Antwort enthält `[[wiki-links]]` zurück in den Knowledge Graph. Jede Antwort ist ein Wegweiser, kein Dead End.

---

## ⚡ Was ist neu in v1.16.3

Dieses **Hotfix-Release** schließt die v1.16.2 P0-Bugfix-Batch ab. Die Lint-Abbruch-Statusleisten-Korrektur aus v1.16.2 war unvollständig (das Modal schloss sich unmittelbar nach Klick auf eine Reparaturschaltfläche, wodurch die Statusleiste verschwand, bevor der Nutzer abbrechen konnte), und die fünf Cleanup-Punkte aus der v1.16.2-Review sind jetzt enthalten. **Keine Breaking Changes, keine Neukonfiguration.**

**Wichtigste Korrekturen:**

- **Lint-Abbruch-Statusleiste funktioniert jetzt wirklich (Issue #94).** v1.16.2 propagierte zwar das AbortSignal zu den Fix-Runnern, aber das Modal schloss sich beim Button-Klick — was onClose → endLintOperation auslöste und die Statusleiste verschwand, bevor der Nutzer abbrechen konnte. Die Korrektur gibt jeder Reparaturphase einen eigenen lint-operation-Lebenszyklus: `startLintOperation` beim Klick auf eine Reparaturschaltfläche, `endLintOperation` nach Abschluss der Reparatur. Das Modal schließt sich sofort (erhält die ursprüngliche UX); der Nutzer sieht oben die Fortschrittsmeldung und unten die Statusleiste dauerhaft während der gesamten Reparatur — Klick zum Abbrechen.

- **Fortschrittszähler bei Duplikatprüfung stimmt mit Konsole überein (Issue #94-Folgebug).** Zeigte vorher "1/4" (äußere Runde) statt "1-4/16" (innerer Batch-Bereich). Korrigiert, damit Meldung und Konsolen-Log übereinstimmen — keine Verwechslung des Fortschritts mehr.

- **thinkingControlCache-Schlüssel-Korrektur (Issue #243).** Bei vordefinierten Anbietern ohne baseUrl-Überschreibung verwendete das Schreiben einen leeren Schlüssel, das Lesen die vordefinierte URL — der Cache verfehlte für immer und löste bei jedem Aufruf einen verschwendeten 400-Roundtrip aus. Lese- und Schreibpfad verwenden jetzt denselben `getThinkingControlCacheKey()`-Helfer.

- **deleteEmptyStubs ist jetzt belastbar (Issue #244).** Ein einzelner vault-read- oder deleteFile-Fehler bricht nicht mehr die gesamte Schleife ab. Jede Datei ist unabhängig in try/catch gewickelt, und der Nutzer erhält eine klare Meldung mit Anzahl der gelöschten/fehlgeschlagenen.

- **Fallback nach Thinking-Control cached das negative Ergebnis (Issue #245).** `OpenAICompatibleClient` setzt jetzt nach erfolgreichem 400-Fallback `thinkingControlSupported = false`, sodass nachfolgende Aufrufe an dieselbe baseUrl den redundanten Probe-und-Fail-Roundtrip überspringen.

- **i18n-Bereinigung (Issue #94-Folgebug + #248):** 3 hartkodierte englische Fortschrittsmeldungen durch offizielle i18n-Schlüssel ersetzt (`lintCheckingDuplicatesProgress`, `lintFixingPolluted`, `lintModalFixPolluted`), in 8 Sprachen. Die Thinking-Control-Fehlererkennung verlangt jetzt sowohl einen HTTP-400-Status als auch ein abgelehntes-Feld-Schlüsselwort — passte vorher auf jeden Fehler, der "thinking" enthielt, was zu falschen Fallbacks führte.

**Upgrade von einer älteren Version?** Keine Breaking Changes, keine Neukonfiguration. Bestehende Wikis, Einstellungen und Workflows bleiben erhalten.

**Wir empfehlen allen Nutzern dringend ein Upgrade auf diese Version** — die Lint-Abbruch-Korrektur vervollständigt die Cancel-UX-Story, und die Cache- und Belastbarkeitskorrekturen wirken leise bei jedem Lint-Aufruf.---

## ✨ Funktionen

### 📊 Knowledge Quality

- **🔍 Entity/Concept Extraction** — LLM extrahiert Entities (Personen, Orgs, Produkte, Events) und Concepts (Theorien, Methoden, Terme) aus Notizen mit flexibler Extraktionsgranularität (Minimal~5 Einträge, Groß~10, Standard~50, Fein~100, Benutzerdefiniert 1–300) für Balance zwischen Analyse-Tiefe und API-Kosten
- **🏷️ Mandatory Page Aliases** — Jede generierte Page enthält mindestens einen Alias (Übersetzung, Akronym, alternativer Name); ermöglicht Cross-Language Duplikat-Detection
- **🔄 Duplicate Detection & Merge** — Semantic Tiering erfasst echte Duplikate (Cross-Language-Übersetzungen, Abkürzungen, Schreibvarianten); intelligentes LLM Merge fusioniert Content und bewahrt Aliases
- **🧩 Smart Knowledge Fusion** — Multi-Source Updates mergen neue Info ohne Redundanz, Widersprüche werden mit Attribution bewahrt, `reviewed: true` Pages sind vor Überschreibung geschützt
- **📏 Content Truncation Protection** — 8000 max_tokens mit automatischer stop_reason-Detection und Retry bei 2× tokens über alle Providers
- **📝 Verbatim Source Mentions** — Original-Language-Quotes mit optionaler Übersetzung für Nachvollziehbarkeit bewahren

### 🛠️ Maintenance

- **🔍 Lint Health Scan** — Duplikate, tote Links, leere Pages, Orphans, fehlende Aliases und Widersprüche in einem umfassenden Report erkennen
- **🎯 Semantic-Tier Duplicate Detection** — Tier 1 (direkte Name-Matches: Cross-Language, Abkürzungen, hochähnliche Titel) immer verifiziert; Tier 2 (indirekte Signale: gemeinsame Links, moderate Ähnlichkeit) füllt Token-Budget
- **⚡ Smart Fix All** — Kausal geordneter Batch-Fix: Duplikate mergen → tote Links auflösen → Orphans verlinken → leere Pages erweitern
- **🏷️ Alias Completion** — One-Click parallele Batch-Generierung fehlender Aliases zur Verbesserung zukünftiger Duplikat-Detection
- **🔄 Auto-Maintenance** — Multi-Folder File Watcher, periodischer Lint, Startup Health Check (alle optional)
- **⚠️ Contradiction State Machine** — `detected → review_ok → resolved` (AI Fix) oder `detected → pending_fix` (manuell)

### 💬 Query & Feedback

- **🤖 Conversational Query** — ChatGPT-Style-Dialog, Streaming Markdown Output, `[[wiki-links]]`, Multi-Turn History
- **📤 Query-to-Wiki Feedback** — Wertvolle Conversations ins Wiki speichern, Entity/Concept Extraction, Semantic Dedup vor dem Speichern
- **🔒 Duplicate Save Prevention** — Hash Tracking verhindert Re-Evaluation unveränderter Conversations

### 🌐 LLM & Language

- **🔌 Multi-Provider Support** — Anthropic, Anthropic Compatible, Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, Custom Endpoint
- **🔄 5xx Auto Retry** — Alle Clients wiederholen bei HTTP 5xx/429/529/529-Fehlern mit Exponential Backoff (max. 2)
- **📋 Dynamic Model List** — Echtzeit-Fetch von Provider-API
- **🌐 Wiki Output Language** — Interface-unabhängige 8 Sprachen (Englisch/Chinesisch/Japanisch/Koreanisch/Deutsch/Französisch/Spanisch/Portugiesisch), Custom Input unterstützt
- **🌍 Fullständige UI-Internationalisierung** — Plugin UI unterstützt 8 Sprachen (EN/ZH/JA/KO/DE/FR/ES/PT), 269+ UI-Felder vollständig übersetzt, natürliche lokale Ausdrücke
- **⚡ Rate Limit Guardian** — Wenn parallele Generierung Rate Limits auslöst, automatische Erkennung und Empfehlung: Parallelität reduzieren, Batch-Delay erhöhen, Provider wechseln
- **🦙 Web Clipper Compatible** — Obsidian Web Clipper's `Clippings/`-Ordner mit einem Klick zur Watchlist hinzufügen, Web-Clips automatisch in Wiki übernehmen

### 🏗️ Architecture & Performance

- **⚡ Parallel Page Generation** — Konfigurierbare 1–5 parallele Pages, Standard 3 (parallel), 2–3× Speedup bei großen Sources, per-Page Error Isolation
- **📚 Iterative Batch Extraction** — Adaptive Batch-Sizing, eliminiert max_tokens-Bottleneck bei langen Dokumenten
- **🏛️ Three-Layer Architecture** — `sources/` (read-only) → `wiki/` (LLM-generated) → `schema/` (co-evolved Config)
- **🧩 Modular Codebase** — 13 fokussierte Module in `src/`

### 🔒 Datenschutz & Sicherheit

- **Kein Backend, keine Telemetrie.** Das Plugin läuft vollständig innerhalb von Obsidian — es gibt keinen externen Server, keine Analyse und keine Datenerfassung jeglicher Art. Ihre Notizen verlassen niemals Ihren Vault, es sei denn, Sie konfigurieren ausdrücklich einen LLM-Anbieter.
- **Ihre Daten bleiben standardmäßig lokal.** Das Plugin speichert, zwischenspeichert oder überträgt Ihre Inhalte nirgendwo außerhalb der von Ihnen gewählten LLM-API. Nur der Text, den Sie zur Aufnahme oder Abfrage senden, verlässt Ihr Gerät — und nur an den von Ihnen konfigurierten Anbieter.
- **Vollständiger lokaler Modus mit Ollama, LM Studio oder lokalen Anbietern.** Für vollständige Datensouveränität verwenden Sie ein lokal laufendes LLM. Ihre Notizen werden vollständig auf Ihrem Rechner verarbeitet — nichts berührt das Internet.
- **Minimale Berechtigungen.** Vault-Dateizugriff ist für die Wiki-Verwaltung erforderlich (Lesen von Notizen, Generieren von Seiten, Erkennen toter Links). Netzwerkzugriff wird ausschließlich für LLM-API-Aufrufe an Ihren gewählten Anbieter verwendet. Zwischenablagezugriff ist auf die Schaltfläche „Kopieren" im Abfrage-Modal beschränkt — nur wenn Sie darauf klicken.

---


---

## ⌨️ Befehle

| Befehl | Beschreibung |
|---------|-------------|
| **📥 Einzelne Quelle aufnehmen** | Einzelne Note auswählen → Wiki-Pages mit Entities, Concepts und Summary generieren |
| **📂 Aus Ordner aufnehmen** | Beliebigen Ordner auswählen → Wiki aus bestehenden Notizen im Batch generieren |
| **🔍 Wiki anfragen** | Konversationelles Q&A mit Streaming Output und `[[wiki-links]]` |
| **🛠️ Wiki prüfen** | Vollständiger Health Scan: Duplikate, tote Links, leere Pages, Orphans, fehlende Aliases, Widersprüche |
| **📋 Index neu generieren** | `wiki/index.md` manuell neu aufbauen |
| **💡 Schema-Aktualisierungen vorschlagen** | LLM analysiert Wiki und schlägt Schema-Verbesserungen vor |

---

## 📖 Beispiel

**Input:** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning uses algorithms to learn from data.

### Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**Output — Entity-Page:** `wiki/entities/supervised-learning.md`

```markdown
---
type: entity
created: 2026-05-15
updated: 2026-05-15
sources: ["[[sources/machine-learning]]"]
tags: [method]
aliases: ["监督学习", "Supervised Learning"]
---

### Supervised Learning

### Basisinformationen
- Typ: method
- Quelle: [[sources/machine-learning]]

### Beschreibung
Supervised Learning (überwachtes Lernen) ist ein Machine-Learning-Paradigma,
bei dem Modelle aus gelabelten Trainingsdaten lernen, um Vorhersagen für
neue Daten zu treffen...

### Verwandte Konzepte
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

### Verwandte Entities
- [[entities/Arthur-Samuel|Arthur Samuel]]

### Erwähnungen in der Quelle
- "Supervised learning uses labeled data to train predictive models..."
```

---

## 🤖 Modellempfehlungen

Dieses Plugin folgt Karpathys Kernphilosophie: **den vollen Wiki-Context direkt an den LLM übergeben, statt ihn in RAG Retrieval Shards zu fragmentieren**. Modelle mit langem Context Window werden dringend empfohlen — je größer das Wiki, desto mehr Context benötigt der LLM zur Aufrechterhaltung der Cross-Page Consistency.

> 💡 **Warum kein RAG?** Karpathy hat im [Original-Konzept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) darauf hingewiesen, dass RAG Knowledge fragmentiert und die Reasoning Ability des LLM über den gesamten Knowledge Graph untergräbt.

**💰 Preis-Leistung-Strategie:** Sie benötigen keine Flagship-Modelle. Die folgenden **kostengünstigen Alternativen** liefern hervorragende Ergebnisse zu niedrigeren Kosten:

| Stufe | Modell | Context Window | Begründung |
|-------|--------|--------------|------------|
| **🌟 Preis-Leistung** | **DeepSeek V4-Flash** | 1M tokens | Günstigster Preis ($0.14/M), 284B MoE, ideal für Batch-Ingestion |
| **🌟 Preis-Leistung** | **Gemini-3.5-Flash** | 1M tokens | 4× schneller als GPT-5.5, exzellent für Agent-Aufgaben |
| **🌟 Preis-Leistung** | **Qwen3.6-Plus** | 1M tokens | Starke Coding- & Agent-Fähigkeiten, wettbewerbsfähiger Preis |
| **🌟 Preis-Leistung** | **Grok-4** | 2M tokens | 2M Context, ideal für sehr große Wikis |
| **Ausgewogen** | **Claude Sonnet 4.6** | 1M tokens | Gute Balance aus Qualität und Kosten, $3/$15 pro Million Tokens |
| **Leichtgewicht** | **Claude Haiku 4.5** | 200K tokens | Schnell und wirtschaftlich, für kleinere Wikis |
| **Wirtschaftlich** | **MiMo-V2.5-Flash** | 1M tokens | Xiaomis kosteneffiziente Option, 309B MoE Architektur |
| **Flagship** | Claude Opus 4.7 | 1M tokens | Höchste Qualität, höhere Kosten — selektiv einsetzen |
| **Flagship** | GPT-5.5 | 1M tokens | Top-Reasoning, höhere Kosten — selektiv einsetzen |

Für lokale Modelle (Ollama): Context Windows normalerweise kleiner (8K–128K), empfohlen wird die Nutzung von Cloud-Providern für Ingestion + lokales Modell für Query.

**🔌 Anthropic Compatible (Coding Plan):** Wenn Ihr Provider einen Anthropic-kompatiblen API-Endpunkt bietet, wählen Sie "Anthropic Compatible" und geben Sie die Base URL und den API Key Ihres Providers ein.

> 💡 **Abonnementpläne:** Coding Plan, OpenAI Pro oder Anthropic Pro sind ausgezeichnete Optionen zur Kostenkontrolle bei häufiger Nutzung. Dieses Plugin unterstützt diese Dienste.

---

## 🏗️ Architektur

Basierend auf Karpathys Three-Layer Separation Design:

```
sources/     # 📄 Your Source Documents (read-only)
  ↓ ingest
wiki/        # 🧠 LLM-generated Wiki Pages
  ↓ query / maintain
schema/      # 📋 Wiki Structure Config (Naming Conventions, Page Templates, Classification Rules)
```

**Code-Struktur** (`src/`):

```
wiki/               # Wiki-Engine-Module
  wiki-engine.ts    # 🎯 Orchestrator
  query-engine.ts   # 💬 Conversationelle Abfrage
  source-analyzer.ts # 📊 Iterative Batch-Extraktion
  page-factory.ts   # 🏗️ Entity/Concept CRUD + Merge
  lint-controller.ts # 🔍 Lint-Orchestrierung
  lint-fixes.ts     # 🛠️ Fix-Logik für tote Links, leere Seiten, Orphans
  lint/             # Lint-Submodule
    duplicate-detection.ts  # 🔄 Programmatische Kandidatengenerierung
    fix-runners.ts          # ⚡ Batch-Fix-Ausführungshilfen
  contradictions.ts # ⚠️ Widerspruchs-Erkennung
  system-prompts.ts # 🗣️ Sprach-Direktive + Sektions-Labels
schema/             # Schema Co-Evolution
  schema-manager.ts # 📋 Schema CRUD + Suggestions
  auto-maintain.ts  # 🔄 File Watcher + Periodischer Lint
ui/                 # User Interface
  settings.ts       # ⚙️ Settings Panel
  modals.ts         # 📦 Lint/Ingest/Query Modals
+ Shared Modules: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**Generierte Seiten:**
- `wiki/sources/filename.md` — 📄 Source-Zusammenfassung
- `wiki/entities/entity-name.md` — 👤 Entity-Seiten (Personen, Organisationen, Projekte etc.)
- `wiki/concepts/concept-name.md` — 💡 Concept-Seiten (Theorien, Methoden, Begriffe etc.)
- `wiki/index.md` — 📑 Automatisch generierter Index
- `wiki/log.md` — 📝 Operations-Log

---

## ❓ FAQ

> **Halten Sie das Plugin aktualisiert.** Dieses Projekt wird häufig aktualisiert — neue Funktionen und Fehlerbehebungen erscheinen alle paar Tage. Führen Sie in Obsidian regelmäßig **Einstellungen → Community-Plugins → Nach Updates suchen** aus.
>
> Weitere Fragen finden Sie in der [GitHub FAQ Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

### 💡 Allgemein

**Was macht dieses Plugin?**
Sie legen Notizen ab, es extrahiert Personen, Konzepte und Theorien und generiert ein verknüpftes Wiki mit `[[Wiki-Links]]`. Stellen Sie Fragen und erhalten Sie Antworten basierend auf *Ihren* Notizen — keine Internet-Halluzinationen.

**Mindestanforderungen?**
Obsidian v1.6.6+, Desktop (Windows/macOS/Linux), ein API-Key eines LLM-Providers. Ollama funktioniert lokal ohne API-Key.

**Warum kann ich nach der Installation keine Funktionen nutzen?**
Einstellungen → Karpathy LLM Wiki → Provider wählen → API-Key eingeben → Fetch Models → Modell wählen → Test Connection. Grüner "LLM Ready"-Indikator schaltet alle Funktionen frei.

**Wie breche ich eine laufende Aufnahme/Lint ab?**
Statusleisten-Text klicken oder Ctrl+P → "Cancel current ingestion". Stoppt sicher nach Abschluss des aktuellen Batch.

**Doppelte Klammern [[[[...]]]] in log.md beheben?**
Lint Wiki ausführen — der Scanner erkennt und behebt automatisch alle doppelt verschachtelten Wiki-Links im gesamten Wiki-Verzeichnis (einschließlich log.md) ohne LLM-Kosten. Kein manuelles Aufräumen erforderlich.


y.

**Warum kann ich nach der Installation keine Funktionen nutzen?**
Einstellungen → Karpathy LLM Wiki → Provider wählen → API-Key eingeben → Fetch Models → Modell wählen → Test Connection. Grüner "LLM Ready"-Indikator schaltet alle Funktionen frei.

**Wie breche ich eine laufende Aufnahme/Lint ab?**
Statusleisten-Text klicken oder Ctrl+P → "Cancel current ingestion". Stoppt sicher nach Abschluss des aktuellen Batch.

**Doppelte Klammern [[[[...]]]] in log.md beheben?**
Lint Wiki ausführen — der Scanner erkennt und behebt automatisch alle doppelt verschachtelten Wiki-Links im gesamten Wiki-Verzeichnis (einschließlich log.md) ohne LLM-Kosten. Kein manuelles Aufräumen erforderlich.


**Welches Modell sollte ich wählen?**
Siehe [Modellempfehlungen](#-modellempfehlungen) oben. Modelle mit langem Kontext werden empfohlen — je größer Ihr Wiki, desto mehr Kontext benötigt der LLM.

### 🏷️ Warum zeigt Lint bei fast all meinen Seiten "fehlende Aliases" an?

Seiten, die vor v1.7.11 generiert wurden, enthielten keine Aliases. Das ist normal und harmlos — Aliases sind eine Verbesserung, keine Voraussetzung. Klicken Sie im Lint-Report auf **"Complete Aliases"**, damit der LLM Übersetzungen, Akronyme und alternative Namen für alle fehlenden Seiten in einem Batch generiert. Sobald Aliases vorhanden sind, werden die Duplikaterkennung und die Alias-basierte Suche deutlich effektiver.

### 🔄 Warum sehe ich doppelte Seiten mit ähnlichen Namen (z. B. "CoT" und "Chain-of-Thought")?

Ältere Versionen (vor v1.7.10) hatten keine Alias-basierte Duplikaterkennung. Wenn Sie Inhalte über dasselbe Konzept mit unterschiedlichen Namen verarbeitet haben, hat der LLM separate Seiten erstellt. Führen Sie **Lint Wiki** aus — wenn Duplikate gefunden werden, klicken Sie **"Merge Duplicates"**, um sie zu verschmelzen. Die zusammengeführte Seite behält Aliases von beiden und verhindert so zukünftige Duplikate.

### ⚡ Wie kann ich die Ingestion für große Quelldateien beschleunigen?

Zwei Einstellungen in **Settings → Ingestion Acceleration**:
- **🚀 Page Generation Concurrency**: Erhöhen Sie den Wert von 1 auf 3 (oder 5 für Provider mit hohen Rate Limits). Dadurch werden mehrere Entity/Concept-Seiten parallel verarbeitet.
- **⏱️ Batch Delay**: Niedrigere Werte sind schneller, bergen aber ein Risiko für Rate Limits. Beginnen Sie bei 300 ms; erhöhen Sie auf 500–800 ms, wenn Sie HTTP-429-Fehler sehen.

Prüfen Sie auch die **📊 Extraktionsgranularität**: "Minimal", "Groß" oder "Standard" erzeugen weniger Seiten und sparen API-Kosten.

### 🧊 Das Plugin friert ein, wenn ich Lint auf einem großen Wiki ausführe. Was ist los?

Dies war ein bekanntes Problem, das in v1.7.15 und v1.7.17 behoben wurde. Wenn Sie eine Version vor v1.7.15 verwenden, aktualisieren Sie auf die neueste Version — das Lint-System enthält jetzt asynchrone Yield Points, die die Kontrolle an den UI-Thread von Obsidian zurückgeben (alle 50 Seiten und alle 500 Vergleiche). Dies verhindert die 10–40 Sekunden langen Freezes, die bei Wikis mit 1200+ Seiten auftraten.

### ✏️ Kann ich Wiki-Seiten manuell bearbeiten?

Ja. Das Plugin respektiert Ihre Bearbeitungen:
- Setzen Sie `reviewed: true` im Frontmatter, um eine Seite vor Überschreibung bei erneuter Ingestion zu schützen. Überprüfte Seiten erhalten nur ergänzend wirklich neue Inhalte.
- Das `created`-Datum bleibt bei Updates erhalten; nur `updated` wird aktualisiert.
- Manuelle Aliases, Tags und Sources bleiben bei Zusammenführungen erhalten.

### 🦙 Wie verwende ich lokale Modelle mit Ollama?

1. Installieren Sie [Ollama](https://ollama.com) und pullen Sie ein Modell: `ollama pull gemma4`
2. Wählen Sie in den Plugin-Einstellungen **"Ollama (Local)"** als Provider
3. Klicken Sie **Fetch Models**, um die Modellliste zu füllen, oder geben Sie den Modellnamen manuell ein
4. Es ist kein API-Key erforderlich

> 💡 Lokale Modelle haben typischerweise kleinere Context Windows (8K–128K). Ziehen Sie in Betracht, einen Cloud-Provider für die Ingestion (die den größten Context benötigt) und Ihr lokales Modell für Query zu verwenden.

### 🗣️ Was ist der Unterschied zwischen UI-Sprache und Wiki Output Language?

- **🗣️ Interface Language** (oben in den Einstellungen): Steuert die Plugin-Oberfläche — Einstellungsbezeichnungen, Schaltflächentexte, Notices. Unterstützt derzeit Englisch und Chinesisch.
- **🌐 Wiki Output Language** (hinzugefügt in v1.6.5): Steuert, in welcher Sprache der LLM Wiki-Seiten schreibt. Unterstützt 8 Sprachen (EN/ZH/JA/KO/DE/FR/ES/PT) plus benutzerdefinierte Eingabe. Sie können eine englische Oberfläche haben, während Ihr Wiki auf Deutsch geschrieben wird.

### 🔍 Warum findet Query keine Seiten, von denen ich weiß, dass sie existieren?

Drei häufige Ursachen:
1. **📋 Index ist veraltet**: Führen Sie `Cmd+P` → **"Regenerate index"** aus, um den Index mit aktuellen Seiten und Aliases neu aufzubauen.
2. **🏷️ Aliases fehlen**: Ohne Aliases (Seiten vor v1.7.11) kann der LLM nur nach exakten Seitentiteln suchen. Führen Sie Lint → Complete Aliases aus, um dies zu beheben.
3. **🎯 Suchbegriffe stimmen nicht überein**: Versuchen Sie den Seitentitel, einen Alias oder einen verwandten Begriff. Der LLM führt semantisches Matching durch, keine Stichwortsuche — eine Umformulierung hilft.

### 🛠️ Was macht "Smart Fix All" und in welcher Reihenfolge?

Smart Fix All führt Reparaturen in kausaler Reihenfolge durch, um die Entstehung neuer Probleme zu minimieren:
1. **Phase 0 — 🏷️ Complete Aliases**: Fehlende Aliases ergänzen, damit die Duplikaterkennung korrekt funktioniert.
2. **Phase 1 — 🔄 Merge Duplicates**: Doppelte Seiten zusammenführen (Hauptursache vieler toter Links und Orphans).
3. **Phase 2 — 🔗 Fix Dead Links**: Defekte `[[wiki-links]]` reparieren (viele werden nach der Duplikat-Zusammenführung automatisch aufgelöst).
4. **Phase 3 — 🔗 Link Orphans**: Eingehende Links zu Seiten hinzufügen, die keine haben.
5. **Phase 4 — 📝 Expand Empty Pages**: Leere Seiten mit LLM-generierten Inhalten befüllen.

### 💰 Wie vermeide ich unerwartete API-Kosten?

- **🔄 Auto-Maintenance ist standardmäßig AUS** — aktivieren Sie es nicht, wenn Sie keine kontinuierliche Hintergrundverarbeitung wünschen.
- **💡 Smart Batch Skip** (v1.7.7) überspringt automatisch bereits verarbeitete Dateien, sodass eine erneute Ordner-Ingestion nicht alles neu verarbeitet.
- **📊 Extraction Granularity** auf "Standard" oder "Coarse" verwendet weniger API-Aufrufe als "Fine".
- **⏱️ Batch Delay**-Werte über 500 ms geben mehr Spielraum, erhöhen aber nicht den Token-Verbrauch — sie verteilen die Aufrufe nur zeitlich.
- **🔍 Lint-Report** zeigt Anzahlen an, bevor Sie Reparaturen ausführen, sodass Sie entscheiden können, was den API-Aufwand wert ist.

### 📦 Wie führe ich ein Upgrade durch, ohne meine Wiki-Daten zu verlieren?

Das Plugin ändert niemals Ihre Quelldateien in `sources/`. Wiki-Seiten in `wiki/` werden nur geändert, wenn Sie explizit Reparaturen ausführen oder erneut ingestieren. Um auf der sicheren Seite zu sein:
1. 💾 Erstellen Sie ein Backup Ihres Vaults (oder zumindest des `wiki/`-Ordners)
2. 🔄 Aktualisieren Sie das Plugin
3. 📋 Führen Sie zuerst **Regenerate index** aus
4. 🔍 Führen Sie **Lint Wiki** aus, um zu sehen, was Aufmerksamkeit benötigt
5. 🛠️ Wenden Sie Reparaturen gezielt an — Sie müssen nicht alles auf einmal beheben

---

## 🔒 Transparenz & Compliance

Dieses Plugin ist im Obsidian Community Plugin Market gelistet und wird einer automatisierten Überprüfung auf Sicherheit und Berechtigungen unterzogen.

**Das Plugin hat kein Backend, keine Server-Infrastruktur und keinerlei Datenerfassung.** Es ist reine lokale Software, die innerhalb von Obsidian ausgeführt wird. Das Plugin kann und wird Ihre Daten auf keine Weise sammeln, speichern oder an irgendeinen Server übertragen — weil ein solcher Server nicht existiert.

**Netzwerkzugriff** wird nur zur Kommunikation mit dem von Ihnen konfigurierten LLM-Anbieter verwendet — es werden keine anderen Netzwerkaufrufe getätigt. Dies liegt vollständig in Ihrer Kontrolle: Sie wählen den Anbieter, Sie geben den API-Schlüssel ein, Sie entscheiden, wohin Ihre Daten gehen.

**Dateisystemzugriff** (Vault-Auflistung) ist für den Aufbau und die Pflege des Wikis erforderlich: Lesen Ihrer Quellnotizen, Generieren von Seiten, Scannen auf tote Links und Erkennen doppelter Seiten. Das Plugin verändert niemals Ihre Quelldateien — nur Dateien im Wiki-Ordner.

**Zwischenablagezugriff** wird ausschließlich von der Schaltfläche „Kopieren" im Abfrage-Modal verwendet, und nur, wenn Sie darauf klicken.

Wenn Sie vollständige Datenlokalität bevorzugen, verwenden Sie einen lokalen LLM-Anbieter wie Ollama oder LM Studio. Mit einem lokalen Anbieter verlassen Ihre Daten niemals Ihren Rechner.
## 📜 License

MIT License — siehe [LICENSE](LICENSE).

## 🙏 Danksagungen

- **💡 Konzept:** [Andrej Karpathys LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — die ursprüngliche Vision, die dieses Plugin inspiriert hat
- **🛠️ Plattform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM SDKs:** Anthropic SDK, OpenAI SDK

---

**Official Site:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)