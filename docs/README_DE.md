![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin für Obsidian

> KI-gestützte strukturierte Wissensbasis — wandelt Notizen automatisch in ein Wiki um. Basierend auf [Andrej Karpathys LLM Wiki-Konzept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

> **Obsidian-Review Perfekte Bewertung • Null-Embedding-Graph-Suche • Native Unterstützung für 10 Sprachen • Kompatibel mit jedem LLM-Anbieter**
> **Lokal zuerst • Kein Backend • DSGVO-freundlich**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/README.md) | [简体中文](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_CN.md) | [繁體中文](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_ZH-Hant.md) | [日本語](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_JA.md) | [한국어](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_KO.md) | **Deutsch** | [Français](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_FR.md) | [Español](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_ES.md) | [Português](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_PT.md) | [Italiano](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/README_IT.md)

[Offizielle Website](https://llmwiki.greenerai.top/) | [Obsidian-Marktplatz](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Diskussionen](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

> **MinerU-Fork-Hinweis (nur lokaler Build):** Dieser Branch baut ein eigenständiges Plugin, `karpathywiki-mineru` / **Karpathy LLM Wiki MinerU**, das neben dem Upstream-Marktplatz-Plugin `karpathywiki` existieren kann. Installiere den lokalen Build in `.obsidian/plugins/karpathywiki-mineru/`; die Marktplatz-/Update-Links oben zeigen weiterhin auf Upstream, solange kein MinerU-Release ausdrücklich angekündigt ist.

🤔 [Warum dieses Plugin?](#-warum-dieses-plugin) | 🚀 [Schnellstart](#-schnellstart) | ✨ [Funktionen](#-funktionen) | 🌐 [Ökosystem](#-ökosystem) | 🔍 [Wie die Suche funktioniert](#-wie-die-suche-funktioniert) | 🤖 [Modelle](#-modelle) | ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← Wenn dir dieses Plugin geholfen hat, lad mich gerne auf einen Kaffee♥️ ein oder vergib einen Stern🌟↗

---

> **⚡ Update-Hinweis:** „Nach Updates suchen“ und automatische Community-Plugin-Updates gelten nur für das Upstream-Plugin `karpathywiki`. Dieser MinerU-Fork ist ein lokaler Build; zum Aktualisieren musst du diesen Branch neu bauen und `main.js`, `manifest.json` sowie `styles.css` in `.obsidian/plugins/karpathywiki-mineru/` ersetzen.

## 📑 Inhalt

- [🤔 Warum dieses Plugin?](#-warum-dieses-plugin)
- [🎯 Ist es etwas für mich?](#-ist-es-etwas-für-mich)
- [🚀 Schnellstart](#-schnellstart)
- [✨ Funktionen](#-funktionen)
- [🌐 Ökosystem](#-ökosystem)
- [🛠️ Werkzeuge](#-werkzeuge)
- [🔍 Wie die Suche funktioniert](#-wie-die-suche-funktioniert)
- [🤖 Modelle](#-modelle)
- [❓ FAQ](#-faq)
- [🔒 Privatsphäre](#-privatsphäre)
- [💖 Unterstützung](#-unterstützung)
- [📜 Lizenz & Danksagungen](#-lizenz--danksagungen)

---

## 🤔 Warum dieses Plugin?

Du schreibst Notizen. Sie liegen in Ordnern. Zusammenhänge zu finden bedeutet, sich an Fäden zu erinnern, die du vor Monaten verloren hast.

**Andere Open-Source-Neuimplementierungen von Karpathys LLM-Wiki-Idee existieren — aber keine davon ist ein One-Click-Obsidian-Plugin.** Die meisten sind CLI-Tools, Claude-Code-Skills oder separate Desktop-Apps. Wir sind das einzige Plugin mit nativer UI, In-Vault-Speicher und Obsidians eigenem Graph View.

### Wie wir abschneiden

|  | **Karpathy LLM Wiki** (dieses Plugin) | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **Lieferung & Installation** | ✅ **5 Min.** — One-Click-Obsidian-Plugin: Community Plugins → Installieren → Provider wählen → Ingest | ❌ 30 Min.+ — Tauri-Binary kompilieren/herunterladen, CLI konfigurieren | ❌ 15 Min. — benötigt Claude-Code-Abo + Skill-Installation | ❌ 10 Min. — benötigt Claude-Code-/Codex-Abo + Skill-Einrichtung | ❌ 30 Min.+ — pip install + Python SDK + lokaler Server |
| **Architektur & Abhängigkeiten** | ✅ **Keine Abhängigkeiten** — keine Vektor-DB, kein Embedding-Modell, keine externen Prozesse (PPR über `[[wiki-link]]`-Graph, bewusst so gewählt) | 🟡 Eigenes Python-Runtime + sigma.js + sqlite; Embeddings optional, standardmäßig aus | 🟡 Nutzt Claude-Code-Umgebung — nicht eigenständig; keine Embeddings | 🟡 Erfordert separate Plattform-Laufzeitumgebung; keine Embeddings | ❌ Erfordert Python + Embedding-Modell + Vektor-DB (zwingend) |
| **i18n (UI + Wiki-Ausgabe)** | ✅ 10 Sprachen (unabhängige UI/Ausgabe) | 🟡 2 (EN / 中文) | ❌ Nur Englisch | ❌ Nur Englisch | ❌ Nur Englisch |
| **LLM-Anbieter** | ✅ 12+ (inkl. Codex OAuth, Bedrock, LM Studio, Ollama, Anthropic-kompatibel, Kimi, GLM, MiniMax, DeepSeek) | 🟡 OpenAI-kompatibel | 🟡 Abo über Claude Code | 🟡 Abo über Claude Code / Codex | 🟡 OpenAI-kompatibel |
| **Suche & Query-Pipeline** | ✅ **5-Stufen-Kaskade** — Lex → LLM-Keywords → Substring-Scan → LLM-KB-Fallback → PPR-Expansion (bricht bei erstem ausreichendem Signal ab). Personalized PageRank (Haveliwala 2002) + Monte Carlo (Fogaras 2005) | 🟡 Nur 2-Hop-Decay (4-Signal-Heuristik: Adamic-Adar + 2-Hop) | ❌ Nur Louvain-Community-Erkennung | ❌ Nur k-Hop-Vorschauen (keine LLM-Erweiterung) | ❌ BM25 + semantisch über Chunks (kein Graph) |
| **Graph-Visualisierung** | ✅ Obsidians nativer Graph View (integriert, null zusätzliche Größe) | ❌ Benutzerdefiniertes sigma.js + graphology in Desktop-App | 🟡 vis.js graph.html (separate Datei) | ❌ Benutzerdefiniertes sigma.js offline HTML | ❌ Read-only-Browser-Viewer |
| **Wiki-Ehrlichkeit** | ✅ „Stage FALLBACK"-Banner, wenn keine Wiki-Quelle zur Abfrage passt | ❌ Kein Äquivalent | ❌ Kein Äquivalent | ❌ Kein Äquivalent | ❌ Kein Äquivalent |
| **Veröffentlichter Such-Benchmark** | ✅ PPR @5 = 27,1 % vs. reine-kNN 24,1 % (einzige veröffentlichte Zahl in diesem Bereich) | ❌ 58 % → 71 % *nur mit aktivierten Embeddings*, nicht in unserem Apples-to-Apples-Format | ❌ Nicht veröffentlicht | ❌ Nicht veröffentlicht | ❌ Nicht veröffentlicht |

### Drei Dinge, die wir bewusst gewählt haben

- **🪟 Obsidian ist die Laufzeitumgebung.** Kein Terminal, keine separate App, kein Docker, kein Python. Aus Community-Plugins installieren, auf Ingest klicken, das Wiki lebt von der ersten Sekunde an in deinem Vault. Obsidians nativer Graph View rendert deinen `[[wiki-link]]`-Graphen — integriert, null zusätzliche Bundle-Größe.
- **🧭 Sauber und autark.** Keine Abhängigkeiten. Kein Embedding-Modell, keine Vektor-Datenbank, kein pip-Paket — ein einziges Plugin, das deine Notizen liest, mit einem LLM spricht und Wiki-Seiten schreibt. Alles lebt innerhalb von Obsidian.
- **🔌 Jedes Modell, für das du bereits bezahlst.** Anthropic, Bedrock, OpenAI, ChatGPT Plan (Codex OAuth), DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter, Anthropic-kompatibel, eigener Endpunkt — zwölf-plus Anbieter, keiner davon benötigt einen Embedding-Endpunkt.

---

## 🎯 Ist es etwas für mich?

**✅ Ja, wenn du:**

- **Eine 5-Minuten-Einrichtung willst, kein 5-Stunden-Projekt.** Aus Community-Plugins installieren → Provider wählen → eine Notiz ingestieren. Kein CLI, kein Python, keine separate Laufzeitumgebung, keine Vektor-DB. Du siehst Wiki-Seiten in `wiki/` innerhalb von Sekunden.
- **Etwas Sauberes und Autarkes möchtest.** Das Plugin hat genau null externe Abhängigkeiten: kein Embedding-Modell, keine Vektor-Datenbank, kein pip-Paket, kein Docker-Container. Es ist ein einziges Obsidian-Plugin, das deine Notizen liest, mit einem LLM spricht und Wiki-Seiten in deinen Vault schreibt. Alles lebt innerhalb von Obsidian.
- **Einen befragbaren Chat möchtest, der aus *deinen* Notizen antwortet** — nicht aus dem Internet — wobei jede Antwort `[[wiki-links]]` zurück in deinen Wissensgraphen trägt.
- **Wert auf Datensouveränität legst** — mit einem lokalen Anbieter wie Ollama oder LM Studio und dem PDF-Backend **Native model** bleiben Notizen und PDFs auf deinem Rechner. **MinerU Official API** lädt die ausgewählte PDF dagegen zum externen MinerU-Cloud-Dienst hoch.
- **In einer von 10 unterstützten Sprachen schreibst oder liest** — UI und Wiki-Ausgabe sind unabhängig (dein Wiki kann auf Chinesisch sein, während die Oberfläche auf Englisch ist).
- **Den Graphen durch Schreiben von `[[wiki-links]]` pflegst** — jeder Link, den du setzt, bereichert bereits die Suche; kein separater Tagging-/Embedding-/Indexing-Schritt.
- **One-Click-Wartung möchtest** — Lint-Gesundheitsscan + Smart Fix All halten Duplikate, tote Links und verwaiste Seiten in Schach, ohne dass du von Hand kuratieren musst.

**❌ Nein, wenn du:**

- **Einen allgemeinen ChatGPT-Ersatz suchst** — dieses Plugin antwortet nur aus *deinem* Wissen.
- **Eine RAG-Pipeline für PDFs/Webseiten/externe Korpora brauchst** — wir konzentrieren uns auf den In-Vault-Pfad (PDFs werden seit v1.25.0 unterstützt).
- **Nach einem gehosteten SaaS suchst** — es gibt kein Backend, keinen Server, keinen Account.

---

## 🚀 Schnellstart

1. **Wähle eine Edition zur Installation.**
   - **Dieser MinerU-Fork (nur lokaler Build):** Baue diesen Branch lokal, kopiere dann `main.js`, `manifest.json` und `styles.css` nach `.obsidian/plugins/karpathywiki-mineru/` und aktiviere **Karpathy LLM Wiki MinerU**. Nur dieser Installationsweg enthält das Backend **MinerU Official API**.
   - **Upstream `karpathywiki`:** Obsidian → Einstellungen → Community-Plugins → Durchsuchen → „Karpathy LLM Wiki" suchen → Installieren → Aktivieren, oder nutze die [Community-Plugin-Seite](https://community.obsidian.md/plugins/karpathywiki). Marketplace/Community Plugins installiert das Upstream-Plugin `karpathywiki` ohne MinerU-Backend.
2. **Provider konfigurieren.** Einstellungen → Karpathy LLM Wiki → Provider wählen (OpenAI, Anthropic, Ollama, ChatGPT Plan (Codex OAuth) usw.) → API-Key eingeben (nicht nötig bei lokalen Anbietern) → **Test Connection** klicken → Speichern.
3. **Eine Notiz ingestieren.** Zwei Wege:
   - **⌨️ Tastatur:** `Cmd+P/Ctrl+P` → „Ingest single source" → eine beliebige Markdown- (oder PDF-, v1.25.0+) Datei wählen.
   - **🖱️ Toolbar-Symbol:** Klicke auf das **Sticker-Symbol** im linken Ribbon von Obsidian, um die aktuell geöffnete Notiz sofort aufzunehmen — kein Menü-Suchen.
   
   Deine ersten Wiki-Seiten erscheinen innerhalb von Sekunden in `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`.
4. **Wiki abfragen.** Zwei Wege:
   - **⌨️ Tastatur:** `Cmd+P/Ctrl+P` → „Query wiki".
   - **🖱️ Toolbar-Symbol:** Klicke auf das **Sprechblasen-Symbol** im linken Ribbon von Obsidian.
   
   Ein rechts angedocktes Seitenpanel im Copilot-Stil öffnet sich, in dem du mit deinem Wiki chatten kannst. Antworten enthalten `[[wiki-links]]`, die zurück in deinen Wissensgraphen führen.

![Query side panel](/docs/assets/query-side-panel.png)

Das war's. Das Plugin ändert nichts an deinen ursprünglichen Notizen — es erstellt nur neue Seiten unter `wiki/`. Sowohl **Ingest** als auch **Wiki abfragen** sind im linken Ribbon fixiert, jederzeit mit einem Klick erreichbar. (`Cmd` auf macOS, `Ctrl` auf Windows/Linux.)

### Kernbefehle

| Befehl | Beschreibung |
|---------|--------------|
| **📥 Einzelne Quelle aufnehmen** | `Cmd+P/Ctrl+P` → „Ingest single source" — wähle eine Markdown- oder **PDF (v1.25.0+)**-Datei, erhalte Entity-/Concept-/Wiki-Seiten. *Oder: 🖱️ Sticker-Symbol im linken Ribbon auf der aktiven Notiz anklicken.* |
| **📂 Aus Ordner aufnehmen** | `Cmd+P/Ctrl+P` → „Ingest from folder" — Batch-Aufnahme aller Notizen in einem Ordner, mit intelligentem Batch-Überspringen |
| **📑 Mehrere Dateien aufnehmen** | `Cmd+P/Ctrl+P` → „Ingest multiple files" — wähle eine Teilmenge über eine zweigeteilte Dateibaumansicht (mit Live-Queue + pro-Datei-Abbruch) |
| **🔍 Wiki abfragen** | `Cmd+P/Ctrl+P` → „Query wiki" — chatte mit deinem Wiki in einem rechts angedockten Seitenpanel; Antworten enthalten `[[wiki-links]]`. *Oder: 🖱️ Sprechblasen-Symbol im linken Ribbon anklicken.* |
| **🛠️ Wiki linten** | `Cmd+P/Ctrl+P` → „Lint wiki" — vollständiger Gesundheitsscan: Duplikate, tote Links, leere Seiten, verwaiste Seiten, fehlende Aliase, Widersprüche |
| **⚡ Smart Fix All** | innerhalb des Lint-Modals — One-Click-Reparatur in kausaler Reihenfolge mit Phasenbericht |
| **📋 Index neu generieren** | `Cmd+P/Ctrl+P` → „Regenerate index" — baue `wiki/index.md` mit aktuellen Seiten und Aliasen neu auf |
| **⏹ Abbrechen** | `Cmd+P/Ctrl+P` → „Cancel current ingestion" oder auf die Statusleiste klicken — stoppt sauber an der nächsten Batch-Grenze |
| **📊 Aufnahmeverlauf** | `Cmd+P/Ctrl+P` → „View Ingestion History" — durchsuchbare UI für vergangene Aufnahmen, Lint-Berichte und Wartungsläufe |

![Command panel — all LLM Wiki commands live in Obsidian's command palette](/docs/assets/command-panel.png)
| Vorher | Nachher |
|--------|-------|
| `notes/machine-learning.md` (eine flache Datei) | `wiki/concepts/supervised-learning.md` mit `[[bidirektionalen Links]]`, Aliasen, Quellenangabe und einem Eintrag in `wiki/index.md` |

> 💡 **Bleib auf dem neuesten Stand.** Neue Funktionen, Fehlerbehebungen und Leistungsverbesserungen erscheinen häufig. Einstellungen → Community-Plugins → Nach Updates suchen, oder aktiviere automatische Plugin-Updates.
> 📖 Ausführliche Anleitungen (Installation, PDF-Einrichtung, Multi-Provider-Hinweise, Upgrades) werden in [GitHub Discussions → Guides](https://github.com/green-dalii/obsidian-llm-wiki/discussions/categories/guides) gepflegt.

> 🌟 **Wenn dir dieses Plugin Einrichtungszeit gespart hat, gib uns einen [Star auf GitHub](https://github.com/green-dalii/obsidian-llm-wiki) — es hilft anderen, es zu finden.**

---

## ✨ Funktionen

### 📚 Wissensqualität

- **🔍 Entity- & Concept-Extraktion** — LLM extrahiert Entitäten (Personen, Organisationen, Produkte, Ereignisse) und Konzepte (Theorien, Methoden, Begriffe) in eigenständige Seiten. Die Granularität ist konfigurierbar (Minimal → Fein, plus Benutzerdefiniert), sodass du Kosten gegen Tiefe abwägen kannst.
- **🏷️ Obligatorische Aliase** — jede Seite wird mit mindestens einem Alias (Übersetzung, Abkürzung, Variante) ausgeliefert, damit sprachübergreifende Duplikaterkennung funktioniert.
- **🔄 Abgestufte Duplikaterkennung** — Stufe 1 (direkter Namensmatch: sprachübergreifend, Abkürzung, hohe Titelähnlichkeit) wird immer verifiziert; Stufe 2 (gemeinsame Links, mittlere Ähnlichkeit) füllt das verbleibende Token-Budget.
- **🧩 Intelligentes Zusammenführen & Widerspruchsstatus** — Duplikate werden unter Erhalt der Aliase zusammengeführt; Widersprüche werden mit Quellenangabe markiert; `reviewed: true`-Seiten sind vor Überschreibung geschützt.
- **🎨 Anpassbares Tag-Vokabular** — definiere eigene Entity-Typ- und Concept-Typ-Tag-Listen in Einstellungen → Wiki → Tag-Vokabular → *Custom*. Das Vokabular ist ein SCHEMA-INJECTION-HINWEIS für die LLM, kein Schreibzeit-Gate — kleine/lokale Modelle können weiterhin abdriften, und Lint meldet diese Seiten. (Durchsetzung wird für v1.26.0+ entworfen.)

### 📄 PDF-Ingest (v1.25.0+)

- **🔌 Provider-Gate** — Anthropic, OpenAI und Bedrock verarbeiten PDF nativ. Für jeden anderen OpenAI/Anthropic-kompatiblen Endpunkt aktiviere **Force PDF Support** in Einstellungen → LLM Configuration → Advanced, damit das Plugin den Aufruf versucht. Für lokale OCR auf Apple Silicon, Drittanbieter-Extraktoren (MinerU, Docling, Mathpix, Adobe) und die vollständige PDF-Ingest-Anleitung siehe [PDF-OCR-Pfade](#-pdf-ocr-pfade) unten und [docs/PDF-OCR-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/PDF-OCR-GUIDE.md).
- **🗄️ Begrenzter Cache** — dieser Fork speichert konvertiertes Markdown in `.obsidian/plugins/karpathywiki-mineru/pdf-cache/`, getrennt vom Upstream-`karpathywiki`, keyed by Content-Hash + Modell + Converter-Version. Drei-Schichten-Housekeeping: 100 MB gesamt / 1000 Einträge / 10 MB Einzel-Limit mit LRU-by-mtime-Eviction.
- **📝 Optionaler Vault-Sidecar** — Einstellungen → Wiki Configuration → Wiki Folder → *Write PDF Markdown to Vault* schreibt `<basename>.pdf.md` neben die Quell-PDF (standardmäßig aus — Nur-Cache ist der Standard).
- **⛏️ MinerU Official API Backend** — dieser Fork ergänzt Einstellungen → Wiki Configuration → PDF conversion backend: **Native model** (Standard, Upstream-v1.25.6-Verhalten) oder **MinerU Official API**. MinerU ist nur auf Desktop verfügbar, nutzt deinen MinerU API Token, lädt die ausgewählte PDF zur externen MinerU-Cloud-API hoch, fällt bei Fehlern nie still auf Native zurück und veröffentlicht validierte Ergebnisse neben der PDF als `<basename>.mineru/` mit `document.md`, Bildern und `.mineru-manifest.json`. **Clear PDF conversion cache** entfernt nur den internen Cache, nicht diese im Vault sichtbaren `.mineru/`-Artefakte.
- **🛡️ Verbatim-Transcriber-Prompt** — OCR-artige Konvertierung mit `[illegible]` / `[figure: ...]`-Anti-Halluzinations-Markern; Markdown-Fence-Einschluss von kleinen lokalen Modellen wird vor dem Cache-Schreiben automatisch bereinigt.

### 📄 PDF-OCR-Pfade

Drei Pfade — wähle, was zu deinem Setup passt:

1. **☁️ Cloud-Provider mit nativer PDF-Unterstützung** — Anthropic, OpenAI oder AWS Bedrock lesen PDFs out of the box. Einfach ingestieren; keine zusätzliche Einrichtung. Für jeden anderen OpenAI/Anthropic-kompatiblen Endpunkt aktiviere **Force PDF Support** in Einstellungen → LLM Configuration → Advanced, damit das Plugin den Aufruf versucht.
2. **🖥️ Lokale OCR auf Apple Silicon** — [oMLX](https://github.com/jundot/omlx) integriert Microsoft Markitdown als eingebautes PDF→Markdown-Backend. Aktiviere Markitdown in oMLX, lade [Baidu Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR) (3B / 570M-aktiv, Open-Source seit 2026-06) als Vision-Modell, richte das Plugin auf oMLX als benutzerdefinierten OpenAI-kompatiblen Provider aus, aktiviere **Force PDF Support** und wähle das multimodale Modell, das oMLX bereitstellt. Die PDF verlässt niemals deinen Rechner.
3. **🛠️ Drittanbieter-Extraktor (MinerU, Docling, Mathpix, Adobe)** — Upstream-Nutzer können einen separaten Extraktor verwenden, `.md`-Dateien erzeugen und sie als reguläre Markdown-Notizen ingestieren. In diesem MinerU-Fork können Desktop-Nutzer stattdessen das integrierte **MinerU Official API** Backend wählen; es lädt nur die ausgewählte PDF hoch, speichert den Token über Obsidian SecretStorage und schreibt verwaltete `<basename>.mineru/`-Artefakte neben die PDF.

📖 **Vollständige Einrichtungsanleitungen** für alle drei Pfade (Cloud-Provider, oMLX-Hardware-Stufen, MinerU-Installation, Cache-Housekeeping) → [docs/PDF-OCR-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/PDF-OCR-GUIDE.md)

### 💬 Abfrage & Wartung

- **🧭 5-Stufen-PPR-Kaskade** — siehe [Wie die Suche funktioniert](#-wie-die-suche-funktioniert). Personalized PageRank über `[[wiki-link]]` liefert graph-bewussten Multi-Hop-Kontext.
- **🪟 Rechts angedocktes Seitenpanel** — Query Wiki öffnet sich in einem Copilot-artigen rechten Sidebar-Blatt (v1.22.1+) statt einem zentrierten Modal.
- **🔍 Lint-Gesundheitsscan** — ein einziger Befehl erfasst: Duplikate, tote Links, leere Seiten, verwaiste Seiten, fehlende Aliase, Widersprüche.
- **⚡ Smart Fix All** — One-Click-Reparatur in kausaler Reihenfolge: Aliase ergänzen → Duplikate zusammenführen → tote Links reparieren → verwaiste Seiten verlinken → leere Seiten erweitern, mit Phasenbericht.
- **📊 Betriebsverlaufs-Panel** — durchsuchbare, filterbare UI für vergangene Aufnahmen, Lint-Berichte und Wartungsläufe.
- **🛡️ Pre-Ingest-Gate** — leere/Whitespace-/Nur-Frontmatter-Notizen werden vor jedem LLM-Aufruf abgelehnt; Content-Hash-Dedup erkennt identische Dateien über Pfade hinweg.

### 🔒 Privatsphäre

- **🚫 Kein Projekt-Backend, kein Tracking, keine Analysen.** Läuft in Obsidian. Netzwerk wird nur für den konfigurierten LLM-Anbieter und, falls ausgewählt, für MinerU Official API zur PDF-Konvertierung genutzt.
- **📁 Quelldateien sind schreibgeschützt.** Das Plugin ändert niemals deine ursprünglichen Vault-Notizen — es erstellt nur neue Seiten unter `wiki/`.
- **🦙 Vollständig lokal bei lokaler Konfiguration.** Mit Ollama, LM Studio oder einem anderen lokalen Anbieter und dem Native-PDF-Backend bleiben Notizen und PDFs auf deinem Rechner. MinerU lädt die ausgewählte PDF zum externen MinerU-Cloud-Dienst hoch.
- **🔐 Minimale Berechtigungen.** Vault-Dateizugriff für die Wiki-Verwaltung. Zwischenablage-Zugriff nur, wenn du auf die Schaltfläche „Kopieren" im Abfrage-Modal klickst.

### 🦙 Lokal-first

- **🖥️ Ollama, LM Studio, OpenRouter, eigener Endpunkt** — sofort einsatzbereit. Lokale Modelle funktionieren für Abfragen (kleinere Kontextfenster); Ingest in einem 2.000-Seiten-Vault benötigt normalerweise ein Cloud-Modell mit langem Kontext.
- **📄 PDF-OCR-Pfad ist auf Apple Silicon vollständig lokal** — siehe [PDF-OCR-Pfade](#-pdf-ocr-pfade) unten.
- **🔐 ChatGPT Plan (Codex OAuth)** — Desktop-Loopback-Callback auf `127.0.0.1:1455`; Mobil über Gerätecode. Anmeldeinformationen leben nur in Obsidian SecretStorage; Abmelden löscht sie. Drittanbieter-Codex-Kompatibilität, keine OpenAI-Partnerschaft.

### 🌐 Sprache

- **🌍 10 UI-Sprachen** — English, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. UI und Wiki-Ausgabesprache sind unabhängig — dein Wiki kann auf Chinesisch sein, während die Oberfläche auf Englisch ist.
- **📚 10 Wiki-Ausgabesprachen** — dieselbe Auswahl; wähle in Einstellungen → Wiki Configuration. *Custom Input*-Option für Ad-hoc-Prompts.
- **🈶 269+ übersetzte UI-Strings** — jedes Label, Modal und jeder Hinweis. Eine 11. Sprache hinzuzufügen ist beitragsgesteuert (PR #159-Muster).

---

## 🔍 Wie die Suche funktioniert

Die meisten „KI-Suche"-Plugins fragmentieren deine Notizen in Chunks und betten sie in eine Vektor-DB ein. Wir nicht. Karpathys Argument gegen RAG ist, dass Chunking die Fähigkeit des LLM bricht, über deinen gesamten Wissensgraphen hinweg zu reasoning — und dieses Argument bestätigt sich in der Praxis. Stattdessen durchlaufen wir den Graphen, den du bereits pflegst, indem du `[[wiki-links]]` schreibst.

### Die 5-Stufen-Seed-Selektions-Kaskade

Wenn du fragst „Wer hat Microsoft gegründet?", durchläuft Query Wiki fünf Stufen, bevor eine Antwort generiert wird:

1. **Lex-Schnellpfad** — direkter Token-Überlappungs-Check gegen jeden Entity-/Concept-Titel und alle Aliase. Kostenlos, sofort und das Tor für alles, was danach kommt.
2. **LLM-Keyword-Generierung** — das LLM schlägt 8–12 sprachübergreifende Keywords aus deiner Abfrage vor (behandelt Synonyme, Abkürzungen und token-resistente Begriffe in einem LLM-Aufruf).
3. **Lokaler Substring-Scan** — jedes generierte Keyword wird lokal erneut gegen Seitentitel, Aliase und Body-Ausschnitte gematcht. Kein zusätzlicher LLM-Aufruf; rundet die rauschtolerante Trefferquote ab.
4. **LLM-KB-Fallback** — wenn Lex + Keyword-Scan schwache Signale liefern, führt das LLM einen semantischen Durchlauf gegen das gesamte Wiki durch, um die Top-N-Kandidaten neu zu seeden.
5. **PPR-Graph-Expansion** — Personalized PageRank (Haveliwala 2002) über dem `[[wiki-link]]`-Graphen, startend von der Kandidaten-Seed-Menge. Dies liefert graph-bewussten Multi-Hop-Kontext: „Bill Gates" → „Microsoft" → „Wettbewerber", nicht nur wörtliche Titelüberlappung.

Die Kaskade bricht ab, sobald der erreichte Schritt genug Signal geliefert hat — keine fixen 5-Stufen-Kosten, keine LLM-Aufrufe wenn Lex ausreicht, kein Präzisionsverlust wenn LLM-Erweiterung nötig ist.

### Personalized PageRank in großem Maßstab

Wir verwenden Monte-Carlo-PPR (Fogaras 2005) — 3.000 zufällige Walks × 50 Schritte — mit der Dead-End-Regel von Haveliwala 2002. Die Kosten sind **O(K × L)** unabhängig von der Seitenzahl, sodass ein 2.000-Seiten-Vault die gleiche Expansionslatenz wie ein 200-Seiten-Vault hat.

**PPR @5 = 27,1 % vs. reine-kNN-Baseline 24,1 %** auf dem projekteigenen Benchmark-Korpus (dem einzigen veröffentlichten Such-Benchmark in diesem Open-Source-LLM-Wiki-Bereich).

### Warum keine Embeddings

Wir haben den Embedding-Pfad in [Issue #175](https://github.com/green-dalii/obsidian-llm-wiki/issues/175) bewusst abgelehnt. Das Graph-Signal ist bereits vorhanden — jeder `[[wiki-link]]` ist eine handkuratierte „diese sind verwandt"-Kante, und die meisten unserer unterstützten Anbieter (Ollama, LM Studio, Anthropic, Bedrock, Kimi, GLM, MiniMax) haben gar keinen `/v1/embeddings`-Endpunkt. Das Hinzufügen eines Embedding-Modells würde einen Download pro Seite, einen Adapter pro Anbieter und null Nutzen für die Suchqualität bedeuten.

---

## 🤖 Modelle

**Unterstützte Anbieter (12+, alle geprüft gegen models.dev 2026-07):**

| Anbieter | Serie | Hinweise |
|----------|-------|----------|
| **Anthropic** | Claude 5-Serie | Nativer PDF-Support; `/v1/messages`-Protokoll |
| **OpenAI** | GPT-5.6-Serie (Sol / Terra / Luna) | Nativer PDF-Support; Platform-API-Key |
| **Google Gemini** | Gemini 3.6-Serie | Nativer PDF-Support (Datei-Parts seit 1.5); OpenAI-kompatibler Endpunkt |
| **DeepSeek** | DeepSeek V4-Serie | OpenAI-kompatibel; günstigste Kostenstufe |
| **Alibaba Qwen** | Qwen3.7/3.8-Serie | OpenAI-kompatibel (DashScope) |
| **xAI Grok** | Grok 4-Serie | OpenAI-kompatibel; langer Kontext |
| **Moonshot Kimi** | Kimi K3-Serie | OpenAI-kompatibel; 2,8T MoE Frontier |
| **Zhipu GLM** | GLM-5-Serie | OpenAI-kompatibel; stark zweisprachig |
| **MiniMax** | MiniMax M3-Serie | OpenAI-kompatibel; 1M Kontext |
| **Step (阶跃星辰)** | Step 3-Serie (Flash) | OpenAI-kompatibel; schnelle Inferenz |
| **Tencent Hunyuan** | Hy3-Serie | OpenAI-kompatibel; Open-Weight MoE |
| **Xiaomi MiMo** | MiMo V2.5-Serie | MIT Open-Source; Flat-Pricing |
| **Google Gemma** | Gemma 4-Serie | Open-Weight; 262K Kontext |
| **AWS Bedrock** | Anthropic + OpenAI-Varianten | VPC/Compliance-Pfad |
| **ChatGPT Plan (Codex OAuth)** | Codex Responses API | Browser-/Gerätecode-Anmeldung; SecretStorage |
| **Lokal: Ollama, LM Studio, OpenRouter, Anthropic-Compatible** | Jedes OpenAI-/Anthropic-Protokoll-Modell | Custom OpenAI-Compatible + Anthropic-Compatible (Token Plan / Coding Plan) |

Dieses Plugin füttert dem LLM pro Abfrage den gesamten Wiki-Kontext — daher gewinnen **Modelle mit langem Kontextfenster**. Die vollständige Tabelle (Cloud + Lokal) befindet sich in [docs/MODEL-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/MODEL-GUIDE.md), geprüft gegen [models.dev](https://models.dev/), damit die Empfehlungen aktuell bleiben.

### Was zählt

- **🧠 Kontextfenster ≥ 200K Tokens** für Vaults über ~500 Seiten. Unter 200K wird der von der Kaskade zusammengestellte Kontext zu stark gekürzt.
- **⚖️ Instruction-Following-Qualität** ist für die Extraktionsaufgabe wichtiger als roher IQ — wähle ein Modell, das der Schema-Vorlage folgt, nicht die größte Leaderboard-Zahl.
- **🔌 Embedding-Endpunkt ist irrelevant** — wir verwenden keine Embeddings. Ein Anbieter ohne `/v1/embeddings` ist in Ordnung (die meisten unserer 12+ Anbieter haben keinen).
- **🦙 Lokal für Abfragen, Cloud für Ingest** — Ingest in einem 2.000-Seiten-Vault benötigt normalerweise ein Cloud-Modell mit langem Kontext; ein 262K-lokales Modell deckt die meisten Abfragen ab.

### Anthropic vs. OpenAI vs. Codex OAuth — es sind unterschiedliche Anbieter

- **Anthropic** (und seine Bedrock-Variante) — separat abgerechneter Anthropic-Platform-API-Key.
- **OpenAI** — separat abgerechneter OpenAI-Platform-API-Key.
- **ChatGPT Plan (Codex OAuth)** — experimenteller, eigenständiger Anbieter, der nach Browser- oder Gerätecode-Anmeldung berechtigtes Codex-Kontingent nutzt; die Verfügbarkeit folgt den OpenAI-Codex-Authentifizierungs- und Kontingentrichtlinien, nicht dem Plannamen. Drittanbieter-Codex-Kompatibilität, keine OpenAI-Partnerschaft oder allgemeine ChatGPT-API.

> 📖 **Vollständige Auswahltabelle** (Cloud + Lokal + PDF-OCR + Codex OAuth + Quantisierung + Hardware-Stufen) → [docs/MODEL-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/MODEL-GUIDE.md)

---

## 🌐 Ökosystem

Das Plugin ergänzt sich mit dem Rest Ihres Obsidian-Stacks — jedes der folgenden Tools bindet sich ohne Code-Änderungen in den `[[wiki-link]]`-Graphen ein.

- **📄 [MinerU Online-Konvertierung](https://mineru.net/OpenSourceTools/Extractor)** — kostenloser PDF/Word/PPT/Excel/HTML/Bild → Markdown Konverter des OpenDataLab-Teams von Shanghai AI Lab. Dokument hochladen, `.md` herunterladen, außerhalb des Wiki-Ordners im Vault ablegen und **Einzelne Quelle aufnehmen** ausführen. Bester Pfad für wissenschaftliche Arbeiten, gescannte Dokumente und komplexe multimodale PDFs mit Formeln/Tabellen. Datenschutzsensible Nutzer können [MinerU selbst hosten](https://github.com/opendatalab/mineru); zukünftige Versionen könnten MinerU nativ integrieren — siehe [#376](https://github.com/green-dalii/obsidian-llm-wiki/issues/376).
- **🕸️ Obsidian Graph View** — öffnen Sie die native Graphenansicht auf jeder Wiki-Seite; jeder `[[wiki-link]]` wird zu einem Knoten, jeder Backlink zu einer Kante. Bereits eingebaut, null zusätzliche Bundle-Größe.
- **✂️ [Obsidian Web Clipper](https://obsidian.md/clipper)** — offizielle Browser-Erweiterung. Speichern Sie Webseiten (Artikel, Blogbeiträge, Reddit-Threads, Hacker News, Rezepte, Forschungsarbeiten, YouTube-Transkripte via Interpreter) in einem beliebigen Ordner Ihres Vaults und führen Sie anschließend den Plugin-Befehl „Aus Ordner aufnehmen" aus, um Entitäten und Konzepte stapelweise zu extrahieren.
- **📊 [Dataview](https://github.com/blacksmithgu/obsidian-dataview)** — durchsuchen Sie das Wiki wie eine Datenbank mit DQL (`LIST FROM "wiki/entities" WHERE contains(tags, "person")`) oder der JS-API. Das Plugin schreibt standardmäßige Frontmatter (`tags:`, `type:`, `aliases:`) auf jede Seite, sodass Dataview-Abfragen sofort funktionieren.
- **🌿 Git** — versionieren Sie Ihren Vault (mit jedem Git-Client). Das Plugin überschreibt niemals Ihre Quelldateien; es legt nur neue Seiten unter `wiki/` an, sodass `git diff` klar zwischen Ihren Änderungen und vom LLM erzeugten Inhalten trennt.
- **🎞️ [Marp Slides](https://github.com/samuele-cozzi/obsidian-marp)** — verwandeln Sie jede Obsidian-Notiz über Marp-Frontmatter (`marp: true`) in einen Foliensatz. Wiki-Seiten sind reines Markdown und rendern ohne zusätzliche Konvertierung als Folien.
- **🖼️ Canvas** — Obsidians native, unendliche Leinwand. Platzieren Sie Wiki-Karten auf einer Canvas, um Lernhilfen, Mindmaps oder Forschungsübersichten aus `[[wiki-links]]` zusammenzustellen — ohne den Vault zu verlassen.
- **🎤 [Obsidian Nous](https://github.com/AndyMDH/obsidian-nous)** — Begleit-Plugin für lokale Sprachmemo- und Meeting-Erfassung (whisper.cpp auf macOS; Audio verlässt das Gerät nicht). Erzeugt sprecherbeschriftete Transkripte und eigene Wiki-Hub-Seiten. Unabhängig von diesem Plugin — beide können dasselbe Vault ohne Kopplung nutzen.

---

## 🛠️ Werkzeuge

Das Plugin liefert ein Headless-CLI in diesem Repository, mit dem Sie dieselbe Ingest-Pipeline gegen einen Vault auf der Festplatte ausführen können — ohne Obsidian, ohne Electron, ohne Anzeige. Engine, Analyzer, Page Factory, Schema Manager und LLM-Clients werden direkt aus `src/` importiert; nur der Host (`obsidian`, Live-Vault, metadataCache) wird durch einen Shim ersetzt. Nützlich für CI, Skript-Läufe, den Vergleich von Sampling-Parametern zwischen Armen und das Profiling der Extraktionsschleife auf einer einzelnen Quelle.

```bash
pnpm llm-wiki ingest --vault /path/to/vault --source "notes/foo.md" --dry-run
```

Vollständige Flag-Referenz, Umgebungsanforderungen und Shim-Hinweise finden Sie in [`tools/llm-wiki-cli/README.md`](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/tools/llm-wiki-cli/README.md).

---

## ❓ FAQ

### Was macht das Plugin genau?

Wähle eine beliebige Notiz, einen Ordner oder eine Auswahl; der LLM extrahiert Entitäten und Konzepte und generiert ein vernetztes Wiki mit `[[bidirektionalen Links]]`. Stelle Fragen und erhalte Antworten aus *deinen* Notizen — nicht aus dem Internet. Deine ursprünglichen Vault-Notizen werden nie verändert.

### Wie fange ich an?

Aus Obsidian Community-Plugins installieren → Provider wählen → **Test Connection** → **Ingest single source** auf einer beliebigen Notiz ausführen. Erste Wiki-Seiten erscheinen innerhalb von Sekunden. Siehe [Schnellstart](#-schnellstart).

### Ist mein bestehendes Wiki sicher?

✅ Rückwärtskompatibel seit v1.0.0. Setze `reviewed: true` auf einer Seite, um sie vor Überschreiben zu schützen. Das Upgrade von v1.24.x überschreibt deinen Vault nicht; Native-PDF-Ingest ist standardmäßig Nur-Cache. Eine erfolgreiche MinerU-Konvertierung schreibt verwaltete `<basename>.mineru/`-Artefakte, überschreibt aber weder die Original-PDF noch Quellnotizen.

### Werden meine Daten an Dritte gesendet?

🚫 Kein Projekt-Backend, keine Analysen — das Plugin läuft in Obsidian. Text, den du explizit zum Aufnehmen/Abfragen sendest, geht nur an den konfigurierten LLM-Anbieter. Wenn du **MinerU Official API** für PDF-Konvertierung auswählst, wird die ausgewählte PDF mit deinem Token zur externen MinerU-Cloud-API hochgeladen; für einen lokalen PDF-Pfad nutze Native mit Ollama oder LM Studio.

### Kann ich das Plugin in meiner Sprache nutzen?

🌍 10 Sprachen für sowohl UI als auch Wiki-Ausgabe. UI- und Wiki-Sprache sind unabhängig voneinander. Das Hinzufügen einer 11. Sprache ist beitragsgesteuert (PR #159-Muster).

### Worin unterscheidet sich das von einem RAG-Chatbot?

🚫 Kein Chunking. 🚫 Keine Embeddings. 🚫 Keine Vektor-DB. ✅ Personalized PageRank über deinen bestehenden `[[wiki-link]]`-Graphen — graph-bewusster Multi-Hop-Kontext, null Embedding-Kosten, vollständige Unterstützung lokaler Modelle.

### Welchen LLM soll ich wählen?

Modelle mit langem Kontext (≥200K Tokens) funktionieren am besten. Der Abschnitt [Modelle](#-modelle) erklärt die Prinzipien; die vollständige Tabelle befindet sich in [docs/MODEL-GUIDE.md](https://github.com/green-dalii/obsidian-llm-wiki/blob/main/docs/MODEL-GUIDE.md).

### Gibt es einen veröffentlichten Benchmark?

Ja — PPR @5 = 27,1 % vs. reine-kNN-Baseline 24,1 % auf dem projekteigenen Korpus. Die vollständige Pipeline und das Benchmark-Skript sind beschrieben unter [Wie die Suche funktioniert](#-wie-die-suche-funktioniert).

### Wie kontrolliere ich API-Kosten?

Verwende Grobe oder Minimale Extraktionsgranularität für Batch-Aufnahme. Smart Batch Skip erkennt bereits verarbeitete Dateien automatisch. Auto-Maintenance ist standardmäßig AUS. Lint zeigt Anzahl an, bevor Reparaturen ausgeführt werden — nichts wird ohne deine Zustimmung berechnet.

### Wie breche ich einen laufenden Vorgang ab?

Klicke auf die Statusleiste (zeigt „Ingesting… click to cancel") oder `Cmd+P/Ctrl+P` → „Cancel current ingestion". Stoppt sauber an der nächsten Batch-Grenze.

### Wo bekomme ich Hilfe?

[GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) für Fehlermeldungen · [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) für Fragen und Funktionswünsche · Entwicklerkonsole (`Ctrl+Shift+I` / `Cmd+Option+I`) für Plugin-Logs.

---

## 🔒 Privatsphäre

Das Upstream-Plugin `karpathywiki` ist im Obsidian Community Plugin Market gelistet und wird automatisiert auf Sicherheit und Berechtigungen geprüft; dieser MinerU-Fork ist bis zu einer ausdrücklich angekündigten Veröffentlichung ein lokaler Build.

- **🚫 Kein Projekt-Backend, kein Server, keine Datenerfassung.** Reine lokale Software, die innerhalb von Obsidian läuft. Dieses Projekt betreibt keinen eigenen Dienst und kann deine Daten daher nicht erfassen.
- **🔐 Netzwerkzugriff ist optional.** Wird nur für die Kommunikation mit dem von dir konfigurierten LLM-Anbieter und, falls gewählt, mit der MinerU Official API für die zu konvertierende PDF verwendet. Du wählst Anbieter/Backend, gibst Key oder Token ein und entscheidest, wohin deine Daten gehen.
- **📁 Vault-Dateizugriff** wird für die Wiki-Verwaltung verwendet (Lesen von Notizen, Generieren von Seiten, Scannen auf tote Links, Erkennen von Duplikaten). Das Plugin ändert niemals deine Quelldateien.
- **📋 Zwischenablage-Zugriff** wird ausschließlich von der Schaltfläche „Kopieren" im Abfrage-Modal verwendet — und nur, wenn du darauf klickst.

Für vollständige Datenlokalität verwende das Native-PDF-Backend mit Ollama oder LM Studio. Auch mit lokalem LLM-Anbieter lädt MinerU die ausgewählte PDF zum externen MinerU-Cloud-Dienst hoch.

---

## 💖 Unterstützung

Wenn LLM-Wiki zu einem wichtigen Teil deines Wissens-Workflows geworden ist:

- ☕ **[Kauf mir einen Kaffee auf Ko-fi](https://ko-fi.com/greenerdalii)** — einmalig oder monatlich
- 💳 **[Trinkgeld via PayPal](https://paypal.me/greenerdalii)** — einmaliges Trinkgeld

Sponsoring ist völlig freiwillig. Das Plugin bleibt Apache-2.0-lizenziert und voll funktionsfähig.

Dank an [@jameses-cyber](https://github.com/jameses-cyber) und [@issaqua](https://github.com/issaqua) für die Unterstützung des Projekts.

---

## 📜 Lizenz & Danksagungen

Apache License, Version 2.0 — siehe [LICENSE](../LICENSE) und [NOTICE](../NOTICE).

**Basiert auf:**
- 💡 [Andrej Karpathys LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — das ursprüngliche Konzept
- 🛠️ [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 🔌 [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian `requestUrl`
- 🧮 [Personalized PageRank (Haveliwala 2002)](https://www-cs.stanford.edu/~taherh/papers/topic-sensitive-pagerank-tkde.pdf) und [Monte Carlo PPR (Fogaras 2005)](https://www.cs.cmu.edu/~dpelleg/download/pagerank.pdf) — Suchalgorithmen

**Betreuer:** [@green-dalii](https://github.com/green-dalii)

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Xa2Oeo4ZXfP48muFa_nEj7wrUaENRLnE0bXSZM7EKTUhHHlmnDFmmxSW80NS8-kXm4kDDMbdzkrZ0MtcqUcmAxB1a1FVVmIIimncTWL9Zg7Ms7j8gnjdCpd0-SyvSc5ubCtUB2zkqtn_V4alrEi7UbBpTlNTdHPva_Vuar5lx9d-ousGG-zhpUk3cGaw)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
