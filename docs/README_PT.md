![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin para Obsidian

> Base de conhecimento estruturada com IA que consome suas notas e gera uma Wiki conectada — baseada no [LLM Wiki concept de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

> **Pontuação oficial Obsidian 95/100 | Suporte nativo a 10 idiomas | Pesquisa por grafo sem embedding | Soberania total de dados | Compatível com qualquer provedor LLM**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | **Português** | [Italiano](README_IT.md)

[Site oficial](https://llmwiki.greenerai.top/) | [Mercado Obsidian](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback e discussão](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorar código com DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD) ← Se este plugin te ajudou, pague-me um café♥️ ou deixe uma estrela🌟↗

---

> **⚡ Aviso de atualização rápida：** Este projeto evolui rapidamente – correções de bugs, melhorias de desempenho, novos recursos e otimizações de UX são lançados com frequência. Recomendamos atualizar regularmente no Obsidian (**Configurações → Plugins da comunidade → Verificar atualizações**) ou ativar a atualização automática de plugins.
## 📑 Contents

- [🧠 Karpathy LLM Wiki Plugin para Obsidian](#-karpathy-llm-wiki-plugin-para-obsidian)
  - [📑 Contents](#-contents)
  - [💡 O que é LLM-Wiki?](#-o-que-é-llm-wiki)
  - [⚡ Por que Obsidian + LLM-Wiki?](#-por-que-obsidian--llm-wiki)
  - [🚀 Início rápido](#-início-rápido)
    - [📦 Instalação](#-instalação)
    - [🔄 Atualização](#-atualização)
    - [🔑 Configurar um provedor LLM](#-configurar-um-provedor-llm)
    - [🎮 Uso](#-uso)
    - [⚠️ Atualizando de uma versão anterior?](#️-atualizando-de-uma-versão-anterior)
  - [⚡ Novidades da v1.24.0](#-novidades-da-v1240)
  - [✨ Funcionalidades](#-funcionalidades)
    - [📊 Qualidade do Conhecimento](#-qualidade-do-conhecimento)
    - [📄 Ingestão de PDF (v1.25.0)](#-ingestão-de-pdf-v1250)
    - [💬 Consulta e Feedback](#-consulta-e-feedback)
    - [🛠️ Manutenção](#️-manutenção)
    - [🌐 LLM e Idioma](#-llm-e-idioma)
    - [🏗️ Arquitetura e Desempenho](#️-arquitetura-e-desempenho)
    - [🔒 Privacidade e segurança](#-privacidade-e-segurança)
  - [📖 Exemplo](#-exemplo)
  - [🤖 Guia de Seleção de Modelo](#-guia-de-seleção-de-modelo)
    - [☁️ Modelos em nuvem](#️-modelos-em-nuvem)
    - [🦙 Modelos locais (Ollama / LM Studio)](#-modelos-locais-ollama--lm-studio)
    - [📄 Caminho OCR PDF local (v1.25.0+)](#-caminho-ocr-pdf-local-v1250)
  - [🏗️ Arquitetura](#️-arquitetura)
  - [❓ Perguntas Frequentes (FAQ)](#-perguntas-frequentes-faq)
  - [🔒 Transparência e conformidade](#-transparência-e-conformidade)
  - [💖 Apoiar o projeto](#-apoiar-o-projeto)
    - [Patrocinadores](#patrocinadores)
  - [📜 Licença](#-licença)
  - [🙏 Agradecimentos](#-agradecimentos)
  - [Star History](#star-history)

## 💡 O que é LLM-Wiki?

Você escreve. A IA organiza. Você pergunta. Simples assim.

**🎯 O problema.** Suas notas são uma mina de ouro — pessoas, conceitos, ideias, conexões. Mas agora são apenas arquivos em pastas. Encontrar relações exige buscar, etiquetar e confiar na memória.

**✨ A solução.** [Andrej Karpathy propôs](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) uma abordagem elegante: trate suas notas como matéria-prima e deixe que um LLM atue como arquiteto. Ele lê o que você escreve, extrai Entity e Concept, e os tece em uma Wiki estruturada — completa com `[[bidirectional links]]`, índice gerado automaticamente e interface de chat que responde perguntas baseadas no *seu* conhecimento.

**📚 Você não precisa ser o bibliotecário.** Não decidir o que merece uma página. Não manter links cruzados. Não questionar se algo está desatualizado. Escolha qualquer nota (ou pasta, ou seleção múltipla) do seu vault — o LLM lê, extrai, escreve, vincula e sinaliza contradições — enquanto você permanece no fluxo.

**🤖 Não é apenas outro chatbot.** O ChatGPT conhece a internet. O LLM-Wiki conhece *você* — ou melhor, o que você lhe ensinou. Cada resposta inclui `[[wiki-links]]` de volta ao seu knowledge graph. Cada resposta é um ponto de partida, não um beco sem saída.

---

## ⚡ Por que Obsidian + LLM-Wiki?

Obsidian é brilhante no pensamento conectado. Mas há um problema: quem faz todas as conexões é você.

O LLM-Wiki inverte isso. Em vez de você construir o grafo manualmente, a IA o desenvolve junto com você. Adicione uma nota sobre um novo conceito — ela encontra as conexões que você perderia. Faça uma pergunta — ela percorre seu próprio grafo de conhecimento e retorna respostas com citações.

- **🔗 Seu Graph View ganha vida.** Novas notas não ficam apenas paradas — elas germinam links para entidades, conceitos e fontes. O grafo cresce organicamente, e o plugin o mantém: detectando duplicatas, corrigindo links mortos, conectando idiomas por meio de aliases.
- **💬 Suas notas aprendem a conversar.** A busca se torna conversa. "O que eu escrevi sobre X?" vira um diálogo, com respostas em streaming e `[[wiki-links]]` como migalhas de pão. Cada resposta é um caminho mais profundo em seu próprio conhecimento.
- **🧠 Obsidian se torna um parceiro de pensamento.** Ele deixa de ser um armário de notas e passa a ser algo que ajuda você a *pensar* — revelando conexões ocultas, sinalizando contradições, lembrando o que você esqueceu que sabia.

---

## 🚀 Início rápido

### 📦 Instalação

**🌟 Recomendado — Mercado de plugins comunitários do Obsidian:**
1. No Obsidian, vá em **Configurações → Plugins da comunidade**
2. Clique em **Procurar** e pesquise por "Karpathy LLM Wiki"
3. Clique em **Instalar**, depois **Ativar**

**🌐 Ou pelo site de plugins comunitários —** visite [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) e clique em **Add to Obsidian**.

**⚙️ Manual (alternativa):**
1. Baixe `main.js`, `manifest.json`, `styles.css` nas [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. No Obsidian, vá em Configurações → Plugins da comunidade. Clique no ícone de pasta para abrir o diretório de plugins
3. Crie uma pasta chamada `karpathywiki`, coloque os três arquivos dentro
4. De volta ao Obsidian, clique no ícone de atualizar — **Karpathy LLM Wiki** aparecerá
5. Ative-o para habilitar

**🔨 Desenvolvimento:** `git clone`, `pnpm install`, `pnpm build`.

### 🔄 Atualização

Este projeto evolui rapidamente. Recomendamos manter-se atualizado:

**Opção A — Atualização manual (recomendada):**
1. Vá em **Configurações → Plugins da comunidade**
2. Clique em **Verificar atualizações**
3. Encontre **Karpathy LLM Wiki** e clique em **Atualizar**

**Opção B — Ativar atualização automática:**
1. Vá em **Configurações → Plugins da comunidade**
2. Ative **Verificar automaticamente atualizações de plugins**

> 💡 **Por que manter-se atualizado?** Cada versão pode incluir novos recursos, melhorias de desempenho e correções de bugs importantes.

### 🔑 Configurar um provedor LLM

1. Abra Configurações → Karpathy LLM Wiki
2. Escolha um provedor no menu suspenso
3. Insira sua chave API (não necessária para Ollama)
4. Clique em **Fetch Models**, ou digite o nome de um modelo manualmente
5. Clique em **Test Connection**, depois **Salvar configurações**

**🦙 Ollama (local):** Instale o [Ollama](https://ollama.com), baixe um modelo, selecione "Ollama (Local)".

**🎛️ LM Studio (local):** Instale o [LM Studio](https://lmstudio.ai), inicie o servidor local, selecione "LM Studio (Local)".

### 🎮 Uso

| Método | Como |
|--------|------|
| **📥 Ingerir fonte individual** | `Cmd+P` → "Ingest single source" — selecione uma nota (Markdown ou **PDF, v1.25.0+**) para gerar páginas Wiki com entidades e conceitos |
| **📂 Ingerir de pasta** | `Cmd+P` → "Ingest from folder" — selecione uma pasta para gerar Wiki em lote |
| **📑 Ingerir vários ficheiros** | `Cmd+P` → "Ingest multiple files" — escolha notas via árvore de pastas + caixas, ingestão em lote (com fila + cancel por ficheiro) |
| **🎯 Ingerir ficheiro atual** | Clique no ícone `sticker` da fita esquerda, ou `Cmd+P` → "Ingest current file" |
| **🔍 Consultar Wiki** | `Cmd+P` → "Query wiki" — Q&A conversacional com streaming e `[[wiki-links]]` |
| **🛠️ Verificar Wiki** | `Cmd+P` → "Lint wiki" — verificação completa: duplicados, links quebrados, páginas vazias, órfãos, alias ausentes, contradições |
| **📋 Regenerar índice** | `Cmd+P` → "Regenerate index" — reconstrói `wiki/index.md` com entradas de alias |
| **📊 Histórico de ingestão (v1.21.0)** | `Cmd+P` → "View Ingestion History" — explore ingestões, relatórios Lint e manutenções |
| **⏹ Cancelar operação** | `Cmd+P` → "Cancel current ingestion" — para com segurança no próximo limite de lote |
| **🎉 Recriar nota de boas-vindas (v1.23.0)** | `Cmd+P` → "Recreate Wiki Welcome Note" — regenera a nota de boas-vindas |

A re-ingestão da mesma fonte funde novas informações de forma incremental. Os resumos são regenerados.

> 💡 **Smart Batch Skip:** Ao ingerir uma pasta, o plugin deteta e salta automaticamente ficheiros já processados — poupa tempo e custos de API.

![Paleta de comandos — pesquise "karpa" para ver todos os comandos](assets/command-panel.png)

### ⚠️ Atualizando de uma versão anterior?

> 🔧 **Atualizando de v1.24.x.** A ingestão de PDF (v1.25.0) escreve o seu cache em `.obsidian/plugins/karpathywiki/pdf-cache/` (até 100 MB / 1000 entradas / 10 MB por entrada individual; evasão LRU-by-mtime na inicialização e no início de cada ingestão em lote). O seu vault **não é modificado por padrão** — ative **Write PDF Markdown to Vault** (Settings → Wiki Configuration → Wiki Folder) apenas se quiser um sidecar `<basename>.pdf.md` ao lado do PDF fonte. Duas novas definições — **Force PDF Support** (avançado, desativado por padrão) e **Write PDF Markdown to Vault** (desativado por padrão) — são totalmente retrocompatíveis: um `data.json` antigo sem estes campos volta a `false`.

> 🔧 **Atualizando de v1.24.0.** O marcador de comentário interno `<!-- reviewed: keep -->` (v1.24.0, #244), que protegia apenas a seção *Menções na Source* de uma página, foi removido. Para preservar uma seção de Menções curada manualmente, defina `reviewed: true` no frontmatter da página: ela protege a página inteira (Menções incluídas) e, ao contrário do comentário oculto, permanece visível no painel de Propriedades e resiste a linters de Markdown.

**Retrocompatível.** Sem mudanças incompatíveis desde v1.0.0 — as suas páginas Wiki, configurações e fluxos de trabalho existentes são preservados sem reconfiguração.

**Após atualizar**, execute **Lint Wiki** → **Smart Fix All** para reparação automática:
1. 🏷️ Completar aliases (LLM gera traduções, abreviaturas, nomes alternativos)
2. 🔄 Fundir duplicados (multilingue, abreviaturas, alta similaridade)
3. 🔗 Reparar links quebrados / vincular órfãos / expandir páginas vazias

Depois **Regenerar índice** para reconstruir `wiki/index.md` com entradas de alias.

> 📖 Guias detalhados para saltos de versão específicos em [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions).

**Configurações a rever:** Force PDF Support (Settings → LLM Configuration → Advanced, desativado por padrão — apenas relevante para provedores não NATIVE), Write PDF Markdown to Vault (Settings → Wiki Configuration → Wiki Folder, desativado por padrão), Idioma de saída da Wiki, Granularidade de extração, Concorrência (padrão 3), Atraso de lote (padrão 300ms).

---
## ⚡ Novidades da v1.25.0

Quatro temas: ingestão de PDF apenas em cache, recomendações de modelos locais, centralização do prompt transcodificador de PDF e oito correções de bugs e2e. Atualização recomendada para todos os utilizadores de v1.24.x.

- **📄 Ingestão de PDF (Nível 1).** Escolha um PDF do seu vault — o plugin lê-o através da entrada nativa de ficheiro do seu provedor LLM (anthropic / openai / bedrock-anthropic / bedrock-openai; qualquer outro endpoint compatível com OpenAI/Anthropic requer **Force PDF Support** em Settings → LLM Configuration → Advanced), converte-o para Markdown através de transcrição literal estilo OCR, e reentra no pipeline padrão de ingestão Markdown. Todos os fluxos existentes de entidade/conceito/alias/`[[wiki-link]]` aplicam-se inalterados. O resultado é **armazenado em cache por hash de conteúdo** em `.obsidian/plugins/karpathywiki/pdf-cache/` (a chave embute `converterVersion` para invalidar automaticamente entradas obsoletas quando o prompt é atualizado). Consulte o [Caminho OCR PDF local](#-caminho-ocr-pdf-local-v1250) para a configuração recomendada em Apple Silicon.
- **🗄️ Crescimento limitado do cache.** Housekeeping de cache em três camadas de defesa (100 MB total / 1000 entradas / 10 MB por entrada individual) com evasão LRU-by-mtime; as entradas antigas são purgadas na inicialização e no início de cada ingestão em lote. Apenas cache — o seu vault não é modificado por padrão.
- **📝 Sidecar opcional no vault (avançado).** Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** escreve um `<basename>.pdf.md` ao lado do PDF fonte após a conversão. Desativado por padrão.
- **🦙 Recomendações de modelos locais.** A secção Guia de Seleção de Modelo foi dividida em secções separadas de local e nuvem cobrindo Qwen3.5 / Qwen3.6 / Gemma 4 (tradeoffs parâmetro vs qualidade, quantização MLX vs GGUF, estratégia de contexto).
- **🛡️ Prompt transcodificador de PDF literal.** O prompt PDF→Markdown foi reformulado como conversão literal estilo OCR com marcadores anti-alucinação `[illegible]` / `[figure: ...]` / `[equation: ...]`; modelos pequenos/locais que envolvem a sua saída em fences ```markdown são limpos automaticamente antes da escrita em cache. Prompt centralizado em `src/wiki/prompts/pdf.ts` ao lado dos restantes prompts de chamadas LLM do projeto.
- **⏹ Ingestão de PDF cancelável.** Clicar na barra de estado durante a conversão interrompe a chamada LLM em curso via AbortSignal da Vercel AI SDK v6 em cerca de 200 ms.
- **🌐 Completude i18n** — 10 novas chaves por locale para as duas novas definições, ingestão de PDF, e Caminho OCR PDF local (toggle Force PDF Support, toggle Write PDF Markdown to Vault, Notice source-rejected-pdf-unsupported).

**Definições a rever:** Force PDF Support (Settings → LLM Configuration → Advanced, desativado por padrão — apenas relevante para provedores não NATIVE), Write PDF Markdown to Vault (Settings → Wiki Configuration → Wiki Folder, desativado por padrão — sidecar opcional).

### v1.24.1 — 2026-07-14 (PATCH)

Atualização recomendada para todos os utilizadores de v1.24.0.

- **🔍 Cascata de seleção de sementes PPR em 5 etapas.** O Query Wiki executa agora cinco etapas complementares antes de gerar uma resposta (caminho rápido Lex → palavras-chave LLM → varredura local de substrings → fallback LLM KB → expansão de grafo PPR). Perguntas multi-hop obtêm contexto consciente do grafo sem opt-in de embeddings.
- **🤫 Caminho silencioso para respostas vazias.** O `parseJsonResponse` já não regista erros ruidosos para corpos LLM vazios nos caminhos Lint/Query, corrigindo o spam de consola reportado por alguns utilizadores (#255, #274). O seletor de sementes também lança mais cedo com corpos vazios para recuperação mais clara (#275).
- **🧹 Páginas de entidades mais limpas.** O bloco redundante `## Basic Information` / `## Basic Info` foi removido dos prompts e do esquema de geração de páginas de entidades; as novas páginas de entidades vão diretamente do frontmatter para H1 → descrição → secções relacionadas (#258).
- **☁️ Provedores Bedrock Stage 1.** Adicionadas as opções `bedrock-anthropic` e `bedrock-openai` encaminhadas através do endpoint AWS bedrock-mantle. Zero novas dependências npm, bundle ~+3 KB.
- **🦙 Ingestão LM Studio sem chave API.** A ingestão funciona agora com a chave API vazia do LM Studio, tal como o teste de ligação.
- **🏗️ Limpezas internas.** O `page-factory.ts` foi dividido em 10 módulos focados (+99 testes); a re-ingestão não destrutiva de Mentions preserva as citações de fontes anteriores na fusão (#267).

**Nota de atualização:** Se adicionou manualmente marcadores `<!-- reviewed: keep -->` na v1.24.0, mude para o frontmatter `reviewed: true` — protege toda a página e sobrevive a linters Markdown.

## ✨ Funcionalidades

### 📊 Qualidade do Conhecimento

- **🔍 Extração de Entity/Concept** — LLM extrai Entity (pessoas, orgs, produtos, eventos) e Concept (teorias, métodos, termos) de suas notas com granularidade de extração flexível (Mínima~5 itens, Grossa~10, Padrão~50, Fina~100, Personalizada 1–500) para equilibrar profundidade de análise e custos de API
- **🏷️ Aliases Obrigatórios** — Cada página gerada inclui pelo menos 1 alias (tradução, sigla, nome alternativo), permitindo detecção de duplicados entre idiomas
- **🔄 Detecção e Mesclagem de Duplicados** — Classificação semântica captura duplicados reais (traduções entre idiomas, abreviações, variantes de grafia); mesclagem inteligente por LLM funde conteúdo e preserva aliases
- **🧩 Fusão Inteligente de Conhecimento** — Atualizações multi-source mesclam nova informação sem redundância, contradições preservadas com atribuição, páginas `reviewed: true` protegidas de sobrescrita
- **📏 Proteção contra Truncamento de Conteúdo** — 8000 max_tokens com detecção automática de stop_reason e tentativa em 2× tokens em todos os providers
- **📝 Menções Verbatim de Source** — Citações em idioma original preservadas com tradução opcional para rastreabilidade

- **🎨 Vocabulário de tags personalizável (v1.18.0).** Configurações → Wiki → Modo de vocabulário de tags → *Personalizado* permite definir suas próprias listas de tags de tipo de entidade e conceito (por exemplo, `Medical_Arzneimittel`, `法规`). O plugin respeita seu vocabulário nos prompts de extração e na validação de frontmatter; a auditoria Lint (Issue #85 v7) reporta qualquer página cujas tags estejam fora do vocabulário ativo.

### 📄 Ingestão de PDF (v1.25.0)

Escolha um PDF do seu vault — o plugin lê através da entrada nativa de arquivo do seu provedor LLM, converte para Markdown e reentra no pipeline padrão de ingestão Markdown. Todos os fluxos existentes de entidade/conceito/alias/`[[wiki-link]]` se aplicam inalterados.

- **🔌 Porta de provedor** — Anthropic, OpenAI, Bedrock Anthropic e Bedrock OpenAI tratam PDF nativamente. Para qualquer outro endpoint compatível com OpenAI/Anthropic, ative **Force PDF Support** em Settings → LLM Configuration → Advanced para que o plugin tente a chamada (seu endpoint decide; falhas surgem como Notice localizado que orienta a desativar o toggle). A configuração local recomendada está em [Caminho OCR PDF local](#-caminho-ocr-pdf-local-v1250).
- **🗄️ Cache por hash de conteúdo** — PDF + modelo + versão de conversor idênticos retornam o Markdown em cache sem chamada LLM. O cache vive em `.obsidian/plugins/karpathywiki/pdf-cache/`; a chave embute `converterVersion` para invalidar automaticamente entradas obsoletas em upgrades de prompt.
- **📏 Crescimento limitado** — housekeeping de cache em três camadas de defesa (100 MB total / 1000 entradas / 10 MB por entrada individual) com evasão LRU-by-mtime; entradas antigas são purgadas na inicialização e no início de cada ingestão em lote. Apenas cache — seu vault não é modificado por padrão.
- **📝 Sidecar opcional no vault** — Settings → Wiki Configuration → Wiki Folder → **Write PDF Markdown to Vault** escreve um `<basename>.pdf.md` ao lado do PDF fonte após a conversão. Desativado por padrão (apenas cache).
- **🛡️ Prompt transcritor literal** — o prompt de PDF→Markdown é reformulado como conversão literal estilo OCR com marcadores anti-alucinação `[illegible]` / `[figure: ...]` / `[equation: ...]`; modelos pequenos/locais que envolvem sua saída em fences ```markdown são limpos automaticamente antes da escrita em cache.
- **⏹ Cancelável** — clicar na barra de status durante a conversão interrompe a chamada LLM em curso (via Vercel AI SDK v6).

### 💬 Consulta e Feedback

- **🔍 Cascata de seleção de sementes PPR em 5 etapas (v1.24.1 PATCH).** Quando você faz uma pergunta multi-hop, o Query Wiki compõe a resposta por meio de cinco etapas complementares antes que qualquer geração comece:
  1. **Caminho rápido Lex** — verificação direta de sobreposição de tokens contra cada título/alias de entity/concept (grátis, instantâneo; gateia as etapas seguintes)
  2. **Geração de palavras-chave LLM** — o LLM propõe 8–12 palavras-chave inter-idiomas a partir da sua consulta (absorve sinônimos, abreviações, termos resistentes à sobreposição de tokens)
  3. **Varredura local de substrings** — cada palavra-chave gerada é re-casada localmente contra títulos de página, aliases e trechos de corpo (sem chamada LLM extra; completa o recall tolerante a ruído)
  4. **Fallback LLM KB** — quando lex + varredura de palavras-chave retornam sinais fracos, o LLM re-semeia os top-N candidatos com uma passagem semântica sobre o wiki inteiro
  5. **Expansão de grafo PPR** — Personalized PageRank (Haveliwala 2002) executado sobre o grafo `[[wiki-link]]` a partir do conjunto de sementes candidatas; fornece ao LLM o contexto multi-hop ciente do grafo que a busca linear não alcança

  A cascata se trunca automaticamente na etapa que devolver sinal suficiente — sem custo fixo de 5 etapas, sem chamadas LLM quando Lex basta, sem perda de precisão quando a augmentação LLM é necessária. A relevância end-to-end (PPR @5 = 27,1% no corpus de benchmark interno do projeto) supera as linhas-base knn puras (24,1%) sem opt-in de embedding. Stage 1.5 (passos 2–3) absorve os tipos de pergunta multi-hop que o Lex puro perde; Stage 1.7 (passo 4) recupera sinais fracos de palavras-chave injetadas pelo LLM; Stage 1.9 (passo 5) garante que o LLM veja contexto vizinho em vez de uma top-N plana. Substitui a antiga cascata binária por camadas.

- **🤖 Consulta Conversacional** — Diálogo estilo ChatGPT com Markdown em streaming e `[[wiki-links]]`, histórico multi-turn
- **🪟 Painel lateral acoplado à direita (v1.22.1, PR #196).** Query Wiki abre em um leaf do sidebar direito estilo Copilot (reutilizando um leaf existente) em vez de um popup centralizado. O ícone ribbon `message-circle` e o comando `Query Wiki` ativam/exibem o painel; suas notas ficam visíveis ao lado da conversa. Toda a funcionalidade é preservada sem alterações.
- **📤 Query-to-Wiki Feedback** — Salve conversas valiosas para a Wiki com extração de Entity/Concept, deduplicação semântica antes de salvar
- **🔒 Prevenção de Salvamento Duplicado** — Rastreamento por hash evita reavaliação de conversas inalteradas

### 🛠️ Manutenção

- **🔍 Lint Health Scan** — Detecta duplicados, dead links, páginas vazias, órfãos, aliases ausentes e contradições em um relatório abrangente
- **🎯 Detecção de Duplicados por Camada Semântica** — Camada 1 (correspondências diretas de nome: entre idiomas, abreviações, títulos de alta similaridade) sempre verificada; Camada 2 (sinais indiretos: links compartilhados, similaridade moderada) preenche o orçamento de tokens
- **⚡ Smart Fix All** — Correção em lote ordenada por causalidade: aliases completados → duplicados mesclados → dead links resolvidos → órfãos vinculados → páginas vazias expandidas
- **🏷️ Completude de Aliases** — Geração em lote paralela de aliases ausentes em um clique, melhorando a detecção futura de duplicados
- **🔄 Auto-Manutenção** — Observador de arquivos multi-pasta, lint periódico, verificação de saúde na inicialização (Startup Quick Fixes ativado por padrão, File Watcher e Periodic Lint desativados por padrão)
- **⚠️ Máquina de Estados de Contradição** — `detected → review_ok → resolved` (correção por IA) ou `detected → pending_fix` (manual)
- **🛡️ Portal de pré-ingestão (v1.21.0)** — Cada arquivo de origem é validado *antes* de qualquer chamada LLM: notas vazias/em branco/somente frontmatter são rejeitadas; a deduplicação por hash de conteúdo detecta arquivos idênticos entre caminhos. Impede que modelos locais alucinem nomes de entidades em entradas vazias.
- **📊 Painel de histórico de operações (v1.21.0)** — UI pesquisável e filtrável para ingestões passadas, relatórios de lint e execuções de manutenção, com cartões KPI orientados por insights e links clicáveis para páginas.
- **🧹 Limpador de páginas incompletas (v1.21.0)** — Páginas deixadas em estado parcial após ingestões interrompidas são arquivadas automaticamente na inicialização (recuperáveis da `.trash` do Obsidian).

### 🌐 LLM e Idioma

- **🔌 Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, endpoints custom
- **🔄 5xx Retry** — Tentativa automática de exponential backoff (máx. 2) em erros HTTP 5xx/429/529 em todos os clientes
- **📋 Lista Dinâmica de Modelos** — Busca em tempo real das APIs dos providers
- **🌐 Idioma de Saída Wiki** — 10 idiomas independentes da UI (EN/ZH simplif/ZH trad/JA/KO/DE/FR/ES/PT/IT), com entrada customizada.
- **🌍 Internacionalização completa da UI** — Interface do plugin em 10 idiomas (EN/ZH simplif/ZH trad/JA/KO/DE/FR/ES/PT/IT), 269+ campos UI totalmente traduzidos, expressões locais naturais.
- **⚡ Rate Limit Guardian** — Quando geração paralela ativa rate limits, auto-detecção e sugestões: reduzir concorrência, aumentar delay batch, trocar provider
- **🦙 Web Clipper Compatible** — Adicionar com um clique o folder `Clippings/` do Obsidian Web Clipper à watchlist, clips web auto-ingestados no Wiki

### 🏗️ Arquitetura e Desempenho

- **🕸️ PPR sobre o grafo [[wiki-link]] (v1.24.0+, amadurecido em v1.24.1 PATCH).** Personalized PageRank (Haveliwala 2002) executa sobre o grafo direcionado de arestas `[[wiki-link]]` entre suas páginas wiki; a cascata ancora as sementes PPR no conjunto de candidatos top-N, e o contexto multi-hop percorre até 3 anéis de expansão. É isso que torna as respostas do Query Wiki cientes do grafo (uma pergunta "fundadores da Microsoft" se resolve via Bill Gates → Microsoft → concorrentes, não só por sobreposição literal de títulos). Vaults de 2.137 páginas costumam ver <100 ms para warm + expansão de 3 saltos, independentemente do tamanho do vault. Usado pelas 4 etapas da cascata de seleção de sementes (seção Consulta e Feedback acima) e pela detecção de duplicados do Lint quando links indiretos conectam duas páginas candidatas.
- **⚡ Geração de Páginas Paralela** — 1–5 páginas simultâneas configuráveis, padrão 3 (paralelo), 2–3× mais rápido para sources grandes, isolamento de erro por página
- **📚 Extração em Lote Iterativa** — Dimensionamento adaptativo de lotes elimina o gargalo de max_tokens para documentos longos
- **🏛️ Arquitetura de Três Camadas** — Suas notas do vault (somente leitura) → `wiki/` (páginas geradas pelo LLM, organizadas como `wiki/sources/`, `wiki/entities/`, `wiki/concepts/`) → `schema/` (config co-evoluída)
- **🧩 Código Modular** — 20+ módulos focados em `src/`

### 🔒 Privacidade e segurança

- **Sem backend, sem telemetria.** O plugin é executado inteiramente dentro do Obsidian — não há servidor externo, análise ou coleta de dados de qualquer tipo. Suas notas nunca saem do seu cofre, a menos que você configure explicitamente um provedor LLM.
- **Seus dados permanecem locais por padrão.** O plugin não armazena, armazena em cache ou transmite seu conteúdo para qualquer lugar além da API LLM que você escolher. Apenas o texto que você envia para ingestão ou consulta sai do seu dispositivo — e apenas para o provedor que você configurou.
- **Modo totalmente local com Ollama, LM Studio ou provedores locais.** Para total soberania de dados, use um LLM executado localmente. Suas notas são processadas inteiramente na sua máquina — nada toca a Internet.
- **Permissões mínimas.** O acesso aos arquivos do cofre é necessário para a gestão do wiki (ler notas, gerar páginas, detetar links mortos). O acesso à rede é usado exclusivamente para chamadas da API LLM ao provedor que você escolheu. O acesso à área de transferência limita-se ao botão "Copiar" no modal de Consulta — apenas quando você clica nele.

---


---

---

## 📖 Exemplo

**Entrada:** `sources/machine-learning.md`

```markdown
### Machine Learning
Machine learning usa algoritmos para aprender com dados.

### Tipos
- Supervised learning
- Unsupervised learning
- Reinforcement learning
```

**Saída — Entity Page:** `wiki/entities/supervised-learning.md`

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

### Informações Básicas
- Tipo: method
- Source: [[sources/machine-learning]]

### Descrição
Supervised learning é um paradigma de machine learning onde modelos aprendem
de dados de treinamento rotulados para fazer previsões sobre dados não vistos...

### Concept Relacionados
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

### Entity Relacionados
- [[entities/Arthur-Samuel|Arthur Samuel]]

### Menções na Source
- "Supervised learning usa dados rotulados para treinar modelos preditivos..."
```

---

## 🤖 Guia de Seleção de Modelo

Este plugin segue a filosofia de Karpathy: **alimente o LLM com contexto Wiki completo, não com RAG retrieval fragmentado**. Modelos de longo contexto são fortemente recomendados — quanto maior sua Wiki cresce, mais contexto o LLM precisa.

> 💡 **Por que não RAG?** A [crítica original](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) de Karpathy argumenta que RAG fragmenta o conhecimento e quebra a capacidade do LLM de raciocinar através do knowledge graph completo.

**🌟 Principais recomendações:**

### ☁️ Modelos em nuvem

| Nível | Modelo | Janela de Contexto | Por quê |
|-------|--------|-------------------|---------|
| **🌟 Custo-benefício** | **DeepSeek V4-Flash** | 1M tokens | Preço mais baixo ($0.14/M), 284B MoE, ideal para ingestão batch |
| **🌟 Custo-benefício** | **Gemini-3.5-Flash** | 1M tokens | 4× mais rápido que GPT-5.5, excelente para tarefas agent |
| **🌟 Custo-benefício** | **Qwen3.6-Plus** | 1M tokens | Forte capacidade coding & agent, preço competitivo |
| **🌟 Custo-benefício** | **Grok-4** | 2M tokens | xAI 2025-07 flagship, 2M context, strong reasoning & code tasks |
| **Balanceado** | **Claude Sonnet 4.6** | 1M tokens | Bom equilíbrio qualidade/custo, $3/$15 por milhão de tokens |
| **Leve** | **Claude Haiku 4.5** | 200K tokens | Rápido e econômico, para wikis pequenos |
| **Econômico** | **Xiaomi MiMo-V2.5** | 1M tokens | Xiaomi 310B/15B MoE, open-source MIT 2026-04, agente e multimodal |
| **Flagship** | Claude Opus 4.7 | 1M tokens | Qualidade máxima, custo alto — usar seletivamente |
| **Flagship** | GPT-5.5 | 1M tokens | Raciocínio top, custo alto — usar seletivamente |

### 🦙 Modelos locais (Ollama / LM Studio)

A inferência local vence em soberania de dados, uso offline e custo zero de API. O custo é uma janela de contexto menor (geralmente entre 8K–128K; famílias open-weight recentes chegam a 262K) e seguimento de instruções mais fraco em comparação com modelos flagship em nuvem. **Escolha conforme o orçamento de hardware:** mais parâmetros = mais conhecimento de mundo e fidelidade às instruções (extração de melhor qualidade, menos alucinações); menos parâmetros = mais velocidade e folga de memória, ao preço de mais alucinações e raciocínio de longo contexto mais fraco. O sweet spot em 24 GB Apple Silicon ou uma única GPU de consumo é a classe 27B–35B-A3B.

| Modelo | Parâmetros | Contexto | Por quê |
|--------|------------|----------|---------|
| **Qwen3.5 27B** | 27B dense | 262K | Melhor equilíbrio qualidade/tamanho para ingestão; MLX 4-bit cabe em 24 GB |
| **Qwen3.5 35B-A3B** | 35B total / 3B ativos MoE | 262K | Mais rápido que 27B dense com qualidade similar; economia de memória ideal |
| **Qwen3.5 122B-A10B** | 122B / 10B MoE | 262K | Teto de qualidade; requer ≥48 GB VRAM ou dual GPU |
| **Qwen3.6 27B** | 27B dense | 256K+ | Refresh 2026-04 sobre o Qwen3.5 27B — prefira este se o hardware aguentar |
| **Qwen3.6 35B-A3B** | 35B / 3B MoE | 262K | Mesmo trade-off do Qwen3.5 35B-A3B, com pesos mais novos |
| **Gemma 4 31B IT** | 31B dense | 262K | Forte seguimento de instruções, saída Markdown limpa |
| **Gemma 4 26B A4B IT** | 26B / 4B MoE | 262K | Menos memória que 31B dense com qualidade comparável |
| **Gemma 4 E2B / E4B IT** | 2B / 4B | 131K | Executável em CPU pura; só para wikis pequenos ou pré-visualizações rápidas |

**Quantização:** MLX 4-bit em Apple Silicon costuma ser 1,5–2× mais rápido que GGUF Q4_K_M na mesma taxa de bits efetiva. GGUF Q4_K_M é a escolha padrão multiplataforma; só passe para Q5/Q8 se você tiver folga de VRAM e notar regressão de qualidade em Q4.

**Estratégia de contexto:** quando a Wiki ultrapassa ~500 páginas, um modelo local de 262K ainda cobre a maior parte do contexto montado pelo motor de Query, mas a ingestão de um vault de 2000 páginas o ultrapassará. Padrão comum: nuvem para ingestão + local para query. Para setups totalmente locais, a classe 27B/35B-A3B é o sweet spot.

### 📄 Caminho OCR PDF local (v1.25.0+)

A ingestão de PDF da v1.25.0 funciona com qualquer provedor que aceite PDF como parte de arquivo. Para um pipeline totalmente local em Apple Silicon (a única plataforma que o oMLX suporta atualmente), esta é a configuração recomendada:

1. Instale o [oMLX](https://github.com/jundot/omlx) e habilite o backend **Markitdown** integrado (conversão local PDF→Markdown).
2. Carregue **Baidu Unlimited-OCR** (open-source em 22/06/2026, 3B total / 0,5B ativos, OCR de ponta a ponta que trata documentos longos sem o modo de falha "quanto mais gera, mais lento fica" dos modelos OCR antigos) como modelo de visão no oMLX.
3. Neste plugin: selecione o provedor **Custom OpenAI-Compatible** (o oMLX fala o protocolo compatível com OpenAI), aponte a Base URL para o servidor local do oMLX, ative **Force PDF Support** em Settings → LLM Configuration → Advanced, e escolha o modelo multimodal servido pelo oMLX para o resumo da ingestão.

O PDF nunca sai da sua máquina — o Markitdown faz a conversão estrutural localmente, o Unlimited-OCR faz o reconhecimento visual localmente, e o LLM local faz o resumo localmente. O cache do plugin (`.obsidian/plugins/karpathywiki/pdf-cache/`) mantém as re-ingerções instantâneas.

**Fallback:** se o oMLX/Markitdown não estiver disponível (Linux/Windows ou Macs antigos), aponte **Force PDF Support** diretamente para um LLM multimodal local que aceite partes de arquivo PDF — a qualidade é boa quando o modelo é grande o suficiente, mas a demanda por VRAM escala de forma acentuada com o número de páginas.

**🔌 Anthropic Compatible (Coding Plan):** Se seu provider oferece um endpoint de API compatível com Anthropic, selecione "Anthropic Compatible" e insira o Base URL e API Key do seu provider.

**🦙 Ollama (local, sem chave API):** Instale o [Ollama](https://ollama.com), baixe um modelo (`ollama pull gemma4` ou `ollama pull qwen3.5:27b`), selecione "Ollama (Local)" no menu de providers.

**🎛️ LM Studio (local, sem chave API):** Instale o [LM Studio](https://lmstudio.ai), inicie seu servidor local (padrão `http://localhost:1234/v1`), selecione "LM Studio (Local)" no menu de providers. O LM Studio executa um servidor compatível com OpenAI integrado — o campo de chave API é opcional.

> 💡 **Planos de assinatura:** Se você tem planos tipo Coding Plan, OpenAI Pro ou Anthropic Pro, são excelentes opções para controlar custos com uso frequente. O plugin é compatível com esses serviços.

---

## 🏗️ Arquitetura

Design de separação em três camadas de Karpathy:

```
📄 Suas notas do vault (qualquer pasta)   # 📖 Você escolhe quais notas ingerir
  ↓ ingest
wiki/                                      # 🧠 Páginas Wiki geradas pelo LLM (wiki/sources/, wiki/entities/, wiki/concepts/)
  ↓ query / maintain
schema/                                    # 📋 Configuração da estrutura Wiki (naming, templates, categorias)
```

> 📖 Ver estrutura completa do código em [CONTRIBUTING.md → Project Structure](../CONTRIBUTING.md#project-structure).

**Páginas geradas:**
- `wiki/sources/filename.md` — 📄 Resumo da fonte
- `wiki/entities/entity-name.md` — 👤 Páginas de entidades (pessoas, organizações, projetos, etc.)
- `wiki/concepts/concept-name.md` — 💡 Páginas de conceitos (teorias, métodos, termos, etc.)
- `wiki/index.md` — 📑 Índice gerado automaticamente
- `wiki/log.md` — 📝 Registo de operações

---

## ❓ Perguntas Frequentes (FAQ)

> **Mantenha o plugin atualizado.** **Configurações → Plugins da comunidade → Verificar atualizações** regularmente.
>
> Mais FAQ em [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

**O que faz este plugin?**
Escolha qualquer nota, pasta ou seleção múltipla do seu vault; o LLM extrai entidades e conceitos e gera uma Wiki interligada com `[[wiki-links]]`. Receba respostas baseadas nas *suas* notas — não em pesquisas na Internet. Os resumos gerados ficam em `wiki/sources/`, as entidades em `wiki/entities/`, os conceitos em `wiki/concepts/` — as suas notas originais do vault nunca são modificadas.

**Os meus dados são enviados a terceiros?**
Privacidade primeiro. Sem backend, sem rastreio. Apenas texto que envia explicitamente sai do dispositivo. Use fornecedor local (Ollama/LM Studio) para total localidade.

**Diferença dos chatbots RAG?**
LLM-Wiki usa Personalized PageRank sobre o grafo [[wiki-link]] - zero custo de embedding.

**Qual LLM usar?**
Modelos >=200K tokens. Económicos: DeepSeek V4-Flash (/bin/zsh.14/M), Gemini 3.5 Flash, Qwen3.6-Plus.

**Como começar?**
Instalar → escolher fornecedor → **Test Connection** → executar **Ingest single source** (ou **Ingest from folder**) sobre qualquer nota do seu vault → as primeiras páginas Wiki aparecem em segundos. Ver [Início rápido](#-início-rápido) acima.

**Controlar custos API?**
Granularidade Grossa/Minima para lotes. Smart Batch Skip. Manutencao automatica DESLIGADA.

**Wiki existente segura?**
✅ Retrocompatível desde a v1.0.0. `reviewed: true` protege páginas de sobrescrita. O plugin nunca modifica as suas notas originais do vault — apenas gera novas páginas dentro da pasta `wiki/`.

**Idiomas?**
10 idiomas para IU e Wiki: EN, ZH, ZH-Hant, JA, KO, DE, FR, ES, PT, IT.

**Requisitos?**
Obsidian v1.11.0+. Chave API LLM (ou local sem chave). llmReady requer Test Connection.

**Cancelar operacao?**
Barra de estado ou Cmd+P -> Cancel current ingestion.

**Ajuda?**
- GitHub Issues - reportar erros
- GitHub Discussions - perguntas e feedback

## 🔒 Transparência e conformidade

Este plugin está listado no Mercado de Plugins Comunitários do Obsidian e passa por revisão automatizada de segurança e permissões.

**O plugin não tem backend, nem infraestrutura de servidor, nem qualquer tipo de recolha de dados.** É software puramente local executado dentro do Obsidian. O plugin não pode e não recolhe, armazena ou transmite os seus dados para nenhum servidor — porque tal servidor não existe.

**O acesso à rede** é usado apenas para comunicar com o provedor LLM que você configurar — nenhuma outra chamada de rede é feita. Isto está totalmente sob o seu controlo: você escolhe o provedor, você insere a chave API, você decide para onde vão os seus dados.

**O acesso ao sistema de arquivos** (enumeração do cofre) é necessário para construir e manter o wiki: ler as suas notas de origem, gerar páginas, varrer links mortos e detetar páginas duplicadas. O plugin nunca modifica os seus arquivos de origem — apenas os arquivos dentro da pasta wiki.

**O acesso à área de transferência** é usado exclusivamente pelo botão "Copiar" no modal de Consulta, e apenas quando clica nele.

Se preferir total localidade de dados, use um provedor LLM local como Ollama ou LM Studio. Com um provedor local, os seus dados nunca saem da sua máquina.

## 💖 Apoiar o projeto

Se o LLM-Wiki se tornou uma parte significativa do seu fluxo de trabalho de conhecimento, pode apoiar o seu desenvolvimento contínuo:

- ☕ **[Pague-me um café no Ko-fi](https://ko-fi.com/greenerdalii)** — apoio pontual ou mensal via Ko-fi
- 💳 **[Gorjeta via PayPal](https://paypal.me/greenerdalii)** — gorjeta pontual via PayPal

O patrocínio é inteiramente opcional. O plugin mantém-se sob licença Apache-2.0 e completo em funcionalidades.

### Patrocinadores

Obrigado às seguintes pessoas por apoiarem o projeto:

- [@jameses-cyber](https://github.com/jameses-cyber)
- [@issaqua](https://github.com/issaqua)

## 📜 Licença

Licença Apache-2.0 — veja [LICENSE](LICENSE) e [NOTICE](NOTICE).

## 🙏 Agradecimentos

- **💡 Conceito:** [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — a visão original que inspirou este plugin
- **🛠️ Plataforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 Transporte LLM:** [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=bottom-right&sealed_token=Re7j5hAKVwsf4431hDF3XjSFlxH6zaRXZ9VDYF_N3A-dMANR-lm7zRjkpsgqvgZf0mJ1ksxNsZk1-g91PBr1DxQDip_kRn2lEuradbANK2Y-q4x17R7RPhF8ML_08Ca9G-AqyPZeJemfXZp2NczsFmjqrJw8fGeBwVpdjS5zV917x4COLQDbEH_j64Pt)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=bottom-right)

