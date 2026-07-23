![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin für Obsidian

> KI-gestützte strukturierte Wissensbasis — wandelt Notizen automatisch in ein Wiki um. Basierend auf [Andrej Karpathys LLM Wiki-Konzept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

> **Obsidian-offizielle Bewertung 95/100 | Native Unterstützung für 10 Sprachen | Null-Embedding-Graph-Suche | Volle Datensouveränität | Kompatibel mit jedem LLM-Anbieter**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | **Deutsch** | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[Offizielle Website](https://llmwiki.greenerai.top/) | [Obsidian-Marktplatz](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Diskussionen](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

📑 [Inhalt](#-inhalt) • 🚀 [Schnellstart](#-schnellstart) • ✨ [Funktionen](#-funktionen) • 🔍 [Wie die Suche funktioniert](#-wie-die-suche-funktioniert) • 🤖 [Modelle](#-modelle) • ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← Wenn dir dieses Plugin geholfen hat, lad mich gerne auf einen Kaffee♥️ ein oder vergib einen Stern🌟↗

---

> **⚡ Schnellupdate-Hinweis:** Dieses Projekt entwickelt sich rasant weiter – Fehlerbehebungen, Leistungsverbesserungen, neue Funktionen und UX-Optimierungen werden häufig veröffentlicht. Wir empfehlen, in Obsidian regelmäßig zu aktualisieren (**Einstellungen → Community-Plugins → Nach Updates suchen**) oder die automatische Plugin-Aktualisierung zu aktivieren.

## 📑 Inhalt

- [🤔 Warum dieses Plugin?](#-warum-dieses-plugin)
- [🎯 Ist es etwas für mich?](#-ist-es-etwas-für-mich)
- [🚀 Schnellstart](#-schnellstart)
- [✨ Funktionen](#-funktionen)
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

|  | Karpathy LLM Wiki (dieses Plugin) | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **Lieferform** | ✅ One-Click-Obsidian-Plugin | ❌ Separate Tauri-Desktop-App | ❌ Claude-Code-Skill | ❌ Claude-Code-/Codex-Skill | ❌ CLI + SDK + MCP-Server |
| **Einrichtungsaufwand** | ✅ **5 Minuten** — Community Plugins → Installieren → Provider wählen → Ingest | ❌ 30 Min.+ — Binary kompilieren/herunterladen, CLI konfigurieren | ❌ 15 Min. — benötigt Claude-Code-Abo + Skill-Installation | ❌ 10 Min. — benötigt Claude-Code-/Codex-Abo + Skill-Einrichtung | ❌ 30 Min.+ — pip install + SDK + MCP-Konfiguration |
| **Installationsweg** | ✅ Obsidian → Community Plugins → Suchen → Installieren | ❌ Separates Binary kompilieren oder herunterladen, dann CLI konfigurieren | ❌ Benötigt Claude-Code-Abo + Installationsanleitung | ❌ Benötigt Claude-Code- oder Codex-Abo + Einrichtungsschritte | ❌ pip install + Python SDK + lokaler Server |
| **Architekturkomplexität** | ✅ **Keine Abhängigkeiten** — keine Vektor-DB, kein Embedding-Modell, keine externen Prozesse | 🟡 Eigenes Python-Runtime + sigma.js + sqlite | 🟡 Nutzt Claude-Code-Umgebung — nicht eigenständig | 🟡 Erfordert separate Plattform-Laufzeitumgebung | ❌ Erfordert Python, Embedding-Modell, Vektor-DB |
| **i18n (UI + Wiki-Ausgabe)** | ✅ 10 Sprachen (unabhängige UI/Ausgabe) | 🟡 2 (EN / 中文) | ❌ Nur Englisch | ❌ Nur Englisch | ❌ Nur Englisch |
| **LLM-Anbieter** | ✅ 12+ (inkl. Codex OAuth, Bedrock, LM Studio, Ollama, Anthropic-kompatibel, Kimi, GLM, MiniMax, DeepSeek) | 🟡 OpenAI-kompatibel | 🟡 Abo über Claude Code | 🟡 Abo über Claude Code / Codex | 🟡 OpenAI-kompatibel |
| **Suchalgorithmus** | ✅ Personalized PageRank (Haveliwala 2002) + Monte Carlo (Fogaras 2005) | 🟡 4-Signal-Heuristik (Adamic-Adar + 2-Hop-Decay) | ❌ Nur Louvain-Community-Erkennung | ❌ Louvain + k-Hop-Vorschauen | ❌ Hybrid: BM25 + semantisch + Wikilink |
| **Query-Pipeline (5-Stufen-Kaskade)** | ✅ Lex → LLM-Keywords → Substring-Scan → LLM-KB-Fallback → PPR-Expansion (bricht bei erstem ausreichendem Signal ab) | 🟡 Nur 2-Hop-Decay | ❌ Nur Louvain-Clustering | ❌ k-Hop-Vorschauen (keine LLM-Erweiterung) | ❌ BM25 + semantisch über Chunks (kein Graph) |
| **Embeddings erforderlich** | ✅ Nein (null Embedding-Kosten, bewusst so gewählt) | 🟡 Optional, standardmäßig aus | ✅ Nein | ✅ Nein | ❌ **Ja — zwingend erforderlich** |
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
- **Wert auf Datensouveränität legst** — läuft vollständig lokal mit Ollama oder LM Studio, ohne jemals das Internet zu berühren.
- **In einer von 10 unterstützten Sprachen schreibst oder liest** — UI und Wiki-Ausgabe sind unabhängig (dein Wiki kann auf Chinesisch sein, während die Oberfläche auf Englisch ist).
- **Den Graphen durch Schreiben von `[[wiki-links]]` pflegst** — jeder Link, den du setzt, bereichert bereits die Suche; kein separater Tagging-/Embedding-/Indexing-Schritt.
- **One-Click-Wartung möchtest** — Lint-Gesundheitsscan + Smart Fix All halten Duplikate, tote Links und verwaiste Seiten in Schach, ohne dass du von Hand kuratieren musst.

**❌ Nein, wenn du:**

- **Einen allgemeinen ChatGPT-Ersatz suchst** — dieses Plugin antwortet nur aus *deinem* Wissen.
- **Eine RAG-Pipeline für PDFs/Webseiten/externe Korpora brauchst** — wir konzentrieren uns auf den In-Vault-Pfad (PDFs werden seit v1.25.0 unterstützt).
- **Nach einem gehosteten SaaS suchst** — es gibt kein Backend, keinen Server, keinen Account.

---

## 🚀 Schnellstart

1. **Installieren.** Obsidian → Einstellungen → Community-Plugins → Durchsuchen → „Karpathy LLM Wiki" suchen → Installieren → Aktivieren. Oder besuche die [Community-Plugin-Seite](https://community.obsidian.md/plugins/karpathywiki) und klicke auf **Zu Obsidian hinzufügen**.
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

---

## ✨ Funktionen

### 📚 Wissensqualität

- **🔍 Entity- & Concept-Extraktion** — LLM extrahiert Entitäten (Personen, Organisationen, Produkte, Ereignisse) und Konzepte (Theorien, Methoden, Begriffe) in eigenständige Seiten. Die Granularität ist konfigurierbar (Minimal → Fein, plus Benutzerdefiniert), sodass du Kosten gegen Tiefe abwägen kannst.
- **🏷️ Obligatorische Aliase** — jede Seite wird mit mindestens einem Alias (Übersetzung, Abkürzung, Variante) ausgeliefert, damit sprachübergreifende Duplikaterkennung funktioniert.
- **🔄 Abgestufte Duplikaterkennung** — Stufe 1 (direkter Namensmatch: sprachübergreifend, Abkürzung, hohe Titelähnlichkeit) wird immer verifiziert; Stufe 2 (gemeinsame Links, mittlere Ähnlichkeit) füllt das verbleibende Token-Budget.
- **🧩 Intelligentes Zusammenführen & Widerspruchsstatus** — Duplikate werden unter Erhalt der Aliase zusammengeführt; Widersprüche werden mit Quellenangabe markiert; `reviewed: true`-Seiten sind vor Überschreibung geschützt.
- **🎨 Anpassbares Tag-Vokabular** — definiere eigene Entity-Typ- und Concept-Typ-Tag-Listen in Einstellungen → Wiki → Tag-Vokabular → *Custom*; Lint meldet jede Seite, deren Tags außerhalb des aktiven Vokabulars liegen.

### 📄 PDF-Ingest (v1.25.0+)

- **🔌 Provider-Gate** — Anthropic, OpenAI und Bedrock verarbeiten PDF nativ. Für jeden anderen OpenAI/Anthropic-kompatiblen Endpunkt aktiviere **Force PDF Support** in Einstellungen → LLM Configuration → Advanced, damit das Plugin den Aufruf versucht. Für lokale OCR auf Apple Silicon, Drittanbieter-Extraktoren (MinerU, Docling, Mathpix, Adobe) und die vollständige PDF-Ingest-Anleitung siehe [PDF-OCR-Pfade](#-pdf-ocr-pfade) unten und [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md).
- **🗄️ Begrenzter Cache** — `.obsidian/plugins/karpathywiki/pdf-cache/` speichert konvertiertes Markdown, keyed by Content-Hash + Modell + Converter-Version. Drei-Schichten-Housekeeping: 100 MB gesamt / 1000 Einträge / 10 MB Einzel-Limit mit LRU-by-mtime-Eviction.
- **📝 Optionaler Vault-Sidecar** — Einstellungen → Wiki Configuration → Wiki Folder → *Write PDF Markdown to Vault* schreibt `<basename>.pdf.md` neben die Quell-PDF (standardmäßig aus — Nur-Cache ist der Standard).
- **🛡️ Verbatim-Transcriber-Prompt** — OCR-artige Konvertierung mit `[illegible]` / `[figure: ...]`-Anti-Halluzinations-Markern; Markdown-Fence-Einschluss von kleinen lokalen Modellen wird vor dem Cache-Schreiben automatisch bereinigt.

### 📄 PDF-OCR-Pfade

Drei Pfade — wähle, was zu deinem Setup passt:

1. **☁️ Cloud-Provider mit nativer PDF-Unterstützung** — Anthropic, OpenAI oder AWS Bedrock lesen PDFs out of the box. Einfach ingestieren; keine zusätzliche Einrichtung. Für jeden anderen OpenAI/Anthropic-kompatiblen Endpunkt aktiviere **Force PDF Support** in Einstellungen → LLM Configuration → Advanced, damit das Plugin den Aufruf versucht.
2. **🖥️ Lokale OCR auf Apple Silicon** — [oMLX](https://github.com/jundot/omlx) integriert Microsoft Markitdown als eingebautes PDF→Markdown-Backend. Aktiviere Markitdown in oMLX, lade [Baidu Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR) (3B / 570M-aktiv, Open-Source seit 2026-06) als Vision-Modell, richte das Plugin auf oMLX als benutzerdefinierten OpenAI-kompatiblen Provider aus, aktiviere **Force PDF Support** und wähle das multimodale Modell, das oMLX bereitstellt. Die PDF verlässt niemals deinen Rechner.
3. **🛠️ Drittanbieter-Extraktor (MinerU, Docling, Mathpix, Adobe)** — führe einen separaten Extraktor auf deinen PDFs aus, um `.md`-Dateien zu erzeugen, und ingestiere sie dann als reguläre Markdown-Notizen über die Standard-Pipeline des Plugins. Am zuverlässigsten für wissenschaftliche Arbeiten, gescannte Dokumente und mathematiklastige PDFs.

📖 **Vollständige Einrichtungsanleitungen** für alle drei Pfade (Cloud-Provider, oMLX-Hardware-Stufen, MinerU-Installation, Cache-Housekeeping) → [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md)

### 💬 Abfrage & Wartung

- **🧭 5-Stufen-PPR-Kaskade** — siehe [Wie die Suche funktioniert](#-wie-die-suche-funktioniert). Personalized PageRank über `[[wiki-link]]` liefert graph-bewussten Multi-Hop-Kontext.
- **🪟 Rechts angedocktes Seitenpanel** — Query Wiki öffnet sich in einem Copilot-artigen rechten Sidebar-Blatt (v1.22.1+) statt einem zentrierten Modal.
- **🔍 Lint-Gesundheitsscan** — ein einziger Befehl erfasst: Duplikate, tote Links, leere Seiten, verwaiste Seiten, fehlende Aliase, Widersprüche.
- **⚡ Smart Fix All** — One-Click-Reparatur in kausaler Reihenfolge: Aliase ergänzen → Duplikate zusammenführen → tote Links reparieren → verwaiste Seiten verlinken → leere Seiten erweitern, mit Phasenbericht.
- **📊 Betriebsverlaufs-Panel** — durchsuchbare, filterbare UI für vergangene Aufnahmen, Lint-Berichte und Wartungsläufe.
- **🛡️ Pre-Ingest-Gate** — leere/Whitespace-/Nur-Frontmatter-Notizen werden vor jedem LLM-Aufruf abgelehnt; Content-Hash-Dedup erkennt identische Dateien über Pfade hinweg.

### 🔒 Privatsphäre

- **🚫 Kein Backend, kein Tracking, keine Analysen.** Läuft vollständig innerhalb von Obsidian. Netzwerk wird nur für die Kommunikation mit dem von dir konfigurierten LLM-Anbieter genutzt.
- **📁 Quelldateien sind schreibgeschützt.** Das Plugin ändert niemals deine ursprünglichen Vault-Notizen — es erstellt nur neue Seiten unter `wiki/`.
- **🦙 Vollständiger lokaler Modus.** Ollama, LM Studio oder ein beliebiger lokaler OpenAI-kompatibler Endpunkt → deine Notizen verlassen niemals deinen Rechner.
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

Dieses Plugin füttert dem LLM pro Abfrage den gesamten Wiki-Kontext — daher gewinnen **Modelle mit langem Kontextfenster**. Die vollständige Tabelle (Cloud + Lokal) befindet sich in [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md), geprüft gegen [models.dev](https://models.dev/), damit die Empfehlungen aktuell bleiben.

### Was zählt

- **🧠 Kontextfenster ≥ 200K Tokens** für Vaults über ~500 Seiten. Unter 200K wird der von der Kaskade zusammengestellte Kontext zu stark gekürzt.
- **⚖️ Instruction-Following-Qualität** ist für die Extraktionsaufgabe wichtiger als roher IQ — wähle ein Modell, das der Schema-Vorlage folgt, nicht die größte Leaderboard-Zahl.
- **🔌 Embedding-Endpunkt ist irrelevant** — wir verwenden keine Embeddings. Ein Anbieter ohne `/v1/embeddings` ist in Ordnung (die meisten unserer 12+ Anbieter haben keinen).
- **🦙 Lokal für Abfragen, Cloud für Ingest** — Ingest in einem 2.000-Seiten-Vault benötigt normalerweise ein Cloud-Modell mit langem Kontext; ein 262K-lokales Modell deckt die meisten Abfragen ab.

### Anthropic vs. OpenAI vs. Codex OAuth — es sind unterschiedliche Anbieter

- **Anthropic** (und seine Bedrock-Variante) — separat abgerechneter Anthropic-Platform-API-Key.
- **OpenAI** — separat abgerechneter OpenAI-Platform-API-Key.
- **ChatGPT Plan (Codex OAuth)** — experimenteller, eigenständiger Anbieter, der nach Browser- oder Gerätecode-Anmeldung berechtigtes Codex-Kontingent nutzt; die Verfügbarkeit folgt den OpenAI-Codex-Authentifizierungs- und Kontingentrichtlinien, nicht dem Plannamen. Drittanbieter-Codex-Kompatibilität, keine OpenAI-Partnerschaft oder allgemeine ChatGPT-API.

> 📖 **Vollständige Auswahltabelle** (Cloud + Lokal + PDF-OCR + Codex OAuth + Quantisierung + Hardware-Stufen) → [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)

---

## ❓ FAQ

### Was macht das Plugin genau?

Wähle eine beliebige Notiz, einen Ordner oder eine Auswahl; der LLM extrahiert Entitäten und Konzepte und generiert ein vernetztes Wiki mit `[[bidirektionalen Links]]`. Stelle Fragen und erhalte Antworten aus *deinen* Notizen — nicht aus dem Internet. Deine ursprünglichen Vault-Notizen werden nie verändert.

### Wie fange ich an?

Aus Obsidian Community-Plugins installieren → Provider wählen → **Test Connection** → **Ingest single source** auf einer beliebigen Notiz ausführen. Erste Wiki-Seiten erscheinen innerhalb von Sekunden. Siehe [Schnellstart](#-schnellstart).

### Ist mein bestehendes Wiki sicher?

✅ Rückwärtskompatibel seit v1.0.0. Setze `reviewed: true` auf einer Seite, um sie vor Überschreiben zu schützen. Das Upgrade von v1.24.x überschreibt deinen Vault nicht; der PDF-Ingest von v1.25.0 ist standardmäßig Nur-Cache.

### Werden meine Daten an Dritte gesendet?

🚫 Kein Backend, keine Analysen — das Plugin läuft vollständig in Obsidian. Nur Text, den du explizit zum Aufnehmen/Abfragen sendest, verlässt dein Gerät, und nur an den von dir konfigurierten LLM-Anbieter. Für vollständige Datenlokalität verwende Ollama oder LM Studio.

### Kann ich das Plugin in meiner Sprache nutzen?

🌍 10 Sprachen für sowohl UI als auch Wiki-Ausgabe. UI- und Wiki-Sprache sind unabhängig voneinander. Das Hinzufügen einer 11. Sprache ist beitragsgesteuert (PR #159-Muster).

### Worin unterscheidet sich das von einem RAG-Chatbot?

🚫 Kein Chunking. 🚫 Keine Embeddings. 🚫 Keine Vektor-DB. ✅ Personalized PageRank über deinen bestehenden `[[wiki-link]]`-Graphen — graph-bewusster Multi-Hop-Kontext, null Embedding-Kosten, vollständige Unterstützung lokaler Modelle.

### Welchen LLM soll ich wählen?

Modelle mit langem Kontext (≥200K Tokens) funktionieren am besten. Der Abschnitt [Modelle](#-modelle) erklärt die Prinzipien; die vollständige Tabelle befindet sich in [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md).

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

Dieses Plugin ist im Obsidian Community Plugin Market gelistet und wird einer automatisierten Überprüfung auf Sicherheit und Berechtigungen unterzogen.

- **🚫 Kein Backend, kein Server, keine Datenerfassung.** Reine lokale Software, die innerhalb von Obsidian läuft. Das Plugin kann und wird deine Daten auf keine Weise sammeln, speichern oder an irgendeinen Server übertragen — weil ein solcher Server nicht existiert.
- **🔐 Netzwerkzugriff ist optional.** Wird nur für die Kommunikation mit dem von dir konfigurierten LLM-Anbieter verwendet. Du wählst den Anbieter, du gibst den API-Key ein, du entscheidest, wohin deine Daten gehen.
- **📁 Vault-Dateizugriff** wird für die Wiki-Verwaltung verwendet (Lesen von Notizen, Generieren von Seiten, Scannen auf tote Links, Erkennen von Duplikaten). Das Plugin ändert niemals deine Quelldateien.
- **📋 Zwischenablage-Zugriff** wird ausschließlich von der Schaltfläche „Kopieren" im Abfrage-Modal verwendet — und nur, wenn du darauf klickst.

Für vollständige Datenlokalität verwende Ollama oder LM Studio. Mit einem lokalen Anbieter verlassen deine Daten niemals deinen Rechner.

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