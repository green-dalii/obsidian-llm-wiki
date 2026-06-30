![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin per Obsidian

> Base di conoscenza strutturata e potenziata dall'IA che acquisisce le tue note e genera un Wiki interconnesso — basato sul [concetto di LLM Wiki di Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
>
> **Punteggio ufficiale Obsidian 95/100** | Supporto nativo per 10 lingue | Manutenzione attiva, evoluzione continua

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md) | **Italiano**

[Sito ufficiale](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback e discussioni](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Esplora il repository con DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

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
  - [⚡ Novità nella v1.22.0](#-novità-nella-v1220)
    - [v1.22.1 — 2026-06-24 (PATCH)](#v1221--2026-06-24-patch)
    - [v1.22.2 — 2026-06-26 (PATCH)](#v1222--2026-06-26-patch)
    - [v1.22.3 — 2026-06-26 (PATCH)](#v1223--2026-06-26-patch)
    - [v1.22.4 — 2026-06-27 (PATCH)](#v1224--2026-06-27-patch)
    - [v1.22.5 — 2026-06-29 (PATCH)](#v1225--2026-06-29-patch)
    - [v1.22.6 — 2026-06-29 (PATCH)](#v1226--2026-06-29-patch)
  - [✨ Funzionalità](#-funzionalità)
    - [📊 Qualità della conoscenza](#-qualità-della-conoscenza)
    - [🛠️ Manutenzione](#️-manutenzione)
    - [💬 Query e feedback](#-query-e-feedback)
    - [🌐 LLM e lingua](#-llm-e-lingua)
    - [🏗️ Architettura e prestazioni](#️-architettura-e-prestazioni)
    - [🔒 Privacy e sicurezza](#-privacy-e-sicurezza)
  - [⌨️ Comandi](#️-comandi)
  - [📖 Esempio](#-esempio)
  - [🤖 Guida alla scelta del modello](#-guida-alla-scelta-del-modello)
  - [🏗️ Architettura](#️-architettura)
  - [❓ FAQ](#-faq)
    - [💡 Generale](#-generale)
    - [🏷️ Alias e duplicati](#️-alias-e-duplicati)
    - [⚡ Prestazioni e costi](#-prestazioni-e-costi)
    - [🧹 Manutenzione](#-manutenzione)
    - [🔍 Risoluzione dei problemi](#-risoluzione-dei-problemi)
  - [🔒 Trasparenza e conformità](#-trasparenza-e-conformità)
  - [📜 Licenza](#-licenza)
  - [🙏 Ringraziamenti](#-ringraziamenti)
  - [Star History](#star-history)
---

## 💡 Cos'è LLM-Wiki?

Tu scrivi. L'IA organizza. Tu chiedi. Tutto qui.

**🎯 Il problema.** Le tue note sono una miniera d'oro — persone, concetti, idee, connessioni. Ma per ora sono solo file in cartelle. Trovare cosa è collegato a cosa significa cercare, applicare tag e sperare di ricordare il filo conduttore.

**✨ La soluzione.** [Andrej Karpathy ha proposto](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) qualcosa di elegante: trattare le tue note come materia prima e lasciare che sia un LLM a svolgere il lavoro di architetto. Legge ciò che scrivi, estrae entità e concetti e li intreccia in un Wiki strutturato — completo di `[[collegamenti bidirezionali]]`, un indice generato automaticamente e un'interfaccia di chat che risponde alle domande a partire dalla *tua* conoscenza.

**📚 Così non devi più fare il bibliotecario.** Niente più decisioni su cosa merita una pagina. Nessun collegamento incrociato da mantenere. Nessun dubbio sull'obsolescenza dei contenuti. Inserisci le note in `sources/` e l'LLM legge, estrae, scrive, collega e segnala perfino le contraddizioni — mentre tu resti concentrato.

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
|--------|-----|
| **📥 Acquisisci una singola sorgente** | `Cmd+P` → "Ingest single source" — seleziona una nota per estrarre entità e concetti in pagine Wiki |
| **📂 Acquisisci da una cartella** | `Cmd+P` → "Ingest from folder" — scegli una cartella, genera in batch il Wiki da tutte le note al suo interno |
| **🔍 Interroga il wiki** | `Cmd+P` → "Query wiki" — poni domande, ottieni risposte in streaming con `[[wiki-link]]` |
| **🛠️ Lint del wiki** | `Cmd+P` → "Lint wiki" — scansione dello stato di salute: duplicati, collegamenti interrotti, pagine vuote, pagine orfane, alias mancanti |
| **📋 Rigenera l'indice** | `Cmd+P` → "Regenerate index" — ricostruisci `wiki/index.md` con pagine e alias aggiornati |
| **🎯 Acquisizione con un clic** | Clicca sull'icona `sticker` nella barra laterale sinistra o `Cmd+P` → "Ingest current file" — acquisisci direttamente il file che stai modificando |

Riacquisire la stessa sorgente esegue aggiornamenti incrementali sulle pagine di entità/concetti (le nuove informazioni vengono unite). Le pagine di riepilogo vengono rigenerate.

**💡 Salto intelligente dei batch:** durante l'acquisizione di una cartella, il plugin rileva automaticamente i file già elaborati e li salta per risparmiare tempo e costi API. Il report del batch mostra il numero di file saltati.

![Command palette — cerca "karpa" per visualizzare tutti i comandi di Karpathy LLM Wiki](assets/command-panel.png)

**💡 Salto intelligente dei batch:** durante l'acquisizione di una cartella, il plugin rileva automaticamente i file già elaborati e li salta per risparmiare tempo e costi API. Il report del batch mostra il numero di file saltati.

### ⚠️ Aggiornamento da una versione precedente?

**Questa release è completamente retrocompatibile.** Nessuna modifica che comprometta la compatibilità dalla v1.0.0 — le tue pagine Wiki, le impostazioni e i flussi di lavoro esistenti vengono preservati. Non sono necessarie riconfigurazioni o migrazioni di dati.

**Aggiornamento a v1.20.3 da qualsiasi versione precedente**: gli slug delle pagine sorgente ora hanno un'impronta digitale (ogni `sources/<slug>.md` diventa `sources/<nome_base>_<6 hex>.md`). Alla tua prossima acquisizione, le pagine `sources/` esistenti vengono rinominate sul posto e tutti i backlink `[[sources/<slug>]]` vengono aggiornati automaticamente — nessuna azione richiesta, ma la ridenominazione del file può apparire brevemente nell'esploratore file di Obsidian. Se hai script esterni o segnalibri che fanno riferimento direttamente a percorsi `sources/<slug>.md`, aggiornali ai nuovi percorsi con impronta.

**Se il tuo Wiki esistente è stato costruito attraverso molte versioni**, alcune pagine potrebbero non disporre delle funzionalità più recenti (alias, deduplicazione consapevole degli alias, prompt modernizzati). Esegui **Lint Wiki** per vedere cosa richiede attenzione. Smart Fix All gestisce le pulizie più comuni con un clic.

**Se aggiorni da una versione precedente alla v1.16.0**, esegui **Lint Wiki** una volta per correggere automaticamente i problemi storici:
- **Collegamenti doppiamente annidati** `[[[[entities/Foo|Foo]]]]` in log.md — Lint li rileva e li corregge senza alcun costo LLM
- **Duplicati di stub tra directory** — le pagine presenti sia in `entities/` sia in `concepts/` con lo stesso slug ora vengono associate correttamente

**Per i wiki costruiti attraverso molte versioni**, segui questi passaggi per portare il tuo Wiki agli standard attuali:

**1️⃣ Ricostruisci l'indice**
`Cmd+P` → **"Regenerate index"** — ricostruisce `wiki/index.md` con voci di alias per ogni pagina, abilitando la ricerca consapevole degli alias (es. cercando "DSA" si trova "DeepSeek-Sparse-Attention"). Il vecchio formato dell'indice elencava solo i titoli delle pagine.

**2️⃣ Esegui Lint wiki**
`Cmd+P` → **"Lint wiki"** — scansiona l'intero Wiki e mostra:
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
  - **Personalizzata** (1–300 elementi) — Limiti di entità/concetti definiti dall'utente per flussi di lavoro specializzati.
  > 💡 **Consiglio**: usa Minima o Grossolana per le cartelle di grandi dimensioni per risparmiare tempo e costi API. Usa Fine in modo selettivo sui documenti chiave che meritano un'analisi approfondita.
- **🔄 Auto-Maintenance**: Startup Quick Fixes è attivo per impostazione predefinita (controllo di salute una tantum all'avvio); File Watcher e Periodic Lint sono disattivati per impostazione predefinita — abilitali solo se desideri l'elaborazione automatica in background.

> **🛡️ Sicurezza**: la generazione parallela usa `Promise.allSettled` — se una pagina fallisce, le altre proseguono. Le pagine fallite vengono ritentate individualmente con backoff esponenziale. Smart Batch Skip rileva automaticamente i file già acquisiti per risparmiare tempo e costi API.

---

## ⚡ Novità nella v1.22.0

La v1.22.0 è una **release MINOR** che porta un flusso di aggiornamento dello schema con un solo clic, il cinese tradizionale come 10ª lingua e una barra di stato di ingestione migliorata.

- **📝 Applicazione schema con un clic (Issue #97).** Le suggerimenti generate dal LLM sono ora visualizzate in un Modal diff a doppio pannello stile IDE, con pulsanti Applica/Annulla/Apri file. Applicando una suggerimento, il vecchio schema viene automaticamente salvato (rotazione, max 3 backup) prima di scrivere il nuovo. "Aggiorna schema" è ora accessibile dal Modal di Lint — l'ingresso della palette comandi è stato rimosso per imporre un singolo punto di ingresso.
- **🏷️ Sincronizzazione dinamica dei tag dello schema.** Il vocabolario dello schema è ora l'unica fonte di verità — i tag attivi vengono automaticamente iniettati in ogni chiamata LLM, eliminando il bug di "template dello schema sovrascritto da sezioni hardcoded" di v1.21.0 Fase 1.
- **🇹🇼 Cinese tradizionale (zh-TW).** L'interfaccia del plugin e l'output Wiki supportano ora il cinese tradizionale come 10ª lingua. La protezione di parità bidirezionale è stata estesa a tutte le 10 lingue.
- **📊 Barra di stato di ingestione con nome documento (PR #189).** La barra di stato mostra ora il nome del documento corrente (`Mia Nota · Ingerendo...`) e il progresso del batch durante l'ingestione di cartelle (`[4/10] Mia Nota · Ingerendo...`). Contributo di @YounianC.

Consigliamo vivamente l'aggiornamento — la funzione di applicazione schema con un clic rende il raffinamento dello schema un'operazione in un solo passo, e la lingua cinese tradizionale migliora significativamente l'esperienza per gli utenti zh-TW.

Vedi [CHANGELOG.md](../CHANGELOG.md) per i dettagli completi.

### v1.22.1 — 2026-06-24 (PATCH)

Una PATCH mirata che chiude tre bug P0 segnalati dagli utenti e introduce un miglioramento UX.

- **🛡️ Fix Dead Links non fabbrica più pagine stub espanse dall'IA (#197).** Gli stub ora sono segnaposto onesti con il marker `generation_complete: false`.
- **✅ Il toggle "Esegui correzioni rapide all'avvio" ora persiste (#199).** La migrazione v1.18.3 è stata rimossa.
- **🎨 Avviso di revisione CSS `:has()` risolto.** Nuovo `scripts/css-lint.mjs`.
- **🪟 Query Wiki ora è un pannello laterale destro stile Copilot (#196, @YounianC).** `QueryModal extends Modal` è diventato `QueryView extends ItemView`.
- **🧹 Prefisso del related link riaffermato deterministicamente (#200, @DocTpoint, #187).** Nuova funzione pura `correctRelatedLinkPrefixes()`.

### v1.22.2 — 2026-06-26 (PATCH)

Questo PATCH migliora l'UX di acquisizione automatica, localizza il registro operazioni e rimuove codice morto.

- **📋 L'acquisizione automatica non blocca più con una modale (Issue #204).** L'acquisizione automatica in modalità Watch ora mostra per impostazione predefinita un avviso transitorio invece di aprire la modale completa del rapporto di acquisizione. Gli utenti che preferiscono il rapporto dettagliato possono passare a "Modale" in Impostazioni → Manutenzione automatica → Modalità Watch.
- **🔧 La correzione intelligente automatica usa ora un avviso transitorio.**
- **🌐 Registro operazioni i18n (10 lingue).** Intestazione migrata automaticamente con collegamento al pannello della cronologia operazioni.
- **📅 Lint periodico: "Orario" rimosso, "Mensile" aggiunto.**
- **🧹 Codice morto rimosso.** `console.debug` ridondante in `slug.ts` e reset `setDoneCallback` inutili rimossi.
- **♻️ Migrazione automatica dell'intestazione del registro.**

### v1.22.3 — 2026-06-26 (PATCH)

Un Hotfix mirato che irrobustisce il meccanismo dell'intestazione del log della v1.22.2 e impedisce l'inquinamento del frontmatter sui file non di contenuto.

- **🔧 Rilevamento dell'intestazione del log ora agnostico rispetto alla lingua e robusto.** Passaggio dal rilevamento basato sul testo (che non funzionava per DE/JA/KO/ecc. e poteva essere ingannato dal contenuto naturale di una voce di log) a un marcatore strutturale di commento HTML `<!-- llm-wiki-log-header-start -->` incorporato nell'intestazione. I file di log v1.22.2 esistenti vengono aggiornati automaticamente al prossimo avvio.
- **🧹 Stringhe dell'intestazione del log consolidate in `src/texts/<lang>.ts`.** Le quattro stringhe localizzate precedentemente duplicate in `core/log-header.ts` ora vivono insieme a tutte le altre stringhe UI — traduttori e test di parità le coprono automaticamente.
- **🚫 `generation_complete` non viene più stampato su `log.md` / `index.md` / `schema/`.** `createOrUpdateFile` chiamava prima `markPageComplete` per **ogni** scrittura, che anteponeva un blocco frontmatter completamente nuovo con `generation_complete: true` ai file senza frontmatter — inquinamento visibile del corpo di log.md. La nuova guardia `isInWikiContentFolder()` limita la stampa solo a `wiki/{entities,concepts,sources}/...`.

Aggiornamento consigliato — log.md non accumula più frontmatter vagante ad ogni esecuzione di correzione rapida, e il rilevamento funziona in tutte le lingue senza casi speciali per lingua.

### v1.22.4 — 2026-06-27 (PATCH)

Un PATCH mirato che ripristina la compatibilità GPT-5.x, propaga i messaggi di errore reali del Provider all'UI di Test Connection e centralizza i controlli delle prestazioni di lint.

- **🛡️ I modelli GPT-5.x non falliscono più Test Connection con 400 (Issue #207).** L'euristica hardcoded `params.model.startsWith('gpt-5-')` di v1.20.0 riconosceva solo la famiglia OpenAI gpt-5 con trattino (`gpt-5-mini`, `gpt-5-nano`, ecc.) e si rompeva silenziosamente a ogni nuova versione gpt-5.x (`gpt-5.1`, `gpt-5.4-mini`, `gpt-5.5`). Sostituita con un meccanismo di probe-e-cache in fase di esecuzione: la prima richiesta usa `max_tokens`, se il backend rifiuta con 400, mettiamo in cache la chiave alternativa (`max_completion_tokens` o viceversa) e riproviamo. Le richieste successive riutilizzano la cache — niente più corrispondenza di prefissi sui nomi dei modelli, e il probe gestisce correttamente ogni nuovo schema di denominazione OpenAI.
- **📜 I messaggi di errore reali del Provider ora raggiungono l'UI di Test Connection.** In precedenza, gli errori di `requestUrl` venivano re-incapsulati come `status 400: ${data.error.message}` (o semplicemente "status 400" quando il corpo della risposta andava perso) e l'errore reale del Provider — es. "Invalid parameter: max_tokens should be max_completion_tokens" — non era mai visibile. Il nuovo `extractProviderErrorMessage()` arricchisce l'errore lanciato così che l'utente veda dettagli attuabili del Provider invece di uno stato HTTP generico.
- **♻️ Controlli delle prestazioni di lint centralizzati in `src/constants.ts`.** Cadenze di yield (`LINT_YIELD_EVERY_OUTER` / `_PHASE1` / `_COMPARISON`), dimensioni dei lotti di candidati (`LINT_CANDIDATE_TOKEN_ESTIMATE`, `LINT_MAX_INPUT_TOKENS`, `LINT_DEDUP_BATCH_SIZE`), lettura per lotti di prep (`LINT_PREP_BATCH_READ`) e dimensioni dei lotti di source-analyzer (`SHORT_CONTENT_THRESHOLD`, `BATCH_CHARS_PER_ITEM`) ora vivono in un unico posto. In precedenza questi valori erano duplicati o erano disallineati tra `controller.ts`, `duplicate-detection.ts`, `preparation.ts` e `batch-limits.ts` — inclusa una copia letterale `MAX_TOKENS=16000` di `MAX_TOKENS_BATCH`. La regolazione delle prestazioni di lint è ora una modifica a un singolo file.

Aggiornamento consigliato — i modelli gpt-5.x funzionano di nuovo immediatamente, e l'UI di Test Connection ora indica esattamente cosa ha rifiutato il Provider, così non devi cercare nella console per baseUrl / nome del modello / chiave API.

### v1.22.5 — 2026-06-29 (PATCH)

Un PATCH mirato che evita che la famiglia di modelli di ragionamento di OpenAI (gpt-5.1+ / gpt-5.5 / o1-o4) fallisca con 400 nel Test Connection (follow-up di Issue #207) e che propaga i messaggi di errore reali del Provider nella Notice di Test Connection.

- **🛡️ La famiglia di modelli di ragionamento ora utilizza l'API Responses di OpenAI (follow-up di Issue #207).** La correzione probe-then-cache `max_tokens` ↔ `max_completion_tokens` di v1.22.4 era necessaria ma non sufficiente — `gpt-5.1-chat-latest`, `gpt-5.5` e le famiglie `o1` / `o3` / `o4-mini` continuavano a fallire con 400 nel Test Connection perché l'endpoint Chat Completions ha problemi di compatibilità con la famiglia di modelli di ragionamento. Secondo la guida ufficiale di migrazione GPT-5.5 di OpenAI («GPT-5.5 works best in the Responses API»), v1.22.5 instrada la famiglia di ragionamento verso `/v1/responses` con `reasoning: { effort: 'low' }`. `gpt-5-chat-latest`, `gpt-4.1`, `gpt-3.5-turbo` e tutti i baseUrl non-OpenAI (Ollama, LM Studio, DeepSeek, ecc.) rimangono invariati su `/v1/chat/completions`. Il rilevamento è una funzione pura `isResponsesApiModel(model, baseUrl)`, attivata solo per `https://api.openai.com/v1` — gli endpoint personalizzati rimangono completamente compatibili.
- **📜 Il corpo dell'errore del Provider raggiunge ora l'UI della Notice di Test Connection.** Il `requestUrl` di Obsidian lancia un'eccezione su 4xx (incluso 429) SENZA allegare il corpo della risposta del Provider all'oggetto Error — quindi anche l'`extractProviderErrorMessage()` di v1.22.4 non poteva vedere cosa stesse realmente dicendo OpenAI. v1.22.5 avvolge la richiesta fallita in un re-fetch `window.fetch` (timeout di 5s) e unisce il corpo del Provider nell'`Error.message` lanciato, così gli utenti vedono `"status 429: You exceeded your current quota, please check your plan and billing details"` invece di un semplice `"status 429"`. Il corpo grezzo viene anche registrato a livello `console.warn` per l'ispezione in DevTools. I baseUrl non-OpenAI ottengono lo stesso arricchimento tramite il percorso Chat Completions esistente.
- **⏱️ Gli errori 429/5xx di rate-limit vengono ora ripetuti con backoff esponenziale sul percorso dell'API Responses.** Il `withRetry` di v1.22.4 (3 tentativi, 1s/2s/4s + jitter) copriva originariamente solo il percorso Chat Completions. v1.22.5 avvolge il nuovo percorso dell'API Responses nello stesso `withRetry`, così le fluttuazioni transitorie di quota 429 non fanno più fallire immediatamente il Test Connection.
- **♻️ Fixture di test aggiornate.** I test esistenti per la regressione dot-naming gpt-5.x (v1.22.4) e il percorso `thinking.type='disabled'` Chat Completions (legacy) ora utilizzano `gpt-5-mini` / `gpt-5-nano` / `gpt-4.1` — questi modelli continuano a coprire il percorso Chat Completions, mentre la famiglia di ragionamento è completamente coperta dal nuovo `src/__tests__/root/llm-client-responses-api.test.ts` (28 test).

Aggiornamento consigliato — `gpt-5.1-chat-latest`, `gpt-5.5` e le famiglie `o1` / `o3` / `o4-mini` ora funzionano immediatamente nel Test Connection, e quando una connessione fallisce si ottiene il vero errore del Provider (es. «insufficient_quota») invece di un semplice codice di stato HTTP.

### v1.22.6 — 2026-06-29 (PATCH)

- **🤫 Auto Ingest ora rispetta `autoIngestNotificationLevel: notice` (Issue #204).** L'helper `onAutoIngestDone` introdotto in v1.22.2 (percorso Notice) non è mai stato collegato al flusso di auto-ingest in Watch Mode — ogni completion passava per `onIngestDone` che apre sempre `IngestReportModal`, rendendo l'impostazione Notice un no-op. v1.22.6 aggiunge `trigger?: 'auto' | 'manual'` a `IngestReport` e `IngestOptions`, lo propaga tramite `WikiEngine.ingestSource` → `onDone`, e instrada `trigger='auto'` verso `onAutoIngestDone`. Comportamento dell'ingest manuale invariato.
- **🔇 Anche la completion di Auto Smart Fix è context-aware.** Stesso pattern di trigger applicato a `runLintWiki` (nuovo terzo parametro `trigger`, default `'manual'`). Il lint periodico passa `trigger='auto'`. Dispatch: manuale → `LintReportModal`; auto + `autoSmartFix=true` → Notice + fixAll; auto + `autoSmartFix=false` → solo Notice con suggerimento al pannello History.
- **🛡️ Le varianti GPT-5 Pro (`gpt-5.x-pro`) ora vengono instradate correttamente verso `/v1/responses` (Issue #207 follow-up).** Verificato sulla doc ufficiale OpenAI: "GPT-5 Pro is available in the Responses API only." Il regex v1.22.5 matchava `gpt-5.x` ma mancava il suffisso `-pro` — `gpt-5.2-pro` / `5.4-pro` / `5.5-pro` andavano silenziosamente a `/v1/chat/completions` → 404. Regex esteso a `^(gpt-5\.[1-9]\d*(?:-pro)?|...)`.

Aggiornamento consigliato — l'impostazione "Auto Ingest Notice" funziona finalmente, il lint periodico non interrompe più la scrittura, e le varianti Pro sono raggiungibili via Responses API.

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
- **🌐 Lingua di output del Wiki** — 9 lingue indipendenti dalla UI (English / 中文 / 日本語 / 한국어 / Deutsch / Français / Español / Português / Italiano), con opzione di input personalizzato.
- **🌍 Internazionalizzazione completa della UI** — interfaccia plugin in 9 lingue con 269+ campi UI completamente tradotti in espressione locale naturale.
- **⚡ Guardia rate-limit** — rileva automaticamente quando la generazione parallela innesca rate limit e suggerisce di ridurre la concorrenza, aumentare il delay tra batch o cambiare provider.
- **🦙 Compatibilità Web Clipper** — aggiunta con un clic della cartella `Clippings/` dell'Obsidian Web Clipper ufficiale alla lista di monitoraggio; le pagine web clippate vengono auto-importate nel Wiki.

### 🏗️ Architettura e prestazioni

- **⚡ Generazione parallela delle pagine** — 1–5 pagine concorrenti configurabili, predefinito 3 (parallelo), speedup 2–3× su sorgenti grandi; isolamento errori per pagina.
- **📚 Estrazione iterativa a batch** — dimensione batch adattiva elimina il collo di bottiglia max_tokens sui documenti lunghi.
- **🏛️ Architettura a tre livelli** — `sources/` (sola lettura) → `wiki/` (generato dall'LLM) → `schema/` (configurazione co-evoluta).
- **🧩 Base di codice modulare** — 20+ moduli focalizzati in `src/`.

### 🔒 Privacy e sicurezza

- **Nessun backend, nessun tracciamento.** Il plugin funziona interamente dentro Obsidian — nessun server esterno, nessuna analisi, nessuna raccolta dati di alcun tipo. A meno che tu non configuri attivamente un provider LLM, le tue note non lasciano mai il tuo vault.
- **I dati restano locali per impostazione predefinita.** Il plugin non memorizza, mette in cache o trasmette i tuoi contenuti al di fuori dell'API LLM che hai scelto. Solo il testo che invii per l'ingest o la query lascia il tuo dispositivo — e solo verso il provider che hai configurato.
- **Modalità completamente locale tramite Ollama, LM Studio o provider locali.** Per la completa sovranità dei dati, usa un LLM in esecuzione locale. Le tue note sono elaborate interamente sulla tua macchina — senza toccare internet.
- **Permessi minimi.** L'accesso ai file del vault è usato per la gestione del Wiki (lettura note, generazione pagine, rilevamento link morti). L'accesso alla rete è usato solo per comunicare con l'API del provider LLM scelto. L'accesso agli appunti è limitato al pulsante "Copia" nel modale Query — usato solo quando lo clicchi.

---

## ⌨️ Comandi

| Comando | Descrizione |
|---------|-------------|
| **📥 Ingest single source** | Seleziona una nota → genera pagine Wiki con entità, concetti e riepilogo |
| **📂 Ingest from folder** | Seleziona una cartella → genera in batch il Wiki dalle note esistenti |
| **🔍 Query wiki** | Domande e risposte conversazionali sul tuo Wiki, risposte in streaming con `[[wiki-link]]` |
| **🛠️ Lint wiki** | Scansione completa dello stato di salute: duplicati, collegamenti interrotti, pagine vuote, pagine orfane, alias mancanti, contraddizioni |
| **📋 Regenerate index** | Ricostruisci manualmente `wiki/index.md` |
| **📊 Visualizza cronologia ingestioni (v1.21.0)** | Esplora ingestioni passate, report di lint ed esecuzioni di manutenzione in un'UI ricercabile e filtrabile |

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

Il design di Karpathy a separazione in tre livelli:

```
sources/     # 📄 I tuoi documenti sorgente (sola lettura)
  ↓ ingest
wiki/        # 🧠 Pagine Wiki generate dall'LLM
  ↓ query / maintain
schema/      # 📋 Configurazione della struttura del Wiki (denominazione, template, categorie)
```

**Codebase** (`src/`):

```
main.ts              # 🔌 Punto di ingresso del plugin
wiki/                # Moduli del motore Wiki
  wiki-engine.ts     # 🎯 Orchestratore
  query-engine.ts    # 💬 Query conversazionale
  source-analyzer.ts # 📊 Estrazione iterativa in batch
  page-factory.ts    # 🏗️ CRUD entità/concetti + merge
  conversation-ingest.ts # 📥 Chat → conoscenza Wiki
  contradictions.ts  # ⚠️ Rilevamento delle contraddizioni
  system-prompts.ts  # 🗣️ Direttiva di lingua + etichette di sezione
  lint/              # Sotto-moduli Lint
    controller.ts        # 🔍 Orchestrazione Lint
    fix-runners.ts       # ⚡ Helper di esecuzione delle correzioni in batch
    scanners.ts          # 🔍 Scanner (dead link, orphan, alias, ancoraggio citazioni)
    duplicate-detection.ts # 🔄 Generazione programmatica dei candidati
    report-builder.ts    # 📋 Generatore di report a funzione pura
    phases/              # Esecuzione Lint a fasi
  prompts/           # Template di prompt LLM per dominio
schema/              # Co-evoluzione dello schema
  manager.ts         # 📋 CRUD schema + suggerimenti
  auto-maintain.ts   # 🔄 File watcher + Lint periodico + correzioni rapide all'avvio
  analyze.ts         # 📊 Analisi dello schema con cablaggio annullamento
ui/                  # Interfaccia utente
  settings.ts        # ⚙️ Pannello delle impostazioni
  modals.ts          # 📦 Modali Lint / Ingest / Query / History
core/                # 🧩 Moduli a funzione pura (zero IO, completamente testabili)
  i18n, slug, json, frontmatter, tag-vocab, sources-normalizer, ...
+ condivisi: llm-client.ts, llm-client-wrapper.ts, texts.ts, prompts.ts, types.ts
```

**Pagine generate:**
- `wiki/sources/filename.md` — 📄 Riepilogo della sorgente
- `wiki/entities/entity-name.md` — 👤 Pagine di entità (persone, organizzazioni, progetti, ecc.)
- `wiki/concepts/concept-name.md` — 💡 Pagine di concetti (teorie, metodi, termini, ecc.)
- `wiki/index.md` — 📑 Indice generato automaticamente
- `wiki/log.md` — 📝 Log delle operazioni

---

## ❓ FAQ

> **Mantieni aggiornato il plugin.** Questo progetto rilascia con frequenza — nuove funzionalità e correzioni arrivano ogni pochi giorni. Esegui regolarmente **Impostazioni → Plugin della community → Verifica aggiornamenti**.
>
> Per saperne di più, consulta la [discussione FAQ su GitHub](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

### 💡 Generale

**Cosa fa effettivamente il plugin?**
Inserisci le note e il plugin estrae persone, concetti e teorie, poi genera un wiki interconnesso con `[[collegamenti bidirezionali]]`. Poni domande e ottieni risposte fondate sulle *tue* note — non allucinazioni da internet.

**Requisiti minimi?**
Obsidian v1.11.0+, desktop (Windows/macOS/Linux), una chiave API di un provider LLM. Ollama funziona in locale senza chiave API. Vedi [Configurare un provider LLM](#-configurare-un-provider-llm) sopra.

**Quale modello dovrei usare?**
Vedi la [Guida alla scelta del modello](#-guida-alla-scelta-del-modello) sopra. I modelli a contesto lungo funzionano meglio — più grande è il tuo wiki, più contesto serve all'LLM.

### 🏷️ Alias e duplicati

**Perché Lint mostra "alias mancanti" su quasi tutte le mie pagine?**
Le pagine generate prima della v1.7.11 non includevano gli alias. È innocuo — gli alias sono un miglioramento, non un bug. Clicca su **Complete Aliases** nel report di Lint per generare in blocco traduzioni, acronimi e nomi alternativi. Una volta presenti gli alias, il rilevamento dei duplicati e la ricerca consapevole degli alias diventano molto più efficaci.

**Perché vedo pagine duplicate come "CoT" e "思维链"?**
Le versioni precedenti alla v1.7.10 non avevano il rilevamento dei duplicati consapevole degli alias. Esegui **Lint Wiki** → **Merge Duplicates** per fonderle. La pagina unita preserva gli alias di entrambe, prevenendo futuri duplicati.

**Come funziona il rilevamento dei duplicati? (v1.7.10+)**
Rilevamento semantico a due livelli: il Tier 1 (sempre verificato dall'LLM) intercetta corrispondenze tra lingue, abbreviazioni, titoli ad alta similarità. Il Tier 2 riempie il budget di token rimanente con candidati a similarità moderata. Gli alias sono fondamentali per il Tier 1 — esegui **Complete Aliases** se le tue pagine sono precedenti alla v1.7.11.

**Cosa sono le "pagine inquinate"? (v1.9.0)**
Pagine con prefissi di cartella incorporati accidentalmente nei nomi dei file — es. `concepts/concepts布局优化.md`. Esegui **Lint Wiki** → **🧹 Fix Polluted Pages** per rinominarle e aggiornare tutti i collegamenti in entrata.

### ⚡ Prestazioni e costi

**Come accelero l'acquisizione?**
In **Impostazioni → LLM Configuration**: aumenta **Page Generation Concurrency** a 3–5 (creazione parallela delle pagine), riduci **Batch Delay** a 100–300 ms (attenzione ai limiti di frequenza). Scegli "Minima", "Grossolana" o "Standard" per la **Granularità di estrazione** per ridurre il numero di pagine e risparmiare sui costi API.

**Perché ricevo errori HTTP 429?**
Il plugin rileva automaticamente la limitazione di frequenza e suggerisce: ridurre la concorrenza a 1–2, aumentare il Batch Delay a 500–800 ms, oppure passare a un provider con limiti più alti.

**Come controllo i costi API?**
- Auto-Maintenance è disattivata per impostazione predefinita (abilitala solo se ti serve l'elaborazione in background)
- Smart Batch Skip salta automaticamente i file già acquisiti
- Granularità "Standard" o "Grossolana" = meno chiamate LLM
- Batch Delay > 500 ms distanzia le chiamate senza aumentare il consumo di token
- Il report di Lint mostra i conteggi prima di eseguire le correzioni — decidi cosa ne vale la pena

### 🧹 Manutenzione

**Cosa fa Smart Fix All?**
Esegue le correzioni in ordine di causalità (v1.9.0+):
1. 🧹 Correggi le pagine inquinate → 2. 🏷️ Completa gli alias → 3. 🔄 Unisci i duplicati → 4. 🔗 Correggi i collegamenti interrotti → 5. 🔗 Collega le orfane → 6. 📝 Espandi le pagine vuote

**Lint si blocca su un Wiki di grandi dimensioni?**
Aggiorna alla v1.7.17+ — Lint ora cede il controllo al thread dell'interfaccia di Obsidian ogni 50 pagine, prevenendo blocchi di diversi secondi anche su wiki con oltre 1200 pagine.

### 🔍 Risoluzione dei problemi

**Perché non riesco a usare ingest/lint/query dopo l'installazione?**
Il plugin richiede un test di connessione riuscito prima di sbloccare le funzionalità principali. Vai su **Impostazioni → Karpathy LLM Wiki** → scegli un provider → inserisci la chiave API → clicca su **Fetch Models** → seleziona un modello → clicca su **Test Connection**. Una volta visualizzato l'indicatore verde "LLM Ready", tutte le funzionalità sono disponibili. Questo previene fallimenti silenziosi dovuti a provider mal configurati.

**Come annullo un'acquisizione o un lint in corso?**
Clicca sul testo della barra di stato durante un'operazione (mostra "Ingesting... click to cancel"), oppure usa `Ctrl+P` → "Cancel current ingestion". L'operazione si arresta in modo pulito al successivo confine di batch, preservando tutto il lavoro completato.

**Come acquisisco rapidamente il file che sto modificando?**
Clicca sull'icona `sticker` nella barra laterale sinistra, oppure usa `Ctrl+P` → "Ingest current file". Questo salta il selettore di file e acquisisce direttamente la scheda attiva dell'editor.

**Vedo doppie parentesi `[[[[entities/Foo|Foo]]]]` nel mio log.md — come correggo?**
Esegui **Lint Wiki** — lo scanner ora rileva e corregge automaticamente tutti i wiki-link doppiamente annidati nell'intera directory del wiki (incluso log.md) senza alcun costo LLM. Nessuna pulizia manuale necessaria.

**Perché ricevo errori "Overloaded"?**
Il plugin ora riconosce l'errore di sovraccarico 529 di Anthropic come ritentabile. Gli errori di sovraccarico vengono ritentati automaticamente con backoff esponenziale su tutti i provider.

**Perché è stato creato uno stub duplicato quando la pagina esiste già in entities/ o concepts/?**
Il plugin ora usa l'associazione basata su slug — formattazioni diverse dello stesso nome si risolvono nella pagina esistente invece di creare uno stub duplicato.

**Le query non trovano pagine che so esistere?**
Tre cause comuni: (1) Indice obsoleto → **Regenerate index**. (2) Alias mancanti → **Complete Aliases**. (3) Prova una formulazione diversa — l'LLM esegue corrispondenze semantiche, non ricerca per parola chiave.

**Posso modificare manualmente le pagine Wiki?**
Sì. Imposta `reviewed: true` nel frontmatter per proteggerle dalla sovrascrittura. Gli alias, i tag e le sorgenti manuali vengono preservati durante i merge.

**Aggiornamento sicuro?**
Il plugin non modifica mai i tuoi file sorgente. Fai il backup di `wiki/` → aggiorna il plugin → **Regenerate index** → **Lint Wiki** → correggi in modo selettivo.

**I miei file `sources/` sono stati rinominati dopo l'aggiornamento a v1.20.3 — c'è un problema? (v1.20.3+)**
No — è in azione la nuova impronta digitale anti-collisione degli slug delle pagine sorgente. Ogni `sources/<slug>.md` è ora `sources/<nome_base>_<6 hex>.md` (l'hex è un hash FNV-1a del percorso completo del file). File con lo stesso nome base in cartelle diverse (es. 11× `About this course.md` nei corsi Academy) non entrano più in collisione. La ri-acquisizione rinomina le pagine `sources/` esistenti sul posto e tutti i backlink `[[sources/<slug>]]` vengono aggiornati automaticamente. Se hai script esterni o segnalibri che puntano a `sources/<vecchio-slug>.md`, aggiornali ai nuovi percorsi con impronta.

**La ri-acquisizione di una fonte non correlata sovrascriverà una pagina bloccata con `reviewed: true`? (v1.20.3+)**
No — Stage 4 (`updateRelatedPage`) ora rispetta `reviewed: true` e instrada verso il percorso append-only, come il percorso di acquisizione. Il tuo corpo curato sopravvive identico; solo i contenuti genuinamente nuovi vengono aggiunti.

**Il mio modello locale (Ollama, LM Studio) sta fabbricando nomi di entità strani a partire da note vuote o con solo frontmatter. (v1.21.0)**
Corretto in v1.21.0 dal portale di pre-ingestione: le note vuote/blank/solo frontmatter ora vengono rifiutate *prima* di qualsiasi chiamata LLM, e la deduplicazione per hash del contenuto rileva file identici attraverso i percorsi. Aggiorna a v1.21.0+ per eliminare la classe di bug "file vuoto → allucinazione" (modelli piccoli che inventano nomi di entità su un prompt vuoto).

**Come ottengo assistenza?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — segnalazioni di bug
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — domande e feedback

**Come raccolgo i log di debug per la risoluzione dei problemi?**

1. Apri gli Strumenti per sviluppatori (`Ctrl+Shift+I` / `Cmd+Option+I`)
2. Vai alla scheda **Console**
3. Esegui la tua operazione (ingest, query o lint)
4. Cerca messaggi con prefissi di nome modulo come `[Step]`, `[LLM]`, nomi di moduli
5. Per i test locali, usa `pnpm build:dev` invece di `pnpm build` per preservare l'output di debug completo
6. Copia le righe di log rilevanti e includile nella tua issue su GitHub — questo rende molto più rapida la diagnosi dei bug

---

## 🔒 Trasparenza e conformità

Questo plugin è elencato sul Marketplace dei plugin della community di Obsidian ed è sottoposto a una verifica automatizzata di sicurezza e permessi.

**Il plugin non ha backend, nessuna infrastruttura server e nessuna raccolta di dati di alcun tipo.** È software puramente locale eseguito all'interno di Obsidian. Il plugin non può e non raccoglie, archivia o trasmette i tuoi dati ad alcun server — perché tale server non esiste.

**L'accesso alla rete** è usato solo per comunicare con il provider LLM che configuri — non viene effettuata nessun'altra chiamata di rete. Questo è interamente sotto il tuo controllo: scegli il provider, inserisci la chiave API, decidi dove vanno i tuoi dati.

**L'accesso al file system** (enumerazione del vault) è necessario per costruire e mantenere il wiki: leggere le tue note sorgente, generare pagine, scansionare i collegamenti interrotti e rilevare pagine duplicate. Il plugin non modifica mai i tuoi file sorgente — solo i file all'interno della cartella wiki.

**L'accesso agli appunti** è usato esclusivamente dal pulsante "Copy" nella finestra modale Query, e solo quando ci clicchi sopra.

Se preferisci la completa località dei dati, usa un provider LLM locale come Ollama o LM Studio. Con un provider locale, i tuoi dati non lasciano mai la tua macchina.

## 📜 Licenza

Licenza MIT — vedi [LICENSE](../LICENSE).

## 🙏 Ringraziamenti

- **💡 Concetto:** [LLM Wiki di Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — la visione originale che ha ispirato questo plugin
- **🛠️ Piattaforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 Trasporto LLM:** `requestUrl` di Obsidian (Anthropic) + client HTTP compatibile con OpenAI scritto a mano (provider terzi compatibili con OpenAI)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=top-left)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=top-left)
