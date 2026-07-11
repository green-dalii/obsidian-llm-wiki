![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin per Obsidian

> Base di conoscenza strutturata e potenziata dall'IA che acquisisce le tue note e genera un Wiki interconnesso — basato sul [concetto di LLM Wiki di Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

> **Punteggio ufficiale Obsidian 95/100 | Supporto nativo per 10 lingue | Ricerca su grafo senza embedding | Piena sovranità dei dati | Compatibile con qualsiasi provider LLM**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | **Italiano**

[Sito ufficiale](https://llmwiki.greenerai.top/) | [Marketplace Obsidian](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback e discussioni](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Esplora il repository con DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

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
  - [⚡ Novità nella v1.24.0](#-novità-nella-v1240)
  - [✨ Funzionalità](#-funzionalità)
    - [📊 Qualità della conoscenza](#-qualità-della-conoscenza)
    - [🛠️ Manutenzione](#️-manutenzione)
    - [💬 Query e feedback](#-query-e-feedback)
    - [🌐 LLM e lingua](#-llm-e-lingua)
    - [🏗️ Architettura e prestazioni](#️-architettura-e-prestazioni)
    - [🔒 Privacy e sicurezza](#-privacy-e-sicurezza)
  - [📖 Esempio](#-esempio)
  - [🤖 Guida alla scelta del modello](#-guida-alla-scelta-del-modello)
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
2. Scegli un provider dal menu a discesa (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, Ollama, OpenRouter o personalizzato)
3. Inserisci la tua chiave API (non necessaria per Ollama)
4. Clicca su **Fetch Models** per popolare il menu dei modelli, oppure digita manualmente il nome di un modello
5. Clicca su **Test Connection**, poi su **Save Settings**

**🦙 Ollama (locale, nessuna chiave API):** installa [Ollama](https://ollama.com), scarica un modello (`ollama pull gemma4` o `ollama pull qwen3.5:27b`), seleziona "Ollama (Local)" nel menu dei provider.

**🎛️ LM Studio (locale, nessuna chiave API):** installa [LM Studio](https://lmstudio.ai), avvia il suo server locale (predefinito `http://localhost:1234/v1`), seleziona "LM Studio (Local)" nel menu dei provider. LM Studio esegue un server integrato compatibile con OpenAI — il campo della chiave API è facoltativo.

> Vedi la [Guida alla scelta del modello](#-guida-alla-scelta-del-modello) per i dettagli.

### 🎮 Utilizzo

| Metodo | Come |
|--------|------|
| **📥 Acquisisci singola fonte** | `Cmd+P` → "Ingest single source" — seleziona una nota per generare pagine Wiki con entità e concetti |
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

> 🔧 **Aggiornamento da v1.24.0.** Il marcatore di commento interno `<!-- reviewed: keep -->` (v1.24.0, #244), che proteggeva solo la sezione *Mentions in Source* di una pagina, è stato rimosso. Per conservare una sezione Mentions curata manualmente, imposta `reviewed: true` nel frontmatter della pagina: protegge l'intera pagina (Mentions incluse) e, a differenza del commento nascosto, resta visibile nel pannello Proprietà e resiste ai linter Markdown.

**Retrocompatibile.** Nessuna modifica che comprometta la compatibilità dalla v1.0.0 — le tue pagine Wiki, impostazioni e flussi di lavoro esistenti vengono preservati senza riconfigurazione.

**Dopo l'aggiornamento**, esegui **Lint Wiki** → **Smart Fix All** per riparazione automatica:
1. 🏷️ Completare alias (LLM genera traduzioni, abbreviazioni, nomi alternativi)
2. 🔄 Unire duplicati (multilingua, abbreviazioni, alta similarità)
3. 🔗 Riparare link morti / collegare orfani / espandere pagine vuote

Poi **Rigenera indice** per ricostruire `wiki/index.md` con voci alias.

> 📖 Guide dettagliate per salti di versione specifici in [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions).

**Impostazioni da verificare:** Lingua di output Wiki, Granularità di estrazione, Concorrenza (predefinito 3), Ritardo lotto (predefinito 300ms).
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
## ⚡ Novità nella v1.24.0

Cinque temi: modelli per attività, istruzioni di query personalizzate, quattro suddivisioni di monoliti, propagazione alias note sorgente, correzioni frontmatter segnalate dagli utenti. Aggiornamento raccomandato per tutti gli utenti v1.23.x.

- **🎛️ Modelli per attività (#208).** Scegli un modello diverso per **Acquisizione / Lint / Query**, o mantienili unificati. Impostazioni → Wiki → *Ambito modello* commuta con un clic. Il pulsante **Test connessione** ora sonda ogni modello configurato in sequenza con fail-fast — finché tutti i modelli per attività non superano il test, la connessione non è considerata sana.
- **📝 Istruzioni di query personalizzate (#251, `jameses-cyber`).** Un pannello richiudibile dentro la vista Query Wiki ti permette di aggiungere istruzioni persistenti a ogni prompt di sistema — modalità ricerca, stile citazione, regole "niente fabbricazione", ecc. Limite difensivo di 5000 caratteri. Rigorosamente limitato alla chat Query Wiki; acquisizione / lint / generazione pagine non sono intenzionalmente toccati. Menu a tendina delle modalità pianificato per v1.25.0+.
- **🧱 Quattro suddivisioni di monoliti (continuazione P0 della serie v1.23.0).** `controller.ts` (PR #248), `history-modal.ts` (PR #249, 1579 → 14 file, 93 test), `query-engine.ts` (PR #250, 1373 → 15 file), `modals.ts` (PR #257, 1008 → 7 file) — ogni funzione-dio / classe-dio decomposta in moduli focalizzati. Il plugin è ora strutturalmente pronto per il prossimo ciclo di funzionalità.
- **🏷️ Propagazione alias note sorgente (#185).** Gli `aliases:` del frontmatter delle note sorgente ora confluiscono nelle pagine `sources/<slug>` generate, così che il matching `[[wiki-link]]` a valle e la ricerca consapevole degli alias raggiungano ogni citazione. Riduce i mancati riscontri tipo "DSA ≠ DeepSeek-Sparse-Attention".
- **🔀 Triage fusione Tier-1 + Tier-2 (#216, `DocTpoint`).** Decisione di bypass duplicati classifica-poi-instrada: salta direttamente i candidati Tier-1 spuri, esegui Tier-2 solo sui restanti. Riduce la dimensione del lotto di fusione Lint senza sacrificare le corrispondenze ad alta precisione.
- **🐛 Riparazione scrittura frontmatter (4 bug segnalati dagli utenti).** `aliases:[]` non è più falsamente rilevato come alias-carente; gli alias duplicati sono compressi in fase di scrittura; il frontmatter a blocchi viene preservato (non appiattito in inline); i fallimenti sono ora registrati con il campo colpevole. Riguarda i percorsi Smart Fix e fusione.
- **🚀 Riscaldamento PPR prima query in Query Wiki.** Cache grafo PPR a livello motore (invalidazione al cambio `wikiFolder` + svuotamento cache in `invalidatePageCaches`) — la prima query ora usa Personalized PageRank invece di ripiegare su lex-only all'avvio a freddo.
- **🌐 Completezza i18n** — 7 nuove chiavi per locale per i selettori modello per attività, il menu a tendina Ambito modello, e le etichette di Test connessione.

**Impostazioni da rivedere:** Ambito modello (Unificato / Per attività, in Impostazioni → Wiki), campi modello per attività (visibili solo in modalità Per attività), pannello richiudibile ⚙ Istruzioni personalizzate Query Wiki (solo dentro la vista).

## ✨ Funzionalità

### 📊 Qualità della conoscenza

- **🔍 Estrazione di entità/concetti** — l'LLM estrae entità (persone, organizzazioni, prodotti, eventi, ecc.) e concetti (teorie, metodi, termini, ecc.) dalle tue note e genera pagine Wiki autonome. Granularità di estrazione flessibile (minima ~5, grossolana ~10, standard ~50, fine ~100, personalizzata 1–500) bilancia la profondità di analisi con il costo delle API.
- **🏷️ Alias di pagina obbligatori** — ogni pagina generata include almeno 1 alias (traduzione, abbreviazione, variante) per il rilevamento dei duplicati tra lingue.
- **🔄 Rilevamento e fusione dei duplicati** — rilevamento semantico a livelli cattura i veri duplicati (traduzioni, abbreviazioni, varianti ortografiche); la fusione intelligente tramite LLM unisce i contenuti preservando gli alias.
- **🧩 Fusione intelligente della conoscenza** — gli aggiornamenti multi-fonte fondono le nuove informazioni senza duplicati; le contraddizioni vengono preservate con attribuzione della fonte; le pagine `reviewed: true` sono protette dalla sovrascrittura.
- **📏 Guardia di troncamento del contenuto** — 8000 max_tokens con rilevamento automatico di stop_reason e retry con 2× token, su tutti i provider.
- **📝 Conservazione delle citazioni originali** — le sezioni Menzioni nella sorgente conservano le citazioni nella lingua originale (traduzione opzionale) per la tracciabilità completa.

- **🎨 Vocabolario tag personalizzabile (v1.18.0).** Impostazioni → Wiki → Modalità vocabolario tag → *Personalizzato* ti permette di definire le tue liste di tag per tipo di entità e concetto (es. `Medical_Arzneimittel`, `法规`). Il plugin rispetta il tuo vocabolario nei prompt di estrazione e nella validazione del frontmatter; l'audit Lint (Issue #85 v7) segnala qualsiasi pagina i cui tag cadano fuori dal vocabolario attivo.

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

### 💬 Query e feedback

- **🤖 Query conversazionale** — dialogo in stile ChatGPT con output Markdown in streaming, `[[wiki-links]]` automatici e cronologia multi-turno.
- **🪟 Pannello laterale ancorato a destra (v1.22.1, PR #196).** Query Wiki si apre in un leaf del sidebar destro in stile Copilot (riutilizzando un leaf esistente) invece di un popup centrato. L'icona ribbon `message-circle` e il comando `Query Wiki` attivano/mostrano il pannello; le tue note restano visibili accanto alla conversazione. Tutte le funzionalità sono preservate senza modifiche.
- **📤 Feedback Query → Wiki** — salva le conversazioni preziose nel Wiki, con estrazione di entità/concetti e deduplicazione semantica pre-salvataggio.
- **🔒 Guardia salvataggio duplicati** — tracciamento hash che impedisce la ri-valutazione di conversazioni invariate.

### 🌐 LLM e lingua

- **🔌 Supporto multi-provider** — Anthropic, Anthropic-compatibile (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, endpoint personalizzato.
- **🔄 Retry automatico 5xx** — backoff esponenziale su HTTP 5xx / 429 / 529 su tutti i client (max 2 retry).
- **📋 Lista modelli dinamica** — recuperata in tempo reale dall'API del provider.
- **🌐 Lingua di output del Wiki** — 10 lingue indipendenti dalla UI (EN / ZH simplif / ZH trad / JA / KO / DE / FR / ES / PT / IT), con opzione di input personalizzato.
- **🌍 Internazionalizzazione completa della UI** — interfaccia plugin in 10 lingue con 269+ campi UI completamente tradotti in espressione locale naturale.
- **⚡ Guardia rate-limit** — rileva automaticamente quando la generazione parallela innesca rate limit e suggerisce di ridurre la concorrenza, aumentare il delay tra batch o cambiare provider.
- **🦙 Compatibilità Web Clipper** — aggiunta con un clic della cartella `Clippings/` dell'Obsidian Web Clipper ufficiale alla lista di monitoraggio; le pagine web clippate vengono auto-importate nel Wiki.

### 🏗️ Architettura e prestazioni

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

Per i modelli locali (Ollama): le finestre di contesto sono in genere più piccole (8K–128K). Valuta di usare un provider cloud per l'acquisizione e un modello locale per le query.

**🔌 Anthropic Compatible (Coding Plan):** se il tuo provider offre un endpoint API compatibile con Anthropic, seleziona "Anthropic Compatible" e inserisci l'URL di base e la chiave API del tuo provider.

> 💡 **Piani in abbonamento:** i piani Coding Plan, OpenAI Pro o Anthropic Pro sono ottime opzioni per controllare i costi con un uso frequente. Questo plugin supporta tali servizi.

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
Obsidian v1.11.0+. Chiave API LLM (o locale senza chiave). llmReady richiede Test Connection.

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

