![llm_wiki_banner](assets/llm_wiki_banner.webp)

# 🧠 Karpathy LLM Wiki Plugin para Obsidian

> Base de conhecimento estruturada com IA que consome suas notas e gera uma Wiki conectada — baseada no [LLM Wiki concept de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
>
> **Pontuação oficial Obsidian 95/100** | Suporte nativo a 10 idiomas | Manutenção ativa, evolução contínua

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/green-dalii/obsidian-llm-wiki) [![Release Obsidian plugin](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml/badge.svg)](https://github.com/green-dalii/obsidian-llm-wiki/actions/workflows/release.yml) ![Version](https://img.shields.io/github/v/release/green-dalii/obsidian-llm-wiki?style=flat-square) ![Author](https://img.shields.io/badge/author-Greener--Dalii-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Maintenance](https://img.shields.io/badge/maintenance-actively%20maintained-brightgreen?style=flat-square) ![Build Status](https://img.shields.io/github/actions/workflow/status/green-dalii/obsidian-llm-wiki/release.yml?style=flat-square) ![Obsidian Compatibility](https://img.shields.io/badge/obsidian-1.11.0%2B-purple?style=flat-square) ![GitHub Stars](https://img.shields.io/github/stars/green-dalii/obsidian-llm-wiki?style=flat-square) ![Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=483699&label=downloads&query=$[karpathywiki].downloads&url=https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json&style=flat-square) ![Languages](https://img.shields.io/badge/languages-10-informational?style=flat-square) ![Providers](https://img.shields.io/badge/providers-12%2B-cyan?style=flat-square)

[English](../README.md) | [简体中文](README_CN.md) | [繁體中文](README_ZH-Hant.md) | [日本語](README_JA.md) | [한국어](README_KO.md) | [Deutsch](README_DE.md) | [Français](README_FR.md) | [Español](README_ES.md) | **Português** | [Italiano](README_IT.md)

[Site oficial](https://llmwiki.greenerai.top/) | [Blog](https://llmwiki.greenerai.top/blog/) | [Feedback e discussão](https://github.com/green-dalii/obsidian-llm-wiki/discussions) | [🤖 Explorar código com DeepWiki](https://deepwiki.com/green-dalii/obsidian-llm-wiki)

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
  - [⚡ Novidades da v1.22.0](#-novidades-da-v1220)
    - [v1.22.1 — 2026-06-24 (PATCH)](#v1221--2026-06-24-patch)
    - [v1.22.2 — 2026-06-26 (PATCH)](#v1222--2026-06-26-patch)
    - [v1.22.3 — 2026-06-26 (PATCH)](#v1223--2026-06-26-patch)
    - [v1.22.4 — 2026-06-27 (PATCH)](#v1224--2026-06-27-patch)
    - [v1.22.5 — 2026-06-29 (PATCH)](#v1225--2026-06-29-patch)
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
| **📥 Ingerir fonte individual** | `Cmd+P` → "Ingerir fonte individual" |
| **📂 Ingerir de pasta** | `Cmd+P` → "Ingerir de pasta" |
| **🔍 Consultar Wiki** | `Cmd+P` → "Consultar Wiki" |
| **🛠️ Verificar Wiki** | `Cmd+P` → "Verificar Wiki" |
| **📋 Regenerar índice** | `Cmd+P` → "Regenerar índice" |
| **🎯 Ingestão com um clique** | Ícone da barra lateral ou `Cmd+P` → "Ingerir arquivo atual" |

![Paleta de comandos — pesquise "karpa" para ver todos os comandos do Karpathy LLM Wiki](assets/command-panel.png)

### ⚠️ Atualizando de uma versão anterior?

**Esta versão é totalmente retrocompatível.** Sem mudanças incompatíveis desde v1.0.0.

**Atualizando para v1.20.3 a partir de qualquer versão anterior**: os slugs de páginas de origem agora carregam impressão digital (cada `sources/<slug>.md` se torna `sources/<nome_base>_<6 hex>.md`). Na sua próxima ingestão, as páginas `sources/` existentes são renomeadas no local e todos os backlinks `[[sources/<slug>]]` são atualizados automaticamente — nenhuma ação necessária, mas a renomeação do arquivo pode aparecer brevemente no explorador de arquivos do Obsidian. Se você tiver scripts externos ou favoritos que referenciem diretamente caminhos `sources/<slug>.md`, atualize-os para os novos caminhos com impressão digital.

**Para wikis construídos com múltiplas versões:**
1️⃣ Reconstrua seu índice — "Regenerar índice"
2️⃣ Execute Verificar Wiki — escaneia problemas
3️⃣ Use Smart Fix All — reparação com um clique
4️⃣ Ative geração paralela de páginas — Concorrência: 3, Atraso: 300ms
5️⃣ Revise as configurações — Idioma, Granularidade, Auto-Manutenção

---

## ⚡ Novidades da v1.22.0

A v1.22.0 é uma **release MINOR** que traz um fluxo de atualização do esquema com um único clique, chinês tradicional como 10º idioma e uma barra de status de ingestão melhorada.

- **📝 Aplicação de esquema com um clique (Issue #97).** As sugestões geradas pelo LLM são agora exibidas em um Modal de diff de duplo painel estilo IDE, com botões Aplicar/Cancelar/Abrir arquivo. Ao aplicar uma sugestão, o esquema anterior é automaticamente backupado (rotação, máx. 3 backups) antes de gravar o novo. "Atualizar esquema" é agora acessível a partir do Modal de Lint — a entrada da paleta de comandos foi removida para forçar um único ponto de entrada.
- **🏷️ Sincronização dinâmica de tags do esquema.** O vocabulário do esquema é agora a única fonte de verdade — as tags ativas são injetadas automaticamente em cada chamada LLM, eliminando o bug de "template do esquema sobrescrito por seções hardcoded" da v1.21.0 Fase 1.
- **🇹🇼 Chinês Tradicional (zh-TW).** A interface do plugin e a saída Wiki agora suportam chinês tradicional como 10º idioma. A proteção de paridade bidirecional foi estendida a todos os 10 idiomas.
- **📊 Barra de status de ingestão com nome do documento (PR #189).** A barra de status agora exibe o nome do documento atual (`Minha Nota · Ingerindo...`) e o progresso do lote durante ingestão de pastas (`[4/10] Minha Nota · Ingerindo...`). Contribuição de @YounianC.

Recomendamos fortemente atualizar — a função de aplicação de esquema com um clique transforma o refinamento do esquema em uma operação de um passo, e o idioma chinês tradicional melhora significativamente a experiência para os usuários zh-TW.

Detalhes em [CHANGELOG.md](../CHANGELOG.md).

### v1.22.1 — 2026-06-24 (PATCH)

Um PATCH focado que fecha três bugs P0 reportados por usuários e traz uma melhoria de UX.

- **🛡️ Fix Dead Links não fabrica mais páginas stub expandidas por IA (#197).** Stubs agora são marcadores honestos com `generation_complete: false`.
- **✅ O toggle "Executar correções rápidas na inicialização" agora persiste (#199).** Migração v1.18.3 removida.
- **🎨 Aviso de revisão CSS `:has()` corrigido.** Novo `scripts/css-lint.mjs`.
- **🪟 Query Wiki agora é um painel lateral acoplado à direita estilo Copilot (#196, @YounianC).** `QueryModal extends Modal` virou `QueryView extends ItemView`.
- **🧹 Prefixo de related link reafirmado deterministicamente (#200, @DocTpoint, #187).** Nova função pura `correctRelatedLinkPrefixes()`.

### v1.22.2 — 2026-06-26 (PATCH)

Este PATCH melhora a UX de ingestão automática, localiza o registro de operações e remove código morto.

- **📋 A ingestão automática não bloqueia mais com um modal (Issue #204).** A ingestão automática em modo Watch agora mostra por padrão um aviso transiente em vez de abrir o modal completo do relatório de ingestão.
- **🔧 A correção inteligente automática agora usa um aviso transiente.**
- **🌐 Registro de operações i18n (10 idiomas).**
- **📅 Lint periódico: "Por hora" removido, "Mensal" adicionado.**
- **🧹 Código morto removido.**
- **♻️ Migração automática do cabeçalho do registro.**

### v1.22.3 — 2026-06-26 (PATCH)

Um Hotfix focado que fortalece o mecanismo de cabeçalho de log da v1.22.2 e evita poluição de frontmatter em arquivos que não são de conteúdo.

- **🔧 Detecção de cabeçalho de log agora agnóstica de idioma e robusta.** Mudança da detecção baseada em texto (que não funcionava para DE/JA/KO/etc. e podia ser confundida pelo conteúdo natural de uma entrada de log) para um marcador estrutural de comentário HTML `<!-- llm-wiki-log-header-start -->` embutido no cabeçalho. Arquivos log v1.22.2 existentes são atualizados automaticamente no próximo arranque.
- **🧹 Strings do cabeçalho de log consolidadas em `src/texts/<lang>.ts`.** As quatro strings localizadas previamente duplicadas em `core/log-header.ts` agora vivem junto com todas as outras strings UI — tradutores e testes de paridade as cobrem automaticamente.
- **🚫 `generation_complete` não é mais carimbado em `log.md` / `index.md` / `schema/`.** `createOrUpdateFile` antes chamava `markPageComplete` para **cada** escrita, o que prefixava um bloco de frontmatter totalmente novo com `generation_complete: true` em arquivos sem frontmatter — poluição visível do corpo do log.md. A nova guarda `isInWikiContentFolder()` restringe o carimbo apenas a `wiki/{entities,concepts,sources}/...`.

Atualização recomendada — log.md não acumula mais frontmatter disperso a cada execução de correção rápida, e a detecção funciona em todos os idiomas sem casos especiais por idioma.

### v1.22.4 — 2026-06-27 (PATCH)

Um PATCH focado que restaura a compatibilidade GPT-5.x, propaga mensagens de erro reais do Provider para a UI de Test Connection e centraliza os controlos de desempenho de lint.

- **🛡️ Os modelos GPT-5.x não falham mais Test Connection com 400 (Issue #207).** A heurística hardcoded `params.model.startsWith('gpt-5-')` da v1.20.0 só reconhecia a família OpenAI gpt-5 com hífen (`gpt-5-mini`, `gpt-5-nano`, etc.) e quebrava silenciosamente a cada nova versão gpt-5.x (`gpt-5.1`, `gpt-5.4-mini`, `gpt-5.5`). Substituída por um mecanismo de probe-e-cache em tempo de execução: o primeiro pedido usa `max_tokens`, se o backend rejeitar com 400, guardamos em cache a chave alternativa (`max_completion_tokens` ou vice-versa) e tentamos de novo. Os pedidos seguintes reutilizam a cache — sem mais correspondência de prefixos em nomes de modelos, e o probe lida com qualquer novo esquema de nomenclatura da OpenAI.
- **📜 As mensagens de erro reais do Provider chegam agora à UI de Test Connection.** Anteriormente, os erros do `requestUrl` eram reembrulhados como `status 400: ${data.error.message}` (ou apenas "status 400" quando o corpo da resposta se perdia) e o erro real do Provider — p.ex. "Invalid parameter: max_tokens should be max_completion_tokens" — nunca era visível. O novo `extractProviderErrorMessage()` enriquece o erro lançado para que o utilizador veja detalhes acionáveis do Provider em vez de um estado HTTP genérico.
- **♻️ Controlos de desempenho de lint centralizados em `src/constants.ts`.** Cadências de yield (`LINT_YIELD_EVERY_OUTER` / `_PHASE1` / `_COMPARISON`), tamanhos de lote de candidatos (`LINT_CANDIDATE_TOKEN_ESTIMATE`, `LINT_MAX_INPUT_TOKENS`, `LINT_DEDUP_BATCH_SIZE`), leitura por lote de prep (`LINT_PREP_BATCH_READ`) e tamanhos de lote de source-analyzer (`SHORT_CONTENT_THRESHOLD`, `BATCH_CHARS_PER_ITEM`) vivem agora num só lugar. Anteriormente estes valores estavam duplicados ou tinham divergido entre `controller.ts`, `duplicate-detection.ts`, `preparation.ts` e `batch-limits.ts` — incluindo uma cópia literal `MAX_TOKENS=16000` de `MAX_TOKENS_BATCH`. Ajustar o desempenho de lint é agora uma alteração num único ficheiro.

Atualização recomendada — os modelos gpt-5.x funcionam novamente de origem, e a UI de Test Connection agora indica exatamente o que o Provider rejeitou para que não tenha de andar a procurar na consola pelo baseUrl / nome do modelo / chave API.

### v1.22.5 — 2026-06-29 (PATCH)

Um PATCH focado que evita que a família de modelos de raciocínio da OpenAI (gpt-5.1+ / gpt-5.5 / o1-o4) falhe com 400 no Test Connection (continuação de Issue #207) e que propaga as mensagens de erro reais do Provider para a Notice de Test Connection.

- **🛡️ A família de modelos de raciocínio agora utiliza a Responses API da OpenAI (continuação de Issue #207).** A correção probe-then-cache `max_tokens` ↔ `max_completion_tokens` da v1.22.4 era necessária mas não suficiente — `gpt-5.1-chat-latest`, `gpt-5.5` e as famílias `o1` / `o3` / `o4-mini` continuavam a falhar com 400 no Test Connection porque o endpoint Chat Completions tem problemas de compatibilidade com a família de modelos de raciocínio. Segundo o guia oficial de migração GPT-5.5 da OpenAI («GPT-5.5 works best in the Responses API»), a v1.22.5 encaminha a família de raciocínio para `/v1/responses` com `reasoning: { effort: 'low' }`. `gpt-5-chat-latest`, `gpt-4.1`, `gpt-3.5-turbo` e todos os baseUrls não-OpenAI (Ollama, LM Studio, DeepSeek, etc.) permanecem inalterados em `/v1/chat/completions`. A deteção é uma função pura `isResponsesApiModel(model, baseUrl)`, ativada apenas para `https://api.openai.com/v1` — endpoints personalizados permanecem totalmente compatíveis.
- **📜 O corpo do erro do Provider agora chega à UI da Notice de Test Connection.** O `requestUrl` do Obsidian lança uma exceção em 4xx (incluindo 429) SEM anexar o corpo da resposta do Provider ao objeto Error — portanto, mesmo o `extractProviderErrorMessage()` da v1.22.4 não conseguia ver o que a OpenAI realmente dizia. A v1.22.5 envolve o pedido falhado num re-fetch `window.fetch` (timeout de 5s) e funde o corpo do Provider no `Error.message` lançado, de modo a que os utilizadores vejam `"status 429: You exceeded your current quota, please check your plan and billing details"` em vez de um simples `"status 429"`. O corpo bruto também é registado ao nível `console.warn` para inspeção em DevTools. Os baseUrls não-OpenAI obtêm o mesmo enriquecimento através do caminho Chat Completions existente.
- **⏱️ Erros 429/5xx de rate-limit são agora repetidos com backoff exponencial no caminho da Responses API.** O `withRetry` da v1.22.4 (3 tentativas, 1s/2s/4s + jitter) cobria originalmente apenas o caminho Chat Completions. A v1.22.5 envolve o novo caminho da Responses API no mesmo `withRetry`, de modo a que flutuações transitórias de quota 429 já não façam o Test Connection falhar imediatamente.
- **♻️ Fixtures de teste atualizadas.** Os testes existentes para a regressão dot-naming gpt-5.x (v1.22.4) e o caminho `thinking.type='disabled'` Chat Completions (herdado) usam agora `gpt-5-mini` / `gpt-5-nano` / `gpt-4.1` — estes modelos continuam a cobrir o caminho Chat Completions, enquanto a família de raciocínio está totalmente coberta pelo novo `src/__tests__/root/llm-client-responses-api.test.ts` (28 testes).

Atualização recomendada — `gpt-5.1-chat-latest`, `gpt-5.5` e as famílias `o1` / `o3` / `o4-mini` funcionam agora de origem no Test Connection, e quando uma ligação falha obtém-se o erro real do Provider (p.ex. «insufficient_quota») em vez de um simples código de estado HTTP.

Atualização recomendadaAtualização recomendada.

## ✨ Funcionalidades

### 📊 Qualidade do Conhecimento

- **🔍 Extração de Entity/Concept** — LLM extrai Entity (pessoas, orgs, produtos, eventos) e Concept (teorias, métodos, termos) de suas notas com granularidade de extração flexível (Mínima~5 itens, Grossa~10, Padrão~50, Fina~100, Personalizada 1–300) para equilibrar profundidade de análise e custos de API
- **🏷️ Aliases Obrigatórios** — Cada página gerada inclui pelo menos 1 alias (tradução, sigla, nome alternativo), permitindo detecção de duplicados entre idiomas
- **🔄 Detecção e Mesclagem de Duplicados** — Classificação semântica captura duplicados reais (traduções entre idiomas, abreviações, variantes de grafia); mesclagem inteligente por LLM funde conteúdo e preserva aliases
- **🧩 Fusão Inteligente de Conhecimento** — Atualizações multi-source mesclam nova informação sem redundância, contradições preservadas com atribuição, páginas `reviewed: true` protegidas de sobrescrita
- **📏 Proteção contra Truncamento de Conteúdo** — 8000 max_tokens com detecção automática de stop_reason e tentativa em 2× tokens em todos os providers
- **📝 Menções Verbatim de Source** — Citações em idioma original preservadas com tradução opcional para rastreabilidade

- **🎨 Vocabulário de tags personalizável (v1.18.0).** Configurações → Wiki → Modo de vocabulário de tags → *Personalizado* permite definir suas próprias listas de tags de tipo de entidade e conceito (por exemplo, `Medical_Arzneimittel`, `法规`). O plugin respeita seu vocabulário nos prompts de extração e na validação de frontmatter; a auditoria Lint (Issue #85 v7) reporta qualquer página cujas tags estejam fora do vocabulário ativo.

### 🛠️ Manutenção

- **🔍 Lint Health Scan** — Detecta duplicados, dead links, páginas vazias, órfãos, aliases ausentes e contradições em um relatório abrangente
- **🎯 Detecção de Duplicados por Camada Semântica** — Camada 1 (correspondências diretas de nome: entre idiomas, abreviações, títulos de alta similaridade) sempre verificada; Camada 2 (sinais indiretos: links compartilhados, similaridade moderada) preenche o orçamento de tokens
- **⚡ Smart Fix All** — Correção em lote ordenada por causalidade: duplicados mesclados → dead links resolvidos → órfãos vinculados → páginas vazias expandidas
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
- **🌐 Idioma de Saída Wiki** — 9 idiomas independentes da UI (EN/ZH/JA/KO/DE/FR/ES/PT/IT), com entrada customizada
- **🌍 Internacionalização completa da UI** — Interface do plugin em 9 idiomas (EN/ZH/JA/KO/DE/FR/ES/PT/IT), 269+ campos UI totalmente traduzidos, expressões locais naturais
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

## ⌨️ Comandos

| Comando | Descrição |
|---------|-----------|
| **📥 Ingerir fonte individual** | Selecione uma nota → gere páginas Wiki com Entity, Concept e summary |
| **📂 Ingerir de pasta** | Selecione uma pasta → gere Wiki em lote de notas existentes |
| **🔍 Consultar Wiki** | Q&A conversacional sobre sua Wiki, respostas em streaming com `[[wiki-links]]` |
| **🛠️ Verificar Wiki** | Verificação completa de saúde: duplicados, dead links, páginas vazias, órfãos, aliases ausentes, contradições |
| **📋 Regenerar índice** | Reconstrua manualmente `wiki/index.md` |
| **⏹️ Cancelar operação** | `Cmd+P` → "Cancel current ingestion" ou clique na barra de status — parada segura nos limites do lote |
| **📊 Ver histórico de ingestão (v1.21.0)** | Navegue por ingestões passadas, relatórios de lint e execuções de manutenção em uma UI pesquisável e filtrável |

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
sources/     # 📄 Seus documentos fonte (read-only)
  ↓ ingest
wiki/        # 🧠 Páginas Wiki geradas por LLM
  ↓ query / maintain
schema/      # 📋 Configuração da estrutura Wiki (nomenclatura, templates, categorias)
```

**Código** (`src/`):

```
main.ts              # 🔌 Ponto de entrada do plugin
wiki/                # Módulos do motor Wiki
  wiki-engine.ts     # 🎯 Orquestrador
  query-engine.ts    # 💬 Query conversacional
  source-analyzer.ts # 📊 Extração em lote iterativa
  page-factory.ts    # 🏗️ CRUD de Entity/Concept + mesclagem
  conversation-ingest.ts # 📥 Chat → conhecimento Wiki
  contradictions.ts  # ⚠️ Detecção de contradições
  system-prompts.ts  # 🗣️ Diretiva de idioma + rótulos de seção
  lint/              # Submódulos de Lint
    controller.ts        # 🔍 Orquestração de Lint
    fix-runners.ts       # ⚡ Helpers de execução de correção em lote
    scanners.ts          # 🔍 Scanners (dead links, orphans, aliases, ancoragem de citação)
    duplicate-detection.ts # 🔄 Geração programática de candidatos
    report-builder.ts    # 📋 Construtor de relatório de função pura
    phases/              # Execução de Lint por fases
  prompts/           # Modelos de prompts LLM por domínio
schema/              # Co-evolução de Schema
  manager.ts         # 📋 CRUD de Schema + sugestões
  auto-maintain.ts   # 🔄 Observador de arquivos + lint periódico + correções na inicialização
  analyze.ts         # 📊 Análise de Schema com fiação de cancelamento
ui/                  # Interface do usuário
  settings.ts        # ⚙️ Painel de configurações
  modals.ts          # 📦 Modais de Lint / Ingest / Query / History
core/                # 🧩 Módulos de função pura (zero IO, totalmente testáveis)
  i18n, slug, json, frontmatter, tag-vocab, sources-normalizer, ...
+ compartilhados: llm-client.ts, llm-client-wrapper.ts, texts.ts, prompts.ts, types.ts
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
Obsidian v1.11.0+, desktop (Windows/macOS/Linux), uma API key de um LLM provider. Ollama funciona localmente sem API key.

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
Em **Configurações → LLM Configuration**: aumente **Page Generation Concurrency** para 3–5, reduza **Batch Delay** para 100–300ms (cuidado com rate limiting). Escolha granularidade "Mínima", "Grossa" ou "Padrão" para reduzir o número de páginas e economizar custos de API.

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

**Meus arquivos `sources/` foram renomeados após atualizar para v1.20.3 — há algum problema? (v1.20.3+)**
Não — é a nova impressão digital anti-colisão de slug de origem em ação. Cada `sources/<slug>.md` agora é `sources/<nome_base>_<6 hex>.md` (o hex é um hash FNV-1a do caminho completo do arquivo). Arquivos com o mesmo nome base em pastas diferentes (p. ex. 11× `About this course.md` em cursos Academy) não colidem mais. A re-ingestão renomeia as páginas `sources/` existentes no local e todos os backlinks `[[sources/<slug>]]` são atualizados automaticamente. Se você tiver scripts externos ou favoritos apontando para `sources/<slug-antigo>.md`, atualize-os para os novos caminhos com impressão digital.

**Re-ingerir uma fonte não relacionada sobrescreverá uma página bloqueada com `reviewed: true`? (v1.20.3+)**
Não — Stage 4 (`updateRelatedPage`) agora respeita `reviewed: true` e roteia para o caminho append-only, igual ao caminho de ingestão. Seu corpo curado sobrevive tal qual; apenas conteúdo genuinamente novo é anexado.

**Meu modelo local (Ollama, LM Studio) está fabricando nomes estranhos de entidades a partir de notas em branco ou apenas com frontmatter. (v1.21.0)**
Corrigido em v1.21.0 pelo portal de pré-ingestão: notas vazias/em branco/somente frontmatter agora são rejeitadas *antes* de qualquer chamada LLM, e a deduplicação por hash de conteúdo detecta arquivos idênticos entre caminhos. Atualize para v1.21.0+ para parar a classe de bugs "arquivo vazio → alucinação" (modelos pequenos inventando nomes de entidades em um prompt vazio).

**Como obter ajuda?**
- [GitHub Issues](https://github.com/green-dalii/obsidian-llm-wiki/issues) — relatar bugs
- [GitHub Discussions](https://github.com/green-dalii/obsidian-llm-wiki/discussions) — perguntas e feedback

**Como coletar logs de depuração para solução de problemas?**

1. Abra as Ferramentas de Desenvolvedor (`Ctrl+Shift+I` / `Cmd+Option+I`)
2. Vá para a aba **Console**
3. Execute sua operação (ingestão, consulta ou lint)
4. Procure mensagens com prefixos de nome de módulo como `[Step]`, `[LLM]`, nomes de módulos
5. Para testes locais, use `pnpm build:dev` em vez de `pnpm build` para preservar a saída de depuração completa
6. Copie as linhas de log relevantes e inclua-as no seu issue do GitHub — isso acelera muito o diagnóstico

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
- **🔌 Transporte LLM:** `requestUrl` do Obsidian (Anthropic) + cliente HTTP compatível com OpenAI escrito à mão (provedores terceiros compatíveis com OpenAI)

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=green-dalii/obsidian-llm-wiki&type=timeline&legend=top-left)](https://www.star-history.com/?repos=green-dalii%2Fobsidian-llm-wiki&type=timeline&legend=top-left)
