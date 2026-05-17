![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# Karpathy LLM Wiki Plugin para Obsidian

> Base de conhecimento estruturada com IA que consome suas notas e gera uma Wiki conectada — baseada no [LLM Wiki concept de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Autor:** Greener-Dalii | **Versão:** 1.8.0

![Version](https://img.shields.io/badge/version-1.8.0-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.6.6%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-8-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-8%2B-cyan?style=flat-square)

[English](../README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | [Português](README_PT.md)

[Site oficial](https://llmwiki.greenerai.top/) | [Discussões](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

---

## O que é LLM-Wiki?

Você escreve. A IA organiza. Você pergunta. Simples assim.

**O problema.** Suas notas são uma mina de ouro — pessoas, conceitos, ideias, conexões. Mas agora são apenas arquivos em pastas. Encontrar relações exige buscar, etiquetar e confiar na memória.

**A solução.** [Andrej Karpathy propôs](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) uma abordagem elegante: trate suas notas como matéria-prima e deixe que um LLM atue como arquiteto. Ele lê o que você escreve, extrai Entity e Concept, e os tece em uma Wiki estruturada — completa com `[[bidirectional links]]`, índice gerado automaticamente e interface de chat que responde perguntas baseadas no *seu* conhecimento.

**Você não precisa ser o bibliotecário.** Não decidir o que merece uma página. Não manter links cruzados. Não questionar se algo está desatualizado. Coloque notas em `sources/` e o LLM lê, extrai, escreve, vincula e sinaliza contradições — enquanto você permanece no fluxo.

**Não é apenas outro chatbot.** O ChatGPT conhece a internet. O LLM-Wiki conhece *você* — ou melhor, o que você lhe ensinou. Cada resposta inclui `[[wiki-links]]` de volta ao seu knowledge graph. Cada resposta é um ponto de partida, não um beco sem saída.

---

## Por que Obsidian + LLM-Wiki?

O Obsidian é excelente em linked thinking. Mas há um problema: você é quem faz todo o vinculamento.

O LLM-Wiki inverte isso. Em vez de construir o graph manualmente, a IA o faz crescer com você. Adicione uma nota sobre um novo conceito — ele encontra conexões que você perderia. Faça uma pergunta — ele percorre seu knowledge graph e traz respostas com citações.

- **Sua Graph View ganha vida.** Novas notas não permanecem estáticas — geram links para Entity, Concept e Sources. O graph cresce organicamente, e o plugin o mantém: detectando duplicados, corrigindo dead links, construindo pontes entre idiomas com aliases.
- **Suas notas aprendem a responder.** A busca torna-se conversa. "O que escrevi sobre X?" torna-se diálogo, com respostas em streaming e `[[wiki-links]]` como breadcrumbs. Cada resposta é um caminho mais profundo em seu próprio conhecimento.
- **O Obsidian torna-se um parceiro de pensamento.** Deixa de ser um armário para notas e torna-se algo que ajuda você a *pensar* — revelando conexões ocultas, sinalizando contradições, lembrando o que você esqueceu que sabia.

---

## Início Rápido

### Instalação

**Recomendado — Obsidian Community Plugin Marketplace:**

1. No Obsidian, acesse **Settings → Community Plugins**
2. Clique em **Browse** e busque por "Karpathy LLM Wiki"
3. Clique em **Install**, depois **Enable**

**Ou via Community Plugins website —** visite [community.obsidian.md/plugins/karpathywiki](https://community.obsidian.md/plugins/karpathywiki) e clique em **Add to Obsidian** para instalar diretamente.

**Manual (alternativo):**

1. Baixe `main.js`, `manifest.json`, `styles.css` em [Releases](https://github.com/green-dalii/obsidian-llm-wiki/releases)
2. No Obsidian, acesse Settings → Community Plugins. Na aba **Installed Plugins**, clique no ícone de pasta para abrir o diretório de plugins
3. Crie uma pasta chamada `karpathywiki` e coloque os três arquivos dentro
4. De volta ao Obsidian, clique no ícone de atualizar — **Karpathy LLM Wiki** aparecerá em Installed Plugins
5. Ative-o

**Desenvolvimento:** `git clone`, `pnpm install`, `pnpm build`.

### Configurar um LLM Provider

1. Abra Settings → Karpathy LLM Wiki
2. Escolha um provider no dropdown (Anthropic, Anthropic Compatible, Google Gemini, OpenAI, DeepSeek, Kimi, GLM, Ollama, OpenRouter ou custom)
3. Insira sua API key (não necessário para Ollama)
4. Clique em **Fetch Models** para preencher o dropdown de modelos, ou digite um nome de modelo manualmente
5. Clique em **Test Connection**, depois em **Save settings**

**Ollama (local, sem API key):** Instale [Ollama](https://ollama.com), puxe um modelo (`ollama pull gemma4`), selecione "Ollama (Local)" no dropdown de provider.

> Consulte [README_CN.md](README_CN.md) para instruções específicas de provider em chinês.

### Uso

| Método | Como |
|--------|-----|
| **Ingest de `sources/`** | `Cmd+P` → "Ingest Sources" — processa a pasta `sources/` inteira |
| **Ingest de qualquer pasta** | `Cmd+P` → "Ingest from Folder" — escolha uma pasta, gere Wiki de notas existentes |
| **Query Wiki** | `Cmd+P` → "Query Wiki" — faça perguntas, obtenha respostas em streaming com `[[wiki-links]]` |
| **Lint Wiki** | `Cmd+P` → "Lint Wiki" — verificação de saúde com detecção de duplicados, dead links, órfãos |

Re-ingerir a mesma source faz atualizações incrementais em Entity/Concept pages (nova informação mesclada). Summary pages são regeneradas.

**Smart Batch Skip:** Ao ingerir uma pasta, o plugin detecta automaticamente arquivos já processados e os pula para economizar tempo e custos de API. O relatório de lote mostra a contagem de pulados.

### Atualizando de uma Versão Anterior?

Se você está atualizando de uma versão **anterior à v1.7.11** (ou muito mais antiga), suas páginas Wiki existentes foram geradas sem várias capacidades adicionadas ao longo de vários lançamentos. Siga estas etapas após atualizar para atualizar sua Wiki:

**1. Reconstrua seu índice**
`Cmd+P` → **"Regenerate index"** — Isso reconstrói `wiki/index.md` com entradas de alias para cada página, habilitando busca alias-aware (ex.: pesquisar "DSA" encontra "DeepSeek-Sparse-Attention"). O formato antigo do índice listava apenas títulos de páginas.

**2. Execute Lint Wiki**
`Cmd+P` → **"Lint Wiki"** — Isso examina toda a sua Wiki e mostra:
- **Aliases ausentes**: Páginas sem aliases (todas as pré-v1.7.11). Clique em **"Complete Aliases"** — o LLM gera traduções, siglas e nomes alternativos em lote. Isso é crítico para a detecção de duplicados.
- **Páginas duplicadas**: Páginas com conteúdo sobreposto (ex.: "CoT" vs "Cadeia-de-Pensamento" criadas por versões antigas sem dedup alias-aware). Clique em **"Merge Duplicates"** para fundi-las e preservar todos os aliases.
- **Dead links / Páginas vazias / Órfãos**: Problemas padrão de manutenção de Wiki.

**3. Use Smart Fix All**
Clique em **"Smart Fix All"** no relatório do Lint para reparo em um clique com ordenação por causalidade: aliases completados → duplicados mesclados → dead links corrigidos → órfãos vinculados → páginas vazias expandidas. Esta é a maneira mais rápida de limpar uma Wiki construída ao longo de várias versões.

**4. Habilite a geração paralela de páginas**
Settings → **Ingestion Acceleration**:
- **Page Generation Concurrency**: Defina para 3 na maioria dos providers (era 1/serial por padrão antes da v1.7.3). Acelera a ingestão em 2–3× em sources com 10+ Entity.
- **Batch Delay**: Comece em 300ms. Aumente para 500–800ms se encontrar rate limiting.

**5. Revise as novas configurações (adicionadas entre v1.4.0–v1.7.x):**
- **Wiki Output Language** (v1.6.5): Independente do idioma da interface — sua Wiki pode estar em chinês enquanto a UI do plugin permanece em inglês, ou vice-versa.
- **Extraction Granularity** (v1.6.2): Fine/Standard/Coarse controla o quão profundamente o LLM extrai Entity das sources. "Standard" é um bom padrão.
- **Auto-Maintenance** (v1.4.0): File watcher opcional, Lint periódico e verificação de saúde na inicialização. Todos desligados por padrão — ative apenas se quiser processamento automático em segundo plano.

> **Segurança**: A geração paralela usa `Promise.allSettled` — se uma página falhar, outras continuam. Páginas com falha são tentadas novamente individualmente com exponential backoff. O Smart Batch Skip (v1.7.7) detecta automaticamente arquivos já ingeridos para economizar tempo e custos de API.

---

## Funcionalidades

### Qualidade do Conhecimento

- **Extração de Entity/Concept** — LLM extrai Entity (pessoas, orgs, produtos, eventos) e Concept (teorias, métodos, termos) de suas notas
- **Aliases Obrigatórios** — Cada página gerada inclui pelo menos 1 alias (tradução, sigla, nome alternativo), permitindo detecção de duplicados entre idiomas
- **Detecção e Mesclagem de Duplicados** — Classificação semântica captura duplicados reais (traduções entre idiomas, abreviações, variantes de grafia); mesclagem inteligente por LLM funde conteúdo e preserva aliases
- **Fusão Inteligente de Conhecimento** — Atualizações multi-source mesclam nova informação sem redundância, contradições preservadas com atribuição, páginas `reviewed: true` protegidas de sobrescrita
- **Proteção contra Truncamento de Conteúdo** — 8000 max_tokens com detecção automática de stop_reason e tentativa em 2× tokens em todos os providers
- **Menções Verbatim de Source** — Citações em idioma original preservadas com tradução opcional para rastreabilidade

### Manutenção

- **Lint Health Scan** — Detecta duplicados, dead links, páginas vazias, órfãos, aliases ausentes e contradições em um relatório abrangente
- **Detecção de Duplicados por Camada Semântica** — Camada 1 (correspondências diretas de nome: entre idiomas, abreviações, títulos de alta similaridade) sempre verificada; Camada 2 (sinais indiretos: links compartilhados, similaridade moderada) preenche o orçamento de tokens
- **Smart Fix All** — Correção em lote ordenada por causalidade: duplicados mesclados → dead links resolvidos → órfãos vinculados → páginas vazias expandidas
- **Completude de Aliases** — Geração em lote paralela de aliases ausentes em um clique, melhorando a detecção futura de duplicados
- **Auto-Manutenção** — Observador de arquivos multi-pasta, lint periódico, verificação de saúde na inicialização (todos opcionais)
- **Máquina de Estados de Contradição** — `detected → review_ok → resolved` (correção por IA) ou `detected → pending_fix` (manual)

### Consulta e Feedback

- **Consulta Conversacional** — Diálogo estilo ChatGPT com Markdown em streaming e `[[wiki-links]]`, histórico multi-turn
- **Query-to-Wiki Feedback** — Salve conversas valiosas para a Wiki com extração de Entity/Concept, deduplicação semântica antes de salvar
- **Prevenção de Salvamento Duplicado** — Rastreamento por hash evita reavaliação de conversas inalteradas

### LLM e Idioma

- **Multi-Provider** — Anthropic, Anthropic Compatible (Coding Plan), Gemini, OpenAI, DeepSeek, Kimi, GLM, OpenRouter, Ollama, endpoints custom
- **5xx Retry** — Tentativa automática de exponential backoff (máx. 2) em erros HTTP 5xx/429 em todos os clientes
- **Lista Dinâmica de Modelos** — Busca em tempo real das APIs dos providers
- **Idioma de Saída Wiki** — 8 idiomas independentes da UI (EN/ZH/JA/KO/DE/FR/ES/PT), com entrada customizada
- **Internacionalização** — Interface em inglês e chinês (padrão: inglês)

### Arquitetura e Desempenho

- **Geração de Páginas Paralela** — 1–5 páginas simultâneas configuráveis, 3× mais rápido para sources grandes, isolamento de erro por página
- **Extração em Lote Iterativa** — Dimensionamento adaptativo de lotes elimina o gargalo de max_tokens para documentos longos
- **Arquitetura de Três Camadas** — `sources/` (read-only) → `wiki/` (gerado por LLM) → `schema/` (config co-evoluída)
- **Código Modular** — 13 módulos focados em `src/`

---

## Comandos

| Comando | Descrição |
|---------|-----------|
| **Ingest single source** | Selecione uma nota → gere páginas Wiki com Entity, Concept e summary |
| **Ingest from folder** | Selecione uma pasta → gere Wiki em lote de notas existentes |
| **Query wiki** | Q&A conversacional sobre sua Wiki, respostas em streaming com `[[wiki-links]]` |
| **Lint wiki** | Verificação completa de saúde: duplicados, dead links, páginas vazias, órfãos, aliases ausentes, contradições |
| **Regenerate index** | Reconstrua manualmente `wiki/index.md` |
| **Suggest schema updates** | LLM analisa a Wiki e propõe melhorias no Schema |

---

## Exemplo

**Entrada:** `sources/machine-learning.md`

```markdown
# Machine Learning
Machine learning usa algoritmos para aprender com dados.

## Tipos
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

# Supervised Learning

## Informações Básicas
- Tipo: method
- Source: [[sources/machine-learning]]

## Descrição
Supervised learning é um paradigma de machine learning onde modelos aprendem
de dados de treinamento rotulados para fazer previsões sobre dados não vistos...

## Concept Relacionados
- [[concepts/Machine-Learning|Machine Learning]]
- [[concepts/Unsupervised-Learning|Unsupervised Learning]]

## Entity Relacionados
- [[entities/Arthur-Samuel|Arthur Samuel]]

## Menções na Source
- "Supervised learning usa dados rotulados para treinar modelos preditivos..."
```

---

## Guia de Seleção de Modelo

Este plugin segue a filosofia de Karpathy: **alimente o LLM com contexto Wiki completo, não com RAG retrieval fragmentado**. Modelos de longo contexto são fortemente recomendados — quanto maior sua Wiki cresce, mais contexto o LLM precisa.

> Por que não RAG? A [crítica original](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) de Karpathy argumenta que RAG fragmenta o conhecimento e quebra a capacidade do LLM de raciocinar através do knowledge graph completo.

**Principais recomendações:**

| Modelo | Janela de Contexto | Por quê |
|--------|-------------------|---------|
| **DeepSeek V4** | 1M tokens | Melhor valor — preço ultra-baixo, forte suporte em chinês |
| **Gemini 3.1 Pro** | 1M+ tokens | Maior janela de contexto, raciocínio forte |
| **Claude Opus 4.7** | 1M tokens | Maior codificação e raciocínio agentic |
| **GPT-5.5** | 1M tokens | Último flagship OpenAI, topo do índice de inteligência IA |
| **Claude Sonnet 4.6** | 1M tokens | Ótimo equilíbrio de velocidade, custo e qualidade |

Para modelos locais (Ollama): janelas de contexto tipicamente menores (8K–128K). Considere usar um provider em nuvem para ingestão + modelo local para query.

**Anthropic Compatible (Coding Plan):** Se seu provider oferece um endpoint de API compatível com Anthropic, selecione "Anthropic Compatible" e insira o Base URL e API Key do seu provider.

---

## Arquitetura

Design de separação em três camadas de Karpathy:

```
sources/     # Seus documentos fonte (read-only)
  ↓ ingest
wiki/        # Páginas Wiki geradas por LLM
  ↓ query / maintain
schema/      # Configuração da estrutura Wiki (nomenclatura, templates, categorias)
```

**Código** (`src/`):

```
wiki/               # Módulos do motor Wiki
  wiki-engine.ts    # Orquestrador
  query-engine.ts   # Query conversacional
  source-analyzer.ts # Extração em lote iterativa
  page-factory.ts   # CRUD de Entity/Concept + mesclagem
  lint-controller.ts # Orquestração de Lint
  lint-fixes.ts     # Correção de dead links, páginas vazias e órfãos
  lint/             # Submódulos de Lint
    duplicate-detection.ts  # Geração programática de candidatos
    fix-runners.ts          # Helpers de execução de correção em lote
  contradictions.ts # Detecção de contradições
  system-prompts.ts # Diretiva de idioma + rótulos de seção
schema/             # Co-evolução de Schema
  schema-manager.ts # CRUD de Schema + sugestões
  auto-maintain.ts  # Observador de arquivos + lint periódico
ui/                 # Interface do usuário
  settings.ts       # Painel de configurações
  modals.ts         # Modais de Lint/Ingest/Query
+ módulos compartilhados: llm-client.ts, prompts.ts, texts.ts, utils.ts, types.ts
```

**Páginas geradas:**
- `wiki/sources/filename.md` — Resumo da source
- `wiki/entities/entity-name.md` — Páginas de Entity (pessoas, orgs, projetos, etc.)
- `wiki/concepts/concept-name.md` — Páginas de Concept (teorias, métodos, termos, etc.)
- `wiki/index.md` — Índice gerado automaticamente
- `wiki/log.md` — Log de operações

---

## Perguntas Frequentes (FAQ)

### Por que o Lint mostra "aliases ausentes" em quase todas as minhas páginas?

As páginas geradas antes da v1.7.11 não incluíam aliases. Isso é esperado e inofensivo — aliases são um aprimoramento, não um requisito. Clique em **"Complete Aliases"** no relatório do Lint para que o LLM gere traduções, siglas e nomes alternativos para todas as páginas deficientes em um único lote. Uma vez que os aliases existem, a detecção de duplicados e a busca alias-aware tornam-se muito mais eficazes.

### Por que vejo páginas duplicadas com nomes semelhantes (ex.: "CoT" e "Cadeia-de-Pensamento")?

Versões antigas (pré-v1.7.10) não tinham detecção de duplicados alias-aware. Ao ingerir conteúdo sobre o mesmo conceito usando nomes diferentes, o LLM criava páginas separadas. Execute **Lint Wiki** → se duplicados forem encontrados, clique em **"Merge Duplicates"** para fundi-los. A página mesclada preserva os aliases de ambas, evitando futuros duplicados.

### Como acelerar a ingestão de arquivos fonte grandes?

Duas configurações em **Settings → Ingestion Acceleration**:
- **Page Generation Concurrency**: Aumente de 1 para 3 (ou 5 para providers com limites altos). Isso processa múltiplas páginas de Entity/Concept em paralelo.
- **Batch Delay**: Valores mais baixos são mais rápidos, mas arriscam rate limiting. Comece em 300ms; aumente para 500–800ms se vir erros HTTP 429.

Verifique também **Extraction Granularity**: "Standard" ou "Coarse" produzem menos páginas que "Fine" e são mais rápidos.

### O plugin congela quando executo Lint em uma Wiki grande. O que há de errado?

Este era um problema conhecido corrigido nas v1.7.15 e v1.7.17. Se você estiver em uma versão anterior à v1.7.15, atualize para o lançamento mais recente — o sistema Lint agora inclui pontos de rendimento assíncronos que devolvem o controle à thread da UI do Obsidian a cada 50 páginas e a cada 500 comparações, prevenindo o congelamento de 10–40 segundos que ocorria em Wikis com 1200+ páginas.

### Posso editar manualmente as páginas da Wiki?

Sim. O plugin respeita suas edições:
- Defina `reviewed: true` no frontmatter para proteger uma página de ser sobrescrita durante a re-ingestão. Páginas revisadas recebem apenas conteúdo novo genuinamente apensado.
- A data `created` é preservada nas atualizações; apenas `updated` é renovada.
- Aliases, tags e sources manuais são preservados durante as mesclagens.

### Como usar modelos locais com Ollama?

1. Instale [Ollama](https://ollama.com) e baixe um modelo: `ollama pull gemma4`
2. Nas configurações do plugin, selecione **"Ollama (Local)"** como provider
3. Clique em **Fetch Models** para popular a lista de modelos, ou digite o nome do modelo manualmente
4. Não é necessária API key

> Modelos locais tipicamente têm janelas de contexto menores (8K–128K). Considere usar um provider em nuvem para ingestão (que precisa do maior contexto) e seu modelo local para Query.

### Qual é a diferença entre Interface Language e Wiki Output Language?

- **Interface Language** (topo das configurações): Controla a UI do plugin — rótulos das configurações, texto dos botões, Notices. Atualmente suporta inglês e chinês.
- **Wiki Output Language** (adicionado na v1.6.5): Controla em qual idioma o LLM escreve as páginas da Wiki. Suporta 8 idiomas (EN/ZH/JA/KO/DE/FR/ES/PT) além de entrada personalizada. Você pode ter uma interface em inglês enquanto sua Wiki é escrita em japonês.

### Por que o Query não encontra páginas que sei que existem?

Três causas comuns:
1. **Índice desatualizado**: Execute `Cmd+P` → **"Regenerate index"** para reconstruir com páginas e aliases atuais.
2. **Aliases ausentes**: Sem aliases (páginas pré-v1.7.11), o LLM só consegue corresponder pelo título exato da página. Execute Lint → Complete Aliases para corrigir.
3. **Termos de busca não correspondem**: Tente o título da página, um alias ou um termo relacionado. O LLM faz correspondência semântica, não busca por palavra-chave — reformular a pergunta ajuda.

### O que o "Smart Fix All" faz e em qual ordem?

O Smart Fix All executa correções em ordem de causalidade para minimizar a criação de novos problemas:
1. **Fase 0 — Complete Aliases**: Preenche aliases ausentes para que a detecção de duplicados funcione corretamente.
2. **Fase 1 — Merge Duplicates**: Funde páginas duplicadas (causa raiz de muitos dead links e órfãos).
3. **Fase 2 — Fix Dead Links**: Repara `[[wiki-links]]` quebrados (muitos resolvidos após a mesclagem de duplicados reescrever links).
4. **Fase 3 — Link Orphans**: Adiciona links de entrada a páginas que não têm nenhum.
5. **Fase 4 — Expand Empty Pages**: Preenche páginas esqueleto com conteúdo gerado pelo LLM.

### Como evitar custos inesperados de API?

- **Auto-Maintenance está DESLIGADO por padrão** — não ative a menos que queira processamento contínuo em segundo plano.
- **Smart Batch Skip** (v1.7.7) pula automaticamente arquivos já ingeridos, então reexecutar a ingestão de pasta não reprocessa tudo.
- **Extraction Granularity** definido como "Standard" ou "Coarse" usa menos chamadas de API que "Fine".
- **Batch Delay** acima de 500ms dá mais espaçamento mas não aumenta o uso de tokens — apenas espaça as chamadas.
- O **relatório do Lint** mostra contagens antes de você executar qualquer correção, para que você decida o que vale o custo de API.

### Como atualizar sem perder meus dados da Wiki?

O plugin nunca modifica seus arquivos fonte em `sources/`. As páginas Wiki em `wiki/` são modificadas apenas quando você executa explicitamente correções ou re-ingestão. Para ficar seguro:
1. Faça backup do seu vault (ou apenas da pasta `wiki/`)
2. Atualize o plugin
3. Execute **Regenerate index** primeiro
4. Execute **Lint Wiki** para ver o que precisa de atenção
5. Aplique correções seletivamente — você não precisa consertar tudo de uma vez

---

## Licença

Licença MIT — veja [LICENSE](LICENSE).

## Agradecimentos

- **Conceito:** [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — a visão original que inspirou este plugin
- **Plataforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs:** Anthropic SDK, OpenAI SDK
