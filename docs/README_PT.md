![llm_wiki_banner](/docs/assets/llm_wiki_banner.webp)

# Karpathy LLM Wiki Plugin para Obsidian

> Base de conhecimento estruturada com IA que consome suas notas e gera uma Wiki conectada — baseada no [LLM Wiki concept de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Autor:** Greener-Dalii | **Version:** 1.7.13

[English](README.md) | [中文文档](README_CN.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](docs/README_FR.md) | [Español](docs/README_ES.md) | [Português](docs/README_PT.md) | [Site oficial](https://llmwiki.greenerai.top/) | [Discussões](https://github.com/green-dalii/obsidian-llm-wiki/discussions)

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

> **Atualizando de uma versão anterior?** Execute `Cmd+P` → "Regenerate index" para reconstruir seu índice Wiki com aliases incluídos — isso habilita alias-aware lookup no Query (ex.: pesquisar "DSA" encontrará "DeepSeek-Sparse-Attention").

**Aceleração de Ingestão:** Para sources com muitos Entity (20+), habilite a geração de páginas paralelas em Settings → Ingestion Acceleration:
- **Page Generation Concurrency**: 1 (serial, mais seguro) a 5 (paralelo, mais rápido). Comece com 3 para a maioria dos providers.
- **Batch Delay**: 100–2000ms entre lotes paralelos. Aumente para 500ms+ para providers com rate limiting.

> **Segurança**: A geração paralela usa `Promise.allSettled` — se uma página falhar, outras continuam. Páginas com falha são tentadas novamente individualmente com exponential backoff.

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
  lint-fixes.ts     # Lógica de correção + geração de candidatos duplicados
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

## Licença

Licença MIT — veja [LICENSE](LICENSE).

## Agradecimentos

- **Conceito:** [LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — a visão original que inspirou este plugin
- **Plataforma:** [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **LLM SDKs:** Anthropic SDK, OpenAI SDK
