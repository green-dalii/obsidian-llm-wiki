![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin für Obsidian

> KI-gestützte strukturierte Wissensbasis — wandelt Notizen automatisch in ein Wiki um. Basierend auf [Andrej Karpathys LLM Wiki-Konzept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

> **Obsidian-offizielle Bewertung 95/100 | Native Unterstützung für 10 Sprachen | Null-Embedding-Graph-Suche | Volle Datensouveränität | Kompatibel mit jedem LLM-Anbieter**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | **Deutsch** | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[Offizielle Website](https://llmwiki.greenerai.top/) | [Obsidian-Marktplatz](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback & Diskussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Codebasis mit DeepWiki erkunden](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD)

---

> **⚡ Schnellupdate-Hinweis：** Dieses Projekt entwickelt sich rasant weiter – Fehlerbehebungen, Leistungsverbesserungen, neue Funktionen und UX-Optimierungen werden häufig veröffentlicht. Wir empfehlen, in Obsidian regelmäßig zu aktualisieren (**Einstellungen → Community-Plugins → Nach Updates suchen**) oder die automatische Plugin-Aktualisierung zu aktivieren.

## 📑 Contents

- [🧠 Karpathy LLM Wiki Plugin für Obsidian](#-karpathy-llm-wiki-plugin-für-obsidian)
  - [📑 Contents](#-contents)
  - [💡 Über LLM Wiki](#-über-llm-wiki)
  - [⚡ Warum Obsidian + LLM-Wiki?](#-warum-obsidian--llm-wiki)
  - [🚀 Schnellstart](#-schnellstart)
    - [📦 Installation](#-installation)
    - [🔄 Aktualisierung](#-aktualisierung)
    - [🔑 LLM-Provider konfigurieren](#-llm-provider-konfigurieren)
    - [🎮 Verwendung](#-verwendung)
    - [⚠️ Upgrade von einer älteren Version?](#️-upgrade-von-einer-älteren-version)
  - [⚡ Was ist neu in v1.23.0](#-was-ist-neu-in-v1230)
    - [v1.23.2 — 2026-07-05 (aktuell, PATCH)](#v1232--2026-07-05-aktuell-patch)
    - [v1.23.1 — 2026-07-02 (PATCH)](#v1231--2026-07-02-patch)
    - [v1.23.0 — 2026-07-02 (MINOR)](#v1230--2026-07-02-minor)
  - [✨ Funktionen](#-funktionen)
    - [📊 Knowledge Quality](#-knowledge-quality)
    - [🛠️ Maintenance](#️-maintenance)
    - [💬 Query \& Feedback](#-query--feedback)
    - [🌐 LLM \& Language](#-llm--language)
    - [🏗️ Architecture \& Performance](#️-architecture--performance)
    - [🔒 Datenschutz \& Sicherheit](#-datenschutz--sicherheit)
  - [📖 Beispiel](#-beispiel)
  - [🤖 Modellempfehlungen](#-modellempfehlungen)
  - [🏗️ Architektur](#️-architektur)
  - [❓ FAQ](#-faq)
  - [🔒 Transparenz \& Compliance](#-transparenz--compliance)
  - [💖 Projekt unterstützen](#-projekt-unterstützen)
    - [Sponsoren](#sponsoren)
  - [📜 License](#-license)
  - [🙏 Danksagungen](#-danksagungen)
  - [Star History](#star-history)

## 💡 Über LLM Wiki

Notizen schreiben. KI organisiert. Fragen stellen. Das ist alles.

**🎯 Das Problem.** Notizen enthalten wertvolle Informationen — Personen, Konzepte, Ideen, Verbindungen. Aktuell liegen sie jedoch als einzelne Dateien in Ordnern. Um Verknüpfungen zu finden, müssen Sie suchen, kennzeichnen und sich an Zusammenhänge erinnern.

**✨ Die Lösung.** [Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) hat einen eleganten Ansatz vorgeschlagen: Notizen als Rohmaterial behandeln und den LLM die Architekturarbeit überlassen. Der LLM liest die Notizen, extrahiert Entities und Concepts und verknüpft sie zu einem strukturierten Wiki — mit `[[bidirektionalen Links]]`, automatisch generiertem Index und Chat-Interface für Anfragen an die eigene Wissensbasis.

**📚 Keine Bibliotheksarbeit mehr.** Keine Bewertung des Seitenwerts. Keine Pflege von Querverweisen. Keine Angst vor veraltetem Content. Notizen in `sources/` ablegen — der LLM liest, extrahiert, schreibt, verlinkt und markiert Widersprüche, während Sie im Flow bleiben.

**🤖 Kein weiterer Chatbot.** ChatGPT kennt das Internet. LLM Wiki kennt *Sie* — genauer: das, was Sie ihm beigebracht haben. Jede Antwort enthält `[[wiki-links]]` zurück in den Knowledge Graph. Jede Antwort ist ein Wegweiser, kein Dead End.

---

## ⚡ Warum Obsidian + LLM-Wiki?

Obsidian ist brillant im vernetzten Denken. Aber das Problem: Sie selbst müssen alle Verbindungen herstellen.

LLM-Wiki dreht das um. Statt dass Sie den Graphen von Hand aufbauen, wächst die KI ihn mit Ihnen. Fügen Sie eine Notiz über ein neues Konzept hinzu — sie findet Zusammenhänge, die Sie übersehen hätten. Stellen Sie eine Frage — sie durchsucht Ihren eigenen Wissensgraphen und liefert Antworten mit Quellenbelegen.

- **🔗 Ihr Graph View wird lebendig.** Neue Notizen stehen nicht einfach nur da — sie sprießen Verbindungen zu Entities, Konzepten und Quellen. Der Graph wächst organisch, und das Plugin pflegt ihn: erkennt Duplikate, repariert tote Links, überbrückt Sprachen mit Aliases.
- **💬 Ihre Notizen lernen, mit Ihnen zu sprechen.** Suche wird zum Gespräch. „Was habe ich über X geschrieben?" wird zum Dialog mit Streaming-Antworten und `[[wiki-links]]` als Wegmarken. Jede Antwort ist ein Pfad tiefer in Ihr eigenes Wissen.
- **🧠 Obsidian wird zum Denkpartner.** Es hört auf, eine Ablage für Notizen zu sein, und wird zu etwas, das Ihnen beim *Denken* hilft — verborgene Zusammenhänge aufdeckt, Widersprüche markiert, sich an das erinnert, was Sie vergessen hatten.

---

## 🚀 Schnellstart

### 📦 Installation

**🌟 Empfohlen — Obsidian Community Plugin Market:**

1. Gehe in Obsidian zu **Einstellungen → Community-Plugins**
2. Klicke auf **Durchsuchen** und suche nach "Karpathy LLM Wiki"
3. Klicke auf **Installieren**, dann **Aktivieren**

**🌐 Oder über die Community Plugin Website —** besuche [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) und klicke auf **Zu Obsidian hinzufügen**, um direkt zu installieren.

**⚙️ Manuell (Alternative):**

1. Lade `main.js`, `manifest.json`, `styles.css` von [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases) herunter
2. Gehe in Obsidian zu Einstellungen → Community-Plugins. Auf dem Tab **Installierte Plugins** klicke auf das Ordnersymbol, um das Plugin-Verzeichnis zu öffnen
3. Erstelle einen Ordner namens `karpathywiki` und lege die drei Dateien hinein
4. Zurück in Obsidian klicke auf das Aktualisierungssymbol — **Karpathy LLM Wiki** erscheint unter Installierte Plugins
5. Schalte es ein, um es zu aktivieren

**🔨 Entwicklung:** `git clone`, `pnpm install`, `pnpm build`

### 🔄 Aktualisierung

Dieses Projekt entwickelt sich rasch — neue Funktionen, Fehlerbehebungen und Verbesserungen werden häufig veröffentlicht. Wir empfehlen, auf dem aktuellen Stand zu bleiben:

**Option A — Manuelle Aktualisierung (empfohlen):**
1. Gehe zu **Einstellungen → Community-Plugins**
2. Klicke auf **Nach Updates suchen**
3. Finde **Karpathy LLM Wiki** in der Liste und klicke auf **Aktualisieren**

**Option B — Automatische Aktualisierung aktivieren:**
1. Gehe zu **Einstellungen → Community-Plugins**
2. Schalte **Automatisch nach Plugin-Updates suchen** ein
3. Neue Versionen werden automatisch erkannt; aktualisieren Sie nach Bedarf manuell

> 💡 **Warum aktualisieren?** Jedes Release kann neue Funktionen, Leistungsverbesserungen und wichtige Fehlerbehebungen enthalten.

### 🔑 LLM-Provider konfigurieren

1. Öffne Einstellungen → Karpathy LLM Wiki
2. Wähle einen Provider aus dem Dropdown (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter oder Custom)
3. Gib deinen API-Key ein (für Ollama nicht erforderlich)
4. Klicke auf **Fetch Models**, um die Modellliste zu befüllen, oder gib einen Modellnamen manuell ein
5. Klicke auf **Test Connection**, dann **Save Settings**

**🦙 Ollama (lokal, kein API-Key):** Installiere [Ollama](https://ollama.com), pulle ein Modell (`ollama pull gemma4` oder `ollama pull qwen3.5:27b`), wähle "Ollama (Local)" im Provider-Dropdown.

**🎛️ LM Studio (lokal, kein API-Key):** Installiere [LM Studio](https://lmstudio.ai), starte den lokalen Server (Standard `http://localhost:1234/v1`), wähle "LM Studio (Local)" im Provider-Dropdown.

### 🎮 Verwendung

| Methode | Anleitung |
|---------|-----------|
| **📥 Einzelne Quelle aufnehmen** | `Cmd+P` → "Ingest single source" — wähle eine Note, um Wiki-Seiten mit Entitäten/Konzepten zu generieren |
| **📂 Aus Ordner aufnehmen** | `Cmd+P` → "Ingest from folder" — wähle einen Ordner, um Wiki aus allen Notizen im Batch zu generieren |
| **📑 Mehrere Dateien aufnehmen** | `Cmd+P` → "Ingest multiple files" — wähle Notizen über rekursiven Ordnerbaum + Kontrollkästchen, dann Batch-Aufnahme (mit Live-Queue + pro-Datei-Abbruch) |
| **🎯 Aktuelle Datei aufnehmen** | Klicke auf das `sticker`-Symbol in der linken Ribbon, oder `Cmd+P` → "Ingest current file" |
| **🔍 Wiki abfragen** | `Cmd+P` → "Query wiki" — konversationelle Q&A mit Streaming und `[[wiki-links]]` |
| **🛠️ Wiki linten** | `Cmd+P` → "Lint wiki" — vollständiger Health-Check: Duplikate, tote Links, leere Seiten, Orphans, fehlende Aliase, Widersprüche |
| **📋 Index neu generieren** | `Cmd+P` → "Regenerate index" — baue `wiki/index.md` mit Alias-Einträgen neu auf |
| **📊 Aufnahmeverlauf (v1.21.0)** | `Cmd+P` → "View Ingestion History" — durchsuche vergangene Aufnahmen, Lint-Berichte und Wartungsläufe |
| **⏹ Vorgang abbrechen** | `Cmd+P` → "Cancel current ingestion" — stoppe sicher am nächsten Batch-Grenzwert |
| **🎉 Willkommensnotiz (v1.23.0)** | `Cmd+P` → "Recreate Wiki Welcome Note" — generiere die Willkommensnotiz neu |

Die erneute Aufnahme derselben Quelle führt zu inkrementellen Aktualisierungen (neue Informationen werden eingefügt). Zusammenfassungen werden neu generiert.

> 💡 **Smart Batch Skip:** Bei der Ordner-Aufnahme erkennt das Plugin bereits verarbeitete Dateien und überspringt sie — spart Zeit und API-Kosten.

![Befehlspalette — "karpa" suchen, um alle Karpathy LLM Wiki-Befehle zu sehen](assets/command-panel.png)


### ⚠️ Upgrade von einer älteren Version?

**Rückwärtskompatibel.** Seit v1.0.0 keine Breaking Changes — bestehende Wiki-Seiten, Einstellungen und Workflows bleiben ohne Neukonfiguration erhalten.

**Nach dem Upgrade** führe **Lint Wiki** → **Smart Fix All** für eine automatische Reparatur in kausaler Reihenfolge aus:
1. 🏷️ Aliase vervollständigen (LLM generiert Übersetzungen, Abkürzungen, Alternativnamen)
2. 🔄 Duplikate zusammenführen (sprachübergreifend, Abkürzungen, hohe Ähnlichkeit)
3. 🔗 Tote Links reparieren / Orphans verknüpfen / Leere Seiten erweitern

Dann **Index neu generieren**, um `wiki/index.md` mit Alias-Einträgen neu aufzubauen und alias-bewusste Suche zu aktivieren.

> 📖 Detaillierte Upgrade-Anleitungen für spezifische Versionssprünge (v1.20.3 Slug-Fingerprint, v1.16.0 Doppel-Nesting) in [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions).

**Zu prüfende Einstellungen:** Wiki-Ausgabesprache (unabhängig von UI), Extraktionsgranularität (Minimal–Fein + Benutzerdefiniert), Seiten-Generierungs-Parallelität (Standard 3), Batch-Verzögerung (Standard 300ms).

## ⚡ Was ist neu in v1.23.0

### v1.23.2 — 2026-07-05 (aktuell, PATCH)

Fünf zusammengeführte PRs — Fehlerbehebungen, Refaktor und UX-Verbesserungen. Empfohlenes Upgrade für alle v1.23.0+-Nutzer.

- **🔄 Live-PPR-Graph-Invalidierung bei Aufnahme** — Aufnahmen in derselben Sitzung sind sofort in Folgefragen sichtbar
- **🔁 Streaming-erhaltender Client-Wrapper** — beseitigt die v1.23.0-Streaming-Regression
- **🖱️ Query-Runden-Indikator + klickbares Retrieval-Label (#221, #219)** — Punkte pro Runde, Hover-Vorschau, Scrollen zur Frage. Label klappt inline auf
- **📋 Semantische Fortschrittsbenachrichtigungen (#219)** — Manuelle Aktionen: Notice + Statusleiste; Hintergrundaktionen: nur Statusleiste. Lint-Notizen schließen automatisch (5–8s)
- **🧩 Frontmatter-Serialisierung (PR #238 @DocTpoint)** — Einheitlicher `serializeFrontmatter`-Schreiber
- **📝 Abschnittskopf-Kanonisierer (PR #241 @DocTpoint)** — Bounded Levenshtein korrigiert LLM-verzerrte Kopfzeilen beim Schreiben
- **📜 Lizenz-Upgrade** — MIT → Apache 2.0 + DCO. NOTICE listet alle 6 menschlichen Beitragenden

### v1.23.1 — 2026-07-02 (PATCH)

Behebt drei Obsidian-Review-Bot-Feststellungen: `strictBindCallApply: true`-Ausrichtung, Löschung ungenutzten Codes, Lockfile-Neuerstellung. Keine sichtbaren Änderungen für Benutzer.

### v1.23.0 — 2026-07-02 (MINOR)

Größte Architekturänderung seit 1.0. Zwei Hauptthemen:

- **🤖 Vercel AI-SDK v6 Migration.** Handgeschriebener 1625-Zeilen LLM-Client ersetzt durch `@ai-sdk/openai@3` / `@ai-sdk/anthropic@3` / `@ai-sdk/openai-compatible@2`. Beseitigt die gesamte Klasse von Provider-Versions-Regressionen (#137 / #141 / #143 / #147 / #207)
- **🕸️ Graph-Engine — Personalized PageRank über `[[wiki-link]]`-Graph.** Monte-Carlo PPR liefert Embedding-Qualität zu null Embedding-Kosten, offline, für jeden Provider. Drei-Stufen-Pipeline + Hub-Link-Distinktivitäts-Scanner
- **🎬 Echtzeit-Streaming für alle Provider** — echte Chunk-für-Chunk-Ausgabe
- **📥 Multi-File-Ingest-UI (#130)** — Zwei-Fenster-Auswahl + Live-Queue + Datei-Abbrechen
- **🎉 Willkommensnotiz** — Drei-Stufen-Erstlauf-Erfahrung, D8 LLM-Dynamikübersetzung
- **🔑 LM Studio API-Key-Gate (#223)** — Lokale Provider testen Verbindung ohne API-Key
- **🛡️ GPT-5.x Pro-Routing + URL-Fallback + Token-Key-Probe-then-Retry** — Umfassende Provider-Fehlerhärtung

## ✨ Funktionen

### 📊 Knowledge Quality

- **🔍 Entity/Concept Extraction** — LLM extrahiert Entities (Personen, Orgs, Produkte, Events) und Concepts (Theorien, Methoden, Terme) aus Notizen mit flexibler Extraktionsgranularität (Minimal~5 Einträge, Groß~10, Standard~50, Fein~100, Benutzerdefiniert 1–500) für Balance zwischen Analyse-Tiefe und API-Kosten
- **🏷️ Mandatory Page Aliases** — Jede generierte Page enthält mindestens einen Alias (Übersetzung, Akronym, alternativer Name); ermöglicht Cross-Language Duplikat-Detection
- **🔄 Duplicate Detection & Merge** — Semantic Tiering erfasst echte Duplikate (Cross-Language-Übersetzungen, Abkürzungen, Schreibvarianten); intelligentes LLM Merge fusioniert Content und bewahrt Aliases
- **🧩 Smart Knowledge Fusion** — Multi-Source Updates mergen neue Info ohne Redundanz, Widersprüche werden mit Attribution bewahrt, `reviewed: true` Pages sind vor Überschreibung geschützt
- **📏 Content Truncation Protection** — 8000 max_tokens mit automatischer stop_reason-Detection und Retry bei 2× tokens über alle Providers
- **📝 Verbatim Source Mentions** — Original-Language-Quotes mit optionaler Übersetzung für Nachvollziehbarkeit bewahren

- **🎨 Anpassbares Tag-Vokabular (v1.18.0).** Einstellungen → Wiki → Tag-Vokabular-Modus → *Custom* erlaubt es, eigene Entity- und Concept-Tag-Listen zu definieren (z. B. `Medical_Arzneimittel`, `法规`). Das Plugin respektiert dein Vokabular in Extraction-Prompts und Frontmatter-Validierung; die bestehende Lint-Audit (Issue #85 v7) meldet jede Seite, deren Tags außerhalb des aktiven Vokabulars liegen.

### 🛠️ Maintenance

- **🔍 Lint Health Scan** — Duplikate, tote Links, leere Pages, Orphans, fehlende Aliases und Widersprüche in einem umfassenden Report erkennen
- **🎯 Semantic-Tier Duplicate Detection** — Tier 1 (direkte Name-Matches: Cross-Language, Abkürzungen, hochähnliche Titel) immer verifiziert; Tier 2 (indirekte Signale: gemeinsame Links, moderate Ähnlichkeit) füllt Token-Budget
- **⚡ Smart Fix All** — Kausal geordneter Batch-Fix: Aliase vervollständigen → Duplikate mergen → tote Links auflösen → Orphans verlinken → leere Pages erweitern
- **🏷️ Alias Completion** — One-Click parallele Batch-Generierung fehlender Aliases zur Verbesserung zukünftiger Duplikat-Detection
- **🔄 Auto-Maintenance** — Multi-Folder File Watcher, periodischer Lint, Startup Health Check (Startup Quick Fixes standardmäßig AN, File Watcher und Periodic Lint standardmäßig AUS)
- **⚠️ Contradiction State Machine** — `detected → review_ok → resolved` (AI Fix) oder `detected → pending_fix` (manuell)
- **🛡️ Pre-Ingest Requirements Gate (v1.21.0)** — Jede Quelldatei wird *vor* jedem LLM-Aufruf validiert: leere/Whitelist-/nur-Frontmatter-Notizen werden abgelehnt; Content-Hash-Dedup erkennt identische Dateien über Pfade hinweg. Verhindert Halluzinationen lokaler Modelle bei leeren Eingaben.
- **📊 Operation History Panel (v1.21.0)** — Durchsuchbare, filterbare UI für vergangene Ingests, Lint-Berichte und Wartungsläufe, mit Insight-getriebenen KPI-Karten und klickbaren Seitenlinks.
- **🧹 Incomplete-Page Cleaner (v1.21.0)** — Durch unterbrochene Ingests unvollständig gebliebene Seiten werden beim Start automatisch archiviert (aus Obsidians `.trash` wiederherstellbar).

### 💬 Query & Feedback

- **🤖 Conversational Query** — ChatGPT-Style-Dialog, Streaming Markdown Output, `[[wiki-links]]`, Multi-Turn History
- **🪟 Rechts angedocktes Seitenpanel (v1.22.1, PR #196).** Query Wiki öffnet sich in einem Copilot-artigen rechten Sidebar-Leaf (existierendes Leaf wird wiederverwendet) statt eines zentrierten Popups. Das `message-circle` Ribbon-Icon und der `Query Wiki`-Befehl aktivieren/zeigen das Panel; deine Notizen bleiben neben der Konversation sichtbar. Alle Funktionen bleiben unverändert.
- **📤 Query-to-Wiki Feedback** — Wertvolle Conversations ins Wiki speichern, Entity/Concept Extraction, Semantic Dedup vor dem Speichern
- **🔒 Duplicate Save Prevention** — Hash Tracking verhindert Re-Evaluation unveränderter Conversations

### 🌐 LLM & Language

- **🔌 Multi-Provider Support** — Anthropic, Anthropic Compatible, Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, Custom Endpoint
- **🔄 5xx Auto Retry** — Alle Clients wiederholen bei HTTP 5xx/429/529-Fehlern mit Exponential Backoff (max. 2)
- **📋 Dynamic Model List** — Echtzeit-Fetch von Provider-API
- **🌐 Wiki Output Language** — Interface-unabhängige 10 Sprachen (Englisch/Simpl. Chinesisch/Trad. Chinesisch/Japanisch/Koreanisch/Deutsch/Französisch/Spanisch/Portugiesisch/Italienisch), Custom Input supported.
- **🌍 Full UI Internationalization** — Plugin UI unterstützt 10 Sprachen (EN/Simpl. ZH/Trad. ZH/JA/KO/DE/FR/ES/PT/IT), 269+ UI-Felder vollständig übersetzt, natürliche lokale Ausdrücke.
- **⚡ Rate Limit Guardian** — Wenn parallele Generierung Rate Limits auslöst, automatische Erkennung und Empfehlung: Parallelität reduzieren, Batch-Delay erhöhen, Provider wechseln
- **🦙 Web Clipper Compatible** — Obsidian Web Clipper's `Clippings/`-Ordner mit einem Klick zur Watchlist hinzufügen, Web-Clips automatisch in Wiki übernehmen

### 🏗️ Architecture & Performance

- **⚡ Parallel Page Generation** — Konfigurierbare 1–5 parallele Pages, Standard 3 (parallel), 2–3× Speedup bei großen Sources, per-Page Error Isolation
- **📚 Iterative Batch Extraction** — Adaptive Batch-Sizing, eliminiert max_tokens-Bottleneck bei langen Dokumenten
- **🏛️ Three-Layer Architecture** — `sources/` (read-only) → `wiki/` (LLM-generated) → `schema/` (co-evolved Config)
- **🧩 Modular Codebase** — 20+ fokussierte Module in `src/`

### 🔒 Datenschutz & Sicherheit

- **Kein Backend, keine Telemetrie.** Das Plugin läuft vollständig innerhalb von Obsidian — es gibt keinen externen Server, keine Analyse und keine Datenerfassung jeglicher Art. Ihre Notizen verlassen niemals Ihren Vault, es sei denn, Sie konfigurieren ausdrücklich einen LLM-Anbieter.
- **Ihre Daten bleiben standardmäßig lokal.** Das Plugin speichert, zwischenspeichert oder überträgt Ihre Inhalte nirgendwo außerhalb der von Ihnen gewählten LLM-API. Nur der Text, den Sie zur Aufnahme oder Abfrage senden, verlässt Ihr Gerät — und nur an den von Ihnen konfigurierten Anbieter.
- **Vollständiger lokaler Modus mit Ollama, LM Studio oder lokalen Anbietern.** Für vollständige Datensouveränität verwenden Sie ein lokal laufendes LLM. Ihre Notizen werden vollständig auf Ihrem Rechner verarbeitet — nichts berührt das Internet.
- **Minimale Berechtigungen.** Vault-Dateizugriff ist für die Wiki-Verwaltung erforderlich (Lesen von Notizen, Generieren von Seiten, Erkennen toter Links). Netzwerkzugriff wird ausschließlich für LLM-API-Aufrufe an Ihren gewählten Anbieter verwendet. Zwischenablagezugriff ist auf die Schaltfläche „Kopieren" im Abfrage-Modal beschränkt — nur wenn Sie darauf klicken.

---


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
created: 2025-12-01
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
| **🌟 Preis-Leistung** | **Grok-4** | 2M tokens | xAI 2025-07 flagship, 2M context, strong reasoning & code tasks |
| **Ausgewogen** | **Claude Sonnet 4.6** | 1M tokens | Gute Balance aus Qualität und Kosten, $3/$15 pro Million Tokens |
| **Leichtgewicht** | **Claude Haiku 4.5** | 200K tokens | Schnell und wirtschaftlich, für kleinere Wikis |
| **Wirtschaftlich** | **Xiaomi MiMo-V2.5** | 1M tokens | Xiaomi 310B/15B MoE, MIT Open-Source 2026-04, Agent & Multimodal |
| **Flagship** | Claude Opus 4.7 | 1M tokens | Höchste Qualität, höhere Kosten — selektiv einsetzen |
| **Flagship** | GPT-5.5 | 1M tokens | Top-Reasoning, höhere Kosten — selektiv einsetzen |

Für lokale Modelle (Ollama): Context Windows normalerweise kleiner (8K–128K), empfohlen wird die Nutzung von Cloud-Providern für Ingestion + lokales Modell für Query.

**🔌 Anthropic Compatible (Coding Plan):** Wenn Ihr Provider einen Anthropic-kompatiblen API-Endpunkt bietet, wählen Sie "Anthropic Compatible" und geben Sie die Base URL und den API Key Ihres Providers ein.

**🦙 Ollama (lokal, kein API-Key):** [Ollama](https://ollama.com) installieren, ein Modell pullen (`ollama pull gemma4` oder `ollama pull qwen3.5:27b`), im Provider-Dropdown "Ollama (Local)" auswählen.

**🎛️ LM Studio (lokal, kein API-Key):** [LM Studio](https://lmstudio.ai) installieren, den lokalen Server starten (Standard `http://localhost:1234/v1`), im Provider-Dropdown "LM Studio (Local)" auswählen. LM Studio betreibt einen eingebauten OpenAI-kompatiblen Server — API-Key-Feld ist optional.

> 💡 **Abonnementpläne:** Coding Plan, OpenAI Pro oder Anthropic Pro sind ausgezeichnete Optionen zur Kostenkontrolle bei häufiger Nutzung. Dieses Plugin unterstützt diese Dienste.

---

## 🏗️ Architektur

Basierend auf Karpathys Drei-Schichten-Design:

```
sources/     # 📄 Deine Quellendokumente (schreibgeschützt)
  ↓ ingest
wiki/        # 🧠 LLM-generierte Wiki-Seiten
  ↓ query / maintain
schema/      # 📋 Wiki-Strukturkonfiguration (Benennung, Vorlagen, Kategorien)
```

> 📖 Die vollständige Code-Struktur findest du in [CONTRIBUTING.md → Project Structure](../CONTRIBUTING.md#project-structure).

**Generierte Seiten:**
- `wiki/sources/dateiname.md` — 📄 Quellen-Zusammenfassung
- `wiki/entities/entitätsname.md` — 👤 Entitätsseiten (Personen, Organisationen, Projekte etc.)
- `wiki/concepts/konzeptname.md` — 💡 Konzeptseiten (Theorien, Methoden, Begriffe etc.)
- `wiki/index.md` — 📑 Automatisch generierter Index
- `wiki/log.md` — 📝 Betriebsprotokoll


---

## ❓ FAQ

> **Plugin aktuell halten.** Neue Funktionen und Fixes erscheinen häufig. **Einstellungen → Community-Plugins → Nach Updates suchen** regelmäßig ausführen.
>
> 📖 Weitere FAQs in [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

**Was macht das Plugin genau?**
Lege Notizen in `sources/` ab; der LLM extrahiert Entitäten und Konzepte und generiert ein vernetztes Wiki mit `[[bidirektionalen Links]]`. Stelle Fragen und erhalte Antworten aus *deinen* Notizen — keine Internetsuche.

**Werden meine Daten an Dritte gesendet?**
🔒 **Datenschutz zuerst.** Kein Backend, kein Tracking, keine Analysen — das Plugin läuft vollständig in Obsidian. Nur Text, den du explizit sendest, verlässt dein Gerät. Für vollständige Datenlokalität verwende einen lokalen Anbieter (Ollama oder LM Studio ohne API-Key) — deine Daten verlassen nie das Internet.

**Worin unterscheidet sich das von RAG-Chatbots?**
Anders als RAG, das den Kontext fragmentiert, verwendet LLM-Wiki eine **Personalized PageRank**-Engine über deinen `[[wiki-link]]`-Graphen — verwandte Seiten werden über Linkstrukturen gefunden, nicht über Vektor-Embeddings. Null Embedding-Kosten, keine neuen Abhängigkeiten.

**Welchen LLM soll ich wählen?**
Langkontext-Modelle (≥200K Tokens) funktionieren am besten. Preiswerte Optionen: DeepSeek V4-Flash ($0.14/M), Gemini 3.5 Flash, Qwen3.6-Plus. Lokale Modelle (Ollama/LM Studio) für Abfragen nutzbar, aber mit kleineren Kontextfenstern (8K–128K).

**Wie fange ich an?**
Aus Obsidian Community Plugins installieren → LLM-Anbieter wählen → **Test Connection** → Notizen in `sources/` ablegen → **Ingest single source**. Deine ersten Wiki-Seiten erscheinen in Sekunden.

**Wie kontrolliere ich API-Kosten?**
Nutze Grobe oder Minimale Extraktionsgranularität für Batch-Aufnahme (weniger LLM-Aufrufe). Smart Batch Skip erkennt bereits verarbeitete Dateien automatisch. Auto-Maintenance ist standardmäßig AUS.

**Ist mein bestehendes Wiki sicher?**
✅ Rückwärtskompatibel seit v1.0.0. Setze `reviewed: true` auf einer Seite, um sie vor Überschreiben zu schützen. Das Plugin ändert nie deine Quelldateien (`sources/`), nur generierte Wiki-Seiten.

**Kann ich das Plugin in meiner Sprache nutzen?**
🌐 **10 Sprachen** für UI und Wiki-Ausgabe: English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. UI- und Wiki-Sprache sind unabhängig voneinander.

**Mindestanforderungen?**
Obsidian v1.11.0+ (Desktop: Windows/macOS/Linux). Ein LLM-API-Key (oder Ollama/LM Studio lokal, kein API-Key nötig). Die **llmReady-Sperre** erfordert einen erfolgreichen Verbindungstest vor Freischaltung der Kernfunktionen.

**Wie breche ich einen laufenden Vorgang ab?**
Klicke den Statustext oder `Cmd+P` → "Cancel current ingestion". Stoppt sicher am nächsten Batch-Grenzwert.

**Wo bekomme ich Hilfe?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — Fehler melden
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — Fragen & Feedback
- Entwicklerkonsole (`Ctrl+Shift+I`) — Logs kopieren für schnellere Diagnose

## 🔒 Transparenz & Compliance

Dieses Plugin ist im Obsidian Community Plugin Market gelistet und wird einer automatisierten Überprüfung auf Sicherheit und Berechtigungen unterzogen.

**Das Plugin hat kein Backend, keine Server-Infrastruktur und keinerlei Datenerfassung.** Es ist reine lokale Software, die innerhalb von Obsidian ausgeführt wird. Das Plugin kann und wird Ihre Daten auf keine Weise sammeln, speichern oder an irgendeinen Server übertragen — weil ein solcher Server nicht existiert.

**Netzwerkzugriff** wird nur zur Kommunikation mit dem von Ihnen konfigurierten LLM-Anbieter verwendet — es werden keine anderen Netzwerkaufrufe getätigt. Dies liegt vollständig in Ihrer Kontrolle: Sie wählen den Anbieter, Sie geben den API-Schlüssel ein, Sie entscheiden, wohin Ihre Daten gehen.

**Dateisystemzugriff** (Vault-Auflistung) ist für den Aufbau und die Pflege des Wikis erforderlich: Lesen Ihrer Quellnotizen, Generieren von Seiten, Scannen auf tote Links und Erkennen doppelter Seiten. Das Plugin verändert niemals Ihre Quelldateien — nur Dateien im Wiki-Ordner.

**Zwischenablagezugriff** wird ausschließlich von der Schaltfläche „Kopieren" im Abfrage-Modal verwendet, und nur, wenn Sie darauf klicken.

Wenn Sie vollständige Datenlokalität bevorzugen, verwenden Sie einen lokalen LLM-Anbieter wie Ollama oder LM Studio. Mit einem lokalen Anbieter verlassen Ihre Daten niemals Ihren Rechner.

## 💖 Projekt unterstützen

Wenn LLM-Wiki zu einem wichtigen Teil Ihres Wissens-Workflows geworden ist, können Sie die laufende Entwicklung unterstützen:

- ☕ **[Kaufen Sie mir einen Kaffee auf Ko-fi](https://ko-fi.com/greenerdalii)** — einmalige oder monatliche Unterstützung über Ko-fi
- 💳 **[Trinkgeld über PayPal](https://paypal.me/greenerdalii)** — einmaliges Trinkgeld über PayPal

Sponsoring ist völlig freiwillig. Das Plugin bleibt Apache-2.0-lizenziert und vollständig funktionsfähig.

### Sponsoren

Dank an die folgenden Personen für die Unterstützung des Projekts:

- [@jameses-cyber](https://github.com/jameses-cyber)

## 📜 License

Apache License 2.0 — siehe [LICENSE](LICENSE) und [NOTICE](NOTICE).

## 🙏 Danksagungen

- **💡 Konzept:** [Andrej Karpathys LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — die ursprüngliche Vision, die dieses Plugin inspiriert hat
- **🛠️ Plattform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM-Transport:** [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=top-left)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=top-left)

---

**Official Site:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)
