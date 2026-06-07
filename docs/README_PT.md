![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin para Obsidian

> Base de conhecimento estruturada com IA que consome suas notas e gera uma Wiki conectada — baseada no [LLM Wiki concept de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
>
> **Pontuação oficial Obsidian 95/100** | Suporte nativo a 8 idiomas | Manutenção ativa, evolução contínua

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.6.6%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-8-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-8%2B-cyan?style=flat-square)

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[Site oficial](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback e discussão](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorar código com DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

---

> **⚡ Aviso de atualização rápida：** Este projeto evolui rapidamente – correções de bugs, melhorias de desempenho, novos recursos e otimizações de UX são lançados com frequência. Recomendamos atualizar regularmente no Obsidian (**Configurações → Plugins da comunidade → Verificar atualizações**) ou ativar a atualização automática de plugins.

## 📑 Contents

- [💡 O que é LLM-Wiki?](#-o-que-é-llm-wiki)
- [⚡ Por que Obsidian + LLM-Wiki?](#-por-que-obsidian--llm-wiki)
- [🚀 Início Rápido](#-início-rápido)
  - [📦 Instalação](#-instalação)
  - [🔄 Atualizar o plugin](#-atualizar-o-plugin)
  - [🔑 Configurar um LLM Provider](#-configurar-um-llm-provider)
  - [🎮 Uso](#-uso)
  - [⚠️ Atualizando de uma Versão Anterior?](#️-atualizando-de-uma-versão-anterior)
- [⚡ Novidades na v1.16.3](#-novidades-na-v1163)
- [✨ Funcionalidades](#-funcionalidades)
  - [📊 Qualidade do Conhecimento](#-qualidade-do-conhecimento)
  - [🛠️ Manutenção](#️-manutenção)
  - [💬 Consulta e Feedback](#-consulta-e-feedback)
  - [🌐 LLM e Idioma](#-llm-e-idioma)
  - [🏗️ Arquitetura e Desempenho](#️-arquitetura-e-desempenho)
  - [🔒 Privacidade e segurança](#-privacidade-e-segurança)
- [⌨️ Comandos](#️-comandos)
- [📖 Exemplo](#-exemplo)
- [🤖 Guia de Seleção de Modelo](#-guia-de-seleção-de-modelo)
- [🏗️ Arquitetura](#️-arquitetura)
- [❓ Perguntas Frequentes (FAQ)](#-perguntas-frequentes-faq)
  - [💡 Geral](#-geral)
  - [🏷️ Aliases e Duplicados](#️-aliases-e-duplicados)
  - [⚡ Performance e Controle de custos](#-performance-e-controle-de-custos)
  - [🧹 Manutenção](#-manutenção)
  - [🔍 Solução de Problemas](#-solução-de-problemas)
  - [🔒 Transparência e conformidade](#-transparência-e-conformidade)
- [📜 Licença](#-licença)
- [🙏 Agradecimentos](#-agradecimentos)
## 💡 O que é LLM-Wiki?

Você escreve. A IA organiza. Você pergunta. Simples assim.

**🎯 O problema.** Suas notas são uma mina de ouro — pessoas, conceitos, ideias, conexões. Mas agora são apenas arquivos em pastas. Encontrar relações exige buscar, etiquetar e confiar na memória.

**✨ A solução.** [Andrej Karpathy propôs](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) uma abordagem elegante: trate suas notas como matéria-prima e deixe que um LLM atue como arquiteto. Ele lê o que você escreve, extrai Entity e Concept, e os tece em uma Wiki estruturada — completa com `[[bidirectional links]]`, índice gerado automaticamente e interface de chat que responde perguntas baseadas no *seu* conhecimento.

**📚 Você não precisa ser o bibliotecário.** Não decidir o que merece uma página. Não manter links cruzados. Não questionar se algo está desatualizado. Coloque notas em `sources/` e o LLM lê, extrai, escreve, vincula e sinaliza contradições — enquanto você permanece no fluxo.

**🤖 Não é apenas outro chatbot.** O ChatGPT conhece a internet. O LLM-Wiki conhece *você* — ou melhor, o que você lhe ensinou. Cada resposta inclui `[[wiki-links]]` de volta ao seu knowledge graph. Cada resposta é um ponto de partida, não um beco sem saída.

---

## ⚡ Novidades na v1.16.3

Esta **versão de hotfix** completa o lote de correções de bugs P0 da v1.16.2. A correção da barra de estado de cancelamento do Lint da v1.16.2 estava incompleta (o modal fechava imediatamente após clicar em um botão de correção, ocultando a barra de estado antes que o usuário pudesse cancelar), e os cinco itens de limpeza da revisão da v1.16.2 agora estão incluídos. **Sem mudanças incompatíveis, sem reconfiguração.**

**Correções principais:**

- **A barra de estado de cancelamento do Lint agora realmente funciona (Issue #94).** A v1.16.2 propagava o AbortSignal para os fix-runners, mas o modal fechava ao clicar no botão — disparando onClose → endLintOperation e ocultando a barra de estado antes que o usuário pudesse cancelar. A correção dá a cada fase de correção seu próprio ciclo de vida de operação de lint: `startLintOperation` ao clicar em um botão de correção, `endLintOperation` ao finalizar a correção. O modal fecha imediatamente (preservando a UX original); o usuário vê a notificação de progresso no topo e a barra de estado na parte inferior permanece visível durante toda a correção — clique para cancelar.

- **O contador de progresso da verificação de duplicados agora coincide com o console (Issue #94 continuação).** Antes mostrava "1/4" (contador de rodadas externo) em vez de "1-4/16" (intervalo de lotes interno). Corrigido para que a notificação e o log do console permaneçam sincronizados — não há mais confusão sobre o progresso.

- **Correção da chave de thinkingControlCache (Issue #243).** Com provedores predefinidos sem substituição de baseUrl, a escrita do cache usava uma chave vazia, a leitura usava a URL predefinida — o cache falhava para sempre, disparando um round-trip 400 desperdiçado em cada chamada. Os caminhos de leitura/escritura agora usam o mesmo helper `getThinkingControlCacheKey()`.

- **deleteEmptyStubs agora é resiliente (Issue #244).** Uma única falha de leitura de vault ou de deleteFile não interrompe mais o loop completo. Cada arquivo é independentemente envolvido em try/catch, e o usuário recebe uma notificação clara com a contagem de excluídos/falhos.

- **O fallback após thinking-control agora cacheia o resultado negativo (Issue #245).** `OpenAICompatibleClient` agora define `thinkingControlSupported = false` após um fallback 400 bem-sucedido, para que chamadas subsequentes à mesma baseUrl pulem o round-trip redundante de probe-falha.

- **Limpeza i18n (Issue #94 continuação + #248):** 3 strings de progresso em inglês codificadas de forma rígida substituídas por chaves i18n oficiais (`lintCheckingDuplicatesProgress`, `lintFixingPolluted`, `lintModalFixPolluted`), em 8 idiomas. A detecção de erros de thinking-control agora requer tanto um status HTTP 400 quanto uma palavra-chave de campo rejeitado — antes correspondia a qualquer erro que contivesse "thinking", causando fallbacks falsos.

**Atualizar de uma versão anterior?** Sem mudanças incompatíveis, sem reconfiguração. Wikis, configurações e fluxos de trabalho existentes são preservados.

**Recomendamos enfaticamente a todos os usuários atualizar para esta versão** — a correção de cancelamento do Lint completa a história de UX de cancelamento, e as correções de cache e resiliência operam silenciosamente em cada chamada do Lint.---

---

## ✨ Funcionalidades

### 📊 Qualidade do Conhecimento

- **🔍 Extração de Entity/Concept** — LLM extrai Entity (pessoas, orgs, produtos, eventos) e Concept (teorias, métodos, termos) de suas notas com granularidade de extração flexível (Mínima~5 itens, Grossa~10, Padrão~50, Fina~100, Personalizada 1–300) para equilibrar profundidade de análise e custos de API
- **🏷️ Aliases Obrigatórios** — Cada página gerada inclui pelo menos 1 alias (tradução, sigla, nome alternativo), permitindo detecção de duplicados entre idiomas
- **🔄 Detecção e Mesclagem de Duplicados** — Classificação semântica captura duplicados reais (traduções entre idiomas, abreviações, variantes de grafia); mesclagem inteligente por LLM funde conteúdo e preserva aliases
- **🧩 Fusão Inteligente de Conhecimento** — Atualizações multi-source mesclam nova informação sem redundância, contradições preservadas com atribuição, páginas `reviewed: true` protegidas de sobrescrita
- **📏 Proteção contra Truncamento de Conteúdo** — 8000 max_tokens com detecção automática de stop_reason e tentativa em 2× tokens em todos os providers
- **📝 Menções Verbatim de Source** — Citações em idioma original preservadas com tradução opcional para rastreabilidade

### 🛠️ Manutenção

- **🔍 Lint Health Scan** — Detecta duplicados, dead links, páginas vazias, órfãos, aliases ausentes e contradições em um relatório abrangente
- **🎯 Detecção de Duplicados por Camada Semântica** — Camada 1 (correspondências diretas de nome: entre idiomas, abreviações, títulos de alta similaridade) sempre verificada; Camada 2 (sinais indiretos: links compartilhados, similaridade moderada) preenche o orçamento de tokens
- **⚡ Smart Fix All** — Correção em lote ordenada por causalidade: duplicados mesclados → dead links resolvidos → órfãos vinculados → páginas vazias expandidas
- **🏷️ Completude de Aliases** — Geração em lote paralela de aliases ausentes em um clique, melhorando a detecção futura de duplicados
- **🔄 Auto-Manutenção** — Observador de arquivos multi-pasta, lint periódico, verificação de saúde na inicialização (todos opcionais)
- **⚠️ Máquina de Estados de Contradição** — `detected → review_ok → resolved` (correção por IA) ou `detected → pending_fix` (manual)

### 💬 Consulta e Feedback

- **🤖 Consulta Conversacional** — Diálogo estilo ChatGPT com Markdown em streaming e `[[wiki-links]]`, histórico multi-turn
- **📤 Query-to-Wiki Feedback** — Salve conversas valiosas para a Wiki com extração de Entity/Concept, deduplicação semântica antes de salvar
- **🔒 Prevenção de Salvamento Duplicado** — Rastreamento por hash evita reavaliação de conversas inalteradas

### 🌐 LLM e Idioma

- **🔌 Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, endpoints custom
- **🔄 5xx Retry** — Tentativa automática de exponential backoff (máx. 2) em erros HTTP 5xx/429/529/529 em todos os clientes
- **📋 Lista Dinâmica de Modelos** — Busca em tempo real das APIs dos providers
- **🌐 Idioma de Saída Wiki** — 8 idiomas independentes da UI (EN/ZH/JA/KO/DE/FR/ES/PT), com entrada customizada
- **🌍 Internacionalização completa da UI** — Interface do plugin em 8 idiomas (EN/ZH/JA/KO/DE/FR/ES/PT), 269+ campos UI totalmente traduzidos, expressões locais naturais
- **⚡ Rate Limit Guardian** — Quando geração paralela ativa rate limits, auto-detecção e sugestões: reduzir concorrência, aumentar delay batch, trocar provider
- **🦙 Web Clipper Compatible** — Adicionar com um clique o folder `Clippings/` do Obsidian Web Clipper à watchlist, clips web auto-ingestados no Wiki

### 🏗️ Arquitetura e Desempenho

- **⚡ Geração de Páginas Paralela** — 1–5 páginas simultâneas configuráveis, padrão 3 (paralelo), 2–3× mais rápido para sources grandes, isolamento de erro por página
- **📚 Extração em Lote Iterativa** — Dimensionamento adaptativo de lotes elimina o gargalo de max_tokens para documentos longos
- **🏛️ Arquitetura de Três Camadas** — `sources/` (read-only) → `wiki/` (gerado por LLM) → `schema/` (config co-evoluída)
- **🧩 Código Modular** — 13 módulos focados em `src/`

### 🔒 Privacidade e segurança

- **Sem backend, sem telemetria.** O plugin é executado inteiramente dentro do Obsidian — não há servidor externo, análise ou coleta de dados de qualquer tipo. Suas notas nunca saem do seu cofre, a menos que você configure explicitamente um provedor LLM.
- **Seus dados permanecem locais por padrão.** O plugin não armazena, armazena em cache ou transmite seu conteúdo para qualquer lugar além da API LLM que você escolher. Apenas o texto que você envia para ingestão ou consulta sai do seu dispositivo — e apenas para o provedor que você configurou.
- **Modo totalmente local com Ollama, LM Studio ou provedores locais.** Para total soberania de dados, use um LLM executado localmente. Suas notas são processadas inteiramente na sua máquina — nada toca a Internet.
- **Permissões mínimas.** O acesso aos arquivos do cofre é necessário para a gestão do wiki (ler notas, gerar páginas, detetar links mortos). O acesso à rede é usado exclusivamente para chamadas da API LLM ao provedor que você escolheu. O acesso à área de transferência limita-se ao botão "Copiar" no modal de Consulta — apenas quando você clica nele.

---


---

## ⌨️ Comandos

| Comando | Descrição |
|---------|-----------|
| **📥 Ingerir fonte individual** | Selecione uma nota → gere páginas Wiki com Entity, Concept e summary |
| **📂 Ingerir de pasta** | Selecione uma pasta → gere Wiki em lote de notas existentes |
| **🔍 Consultar Wiki** | Q&A conversacional sobre sua Wiki, respostas em streaming com `[[wiki-links]]` |
| **🛠️ Verificar Wiki** | Verificação completa de saúde: duplicados, dead links, páginas vazias, órfãos, aliases ausentes, contradições |
| **📋 Regenerar índice** | Reconstrua manualmente `wiki/index.md` |
| **⏹️ Cancelar operação** | `Cmd+P` → "Cancel current ingestion" ou clique na barra de status — parada segura nos limites do lote |
| **💡 Sugerir atualizações de Schema** | LLM analisa a Wiki e propõe melhorias no Schema |

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
created: 2026-05-15
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
| **🌟 Custo-benefício** | **Grok-4** | 2M tokens | 2M contexto, ideal para wikis muito grandes |
| **Balanceado** | **Claude Sonnet 4.6** | 1M tokens | Bom equilíbrio qualidade/custo, $3/$15 por milhão de tokens |
| **Leve** | **Claude Haiku 4.5** | 200K tokens | Rápido e econômico, para wikis pequenos |
| **Econômico** | **MiMo-V2.5-Flash** | 1M tokens | Opção econômica da Xiaomi, arquitetura MoE 309B |
| **Flagship** | Claude Opus 4.7 | 1M tokens | Qualidade máxima, custo alto — usar seletivamente |
| **Flagship** | GPT-5.5 | 1M tokens | Raciocínio top, custo alto — usar seletivamente |

Para modelos locais (Ollama): janelas de contexto tipicamente menores (8K–128K). Considere usar um provider em nuvem para ingestão + modelo local para query.

**🔌 Anthropic Compatible (Coding Plan):** Se seu provider oferece um endpoint de API compatível com Anthropic, selecione "Anthropic Compatible" e insira o Base URL e API Key do seu provider.

> 💡 **Planos de assinatura:** Se você tem planos tipo Coding Plan, OpenAI Pro ou Anthropic Pro, são excelentes opções para controlar custos com uso frequente. O plugin é compatível com esses serviços.

---

## 🏗️ Arquitetura

Design de separação em três camadas de Karpathy:

```
sources/     # 📄 Seus documentos fonte (read-only)
  ↓ ingest
wiki/        # 🧠 Páginas Wiki geradas por LLM
  ↓ query / maintain
schema/      # 📋 Configuração da estrutura Wiki (nomenclatura, templates, categorias)
```

**Código** (`src/`):

```
wiki/               # Módulos do motor Wiki
  wiki-engine.ts    # 🎯 Orquestrador
  query-engine.ts   # 💬 Query conversacional
  source-analyzer.ts # 📊 Extração em lote iterativa
  page-factory.ts   # 🏗️ CRUD de Entity/Concept + mesclagem
  lint-controller.ts # 🔍 Orquestração de Lint
  lint-fixes.ts     # 🛠️ Correção de dead links, páginas vazias e órfãos
  lint/             # Submódulos de Lint
    duplicate-detection.ts  # 🔄 Geração programática de candidatos
    fix-runners.ts          # ⚡ Helpers de execução de correção em lote
  contradictions.ts # ⚠️ Detecção de contradições
  system-prompts.ts # 🗣️ Diretiva de idioma + rótulos de seção
schema/             # Co-evolução de Schema
  schema-manager.ts # 📋 CRUD de Schema + sugestões
  auto-maintain.ts  # 🔄 Observador de arquivos + lint periódico
ui/                 # Interface do usuário
  settings.ts       # ⚙️ Painel de configurações
  modals.ts         # 📦 Modais de Lint/Ingest/Query
+ módulos compartilhados: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**Páginas geradas:**
- `wiki/sources/filename.md` — 📄 Resumo da source
- `wiki/entities/entity-name.md` — 👤 Páginas de Entity (pessoas, orgs, projetos, etc.)
- `wiki/concepts/concept-name.md` — 💡 Páginas de Concept (teorias, métodos, termos, etc.)
- `wiki/index.md` — 📑 Índice gerado automaticamente
- `wiki/log.md` — 📝 Log de operações

---

## ❓ Perguntas Frequentes (FAQ)

> **Mantenha o plugin atualizado.** Este projeto é atualizado com frequência — novos recursos e correções chegam a cada poucos dias. No Obsidian, vá regularmente a **Configurações → Plugins comunitários → Verificar atualizações**.
>
> Mais perguntas na [GitHub FAQ Discussion](https://github.com/green-dalii/obsidian-llm-wiki/discussions/28).

### 💡 Geral

**O que este plugin realmente faz?**
Coloque notas, ele extrai pessoas, conceitos e teorias, e gera uma Wiki interconectada com `[[bidirectional links]]`. Faça perguntas e obtenha respostas baseadas em *suas* notas — não alucinações da internet.

**Requisitos mínimos?**
Obsidian v1.6.6+, desktop (Windows/macOS/Linux), uma API key de um LLM provider. Ollama funciona localmente sem API key.

**Por que não consigo usar as funções após instalar?**
O plugin exige um teste de conexão bem-sucedido antes de desbloquear as funções principais. Vá em **Configurações → Karpathy LLM Wiki** → escolha um provider → insira sua API key → clique em **Fetch Models** → selecione um modelo → clique em **Test Connection**. Quando o indicador verde "LLM Ready" aparecer, todas as funções estarão disponíveis. Isso evita falhas silenciosas de providers mal configurados.

**Como cancelar uma ingestão ou Verificar em execução?**
Clique no texto da barra de status durante uma operação (mostra "Ingesting... click to cancel"), ou use `Ctrl+P` → "Cancel current ingestion". A operação para de forma limpa no próximo limite de lote, preservando todo o trabalho já concluído.

**Como ingerir rapidamente o arquivo que estou editando?**
Clique no ícone `sticker` na barra lateral esquerda, ou use `Ctrl+P` → "Ingest current file". Isso pula o seletor de arquivo e ingere diretamente a aba ativa do editor.

**Colchetes duplos `[[[[entities/Foo|Foo]]]]` no log.md — como corrigir?**
Execute **Verificar Wiki** — o scanner agora detecta e corrige automaticamente todos os wiki-links duplamente aninhados em todo o diretório da Wiki (incluindo log.md) sem nenhum custo de LLM. Nenhuma limpeza manual é necessária.

**Por que recebo erros "Overloaded"?**
O plugin agora reconhece o erro 529 de overload da Anthropic como retentável. Erros de overload são automaticamente reexecutados com exponential backoff em todos os providers.

**Por que um stub duplicado foi criado quando a página já existe em entities/ ou concepts/?**
O plugin agora usa correspondência baseada em slug — diferentes formatações do mesmo nome são resolvidas para a página existente em vez de criar um stub duplicado.

**Qual modelo escolher?**
Veja o [Guia de Seleção de Modelo](#-guia-de-seleção-de-modelo) acima. Modelos de contexto longo são recomendados — quanto maior sua Wiki, mais contexto o LLM precisa.

### 🏷️ Aliases e Duplicados

**Por que o Lint mostra "aliases ausentes" em quase todas as páginas?**
Páginas geradas antes da v1.7.11 não incluíam aliases. Isso é inofensivo — aliases são um aprimoramento, não um defeito. Clique em **Complete Aliases** no relatório Lint para gerar traduções, siglas e nomes alternativos em um lote.

**Por que vejo páginas duplicadas com nomes semelhantes?**
Antes da v1.7.10 não havia detecção de duplicados alias-aware. Execute **Lint Wiki** → **Merge Duplicates** para fundi-los.

**Como funciona a detecção de duplicados? (v1.7.10+)**
Detecção semântica de dois níveis: Nível 1 (sempre verificado pelo LLM) captura correspondências entre idiomas, abreviações, títulos de alta similaridade. Nível 2 preenche o orçamento de tokens restante com candidatos de similaridade moderada.

**O que são "páginas poluídas"? (v1.9.0)**
Páginas com prefixos de pasta acidentalmente incorporados nos nomes de arquivo (ex.: `concepts/conceptsOtimizaçãoLayout.md`). Execute **Lint Wiki** → **🧹 Fix Polluted Pages** para renomear e atualizar todos os links de entrada.

### ⚡ Performance e Controle de custos

**Como acelerar a ingestão?**
Em **Configurações → Ingestion Acceleration**: aumente **Page Generation Concurrency** para 3–5, reduza **Batch Delay** para 100–300ms (cuidado com rate limiting). Escolha granularidade "Mínima", "Grossa" ou "Padrão" para reduzir o número de páginas e economizar custos de API.

**Por que recebo erros HTTP 429?**
O plugin detecta automaticamente rate limiting e sugere: reduzir concorrência para 1–2, aumentar Batch Delay para 500–800ms, ou mudar para um provider com limites mais altos.

**Como controlar custos de API?**
- Auto-Maintenance está DESLIGADO por padrão (ativar apenas se necessário)
- Smart Batch Skip pula automaticamente arquivos já ingeridos
- Granularidade "Standard" ou "Coarse" = menos chamadas LLM
- Batch Delay > 500ms apenas espaça chamadas sem aumentar tokens
- O relatório Lint mostra contagens antes de executar correções

### 🧹 Manutenção

**O que o Smart Fix All faz?**
Executa correções em ordem causal (v1.9.0+):
1. 🧹 Corrigir páginas poluídas → 2. 🏷️ Completar aliases → 3. 🔄 Fundir duplicados → 4. 🔗 Reparar dead links → 5. 🔗 Vincular órfãos → 6. 📝 Expandir páginas vazias

**Lint congela em uma Wiki grande?**
Atualize para v1.7.17+ — o Lint cede o controle à thread da UI do Obsidian a cada 50 páginas, evitando congelamentos.

### 🔍 Solução de Problemas

**Query não encontra páginas que sei que existem?**
Três causas: (1) Índice desatualizado → **Regenerate index**. (2) Aliases ausentes → **Complete Aliases**. (3) Reformule — o LLM faz correspondência semântica, não busca por palavra-chave.

**Posso editar manualmente as páginas da Wiki?**
Sim. Defina `reviewed: true` no frontmatter para proteger de sobrescrita. Aliases, tags e sources manuais são preservados durante mesclagens.

**Atualização segura?**
O plugin nunca modifica seus arquivos fonte. Faça backup de `wiki/` → atualize o plugin → **Regenerate index** → **Lint Wiki** → corrija seletivamente.

**Como obter ajuda?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — relatar bugs
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — perguntas e feedback
5. 🛠️ Aplique correções seletivamente — você não precisa consertar tudo de uma vez

---

## 🔒 Transparência e conformidade

Este plugin está listado no Mercado de Plugins Comunitários do Obsidian e passa por revisão automatizada de segurança e permissões.

**O plugin não tem backend, nem infraestrutura de servidor, nem qualquer tipo de recolha de dados.** É software puramente local executado dentro do Obsidian. O plugin não pode e não recolhe, armazena ou transmite os seus dados para nenhum servidor — porque tal servidor não existe.

**O acesso à rede** é usado apenas para comunicar com o provedor LLM que você configurar — nenhuma outra chamada de rede é feita. Isto está totalmente sob o seu controlo: você escolhe o provedor, você insere a chave API, você decide para onde vão os seus dados.

**O acesso ao sistema de arquivos** (enumeração do cofre) é necessário para construir e manter o wiki: ler as suas notas de origem, gerar páginas, varrer links mortos e detetar páginas duplicadas. O plugin nunca modifica os seus arquivos de origem — apenas os arquivos dentro da pasta wiki.

**O acesso à área de transferência** é usado exclusivamente pelo botão "Copiar" no modal de Consulta, e apenas quando clica nele.

Se preferir total localidade de dados, use um provedor LLM local como Ollama ou LM Studio. Com um provedor local, os seus dados nunca saem da sua máquina.
## 📜 Licença

Licença MIT — veja [LICENSE](LICENSE).

## 🙏 Agradecimentos

- **💡 Conceito:** [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — a visão original que inspirou este plugin
- **🛠️ Plataforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **🔌 LLM SDKs:** Anthropic SDK, OpenAI SDK
