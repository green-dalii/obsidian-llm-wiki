![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin per Obsidian

> Un plugin Obsidian che trasforma le tue note in una base di conoscenza connessa e interrogabile — il concetto di [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), integrato nell'editor dove già scrivi.

> **Recupero su grafo senza embedding • 10 lingue native • Funziona con qualsiasi provider**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | **Italiano**

[Sito ufficiale](https://llmwiki.greenerai.top/) | [Marketplace Obsidian](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Discussioni](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

📑 [Indice](#-indice) • 🚀 [Avvio rapido](#-avvio-rapido) • ✨ [Funzionalità](#-funzionalità) • 🔍 [Come funziona il recupero](#-come-funziona-il-recupero) • 🤖 [Modelli](#-modelli) • ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← Se questo plugin ti è stato utile, offrimi un caffè♥️ o lascia una stella🌟↗

---

## 📑 Indice

- [🤔 Perché questo plugin?](#-perché-questo-plugin)
- [🎯 Fa per me?](#-fa-per-me)
- [🚀 Avvio rapido](#-avvio-rapido)
- [✨ Funzionalità](#-funzionalità)
- [🔍 Come funziona il recupero](#-come-funziona-il-recupero)
- [🤖 Modelli](#-modelli)
- [❓ FAQ](#-faq)
- [🔒 Privacy](#-privacy)
- [💖 Supporto](#-supporto)
- [📜 Licenza e crediti](#-licenza-e-crediti)

---

## 🤔 Perché questo plugin?

Prendi appunti. Loro restano in cartelle. Trovare cosa è collegato a cosa significa ricordare fili che hai dimenticato mesi fa.

**Esistono altre reimplementazioni open-source dell'idea di LLM Wiki di Karpathy — ma nessuna è un plugin Obsidian installabile con un clic.** La maggior parte sono strumenti da riga di comando, skill per Claude Code o app desktop separate. Noi siamo l'unico con interfaccia nativa, archiviazione nel vault e la Graph View integrata di Obsidian.

### Confronto

| | Karpathy LLM Wiki (questo plugin) | nashsu / llm_wiki | SamurAIGPT / llm-wiki-agent | sdyckjq / llm-wiki-skill | atomicstrata / llm-wiki-compiler |
|---|---|---|---|---|---|
| **Forma di distribuzione** | ✅ Plugin Obsidian con un clic | ❌ App desktop Tauri separata | ❌ Skill Claude Code | ❌ Skill Claude Code / Codex | ❌ CLI + SDK + server MCP |
| **Sforzo di configurazione** | ✅ **5 minuti** — Community Plugins → Installa → scegli provider → Ingest | ❌ 30 min+ — compila/scarica binario, configura CLI | ❌ 15 min — richiede abbonamento Claude Code + installazione skill | ❌ 10 min — richiede abbonamento Claude Code / Codex + configurazione skill | ❌ 30 min+ — pip install + SDK + configurazione MCP |
| **Percorso di installazione** | ✅ Obsidian → Community Plugins → cerca → Installa | ❌ Compila o scarica un binario separato, poi configura CLI | ❌ Richiede abbonamento Claude Code + guida all'installazione | ❌ Richiede abbonamento Claude Code o Codex + passaggi di configurazione | ❌ pip install + Python SDK + server locale |
| **Complessità architetturale** | ✅ **Zero dipendenze** — niente DB vettoriale, niente modello di embedding, niente processi esterni | 🟡 Incorpora il proprio runtime Python + sigma.js + sqlite | 🟡 Usa l'ambiente di Claude Code — non autonomo | 🟡 Richiede piattaforma runtime separata | ❌ Richiede Python, modello di embedding, DB vettoriale |
| **i18n (interfaccia + output wiki)** | ✅ 10 lingue (interfaccia / output indipendenti) | 🟡 2 (EN / 中文) | ❌ Solo inglese | ❌ Solo inglese | ❌ Solo inglese |
| **Provider LLM** | ✅ 12+ (incl. Codex OAuth, Bedrock, LM Studio, Ollama, Anthropic-compatibile, Kimi, GLM, MiniMax, DeepSeek) | 🟡 Compatibile OpenAI | 🟡 Abbonamento via Claude Code | 🟡 Abbonamento via Claude Code / Codex | 🟡 Compatibile OpenAI |
| **Algoritmo di recupero** | ✅ Personalized PageRank (Haveliwala 2002) + Monte Carlo (Fogaras 2005) | 🟡 Euristica a 4 segnali (Adamic-Adar + decadimento 2-hop) | ❌ Solo rilevamento comunità Louvain | ❌ Solo Louvain + anteprime k-hop | ❌ Ibrido: BM25 + semantico + wikilink |
| **Pipeline di interrogazione (cascata a 5 stadi)** | ✅ Lex → keyword LLM → scansione sottostringhe → fallback KB LLM → espansione PPR (si interrompe al primo segnale sufficiente) | 🟡 Solo decadimento 2-hop | ❌ Solo clustering Louvain | ❌ Anteprime k-hop (senza augment LLM) | ❌ BM25 + semantico su chunk (senza grafo) |
| **Richiede embedding** | ✅ No (costo embedding zero, per progettazione) | 🟡 Opzionale, disattivato per default | ✅ No | ✅ No | ❌ **Sì — obbligatorio** |
| **Visualizzazione grafo** | ✅ Graph View nativa di Obsidian (integrata, dimensione zero aggiuntiva) | ❌ sigma.js + graphology personalizzati in app desktop | 🟡 vis.js graph.html (file separato) | ❌ sigma.js offline HTML personalizzato | ❌ Visualizzatore browser sola lettura |
| **Onestà del wiki** | ✅ Banner "STADIO FALLBACK" quando nessuna fonte wiki corrisponde alla tua domanda | ❌ Nessun equivalente | ❌ Nessun equivalente | ❌ Nessun equivalente | ❌ Nessun equivalente |
| **Benchmark di recupero pubblicato** | ✅ PPR @5 = 27,1% vs pura kNN 24,1% (unico numero pubblicato in questo spazio) | ❌ 58% → 71% *solo con embedding attivati*, non nel nostro formato mela-mela | ❌ Non pubblicato | ❌ Non pubblicato | ❌ Non pubblicato |

### Tre scelte deliberate, non casuali

- **🪟 Obsidian è il runtime.** Niente terminale, niente app separata, niente Docker, niente Python. Installa da Community Plugins, clicca Ingest, il wiki vive nel tuo vault dal primo secondo. La Graph View nativa di Obsidian renderizza il tuo grafo `[[wiki-link]]` — integrata, dimensione zero aggiuntiva nel bundle.
- **🧭 Pulito e autonomo.** Zero dipendenze. Niente modello di embedding, niente database vettoriale, niente pacchetto pip — un singolo plugin che legge le tue note, parla con un LLM e scrive pagine wiki. Tutto vive dentro Obsidian.
- **🔌 Qualsiasi modello per cui già paghi.** Anthropic, Bedrock, OpenAI, ChatGPT Plan (Codex OAuth), DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter, Anthropic-compatibile, endpoint personalizzato — dodici e più provider, nessuno dei quali deve avere un endpoint per embedding.

---

## 🎯 Fa per me?

**✅ Sì, se:**

- **Vuoi una configurazione da 5 minuti, non un progetto da 5 ore.** Installa da Community Plugins → scegli un provider → Ingest una nota. Niente CLI, niente Python, niente runtime separato, niente DB vettoriale. Vedi le pagine wiki in `wiki/` in pochi secondi.
- **Vuoi qualcosa di pulito e autonomo.** Il plugin ha esattamente zero dipendenze esterne: niente modello di embedding, niente database vettoriale, niente pacchetto pip, niente container Docker. È un singolo plugin Obsidian che legge le tue note, parla con un LLM e scrive pagine wiki nel tuo vault. Tutto vive dentro Obsidian.
- **Vuoi una chat interrogabile che risponda dalle *tue* note** — non da internet — con ogni risposta che porta `[[wiki-link]]` di ritorno nel tuo grafo della conoscenza.
- **Ti importa della sovranità dei dati** — funziona completamente in locale con Ollama o LM Studio, senza mai toccare internet.
- **Scrivi o leggi in una qualsiasi delle 10 lingue supportate** — l'interfaccia e la lingua di output del wiki sono indipendenti (il tuo wiki può essere in cinese mentre l'interfaccia è in inglese).
- **Mantieni il grafo scrivendo `[[wiki-link]]`** — ogni link che scrivi arricchisce già il recupero; nessun passaggio separato di tagging/embedding/indicizzazione.
- **Vuoi manutenzione con un clic** — scansione salute Lint + Smart Fix All tengono sotto controllo duplicati, link morti e pagine orfane senza che tu debba curare a mano.

**❌ No, se:**

- **Vuoi un sostituto generico di ChatGPT** — questo plugin risponde solo dalla *tua* conoscenza.
- **Hai bisogno di una pipeline RAG su PDF / pagine web / corpora esterni** — ci concentriamo sul percorso in-vault (i PDF sono supportati dalla v1.25.0).
- **Cerchi un SaaS ospitato** — non c'è backend, niente server, nessun account.

---

## 🚀 Avvio rapido

1. **Installa.** Obsidian → Impostazioni → Plugin della community → Sfoglia → cerca "Karpathy LLM Wiki" → Installa → Abilita. Oppure visita la [pagina del plugin della community](https://community.obsidian.md/plugins/karpathywiki) e clicca su **Add to Obsidian**.
2. **Configura un provider.** Apri Impostazioni → Karpathy LLM Wiki → scegli un provider (OpenAI, Anthropic, Ollama, ChatGPT Plan (Codex OAuth), ecc.) → inserisci la chiave API (non necessaria per provider locali) → clicca su **Test Connection** → Salva.
3. **Ingerisci una nota.** `Cmd+P/Ctrl+P` → "Ingest single source" → scegli un file Markdown (o PDF, v1.25.0+). Le tue prime pagine wiki appaiono in `wiki/sources/`, `wiki/entities/`, `wiki/concepts/` in pochi secondi.

Questo è tutto. Il plugin non modifica nulla nelle tue note originali — crea solo nuove pagine in `wiki/`. Per chattare con il tuo wiki: `Cmd+P/Ctrl+P` → "Query wiki". (`Cmd` su macOS, `Ctrl` su Windows/Linux.)

### Comandi principali

| Comando | Cosa fa |
|---------|---------|
| **📥 Ingest singola fonte** | `Cmd+P/Ctrl+P` → "Ingest single source" — scegli un file Markdown o **PDF (v1.25.0+)** , ottieni pagine entità/concetto/wiki |
| **📂 Ingest da cartella** | `Cmd+P/Ctrl+P` → "Ingest from folder" — ingest in batch di ogni nota in una cartella, con salto intelligente dei già elaborati |
| **📑 Ingest file multipli** | `Cmd+P/Ctrl+P` → "Ingest multiple files" — seleziona un sottoinsieme tramite albero cartelle a due pannelli (con coda live + annullamento per file) |
| **🔍 Query wiki** | `Cmd+P/Ctrl+P` → "Query wiki" — chatta con il tuo wiki in un pannello laterale ancorato a destra; le risposte portano `[[wiki-link]]` |
| **🛠️ Lint wiki** | `Cmd+P/Ctrl+P` → "Lint wiki" — scansione salute completa: duplicati, link morti, pagine vuote, orfani, alias mancanti, contraddizioni |
| **⚡ Smart Fix All** | dentro il modale Lint — riparazione in ordine causale con un clic e report per fase |
| **📋 Rigenera indice** | `Cmd+P/Ctrl+P` → "Regenerate index" — ricostruisce `wiki/index.md` con pagine e alias correnti |
| **⏹ Annulla** | `Cmd+P/Ctrl+P` → "Cancel current ingestion" o clicca sulla barra di stato — si ferma pulitamente al prossimo limite di lotto |
| **📊 Cronologia ingestioni** | `Cmd+P/Ctrl+P` → "View Ingestion History" — interfaccia ricercabile per ingestioni passate, report lint ed esecuzioni di manutenzione |

| Prima | Dopo |
|-------|------|
| `notes/machine-learning.md` (un file piatto) | `wiki/concepts/supervised-learning.md` con `[[collegamenti bidirezionali]]`, alias, attribuzione della fonte e una voce in `wiki/index.md` |

> 💡 **Resta aggiornato.** Nuove funzionalità, correzioni e miglioramenti delle prestazioni vengono rilasciati frequentemente. Impostazioni → Plugin della community → Verifica aggiornamenti, o abilita l'aggiornamento automatico dei plugin.
> 📖 Guide dettagliate (installazione, configurazione PDF, note multi-provider, aggiornamenti) sono mantenute in [GitHub Discussions → Guides](https://github.com/green-dalii/obsidian-llm-wiki/discussions/categories/guides).

---

## ✨ Funzionalità

### 📚 Qualità della conoscenza

- **🔍 Estrazione di entità e concetti** — l'LLM estrae entità (persone, organizzazioni, prodotti, eventi) e concetti (teorie, metodi, termini) in pagine autonome. La granularità è configurabile (Minima → Fine, più Personalizzata) così da bilanciare costo e profondità.
- **🏷️ Alias obbligatori** — ogni pagina viene creata con almeno un alias (traduzione, abbreviazione, variante) così il rilevamento dei duplicati tra lingue funziona.
- **🔄 Rilevamento duplicati a livelli** — Livello 1 (corrispondenza nome diretta: cross-lingua, abbreviazione, titoli ad alta similarità) sempre verificato; Livello 2 (link condivisi, similarità media) riempie il budget di token rimanente.
- **🧩 Fusione intelligente e stato contraddizioni** — i duplicati vengono uniti preservando gli alias; le contraddizioni vengono segnalate con attribuzione della fonte; le pagine `reviewed: true` sono protette dalla sovrascrittura.
- **🎨 Vocabolario tag personalizzabile** — definisci le tue liste di tag per tipo di entità e concetto in Impostazioni → Wiki → Vocabolario tag → *Personalizzato*; Lint segnala ogni pagina i cui tag cadono fuori dal vocabolario attivo.

### 📄 Ingest PDF (v1.25.0+)

- **🔌 Cancello provider** — Anthropic, OpenAI e Bedrock gestiscono i PDF nativamente. Per qualsiasi altro endpoint compatibile OpenAI/Anthropic, attiva **Force PDF Support** in Impostazioni → Configurazione LLM → Avanzate per consentire al plugin di tentare la chiamata. Per OCR locale su Apple Silicon, estrattori di terze parti (MinerU, Docling, Mathpix, Adobe) e la guida completa all'ingest PDF, vedi [Percorsi OCR PDF](#-percorsi-ocr-pdf) qui sotto e [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md).
- **🗄️ Cache limitata** — `.obsidian/plugins/karpathywiki/pdf-cache/` memorizza il Markdown convertito indicizzato per hash del contenuto + modello + versione del convertitore. Manutenzione a tre livelli di difesa: 100 MB totali / 1000 voci / 10 MB per singola voce con eviction LRU-by-mtime.
- **📝 Sidecar vault opzionale** — Impostazioni → Configurazione Wiki → Cartella Wiki → *Write PDF Markdown to Vault* scrive `<basename>.pdf.md` accanto al PDF sorgente (disattivato per default — solo cache è il default).
- **🛡️ Prompt trascrittore verbatim** — conversione in stile OCR con marcatori anti-allucinazione `[illegible]` / `[figure: ...]`; l'incapsulamento in fence markdown da parte di modelli locali piccoli viene automaticamente pulito prima della scrittura in cache.

### 📄 Percorsi OCR PDF

Tre percorsi, scegli quello adatto alla tua configurazione:

1. **☁️ Provider cloud con supporto PDF nativo** — Anthropic, OpenAI o AWS Bedrock leggono i PDF senza configurazione aggiuntiva. Basta ingerire. Per qualsiasi altro endpoint compatibile OpenAI/Anthropic, attiva **Force PDF Support** in Impostazioni → Configurazione LLM → Avanzate.
2. **🖥️ OCR locale su Apple Silicon** — [oMLX](https://github.com/jundot/omlx) integra Microsoft Markitdown come backend PDF→Markdown integrato. Abilita Markitdown in oMLX, carica [Baidu Unlimited-OCR](https://huggingface.co/baidu/Unlimited-OCR) (3B / 570M-attivi, open-source 2026-06) come modello visivo, punta il plugin a oMLX come provider personalizzato compatibile OpenAI, attiva **Force PDF Support** e scegli il modello multimodale che oMLX sta servendo. Il PDF non lascia mai la tua macchina.
3. **🛠️ Estrattore di terze parti (MinerU, Docling, Mathpix, Adobe)** — esegui un estrattore separato sui tuoi PDF per produrre file `.md`, poi ingeriscili come normali note Markdown tramite la pipeline standard del plugin. Più affidabile per articoli scientifici, documenti scansionati, PDF con molti contenuti matematici.

📖 **Guide complete per tutti e tre i percorsi** (provider cloud, livelli hardware oMLX, installazione MinerU, manutenzione cache) → [docs/PDF-OCR-GUIDE.md](./PDF-OCR-GUIDE.md)

### 💬 Query e manutenzione

- **🧭 Cascata PPR a 5 stadi** — vedi [Come funziona il recupero](#-come-funziona-il-recupero). Personalized PageRank sul grafo `[[wiki-link]]` fornisce contesto multi-hop consapevole del grafo.
- **🪟 Pannello laterale ancorato a destra** — Query Wiki si apre in un leaf laterale destro in stile Copilot (v1.22.1+) invece di un modale centrato.
- **🔍 Scansione salute Lint** — un singolo comando rileva: duplicati, link morti, pagine vuote, orfani, alias mancanti, contraddizioni.
- **⚡ Smart Fix All** — riparazione in ordine causale con un clic: completa alias → unisci duplicati → correggi link morti → collega orfani → espandi pagine vuote, con report per fase.
- **📊 Pannello cronologia operazioni** — interfaccia ricercabile e filtrabile per ingestioni passate, report lint ed esecuzioni di manutenzione.
- **🛡️ Portale di pre-ingest** — le note vuote / solo spazi / solo frontmatter vengono rifiutate prima di qualsiasi chiamata LLM; la deduplicazione per hash del contenuto rileva file identici attraverso i percorsi.

### 🔒 Privacy

- **🚫 Nessun backend, nessun tracciamento, nessuna analisi.** Funziona interamente dentro Obsidian. La rete è usata solo per comunicare con il provider LLM che configuri.
- **📁 I file sorgente sono sola lettura.** Il plugin non modifica mai le tue note originali del vault — crea solo nuove pagine in `wiki/`.
- **🦙 Modalità completamente locale.** Ollama, LM Studio o qualsiasi endpoint locale compatibile OpenAI → le tue note non lasciano mai la tua macchina.
- **🔐 Permessi minimi.** Accesso ai file del vault per la gestione del wiki. Accesso agli appunti solo quando clicchi il pulsante "Copia" nel modale Query.

### 🦙 Locale prima di tutto

- **🖥️ Ollama, LM Studio, OpenRouter, endpoint personalizzato** — pronti all'uso. I modelli locali funzionano per le query (finestre di contesto più piccole); l'ingest su un vault di 2000 pagine di solito richiede un modello cloud a contesto lungo.
- **📄 Il percorso OCR PDF è completamente locale su Apple Silicon** — vedi [Percorsi OCR PDF](#-percorsi-ocr-pdf).
- **🔐 ChatGPT Plan (Codex OAuth)** — callback loopback desktop su `127.0.0.1:1455`; mobile tramite codice dispositivo. Le credenziali vivono solo in Obsidian SecretStorage; il logout le cancella. Compatibilità Codex di terze parti, non una partnership OpenAI.

### 🌐 Lingua

- **🌍 10 lingue per l'interfaccia** — Inglese, 简体中文, 繁體中文, 日本語, 한국어, Deutsch, Français, Español, Português, Italiano. L'interfaccia e la lingua di output del wiki sono indipendenti — il tuo wiki può essere in cinese mentre l'interfaccia è in inglese.
- **📚 10 lingue per l'output del wiki** — stesso set; scegli in Impostazioni → Configurazione Wiki. Opzione *Input personalizzato* per prompt ad-hoc.
- **🈶 269+ stringhe UI tradotte** — ogni etichetta, modale e notifica. Aggiungere un'undicesima lingua è guidato dai contributori (pattern PR #159).

---

## 🔍 Come funziona il recupero

La maggior parte dei plugin di "ricerca AI" frammenta le tue note in chunk e le incorpora in un DB vettoriale. Noi no. L'argomento di Karpathy contro il RAG è che il chunking rompe la capacità dell'LLM di ragionare sull'intero grafo della conoscenza — e quell'argomento regge in pratica. Invece, percorriamo il grafo che già mantieni scrivendo `[[wiki-link]]`.

### La cascata di selezione seed a 5 stadi

Quando chiedi "Chi ha fondato Microsoft?", Query Wiki esegue cinque stadi prima di qualsiasi generazione di risposta:

1. **Percorso rapido Lex** — controllo diretto di sovrapposizione di token contro ogni titolo di entità/concetto e alias. Gratuito, istantaneo e fa da gate per tutto ciò che segue.
2. **Generazione di keyword via LLM** — l'LLM propone 8–12 keyword cross-lingua dalla tua domanda (gestisce sinonimi, abbreviazioni e termini resistenti alla sovrapposizione di token in una singola chiamata LLM).
3. **Scansione locale di sottostringhe** — ogni keyword generata viene ri-matchata localmente contro titoli di pagina, alias e snippet del corpo. Nessuna chiamata LLM extra; completa il recall tollerante al rumore.
4. **Fallback KB LLM** — quando lex + scansione keyword restituiscono segnali deboli, l'LLM ri-semina i top-N candidati con un passaggio semantico sull'intero wiki.
5. **Espansione del grafo PPR** — Personalized PageRank (Haveliwala 2002) sul grafo `[[wiki-link]]` a partire dall'insieme di seed candidati. Questo è ciò che fornisce contesto multi-hop consapevole del grafo: "Bill Gates" → "Microsoft" → "concorrenti", non solo sovrapposizione letterale dei titoli.

La cascata si interrompe allo stadio che ha restituito segnale sufficiente — nessun costo fisso di 5 stadi, nessuna chiamata LLM quando lex basta, nessuna perdita di precisione quando serve l'augmentation LLM.

### Personalized PageRank su larga scala

Usiamo Monte Carlo PPR (Fogaras 2005) — 3.000 cammini casuali × 50 passi ciascuno — con la regola dead-end di Haveliwala 2002. Il costo è **O(K × L)** indipendente dal numero di pagine, quindi un vault di 2000 pagine vede la stessa latenza di espansione di uno di 200 pagine.

**PPR @5 = 27,1% vs baseline pura kNN 24,1%** sul corpus di benchmark del progetto (l'unico benchmark di recupero pubblicato in questo spazio open-source LLM-Wiki).

### Perché niente embedding

Abbiamo deliberatamente rifiutato il percorso degli embedding in [Issue #175](https://github.com/green-dalii/obsidian-llm-wiki/issues/175). Il segnale del grafo è già lì — ogni `[[wiki-link]]` è un arco "questi sono correlati" curato a mano, e la maggior parte dei provider che supportiamo (Ollama, LM Studio, Anthropic, Bedrock, Kimi, GLM, MiniMax) non hanno affatto un endpoint `/v1/embeddings`. Aggiungere un modello di embedding significherebbe un download per pagina, un adattatore per provider e zero benefici sulla qualità del recupero.

---

## 🤖 Modelli

**Provider supportati (12+, tutti verificati su models.dev a luglio 2026):**

| Provider | Serie | Note |
|----------|-------|------|
| **Anthropic** | Serie Claude 5 | PDF nativo; protocollo `/v1/messages` |
| **OpenAI** | Serie GPT-5.6 (Sol / Terra / Luna) | PDF nativo; chiave API Platform |
| **Google Gemini** | Serie Gemini 3.6 | PDF nativo (file part dalla 1.5); endpoint compatibile OpenAI |
| **DeepSeek** | Serie DeepSeek V4 | Compatibile OpenAI; livello di costo più basso |
| **Alibaba Qwen** | Serie Qwen3.7/3.8 | Compatibile OpenAI (DashScope) |
| **xAI Grok** | Serie Grok 4 | Compatibile OpenAI; contesto lungo |
| **Moonshot Kimi** | Serie Kimi K3 | Compatibile OpenAI; frontiera 2.8T MoE |
| **Zhipu GLM** | Serie GLM-5 | Compatibile OpenAI; forte bilingue |
| **MiniMax** | Serie MiniMax M3 | Compatibile OpenAI; 1M di contesto |
| **Step (阶跃星辰)** | Serie Step 3 (Flash) | Compatibile OpenAI; inferenza veloce |
| **Tencent Hunyuan** | Serie Hy3 | Compatibile OpenAI; MoE open-weight |
| **Xiaomi MiMo** | Serie MiMo V2.5 | Open-source MIT; prezzi piatti |
| **Google Gemma** | Serie Gemma 4 | Open-weight; contesto 262K |
| **AWS Bedrock** | Varianti Anthropic + OpenAI | Percorso VPC / conformità |
| **ChatGPT Plan (Codex OAuth)** | Codex Responses API | Accesso via browser/codice dispositivo; SecretStorage |
| **Locali: Ollama, LM Studio, OpenRouter, Anthropic-Compatibile** | Qualsiasi modello protocollo OpenAI/Anthropic | OpenAI-Compatibile Personalizzato + Anthropic-Compatibile (Token Plan / Coding Plan) |

Questo plugin alimenta l'LLM con il contesto completo del tuo Wiki per ogni query — quindi **vincono i modelli a contesto lungo**. La tabella completa a livelli (cloud + locale) vive in [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md), verificata su [models.dev](https://models.dev/) per mantenere le scelte aggiornate.

### Cosa conta

- **🧠 Finestra di contesto ≥ 200K token** per vault oltre ~500 pagine. Sotto 200K il contesto assemblato dalla cascata inizia a essere troncato.
- **⚖️ La qualità nel seguire le istruzioni** conta più del QI grezzo per il compito di estrazione — scegli un modello che segua il template dello schema, non il numero più alto in classifica.
- **🔌 L'endpoint di embedding è irrilevante** — non usiamo embedding. Un provider che non ha `/v1/embeddings` va bene (la maggior parte dei nostri 12+ provider non lo ha).
- **🦙 Locale per le query, cloud per l'ingest** — l'ingest su un vault di 2000 pagine di solito richiede un modello cloud a contesto lungo; un modello locale da 262K copre la maggior parte delle query.

### Anthropic vs OpenAI vs Codex OAuth — sono provider distinti

- **Anthropic** (e la sua variante Bedrock) — chiave API Anthropic Platform fatturata separatamente.
- **OpenAI** — chiave API OpenAI Platform fatturata separatamente.
- **ChatGPT Plan (Codex OAuth)** — provider sperimentale e distinto che usa un'idoneità Codex idonea dopo l'accesso via browser o codice dispositivo; la disponibilità segue le politiche di autenticazione e idoneità di OpenAI Codex, non il nome del piano. Compatibilità Codex di terze parti, non una partnership OpenAI o un'API ChatGPT generale.

> 📖 **Tabella di scelta completa** (cloud + locale + OCR PDF + Codex OAuth + quantizzazione + livelli hardware) → [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md)

---

## ❓ FAQ

### Cosa fa esattamente il plugin?

Scegli una nota, cartella o selezione; l'LLM estrae entità e concetti e genera un wiki interconnesso con `[[collegamenti bidirezionali]]`. Fai domande e ottieni risposte conversazionali basate sulle *tue* note, non su internet. Le tue note originali del vault non vengono mai modificate.

### Come si inizia?

Installa da Obsidian Community Plugins → scegli un provider → **Test Connection** → esegui **Ingest single source** su una qualsiasi nota. Le prime pagine wiki appaiono in pochi secondi. Vedi [Avvio rapido](#-avvio-rapido).

### Il mio wiki esistente è al sicuro?

✅ Retrocompatibile dalla v1.0.0. Imposta `reviewed: true` su qualsiasi pagina per proteggerla dalla sovrascrittura. L'aggiornamento dalla v1.24.x non riscrive il tuo vault; l'ingest PDF della v1.25.0 è solo cache per default.

### I miei dati vengono inviati da qualche parte?

🚫 Nessun backend, nessuna analisi — il plugin funziona interamente dentro Obsidian. Solo il testo che invii esplicitamente per ingest/query lascia il tuo dispositivo, e solo verso il provider LLM che configuri. Per la completa località dei dati, usa Ollama o LM Studio.

### Posso usare il plugin nella mia lingua?

🌍 10 lingue sia per l'interfaccia che per l'output del wiki. Interfaccia e lingua del wiki sono indipendenti. Aggiungere un'undicesima lingua è guidato dai contributori (pattern PR #159).

### In cosa si differenzia da un chatbot RAG?

🚫 Nessun chunking. 🚫 Nessun embedding. 🚫 Nessun DB vettoriale. ✅ Personalized PageRank sul tuo grafo `[[wiki-link]]` esistente — contesto multi-hop consapevole del grafo, costo embedding zero, supporto completo per modelli locali.

### Quale LLM dovrei usare?

I modelli a contesto lungo (≥200K token) funzionano meglio. La [sezione Modelli](#-modelli) copre i principi; la tabella completa a livelli è in [docs/MODEL-GUIDE.md](./MODEL-GUIDE.md).

### Esiste un benchmark pubblicato?

Sì — PPR @5 = 27,1% vs baseline pura kNN 24,1% sul corpus del progetto. La pipeline completa e lo script di benchmark sono descritti in [Come funziona il recupero](#-come-funziona-il-recupero).

### Come controllo i costi API?

Usa la granularità di estrazione Grossolana o Minima per l'ingest in batch. Smart Batch Skip rileva automaticamente i file già elaborati. La manutenzione automatica è DISATTIVATA per default. Lint mostra i conteggi prima di eseguire le correzioni — nulla viene addebitato senza la tua approvazione.

### Come annullo un'operazione in corso?

Clicca sulla barra di stato (mostra "Ingesting… click to cancel") o `Cmd+P/Ctrl+P` → "Cancel current ingestion". Si ferma pulitamente al prossimo limite di lotto.

### Dove trovo aiuto?

[GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) per segnalazioni di bug · [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) per domande e richieste di funzionalità · Console sviluppatore (`Ctrl+Shift+I` / `Cmd+Option+I`) per i log del plugin.

---

## 🔒 Privacy

Questo plugin è elencato sul Marketplace dei plugin della community di Obsidian ed è sottoposto a una verifica automatizzata di sicurezza e permessi.

- **🚫 Nessun backend, nessun server, nessuna raccolta dati.** Software puramente locale eseguito all'interno di Obsidian. Il plugin non può e non raccoglie, archivia o trasmette i tuoi dati ad alcun server — perché tale server non esiste.
- **🔐 L'accesso alla rete è opt-in.** Usato solo per comunicare con il provider LLM che configuri. Scegli tu il provider, inserisci tu la chiave API, decidi tu dove vanno i tuoi dati.
- **📁 L'accesso ai file del vault** è usato per la gestione del wiki (leggere note, generare pagine, scansionare link morti, rilevare duplicati). Il plugin non modifica mai i tuoi file sorgente.
- **📋 L'accesso agli appunti** è usato esclusivamente dal pulsante "Copia" nel modale Query — e solo quando ci clicchi sopra.

Per la completa località dei dati, usa Ollama o LM Studio. Con un provider locale, i tuoi dati non lasciano mai la tua macchina.

---

## 💖 Supporto

Se LLM-Wiki è diventato una parte significativa del tuo flusso di lavoro della conoscenza:

- ☕ **[Offrimi un caffè su Ko-fi](https://ko-fi.com/greenerdalii)** — supporto una tantum o mensile
- 💳 **[Mancia tramite PayPal](https://paypal.me/greenerdalii)** — mancia una tantum

La sponsorizzazione è completamente facoltativa. Il plugin resta con licenza Apache-2.0 e completo nelle funzionalità.

Grazie a [@jameses-cyber](https://github.com/jameses-cyber) e [@issaqua](https://github.com/issaqua) per aver sostenuto il progetto.

---

## 📜 Licenza e crediti

Licenza Apache, Versione 2.0 — vedi [LICENSE](../LICENSE) e [NOTICE](../NOTICE).

**Costruito su:**
- 💡 [LLM Wiki di Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — il concetto originale
- 🛠️ [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- 🔌 [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian `requestUrl`
- 🧮 [Personalized PageRank (Haveliwala 2002)](https://www-cs.stanford.edu/~taherh/papers/topic-sensitive-pagerank-tkde.pdf) e [Monte Carlo PPR (Fogaras 2005)](https://www.cs.cmu.edu/~dpelleg/download/pagerank.pdf) — algoritmi di recupero

**Manutentore:** [@green-dalii](https://github.com/green-dalii)

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Xa2Oeo4ZXfP48muFa_nEj7wrUaENRLnE0bXSZM7EKTUhHHlmnDFmmxSW80NS8-kXm4kDDMbdzkrZ0MtcqUcmAxB1a1FVVmIIimncTWL9Zg7Ms7j8gnjdCpd0-SyvSc5ubCtUB2zkqtn_V4alrEi7UbBpTlNTdHPva_Vuar5lx9d-ousGG-zhpUk3cGaw)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
