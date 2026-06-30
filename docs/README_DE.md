![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin für Obsidian

> KI-gestützte strukturierte Wissensbasis — wandelt Notizen automatisch in ein Wiki um. Basierend auf [Andrej Karpathys LLM Wiki-Konzept](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
>
> **Obsidian-offizielle Bewertung 95/100** | Native Unterstützung für 10 Sprachen | Aktiv gepflegt, kontinuierlich weiterentwickelt

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | **Deutsch** | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | [Italiano](README_IT.md)

[Offizielle Website](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback & Diskussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Codebasis mit DeepWiki erkunden](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

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
  - [⚡ Was ist neu in v1.22.0](#-was-ist-neu-in-v1220)
    - [v1.22.1 — 2026-06-24 (PATCH)](#v1221--2026-06-24-patch)
    - [v1.22.2 — 2026-06-26 (PATCH)](#v1222--2026-06-26-patch)
    - [v1.22.3 — 2026-06-26 (PATCH)](#v1223--2026-06-26-patch)
    - [v1.22.4 — 2026-06-27 (PATCH)](#v1224--2026-06-27-patch)
    - [v1.22.5 — 2026-06-29 (PATCH)](#v1225--2026-06-29-patch)
  - [✨ Funktionen](#-funktionen)
    - [📊 Knowledge Quality](#-knowledge-quality)
    - [🛠️ Maintenance](#️-maintenance)
    - [💬 Query \& Feedback](#-query--feedback)
    - [🌐 LLM \& Language](#-llm--language)
    - [🏗️ Architecture \& Performance](#️-architecture--performance)
    - [🔒 Datenschutz \& Sicherheit](#-datenschutz--sicherheit)
  - [⌨️ Befehle](#️-befehle)
  - [📖 Beispiel](#-beispiel)
  - [🤖 Modellempfehlungen](#-modellempfehlungen)
  - [🏗️ Architektur](#️-architektur)
  - [❓ FAQ](#-faq)
    - [💡 Allgemein](#-allgemein)
    - [🏷️ Aliase \& Duplikate](#️-aliase--duplikate)
    - [⚡ Leistung \& Kosten](#-leistung--kosten)
    - [🧹 Wartung](#-wartung)
    - [🔍 Fehlerbehebung](#-fehlerbehebung)
  - [🔒 Transparenz \& Compliance](#-transparenz--compliance)
  - [💖 Projekt unterstützen](#-projekt-unterstützen)
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
| **📥 Einzelne Quelle aufnehmen** | `Cmd+P` → "Ingest single source" — wähle eine Note, um Entities und Concepts zu extrahieren |
| **📂 Aus Ordner aufnehmen** | `Cmd+P` → "Ingest from folder" — wähle einen Ordner, um Wiki im Batch zu generieren |
| **🔍 Wiki anfragen** | `Cmd+P` → "Query wiki" — stelle Fragen und erhalte Streaming-Antworten |
| **🛠️ Wiki prüfen** | `Cmd+P` → "Lint wiki" — Health Scan: Duplikate, tote Links, leere Seiten, Orphans |
| **📋 Index neu generieren** | `Cmd+P` → "Regenerate index" — erstelle `wiki/index.md` neu |
| **🎯 Ein-Klick-Aufnahme** | Klicke auf das Seitenleisten-Symbol oder `Cmd+P` → "Ingest current file" |

![Befehlspalette — "karpa" suchen, um alle Karpathy LLM Wiki Befehle zu sehen](assets/command-panel.png)

### ⚠️ Upgrade von einer älteren Version?

**Dieses Release ist vollständig abwärtskompatibel.** Keine Breaking Changes seit v1.0.0.

**Upgrade auf v1.20.3 von einer beliebigen früheren Version**: Quellseiten-Slugs erhalten jetzt einen Fingerabdruck (jedes `sources/<slug>.md` wird zu `sources/<Basisname>_<6 hex>.md`). Beim nächsten Ingest werden bestehende `sources/`-Seiten direkt umbenannt, und alle `[[sources/<slug>]]`-Backlinks werden automatisch aktualisiert — keine Aktion erforderlich, aber die Dateiumbenennung kann kurz im Obsidian-Dateiexplorer erscheinen. Wenn du externe Skripte oder Lesezeichen hast, die direkt auf `sources/<slug>.md`-Pfade verweisen, aktualisiere diese auf die neuen Pfade mit Fingerabdruck.

**Bei einem Upgrade von einer Version vor v1.16.0**, führe einmal **Lint Wiki** aus, um historische Probleme automatisch zu beheben.

**Für Wikis, die über viele Versionen aufgebaut wurden:**

**1️⃣ Index neu aufbauen** — `Cmd+P` → "Regenerate index"

**2️⃣ Lint Wiki ausführen** — `Cmd+P` → "Lint wiki" — Scannt auf fehlende Aliases, Duplikate, tote Links, Orphans

**3️⃣ Smart Fix All verwenden** — Ein-Klick-Reparatur im Lint-Bericht

**4️⃣ Parallele Seitengenerierung aktivieren** — Einstellungen → Page Generation Concurrency: 3, Batch Delay: 300ms

**5️⃣ Aktuelle Einstellungen prüfen** — Wiki Output Language, Extraction Granularity, Auto-Maintenance

---

## ⚡ Was ist neu in v1.22.0

v1.22.0 ist ein **MINOR-Feature-Release**, das ein lang erwartetes One-Click-Schema-Update-Workflow, Traditionelles Chinesisch als 10. Sprache und eine verbesserte Ingest-Statusleiste liefert.

- **📝 Schema-One-Click-Apply (Issue #97).** LLM-generierte Schema-Vorschläge werden jetzt in einem IDE-Stil-Dual-Pane-Diff-Modal angezeigt, mit Anwenden/Abbrechen/Datei-öffnen-Schaltflächen. Beim Anwenden wird das vorherige Schema automatisch gesichert (rotierend, max. 3 Backups) bevor die neue Version geschrieben wird. „Schema aktualisieren" ist jetzt über das Lint-Modal erreichbar — der Befehlspalette-Eintrag wurde entfernt, um einen einzigen Einstiegspunkt zu erzwingen.
- **🏷️ Schema-Dynamische-Tag-Synchronisation.** Das Schema-Vokabular ist jetzt die Single Source of Truth — aktive Tags werden automatisch in jeden LLM-Aufruf injiziert, wodurch der „Schema-Template wird von hartcodierten Sektionen überschrieben"-Bug aus v1.21.0 Phase 1 eliminiert wird.
- **🇹🇼 Traditionelles Chinesisch (zh-TW).** Plugin-UI und Wiki-Ausgabe unterstützen jetzt Traditionelles Chinesisch als 10. Sprache. Die bidirektionale Paritätsprüfung wurde auf alle 10 Sprachen erweitert.
- **📊 Ingest-Statusleiste mit Dokumentenname (PR #189).** Die Statusleiste zeigt jetzt den aktuellen Dokumentennamen (`My Note · Aufnahme läuft...`) und den Stapelfortschritt bei Ordner-Importen (`[4/10] My Note · Aufnahme läuft...`). Beitrag von @YounianC.

Wir empfehlen dringend ein Upgrade — das Schema-One-Click-Apply-Feature macht die Schema-Verfeinerung zu einem Ein-Schritt-Vorgang, und die Traditionell-Chinesisch-Sprache verbessert die Erfahrung für zh-TW-Nutzer erheblich.

Details unter [CHANGELOG.md](../CHANGELOG.md).

### v1.22.1 — 2026-06-24 (PATCH)

Ein fokussierter PATCH, der drei P0-Bugs schließt und eine UX-Verbesserung bringt.

- **🛡️ Fix Dead Links erzeugt keine fabrizierten AI-Stub-Seiten mehr (#197).** Wenn `fixDeadLink` einen Dead Link nicht auflösen konnte, wurde ein Stub angelegt und `fillEmptyPage()` aufgerufen — das LLM erfand Alias-Behauptungen und Related-Link-Ziele ohne Quellinhalt. Stubs sind jetzt ehrliche Platzhalter mit `generation_complete: false`-Markierung, sodass #170 incomplete-cleaner sie erkennt. Ein echter zukünftiger Ingest füllt sie über den regulären gated Pfad.
- **✅ „Schnellkorrekturen beim Start"-Schalter bleibt gesetzt (#199).** Eine v1.18.3-Migration hat `startupCheck: false → true` bei jedem Plugin-Load erzwungen und die explizite Wahl des Nutzers stillschweigend zurückgesetzt. Migration entfernt; verbleibende Migrationen in die Pure-Function `applySettingsMigrations()` in `core/settings-migrations.ts` extrahiert.
- **🎨 CSS-`:has()`-Review-Warnung behoben.** `.modal:has(.llm-wiki-schema-diff-modal)` durch direkten Klassen-Selektor ersetzt. Neues `scripts/css-lint.mjs` Multi-Rule-Lint fängt `!important` + `:has()` zur Regressions-Prävention.
- **🪟 Query Wiki ist jetzt ein Copilot-artiges rechts angedocktes Seitenpanel (#196, @YounianC).** `QueryModal extends Modal` wurde zu `QueryView extends ItemView` — die Konversation kann neben deinen Notizen geöffnet bleiben statt als Popup zu unterbrechen. Alle Funktionalität bleibt unverändert.
- **🧹 Related-Link-Präfix deterministisch neu gesetzt (#200, @DocTpoint, #187).** Neue Pure-Function `correctRelatedLinkPrefixes()` korrigiert das LLM-`sources/`-Default nach der Generierung. Section-scoped, sodass legitime `[[sources/<slug>]]`-Zitate in *Mentions in Source* nie umgeschrieben werden.

### v1.22.2 — 2026-06-26 (PATCH)

Dieses PATCH verbessert die Auto-Ingest-UX, lokalisiert das Betriebsprotokoll und entfernt toten Code.

- **📋 Auto-Ingest blockiert nicht mehr mit einem Modal (Issue #204).** Der Watch-Mode-Auto-Ingest zeigt standardmäßig einen transienten Hinweis an, statt das vollständige Ingest Report Modal zu öffnen. Benutzer, die den detaillierten Bericht bevorzugen, können in den Einstellungen → Auto Maintenance → Watch Mode auf "Modal" umschalten. Das Betriebsverlauf-Panel und `log.md` stehen jederzeit zur Ansicht zur Verfügung.
- **🔧 Auto Smart Fix Modal → transienter Hinweis.**
- **🌐 Betriebsprotokoll jetzt i18n (10 Sprachen).** Neuanlage von `log.md` (oder beim nächsten Start für bestehende Wikis) erhält einen automatisch migrierten Header.
- **📅 Periodische Prüfung: "Stündlich" entfernt, "Monatlich" hinzugefügt.**
- **🧹 Toter Code entfernt.**
- **♻️ Automatische Migration des Log-Headers.**

### v1.22.3 — 2026-06-26 (PATCH)

Ein gezielter Hotfix, der den v1.22.2-Log-Header-Mechanismus absichert und Frontmatter-Verschmutzung auf Nicht-Content-Dateien verhindert.

- **🔧 Log-Header-Erkennung jetzt sprachunabhängig und robust.** Umgestellt von textbasierter Erkennung (die für DE/JA/KO/etc. nicht funktionierte und durch natürliche Log-Eintrag-Inhalte in die Irre geführt werden konnte) auf einen strukturellen `<!-- llm-wiki-log-header-start -->` HTML-Kommentar-Marker im Header. Bestehende v1.22.2-Log-Dateien werden beim nächsten Start automatisch aktualisiert.
- **🧹 Log-Header-Strings in `src/texts/<lang>.ts` konsolidiert.** Die vier lokalisierten Header-Strings, die zuvor in `core/log-header.ts` dupliziert waren, leben jetzt zusammen mit allen anderen UI-Strings — Übersetzer und Paritätstests erfassen sie automatisch.
- **🚫 `generation_complete` wird nicht mehr in `log.md` / `index.md` / `schema/` geschrieben.** `createOrUpdateFile` rief zuvor `markPageComplete` für **jede** Schreiboperation auf, was bei Dateien ohne Frontmatter einen neuen Frontmatter-Block mit `generation_complete: true` voranstellte — sichtbare Verschmutzung des log.md-Body. Neue `isInWikiContentFolder()`-Wache beschränkt den Stempel auf `wiki/{entities,concepts,sources}/...`.

Upgrade empfohlen — log.md sammelt bei Quick-Fix-Läufen keine Streu-Frontmatter mehr, und die Erkennung funktioniert in jeder Sprache ohne sprachspezifische Sonderfälle.

### v1.22.4 — 2026-06-27 (PATCH)

Ein gezielter PATCH, der die GPT-5.x-Kompatibilität wiederherstellt, echte Provider-Fehlermeldungen an die Test-Connection-UI weiterleitet und Lint-Leistungsregler zentralisiert.

- **🛡️ GPT-5.x-Modelle schlagen den Test Connection nicht mehr mit 400 fehl (Issue #207).** Die hartcodierte `params.model.startsWith('gpt-5-')`-Präfix-Heuristik aus v1.20.0 erkannte nur die mit Bindestrich versehene OpenAI-gpt-5-Familie (`gpt-5-mini`, `gpt-5-nano` etc.) und fiel bei jeder neuen gpt-5.x-Veröffentlichung (`gpt-5.1`, `gpt-5.4-mini`, `gpt-5.5`) stillschweigend aus. Ersetzt durch einen Runtime-Probe-und-Cache-Mechanismus: Erste Anfrage nutzt `max_tokens`. Lehnt das Backend mit 400 ab, cachen wir den alternativen Schlüssel (`max_completion_tokens` oder umgekehrt) und versuchen es erneut. Folgeanfragen verwenden den Cache — kein Präfix-Matching auf Modellnamen mehr, und die Probe geht mit jeder neuen OpenAI-Benennung sauber um.
- **📜 Echte Provider-Fehlermeldungen erreichen jetzt die Test-Connection-UI.** Zuvor wurden `requestUrl`-Fehler als `status 400: ${data.error.message}` neu verpackt (oder einfach "status 400", wenn der Response-Body verloren ging) — die tatsächliche Provider-Fehlermeldung wie „Invalid parameter: max_tokens should be max_completion_tokens" war für den Benutzer nie sichtbar. Das neue `extractProviderErrorMessage()` reichert den geworfenen Fehler an, sodass der Benutzer umsetzbare Provider-Details sieht statt eines generischen HTTP-Status.
- **♻️ Lint-Leistungsregler in `src/constants.ts` zentralisiert.** Yield-Kadenzen (`LINT_YIELD_EVERY_OUTER` / `_PHASE1` / `_COMPARISON`), Kandidaten-Batch-Größen (`LINT_CANDIDATE_TOKEN_ESTIMATE`, `LINT_MAX_INPUT_TOKENS`, `LINT_DEDUP_BATCH_SIZE`), Prep-Batch-Lesevorgang (`LINT_PREP_BATCH_READ`) und Source-Analyzer-Batch-Größen (`SHORT_CONTENT_THRESHOLD`, `BATCH_CHARS_PER_ITEM`) leben jetzt an einer Stelle. Zuvor waren diese Werte über `controller.ts`, `duplicate-detection.ts`, `preparation.ts` und `batch-limits.ts` dupliziert oder auseinandergelaufen — inklusive einer wortwörtlichen `MAX_TOKENS=16000`-Kopie von `MAX_TOKENS_BATCH`. Lint-Leistungs-Tuning ist jetzt eine einzelne Dateiänderung.

Upgrade empfohlen — gpt-5.x-Modelle funktionieren sofort wieder, und die Test-Connection-UI sagt Ihnen genau, was der Provider abgelehnt hat, damit Sie baseUrl / Modellname / API-Key nicht mehr in der Konsole suchen müssen.

### v1.22.5 — 2026-06-29 (PATCH)

Ein gezielter PATCH, der verhindert, dass die OpenAI-Reasoning-Modellfamilie (gpt-5.1+ / gpt-5.5 / o1-o4) im Test Connection mit 400 fehlschlägt (Issue #207-Folgefix), und der die echten Provider-Fehlermeldungen in die Test-Connection-Notice überträgt.

- **🛡️ Reasoning-Modellfamilie nutzt jetzt die OpenAI Responses API (Issue #207-Folgefix).** Der `max_tokens` ↔ `max_completion_tokens`-Probe-und-Cache-Fix in v1.22.4 war notwendig, aber nicht ausreichend — `gpt-5.1-chat-latest`, `gpt-5.5` und die `o1` / `o3` / `o4-mini`-Reasoning-Familien schlugen im Test Connection weiterhin mit 400 fehl, weil der Chat-Completions-Endpunkt Kompatibilitätsprobleme mit der Reasoning-Familie hat. Laut OpenAIs offiziellem GPT-5.5-Migrationsleitfaden („GPT-5.5 works best in the Responses API") routet v1.22.5 die Reasoning-Familie auf `/v1/responses` mit `reasoning: { effort: 'low' }`. `gpt-5-chat-latest`, `gpt-4.1`, `gpt-3.5-turbo` und alle Nicht-OpenAI-baseUrls (Ollama, LM Studio, DeepSeek usw.) bleiben unverändert auf `/v1/chat/completions`. Die Erkennung ist eine reine Funktion `isResponsesApiModel(model, baseUrl)`, die nur bei `https://api.openai.com/v1` aktiv wird — benutzerdefinierte Endpunkte bleiben vollständig kompatibel.
- **📜 Provider-Fehler-Body erreicht jetzt die Test-Connection-Notice-UI.** Obsidians `requestUrl` wirft bei 4xx (einschließlich 429), OHNE den Provider-Antwort-Body an das Error-Objekt anzuhängen — daher konnte auch v1.22.4s `extractProviderErrorMessage()` nicht sehen, was OpenAI tatsächlich sagte. v1.22.5 umschließt die fehlgeschlagene Anfrage mit einem `window.fetch`-Re-Fetch (5-Sekunden-Timeout) und führt den Provider-Body in die geworfene `Error.message` ein, sodass Benutzer `"status 429: You exceeded your current quota, please check your plan and billing details"` sehen statt nur `"status 429"`. Der Roh-Body wird außerdem auf `console.warn`-Ebene für DevTools-Untersuchungen ausgegeben. Nicht-OpenAI-baseUrls erhalten die gleiche Anreicherung über den bestehenden Chat-Completions-Pfad.
- **⏱️ 429/5xx-Rate-Limit-Fehler werden im Responses-API-Pfad mit exponentiellem Backoff wiederholt.** v1.22.4s `withRetry` (3 Versuche, 1s/2s/4s + Jitter) deckte ursprünglich nur den Chat-Completions-Pfad ab. v1.22.5 umschließt den neuen Responses-API-Pfad mit demselben `withRetry`, sodass transiente 429-Quoten-Ausschläge den Test Connection nicht mehr sofort fehlschlagen lassen.
- **♻️ Test-Fixtures aktualisiert.** Bestehende Tests für die Dot-Naming-gpt-5.x-Regression (v1.22.4) und den `thinking.type='disabled'`-Chat-Completions-Pfad (Legacy) verwenden nun `gpt-5-mini` / `gpt-5-nano` / `gpt-4.1` — diese Modelle decken weiterhin den Chat-Completions-Pfad ab, während die Reasoning-Familie vollständig durch die neue `src/__tests__/root/llm-client-responses-api.test.ts` (28 Tests) abgedeckt ist.

Upgrade empfohlen — `gpt-5.1-chat-latest`, `gpt-5.5` und die `o1` / `o3` / `o4-mini`-Familien funktionieren jetzt sofort im Test Connection, und bei einem Verbindungsfehler wird der tatsächliche Provider-Fehler (z. B. „insufficient_quota") angezeigt statt nur ein HTTP-Statuscode.

Upgrade empfohlenUpgrade empfohlen — die Stub-Fabrikations-Klasse ist geschlossen und das Query-Wiki-Seitenpanel hält deine Notizen sichtbar.

## ✨ Funktionen

### 📊 Knowledge Quality

- **🔍 Entity/Concept Extraction** — LLM extrahiert Entities (Personen, Orgs, Produkte, Events) und Concepts (Theorien, Methoden, Terme) aus Notizen mit flexibler Extraktionsgranularität (Minimal~5 Einträge, Groß~10, Standard~50, Fein~100, Benutzerdefiniert 1–300) für Balance zwischen Analyse-Tiefe und API-Kosten
- **🏷️ Mandatory Page Aliases** — Jede generierte Page enthält mindestens einen Alias (Übersetzung, Akronym, alternativer Name); ermöglicht Cross-Language Duplikat-Detection
- **🔄 Duplicate Detection & Merge** — Semantic Tiering erfasst echte Duplikate (Cross-Language-Übersetzungen, Abkürzungen, Schreibvarianten); intelligentes LLM Merge fusioniert Content und bewahrt Aliases
- **🧩 Smart Knowledge Fusion** — Multi-Source Updates mergen neue Info ohne Redundanz, Widersprüche werden mit Attribution bewahrt, `reviewed: true` Pages sind vor Überschreibung geschützt
- **📏 Content Truncation Protection** — 8000 max_tokens mit automatischer stop_reason-Detection und Retry bei 2× tokens über alle Providers
- **📝 Verbatim Source Mentions** — Original-Language-Quotes mit optionaler Übersetzung für Nachvollziehbarkeit bewahren

- **🎨 Anpassbares Tag-Vokabular (v1.18.0).** Einstellungen → Wiki → Tag-Vokabular-Modus → *Custom* erlaubt es, eigene Entity- und Concept-Tag-Listen zu definieren (z. B. `Medical_Arzneimittel`, `法规`). Das Plugin respektiert dein Vokabular in Extraction-Prompts und Frontmatter-Validierung; die bestehende Lint-Audit (Issue #85 v7) meldet jede Seite, deren Tags außerhalb des aktiven Vokabulars liegen.

### 🛠️ Maintenance

- **🔍 Lint Health Scan** — Duplikate, tote Links, leere Pages, Orphans, fehlende Aliases und Widersprüche in einem umfassenden Report erkennen
- **🎯 Semantic-Tier Duplicate Detection** — Tier 1 (direkte Name-Matches: Cross-Language, Abkürzungen, hochähnliche Titel) immer verifiziert; Tier 2 (indirekte Signale: gemeinsame Links, moderate Ähnlichkeit) füllt Token-Budget
- **⚡ Smart Fix All** — Kausal geordneter Batch-Fix: Duplikate mergen → tote Links auflösen → Orphans verlinken → leere Pages erweitern
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
- **🌐 Wiki Output Language** — Interface-unabhängige 9 Sprachen (Englisch/Chinesisch/Japanisch/Koreanisch/Deutsch/Französisch/Spanisch/Portugiesisch/Italienisch), Custom Input unterstützt
- **🌍 Fullständige UI-Internationalisierung** — Plugin UI unterstützt 9 Sprachen (EN/ZH/JA/KO/DE/FR/ES/PT/IT), 269+ UI-Felder vollständig übersetzt, natürliche lokale Ausdrücke
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

## ⌨️ Befehle

| Befehl | Beschreibung |
|---------|-------------|
| **📥 Einzelne Quelle aufnehmen** | Einzelne Note auswählen → Wiki-Pages mit Entities, Concepts und Summary generieren |
| **📂 Aus Ordner aufnehmen** | Beliebigen Ordner auswählen → Wiki aus bestehenden Notizen im Batch generieren |
| **🔍 Wiki anfragen** | Konversationelles Q&A mit Streaming Output und `[[wiki-links]]` |
| **🛠️ Wiki prüfen** | Vollständiger Health Scan: Duplikate, tote Links, leere Pages, Orphans, fehlende Aliases, Widersprüche |
| **📋 Index neu generieren** | `wiki/index.md` manuell neu aufbauen |
| **📊 Aufnahmeverlauf anzeigen (v1.21.0)** | Vergangene Ingests, Lint-Berichte und Wartungsläufe in durchsuchbarer, filterbarer UI durchsuchen |

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
main.ts              # 🔌 Plugin-Einstiegspunkt
wiki/                # Wiki-Engine-Module
  wiki-engine.ts     # 🎯 Orchestrator
  query-engine.ts    # 💬 Conversationelle Abfrage
  source-analyzer.ts # 📊 Iterative Batch-Extraktion
  page-factory.ts    # 🏗️ Entity/Concept CRUD + Merge
  conversation-ingest.ts # 📥 Chat → Wiki-Wissen
  contradictions.ts  # ⚠️ Widerspruchs-Erkennung
  system-prompts.ts  # 🗣️ Sprach-Direktive + Sektions-Labels
  lint/              # Lint-Submodule
    controller.ts        # 🔍 Lint-Orchestrierung
    fix-runners.ts       # ⚡ Batch-Fix-Ausführungshilfen
    scanners.ts          # 🔍 Scanners (dead links, orphans, aliases, Belegprüfung)
    duplicate-detection.ts # 🔄 Programmatische Kandidatengenerierung
    report-builder.ts    # 📋 Pure-Function-Report-Builder
    phases/              # Phasenweise Lint-Ausführung
  prompts/           # LLM-Prompt-Templates nach Domäne
schema/              # Schema Co-Evolution
  manager.ts         # 📋 Schema CRUD + Suggestions
  auto-maintain.ts   # 🔄 File Watcher + Periodischer Lint + Startup Quick Fixes
  analyze.ts         # 📊 Schema-Analyse mit Abbruch-Verdrahtung
ui/                  # User Interface
  settings.ts        # ⚙️ Settings Panel
  modals.ts          # 📦 Lint / Ingest / Query / History Modals
core/                # 🧩 Pure Function Modules (Zero IO, voll testbar)
  i18n, slug, json, frontmatter, tag-vocab, sources-normalizer, ...
+ Geteilt: llm-client.ts, llm-client-wrapper.ts, texts.ts, prompts.ts, types.ts
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
Obsidian v1.11.0+, Desktop (Windows/macOS/Linux), ein API-Key eines LLM-Providers. Ollama funktioniert lokal ohne API-Key. Siehe [LLM-Provider konfigurieren](#-llm-provider-konfigurieren) oben.

**Welches Modell sollte ich wählen?**
Siehe [Modellempfehlungen](#-modellempfehlungen) oben. Modelle mit langem Kontext werden empfohlen — je größer Ihr Wiki, desto mehr Kontext benötigt der LLM.

### 🏷️ Aliase & Duplikate

**Warum zeigt Lint bei fast all meinen Seiten "fehlende Aliases" an?**
Seiten, die vor v1.7.11 generiert wurden, enthielten keine Aliases. Das ist normal und harmlos — Aliases sind eine Verbesserung, keine Voraussetzung. Klicken Sie im Lint-Report auf **"Complete Aliases"**, damit der LLM Übersetzungen, Akronyme und alternative Namen für alle fehlenden Seiten in einem Batch generiert. Sobald Aliases vorhanden sind, werden die Duplikaterkennung und die Alias-basierte Suche deutlich effektiver.

**Warum sehe ich doppelte Seiten mit ähnlichen Namen (z. B. "CoT" und "Chain-of-Thought")?**
Ältere Versionen (vor v1.7.10) hatten keine Alias-basierte Duplikaterkennung. Führen Sie **Lint Wiki** aus — wenn Duplikate gefunden werden, klicken Sie **"Merge Duplicates"**, um sie zu verschmelzen. Die zusammengeführte Seite behält Aliases von beiden und verhindert so zukünftige Duplikate.

**Wie funktioniert die Duplikaterkennung? (v1.7.10+)**
Zweistufige semantische Erkennung: Stufe 1 (immer LLM-verifiziert) erkennt sprachübergreifende Übereinstimmungen, Abkürzungen, Titel mit hoher Ähnlichkeit. Stufe 2 füllt das verbleibende Token-Budget mit Kandidaten mittlerer Ähnlichkeit.

**Was sind "verschmutzte Seiten"? (v1.9.0)**
Seiten mit versehentlich in den Dateinamen eingebauten Ordner-Präfixen — z. B. `concepts/conceptsLayoutOptimierung.md`. Führen Sie **Lint Wiki** → **🧹 Fix Polluted Pages** aus, um sie umzubenennen und alle eingehenden Links zu aktualisieren.

### ⚡ Leistung & Kosten

**Wie kann ich die Ingestion beschleunigen?**
In **Einstellungen → LLM-Konfiguration**: **Page Generation Concurrency** auf 3–5 erhöhen (parallele Seitenerstellung), **Batch Delay** auf 100–300 ms senken (auf Rate-Limits achten). Wählen Sie **Extraktionsgranularität** "Minimal", "Grob" oder "Standard", um die Seitenanzahl zu reduzieren und API-Kosten zu sparen.

**Warum erhalte ich HTTP 429-Fehler?**
Das Plugin erkennt Rate-Limiting automatisch und schlägt vor: Concurrency auf 1–2 senken, Batch Delay auf 500–800 ms erhöhen, oder zu einem Provider mit höheren Limits wechseln.

**Wie kontrolliere ich die API-Kosten?**
- Auto-Maintenance ist standardmäßig AUS — nur aktivieren, wenn Hintergrundverarbeitung benötigt wird
- Smart Batch Skip überspringt automatisch bereits verarbeitete Dateien
- Granularität "Standard" oder "Coarse" = weniger LLM-Aufrufe
- Batch Delay > 500 ms verteilt Aufrufe, ohne den Token-Verbrauch zu erhöhen
- Lint-Bericht zeigt Anzahlen vor der Ausführung von Fixes — entscheiden Sie, was es wert ist

### 🧹 Wartung

**Was macht "Smart Fix All"?**
Führt Fixes in kausaler Reihenfolge aus (v1.9.0+):
1. 🧹 Verschmutzte Seiten reparieren → 2. 🏷️ Aliase vervollständigen → 3. 🔄 Duplikate zusammenführen → 4. 🔗 Tote Links reparieren → 5. 🔗 Verwaiste Seiten verlinken → 6. 📝 Leere Seiten erweitern

**Das Plugin friert bei Lint auf einem großen Wiki ein. Was ist los?**
Dies war ein bekanntes Problem, das in v1.7.15 und v1.7.17 behoben wurde. Aktualisieren Sie auf die neueste Version — das Lint-System enthält jetzt asynchrone Yield-Points, die die Kontrolle alle 50 Seiten und alle 500 Vergleiche an den UI-Thread zurückgeben. Dies verhindert die 10–40 Sekunden langen Freezes bei Wikis mit 1200+ Seiten.

### 🔍 Fehlerbehebung

**Warum kann ich nach der Installation keine Funktionen nutzen?**
Das Plugin erfordert einen erfolgreichen Verbindungstest, bevor Kernfunktionen freigeschaltet werden. Gehen Sie zu **Einstellungen → Karpathy LLM Wiki** → Provider wählen → API-Key eingeben → **Fetch Models** → Modell wählen → **Test Connection**. Sobald die grüne "LLM Ready"-Anzeige erscheint, sind alle Funktionen verfügbar. Dies verhindert stille Fehler bei falsch konfigurierten Providern.

**Wie breche ich eine laufende Aufnahme/Lint ab?**
Klicken Sie auf den Statusleisten-Text während einer Operation (zeigt "Aufnahme läuft... klicken zum Abbrechen"), oder verwenden Sie `Ctrl+P` → "Cancel current ingestion". Die Operation stoppt sauber an der nächsten Batch-Grenze und bewahrt alle abgeschlossenen Arbeiten.

**Wie nehme ich die Datei, die ich gerade bearbeite, schnell auf?**
Klicken Sie auf das `sticker`-Symbol in der linken Ribbon-Leiste, oder verwenden Sie `Ctrl+P` → "Ingest current file". Dies überspringt die Dateiauswahl und nimmt direkt den aktiven Editor-Tab auf.

**Doppelte Klammern [[[[...]]]] in log.md — wie beheben?**
Führen Sie **Lint Wiki** aus — der Scanner erkennt und behebt automatisch alle doppelt verschachtelten Wiki-Links im gesamten Wiki-Verzeichnis (einschließlich log.md) ohne LLM-Kosten. Kein manuelles Aufräumen erforderlich.

**Warum erhalte ich "Overloaded"-Fehler?**
Das Plugin erkennt nun den 529-Overload-Fehler von Anthropic als wiederholbar. Overload-Fehler werden automatisch mit exponentiellem Backoff über alle Provider wiederholt.

**Warum wurde ein doppelter Stub erstellt, obwohl die Seite bereits in entities/ oder concepts/ existiert?**
Das Plugin verwendet nun Slug-basiertes Matching — verschiedene Formatierungen desselben Namens werden auf die bestehende Seite aufgelöst, statt einen doppelten Stub zu erstellen.

**Query findet Seiten nicht, von denen ich weiß, dass sie existieren?**
Drei häufige Ursachen: (1) Index veraltet → **Regenerate index**. (2) Fehlende Aliase → **Complete Aliases**. (3) Anders formulieren — LLM macht semantisches Matching, keine Stichwortsuche.

**Kann ich Wiki-Seiten manuell bearbeiten?**
Ja. Setzen Sie `reviewed: true` im Frontmatter, um vor Überschreibung zu schützen. Manuelle Aliase, Tags und Sources bleiben bei Zusammenführungen erhalten.

**Sicheres Upgrade?**
Das Plugin ändert niemals Ihre Quelldateien. Backup von `wiki/` → Plugin aktualisieren → **Regenerate index** → **Lint Wiki** → selektiv reparieren.

**Mein lokales Modell (Ollama, LM Studio) erfindet seltsame Entity-Namen aus leeren oder nur-Frontmatter-Notizen. (v1.21.0)**
In v1.21.0 durch das Pre-Ingest Requirements Gate behoben: leere/Whitespace/nur-Frontmatter-Notizen werden *vor* jedem LLM-Aufruf abgelehnt, und Content-Hash-Dedup erkennt identische Dateien über Pfade hinweg. Upgrade auf v1.21.0+ stoppt die Empty-File-Halluzination-Klasse von Bugs (kleine Modelle, die bei leerem Prompt erfundene Entity-Namen ausfüllen).

**Meine `sources/`-Dateien wurden nach dem Upgrade auf v1.20.3 umbenannt — ist das ein Fehler? (v1.20.3+)**
Nein — das ist der neue kollisionssichere Quell-Slug-Fingerabdruck in Aktion. Jedes `sources/<slug>.md` ist jetzt `sources/<Basisname>_<6 hex>.md` (das Hex ist ein FNV-1a-Hash des vollständigen Dateipfads). Dateien mit gleichem Basisnamen in verschiedenen Ordnern (z. B. 11× `About this course.md` in Academy-Kursen) kollidieren nicht mehr. Ein erneuter Ingest benennt bestehende `sources/`-Seiten direkt um, und alle `[[sources/<slug>]]`-Backlinks werden automatisch aktualisiert. Wenn du externe Skripte oder Lesezeichen hast, die auf `sources/<alter-slug>.md` zeigen, aktualisiere diese auf die neuen Pfade mit Fingerabdruck.

**Überschreibt ein Re-Ingest einer unrelated Notiz eine mit `reviewed: true` gesperrte Seite? (v1.20.3+)**
Nein — Stage 4 (`updateRelatedPage`) respektiert jetzt `reviewed: true` und leitet auf den append-only-Pfad weiter, genau wie der Ingest-Pfad. Dein kuratierter Text bleibt wörtlich erhalten; nur wirklich neue Inhalte werden angehängt.

**Wo bekomme ich Hilfe?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — Fehlerberichte
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — Fragen & Feedback

**Wie sammle ich Debug-Logs für die Fehlerbehebung?**

1. Entwicklertools öffnen (`Ctrl+Shift+I` / `Cmd+Option+I`)
2. Zum **Console**-Tab wechseln
3. Operation ausführen (Ingest, Query oder Lint)
4. Nachrichten mit Modulnamens-Präfixen wie `[Step]`, `[LLM]`, Modulnamen suchen
5. Für lokale Tests `pnpm build:dev` statt `pnpm build` verwenden, um die volle Debug-Ausgabe zu erhalten
6. Relevante Log-Zeilen kopieren und in den GitHub-Issue einfügen — das beschleunigt die Bug-Diagnose erheblich

---

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

Sponsoring ist völlig freiwillig. Das Plugin bleibt MIT-lizenziert und vollständig funktionsfähig.

### Sponsoren

Dank an die folgenden Personen für die Unterstützung des Projekts:

- [@jameses-cyber](https://github.com/jameses-cyber)

## 📜 License

MIT License — siehe [LICENSE](LICENSE).

## 🙏 Danksagungen

- **💡 Konzept:** [Andrej Karpathys LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — die ursprüngliche Vision, die dieses Plugin inspiriert hat
- **🛠️ Plattform:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM-Transport:** [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=top-left)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=top-left)

---

**Official Site:** [llmwiki.greenerai.top](https://llmwiki.greenerai.top/)
