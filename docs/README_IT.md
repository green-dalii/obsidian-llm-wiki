![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin per Obsidian

> Base di conoscenza strutturata e potenziata dall'IA che acquisisce le tue note e genera un Wiki interconnesso — basato sul [concetto di LLM Wiki di Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

> **Punteggio ufficiale Obsidian 95/100 | Supporto nativo per 10 lingue | Ricerca su grafo senza embedding | Piena sovranità dei dati | Compatibile con qualsiasi provider LLM**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.4%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | **Italiano**

[Sito ufficiale](https://llmwiki.greenerai.top/) | [Marketplace Obsidian](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback e discussioni](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

🚀 [Avvio rapido](#-avvio-rapido) | ✨ [Funzionalità](#-funzionalità) | 🤖 [Guida alla scelta del modello](#-guida-alla-scelta-del-modello) | 🔒 [Trasparenza e conformità](#-trasparenza-e-conformità) | ❓ [FAQ](#-faq)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← Se questo plugin ti è stato utile, offrimi un caffè♥️ o lascia una stella🌟↗

---

> **⚡ Promemoria sugli aggiornamenti rapidi:** questo progetto evolve rapidamente con frequenti correzioni di bug, miglioramenti delle prestazioni, nuove funzionalità e ottimizzazioni dell'esperienza utente. Ti consigliamo di aggiornare regolarmente all'ultima versione in Obsidian (**Impostazioni → Plugin della community → Verifica aggiornamenti**) oppure di abilitare l'aggiornamento automatico dei plugin per garantire la migliore esperienza.

## 📑 Indice

- [🧠 Karpathy LLM Wiki Plugin per Obsidian](#-karpathy-llm-wiki-plugin-per-obsidian)
  - [📑 Indice](#-indice)
  - [💡 Cos'è LLM-Wiki?](#-cosè-llm-wiki)
  - [⚡ Perché Obsidian + LLM-Wiki?](#-perché-obsidian--llm-wiki)
  - [🚀 Avvio rapido](#-avvio-rapido)
    - [📦 Installazione](#-installazione)
    - [🔄 Aggiornamento](#-aggiornamento)
    - [🔑 Configurare un provider LLM](#-configurare-un-provider-llm)
    - [🎮 Utilizzo](#-utilizzo)
    - [⚠️ Aggiornamento da una versione precedente?](#️-aggiornamento-da-una-versione-precedente)
  - [⚡ Novità nella v1.25.0](#-novità-nella-v1250)
  - [✨ Funzionalità](#-funzionalità)
    - [📊 Qualità della conoscenza](#-qualità-della-conoscenza)
    - [📄 Ingestione PDF (v1.25.0)](#-ingestione-pdf-v1250)
    - [💬 Query e feedback](#-query-e-feedback)
    - [🛠️ Manutenzione](#️-manutenzione)
    - [🌐 LLM e lingua](#-llm-e-lingua)
    - [🏗️ Architettura e prestazioni](#️-architettura-e-prestazioni)
    - [🔒 Privacy e sicurezza](#-privacy-e-sicurezza)
  - [📖 Esempio](#-esempio)
  - [🤖 Guida alla scelta del modello](#-guida-alla-scelta-del-modello)
    - [☁️ Modelli cloud](#️-modelli-cloud)
    - [🦙 Modelli locali (Ollama / LM Studio)](#-modelli-locali-ollama--lm-studio)
    - [📄 Percorso OCR PDF locale (v1.25.0+)](#-percorso-ocr-pdf-locale-v1250)
  - [🏗️ Architettura](#️-architettura)
  - [❓ FAQ](#-faq)
  - [🔒 Trasparenza e conformità](#-trasparenza-e-conformità)
  - [💖 Sostenere il progetto](#-sostenere-il-progetto)
    - [Sponsor](#sponsor)
  - [📜 Licenza](#-licenza)
  - [🙏 Ringraziamenti](#-ringraziamenti)
  - [Star History](#star-history)
---

## 💡 Cos'è LLM-Wiki?

Tu scrivi. L'IA organizza. Tu chiedi. Tutto qui.

**🎯 Il problema.** Le tue note sono una miniera d'oro — persone, concetti, idee, connessioni. Ma per ora sono solo file in cartelle. Trovare cosa è collegato a cosa significa cercare, applicare tag e sperare di ricordare il filo conduttore.

**✨ La soluzione.** [Andrej Karpathy ha proposto](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) qualcosa di elegante: trattare le tue note come materia prima e lasciare che sia un LLM a svolgere il lavoro di architetto. Legge ciò che scrivi, estrae entità e concetti e li intreccia in un Wiki strutturato — completo di `[[collegamenti bidirezionali]]`, un indice generato automaticamente e un'interfaccia di chat che risponde alle domande a partire dalla *tua* conoscenza.

**📚 Così non devi più fare il bibliotecario.** Niente più decisioni su cosa merita una pagina. Nessun collegamento incrociato da mantenere. Nessun dubbio sull'obsolescenza dei contenuti. Scegli una qualsiasi nota (o cartella, o selezione multipla) dal tuo vault — l'LLM legge, estrae, scrive, collega e segnala perfino le contraddizioni — mentre tu resti concentrato.

**🤖 E non è l'ennesimo chatbot.** ChatGPT conosce internet. LLM-Wiki conosce *te* — o meglio, ciò che gli hai insegnato. Ogni risposta riporta `[[wiki-link]]` verso il tuo grafo della conoscenza. Ogni risposta è un punto di partenza, non un vicolo cieco.

---

## ⚡ Perché Obsidian + LLM-Wiki?

Obsidian è eccezionale nel pensiero connesso. Ma c'è un trucco: sei tu a fare tutti i collegamenti.

LLM-Wiki ribalta la situazione. Invece di costruire il grafo a mano, è l'IA a farlo crescere insieme a te. Aggiungi una nota su un nuovo concetto — l'IA trova le connessioni che ti sfuggirebbero. Poni una domanda — l'IA attraversa il tuo grafo della conoscenza e riporta risposte con citazioni.

- **🔗 La tua Graph View prende vita.** Le nuove note non restano lì inerti — generano collegamenti verso entità, concetti e sorgenti. Il grafo cresce in modo organico e il plugin lo mantiene: rilevando duplicati, correggendo collegamenti interrotti, creando ponti tra lingue tramite gli alias.
- **💬 Le tue note imparano a risponderti.** La ricerca diventa conversazione. "Cosa ho scritto su X?" diventa un dialogo, con risposte in streaming e `[[wiki-link]]` come tracce da seguire. Ogni risposta è un percorso più in profondità nella tua conoscenza.
- **🧠 Obsidian diventa un partner di pensiero.** Smette di essere uno schedario per le note e inizia a essere qualcosa che ti aiuta a *pensare* — facendo emergere connessioni nascoste, segnalando contraddizioni, ricordando ciò che avevi dimenticato di sapere.

---

## 🚀 Avvio rapido

### 📦 Installazione

**🌟 Consigliato — Marketplace dei plugin della community di Obsidian:**

1. In Obsidian, vai su **Impostazioni → Plugin della community**
2. Clicca su **Sfoglia** e cerca "Karpathy LLM Wiki"
3. Clicca su **Installa**, poi su **Abilita**

**🌐 Oppure dal sito dei plugin della community —** visita [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) e clicca su **Add to Obsidian** per installarlo direttamente.

**⚙️ Manuale (alternativa):**

1. Scarica `main.js`, `manifest.json`, `styles.css` dalle [Release](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. In Obsidian, vai su Impostazioni → Plugin della community. Nella scheda **Plugin installati**, clicca sull'icona della cartella per aprire la directory dei plugin
3. Crea una cartella chiamata `karpathywiki` e inserisci i tre file al suo interno
4. Tornato in Obsidian, clicca sull'icona di aggiornamento — **Karpathy LLM Wiki** comparirà tra i plugin installati
5. Attivalo per abilitarlo

**🔨 Sviluppo:** `git clone`, `pnpm install`, `pnpm build`.

### 🔄 Aggiornamento

Questo progetto evolve rapidamente — nuove funzionalità, correzioni di bug e miglioramenti vengono rilasciati con frequenza. Ti consigliamo di restare aggiornato:

**Opzione A — Aggiornamento manuale (consigliato):**
1. Vai su **Impostazioni → Plugin della community**
2. Clicca su **Verifica aggiornamenti**
3. Trova **Karpathy LLM Wiki** nell'elenco e clicca su **Aggiorna**

**Opzione B — Abilita l'aggiornamento automatico:**
1. Vai su **Impostazioni → Plugin della community**
2. Attiva **Verifica automaticamente gli aggiornamenti dei plugin**
3. Le nuove versioni verranno rilevate automaticamente; aggiorna manualmente quando preferisci

> 💡 **Perché restare aggiornato?** Ogni release può includere nuove funzionalità, miglioramenti delle prestazioni e correzioni di bug importanti. Manteniamo attivamente questo plugin — saltare gli aggiornamenti significa perdere un'esperienza migliore.

### 🔑 Configurare un provider LLM

1. Apri Impostazioni → Karpathy LLM Wiki
2. Scegli un provider dal menu a discesa (inclusi OpenAI o ChatGPT Plan (Codex OAuth))
3. Per i provider API inserisci la chiave (non necessaria per Ollama, LM Studio o ChatGPT Plan (Codex OAuth))
4. Per i provider diversi da Codex usa **Fetch Models** o inserisci un modello; ChatGPT Plan (Codex OAuth) popola automaticamente l'elenco dei modelli selezionati
5. Clicca su **Test Connection**, poi su **Save Settings**

**🦙 Ollama (locale, nessuna chiave API):** installa [Ollama](https://ollama.com), scarica un modello (`ollama pull gemma4` o `ollama pull qwen3.5:27b`), seleziona "Ollama (Local)" nel menu dei provider.

**🎛️ LM Studio (locale, nessuna chiave API):** installa [LM Studio](https://lmstudio.ai), avvia il suo server locale (predefinito `http://localhost:1234/v1`), seleziona "LM Studio (Local)" nel menu dei provider. LM Studio esegue un server integrato compatibile con OpenAI — il campo della chiave API è facoltativo.

**🔐 ChatGPT Plan (Codex OAuth) — sperimentale:** è separato da **OpenAI**, che usa una chiave OpenAI Platform fatturata a parte. Selezionalo e usa **Accedi con il browser** su desktop (callback localhost), oppure **Usa codice dispositivo** su desktop/mobile e completa l'autorizzazione nella pagina OpenAI. Il plugin sincronizza i modelli selezionabili dell'account Codex connesso e memorizza solo metadati ripuliti; **Aggiorna modelli account** li aggiorna manualmente. Se il catalogo è temporaneamente indisponibile, resta disponibile l'ultima cache o un elenco minimo di riserva. Poi verifica la connessione e salva. Le credenziali OAuth sono archiviate solo in Obsidian SecretStorage; **Esci** le cancella. La disponibilità segue le politiche di autenticazione, modelli e disponibilità di OpenAI Codex. È compatibilità di terze parti, non una partnership OpenAI né un'API ChatGPT generale.

> Vedi la [Guida alla scelta del modello](#-guida-alla-scelta-del-modello) per i dettagli.

### 🎮 Utilizzo

| Metodo | Come |
|--------|------|
| **📥 Acquisisci singola fonte** | `Cmd+P` → "Ingest single source" — seleziona una nota (Markdown o **PDF, v1.25.0+**) per generare pagine Wiki con entità e concetti |
| **📂 Acquisisci da cartella** | `Cmd+P` → "Ingest from folder" — seleziona una cartella per generare Wiki in lote |
| **📑 Acquisisci più file** | `Cmd+P` → "Ingest multiple files" — scegli note tramite albero cartelle + checkbox, acquisizione in lote (con coda live + annullamento per file) |
| **🎯 Acquisisci file corrente** | Clicca l'icona `sticker` nella barra sinistra, o `Cmd+P` → "Ingest current file" |
| **🔍 Interroga il wiki** | `Cmd+P` → "Query wiki" — Q&A conversazionale con streaming e `[[wiki-link]]` |
| **🛠️ Verifica il wiki** | `Cmd+P` → "Lint wiki" — controllo completo: duplicati, link morti, pagine vuote, orfane, alias mancanti, contraddizioni |
| **📋 Rigenera indice** | `Cmd+P` → "Regenerate index" — ricostruisce `wiki/index.md` con voci alias |
| **📊 Cronologia acquisizioni (v1.21.0)** | `Cmd+P` → "View Ingestion History" — esplora acquisizioni, rapporti Lint e manutenzioni passate |
| **⏹ Annulla operazione** | `Cmd+P` → "Cancel current ingestion" — si ferma in sicurezza al prossimo limite di lotto |
| **🎉 Ricrea nota di benvenuto (v1.23.0)** | `Cmd+P` → "Recreate Wiki Welcome Note" — rigenera la nota di benvenuto |

La ri-acquisizione della stessa fonte fonde nuove informazioni in modo incrementale. I riepiloghi vengono rigenerati.

> 💡 **Smart Batch Skip:** Durante l'acquisizione di una cartella, il plugin rileva e salta automaticamente i file già elaborati — risparmia tempo e costi API.

![Command palette — cerca "karpa" per visualizzare tutti i comandi](assets/command-panel.png)

### ⚠️ Aggiornamento da una versione precedente?

> 🔧 **Aggiornamento da v1.24.x.** L'ingestione PDF (v1.25.0) scrive la sua cache in `.obsidian/plugins/karpathywiki/pdf-cache/` (fino a 100 MB / 1000 voci / 10 MB per singola voce; eviction LRU-by-mtime all'avvio e all'inizio di ogni ingestione in batch). Il tuo vault **non viene modificato per default** — attiva **Write PDF Markdown to Vault** (Settings → Wiki Configuration → Wiki Folder) solo se vuoi un sidecar `<basename>.pdf.md` accanto al PDF sorgente. Due nuove impostazioni — **Force PDF Support** (avanzato, disattivato per default) e **Write PDF Markdown to Vault** (disattivato per default) — sono completamente retrocompatibili: un vecchio `data.json` senza questi campi ripiegherà su `false`.

> 🔧 **Aggiornamento da v1.24.0.** Il marcatore di commento interno `<!-- reviewed: keep -->` (v1.24.0, #244), che proteggeva solo la sezione *Mentions in Source* di una pagina, è stato rimosso. Per conservare una sezione Mentions curata manualmente, imposta `reviewed: true` nel frontmatter della pagina: protegge l'intera pagina (Mentions incluse) e, a differenza del commento nascosto, resta visibile nel pannello Proprietà e resiste ai linter Markdown.

**Retrocompatibile.** Nessuna modifica che comprometta la compatibilità dalla v1.0.0 — le tue pagine Wiki, impostazioni e flussi di lavoro esistenti vengono preservati senza riconfigurazione.

**Dopo l'aggiornamento**, esegui **Lint Wiki** → **Smart Fix All** per riparazione automatica:
1. 🏷️ Completare alias (LLM genera traduzioni, abbreviazioni, nomi alternativi)
2. 🔄 Unire duplicati (multilingua, abbreviazioni, alta similarità)
3. 🔗 Riparare link morti / collegare orfani / espandere pagine vuote

Poi **Rigenera indice** per ricostruire `wiki/index.md` con voci alias.

> 📖 Guide dettagliate per salti di versione specifici in [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions).

**Impostazioni da verificare:** Force PDF Support (Settings → LLM Configuration → Advanced, disattivato per default — necessario solo per provider non NATIVE), Write PDF Markdown to Vault (Settings → Wiki Configuration → Wiki Folder, disattivato per default), Lingua di output Wiki, Granularità di estrazione, Concorrenza (predefinito 3), Ritardo lotto (predefinito 300ms).
- **🏷️ Alias mancanti**: pagine senza alias (di qualsiasi versione, se non hai mai eseguito "Complete Aliases"). Clicca su **"Complete Aliases"** — l'LLM genera in blocco traduzioni, acronimi e nomi alternativi. Questo è fondamentale per il rilevamento dei duplicati.
- **🔄 Pagine duplicate**: pagine con contenuti sovrapposti (es. "CoT" vs "思维链" create da versioni precedenti prive di deduplicazione consapevole degli alias). Clicca su **"Merge Duplicates"** per fonderle e preservare tutti gli alias.
- **💀 Collegamenti interrotti / Pagine vuote / Pagine orfane**: problemi standard di manutenzione del wiki.

**3️⃣ Usa Smart Fix All**
Clicca su **"Smart Fix All"** nel report di Lint per una riparazione con un clic, ordinata per causalità: alias completati → duplicati uniti → collegamenti interrotti corretti → orfane collegate → pagine vuote espanse. È il modo più rapido per ripulire un wiki costruito attraverso molte versioni.

**4️⃣ Abilita la generazione parallela delle pagine**
Impostazioni → **LLM Configuration**:
- **⚡ Page Generation Concurrency**: imposta a 3 per la maggior parte dei provider. Velocizza l'acquisizione di 2–3× su sorgenti con oltre 10 entità.
- **⏱️ Batch Delay**: parti da 300 ms. Aumenta a 500–800 ms se incontri limiti di frequenza.

**5️⃣ Rivedi le impostazioni attuali:**
- **🌐 Wiki Output Language**: indipendente dalla lingua dell'interfaccia — il tuo Wiki può essere in cinese mentre l'interfaccia del plugin resta in inglese, o viceversa.
- **📊 Granularità di estrazione**: cinque opzioni controllano quanto in profondità l'LLM estrae le entità dalle sorgenti:
  - **Fine** (~100 elementi) — Analisi approfondita, incluse le menzioni dei casi limite. Costo elevato in token, ideale per le sorgenti chiave.
  - **Standard** (~50 elementi) — Estrazione bilanciata. Buon valore predefinito per le note quotidiane.
  - **Grossolana** (~10 elementi) — Panoramica rapida, solo entità principali. Costo basso, acquisizione veloce.
  - **Minima** (~5 elementi) — Solo elementi essenziali. Ideale per l'elaborazione in batch di oltre 100 file o per testare nuove sorgenti.
  - **Personalizzata** (1–500 elementi) — Limiti di entità/concetti definiti dall'utente per flussi di lavoro specializzati.
  > 💡 **Consiglio**: usa Minima o Grossolana per le cartelle di grandi dimensioni per risparmiare tempo e costi API. Usa Fine in modo selettivo sui documenti chiave che meritano un'analisi approfondita.
- **🔄 Auto-Maintenance**: Startup Quick Fixes è attivo per impostazione predefinita (controllo di salute una tantum all'avvio); File Watcher e Periodic Lint sono disattivati per impostazione predefinita — abilitali solo se desideri l'elaborazione automatica in background.

> **🛡️ Sicurezza**: la generazione parallela usa `Promise.allSettled` — se una pagina fallisce, le altre proseguono. Le pagine fallite vengono ritentate individualmente con backoff esponenziale. Smart Batch Skip rileva automaticamente i file già acquisiti per risparmiare tempo e costi API.

---
## ⚡ Novità nella v1.25.0

Quattro temi: ingestione PDF solo cache, raccomandazioni modelli locali, centralizzazione del prompt transcodificatore PDF e otto correzioni di bug e2e. Aggiornamento raccomandato per tutti gli utenti v1.24.x.

- **📄 Ingestione PDF (Livello 1).** Scegli un PDF dal tuo vault — il plugin lo legge tramite l'input file nativo del tuo provider LLM (anthropic / openai / bedrock-anthropic / bedrock-openai; qualsiasi altro endpoint compatibile con OpenAI/Anthropic richiede **Force PDF Support** in Settings → LLM Configuration → Advanced), lo converte in Markdown tramite trascrizione verbatim in stile OCR, e rientra nella normale pipeline di ingestione Markdown. Tutti i workflow esistenti entità/concetto/alias/`[[wiki-link]]` restano invariati. Il risultato viene **messo in cache per hash del contenuto** in `.obsidian/plugins/karpathywiki/pdf-cache/` (la chiave incorpora `converterVersion` per invalidare automaticamente le voci obsolete quando il prompt viene aggiornato). Vedi il [Percorso OCR PDF locale](#-percorso-ocr-pdf-locale-v1250) per la configurazione consigliata su Apple Silicon.
- **🗄️ Crescita limitata della cache.** Housekeeping della cache a tre livelli di difesa (100 MB totali / 1000 voci / 10 MB per singola voce) con eviction LRU-by-mtime; le voci vecchie vengono rimosse all'avvio e all'inizio di ogni ingestione in batch. Solo cache — il tuo vault non viene modificato per default.
- **📝 Sidecar opzionale nel vault (avanzato).** Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** scrive un `<basename>.pdf.md` accanto al PDF sorgente dopo la conversione. Disattivato per default.
- **🦙 Raccomandazioni modelli locali.** La sezione Guida alla scelta del modello è ora suddivisa in sezioni separate locale e cloud che coprono Qwen3.5 / Qwen3.6 / Gemma 4 (compromessi parametro vs qualità, quantizzazione MLX vs GGUF, strategia di contesto).
- **🛡️ Prompt transcodificatore PDF verbatim.** Il prompt PDF→Markdown è riformulato come conversione verbatim in stile OCR con marcatori anti-allucinazione `[illegible]` / `[figure: ...]` / `[equation: ...]`; i modelli piccoli/locali che avvolgono l'output in fence ```markdown vengono puliti automaticamente prima della scrittura in cache. Prompt centralizzato in `src/wiki/prompts/pdf.ts` accanto agli altri prompt di chiamate LLM del progetto.
- **⏹ Ingestione PDF cancellabile.** Cliccare sulla barra di stato durante la conversione interrompe la chiamata LLM in corso tramite AbortSignal di Vercel AI SDK v6 in circa 200 ms.
- **🌐 Completezza i18n** — 10 nuove chiavi per locale per le due nuove impostazioni, l'ingestione PDF e il Percorso OCR PDF locale (toggle Force PDF Support, toggle Write PDF Markdown to Vault, Notice source-rejected-pdf-unsupported).

**Impostazioni da rivedere:** Force PDF Support (Settings → LLM Configuration → Advanced, disattivato per default — rilevante solo per provider non NATIVE), Write PDF Markdown to Vault (Settings → Wiki Configuration → Wiki Folder, disattivato per default — sidecar opzionale).

## ✨ Funzionalità

### 📊 Qualità della conoscenza

- **🔍 Estrazione di entità/concetti** — l'LLM estrae entità (persone, organizzazioni, prodotti, eventi, ecc.) e concetti (teorie, metodi, termini, ecc.) dalle tue note e genera pagine Wiki autonome. Granularità di estrazione flessibile (minima ~5, grossolana ~10, standard ~50, fine ~100, personalizzata 1–500) bilancia la profondità di analisi con il costo delle API.
- **🏷️ Alias di pagina obbligatori** — ogni pagina generata include almeno 1 alias (traduzione, abbreviazione, variante) per il rilevamento dei duplicati tra lingue.
- **🔄 Rilevamento e fusione dei duplicati** — rilevamento semantico a livelli cattura i veri duplicati (traduzioni, abbreviazioni, varianti ortografiche); la fusione intelligente tramite LLM unisce i contenuti preservando gli alias.
- **🧩 Fusione intelligente della conoscenza** — gli aggiornamenti multi-fonte fondono le nuove informazioni senza duplicati; le contraddizioni vengono preservate con attribuzione della fonte; le pagine `reviewed: true` sono protette dalla sovrascrittura.
- **📏 Guardia di troncamento del contenuto** — 8000 max_tokens con rilevamento automatico di stop_reason e retry con 2× token, su tutti i provider.
- **📝 Conservazione delle citazioni originali** — le sezioni Menzioni nella sorgente conservano le citazioni nella lingua originale (traduzione opzionale) per la tracciabilità completa.

- **🎨 Vocabolario tag personalizzabile (v1.18.0).** Impostazioni → Wiki → Modalità vocabolario tag → *Personalizzato* ti permette di definire le tue liste di tag per tipo di entità e concetto (es. `Medical_Arzneimittel`, `法规`). Il plugin rispetta il tuo vocabolario nei prompt di estrazione e nella validazione del frontmatter; l'audit Lint (Issue #85 v7) segnala qualsiasi pagina i cui tag cadano fuori dal vocabolario attivo.

### 📄 Ingestione PDF (v1.25.0)

Scegli un PDF dal tuo vault — il plugin lo legge tramite l'input file nativo del tuo provider LLM, lo converte in Markdown e rientra nella normale pipeline di ingestione Markdown. Tutti i workflow esistenti entità/concetto/alias/`[[wiki-link]]` restano invariati.

- **🔌 Cancello provider** — Anthropic, OpenAI, Bedrock Anthropic e Bedrock OpenAI gestiscono i PDF nativamente. Per qualsiasi altro endpoint compatibile OpenAI/Anthropic, attiva **Force PDF Support** in Settings → LLM Configuration → Advanced per consentire al plugin di tentare la chiamata (il tuo endpoint decide; i fallimenti generano un Notice localizzato che guida a disattivare il toggle). La configurazione locale consigliata è in [Percorso OCR PDF locale](#-percorso-ocr-pdf-locale-v1250).
- **🗄️ Cache per hash del contenuto** — PDF + modello + versione di convertitore identici restituiscono il Markdown in cache senza chiamata LLM. La cache vive in `.obsidian/plugins/karpathywiki/pdf-cache/`; la chiave incorpora `converterVersion` così gli upgrade di prompt invalidano automaticamente le voci obsolete.
- **📏 Crescita limitata** — housekeeping della cache a tre livelli di difesa (100 MB totali / 1000 voci / 10 MB per singola voce) con eviction LRU-by-mtime; le voci vecchie vengono rimosse all'avvio e all'inizio di ogni ingestione in batch. Solo cache — il tuo vault non viene modificato per default.
- **📝 Sidecar opzionale nel vault** — Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** scrive un `<basename>.pdf.md` accanto al PDF sorgente dopo la conversione. Disattivato per default (solo cache).
- **🛡️ Prompt trascrittore verbatim** — il prompt PDF→Markdown è riformulato come conversione verbatim in stile OCR con marcatori anti-allucinazione `[illegible]` / `[figure: ...]` / `[equation: ...]`; i modelli piccoli/locali che avvolgono l'output in fence ```markdown vengono puliti automaticamente prima della scrittura in cache.
- **⏹ Cancellabile** — cliccare sulla barra di stato durante la conversione interrompe la chiamata LLM in corso (tramite Vercel AI SDK v6).

### 💬 Query e feedback

- **🔍 Cascata di selezione seed PPR a 5 stadi (v1.24.1 PATCH).** Quando poni una domanda multi-hop, Query Wiki compone la risposta attraverso cinque stadi complementari prima che qualsiasi generazione parta:
  1. **Percorso rapido Lex** — controllo diretto di sovrapposizione di token contro ogni titolo/alias di entity/concept (gratis, istantaneo; fa da gate per gli stadi successivi)
  2. **Generazione di keyword via LLM** — l'LLM propone 8–12 keyword cross-language dalla tua query (assorbe sinonimi, abbreviazioni, termini resistenti alla sovrapposizione di token)
  3. **Scansione locale di sottostringhe** — ogni keyword generata viene ri-matchata localmente contro titoli di pagina, alias e snippet del corpo (nessuna chiamata LLM extra; completa il recall tollerante al rumore)
  4. **Fallback LLM KB** — quando lex + scansione keyword restituiscono segnali deboli, l'LLM ri-semina i top-N candidati con un passaggio semantico sull'intero wiki
  5. **Espansione del grafo PPR** — Personalized PageRank (Haveliwala 2002) eseguito sul grafo `[[wiki-link]]` a partire dall'insieme di seed candidati; porta all'LLM il contesto multi-hop consapevole del grafo che la ricerca lineare non raggiunge

  La cascata si tronca automaticamente allo stadio che restituisce segnale sufficiente — nessun costo fisso di 5 stadi, nessuna chiamata LLM quando Lex basta, nessuna perdita di precisione quando serve l'augmentation LLM. La rilevanza end-to-end (PPR @5 = 27,1% sul corpus di benchmark interno del progetto) supera le baseline knn pure (24,1%) senza opt-in di embedding. Stage 1.5 (stadi 2–3) assorbe i tipi di domanda multi-hop che il Lex puro perde; Stage 1.7 (stadio 4) recupera segnali deboli dalle keyword iniettate dall'LLM; Stage 1.9 (stadio 5) garantisce che l'LLM veda contesto di vicinato invece di una top-N piatta. Sostituisce la vecchia cascata binaria a livelli.

- **🤖 Query conversazionale** — dialogo in stile ChatGPT con output Markdown in streaming, `[[wiki-links]]` automatici e cronologia multi-turno.
- **🪟 Pannello laterale ancorato a destra (v1.22.1, PR #196).** Query Wiki si apre in un leaf del sidebar destro in stile Copilot (riutilizzando un leaf esistente) invece di un popup centrato. L'icona ribbon `message-circle` e il comando `Query Wiki` attivano/mostrano il pannello; le tue note restano visibili accanto alla conversazione. Tutte le funzionalità sono preservate senza modifiche.
- **📤 Feedback Query → Wiki** — salva le conversazioni preziose nel Wiki, con estrazione di entità/concetti e deduplicazione semantica pre-salvataggio.
- **🔒 Guardia salvataggio duplicati** — tracciamento hash che impedisce la ri-valutazione di conversazioni invariate.

### 🛠️ Manutenzione

- **🔍 Scansione di integrità Lint** — un unico report completo rileva: pagine duplicate, link morti, pagine vuote, orfani, alias mancanti, contraddizioni.
- **🎯 Rilevamento duplicati semantico a livelli** — Livello 1 (corrispondenza nome diretta: cross-lingua, abbreviazione, titoli ad alta similarità) sempre verificato; Livello 2 (segnali indiretti: link condivisi, similarità media) riempie il budget di token.
- **⚡ Smart Fix All con un clic** — correzioni in batch in ordine causale: completa alias → unisci duplicati → correggi link morti → collega orfani → espandi pagine vuote, con report popup per fase.
- **🏷️ Completamento alias** — generazione batch parallela con un clic degli alias mancanti, migliorando il rilevamento futuro dei duplicati.
- **🔄 Auto-manutenzione** — monitoraggio multi-cartella, Lint programmato, controllo di integrità all'avvio (tutti opzionali).
- **⚠️ Macchina a stati delle contraddizioni** — `rilevata → revisione-superata → risolta` (correzione AI) o `rilevata → non risolta` (manuale).
- **🛡️ Portale di pre-ingestione (v1.21.0)** — Ogni file sorgente viene validato *prima* di qualsiasi chiamata LLM: le note vuote/blank/solo frontmatter vengono rifiutate; la deduplicazione per hash del contenuto rileva file identici attraverso i percorsi. Impedisce ai modelli locali di allucinare nomi di entità su input vuoti.
- **📊 Pannello di cronologia operazioni (v1.21.0)** — UI ricercabile e filtrabile per ingestioni passate, report di lint ed esecuzioni di manutenzione, con card KPI guidate da insight e link cliccabili alle pagine.
- **🧹 Pulitore di pagine incomplete (v1.21.0)** — Le pagine lasciate in stato parziale a causa di ingestioni interrotte vengono archiviate automaticamente all'avvio (recuperabili dal `.trash` di Obsidian).

### 🌐 LLM e lingua

- **🔌 Supporto multi-provider** — Anthropic, Anthropic-compatibile (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, endpoint personalizzato.
- **🔄 Retry automatico 5xx** — backoff esponenziale su HTTP 5xx / 429 / 529 su tutti i client (max 2 retry).
- **📋 Lista modelli dinamica** — recuperata in tempo reale dall'API del provider.
- **🌐 Lingua di output del Wiki** — 10 lingue indipendenti dalla UI (EN / ZH simplif / ZH trad / JA / KO / DE / FR / ES / PT / IT), con opzione di input personalizzato.
- **🌍 Internazionalizzazione completa della UI** — interfaccia plugin in 10 lingue con 269+ campi UI completamente tradotti in espressione locale naturale.
- **⚡ Guardia rate-limit** — rileva automaticamente quando la generazione parallela innesca rate limit e suggerisce di ridurre la concorrenza, aumentare il delay tra batch o cambiare provider.
- **🦙 Compatibilità Web Clipper** — aggiunta con un clic della cartella `Clippings/` dell'Obsidian Web Clipper ufficiale alla lista di monitoraggio; le pagine web clippate vengono auto-importate nel Wiki.

### 🏗️ Architettura e prestazioni

- **🕸️ PPR sul grafo [[wiki-link]] (v1.24.0+, maturato in v1.24.1 PATCH).** Personalized PageRank (Haveliwala 2002) gira sul grafo diretto di archi `[[wiki-link]]` tra le tue pagine wiki; la cascata ancora i seed PPR sull'insieme di candidati top-N, e il contesto multi-hop viaggia attraverso fino a 3 anelli di espansione. È questo che rende le risposte di Query Wiki consapevoli del grafo (una domanda "fondatori di Microsoft" si risolve via Bill Gates → Microsoft → concorrenti, non solo per sovrapposizione letterale dei titoli). I vault da 2.137 pagine vedono tipicamente <100 ms per warm + espansione a 3 hop, indipendentemente dalla dimensione del vault. È usato da tutti e 4 gli stadi della cascata di selezione dei seed (sezione Query e feedback sopra) e dal rilevamento duplicati di Lint quando link indiretti legano due pagine candidate.
- **⚡ Generazione parallela delle pagine** — 1–5 pagine concorrenti configurabili, predefinito 3 (parallelo), speedup 2–3× su sorgenti grandi; isolamento errori per pagina.
- **📚 Estrazione iterativa a batch** — dimensione batch adattiva elimina il collo di bottiglia max_tokens sui documenti lunghi.
- **🏛️ Architettura a tre livelli** — Le tue note del vault (sola lettura) → `wiki/` (pagine generate dall'LLM, organizzate come `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`) → `schema/` (configurazione co-evoluta).
- **🧩 Base di codice modulare** — 20+ moduli focalizzati in `src/`.

### 🔒 Privacy e sicurezza

- **Nessun backend, nessun tracciamento.** Il plugin funziona interamente dentro Obsidian — nessun server esterno, nessuna analisi, nessuna raccolta dati di alcun tipo. A meno che tu non configuri attivamente un provider LLM, le tue note non lasciano mai il tuo vault.
- **I dati restano locali per impostazione predefinita.** Il plugin non memorizza, mette in cache o trasmette i tuoi contenuti al di fuori dell'API LLM che hai scelto. Solo il testo che invii per l'ingest o la query lascia il tuo dispositivo — e solo verso il provider che hai configurato.
- **Modalità completamente locale tramite Ollama, LM Studio o provider locali.** Per la completa sovranità dei dati, usa un LLM in esecuzione locale. Le tue note sono elaborate interamente sulla tua macchina — senza toccare internet.
- **Permessi minimi.** L'accesso ai file del vault è usato per la gestione del Wiki (lettura note, generazione pagine, rilevamento link morti). L'accesso alla rete è usato solo per comunicare con l'API del provider LLM scelto. L'accesso agli appunti è limitato al pulsante "Copia" nel modale Query — usato solo quando lo clicchi.

---

---

## 📖 Esempio

**Input:** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning uses algorithms to learn from data.

### Types
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**Output — Pagina di concetto:** `wiki/concepts/supervised-learning.md`

```markdown
---
type: concept
created: 2025-12-01
updated: 2026-05-15
sources: ["[[sources/machine-learning]]"]
tags: [method]
aliases: ["监督学习", "Supervised Learning"]
---

### Supervised Learning

### Basic Information
- Type: method
- Source: [[sources/machine-learning]]

### Description
Supervised learning is a machine learning paradigm where models learn
from labeled training data to make predictions on unseen data...

### Related Concepts
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

### Related Entities
- [[entities/Arthur-Samuel|Arthur Samuel]]

### Mentions in Source
- "Supervised learning uses labeled data to train predictive models..."
```

---

## 🤖 Guida alla scelta del modello

Questo plugin segue la filosofia di Karpathy: **fornire all'LLM il contesto Wiki completo, non un recupero RAG frammentato**. I modelli a contesto lungo sono fortemente consigliati — più il tuo Wiki cresce, più contesto serve all'LLM.

> 💡 **Perché non RAG?** La [critica originale di Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) sostiene che il RAG frammenta la conoscenza e compromette la capacità dell'LLM di ragionare sull'intero grafo della conoscenza.

**💰 Strategia orientata al valore:** non hai bisogno dei modelli di punta. Le seguenti **alternative convenienti** offrono risultati eccellenti a prezzi più bassi:

### ☁️ Modelli cloud

| Livello | Modello | Contesto | Perché |
|------|-------|---------|-----|
| **🌟 Scelta di valore** | **DeepSeek V4-Flash** | 1M token | Costo più basso ($0.14/M), 284B MoE, ideale per l'acquisizione in batch |
| **🌟 Scelta di valore** | **Gemini-3.5-Flash** | 1M token | Output 4× più veloce di GPT-5.5, ottimo per i compiti agentici |
| **🌟 Scelta di valore** | **Qwen3.6-Plus** | 1M token | Forti capacità di coding e agentiche, prezzo competitivo |
| **🌟 Scelta di valore** | **Grok-4** | 2M token | Modello di punta xAI 2025-07, 2M di contesto, forte nel ragionamento e nei compiti di codice |
| **Bilanciato** | **Claude Sonnet 4.6** | 1M token | Ottimo equilibrio qualità/costo, $3/$15 per milione di token |
| **Leggero** | **Claude Haiku 4.5** | 200K token | Veloce ed economico per wiki più piccoli |
| **Economico** | **Xiaomi MiMo-V2.5** | 1M token | Xiaomi 310B/15B MoE, open-source MIT 2026-04, agentico e multimodale |
| **Di punta** | Claude Opus 4.7 | 1M token | Qualità massima, costo più elevato — usa in modo selettivo |
| **Di punta** | GPT-5.5 | 1M token | Ragionamento al top, costo più elevato — usa in modo selettivo |

### 🦙 Modelli locali (Ollama / LM Studio)

L'inferenza locale vince su sovranità dei dati, uso offline e costo API zero. Il compromesso è una finestra di contesto più piccola (spesso tra 8K–128K; le famiglie open-weight recenti arrivano a 262K) e un rispetto delle istruzioni più debole rispetto ai modelli cloud di punta. **Scegli in base al budget hardware:** più parametri = più conoscenza del mondo e migliore fedeltà alle istruzioni (estrazione di qualità superiore, meno allucinazioni); meno parametri = più velocità e margine di memoria, al prezzo di più allucinazioni e ragionamento a lungo contesto più debole. Lo sweet spot su Apple Silicon da 24 GB o su una singola GPU consumer è la classe 27B–35B-A3B.

| Modello | Parametri | Contesto | Perché |
|---------|-----------|----------|--------|
| **Qwen3.5 27B** | 27B dense | 262K | Miglior equilibrio qualità/dimensioni per l'ingestione; MLX 4-bit entra in 24 GB |
| **Qwen3.5 35B-A3B** | 35B totali / 3B attivi MoE | 262K | Più veloce di 27B dense a qualità simile; ideale per risparmiare memoria |
| **Qwen3.5 122B-A10B** | 122B / 10B MoE | 262K | Soffitto di qualità; richiede ≥48 GB di VRAM o doppia GPU |
| **Qwen3.6 27B** | 27B dense | 256K+ | Refresh 2026-04 rispetto a Qwen3.5 27B — preferiscilo se l'hardware lo regge |
| **Qwen3.6 35B-A3B** | 35B / 3B MoE | 262K | Stesso compromesso di Qwen3.5 35B-A3B, con pesi più recenti |
| **Gemma 4 31B IT** | 31B dense | 262K | Forte rispetto delle istruzioni, output Markdown pulito |
| **Gemma 4 26B A4B IT** | 26B / 4B MoE | 262K | Meno memoria di 31B dense a qualità comparabile |
| **Gemma 4 E2B / E4B IT** | 2B / 4B | 131K | Eseguibile in CPU pura; solo per wiki piccoli o anteprime rapide |

**Quantizzazione:** MLX 4-bit su Apple Silicon è in genere 1,5–2× più veloce di GGUF Q4_K_M allo stesso bitrate effettivo. GGUF Q4_K_M è la scelta predefinita multipiattaforma; passa a Q5/Q8 solo se hai margine di VRAM e noti regressioni di qualità a Q4.

**Strategia di contesto:** quando il tuo Wiki supera ~500 pagine, un modello locale da 262K copre ancora la maggior parte del contesto assemblato dal motore di Query, ma l'ingestione di un vault da 2000 pagine lo supera. Schema comune: cloud per l'ingestione + locale per le query. Per setup completamente locali, la classe 27B/35B-A3B è lo sweet spot.

### 📄 Percorso OCR PDF locale (v1.25.0+)

L'ingestione PDF di v1.25.0 funziona con qualsiasi provider che accetti PDF come parte di file. Per una pipeline completamente locale su Apple Silicon (l'unica piattaforma attualmente supportata da oMLX), ecco la configurazione consigliata:

1. Installa [oMLX](https://github.com/jundot/omlx) e attiva il suo backend integrato **Markitdown** (conversione locale PDF→Markdown).
2. Carica **Baidu Unlimited-OCR** (open-source il 22/06/2026, 3B totali / 0,5B attivi, OCR end-to-end che gestisce documenti lunghi senza la modalità di fallimento "più genera, più va lento" dei vecchi modelli OCR) come modello visivo in oMLX.
3. In questo plugin: imposta il provider su **Custom OpenAI-Compatible** (oMLX parla il protocollo compatibile con OpenAI), punta la Base URL al server locale di oMLX, attiva **Force PDF Support** in Settings → LLM Configuration → Advanced, e scegli il modello multimodale servito da oMLX per il riepilogo dell'ingestione.

Il PDF non lascia mai la tua macchina — Markitdown esegue la conversione strutturale in locale, Unlimited-OCR il riconoscimento visivo in locale, e l'LLM locale il riepilogo in locale. La cache del plugin (`.obsidian/plugins/karpathywiki/pdf-cache/`) mantiene le re-ingestioni istantanee.

**Fallback:** se oMLX/Markitdown non è disponibile (Linux/Windows o Mac più vecchi), punta **Force PDF Support** direttamente a un LLM multimodale locale che accetti parti di file PDF — la qualità è buona quando il modello è abbastanza grande, ma i requisiti di VRAM crescono in modo ripido con il numero di pagine.

**🔌 Anthropic Compatible (Coding Plan):** se il tuo provider offre un endpoint API compatibile con Anthropic, seleziona "Anthropic Compatible" e inserisci l'URL di base e la chiave API del tuo provider.

> 💡 **Confine di fatturazione OpenAI:** **OpenAI** usa una chiave Platform fatturata separatamente. **ChatGPT Plan (Codex OAuth)** è un provider sperimentale distinto che usa una disponibilità Codex idonea dopo l'accesso via browser o codice dispositivo; il nome del piano non ne garantisce la disponibilità.

---

## 🏗️ Architettura

Il design a tre strati di Karpathy:

```
📄 Le tue note del vault (qualsiasi cartella)   # 📖 Scegli tu quali note ingerire
  ↓ ingest
wiki/                                            # Pagine Wiki generate dall'LLM (wiki/sources/, wiki/entities/, wiki/concepts/)
  ↓ query / maintain
schema/                                          # Configurazione struttura Wiki
```

> 📖 Vedi la struttura completa del codice in [CONTRIBUTING.md → Project Structure](../CONTRIBUTING.md#project-structure).

**Pagine generate:**
- wiki/sources/nomefile.md — Riepilogo fonte
- wiki/entities/nome-entita.md — Pagine entita (persone, organizzazioni, progetti, ecc.)
- wiki/concepts/nome-concetto.md — Pagine concetto (teorie, metodi, termini, ecc.)
- wiki/index.md — Indice generato automaticamente
- wiki/log.md — Registro operazioni

---

---

## ❓ FAQ

> **Mantieni il plugin aggiornato.** **Impostazioni → Plugin della community → Verifica aggiornamenti** regolarmente.
>
> 📖 Altre FAQ su [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

**Cosa fa questo plugin?**
Scegli una qualsiasi nota, cartella o selezione multipla dal tuo vault; l'LLM estrae entità e concetti e genera un Wiki interconnesso con `[[wiki-link]]`. Ottieni risposte conversazionali basate sulle *tue* note — non ricerche su Internet. I riassunti generati vivono sotto `wiki/sources/`, le entità sotto `wiki/entities/`, i concetti sotto `wiki/concepts/` — le tue note originali del vault non vengono mai modificate.

**I miei dati vengono inviati a terze parti?**
Privacy prima di tutto. Nessun backend, nessun tracciamento. Solo il testo inviato esplicitamente lascia il dispositivo. Usa fornitore locale (Ollama/LM Studio) per totale località.

**Differenza dai chatbot RAG?**
LLM-Wiki usa Personalized PageRank sul grafo [[wiki-link]] — zero costo embedding.

**Quale LLM usare?**
Modelli >=200K token. Economici: DeepSeek V4-Flash ($0.14/M), Gemini 3.5 Flash, Qwen3.6-Plus.

**Come iniziare?**
Installa → scegliere fornitore → **Test Connection** → esegui **Ingest single source** (o **Ingest from folder**) su una qualsiasi nota del tuo vault → le prime pagine Wiki appaiono in pochi secondi. Vedi [Avvio rapido](#-avvio-rapido) sopra.

**Controllare costi API?**
Granularità Grossolana/Minima per lotti. Smart Batch Skip. Manutenzione automatica DISATTIVATA.

**Wiki esistente al sicuro?**
✅ Retrocompatibile dalla v1.0.0. `reviewed: true` protegge le pagine dalla sovrascrittura. Il plugin non modifica mai le tue note originali del vault — genera solo nuove pagine nella cartella `wiki/`.

**Lingue?**
10 lingue per interfaccia e Wiki: EN, ZH, ZH-Hant, JA, KO, DE, FR, ES, PT, IT.

**Requisiti?**
Obsidian v1.11.4+ (desktop o mobile). È necessaria una chiave API LLM, Ollama/LM Studio locale o credenziali autorizzate ChatGPT Plan (Codex OAuth). llmReady richiede Test Connection.

**Annullare operazione?**
Barra di stato o Cmd+P → Cancel current ingestion.

**Aiuto?**
- GitHub Issues - segnalare bug
- GitHub Discussions - domande e feedback

## 🔒 Trasparenza e conformità

Questo plugin è elencato sul Marketplace dei plugin della community di Obsidian ed è sottoposto a una verifica automatizzata di sicurezza e permessi.

**Il plugin non ha backend, nessuna infrastruttura server e nessuna raccolta di dati di alcun tipo.** È software puramente locale eseguito all'interno di Obsidian. Il plugin non può e non raccoglie, archivia o trasmette i tuoi dati ad alcun server — perché tale server non esiste.

**L'accesso alla rete** è usato solo per comunicare con il provider LLM che configuri — non viene effettuata nessun'altra chiamata di rete. Questo è interamente sotto il tuo controllo: scegli il provider, inserisci la chiave API, decidi dove vanno i tuoi dati.

**L'accesso al file system** (enumerazione del vault) è necessario per costruire e mantenere il wiki: leggere le tue note sorgente, generare pagine, scansionare i collegamenti interrotti e rilevare pagine duplicate. Il plugin non modifica mai i tuoi file sorgente — solo i file all'interno della cartella wiki.

**L'accesso agli appunti** è usato esclusivamente dal pulsante "Copy" nella finestra modale Query, e solo quando ci clicchi sopra.

Se preferisci la completa località dei dati, usa un provider LLM locale come Ollama o LM Studio. Con un provider locale, i tuoi dati non lasciano mai la tua macchina.

## 💖 Sostenere il progetto

Se LLM-Wiki è diventato una parte significativa del tuo flusso di lavoro di conoscenza, puoi sostenere il suo sviluppo continuo:

- ☕ **[Offrimi un caffè su Ko-fi](https://ko-fi.com/greenerdalii)** — supporto una tantum o mensile tramite Ko-fi
- 💳 **[Mancia tramite PayPal](https://paypal.me/greenerdalii)** — mancia una tantum tramite PayPal

La sponsorizzazione è completamente facoltativa. Il plugin resta con licenza Apache-2.0 e completo nelle funzionalità.

### Sponsor

Grazie alle seguenti persone per sostenere il progetto:

- [@jameses-cyber](https://github.com/jameses-cyber)
- [@issaqua](https://github.com/issaqua)

## 📜 Licenza

Licenza Apache-2.0 — vedi [LICENSE](../LICENSE) e [NOTICE](../NOTICE).

## 🙏 Ringraziamenti

- **💡 Concetto:** [LLM Wiki di Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — la visione originale che ha ispirato questo plugin
- **🛠️ Piattaforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 Trasporto LLM:** [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Re7j5hAKVwsf4431hDF3XjSFlxH6zaRXZ9VDYF_N3A-dMANR-lm7zRjkpsgqvgZf0mJ1ksxNsZk1-g91PBr1DxQDip_kRn2lEuradbANK2Y-q4x17R7RPhF8ML_08Ca9G-AqyPZeJemfXZp2NczsFmjqrJw8fGeBwVpdjS5zV917x4COLQDbEH_j64Pt)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)
