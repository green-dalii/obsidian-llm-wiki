![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin para Obsidian

> Base de conhecimento estruturada com IA que consome suas notas e gera uma Wiki conectada — baseada no [LLM Wiki concept de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

> **Pontuação oficial Obsidian 95/100 | Suporte nativo a 10 idiomas | Pesquisa por grafo sem embedding | Soberania total de dados | Compatível com qualquer provedor LLM**

![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square) <br>
![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) <br>
![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | **Português** | [Italiano](README_IT.md)

[Site oficial](https://llmwiki.greenerai.top/) | [Mercado Obsidian](https://community.obsidian.md/plugins/karpathywiki) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback e discussão](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorar código com DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H7V1228WMD)

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
  - [⚡ Novidades da v1.23.0](#-novidades-da-v1230)
    - [v1.23.2 — 2026-07-05 (última, PATCH)](#v1232--2026-07-05-última-patch)
    - [v1.23.1 — 2026-07-02 (PATCH)](#v1231--2026-07-02-patch)
    - [v1.23.0 — 2026-07-02 (MINOR)](#v1230--2026-07-02-minor)
  - [✨ Funcionalidades](#-funcionalidades)
    - [📊 Qualidade do Conhecimento](#-qualidade-do-conhecimento)
    - [🛠️ Manutenção](#️-manutenção)
    - [💬 Consulta e Feedback](#-consulta-e-feedback)
    - [🌐 LLM e Idioma](#-llm-e-idioma)
    - [🏗️ Arquitetura e Desempenho](#️-arquitetura-e-desempenho)
    - [🔒 Privacidade e segurança](#-privacidade-e-segurança)
  - [📖 Exemplo](#-exemplo)
  - [🤖 Guia de Seleção de Modelo](#-guia-de-seleção-de-modelo)
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

**📚 Você não precisa ser o bibliotecário.** Não decidir o que merece uma página. Não manter links cruzados. Não questionar se algo está desatualizado. Coloque notas em `sources/` e o LLM lê, extrai, escreve, vincula e sinaliza contradições — enquanto você permanece no fluxo.

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
| **📥 Ingerir fonte individual** | `Cmd+P` → "Ingest single source" — selecione uma nota para gerar páginas Wiki com entidades e conceitos |
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

**Retrocompatível.** Sem mudanças incompatíveis desde v1.0.0 — as suas páginas Wiki, configurações e fluxos de trabalho existentes são preservados sem reconfiguração.

**Após atualizar**, execute **Lint Wiki** → **Smart Fix All** para reparação automática:
1. 🏷️ Completar aliases (LLM gera traduções, abreviaturas, nomes alternativos)
2. 🔄 Fundir duplicados (multilingue, abreviaturas, alta similaridade)
3. 🔗 Reparar links quebrados / vincular órfãos / expandir páginas vazias

Depois **Regenerar índice** para reconstruir `wiki/index.md` com entradas de alias.

> 📖 Guias detalhados para saltos de versão específicos em [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions).

**Configurações a rever:** Idioma de saída da Wiki, Granularidade de extração, Concorrência (padrão 3), Atraso de lote (padrão 300ms).

---
## ⚡ Novidades da v1.23.0

### v1.23.2 — 2026-07-05 (última, PATCH)

Cinco PRs fundidos — correções de bugs, refatoração e polimento de UX. Atualização recomendada para utilizadores v1.23.0+.

- Invalidação do cache PPR ao vivo na ingestão — ingestões na mesma sessão ficam visíveis em consultas posteriores
- Wrapper cliente que preserva streaming — elimina regressão de streaming da era v1.23.0
- Indicador de turno de consulta + etiqueta clicável (#221, #219)
- Notificações de progresso semânticas (#219) — Lint Notices auto-fecho (5-8s)
- Consolidação do serializador Frontmatter (PR #238 @DocTpoint)
- Canonizador de cabeçalhos de secção (PR #241 @DocTpoint)
- Atualização de licença — MIT para Apache 2.0 + DCO

### v1.23.1 — 2026-07-02 (PATCH)

Três achados do bot de revisão Obsidian resolvidos: alinhamento strictBindCallApply: true, remoção de código morto, regeneração de lockfile. Sem alterações visíveis.

### v1.23.0 — 2026-07-02 (MINOR)

Maior mudança arquitetural desde 1.0:

- Migração Vercel AI-SDK v6. Cliente LLM de 1625 linhas substituído por @ai-sdk/openai@3 / @ai-sdk/anthropic@3 / @ai-sdk/openai-compatible@2
- Motor de grafo — PageRank personalizado sobre [[wiki-link]]. Monte-Carlo PPR, qualidade de nível embedding a custo zero
- Streaming em tempo real para todos os fornecedores
- UI de ingestão multi-ficheiro (#130)
- Nota de boas-vindas
- Porta API-key LM Studio (#223)
- Roteamento GPT-5.x Pro + fallback URL + sonda de token

## ✨ Funcionalidades

### 📊 Qualidade do Conhecimento

- **🔍 Extração de Entity/Concept** — LLM extrai Entity (pessoas, orgs, produtos, eventos) e Concept (teorias, métodos, termos) de suas notas com granularidade de extração flexível (Mínima~5 itens, Grossa~10, Padrão~50, Fina~100, Personalizada 1–500) para equilibrar profundidade de análise e custos de API
- **🏷️ Aliases Obrigatórios** — Cada página gerada inclui pelo menos 1 alias (tradução, sigla, nome alternativo), permitindo detecção de duplicados entre idiomas
- **🔄 Detecção e Mesclagem de Duplicados** — Classificação semântica captura duplicados reais (traduções entre idiomas, abreviações, variantes de grafia); mesclagem inteligente por LLM funde conteúdo e preserva aliases
- **🧩 Fusão Inteligente de Conhecimento** — Atualizações multi-source mesclam nova informação sem redundância, contradições preservadas com atribuição, páginas `reviewed: true` protegidas de sobrescrita
- **📏 Proteção contra Truncamento de Conteúdo** — 8000 max_tokens com detecção automática de stop_reason e tentativa em 2× tokens em todos os providers
- **📝 Menções Verbatim de Source** — Citações em idioma original preservadas com tradução opcional para rastreabilidade

- **🎨 Vocabulário de tags personalizável (v1.18.0).** Configurações → Wiki → Modo de vocabulário de tags → *Personalizado* permite definir suas próprias listas de tags de tipo de entidade e conceito (por exemplo, `Medical_Arzneimittel`, `法规`). O plugin respeita seu vocabulário nos prompts de extração e na validação de frontmatter; a auditoria Lint (Issue #85 v7) reporta qualquer página cujas tags estejam fora do vocabulário ativo.

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

### 💬 Consulta e Feedback

- **🤖 Consulta Conversacional** — Diálogo estilo ChatGPT com Markdown em streaming e `[[wiki-links]]`, histórico multi-turn
- **🪟 Painel lateral acoplado à direita (v1.22.1, PR #196).** Query Wiki abre em um leaf do sidebar direito estilo Copilot (reutilizando um leaf existente) em vez de um popup centralizado. O ícone ribbon `message-circle` e o comando `Query Wiki` ativam/exibem o painel; suas notas ficam visíveis ao lado da conversa. Toda a funcionalidade é preservada sem alterações.
- **📤 Query-to-Wiki Feedback** — Salve conversas valiosas para a Wiki com extração de Entity/Concept, deduplicação semântica antes de salvar
- **🔒 Prevenção de Salvamento Duplicado** — Rastreamento por hash evita reavaliação de conversas inalteradas

### 🌐 LLM e Idioma

- **🔌 Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, MiniMax, LM Studio, OpenRouter, Ollama, endpoints custom
- **🔄 5xx Retry** — Tentativa automática de exponential backoff (máx. 2) em erros HTTP 5xx/429/529 em todos os clientes
- **📋 Lista Dinâmica de Modelos** — Busca em tempo real das APIs dos providers
- **🌐 Idioma de Saída Wiki** — 10 idiomas independentes da UI (EN/ZH simplif/ZH trad/JA/KO/DE/FR/ES/PT/IT), com entrada customizada.
- **🌍 Internacionalização completa da UI** — Interface do plugin em 10 idiomas (EN/ZH simplif/ZH trad/JA/KO/DE/FR/ES/PT/IT), 269+ campos UI totalmente traduzidos, expressões locais naturais.
- **⚡ Rate Limit Guardian** — Quando geração paralela ativa rate limits, auto-detecção e sugestões: reduzir concorrência, aumentar delay batch, trocar provider
- **🦙 Web Clipper Compatible** — Adicionar com um clique o folder `Clippings/` do Obsidian Web Clipper à watchlist, clips web auto-ingestados no Wiki

### 🏗️ Arquitetura e Desempenho

- **⚡ Geração de Páginas Paralela** — 1–5 páginas simultâneas configuráveis, padrão 3 (paralelo), 2–3× mais rápido para sources grandes, isolamento de erro por página
- **📚 Extração em Lote Iterativa** — Dimensionamento adaptativo de lotes elimina o gargalo de max_tokens para documentos longos
- **🏛️ Arquitetura de Três Camadas** — `sources/` (read-only) → `wiki/` (gerado por LLM) → `schema/` (config co-evoluída)
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

Para modelos locais (Ollama): janelas de contexto tipicamente menores (8K–128K). Considere usar um provider em nuvem para ingestão + modelo local para query.

**🔌 Anthropic Compatible (Coding Plan):** Se seu provider oferece um endpoint de API compatível com Anthropic, selecione "Anthropic Compatible" e insira o Base URL e API Key do seu provider.

**🦙 Ollama (local, sem chave API):** Instale o [Ollama](https://ollama.com), baixe um modelo (`ollama pull gemma4` ou `ollama pull qwen3.5:27b`), selecione "Ollama (Local)" no menu de providers.

**🎛️ LM Studio (local, sem chave API):** Instale o [LM Studio](https://lmstudio.ai), inicie seu servidor local (padrão `http://localhost:1234/v1`), selecione "LM Studio (Local)" no menu de providers. O LM Studio executa um servidor compatível com OpenAI integrado — o campo de chave API é opcional.

> 💡 **Planos de assinatura:** Se você tem planos tipo Coding Plan, OpenAI Pro ou Anthropic Pro, são excelentes opções para controlar custos com uso frequente. O plugin é compatível com esses serviços.

---

## 🏗️ Arquitetura

Design de separação em três camadas de Karpathy:

```
sources/     # 📄 Os seus documentos fonte (somente leitura)
  ↓ ingest
wiki/        # 🧠 Páginas Wiki geradas por LLM
  ↓ query / maintain
schema/      # 📋 Configuração da estrutura Wiki
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
Notas em sources/ -> LLM extrai entidades e conceitos -> Wiki interligada com [[wiki-links]].

**Os meus dados são enviados a terceiros?**
Privacidade primeiro. Sem backend, sem rastreio. Apenas texto que envia explicitamente sai do dispositivo. Use fornecedor local (Ollama/LM Studio) para total localidade.

**Diferença dos chatbots RAG?**
LLM-Wiki usa Personalized PageRank sobre o grafo [[wiki-link]] - zero custo de embedding.

**Qual LLM usar?**
Modelos >=200K tokens. Económicos: DeepSeek V4-Flash (/bin/zsh.14/M), Gemini 3.5 Flash, Qwen3.6-Plus.

**Como começar?**
Instalar -> escolher fornecedor -> Test Connection -> notas em sources/ -> Ingest single source.

**Controlar custos API?**
Granularidade Grossa/Minima para lotes. Smart Batch Skip. Manutencao automatica DESLIGADA.

**Wiki existente segura?**
reviewed: true protege paginas. Plugin nunca modifica sources/.

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

## 📜 Licença

Licença Apache-2.0 — veja [LICENSE](LICENSE) e [NOTICE](NOTICE).

## 🙏 Agradecimentos

- **💡 Conceito:** [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — a visão original que inspirou este plugin
- **🛠️ Plataforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 Transporte LLM:** [Vercel AI SDK v6](https://ai-sdk.dev/) (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`) via Obsidian [`requestUrl`](https://docs.obsidian.md/Reference/TypeScript%20API/requestUrl)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=top-left)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=top-left)
